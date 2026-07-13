import * as Blockly from "blockly";
import { CompareOp, OpCode, type IRCommand, type IRProgram } from "@htlab/simulation-core";

type IRPrimitiveLocal = string | number | boolean | null;
type IRRuntimeStatusLocal = "implemented" | "telemetry-only" | "stub" | "blocked-by-sandbox";
type IRDiagnosticSeverityLocal = "info" | "warning" | "error";

interface IRSourceRefLocal {
  blockId?: string;
  blockType: string;
  category?: string;
  label?: string;
}

interface IRDiagnosticLocal {
  code: string;
  severity: IRDiagnosticSeverityLocal;
  message: string;
  source?: IRSourceRefLocal;
  runtimeStatus?: IRRuntimeStatusLocal;
  handlerId?: string;
}

interface IRCCodePayloadLocal {
  language: "c";
  source: string;
  entryPoint?: string;
  sandbox: {
    required: true;
    status: "available" | "blocked";
    timeoutMs: number;
    memoryMb: number;
    allowedApis: string[];
  };
}

type IRValueExpressionLocal =
  | { kind: "literal"; value: IRPrimitiveLocal }
  | { kind: "variable"; name: string }
  | { kind: "sensor"; sensor: string; port?: string | number; channel?: number }
  | { kind: "unary"; op: string; arg: IRValueExpressionLocal; angleUnit?: "degree" | "radian" }
  | { kind: "binary"; op: string; left: IRValueExpressionLocal; right: IRValueExpressionLocal }
  | { kind: "call"; callee: string; args: IRValueExpressionLocal[] }
  | { kind: "c-code"; payload: IRCCodePayloadLocal };

type IRBooleanExpressionLocal =
  | { kind: "literal"; value: boolean }
  | { kind: "compare"; op: "EQ" | "NEQ" | "LT" | "LTE" | "GT" | "GTE"; left: IRValueExpressionLocal; right: IRValueExpressionLocal }
  | { kind: "and"; args: IRBooleanExpressionLocal[] }
  | { kind: "or"; args: IRBooleanExpressionLocal[] }
  | { kind: "not"; arg: IRBooleanExpressionLocal }
  | { kind: "sensor"; sensor: string; port?: string | number; channel?: number; predicate: string };

type IRCompareOpNameLocal = "EQ" | "NEQ" | "LT" | "LTE" | "GT" | "GTE";

type IRFieldValueLocal =
  | IRPrimitiveLocal
  | IRValueExpressionLocal
  | IRBooleanExpressionLocal
  | IRCCodePayloadLocal;

interface IRCommandNodeLocal {
  kind: "command";
  op: string;
  args: Record<string, IRFieldValueLocal>;
  children?: Record<string, IRNodeLocal[]>;
  source?: IRSourceRefLocal;
  diagnostics?: IRDiagnosticLocal[];
  metadata: {
    sourceText?: string;
    runtimeStatus: IRRuntimeStatusLocal;
    handlerId: string;
    cCode?: IRCCodePayloadLocal;
  };
}

interface IRDiagnosticNodeLocal {
  kind: "diagnostic";
  diagnostic: IRDiagnosticLocal;
  source?: IRSourceRefLocal;
}

type IRNodeLocal = IRCommandNodeLocal | IRDiagnosticNodeLocal;

interface IRProgramV2Local {
  version: 2;
  commands: IRCommand[];
  nodes: IRNodeLocal[];
  diagnostics: IRDiagnosticLocal[];
  metadata: {
    generator: string;
    generatedAt?: string;
    source: "blockly" | "import" | "sample" | "test";
    compatibility: {
      acceptsV1: true;
      migrationNotes: string[];
    };
  };
  legacyV1?: {
    commands: IRCommand[];
    note: string;
  };
}

const POWER_SPEEDS: Record<string, number> = {
  low: 0.2,
  medium: 0.4,
  high: 0.7,
};

