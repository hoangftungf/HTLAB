import * as Blockly from "blockly";
import { CompareOp, OpCode, type IRCommand, type IRProgram } from "@htlab/simulation-core";
import { BLOCK_REGISTRY_BY_TYPE } from "./blockRegistry.js";

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
  input?: IRValueExpressionLocal;
  sandbox: {
    required: true;
    status: "available" | "blocked";
    timeoutMs: number;
    memoryMb: number;
    allowedApis: string[];
  };
}

type IRValueTypeLocal = "Number" | "Boolean" | "String" | "Any" | "Void";

interface IRVariableDeclarationLocal {
  id?: string;
  name: string;
  valueType?: Exclude<IRValueTypeLocal, "Void">;
}

interface IRFunctionParameterLocal {
  id?: string;
  name: string;
  valueType: Exclude<IRValueTypeLocal, "Void">;
}

type IRValueExpressionLocal =
  | { kind: "literal"; value: IRPrimitiveLocal }
  | { kind: "variable"; name: string; id?: string }
  | { kind: "sensor"; sensor: string; port?: string | number; channel?: number }
  | { kind: "unary"; op: string; arg: IRValueExpressionLocal; angleUnit?: "degree" | "radian" }
  | { kind: "binary"; op: string; left: IRValueExpressionLocal; right: IRValueExpressionLocal }
  | { kind: "call"; callee: string; args: IRValueExpressionLocal[]; calleeId?: string }
  | { kind: "c-code"; payload: IRCCodePayloadLocal; input?: IRValueExpressionLocal };

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

interface IRFunctionDefinitionLocal {
  id: string;
  name: string;
  params: IRFunctionParameterLocal[];
  returnType: IRValueTypeLocal;
  body: IRNodeLocal[];
  source?: IRSourceRefLocal;
}

interface IRProgramV2Local {
  version: 2;
  commands: IRCommand[];
  nodes: IRNodeLocal[];
  diagnostics: IRDiagnosticLocal[];
  variables?: IRVariableDeclarationLocal[];
  functions?: IRFunctionDefinitionLocal[];
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
  "motion_tank_drive_continuous",
  "motion_tank_drive_seconds",
  "motion_stop_pair",
  "motion_single_motor_power",
  "motion_dual_motor_seconds",
  "motion_single_motor_seconds",
  "motion_dual_motor_degrees",
  "motion_single_motor_degrees",
  "motion_reverse_motor",
  "motion_stop_motor",
  "motion_omni_move",
  "motion_omni_turn",
  "motion_omni_stop",
  "motion_steering_angle_mode",
  "motion_steering_rotation_mode",
  "motion_restore_steering_torque",
  "motion_set_motors_v2",
  "motion_set_motors_for_time_v2",
  "patrol_initialize_tank",
  "patrol_initialize_omni",
  "patrol_black_white_detection",
  "patrol_line_speed",
  "patrol_line_for_time",
  "patrol_line_intersections",
  "patrol_turn_branch",
  "patrol_start_motor_time",
  "patrol_start_motor_angle",
  "patrol_start_motor_until_sensor",
  "patrol_start_button",
  "set_var_v2",
  "change_var_v2",
  "value_number",
  "value_variable",
  "variables_get",
  "variables_set",
  "math_change",
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
  "sensor_integrated_grayscale_value",
  "sensor_integrated_grayscale_detect_black",
  "sensor_single_grayscale_detect_black",
  "sensor_single_grayscale_value",
  "sensor_ultrasonic_distance",
  "sensor_ambient_light_value",
  "sensor_temperature_celsius",
  "sensor_humidity_percent",
  "sensor_flame_value",
  "sensor_magnetic_detected",
  "sensor_volume_detection",
  "sensor_motor_encoder_value",
  "sensor_reset_motor_encoder",
  "sensor_current_timer_value",
  "sensor_reset_timer",
  "sensor_remote_control_button",
  "sensor_touch_switch_pressed",
  "sensor_infrared_obstacle",
  "sensor_infrared_range_value",
  "sensor_color_value",
  "sensor_color_detected",
  "light_play_sound",
  "light_electromagnet",
  "light_emotion_expression",
  "light_clear_emotion_expressions",
  "light_emotion_symbols",
  "light_emotion_customization",
  "light_clear_emotion_screen",
  "light_reading_1",
  "light_led_rgb",
  "light_led_swatch",
  "light_led_off",
  "light_digital_tube_display",
  "light_clear_digital_tube",
  "light_screen_display",
  "light_clear_screen",
  "ai_image_recognition",
  "ai_recognition_is",
  "control_if_v2",
  "control_if_else_v2",
  "control_repeat_times_v2",
  "control_repeat_forever",
  "control_repeat_until",
  "control_wait_until",
  "control_break",
  "control_return",
  "loop_return_value",
  "my_block_definition",
  "my_block_call_statement",
  "my_block_call_value",
  "my_block_param_value",
  "c_code_function",
  "wait_seconds_v2",
]);

let labelCounter = 0;
function nextLabel(): number {
  return labelCounter++;
}

