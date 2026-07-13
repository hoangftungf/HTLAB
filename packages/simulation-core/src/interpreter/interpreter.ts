import { createRNG, type RNG } from "../rng.js";
import { type Simulation } from "../types.js";
import {
  CompareOp,
  OpCode,
  type IRBooleanExpression,
  type IRCommandV2,
  type IRDiagnostic,
  type IRFieldValue,
  type IRNode,
  type IRProgram,
  type IRProgramV1,
  type IRProgramV2,
  type IRSourceRef,
  type IRValueExpression,
  type Interpreter as IInterpreter,
  type InterpreterConfig,
} from "./types.js";

const DEFAULT_MAX_INST_PER_TICK = 1000;
const DEFAULT_MAX_TICKS = 18000;
const DEFAULT_MAX_LOOP_ITERATIONS = 10000;
const DEFAULT_WAIT_UNTIL_TIMEOUT_TICKS = 600;

interface LoopFrameV1 {
  startIp: number;
  remaining: number;
}

interface V2Frame {
  nodes: IRNode[];
  index: number;
  loop?: {
    type: "times" | "forever" | "until";
    remaining?: number;
    condition?: IRBooleanExpression;
    iterations: number;
    source?: IRSourceRef;
  };
}

interface WaitUntilState {
  condition: IRBooleanExpression;
  remaining: number;
  source?: IRSourceRef;
}

function compare(a: number, op: CompareOp, b: number): boolean {
  switch (op) {
    case CompareOp.EQ: return a === b;
    case CompareOp.NEQ: return a !== b;
    case CompareOp.LT: return a < b;
    case CompareOp.LTE: return a <= b;
    case CompareOp.GT: return a > b;
    case CompareOp.GTE: return a >= b;
  }
}

function compareByName(a: number, op: string, b: number): boolean {
  switch (op) {
    case "EQ":
    case "=":
    case "==":
      return a === b;
    case "NEQ":
    case "!=":
      return a !== b;
    case "LT":
    case "<":
      return a < b;
    case "LTE":
    case "<=":
      return a <= b;
    case "GT":
    case ">":
      return a > b;
    case "GTE":
    case ">=":
      return a >= b;
    default:
      return false;
  }
}

function detectGroup(roads: number[], group: number): number {
  const slices: [number, number][] = [[0, 2], [1, 3], [2, 4]];
  const [lo, hi] = slices[group] ?? [0, 0];
  for (let i = lo; i <= hi; i++) {
    if (roads[i] > 50) return 1;
  }
  return 0;
}