const V2_ONLY_BLOCKS = new Set([
  "motion_set_motors_v2",
  "motion_set_motors_for_time_v2",
  "set_var_v2",
  "value_number",
  "value_variable",
  "value_sensor_road",
  "value_line_position",
  "math_binary",
  "math_remainder",
  "math_unary",
  "math_random_range",
  "logic_literal_v2",
  "logic_compare_v2",
  "logic_operation_v2",
  "logic_not_v2",
  "logic_sensor_group",
  "remote_control_button",
  "control_if_v2",
  "control_if_else_v2",
  "control_repeat_times_v2",
  "control_repeat_forever",
  "control_repeat_until",
  "control_wait_until",
  "control_break",
  "control_return",
  "wait_seconds_v2",
]);

let labelCounter = 0;
function nextLabel(): number {
  return labelCounter++;
}

export function workspaceToIR(workspace: Blockly.Workspace): IRProgram {
  labelCounter = 0;
  const topBlocks = workspace.getTopBlocks(true).filter((block) => block.isEnabled());

  if (topBlocks.some(blockRequiresV2)) {
    return workspaceToV2IR(topBlocks) as unknown as IRProgram;
  }

  const commands: IRCommand[] = [];
  for (const block of topBlocks) {
    commands.push(...blockToIR(block));
  }

  if (commands.length === 0 || commands[commands.length - 1]?.op !== OpCode.END_PROGRAM) {
    commands.push({ op: OpCode.END_PROGRAM, args: [] });
  }

  return { commands, version: 1 };
}

function workspaceToV2IR(topBlocks: Blockly.Block[]): IRProgramV2Local {
  const nodes = topBlocks.flatMap(blockSequenceToV2Nodes);
  const diagnostics = collectDiagnostics(nodes);

  labelCounter = 0;
  const commands = topBlocks.flatMap(blockToIR);
  if (commands.length === 0 || commands[commands.length - 1]?.op !== OpCode.END_PROGRAM) {
    commands.push({ op: OpCode.END_PROGRAM, args: [] });
  }

  return {
    version: 2,
    commands,
    nodes,
    diagnostics,
    metadata: {
      generator: "htlab-blockly",
      generatedAt: new Date().toISOString(),
      source: "blockly",
      compatibility: {
        acceptsV1: true,
        migrationNotes: [
          "Legacy IR v1 commands remain available for UI compatibility.",
          "Expression and structured control-flow blocks execute through IR v2 nodes.",
        ],
      },
    },
    legacyV1: {
      commands,
      note: "Lossy compatibility lowering; IR v2 nodes are authoritative for C-010 blocks.",
    },
  };
}

function blockRequiresV2(block: Blockly.Block | null): boolean {
  if (!block) return false;
  if (V2_ONLY_BLOCKS.has(block.type)) return true;

  for (const input of block.inputList) {
    const child = input.connection?.targetBlock() ?? null;
    if (blockRequiresV2(child)) return true;
  }

  return blockRequiresV2(block.getNextBlock());
}

function collectDiagnostics(nodes: IRNodeLocal[]): IRDiagnosticLocal[] {
  const diagnostics: IRDiagnosticLocal[] = [];
  const visit = (nodeList: IRNodeLocal[]) => {
    for (const node of nodeList) {
      if (node.kind === "diagnostic") {
        diagnostics.push(node.diagnostic);
      } else {
        diagnostics.push(...(node.diagnostics ?? []));
        for (const childNodes of Object.values(node.children ?? {})) {
          visit(childNodes);
        }
      }
    }
  };
  visit(nodes);
  return diagnostics;
}

function sourceFor(block: Blockly.Block, category = categoryForType(block.type)): IRSourceRefLocal {
  return {
    blockId: block.id,
    blockType: block.type,
    category,
  };
}

function categoryForType(type: string): string {
  if (type.includes("motion") || type.includes("motor") || type.includes("turn") || type === "patrol_line") return "Movement";
  if (type.includes("sensor") || type.includes("line_position") || type.includes("remote")) return "Sensors";
  if (type.includes("math") || type.includes("value")) return "Values";
  if (type.includes("logic") || type.includes("control") || type.includes("if") || type.includes("repeat") || type.includes("wait")) return "Control";
  if (type.includes("var")) return "Variables";
  if (type.includes("initialize") || type.includes("calibrate")) return "Hardware";
  return "Blocks";
}

