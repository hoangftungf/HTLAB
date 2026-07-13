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
const DEFAULT_MAX_PATROL_TICKS = 1200;
const DEFAULT_MAX_TURN_TICKS = 360;
const LINE_FOLLOWER_MIN_DETECTION_TICKS = 3;

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

type MotorPort = "A" | "B" | "C" | "D" | "all";

interface MotorTargets {
  left: number;
  right: number;
}

type ActiveMotion =
  | {
      type: "timedMotor";
      remainingTicks: number;
      source?: IRSourceRef;
    }
  | {
      type: "motorUntil";
      left: number;
      right: number;
      condition: IRBooleanExpression;
      elapsedTicks: number;
      timeoutTicks: number;
      source?: IRSourceRef;
    }
  | {
      type: "lineFollow";
      mode: "continuous" | "forTime" | "untilIntersection";
      speed: number;
      remainingTicks?: number;
      elapsedTicks: number;
      timeoutTicks: number;
      rushTicks: number;
      source?: IRSourceRef;
      diagnosticsIssued: boolean;
    }
  | {
      type: "lineTurn";
      branch: string;
      left: number;
      right: number;
      elapsedTicks: number;
      timeoutTicks: number;
      source?: IRSourceRef;
      diagnosticsIssued: boolean;
    };

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
  const maxPatrolTicks = config.maxPatrolTicks ?? DEFAULT_MAX_PATROL_TICKS;
  const maxTurnTicks = config.maxTurnTicks ?? DEFAULT_MAX_TURN_TICKS;
  const rng = createRNG(config.randomSeed ?? 42);
  const diagnostics: IRDiagnostic[] = [...program.diagnostics];
  const variables = new Map<string, number>();
  const frames: V2Frame[] = [{ nodes: program.nodes, index: 0 }];

  let waitCounter = 0;
  let waitUntil: WaitUntilState | null = null;
  let activeMotion: ActiveMotion | null = null;
  let motorTargets: MotorTargets = { left: 0, right: 0 };
  let lineFollowerInitialized = false;
  let lineFollowerMode: "tank" | "omni" | null = null;
  let tickCount = 0;
  let done = false;

  function pushDiagnostic(diagnostic: IRDiagnostic): void {
    diagnostics.push(diagnostic);
  }

  function clampPower(value: number): number {
    return Math.max(-1, Math.min(1, value));
  }

  function percentToPower(value: number): number {
    return clampPower(Math.abs(value) > 1 ? value / 100 : value);
  }

  function motorPort(value: IRFieldValue | undefined, fallback: MotorPort = "all"): MotorPort {
    const port = toText(value, fallback).toUpperCase();
    if (port === "A" || port === "B" || port === "C" || port === "D" || port === "ALL") {
      return port === "ALL" ? "all" : port;
    }
    return fallback;
  }

  function setMotorTargets(left: number, right: number): void {
    motorTargets = { left: clampPower(left), right: clampPower(right) };
    sim.setMotors(motorTargets.left, motorTargets.right);
  }

  function setMotorByPort(port: MotorPort, power: number, source?: IRSourceRef): void {
    const normalized = clampPower(power);
    if (port === "all") {
      setMotorTargets(normalized, normalized);
      return;
    }
    if (port === "A") {
      setMotorTargets(normalized, motorTargets.right);
      return;
    }
    if (port === "B") {
      setMotorTargets(motorTargets.left, normalized);
      return;
    }
    pushDiagnostic(createDiagnostic("HTLAB_MOTOR_PORT_UNSUPPORTED", `Motor ${port} is not mapped in the differential-drive simulator.`, source));
  }

  function stopMotorByPort(port: MotorPort, source?: IRSourceRef): void {
    if (port === "all") {
      setMotorTargets(0, 0);
      return;
    }
    setMotorByPort(port, 0, source);
  }

  function reverseMotorByPort(port: MotorPort, source?: IRSourceRef): void {
    if (port === "all") {
      setMotorTargets(-motorTargets.left, -motorTargets.right);
      return;
    }
    if (port === "A") {
      setMotorTargets(-motorTargets.left, motorTargets.right);
      return;
    }
    if (port === "B") {
      setMotorTargets(motorTargets.left, -motorTargets.right);
      return;
    }
    pushDiagnostic(createDiagnostic("HTLAB_MOTOR_PORT_UNSUPPORTED", `Motor ${port} cannot be reversed in the differential-drive simulator.`, source));
  }

  function directionSign(command: IRCommandV2): number {
    const direction = toText(command.args.direction, "Forward").toLowerCase();
    return direction.includes("back") ? -1 : 1;
  }

  function powerArg(command: IRCommandV2, names: string[], fallback = 0): number {
    return percentToPower(numericArg(command, names, fallback));
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

  function lineFollowerReady(active: { diagnosticsIssued: boolean; source?: IRSourceRef }): boolean {
    let ready = true;
    if (!lineFollowerInitialized) {
      if (!active.diagnosticsIssued) {
        pushDiagnostic(createDiagnostic("HTLAB_LINE_FOLLOWER_NOT_INITIALIZED", "Line follower command ran before patrol initialize.", active.source));
      }
      ready = false;
    }
    if (!sim.state.sensors.calibrated) {
      if (!active.diagnosticsIssued) {
        pushDiagnostic(createDiagnostic("HTLAB_GRAYSCALE_NOT_CALIBRATED", "Line follower command ran before black and white detection calibration.", active.source));
      }
      ready = false;
    }
    active.diagnosticsIssued = true;
    return ready;
  }

  function roadCount(): number {
    return sim.state.sensors.roads.filter((road) => road > 50).length;
  }

  function detectsIntersection(): boolean {
    const roads = sim.state.sensors.roads as number[];
    const left = detectGroup(roads, 0) === 1;
    const middle = detectGroup(roads, 1) === 1;
    const right = detectGroup(roads, 2) === 1;
    return roadCount() >= 3 || (left && middle && right);
  }

  function detectsBranch(branch: string): boolean {
    const normalized = branch.toLowerCase();
    if (normalized.includes("cross") || normalized.includes("t/") || normalized.includes("intersection")) {
      return detectsIntersection();
    }
    const group = normalized.includes("left") ? 0 : normalized.includes("right") ? 2 : 1;
    return detectGroup(sim.state.sensors.roads as number[], group) === 1;
  }

  function applyLineFollower(speed: number): void {
    const base = clampPower(Math.abs(speed));
    const sensors = sim.state.sensors;
    if (roadCount() === 0) {
      setMotorTargets(base * 0.25, -base * 0.25);
      return;
    }
    const error = sensors.linePosition / 100;
    const correction = clampPower(error * base * 0.8);
    setMotorTargets(base + correction, base - correction);
  }

  function completeActiveMotion(stop = true): void {
    activeMotion = null;
    if (stop) setMotorTargets(0, 0);
  }

  function advanceActiveMotion(): boolean {
    const active = activeMotion;
    if (!active) return false;

    if (active.type === "timedMotor") {
      if (active.remainingTicks <= 0) {
        completeActiveMotion();
        return false;
      }
      active.remainingTicks--;
      return true;
    }

    if (active.type === "motorUntil") {
      if (evalBoolean(active.condition)) {
        completeActiveMotion();
        return false;
      }
      if (active.elapsedTicks >= active.timeoutTicks) {
        pushDiagnostic(createDiagnostic("HTLAB_MOTOR_UNTIL_TIMEOUT", `Motor-until command stopped after ${active.timeoutTicks} ticks.`, active.source));
        completeActiveMotion();
        return false;
      }
      setMotorTargets(active.left, active.right);
      active.elapsedTicks++;
      return true;
    }

    if (active.type === "lineFollow") {
      if (!lineFollowerReady(active)) {
        completeActiveMotion();
        return false;
      }

      if (active.mode === "forTime") {
        if ((active.remainingTicks ?? 0) <= 0) {
          completeActiveMotion();
          return false;
        }
        applyLineFollower(active.speed);
        active.remainingTicks = (active.remainingTicks ?? 0) - 1;
        return true;
      }

      if (
        active.mode === "untilIntersection" &&
        active.elapsedTicks >= LINE_FOLLOWER_MIN_DETECTION_TICKS &&
        detectsIntersection()
      ) {
        if (active.rushTicks > 0) {
          setMotorTargets(active.speed, active.speed);
          activeMotion = { type: "timedMotor", remainingTicks: active.rushTicks, source: active.source };
          return true;
        }
        completeActiveMotion();
        return false;
      }

      if (active.elapsedTicks >= active.timeoutTicks) {
        pushDiagnostic(createDiagnostic("HTLAB_PATROL_TIMEOUT", `Line follower stopped after ${active.timeoutTicks} ticks.`, active.source));
        completeActiveMotion();
        return false;
      }

      applyLineFollower(active.speed);
      active.elapsedTicks++;
      return true;
    }

    if (!lineFollowerReady(active)) {
      completeActiveMotion();
      return false;
    }
    if (active.elapsedTicks >= LINE_FOLLOWER_MIN_DETECTION_TICKS && detectsBranch(active.branch)) {
      completeActiveMotion();
      return false;
    }
    if (active.elapsedTicks >= active.timeoutTicks) {
      pushDiagnostic(createDiagnostic("HTLAB_LINE_TURN_TIMEOUT", `Turn could not reacquire ${active.branch} within ${active.timeoutTicks} ticks.`, active.source));
      completeActiveMotion();
      return false;
    }
    setMotorTargets(active.left, active.right);
    active.elapsedTicks++;
    return true;
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
        sim.reset();
        motorTargets = { left: 0, right: 0 };
        lineFollowerInitialized = false;
        lineFollowerMode = null;
        activeMotion = null;
        frame.index++;
        return false;

      case "hardware.initializeTankLineFollower":
        sim.reset();
        motorTargets = { left: 0, right: 0 };
        lineFollowerInitialized = true;
        lineFollowerMode = "tank";
        frame.index++;
        return false;

      case "hardware.initializeOmniLineFollower":
        sim.reset();
        motorTargets = { left: 0, right: 0 };
        lineFollowerInitialized = true;
        lineFollowerMode = "omni";
        pushDiagnostic(createDiagnostic("HTLAB_OMNI_STUB", "Omni-wheel line follower is configured but approximated by differential-drive physics.", command.source));
        frame.index++;
        return false;

      case "sensor.calibrateGrayscale":
        sim.calibrateGrayscale();
        frame.index++;
        return false;

      case "motion.setMotorPair": {
        const sign = directionSign(command);
        const left = numericArg(command, ["left", "leftSpeed", "powerA"], 0) * sign;
        const right = numericArg(command, ["right", "rightSpeed", "powerB"], 0) * sign;
        setMotorTargets(left, right);
        frame.index++;
        return false;
      }

      case "motion.setMotorPairForTime": {
        const sign = directionSign(command);
        const left = numericArg(command, ["left", "leftSpeed", "powerA"], 0) * sign;
        const right = numericArg(command, ["right", "rightSpeed", "powerB"], 0) * sign;
        setMotorTargets(left, right);
        const seconds = numericArg(command, ["seconds"], 0);
        frame.index++;
        if (seconds > 0) {
          activeMotion = {
            type: "timedMotor",
            remainingTicks: Math.max(1, Math.round(seconds * 60)) - 1,
            source: command.source,
          };
          return true;
        }
        return false;
      }

      case "motion.setMotor": {
        setMotorByPort(motorPort(command.args.motor, "A"), powerArg(command, ["power"], 0), command.source);
        frame.index++;
        return false;
      }

      case "motion.setMotorForTime": {
        setMotorByPort(motorPort(command.args.motor, "A"), powerArg(command, ["power"], 0), command.source);
        const seconds = numericArg(command, ["seconds"], 0);
        frame.index++;
        if (seconds > 0) {
          activeMotion = {
            type: "timedMotor",
            remainingTicks: Math.max(1, Math.round(seconds * 60)) - 1,
            source: command.source,
          };
          return true;
        }
        return false;
      }

      case "motion.setMotorPairUntil": {
        const left = numericArg(command, ["left", "leftSpeed"], 0);
        const right = numericArg(command, ["right", "rightSpeed"], 0);
        activeMotion = {
          type: "motorUntil",
          left,
          right,
          condition: asBooleanExpression(command.args.condition),
          elapsedTicks: 0,
          timeoutTicks: Math.max(1, Math.round(numericArg(command, ["timeoutTicks"], maxPatrolTicks))),
          source: command.source,
        };
        frame.index++;
        return advanceActiveMotion();
      }

      case "motion.reverseMotor":
        reverseMotorByPort(motorPort(command.args.motor, "all"), command.source);
        frame.index++;
        return false;

      case "motion.stopMotor":
        stopMotorByPort(motorPort(command.args.motor, "all"), command.source);
        frame.index++;
        return false;

      case "motion.stopMotorPair":
        setMotorTargets(0, 0);
        frame.index++;
        return false;

      case "motion.setMotorPairForEncoderDegrees":
      case "motion.setMotorForEncoderDegrees":
      case "sensor.motorEncoder":
      case "sensor.resetMotorEncoder":
        pushDiagnostic(createDiagnostic("HTLAB_ENCODER_UNSUPPORTED", "Encoder/angle motor control is not available in the current simulator.", command.source));
        frame.index++;
        return false;

      case "motion.omniMove":
      case "motion.omniTurn":
      case "motion.omniStop":
        pushDiagnostic(createDiagnostic("HTLAB_OMNI_STUB", "Omni-wheel motion is not represented by the differential-drive physics model.", command.source));
        frame.index++;
        return false;

      case "motion.steeringGearAngle":
      case "motion.steeringGearRotation":
      case "motion.restoreSteeringTorque":
        pushDiagnostic(createDiagnostic("HTLAB_TELEMETRY_ONLY", `${command.op} recorded as telemetry-only; robot physics unchanged.`, command.source, "info"));
        frame.index++;
        return false;

      case "lineFollower.followContinuous": {
        activeMotion = {
          type: "lineFollow",
          mode: "continuous",
          speed: clampPower(numericArg(command, ["speed"], 0.3)),
          elapsedTicks: 0,
          timeoutTicks: Math.max(1, Math.round(numericArg(command, ["timeoutTicks"], maxPatrolTicks))),
          rushTicks: 0,
          source: command.source,
          diagnosticsIssued: false,
        };
        frame.index++;
        return advanceActiveMotion();
      }

      case "lineFollower.followForTime": {
        activeMotion = {
          type: "lineFollow",
          mode: "forTime",
          speed: clampPower(numericArg(command, ["speed"], 0.3)),
          remainingTicks: Math.max(1, Math.round(numericArg(command, ["seconds"], 0) * 60)),
          elapsedTicks: 0,
          timeoutTicks: Math.max(1, Math.round(numericArg(command, ["timeoutTicks"], maxPatrolTicks))),
          rushTicks: 0,
          source: command.source,
          diagnosticsIssued: false,
        };
        frame.index++;
        return advanceActiveMotion();
      }

      case "lineFollower.untilIntersection": {
        activeMotion = {
          type: "lineFollow",
          mode: "untilIntersection",
          speed: clampPower(numericArg(command, ["speed"], 0.3)),
          elapsedTicks: 0,
          timeoutTicks: Math.max(1, Math.round(numericArg(command, ["timeoutTicks"], maxPatrolTicks))),
          rushTicks: Math.max(0, Math.round(numericArg(command, ["rushSeconds"], 0) * 60)),
          source: command.source,
          diagnosticsIssued: false,
        };
        frame.index++;
        return advanceActiveMotion();
      }

      case "lineFollower.turnUntilBranch": {
        activeMotion = {
          type: "lineTurn",
          branch: toText(command.args.branch, "middle"),
          left: clampPower(numericArg(command, ["left", "leftSpeed"], 0)),
          right: clampPower(numericArg(command, ["right", "rightSpeed"], 0)),
          elapsedTicks: 0,
          timeoutTicks: Math.max(1, Math.round(numericArg(command, ["timeoutTicks"], maxTurnTicks))),
          source: command.source,
          diagnosticsIssued: false,
        };
        frame.index++;
        return advanceActiveMotion();
      }

      case "compat.startButton":
        pushDiagnostic(createDiagnostic("HTLAB_START_BUTTON_STUB", "Start button is an intentional no-op compatibility block.", command.source, "info"));
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
        } else if (command.metadata.runtimeStatus === "telemetry-only") {
          pushDiagnostic(createDiagnostic(
            "HTLAB_TELEMETRY_ONLY",
            `${command.source?.blockType ?? command.op} is telemetry-only in this simulator.`,
            command.source,
            "info",
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
    activeMotion = null;
    motorTargets = { left: 0, right: 0 };
    lineFollowerInitialized = false;
    lineFollowerMode = null;
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

    if (activeMotion && advanceActiveMotion()) {
      return true;
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