function toNumber(value: IRFieldValue | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toText(value: IRFieldValue | undefined, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function asValueExpression(value: IRFieldValue | undefined): IRValueExpression {
  if (value && typeof value === "object" && "kind" in value) {
    const kind = (value as { kind: string }).kind;
    if (
      kind === "literal" ||
      kind === "variable" ||
      kind === "sensor" ||
      kind === "unary" ||
      kind === "binary" ||
      kind === "call" ||
      kind === "c-code"
    ) {
      return value as IRValueExpression;
    }
  }
  return { kind: "literal", value: value as string | number | boolean | null | undefined ?? 0 };
}

function asBooleanExpression(value: IRFieldValue | undefined): IRBooleanExpression {
  if (value && typeof value === "object" && "kind" in value) {
    return value as IRBooleanExpression;
  }
  return { kind: "literal", value: Boolean(value) };
}

function normalizeAngle(value: number, unit: "degree" | "radian" | undefined): number {
  return unit === "degree" ? value * Math.PI / 180 : value;
}

function createDiagnostic(
  code: string,
  message: string,
  source?: IRSourceRef,
  severity: IRDiagnostic["severity"] = "warning",
): IRDiagnostic {
  return { code, severity, message, source };
}

export function createInterpreter(
  program: IRProgram,
  sim: Simulation,
  config: InterpreterConfig = {},
): IInterpreter {
  if (program.version === 2) {
    return createV2Interpreter(program, sim, config);
  }
  return createV1Interpreter(program, sim, config);
}

function createV1Interpreter(
  program: IRProgramV1,
  sim: Simulation,
  config: InterpreterConfig,
): IInterpreter {
  const maxTicks = config.maxTicks ?? DEFAULT_MAX_TICKS;
  const maxInstructionsPerTick = config.maxInstructionsPerTick ?? DEFAULT_MAX_INST_PER_TICK;
  const diagnostics: IRDiagnostic[] = [...(program.diagnostics ?? [])];
  const commands = program.commands;

  const labelMap = new Map<number, number>();
  let labelIdx = 0;
  for (let i = 0; i < commands.length; i++) {
    if (commands[i].op === OpCode.LABEL) {
      labelMap.set(labelIdx, i);
      labelIdx++;
    }
  }

  let ip = 0;
  let waitCounter = 0;
  let acc = 0;
  const vars = new Array(8).fill(0);
  const loopStack: LoopFrameV1[] = [];
  let tickCount = 0;
  let done = false;

  function reset(): void {
    ip = 0;
    waitCounter = 0;
    acc = 0;
    for (let i = 0; i < 8; i++) vars[i] = 0;
    loopStack.length = 0;
    tickCount = 0;
    diagnostics.length = 0;
    diagnostics.push(...(program.diagnostics ?? []));
    done = false;
  }

  function step(): boolean {
    if (done) return false;

    tickCount++;
    if (tickCount > maxTicks) {
      diagnostics.push(createDiagnostic("HTLAB_MAX_TICKS", `Program stopped after ${maxTicks} ticks.`));
      done = true;
      return false;
    }

    if (waitCounter > 0) {
      waitCounter--;
      return true;
    }

    let executed = 0;

    while (executed < maxInstructionsPerTick && ip < commands.length) {
      const cmd = commands[ip];

      switch (cmd.op) {
        case OpCode.INIT_HARDWARE:
          sim.reset();
          ip++;
          break;

        case OpCode.CALIBRATE_GRAYSCALE:
          sim.calibrateGrayscale();
          ip++;
          break;

        case OpCode.SET_MOTOR: {
          const left = cmd.args[0] ?? 0;
          const right = cmd.args[1] ?? 0;
          sim.setMotors(left, right);
          ip++;
          break;
        }

        case OpCode.WAIT_TICKS: {
          waitCounter = Math.max(0, cmd.args[0] ?? 0);
          ip++;
          return true;
        }

        case OpCode.READ_SENSOR_ROAD: {
          const roadIdx = (cmd.args[0] ?? 1) - 1;
          const roads = sim.state.sensors.roads;
          acc = roads[Math.max(0, Math.min(4, roadIdx))];
          ip++;
          break;
        }

        case OpCode.READ_SENSOR_GROUP:
          acc = detectGroup(sim.state.sensors.roads as number[], cmd.args[0] ?? 0);
          ip++;
          break;

        case OpCode.READ_LINE_POSITION:
          acc = sim.state.sensors.linePosition;
          ip++;
          break;

        case OpCode.IF_SENSOR_VALUE: {
          const roadIdx = (cmd.args[0] ?? 1) - 1;
          const threshold = cmd.args[1] ?? 50;
          const op = cmd.args[2] as CompareOp;
          const jumpLabelIdx = cmd.args[3];
          const roads = sim.state.sensors.roads;
          const value = roads[Math.max(0, Math.min(4, roadIdx))];
          const condition = compare(value, op, threshold);
          acc = condition ? 1 : 0;

          if (condition && jumpLabelIdx !== undefined) {
            const targetIp = labelMap.get(jumpLabelIdx);
            ip = targetIp !== undefined ? targetIp + 1 : ip + 1;
          } else {
            ip++;
          }
          break;
        }

        case OpCode.SET_VAR: {
          const varIdx = cmd.args[0] ?? 0;
          const value = cmd.args[1] ?? acc;
          if (varIdx >= 0 && varIdx < 8) vars[varIdx] = value;
          ip++;
          break;
        }

        case OpCode.LABEL:
          ip++;
          break;

        case OpCode.JUMP: {
          const targetIp = labelMap.get(cmd.args[0]);
          ip = targetIp !== undefined ? targetIp + 1 : ip + 1;
          break;
        }

        case OpCode.LOOP_START:
          loopStack.push({ startIp: ip, remaining: cmd.args[0] ?? 0 });
          ip++;
          break;

        case OpCode.LOOP_END: {
          const frame = loopStack[loopStack.length - 1];
          if (frame && frame.remaining > 0) {
            frame.remaining--;
            if (frame.remaining > 0) {
              ip = frame.startIp + 1;
            } else {
              loopStack.pop();
              ip++;
            }
          } else {
            if (frame) loopStack.pop();
            ip++;
          }
          break;
        }

        case OpCode.END_PROGRAM:
          done = true;
          return false;

        default:
          diagnostics.push(createDiagnostic("HTLAB_UNKNOWN_OPCODE", `Unknown opcode ${String(cmd.op)} skipped.`));
          ip++;
          break;
      }

      executed++;
    }

    if (ip >= commands.length) {
      done = true;
      return false;
    }

    return true;
  }

  return {
    step,
    reset,
    get done() {
      return done;
    },
    get diagnostics() {
      return diagnostics;
    },
  };
}

function createV2Interpreter(
  program: IRProgramV2,
  sim: Simulation,
  config: InterpreterConfig,
): IInterpreter {
  const maxTicks = config.maxTicks ?? DEFAULT_MAX_TICKS;
  const maxInstructionsPerTick = config.maxInstructionsPerTick ?? DEFAULT_MAX_INST_PER_TICK;
  const maxLoopIterations = config.maxLoopIterations ?? DEFAULT_MAX_LOOP_ITERATIONS;
  const waitUntilTimeoutTicks = config.waitUntilTimeoutTicks ?? DEFAULT_WAIT_UNTIL_TIMEOUT_TICKS;
  const rng = createRNG(config.randomSeed ?? 42);
  const diagnostics: IRDiagnostic[] = [...program.diagnostics];
  const variables = new Map<string, number>();
  const frames: V2Frame[] = [{ nodes: program.nodes, index: 0 }];

  let waitCounter = 0;
  let waitUntil: WaitUntilState | null = null;
  let tickCount = 0;
  let done = false;

  function pushDiagnostic(diagnostic: IRDiagnostic): void {
    diagnostics.push(diagnostic);
  }

  function numericArg(command: IRCommandV2, names: string[], fallback = 0): number {
    for (const name of names) {
      if (name in command.args) return evalNumber(asValueExpression(command.args[name]));
    }
    return fallback;
  }

  function evalNumber(expression: IRValueExpression): number {
    return toNumber(evalValue(expression));
  }

  function evalValue(expression: IRValueExpression): IRFieldValue {
    switch (expression.kind) {
      case "literal":
        return expression.value;

      case "variable":
        return variables.get(expression.name) ?? 0;

      case "sensor":
        return readSensorValue(expression);

      case "unary": {
        const value = evalNumber(expression.arg);
        const op = expression.op.toLowerCase();
        if (op === "abs") return Math.abs(value);
        if (op === "negate") return -value;
        if (op === "floor") return Math.floor(value);
        if (op === "ceiling" || op === "ceil") return Math.ceil(value);
        if (op === "round") return Math.round(value);
        if (op === "sqrt") {
          if (value < 0) {
            pushDiagnostic(createDiagnostic("HTLAB_MATH_DOMAIN", `sqrt(${value}) is outside the real domain.`));
            return 0;
          }
          return Math.sqrt(value);
        }
        if (op === "ln" || op === "log") {
          if (value <= 0) {
            pushDiagnostic(createDiagnostic("HTLAB_MATH_DOMAIN", `${op}(${value}) is outside the real domain.`));
            return 0;
          }
          return op === "ln" ? Math.log(value) : Math.log10(value);
        }
        if (op === "e^" || op === "exp") return Math.exp(value);
        if (op === "10^") return 10 ** value;
        if (op === "sin") return Math.sin(normalizeAngle(value, expression.angleUnit));
        if (op === "cos") return Math.cos(normalizeAngle(value, expression.angleUnit));
        if (op === "tan") return Math.tan(normalizeAngle(value, expression.angleUnit));
        if (op === "asin" || op === "acos") {
          if (value < -1 || value > 1) {
            pushDiagnostic(createDiagnostic("HTLAB_MATH_DOMAIN", `${op}(${value}) is outside [-1, 1].`));
            return 0;
          }
          const result = op === "asin" ? Math.asin(value) : Math.acos(value);
          return expression.angleUnit === "degree" ? result * 180 / Math.PI : result;
        }
        if (op === "atan") {
          const result = Math.atan(value);
          return expression.angleUnit === "degree" ? result * 180 / Math.PI : result;
        }
        pushDiagnostic(createDiagnostic("HTLAB_UNKNOWN_UNARY", `Unknown unary operator ${expression.op}.`));
        return 0;
      }

      case "binary": {
        const left = evalNumber(expression.left);
        const right = evalNumber(expression.right);
        const op = expression.op.toLowerCase();
        if (op === "add" || op === "+") return left + right;
        if (op === "subtract" || op === "-") return left - right;
        if (op === "multiply" || op === "*" || op === "x") return left * right;
        if (op === "power" || op === "^") {
          const result = left ** right;
          if (!Number.isFinite(result)) {
            pushDiagnostic(createDiagnostic("HTLAB_MATH_DOMAIN", `${left} ** ${right} is outside the finite numeric domain.`));
            return 0;
          }
          return result;
        }
        if (op === "divide" || op === "/") {
          if (right === 0) {
            pushDiagnostic(createDiagnostic("HTLAB_DIVIDE_BY_ZERO", "Division by zero returned 0."));
            return 0;
          }
          return left / right;
        }
        if (op === "modulo" || op === "%") {
          if (right === 0) {
            pushDiagnostic(createDiagnostic("HTLAB_MODULO_BY_ZERO", "Modulo by zero returned 0."));
            return 0;
          }
          return left % right;
        }
        pushDiagnostic(createDiagnostic("HTLAB_UNKNOWN_BINARY", `Unknown binary operator ${expression.op}.`));
        return 0;
      }

      case "call":
        return evalCall(expression.callee, expression.args, rng);

      case "c-code":
        pushDiagnostic(createDiagnostic("HTLAB_C_SANDBOX_REQUIRED", "C Code did not run because sandbox execution is not available."));
        return 0;
    }
  }

  function evalCall(callee: string, args: IRValueExpression[], rngInstance: RNG): number {
    const name = callee.toLowerCase();
    if (name === "randomrange" || name === "random") {
      const min = Math.ceil(evalNumber(args[0] ?? { kind: "literal", value: 0 }));
      const max = Math.floor(evalNumber(args[1] ?? { kind: "literal", value: 1 }));
      return rngInstance.nextInt(Math.min(min, max), Math.max(min, max));
    }
    pushDiagnostic(createDiagnostic("HTLAB_UNKNOWN_CALL", `Unknown value function ${callee}.`));
    return 0;
  }

  function evalBoolean(expression: IRBooleanExpression): boolean {
    switch (expression.kind) {
      case "literal":
        return expression.value;

      case "compare":
        return compareByName(evalNumber(expression.left), expression.op, evalNumber(expression.right));

      case "and":
        return expression.args.every(evalBoolean);

      case "or":
        return expression.args.some(evalBoolean);

      case "not":
        return !evalBoolean(expression.arg);

      case "sensor":
        return readSensorBoolean(expression);
    }
  }

  function readSensorValue(expression: Extract<IRValueExpression, { kind: "sensor" }>): number {
    const sensor = expression.sensor.toLowerCase();
    if (sensor.includes("line-position")) return sim.state.sensors.linePosition;
    if (sensor.includes("timer")) return sim.state.tick;
    if (sensor.includes("grayscale")) {
      const channel = Math.max(1, Math.min(5, expression.channel ?? 1));
      return sim.state.sensors.roads[channel - 1];
    }
    pushDiagnostic(createDiagnostic("HTLAB_SENSOR_UNSUPPORTED", `Sensor value ${expression.sensor} is not simulated.`));
    return 0;
  }

  function readSensorBoolean(expression: Extract<IRBooleanExpression, { kind: "sensor" }>): boolean {
    const sensor = expression.sensor.toLowerCase();
    if (sensor.includes("remote")) {
      pushDiagnostic(createDiagnostic("HTLAB_REMOTE_STUB", "Remote control button is an intentional stub and returned false."));
      return false;
    }
    if (sensor.includes("group")) {
      const group = typeof expression.channel === "number" ? expression.channel : 1;
      return detectGroup(sim.state.sensors.roads as number[], group) === 1;
    }
    if (sensor.includes("grayscale")) {
      const value = readSensorValue({ kind: "sensor", sensor: expression.sensor, port: expression.port, channel: expression.channel });
      return value > 50;
    }
    pushDiagnostic(createDiagnostic("HTLAB_SENSOR_BOOLEAN_UNSUPPORTED", `Sensor boolean ${expression.sensor} is not simulated.`));
    return false;
  }

  function completeFrame(frame: V2Frame): void {
    if (!frame.loop) {
      frames.pop();
      if (frames.length === 0) done = true;
      return;
    }

    frame.loop.iterations++;
    if (frame.loop.iterations >= maxLoopIterations) {
      pushDiagnostic(createDiagnostic("HTLAB_LOOP_CAP", `Loop stopped after ${maxLoopIterations} iterations.`, frame.loop.source));
      frames.pop();
      return;
    }

    if (frame.loop.type === "times") {
      const remaining = frame.loop.remaining ?? 0;
      if (remaining > 1) {
        frame.loop.remaining = remaining - 1;
        frame.index = 0;
      } else {
        frames.pop();
      }
      return;
    }

    if (frame.loop.type === "until") {
      if (frame.loop.condition && evalBoolean(frame.loop.condition)) {
        frames.pop();
      } else {
        frame.index = 0;
      }
      return;
    }

    frame.index = 0;
  }

  function breakCurrentLoop(): void {
    while (frames.length > 0) {
      const frame = frames.pop();
      if (frame?.loop) return;
    }
    pushDiagnostic(createDiagnostic("HTLAB_BREAK_WITHOUT_LOOP", "break was used outside a loop."));
  }

  function executeCommand(command: IRCommandV2, frame: V2Frame): boolean {
    switch (command.op) {
      case "hardware.initialize":
      case "hardware.initializeTankLineFollower":
        sim.reset();
        frame.index++;
        return false;

      case "sensor.calibrateGrayscale":
        sim.calibrateGrayscale();
        frame.index++;
        return false;

      case "motion.setMotorPair":
      case "motion.setMotorPairForTime": {
        const left = numericArg(command, ["left", "leftSpeed"], 0);
        const right = numericArg(command, ["right", "rightSpeed"], 0);
        sim.setMotors(left, right);
        const seconds = numericArg(command, ["seconds"], 0);
        frame.index++;
        if (seconds > 0) {
          waitCounter = Math.round(seconds * 60);
          return true;
        }
        return false;
      }

      case "motion.stopMotor":
      case "motion.stopMotorPair":
        sim.setMotors(0, 0);
        frame.index++;
        return false;

      case "variable.set": {
        const name = toText(command.args.name, "v0");
        variables.set(name, evalNumber(asValueExpression(command.args.value)));
        frame.index++;
        return false;
      }

      case "control.waitTicks":
        waitCounter = Math.max(0, Math.round(numericArg(command, ["ticks"], 0)));
        frame.index++;
        return true;

      case "control.waitSeconds":
        waitCounter = Math.max(0, Math.round(numericArg(command, ["seconds"], 0) * 60));
        frame.index++;
        return true;

      case "control.if": {
        frame.index++;
        if (evalBoolean(asBooleanExpression(command.args.condition))) {
          frames.push({ nodes: command.children?.then ?? command.children?.do ?? [], index: 0 });
        }
        return false;
      }

      case "control.ifElse": {
        frame.index++;
        const branch = evalBoolean(asBooleanExpression(command.args.condition))
          ? command.children?.then
          : command.children?.else;
        frames.push({ nodes: branch ?? [], index: 0 });
        return false;
      }

      case "control.repeatTimes": {
        const times = Math.max(0, Math.floor(numericArg(command, ["times", "count"], 0)));
        frame.index++;
        if (times > 0) {
          frames.push({
            nodes: command.children?.do ?? [],
            index: 0,
            loop: { type: "times", remaining: times, iterations: 0, source: command.source },
          });
        }
        return false;
      }

      case "control.repeatForever":
        frame.index++;
        frames.push({
          nodes: command.children?.do ?? [],
          index: 0,
          loop: { type: "forever", iterations: 0, source: command.source },
        });
        return false;

      case "control.repeatUntil": {
        const condition = asBooleanExpression(command.args.condition);
        frame.index++;
        if (!evalBoolean(condition)) {
          frames.push({
            nodes: command.children?.do ?? [],
            index: 0,
            loop: { type: "until", condition, iterations: 0, source: command.source },
          });
        }
        return false;
      }

      case "control.waitUntil": {
        const condition = asBooleanExpression(command.args.condition);
        frame.index++;
        if (!evalBoolean(condition)) {
          waitUntil = {
            condition,
            remaining: Math.max(0, Math.round(numericArg(command, ["timeoutTicks"], waitUntilTimeoutTicks))),
            source: command.source,
          };
          return true;
        }
        return false;
      }

      case "control.break":
        frame.index++;
        breakCurrentLoop();
        return false;

      case "control.return":
        done = true;
        frame.index++;
        return true;

      default:
        if (command.metadata.runtimeStatus === "stub" || command.metadata.runtimeStatus === "blocked-by-sandbox") {
          pushDiagnostic(createDiagnostic(
            "HTLAB_UNSUPPORTED_BLOCK",
            `${command.source?.blockType ?? command.op} is ${command.metadata.runtimeStatus}.`,
            command.source,
            command.metadata.runtimeStatus === "blocked-by-sandbox" ? "error" : "warning",
          ));
        } else {
          pushDiagnostic(createDiagnostic("HTLAB_UNKNOWN_COMMAND", `Unknown v2 command ${command.op}.`, command.source));
        }
        frame.index++;
        return false;
    }
  }

  function reset(): void {
    frames.length = 0;
    frames.push({ nodes: program.nodes, index: 0 });
    variables.clear();
    waitCounter = 0;
    waitUntil = null;
    tickCount = 0;
    diagnostics.length = 0;
    diagnostics.push(...program.diagnostics);
    done = false;
  }

  function step(): boolean {
    if (done) return false;

    tickCount++;
    if (tickCount > maxTicks) {
      pushDiagnostic(createDiagnostic("HTLAB_MAX_TICKS", `Program stopped after ${maxTicks} ticks.`));
      done = true;
      return false;
    }

    if (waitCounter > 0) {
      waitCounter--;
      return true;
    }

    if (waitUntil) {
      if (evalBoolean(waitUntil.condition)) {
        waitUntil = null;
      } else {
        waitUntil.remaining--;
        if (waitUntil.remaining < 0) {
          pushDiagnostic(createDiagnostic("HTLAB_WAIT_UNTIL_TIMEOUT", "wait until timed out.", waitUntil.source));
          waitUntil = null;
        } else {
          return true;
        }
      }
    }

    let executed = 0;
    while (!done && executed < maxInstructionsPerTick) {
      const frame = frames[frames.length - 1];
      if (!frame) {
        done = true;
        return false;
      }

      if (frame.index >= frame.nodes.length) {
        completeFrame(frame);
        continue;
      }

      const node = frame.nodes[frame.index];
      if (node.kind === "diagnostic") {
        pushDiagnostic(node.diagnostic);
        frame.index++;
        executed++;
        continue;
      }

      const yielded = executeCommand(node, frame);
      executed++;
      if (yielded) return !done;
    }

    if (executed >= maxInstructionsPerTick) return true;
    return !done;
  }

  return {
    step,
    reset,
    get done() {
      return done;
    },
    get diagnostics() {
      return diagnostics;
    },
  };
}