function commandNode(
  block: Blockly.Block,
  op: string,
  args: Record<string, IRFieldValueLocal> = {},
  children?: Record<string, IRNodeLocal[]>,
  runtimeStatus: IRRuntimeStatusLocal = "implemented",
  handlerId = `runtime.${op}`,
): IRCommandNodeLocal {
  return {
    kind: "command",
    op,
    args,
    ...(children ? { children } : {}),
    source: sourceFor(block),
    metadata: {
      runtimeStatus,
      handlerId,
    },
  };
}

function diagnosticNode(
  block: Blockly.Block,
  code: string,
  message: string,
  severity: IRDiagnosticSeverityLocal = "warning",
  runtimeStatus: IRRuntimeStatusLocal = "stub",
  handlerId = "runtime.diagnostic.generator",
): IRDiagnosticNodeLocal {
  const source = sourceFor(block);
  return {
    kind: "diagnostic",
    source,
    diagnostic: {
      code,
      severity,
      message,
      source,
      runtimeStatus,
      handlerId,
    },
  };
}

function literal(value: IRPrimitiveLocal): IRValueExpressionLocal {
  return { kind: "literal", value };
}

function fieldText(block: Blockly.Block, name: string, fallback = ""): string {
  const value = block.getFieldValue(name);
  return value === null || value === undefined ? fallback : String(value);
}