export function workspaceToIR(workspace: Blockly.Workspace): IRProgram {
  labelCounter = 0;
  const topBlocks = workspace.getTopBlocks(true).filter((block) => block.isEnabled());
  const variables = collectVariableDeclarations(workspace);

  if (topBlocks.some(blockRequiresV2) || variables.length > 0) {
    return workspaceToV2IR(topBlocks, workspace, variables) as unknown as IRProgram;
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

function workspaceToV2IR(
  topBlocks: Blockly.Block[],
  workspace: Blockly.Workspace,
  variables = collectVariableDeclarations(workspace),
): IRProgramV2Local {
  const executableTopBlocks = topBlocks.filter((block) => block.type !== "my_block_definition");
  const functions = topBlocks.flatMap(functionDefinitionFromBlock);
  const nodes = executableTopBlocks.flatMap(blockSequenceToV2Nodes);
  const diagnostics = collectDiagnostics([...nodes, ...functions.flatMap((definition) => definition.body)]);

  labelCounter = 0;
  const commands = executableTopBlocks.flatMap(blockToIR);
  if (commands.length === 0 || commands[commands.length - 1]?.op !== OpCode.END_PROGRAM) {
    commands.push({ op: OpCode.END_PROGRAM, args: [] });
  }

  return {
    version: 2,
    commands,
    nodes,
    diagnostics,
    variables,
    functions,
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

function collectVariableDeclarations(workspace: Blockly.Workspace): IRVariableDeclarationLocal[] {
  const variables = workspace.getAllVariables?.() ?? [];
  return variables.map((variable) => ({
    id: variable.getId(),
    name: variable.name,
    valueType: variable.type === "Boolean" || variable.type === "String" || variable.type === "Any"
      ? variable.type
      : "Number",
  }));
}

function valueTypeFromField(block: Blockly.Block, name: string, fallback: IRValueTypeLocal): IRValueTypeLocal {
  const value = fieldText(block, name, fallback);
  if (value === "Number" || value === "Boolean" || value === "String" || value === "Any" || value === "Void") {
    return value;
  }
  return fallback;
}

function nonVoidValueType(value: IRValueTypeLocal): Exclude<IRValueTypeLocal, "Void"> {
  return value === "Void" ? "Any" : value;
}

function variableRefFromField(block: Blockly.Block, name: string, fallback: string): { id?: string; name: string } {
  const field = block.getField(name) as (Blockly.FieldVariable & {
    getVariable?: () => Blockly.VariableModel | null;
    getText?: () => string;
  }) | null;
  const id = field?.getValue?.() ?? fieldText(block, name, fallback);
  const variable = field?.getVariable?.() ?? (id ? block.workspace?.getVariableById(id) : null);
  const variableName = variable?.name ?? field?.getText?.() ?? id ?? fallback;
  return {
    ...(id && id !== variableName ? { id } : {}),
    name: variableName || fallback,
  };
}

function variableExpressionFromField(block: Blockly.Block, name: string, fallback: string): IRValueExpressionLocal {
  return { kind: "variable", ...variableRefFromField(block, name, fallback) };
}

function functionParameterId(block: Blockly.Block, parameterName: string): string {
  return `${block.id}:param:${parameterName}`;
}

function functionDefinitionFromBlock(block: Blockly.Block): IRFunctionDefinitionLocal[] {
  if (block.type !== "my_block_definition") return [];
  const name = fieldText(block, "NAME", "my block").trim() || "my block";

  // C-018: read params from dynamic mutator array
  const mutatorParams: Array<{ name: string; type: string; defaultValue?: string }> =
    (block as any).params_ ?? [];

  let params: IRFunctionDefinitionLocal["params"];
  if (mutatorParams.length > 0) {
    params = mutatorParams.map((p) => ({
      id: functionParameterId(block, p.name),
      name: p.name,
      valueType: nonVoidValueType(p.type as "Number" | "Boolean" | "String" | "Any" | "Void"),
    }));
  } else {
    // Backward compat: fall back to static PARAM/PARAM_TYPE fields (C-017 / older saves)
    const paramName = fieldText(block, "PARAM", "value").trim() || "value";
    const paramType = nonVoidValueType(valueTypeFromField(block, "PARAM_TYPE", "Number"));
    params = [{ id: functionParameterId(block, paramName), name: paramName, valueType: paramType }];
  }

  return [
    {
      id: block.id,
      name,
      params,
      returnType: valueTypeFromField(block, "RETURN_TYPE", "Number"),
      body: blockSequenceToV2Nodes(block.getInputTargetBlock("BODY")),
      source: sourceFor(block, "My Blocks"),
    },
  ];
}


function blockRequiresV2(block: Blockly.Block | null): boolean {
  if (!block) return false;
  if (V2_ONLY_BLOCKS.has(block.type)) return true;
  if (block.type in BLOCK_REGISTRY_BY_TYPE) return true;

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
  if (type.startsWith("event_")) return "Event";
  if (type.startsWith("loop_")) return "Loop";
  if (type.startsWith("logic_")) return "Logic";
  if (type.startsWith("math_")) return "Math";
  if (type.startsWith("variable_") || type.startsWith("variables_")) return "Variable";
  if (type.startsWith("patrol_")) return "Patrol line";
  if (type.startsWith("light_")) return "Light Speaker";
  if (type.startsWith("my_block") || type.startsWith("my_blocks")) return "My Blocks";
  if (type.startsWith("c_code")) return "C Code";
  if (type.startsWith("ai_")) return "AI";
  if (type.includes("motion") || type.includes("motor") || type.includes("turn") || type === "patrol_line") return "Motion";
  if (type.includes("sensor") || type.includes("line_position") || type.includes("remote")) return "Sensor";
  if (type.includes("value")) return "Math";
  if (type.includes("control") || type.includes("if") || type.includes("repeat") || type.includes("wait")) return "Loop";
  if (type.includes("var")) return "Variable";
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

function percentPower(value: number): IRValueExpressionLocal {
  return literal(Math.max(-1, Math.min(1, value / 100)));
}

function scaleValue(value: IRValueExpressionLocal, factor: number): IRValueExpressionLocal {
  if (value.kind === "literal" && typeof value.value === "number") {
    return literal(value.value * factor);
  }
  return { kind: "binary", op: "*", left: value, right: literal(factor) };
}

function percentPowerValue(value: IRValueExpressionLocal): IRValueExpressionLocal {
  if (value.kind === "literal" && typeof value.value === "number") {
    return percentPower(value.value);
  }
  return scaleValue(value, 0.01);
}

function valueFromInput(block: Blockly.Block, name: string, fallback: IRPrimitiveLocal = 0): IRValueExpressionLocal {
  const child = block.getInputTargetBlock(name);
  return child ? valueFromBlock(child) : literal(fallback);
}

function valueFromInputOrField(
  block: Blockly.Block,
  inputName: string,
  fieldName: string,
  fallback: IRPrimitiveLocal = 0,
): IRValueExpressionLocal {
  const child = block.getInputTargetBlock(inputName);
  return child ? valueFromBlock(child) : literal(fieldNumber(block, fieldName, Number(fallback ?? 0)));
}

function staticNumberFromInputOrField(
  block: Blockly.Block,
  inputName: string,
  fieldName: string,
  fallback = 0,
): number {
  const value = valueFromInputOrField(block, inputName, fieldName, fallback);
  return value.kind === "literal" && typeof value.value === "number" ? value.value : fallback;
}

function booleanFromInput(block: Blockly.Block, name: string, fallback = false): IRBooleanExpressionLocal {
  const child = block.getInputTargetBlock(name);
  return child ? booleanFromBlock(child) : { kind: "literal", value: fallback };
}

function booleanFromInputOrLiteral(
  block: Blockly.Block,
  inputName: string,
  fallback = false,
): IRBooleanExpressionLocal {
  const child = block.getInputTargetBlock(inputName);
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

function compareOpFromSymbol(value: string): IRCompareOpNameLocal {
  const op = value.toUpperCase();
  if (op === "=" || op === "==" || op === "EQ") return "EQ";
  if (op === "!=" || op === "NEQ") return "NEQ";
  if (op === "<" || op === "LT") return "LT";
  if (op === "<=" || op === "LTE") return "LTE";
  if (op === ">" || op === "GT") return "GT";
  if (op === ">=" || op === "GTE") return "GTE";
  return "GT";
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

function sensorValue(sensor: string, port?: string | number, channel?: number): IRValueExpressionLocal {
  return {
    kind: "sensor",
    sensor,
    ...(port !== undefined ? { port } : {}),
    ...(channel !== undefined ? { channel } : {}),
  };
}

function cIdentifier(value: string, fallback: string): string {
  const trimmed = value.trim();
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed) ? trimmed : fallback;
}

function cCodePayloadForBlock(block: Blockly.Block, input?: IRValueExpressionLocal): IRCCodePayloadLocal {
  const functionName = cIdentifier(fieldText(block, "functionName", "_fn"), "_fn");
  const parameterName = cIdentifier(fieldText(block, "parameterName", "_number1"), "_number1");
  const body = fieldText(block, "body", "return _number1;");
  const source = /^\s*(int|double|float|void)\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(body)
    ? body
    : `int ${functionName}(int ${parameterName}) { ${body} }`;

  return {
    language: "c",
    source,
    entryPoint: functionName,
    ...(input ? { input } : {}),
    sandbox: {
      required: true,
      status: "available",
      timeoutMs: 50,
      memoryMb: 4,
      allowedApis: ["htlab_abs", "htlab_clamp"],
    },
  };
}

function effectNodeForBlock(block: Blockly.Block): IRCommandNodeLocal | null {
  switch (block.type) {
    case "light_play_sound":
      return commandNode(
        block,
        "effect.playSound",
        {
          group: fieldText(block, "group", "Greet"),
          sound: fieldText(block, "sound", "Hello"),
        },
        undefined,
        "telemetry-only",
        "runtime.telemetry.sound",
      );

    case "light_electromagnet":
      return commandNode(
        block,
        "effect.electromagnet",
        {
          port: fieldText(block, "port", "1"),
          mode: fieldText(block, "mode", "absorption"),
        },
        undefined,
        "telemetry-only",
        "runtime.telemetry.electromagnet",
      );

    case "light_emotion_expression":
      return commandNode(
        block,
        "effect.emotionExpression",
        {
          expression: fieldText(block, "expression", "eyes"),
          leftEyePort: fieldText(block, "leftEyePort", "1"),
          rightEyePort: fieldText(block, "rightEyePort", "2"),
        },
        undefined,
        "telemetry-only",
        "runtime.telemetry.display",
      );

    case "light_clear_emotion_expressions":
      return commandNode(
        block,
        "effect.clearEmotionExpressions",
        {
          leftEyePort: fieldText(block, "leftEyePort", "1"),
          rightEyePort: fieldText(block, "rightEyePort", "2"),
        },
        undefined,
        "telemetry-only",
        "runtime.telemetry.display",
      );

    case "light_emotion_symbols":
      return commandNode(
        block,
        "effect.emotionSymbol",
        {
          symbol: fieldText(block, "symbol", "?"),
          port: fieldText(block, "port", "1"),
        },
        undefined,
        "telemetry-only",
        "runtime.telemetry.display",
      );

    case "light_emotion_customization":
      return commandNode(
        block,
        "effect.emotionMatrix",
        {
          matrix: fieldText(block, "matrix", "00000/00000/00000/00000/00000"),
          port: fieldText(block, "port", "1"),
        },
        undefined,
        "telemetry-only",
        "runtime.telemetry.display",
      );

    case "light_clear_emotion_screen":
      return commandNode(
        block,
        "effect.clearEmotionScreen",
        { port: fieldText(block, "port", "1") },
        undefined,
        "telemetry-only",
        "runtime.telemetry.display",
      );

    case "light_led_rgb":
      return commandNode(
        block,
        "effect.setLedRgb",
        {
          port: fieldText(block, "port", "1"),
          r: valueFromInputOrField(block, "r", "r", 255),
          g: valueFromInputOrField(block, "g", "g", 255),
          b: valueFromInputOrField(block, "b", "b", 255),
        },
        undefined,
        "telemetry-only",
        "runtime.telemetry.led",
      );

    case "light_led_swatch":
      return commandNode(
        block,
        "effect.setLedColor",
        {
          port: fieldText(block, "port", "1"),
          color: fieldText(block, "color", "#ffffff"),
        },
        undefined,
        "telemetry-only",
        "runtime.telemetry.led",
      );

    case "light_led_off":
      return commandNode(
        block,
        "effect.turnOffLed",
        { port: fieldText(block, "port", "1") },
        undefined,
        "telemetry-only",
        "runtime.telemetry.led",
      );

    case "light_digital_tube_display":
      return commandNode(
        block,
        "effect.digitalTubeDisplay",
        {
          port: fieldText(block, "port", "1"),
          value: valueFromInput(block, "value", 0),
        },
        undefined,
        "telemetry-only",
        "runtime.telemetry.display",
      );

    case "light_clear_digital_tube":
      return commandNode(
        block,
        "effect.clearDigitalTube",
        { port: fieldText(block, "port", "1") },
        undefined,
        "telemetry-only",
        "runtime.telemetry.display",
      );

    case "light_screen_display":
      return commandNode(
        block,
        "effect.screenDisplay",
        { value: valueFromInput(block, "value", "") },
        undefined,
        "telemetry-only",
        "runtime.telemetry.display",
      );

    case "light_clear_screen":
      return commandNode(
        block,
        "effect.clearScreen",
        {},
        undefined,
        "telemetry-only",
        "runtime.telemetry.display",
      );

    default:
      return null;
  }
}

function valueFromBlock(block: Blockly.Block): IRValueExpressionLocal {
  switch (block.type) {
    case "math_number":
      return literal(fieldNumber(block, "NUM", 0));

    case "value_number":
      return literal(fieldNumber(block, "NUM", 0));

    case "value_variable":
      return variableExpressionFromField(block, "VAR", "v0");

    case "variables_get":
      return variableExpressionFromField(block, "VAR", "v0");

    case "read_sensor_road":
    case "value_sensor_road":
    case "sensor_integrated_grayscale_value":
      return sensorValue(
        "integrated-grayscale",
        fieldText(block, "port", "builtin"),
        fieldNumber(block, block.type === "sensor_integrated_grayscale_value" ? "channel" : "ROAD", 3),
      );

    case "sensor_single_grayscale_value":
      return sensorValue("single-grayscale", fieldText(block, "port", "1"));

    case "sensor_ultrasonic_distance":
      return sensorValue("ultrasonic-distance", fieldText(block, "port", "1"));

    case "sensor_infrared_range_value":
      return sensorValue("infrared-range", fieldText(block, "port", "1"));

    case "sensor_ambient_light_value":
      return sensorValue("ambient-light", fieldText(block, "port", "1"));

    case "sensor_temperature_celsius":
      return sensorValue("temperature-celsius", fieldText(block, "port", "1"));

    case "sensor_humidity_percent":
      return sensorValue("humidity-percent", fieldText(block, "port", "1"));

    case "sensor_flame_value":
      return sensorValue("flame-value", fieldText(block, "port", "1"));

    case "sensor_volume_detection":
      return sensorValue("volume-detection", fieldText(block, "port", "1"));

    case "sensor_motor_encoder_value":
      return sensorValue("motor-encoder", fieldText(block, "motor", "A"));

    case "sensor_color_value":
      return sensorValue("color-value", fieldText(block, "port", "1"));

    case "ai_image_recognition":
      return sensorValue("ai.imageRecognition", fieldText(block, "port", "1"));

    case "line_position":
    case "value_line_position":
      return { kind: "sensor", sensor: "line-position" };

    case "sensor_current_timer_value":
      return { kind: "sensor", sensor: "timer" };

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

    case "math_add":
      return {
        kind: "binary",
        op: "+",
        left: valueFromInputOrField(block, "left", "left", 10),
        right: valueFromInputOrField(block, "right", "right", 10),
      };

    case "math_subtract":
      return {
        kind: "binary",
        op: "-",
        left: valueFromInputOrField(block, "left", "left", 10),
        right: valueFromInputOrField(block, "right", "right", 10),
      };

    case "math_multiply":
      return {
        kind: "binary",
        op: "*",
        left: valueFromInputOrField(block, "left", "left", 10),
        right: valueFromInputOrField(block, "right", "right", 10),
      };

    case "math_divide":
      return {
        kind: "binary",
        op: "/",
        left: valueFromInputOrField(block, "left", "left", 10),
        right: valueFromInputOrField(block, "right", "right", 10),
      };

    case "math_modulo":
      return {
        kind: "binary",
        op: "%",
        left: valueFromInput(block, "a", 0),
        right: valueFromInput(block, "b", 1),
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

    case "math_round":
      return {
        kind: "unary",
        op: "round",
        arg: valueFromInput(block, "value", 0),
      };

    case "math_unary_function":
      return {
        kind: "unary",
        op: fieldText(block, "op", "abs").toLowerCase(),
        arg: valueFromInput(block, "value", 0),
        angleUnit: fieldText(block, "angleUnit", "degree") === "radian" ? "radian" : "degree",
      };

    case "math_random_range":
      return {
        kind: "call",
        callee: "randomRange",
        args: [
          valueFromInputOrField(block, "min", "min", 0),
          valueFromInputOrField(block, "max", "max", 10),
        ],
      };

    case "my_block_call_value": {
      const callArgs: Array<{ name: string; type: string }> = (block as any).args_ ?? [];
      const argCount = callArgs.length;
      const compiledArgs: any[] = [];
      for (let ai = 0; ai < argCount; ai++) {
        compiledArgs.push(valueFromInput(block, `ARG${ai}`, 0));
      }
      if (argCount === 0) {
        compiledArgs.push(valueFromInput(block, "ARG0", 0));
      }
      return {
        kind: "call",
        callee: fieldText(block, "NAME", "my block"),
        args: compiledArgs,
      };
    }

    case "my_block_param_value": {
      const name = fieldText(block, "PARAM", "value");
      return { kind: "variable", name, id: `param:${name}` };
    }

    case "c_code_function": {
      const input = valueFromInput(block, "ARG", 0);
      return { kind: "c-code", payload: cCodePayloadForBlock(block, input), input };
    }

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

    case "logic_compare_lt":
      return {
        kind: "compare",
        op: "LT",
        left: valueFromInput(block, "a", 0),
        right: valueFromInput(block, "b", 0),
      };

    case "logic_compare_gt":
      return {
        kind: "compare",
        op: "GT",
        left: valueFromInput(block, "a", 0),
        right: valueFromInput(block, "b", 0),
      };

    case "logic_compare_eq":
      return {
        kind: "compare",
        op: "EQ",
        left: valueFromInput(block, "a", 0),
        right: valueFromInput(block, "b", 0),
      };

    case "logic_compare_neq":
      return {
        kind: "compare",
        op: "NEQ",
        left: valueFromInput(block, "a", 0),
        right: valueFromInput(block, "b", 0),
      };

    case "logic_operation":
    case "logic_operation_v2": {
      const args = [booleanFromInput(block, "A", false), booleanFromInput(block, "B", false)];
      return fieldText(block, "OP", "AND") === "OR"
        ? { kind: "or", args }
        : { kind: "and", args };
    }

    case "logic_and":
      return {
        kind: "and",
        args: [
          booleanFromInputOrLiteral(block, "cond1", false),
          booleanFromInputOrLiteral(block, "cond2", false),
        ],
      };

    case "logic_or":
      return {
        kind: "or",
        args: [
          booleanFromInputOrLiteral(block, "cond1", false),
          booleanFromInputOrLiteral(block, "cond2", false),
        ],
      };

    case "logic_negate":
    case "logic_not_v2":
      return { kind: "not", arg: booleanFromInput(block, "BOOL", false) };

    case "logic_not":
      return { kind: "not", arg: booleanFromInputOrLiteral(block, "condition", false) };

    case "sensor_group_detected":
    case "logic_sensor_group":
      return {
        kind: "sensor",
        sensor: "integrated-grayscale-group",
        channel: fieldNumber(block, "GROUP", 1),
        predicate: "detects-line",
      };

    case "remote_control_button":
    case "sensor_remote_control_button":
      return {
        kind: "sensor",
        sensor: "remote-control",
        port: fieldText(block, block.type === "sensor_remote_control_button" ? "button" : "BUTTON", "A"),
        predicate: "pressed",
      };

    case "sensor_integrated_grayscale_detect_black":
      return {
        kind: "sensor",
        sensor: "integrated-grayscale",
        port: fieldText(block, "port", "5"),
        channel: fieldNumber(block, "channel", 1),
        predicate: fieldText(block, "color", "black"),
      };

    case "sensor_single_grayscale_detect_black":
      return {
        kind: "sensor",
        sensor: "single-grayscale",
        port: fieldText(block, "port", "1"),
        predicate: fieldText(block, "color", "black"),
      };

    case "sensor_touch_switch_pressed":
      return {
        kind: "sensor",
        sensor: "touch-switch",
        port: fieldText(block, "port", "1"),
        predicate: "pressed",
      };

    case "sensor_infrared_obstacle":
      return {
        kind: "sensor",
        sensor: "infrared-obstacle",
        port: fieldText(block, "port", "1"),
        predicate: "detected",
      };

    case "sensor_magnetic_detected":
      return {
        kind: "sensor",
        sensor: "magnetic",
        port: fieldText(block, "port", "1"),
        predicate: "detected",
      };

    case "sensor_color_detected":
      return {
        kind: "sensor",
        sensor: "color-detected",
        port: fieldText(block, "port", "1"),
        predicate: fieldText(block, "color", "red"),
      };

    case "ai_recognition_is":
      return {
        kind: "sensor",
        sensor: "ai.recognitionMatches",
        port: fieldText(block, "classValue", "0"),
        predicate: fieldText(block, "classType", "Number"),
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
  if (block.type === "my_block_definition") return [];

  const effectNode = effectNodeForBlock(block);
  if (effectNode) return [effectNode];

  switch (block.type) {


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
          left: scaleValue(valueFromInputOrField(block, "LEFT", "LEFT", 0.3), sign),
          right: scaleValue(valueFromInputOrField(block, "RIGHT", "RIGHT", 0.3), sign),
          seconds: valueFromInputOrField(block, "TIME", "TIME", 1),
        }),
      ];
    }

    case "motion_tank_drive_continuous": {
      const sign = fieldText(block, "direction", "Forward") === "Backward" ? -1 : 1;
      const power = percentPowerValue(scaleValue(valueFromInputOrField(block, "power", "power", 40), sign));
      return [
        commandNode(block, "motion.setMotorPair", {
          leftMotor: fieldText(block, "leftMotor", "A"),
          rightMotor: fieldText(block, "rightMotor", "B"),
          left: power,
          right: power,
        }),
      ];
    }

    case "motion_tank_drive_seconds": {
      const sign = fieldText(block, "direction", "Forward") === "Backward" ? -1 : 1;
      const power = percentPowerValue(scaleValue(valueFromInputOrField(block, "power", "power", 40), sign));
      return [
        commandNode(block, "motion.setMotorPairForTime", {
          leftMotor: fieldText(block, "leftMotor", "A"),
          rightMotor: fieldText(block, "rightMotor", "B"),
          left: power,
          right: power,
          seconds: valueFromInputOrField(block, "seconds", "seconds", 1),
        }),
      ];
    }

    case "motion_stop_pair":
      return [
        commandNode(block, "motion.stopMotorPair", {
          leftMotor: fieldText(block, "leftMotor", "A"),
          rightMotor: fieldText(block, "rightMotor", "B"),
        }),
      ];

    case "motion_single_motor_power":
      return [
        commandNode(block, "motion.setMotor", {
          motor: fieldText(block, "motor", "A"),
          power: percentPowerValue(valueFromInputOrField(block, "power", "power", 40)),
        }),
      ];

    case "motion_dual_motor_seconds":
      return [
        commandNode(block, "motion.setMotorPairForTime", {
          motorA: fieldText(block, "motorA", "A"),
          motorB: fieldText(block, "motorB", "B"),
          left: percentPowerValue(valueFromInputOrField(block, "powerA", "powerA", 40)),
          right: percentPowerValue(valueFromInputOrField(block, "powerB", "powerB", 40)),
          seconds: valueFromInputOrField(block, "seconds", "seconds", 1),
        }),
      ];

    case "motion_single_motor_seconds":
      return [
        commandNode(block, "motion.setMotorForTime", {
          motor: fieldText(block, "motor", "A"),
          power: percentPowerValue(valueFromInputOrField(block, "power", "power", 40)),
          seconds: valueFromInputOrField(block, "seconds", "seconds", 1),
        }),
      ];

    case "motion_dual_motor_degrees":
      return [
        commandNode(
          block,
          "motion.setMotorPairForEncoderDegrees",
          {
            motorA: fieldText(block, "motorA", "A"),
            motorB: fieldText(block, "motorB", "B"),
            left: percentPowerValue(valueFromInputOrField(block, "powerA", "powerA", 40)),
            right: percentPowerValue(valueFromInputOrField(block, "powerB", "powerB", 40)),
            degrees: valueFromInputOrField(block, "degrees", "degrees", 360),
          },
          undefined,
          "stub",
          "runtime.diagnostic.encoderNotImplemented",
        ),
      ];

    case "motion_single_motor_degrees":
      return [
        commandNode(
          block,
          "motion.setMotorForEncoderDegrees",
          {
            motor: fieldText(block, "motor", "A"),
            power: percentPowerValue(valueFromInputOrField(block, "power", "power", 40)),
            degrees: valueFromInputOrField(block, "degrees", "degrees", 360),
          },
          undefined,
          "stub",
          "runtime.diagnostic.encoderNotImplemented",
        ),
      ];

    case "motion_reverse_motor":
      return [commandNode(block, "motion.reverseMotor", { motor: fieldText(block, "motor", "A") })];

    case "motion_stop_motor":
      return [commandNode(block, "motion.stopMotor", { motor: fieldText(block, "motor", "all") })];

    case "motion_omni_move":
      return [
        commandNode(
          block,
          "motion.omniMove",
          {
            power: percentPowerValue(valueFromInputOrField(block, "power", "power", 40)),
            headingDegrees: valueFromInputOrField(block, "headingDegrees", "headingDegrees", 0),
          },
          undefined,
          "stub",
          "runtime.diagnostic.omniDriveNotImplemented",
        ),
      ];

    case "motion_omni_turn":
      return [
        commandNode(
          block,
          "motion.omniTurn",
          {
            direction: fieldText(block, "direction", "Turn left"),
            power: percentPowerValue(valueFromInputOrField(block, "power", "power", 40)),
          },
          undefined,
          "stub",
          "runtime.diagnostic.omniDriveNotImplemented",
        ),
      ];

    case "motion_omni_stop":
      return [
        commandNode(block, "motion.omniStop", {}, undefined, "stub", "runtime.diagnostic.omniDriveNotImplemented"),
      ];

    case "motion_steering_angle_mode":
      return [
        commandNode(
          block,
          "motion.steeringGearAngle",
          {
            id: literal(fieldNumber(block, "id", 1)),
            speed: percentPowerValue(valueFromInputOrField(block, "speed", "speed", 40)),
            angle: valueFromInputOrField(block, "angle", "angle", 0),
          },
          undefined,
          "telemetry-only",
          "runtime.telemetry.steeringGear",
        ),
      ];

    case "motion_steering_rotation_mode":
      return [
        commandNode(
          block,
          "motion.steeringGearRotation",
          {
            id: literal(fieldNumber(block, "id", 1)),
            speed: percentPowerValue(valueFromInputOrField(block, "speed", "speed", 40)),
          },
          undefined,
          "telemetry-only",
          "runtime.telemetry.steeringGear",
        ),
      ];

    case "motion_restore_steering_torque":
      return [
        commandNode(block, "motion.restoreSteeringTorque", {}, undefined, "telemetry-only", "runtime.telemetry.steeringGear"),
      ];

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

    case "patrol_initialize_tank":
      return [
        commandNode(block, "hardware.initializeTankLineFollower", {
          leftMotor: fieldText(block, "leftMotor", "A"),
          leftDirection: valueFromInputOrField(block, "leftDirection", "leftDirection", 100),
          rightMotor: fieldText(block, "rightMotor", "B"),
          rightDirection: valueFromInputOrField(block, "rightDirection", "rightDirection", -100),
          grayscalePort: fieldText(block, "grayscalePort", "5"),
        }),
      ];

    case "patrol_initialize_omni":
      return [
        commandNode(
          block,
          "hardware.initializeOmniLineFollower",
          {
            grayscalePort: fieldText(block, "grayscalePort", "5"),
            leftFrontMotor: fieldText(block, "leftFrontMotor", "A"),
            rightFrontMotor: fieldText(block, "rightFrontMotor", "B"),
            rightRearMotor: fieldText(block, "rightRearMotor", "C"),
            leftRearMotor: fieldText(block, "leftRearMotor", "D"),
          },
          undefined,
          "stub",
          "runtime.diagnostic.omniDriveNotImplemented",
        ),
      ];

    case "patrol_black_white_detection":
      return [
        commandNode(block, "sensor.calibrateGrayscale"),
        commandNode(block, "sensor.calibrateGrayscale"),
      ];

    case "patrol_line_speed":
      return [
        commandNode(block, "lineFollower.followContinuous", {
          speed: percentPowerValue(valueFromInputOrField(block, "speed", "speed", 30)),
        }),
      ];

    case "patrol_line_for_time":
      return [
        commandNode(block, "lineFollower.followForTime", {
          speed: percentPowerValue(valueFromInputOrField(block, "speed", "speed", 30)),
          seconds: valueFromInputOrField(block, "seconds", "seconds", 0.5),
        }),
      ];

    case "patrol_line_intersections":
      return [
        commandNode(block, "lineFollower.untilIntersection", {
          branch: fieldText(block, "branch", "left"),
          speed: percentPowerValue(valueFromInputOrField(block, "speed", "speed", 30)),
          rushSeconds: valueFromInputOrField(block, "rushSeconds", "rushSeconds", 0),
        }),
      ];

    case "patrol_turn_branch":
      return [
        commandNode(block, "lineFollower.turnUntilBranch", {
          branch: fieldText(block, "branch", "middle"),
          left: percentPowerValue(valueFromInputOrField(block, "leftSpeed", "leftSpeed", 0)),
          right: percentPowerValue(valueFromInputOrField(block, "rightSpeed", "rightSpeed", 0)),
        }),
      ];

    case "patrol_start_motor_time":
      return [
        commandNode(block, "motion.setMotorPairForTime", {
          left: percentPowerValue(valueFromInputOrField(block, "leftSpeed", "leftSpeed", 20)),
          right: percentPowerValue(valueFromInputOrField(block, "rightSpeed", "rightSpeed", 20)),
          seconds: valueFromInputOrField(block, "seconds", "seconds", 0.5),
        }),
      ];

    case "patrol_start_motor_angle":
      return [
        commandNode(
          block,
          "motion.setMotorPairForEncoderDegrees",
          {
            left: percentPowerValue(valueFromInputOrField(block, "leftSpeed", "leftSpeed", 20)),
            right: percentPowerValue(valueFromInputOrField(block, "rightSpeed", "rightSpeed", 20)),
            degrees: valueFromInputOrField(block, "degrees", "degrees", 360),
          },
          undefined,
          "stub",
          "runtime.diagnostic.encoderNotImplemented",
        ),
      ];

    case "patrol_start_motor_until_sensor":
      return [
        commandNode(block, "motion.setMotorPairUntil", {
          left: percentPowerValue(valueFromInputOrField(block, "leftSpeed", "leftSpeed", 20)),
          right: percentPowerValue(valueFromInputOrField(block, "rightSpeed", "rightSpeed", 20)),
          condition: {
            kind: "compare",
            op: compareOpFromSymbol(fieldText(block, "compare", "<")),
            left: {
              kind: "sensor",
              sensor: "integrated-grayscale",
              port: "5",
              channel: fieldNumber(block, "sensor", 1),
            },
            right: valueFromInputOrField(block, "threshold", "threshold", 50),
          },
        }),
      ];

    case "patrol_start_button":
      return [
        commandNode(block, "compat.startButton", {}, undefined, "stub", "runtime.diagnostic.intentionalNoop"),
      ];

    case "sensor_reset_timer":
      return [commandNode(block, "sensor.resetTimer", {}, undefined, "implemented", "runtime.sensor.resetTimer")];

    case "sensor_reset_motor_encoder":
      return [
        commandNode(
          block,
          "sensor.resetMotorEncoder",
          { motor: fieldText(block, "motor", "A") },
          undefined,
          "implemented",
          "runtime.sensor.resetMotorEncoder",
        ),
      ];

    case "light_reading_1":
      return [
        commandNode(
          block,
          "compat.reading1",
          { value: valueFromInputOrField(block, "value", "value", 1) },
          undefined,
          "stub",
          "runtime.diagnostic.intentionalNoop",
        ),
      ];

    case "patrol_line":
      return [
        commandNode(
          block,
          "legacy.patrolLine",
          {
            direction: fieldText(block, "DIRECTION", "forward"),
            speed: valueFromInputOrField(block, "SPEED", "SPEED", 0.3),
          },
          undefined,
          "stub",
          "runtime.diagnostic.legacyPatrolLine",
        ),
      ];

    case "event_program_execute":
      return [];

    case "event_touch_switch_pressed":
      return [
        commandNode(
          block,
          "event.touchSwitchPressed",
          { port: fieldText(block, "port", "1") },
          undefined,
          "stub",
          "runtime.diagnostic.asyncEventsNotImplemented",
        ),
      ];

    case "loop_repeat_forever":
      return [
        commandNode(
          block,
          "control.repeatForever",
          {},
          { do: blockSequenceToV2Nodes(block.getInputTargetBlock("do")) },
        ),
      ];

    case "loop_repeat_times":
      return [
        commandNode(
          block,
          "control.repeatTimes",
          { times: valueFromInputOrField(block, "times", "times", 10) },
          { do: blockSequenceToV2Nodes(block.getInputTargetBlock("do")) },
        ),
      ];

    case "loop_while_condition":
      return [
        commandNode(
          block,
          "control.while",
          { condition: booleanFromInput(block, "condition", false) },
          { do: blockSequenceToV2Nodes(block.getInputTargetBlock("do")) },
          "stub",
          "runtime.diagnostic.booleanFlowNotImplemented",
        ),
      ];

    case "loop_repeat_until":
      return [
        commandNode(
          block,
          "control.repeatUntil",
          { condition: booleanFromInput(block, "condition", false) },
          { do: blockSequenceToV2Nodes(block.getInputTargetBlock("do")) },
        ),
      ];

    case "loop_break":
      return [commandNode(block, "control.break")];

    case "loop_wait_seconds":
      return [commandNode(block, "control.waitSeconds", { seconds: valueFromInputOrField(block, "seconds", "seconds", 2) })];

    case "loop_wait_until":
      return [
        commandNode(block, "control.waitUntil", {
          condition: booleanFromInput(block, "condition", false),
        }),
      ];

    case "logic_if_then":
      return [
        commandNode(
          block,
          "control.if",
          { condition: booleanFromInput(block, "condition", false) },
          { then: blockSequenceToV2Nodes(block.getInputTargetBlock("then")) },
        ),
      ];

    case "logic_if_then_else":
      return [
        commandNode(
          block,
          "control.ifElse",
          { condition: booleanFromInput(block, "condition", false) },
          {
            then: blockSequenceToV2Nodes(block.getInputTargetBlock("then")),
            else: blockSequenceToV2Nodes(block.getInputTargetBlock("else")),
          },
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
              right: valueFromInputOrField(block, "THRESHOLD", "THRESHOLD", 50),
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
          { times: valueFromInputOrField(block, "TIMES", "TIMES", 3) },
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
      return [commandNode(block, "control.waitSeconds", { seconds: valueFromInputOrField(block, "TIME", "TIME", 1) })];

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
      return [commandNode(block, "control.return", { value: valueFromInput(block, "VALUE", null) })];

    case "loop_return_value":
      return [commandNode(block, "control.return", { value: valueFromInput(block, "value", null) })];

    case "variable_create":
      return [
        diagnosticNode(
          block,
          "HTLAB_VARIABLE_CREATE_DIALOG",
          "Create variable is represented by the Blockly variable dialog; this compatibility block has no runtime effect.",
          "info",
          "stub",
          "runtime.diagnostic.variablesDialog",
        ),
      ];

    case "set_var":
      return [
        commandNode(block, "variable.set", {
          name: `v${fieldNumber(block, "VAR", 0)}`,
          value: valueFromInputOrField(block, "VALUE", "VALUE", 0),
        }),
      ];

    case "set_var_v2":
    case "variables_set": {
      const variable = variableRefFromField(block, "VAR", "v0");
      return [
        commandNode(block, "variable.set", {
          name: variable.name,
          ...(variable.id ? { id: variable.id } : {}),
          value: valueFromInput(block, "VALUE", 0),
        }),
      ];
    }

    case "change_var_v2":
    case "math_change": {
      const variable = variableRefFromField(block, "VAR", "v0");
      return [
        commandNode(block, "variable.change", {
          name: variable.name,
          ...(variable.id ? { id: variable.id } : {}),
          delta: valueFromInput(block, block.type === "math_change" ? "DELTA" : "DELTA", 1),
        }),
      ];
    }

    case "my_block_call_statement": {
      const callArgs: Array<{ name: string; type: string }> = (block as any).args_ ?? [];
      const argCount = callArgs.length || 1;
      const argFields: Record<string, IRFieldValueLocal> = {
        callee: fieldText(block, "NAME", "my block"),
        argumentCount: literal(argCount),
      };
      for (let ai = 0; ai < argCount; ai++) {
        argFields[`arg${ai}`] = valueFromInput(block, `ARG${ai}`, 0);
      }
      return [commandNode(block, "function.call", argFields)];
    }

    case "my_blocks_create":
      return [
        diagnosticNode(
          block,
          "HTLAB_MY_BLOCKS_CREATE_DIALOG",
          "Create new blocks opens the custom-block authoring flow; this compatibility block has no runtime effect.",
          "info",
          "stub",
          "runtime.diagnostic.functionsDialog",
        ),
      ];

    case "c_code_function": {
      const input = valueFromInput(block, "ARG", 0);
      const payload = cCodePayloadForBlock(block, input);
      return [
        commandNode(
          block,
          "cCode.call",
          { body: payload, input },
          undefined,
          "implemented",
          "runtime.cSandbox.call",
        ),
      ];
    }

    case "read_sensor_road":
    case "sensor_group_detected":
    case "line_position":
    case "value_number":
    case "value_variable":
    case "variables_get":
    case "value_sensor_road":
    case "value_line_position":
    case "math_binary":
    case "math_remainder":
    case "math_unary":
    case "math_random_range":
    case "math_add":
    case "math_subtract":
    case "math_multiply":
    case "math_divide":
    case "math_modulo":
    case "math_round":
    case "math_unary_function":
    case "logic_literal_v2":
    case "logic_compare_v2":
    case "logic_operation_v2":
    case "logic_not_v2":
    case "logic_compare_lt":
    case "logic_compare_gt":
    case "logic_compare_eq":
    case "logic_compare_neq":
    case "logic_and":
    case "logic_or":
    case "logic_not":
    case "logic_sensor_group":
    case "remote_control_button":
    case "sensor_integrated_grayscale_value":
    case "sensor_integrated_grayscale_detect_black":
    case "sensor_single_grayscale_value":
    case "sensor_single_grayscale_detect_black":
    case "sensor_ultrasonic_distance":
    case "sensor_ambient_light_value":
    case "sensor_temperature_celsius":
    case "sensor_humidity_percent":
    case "sensor_flame_value":
    case "sensor_magnetic_detected":
    case "sensor_volume_detection":
    case "sensor_motor_encoder_value":
    case "sensor_current_timer_value":
    case "sensor_remote_control_button":
    case "sensor_touch_switch_pressed":
    case "sensor_infrared_obstacle":
    case "sensor_infrared_range_value":
    case "sensor_color_value":
    case "sensor_color_detected":
    case "ai_image_recognition":
    case "ai_recognition_is":
    case "my_block_call_value":
    case "my_block_param_value":
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


    case "calibrate_grayscale":
      result.push({ op: OpCode.CALIBRATE_GRAYSCALE, args: [] });
      result.push({ op: OpCode.CALIBRATE_GRAYSCALE, args: [] });
      break;

    case "patrol_line": {
      const dir = block.getFieldValue("DIRECTION");
      const speed = staticNumberFromInputOrField(block, "SPEED", "SPEED", 0.3);
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
      const left = staticNumberFromInputOrField(block, "LEFT", "LEFT", 0.3);
      const right = staticNumberFromInputOrField(block, "RIGHT", "RIGHT", 0.3);
      const time = staticNumberFromInputOrField(block, "TIME", "TIME", 1);
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
      const threshold = staticNumberFromInputOrField(block, "THRESHOLD", "THRESHOLD", 50);
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
      const times = Math.trunc(staticNumberFromInputOrField(block, "TIMES", "TIMES", 3));
      const doBlock = block.getInputTargetBlock("DO");

      result.push({ op: OpCode.LOOP_START, args: [times] });
      if (doBlock) {
        result.push(...blockToIR(doBlock));
      }
      result.push({ op: OpCode.LOOP_END, args: [] });
      break;
    }

    case "wait_block": {
      const time = staticNumberFromInputOrField(block, "TIME", "TIME", 1);
      const ticks = Math.round(time * 60);
      result.push({ op: OpCode.WAIT_TICKS, args: [ticks] });
      break;
    }

    case "set_var": {
      const varIdx = parseInt(block.getFieldValue("VAR") || "0");
      const value = staticNumberFromInputOrField(block, "VALUE", "VALUE", 0);
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