function fieldNumber(block: Blockly.Block, name: string, fallback = 0): number {
  const parsed = Number(fieldText(block, name, String(fallback)));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fieldBoolean(block: Blockly.Block, name: string, fallback = false): boolean {
  const value = fieldText(block, name, fallback ? "TRUE" : "FALSE").toUpperCase();
  return value === "TRUE" || value === "1" || value === "YES";
}

function valueFromInput(block: Blockly.Block, name: string, fallback: IRPrimitiveLocal = 0): IRValueExpressionLocal {
  const child = block.getInputTargetBlock(name);
  return child ? valueFromBlock(child) : literal(fallback);
}

function booleanFromInput(block: Blockly.Block, name: string, fallback = false): IRBooleanExpressionLocal {
  const child = block.getInputTargetBlock(name);
  return child ? booleanFromBlock(child) : { kind: "literal", value: fallback };
}

function compareOpFromField(block: Blockly.Block, fallback: IRCompareOpNameLocal = "GT"): IRCompareOpNameLocal {
  const op = fieldText(block, "OP", fallback).toUpperCase();
  if (op === "EQ" || op === "NEQ" || op === "LT" || op === "LTE" || op === "GT" || op === "GTE") {
    return op;
  }
  if (op === "=" || op === "==") return "EQ";
  if (op === "!=") return "NEQ";
  if (op === "<") return "LT";
  if (op === "<=") return "LTE";
  if (op === ">") return "GT";
  if (op === ">=") return "GTE";
  return fallback;
}

function binaryOpFromField(block: Blockly.Block): string {
  const op = fieldText(block, "OP", "ADD").toUpperCase();
  const byName: Record<string, string> = {
    ADD: "+",
    PLUS: "+",
    MINUS: "-",
    SUBTRACT: "-",
    MULTIPLY: "*",
    TIMES: "*",
    DIVIDE: "/",
    MODULO: "%",
    REMAINDER: "%",
    POWER: "power",
  };
  return byName[op] ?? fieldText(block, "OP", "+");
}

function unaryOpFromField(block: Blockly.Block): string {
  const op = fieldText(block, "OP", "ABS").toUpperCase();
  const byName: Record<string, string> = {
    ABS: "abs",
    ROOT: "sqrt",
    SQRT: "sqrt",
    LN: "ln",
    LOG: "log",
    LOG10: "log",
    EXP: "exp",
    POW10: "10^",
    ROUND: "round",
    ROUNDUP: "ceiling",
    ROUNDDOWN: "floor",
    FLOOR: "floor",
    CEILING: "ceiling",
    CEIL: "ceiling",
    NEG: "negate",
    SIN: "sin",
    COS: "cos",
    TAN: "tan",
    ASIN: "asin",
    ACOS: "acos",
    ATAN: "atan",
  };
  return byName[op] ?? fieldText(block, "OP", "abs").toLowerCase();
}

function angleUnitFromField(block: Blockly.Block): "degree" | "radian" {
  return fieldText(block, "ANGLE_UNIT", "degree") === "radian" ? "radian" : "degree";
}

function valueFromBlock(block: Blockly.Block): IRValueExpressionLocal {
  switch (block.type) {
    case "math_number":
      return literal(fieldNumber(block, "NUM", 0));

    case "value_number":
      return literal(fieldNumber(block, "NUM", 0));

    case "value_variable":
      return { kind: "variable", name: fieldText(block, "VAR", "v0") };

    case "variables_get":
      return { kind: "variable", name: fieldText(block, "VAR", "v0") };

    case "read_sensor_road":
    case "value_sensor_road":
      return {
        kind: "sensor",
        sensor: "integrated-grayscale",
        port: "builtin",
        channel: fieldNumber(block, "ROAD", 3),
      };

    case "line_position":
    case "value_line_position":
      return { kind: "sensor", sensor: "line-position" };

    case "math_binary":
    case "math_arithmetic":
      return {
        kind: "binary",
        op: binaryOpFromField(block),
        left: valueFromInput(block, "A", 0),
        right: valueFromInput(block, "B", 0),
      };

    case "math_remainder":
      return {
        kind: "binary",
        op: "%",
        left: valueFromInput(block, "A", 0),
        right: valueFromInput(block, "B", 1),
      };

    case "math_unary":
      return {
        kind: "unary",
        op: unaryOpFromField(block),
        arg: valueFromInput(block, "ARG", 0),
        angleUnit: angleUnitFromField(block),
      };

    case "math_single":
    case "math_trig":
      return {
        kind: "unary",
        op: unaryOpFromField(block),
        arg: valueFromInput(block, block.type === "math_trig" ? "NUM" : "NUM", 0),
        angleUnit: block.type === "math_trig" ? "degree" : angleUnitFromField(block),
      };

    case "math_random_range":
      return {
        kind: "call",
        callee: "randomRange",
        args: [valueFromInput(block, "MIN", 0), valueFromInput(block, "MAX", 10)],
      };

    default:
      return literal(0);
  }
}

function booleanFromBlock(block: Blockly.Block): IRBooleanExpressionLocal {
  switch (block.type) {
    case "logic_boolean":
    case "logic_literal_v2":
      return { kind: "literal", value: fieldBoolean(block, "BOOL", false) };

    case "logic_compare":
    case "logic_compare_v2":
      return {
        kind: "compare",
        op: compareOpFromField(block),
        left: valueFromInput(block, "A", 0),
        right: valueFromInput(block, "B", 0),
      };

    case "logic_operation":
    case "logic_operation_v2": {
      const args = [booleanFromInput(block, "A", false), booleanFromInput(block, "B", false)];
      return fieldText(block, "OP", "AND") === "OR"
        ? { kind: "or", args }
        : { kind: "and", args };
    }

    case "logic_negate":
    case "logic_not_v2":
      return { kind: "not", arg: booleanFromInput(block, "BOOL", false) };

    case "sensor_group_detected":
    case "logic_sensor_group":
      return {
        kind: "sensor",
        sensor: "integrated-grayscale-group",
        channel: fieldNumber(block, "GROUP", 1),
        predicate: "detects-line",
      };

    case "remote_control_button":
      return {
        kind: "sensor",
        sensor: "remote-control",
        port: fieldText(block, "BUTTON", "A"),
        predicate: "pressed",
      };

    case "read_sensor_road":
    case "value_sensor_road":
      return {
        kind: "compare",
        op: "GT",
        left: valueFromBlock(block),
        right: literal(50),
      };

    default:
      return { kind: "literal", value: false };
  }
}

function blockSequenceToV2Nodes(start: Blockly.Block | null): IRNodeLocal[] {
  const nodes: IRNodeLocal[] = [];
  let block = start;
  while (block) {
    if (block.isEnabled()) {
      nodes.push(...blockToV2Nodes(block));
    }
    block = block.getNextBlock();
  }
  return nodes;
}

function blockToV2Nodes(block: Blockly.Block): IRNodeLocal[] {
  switch (block.type) {
    case "initialize":
      return [commandNode(block, "hardware.initialize")];

    case "calibrate_grayscale":
      return [commandNode(block, "sensor.calibrateGrayscale")];

    case "turn_left": {
      const power = POWER_SPEEDS[fieldText(block, "POWER", "medium")] ?? 0.4;
      return [
        commandNode(block, "motion.setMotorPairForTime", {
          left: literal(-power),
          right: literal(power),
          seconds: literal(10 / 60),
        }),
      ];
    }

    case "turn_right": {
      const power = POWER_SPEEDS[fieldText(block, "POWER", "medium")] ?? 0.4;
      return [
        commandNode(block, "motion.setMotorPairForTime", {
          left: literal(power),
          right: literal(-power),
          seconds: literal(10 / 60),
        }),
      ];
    }

    case "start_motor": {
      const sign = fieldText(block, "DIR", "forward") === "backward" ? -1 : 1;
      return [
        commandNode(block, "motion.setMotorPairForTime", {
          left: literal(fieldNumber(block, "LEFT", 0.3) * sign),
          right: literal(fieldNumber(block, "RIGHT", 0.3) * sign),
          seconds: literal(fieldNumber(block, "TIME", 1)),
        }),
      ];
    }

    case "motion_set_motors_v2":
      return [
        commandNode(block, "motion.setMotorPair", {
          left: valueFromInput(block, "LEFT", 0),
          right: valueFromInput(block, "RIGHT", 0),
        }),
      ];

    case "motion_set_motors_for_time_v2":
      return [
        commandNode(block, "motion.setMotorPairForTime", {
          left: valueFromInput(block, "LEFT", 0),
          right: valueFromInput(block, "RIGHT", 0),
          seconds: valueFromInput(block, "SECONDS", 1),
        }),
      ];

    case "patrol_line":
      return [
        commandNode(
          block,
          "legacy.patrolLine",
          {
            direction: fieldText(block, "DIRECTION", "forward"),
            speed: literal(fieldNumber(block, "SPEED", 0.3)),
          },
          undefined,
          "stub",
          "runtime.diagnostic.legacyPatrolLine",
        ),
      ];

    case "if_sensor": {
      const road = fieldNumber(block, "ROAD", 3);
      return [
        commandNode(
          block,
          "control.if",
          {
            condition: {
              kind: "compare",
              op: compareOpFromField(block),
              left: { kind: "sensor", sensor: "integrated-grayscale", port: "builtin", channel: road },
              right: literal(fieldNumber(block, "THRESHOLD", 50)),
            },
          },
          { then: blockSequenceToV2Nodes(block.getInputTargetBlock("DO")) },
        ),
      ];
    }

    case "control_if_v2":
      return [
        commandNode(
          block,
          "control.if",
          { condition: booleanFromInput(block, "COND", false) },
          { then: blockSequenceToV2Nodes(block.getInputTargetBlock("THEN")) },
        ),
      ];

    case "control_if_else_v2":
      return [
        commandNode(
          block,
          "control.ifElse",
          { condition: booleanFromInput(block, "COND", false) },
          {
            then: blockSequenceToV2Nodes(block.getInputTargetBlock("THEN")),
            else: blockSequenceToV2Nodes(block.getInputTargetBlock("ELSE")),
          },
        ),
      ];

    case "repeat_loop":
      return [
        commandNode(
          block,
          "control.repeatTimes",
          { times: literal(fieldNumber(block, "TIMES", 3)) },
          { do: blockSequenceToV2Nodes(block.getInputTargetBlock("DO")) },
        ),
      ];

    case "control_repeat_times_v2":
      return [
        commandNode(
          block,
          "control.repeatTimes",
          { times: valueFromInput(block, "TIMES", 1) },
          { do: blockSequenceToV2Nodes(block.getInputTargetBlock("DO")) },
        ),
      ];

    case "control_repeat_forever":
      return [
        commandNode(
          block,
          "control.repeatForever",
          {},
          { do: blockSequenceToV2Nodes(block.getInputTargetBlock("DO")) },
        ),
      ];

    case "control_repeat_until":
      return [
        commandNode(
          block,
          "control.repeatUntil",
          { condition: booleanFromInput(block, "COND", false) },
          { do: blockSequenceToV2Nodes(block.getInputTargetBlock("DO")) },
        ),
      ];

    case "wait_block":
      return [commandNode(block, "control.waitSeconds", { seconds: literal(fieldNumber(block, "TIME", 1)) })];

    case "wait_seconds_v2":
      return [commandNode(block, "control.waitSeconds", { seconds: valueFromInput(block, "SECONDS", 1) })];

    case "control_wait_until":
      return [
        commandNode(block, "control.waitUntil", {
          condition: booleanFromInput(block, "COND", false),
          timeoutTicks: valueFromInput(block, "TIMEOUT", 600),
        }),
      ];

    case "control_break":
      return [commandNode(block, "control.break")];

    case "control_return":
      return [commandNode(block, "control.return")];

    case "set_var":
      return [
        commandNode(block, "variable.set", {
          name: `v${fieldNumber(block, "VAR", 0)}`,
          value: literal(fieldNumber(block, "VALUE", 0)),
        }),
      ];

    case "set_var_v2":
      return [
        commandNode(block, "variable.set", {
          name: fieldText(block, "VAR", "v0"),
          value: valueFromInput(block, "VALUE", 0),
        }),
      ];

    case "read_sensor_road":
    case "sensor_group_detected":
    case "line_position":
    case "value_number":
    case "value_variable":
    case "value_sensor_road":
    case "value_line_position":
    case "math_binary":
    case "math_remainder":
    case "math_unary":
    case "math_random_range":
    case "logic_literal_v2":
    case "logic_compare_v2":
    case "logic_operation_v2":
    case "logic_not_v2":
    case "logic_sensor_group":
    case "remote_control_button":
      return [
        diagnosticNode(
          block,
          "HTLAB_VALUE_BLOCK_AS_STATEMENT",
          `${block.type} produces a value and has no statement effect.`,
          "info",
          "telemetry-only",
        ),
      ];

    default:
      return [
        diagnosticNode(
          block,
          "HTLAB_UNSUPPORTED_BLOCK",
          `${block.type} is preserved as a diagnostic because no generator handler exists yet.`,
        ),
      ];
  }
}

function blockToIR(block: Blockly.Block): IRCommand[] {
  const type = block.type;
  const result: IRCommand[] = [];

  switch (type) {
    case "initialize":
      result.push({ op: OpCode.INIT_HARDWARE, args: [] });
      break;

    case "calibrate_grayscale":
      result.push({ op: OpCode.CALIBRATE_GRAYSCALE, args: [] });
      result.push({ op: OpCode.CALIBRATE_GRAYSCALE, args: [] });
      break;

    case "patrol_line": {
      const dir = block.getFieldValue("DIRECTION");
      const speed = parseFloat(block.getFieldValue("SPEED") || "0.3");
      const sign = dir === "backward" ? -1 : 1;
      const s = speed * sign;
      const loopLabel = nextLabel();
      const straightLabel = nextLabel();

      result.push({ op: OpCode.LABEL, args: [], label: `loop_${loopLabel}` });
      result.push({ op: OpCode.IF_SENSOR_VALUE, args: [3, 50, CompareOp.GT, straightLabel] });
      result.push({ op: OpCode.SET_MOTOR, args: [0, -s * 0.3] });
      result.push({ op: OpCode.WAIT_TICKS, args: [1] });
      result.push({ op: OpCode.JUMP, args: [loopLabel] });
      result.push({ op: OpCode.LABEL, args: [], label: `straight_${straightLabel}` });
      result.push({ op: OpCode.SET_MOTOR, args: [s, s] });
      result.push({ op: OpCode.WAIT_TICKS, args: [1] });
      result.push({ op: OpCode.JUMP, args: [loopLabel] });
      break;
    }

    case "turn_left": {
      const power = POWER_SPEEDS[block.getFieldValue("POWER")] || 0.4;
      result.push({ op: OpCode.SET_MOTOR, args: [-power, power] });
      result.push({ op: OpCode.WAIT_TICKS, args: [10] });
      result.push({ op: OpCode.SET_MOTOR, args: [0, 0] });
      break;
    }

    case "turn_right": {
      const power = POWER_SPEEDS[block.getFieldValue("POWER")] || 0.4;
      result.push({ op: OpCode.SET_MOTOR, args: [power, -power] });
      result.push({ op: OpCode.WAIT_TICKS, args: [10] });
      result.push({ op: OpCode.SET_MOTOR, args: [0, 0] });
      break;
    }

    case "start_motor": {
      const dir = block.getFieldValue("DIR");
      const left = parseFloat(block.getFieldValue("LEFT") || "0.3");
      const right = parseFloat(block.getFieldValue("RIGHT") || "0.3");
      const time = parseFloat(block.getFieldValue("TIME") || "1");
      const sign = dir === "backward" ? -1 : 1;
      const ticks = Math.round(time * 60);
      result.push({ op: OpCode.SET_MOTOR, args: [left * sign, right * sign] });
      result.push({ op: OpCode.WAIT_TICKS, args: [ticks] });
      result.push({ op: OpCode.SET_MOTOR, args: [0, 0] });
      break;
    }

    case "read_sensor_road": {
      const road = parseInt(block.getFieldValue("ROAD") || "3");
      result.push({ op: OpCode.READ_SENSOR_ROAD, args: [road] });
      break;
    }

    case "sensor_group_detected": {
      const group = parseInt(block.getFieldValue("GROUP") || "1");
      result.push({ op: OpCode.READ_SENSOR_GROUP, args: [group] });
      break;
    }

    case "line_position":
      result.push({ op: OpCode.READ_LINE_POSITION, args: [] });
      break;

    case "if_sensor": {
      const road = parseInt(block.getFieldValue("ROAD") || "3");
      const op = block.getFieldValue("OP") as keyof typeof CompareOp;
      const threshold = parseFloat(block.getFieldValue("THRESHOLD") || "50");
      const compareOp = CompareOp[op] ?? CompareOp.GT;
      const doBlock = block.getInputTargetBlock("DO");

      if (doBlock) {
        const thenLabel = nextLabel();
        const afterLabel = nextLabel();

        result.push({ op: OpCode.IF_SENSOR_VALUE, args: [road, threshold, compareOp, thenLabel] });
        result.push({ op: OpCode.JUMP, args: [afterLabel] });
        result.push({ op: OpCode.LABEL, args: [], label: `then_${thenLabel}` });
        result.push(...blockToIR(doBlock));
        result.push({ op: OpCode.LABEL, args: [], label: `endif_${afterLabel}` });
      }
      break;
    }

    case "repeat_loop": {
      const times = parseInt(block.getFieldValue("TIMES") || "3");
      const doBlock = block.getInputTargetBlock("DO");

      result.push({ op: OpCode.LOOP_START, args: [times] });
      if (doBlock) {
        result.push(...blockToIR(doBlock));
      }
      result.push({ op: OpCode.LOOP_END, args: [] });
      break;
    }

    case "wait_block": {
      const time = parseFloat(block.getFieldValue("TIME") || "1");
      const ticks = Math.round(time * 60);
      result.push({ op: OpCode.WAIT_TICKS, args: [ticks] });
      break;
    }

    case "set_var": {
      const varIdx = parseInt(block.getFieldValue("VAR") || "0");
      const value = parseFloat(block.getFieldValue("VALUE") || "0");
      result.push({ op: OpCode.SET_VAR, args: [varIdx, value] });
      break;
    }

    default:
      break;
  }

  if (block.nextConnection?.isConnected()) {
    const nextBlock = block.getNextBlock();
    if (nextBlock) {
      result.push(...blockToIR(nextBlock));
    }
  }

  return result;
}
