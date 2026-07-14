/**
 * Định nghĩa block Blockly tùy chỉnh cho EnjoyAI Robotics.
 * Mỗi block ánh xạ tới một hoặc nhiều opcode IR.
 *
 * Nhóm:
 * - Phần cứng: initialize, calibrate_grayscale
 * - Di chuyển: patrol_line, turn_left, turn_right, start_motor
 * - Cảm biến: read_sensor_road, sensor_group_detected, line_position
 * - Logic: if_sensor, repeat, wait
 * - Biến: set_var
 */

import * as Blockly from "blockly";
import {
  WHALESBOT_BLOCK_REGISTRY,
  type BlockCategory,
  type BlockFieldSchema,
  type BlockRegistryEntry,
} from "./blockRegistry.js";

const BLOCK_COLOURS = {
  hardware: "#5b7cff",
  movement: "#ff4f7b",
  sensor: "#8b5cf6",
  lightSpeaker: "#5aa2ff",
  event: "#12cfc0",
  loop: "#ffad33",
  logic: "#24bdf2",
  values: "#5AE05A",
  variables: "#EBCE42",
  ai: "#6574ff",
  patrolLine: "#ff7a2f",
  myBlocks: "#2f6dff",
  cCode: "#ff7a2f",
} as const;

const numberInput = (name: string): Record<string, unknown> => ({ type: "input_value", name, check: "Number" });

const mathUnaryFunctionOptions = [
  ["abs", "abs"],
  ["floor", "floor"],
  ["ceiling", "ceiling"],
  ["sqrt", "sqrt"],
  ["sin", "sin"],
  ["cos", "cos"],
  ["tan", "tan"],
  ["asin", "asin"],
  ["acos", "acos"],
  ["atan", "atan"],
  ["ln", "ln"],
  ["log", "log"],
  ["e^", "e^"],
  ["10^", "10^"],
];

class FieldVariableSelect extends Blockly.FieldVariable {
  constructor(
    varName: string | null | typeof Blockly.Field.SKIP_SETUP,
    validator?: Blockly.FieldVariableValidator,
    variableTypes?: string[],
    defaultType?: string,
    config?: Blockly.FieldVariableConfig,
  ) {
    super(varName, validator, variableTypes, defaultType, config);
    this.menuGenerator_ = FieldVariableSelect.dropdownCreate as unknown as Blockly.MenuGeneratorFunction;
  }

  static override dropdownCreate(this: Blockly.FieldVariable): Blockly.MenuOption[] {
    return Blockly.FieldVariable.dropdownCreate.call(this).filter((option) => {
      const id = option[1];
      return id !== "RENAME_VARIABLE_ID" && id !== "DELETE_VARIABLE_ID";
    });
  }
}

Blockly.fieldRegistry.register("field_variable_select", FieldVariableSelect);

type VariableMenuHandlers = {
  openRename: (workspace: Blockly.WorkspaceSvg, variable: Blockly.VariableModel) => void;
  openDelete: (workspace: Blockly.WorkspaceSvg, variable: Blockly.VariableModel) => void;
};

let variableMenuHandlers: VariableMenuHandlers | null = null;

export function setVariableMenuHandlers(handlers: VariableMenuHandlers | null): void {
  variableMenuHandlers = handlers;
}

export function getVariableMenuOptions(block: Blockly.Block): Array<{ enabled: boolean; text: string; callback: () => void }> {
  const field = block.getField("VAR") as Blockly.FieldVariable | null;
  const variable = field?.getVariable();
  if (!variable || !variableMenuHandlers) return [];

  return [
    {
      enabled: true,
      text: Blockly.Msg.RENAME_VARIABLE,
      callback: () => {
        variableMenuHandlers?.openRename(block.workspace as Blockly.WorkspaceSvg, variable);
      },
    },
    {
      enabled: true,
      text: Blockly.Msg.DELETE_VARIABLE.replace("%1", variable.name),
      callback: () => {
        variableMenuHandlers?.openDelete(block.workspace as Blockly.WorkspaceSvg, variable);
      },
    },
  ];
}

// ---- Phần cứng ----

Blockly.Blocks["initialize"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "initialize",
      message0: "Initialize robot",
      colour: BLOCK_COLOURS.hardware,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Reset robot to starting position on the map",
    });
  },
};

Blockly.Blocks["calibrate_grayscale"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "calibrate_grayscale",
      message0: "Calibrate grayscale sensors",
      colour: BLOCK_COLOURS.hardware,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Sample white floor then black line to calibrate sensors. Place robot on white first.",
    });
  },
};

// ---- Di chuyển ----

Blockly.Blocks["patrol_line"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "patrol_line",
      message0: "Patrol line %1 speed %2",
      args0: [
        {
          type: "field_dropdown",
          name: "DIRECTION",
          options: [["forward", "forward"], ["backward", "backward"]],
        },
        numberInput("SPEED"),
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Follow a line using the center sensor. Robot turns to stay on the line.",
    });
  },
};

Blockly.Blocks["turn_left"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "turn_left",
      message0: "Turn left %1",
      args0: [
        {
          type: "field_dropdown",
          name: "POWER",
          options: [["low", "low"], ["medium", "medium"], ["high", "high"]],
        },
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Turn the robot left",
    });
  },
};

Blockly.Blocks["turn_right"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "turn_right",
      message0: "Turn right %1",
      args0: [
        {
          type: "field_dropdown",
          name: "POWER",
          options: [["low", "low"], ["medium", "medium"], ["high", "high"]],
        },
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Turn the robot right",
    });
  },
};

Blockly.Blocks["start_motor"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "start_motor",
      message0: "Move %1 speed L=%2 R=%3 for %4 sec",
      args0: [
        {
          type: "field_dropdown",
          name: "DIR",
          options: [["forward", "forward"], ["backward", "backward"]],
        },
        numberInput("LEFT"),
        numberInput("RIGHT"),
        numberInput("TIME"),
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Set motor speeds for a duration in seconds",
    });
  },
};

// ---- Cảm biến ----

Blockly.Blocks["read_sensor_road"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "read_sensor_road",
      message0: "Read sensor road %1",
      args0: [
        {
          type: "field_dropdown",
          name: "ROAD",
          options: [["1 (left)", "1"], ["2", "2"], ["3 (center)", "3"], ["4", "4"], ["5 (right)", "5"]],
        },
      ],
      colour: BLOCK_COLOURS.sensor,
      output: "Number",
      tooltip: "Read a single grayscale sensor value (0-100)",
    });
  },
};

Blockly.Blocks["sensor_group_detected"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "sensor_group_detected",
      message0: "Group %1 detects line?",
      args0: [
        {
          type: "field_dropdown",
          name: "GROUP",
          options: [["left", "0"], ["middle", "1"], ["right", "2"]],
        },
      ],
      colour: BLOCK_COLOURS.sensor,
      output: "Boolean",
      tooltip: "Check if any sensor in a group (left/middle/right) detects the line",
    });
  },
};

Blockly.Blocks["line_position"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "line_position",
      message0: "Line position",
      colour: BLOCK_COLOURS.sensor,
      output: "Number",
      tooltip: "Read weighted line position (-100 to +100). 0 = centered.",
    });
  },
};

// ---- Logic ----

Blockly.Blocks["if_sensor"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "if_sensor",
      message0: "If road %1 %2 %3",
      args0: [
        {
          type: "field_dropdown",
          name: "ROAD",
          options: [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]],
        },
        {
          type: "field_dropdown",
          name: "OP",
          options: [["\u003E", "GT"], ["\u003C", "LT"], ["\u2265", "GTE"], ["\u2264", "LTE"], ["=", "EQ"], ["\u2260", "NEQ"]],
        },
        numberInput("THRESHOLD"),
      ],
      message1: "do %1",
      args1: [{ type: "input_statement", name: "DO" }],
      colour: BLOCK_COLOURS.logic,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Check a sensor value and run the do-block if condition is true",
    });
  },
};

Blockly.Blocks["repeat_loop"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "repeat_loop",
      message0: "Repeat %1 times",
      args0: [
        numberInput("TIMES"),
      ],
      message1: "do %1",
      args1: [{ type: "input_statement", name: "DO" }],
      colour: BLOCK_COLOURS.logic,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Repeat the enclosed blocks N times",
    });
  },
};

Blockly.Blocks["wait_block"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "wait_block",
      message0: "Wait %1 sec",
      args0: [
        numberInput("TIME"),
      ],
      colour: BLOCK_COLOURS.logic,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Wait (pause) for N seconds. Motors keep running.",
    });
  },
};

// ---- Biến ----

Blockly.Blocks["set_var"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "set_var",
      message0: "Set var %1 = %2",
      args0: [
        {
          type: "field_dropdown",
          name: "VAR",
          options: [["v0", "0"], ["v1", "1"], ["v2", "2"], ["v3", "3"], ["v4", "4"], ["v5", "5"], ["v6", "6"], ["v7", "7"]],
        },
        numberInput("VALUE"),
      ],
      colour: BLOCK_COLOURS.variables,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Store a value in a variable (v0-v7)",
    });
  },
};

// ---- C-010 value/control-flow foundation ----

Blockly.Blocks["motion_set_motors_v2"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_set_motors_v2",
      message0: "Set motors L %1 R %2",
      args0: [
        { type: "input_value", name: "LEFT", check: "Number" },
        { type: "input_value", name: "RIGHT", check: "Number" },
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Set left and right motor power from value expressions",
    });
  },
};

Blockly.Blocks["motion_set_motors_for_time_v2"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_set_motors_for_time_v2",
      message0: "Set motors L %1 R %2 for %3 sec",
      args0: [
        { type: "input_value", name: "LEFT", check: "Number" },
        { type: "input_value", name: "RIGHT", check: "Number" },
        { type: "input_value", name: "SECONDS", check: "Number" },
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Set motors for a duration computed from a value expression",
    });
  },
};

Blockly.Blocks["value_number"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "value_number",
      message0: "%1",
      args0: [{ type: "field_number", name: "NUM", value: 0 }],
      colour: BLOCK_COLOURS.values,
      output: "Number",
      tooltip: "Number value",
    });
  },
};

Blockly.Blocks["value_variable"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "value_variable",
      message0: "%1",
      args0: [
        {
          type: "field_variable_select",
          name: "VAR",
          variable: "number",
          defaultType: "Number",
        },
      ],
      colour: BLOCK_COLOURS.variables,
      output: "Number",
      tooltip: "Read a numeric variable",
      contextMenu: false,
    });
  },
};

Blockly.Blocks["set_var_v2"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "set_var_v2",
      message0: "set %1 to %2",
      args0: [
        {
          type: "field_variable_select",
          name: "VAR",
          variable: "number",
          defaultType: "Number",
        },
        { type: "input_value", name: "VALUE", check: "Number" },
      ],
      inputsInline: true,
      colour: BLOCK_COLOURS.variables,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Set a variable from a value expression",
      contextMenu: false,
    });
  },
};

Blockly.Blocks["change_var_v2"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "change_var_v2",
      message0: "variables %1 by %2",
      args0: [
        {
          type: "field_variable_select",
          name: "VAR",
          variable: "number",
          defaultType: "Number",
        },
        { type: "input_value", name: "DELTA", check: "Number" },
      ],
      inputsInline: true,
      colour: BLOCK_COLOURS.variables,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Add a computed value to a variable",
      contextMenu: false,
    });
  },
};

Blockly.Blocks["value_sensor_road"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "value_sensor_road",
      message0: "Road sensor %1",
      args0: [
        {
          type: "field_dropdown",
          name: "ROAD",
          options: [["1 (left)", "1"], ["2", "2"], ["3 (center)", "3"], ["4", "4"], ["5 (right)", "5"]],
        },
      ],
      colour: BLOCK_COLOURS.sensor,
      output: "Number",
      tooltip: "Read a grayscale sensor as a numeric value",
    });
  },
};

Blockly.Blocks["value_line_position"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "value_line_position",
      message0: "Line position",
      colour: BLOCK_COLOURS.sensor,
      output: "Number",
      tooltip: "Read the current line position",
    });
  },
};

Blockly.Blocks["math_add"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "math_add",
      message0: "%1 + %2",
      args0: [
        numberInput("left"),
        numberInput("right"),
      ],
      inputsInline: true,
      colour: BLOCK_COLOURS.values,
      output: "Number",
      tooltip: "Add two numeric values",
    });
  },
};

Blockly.Blocks["math_subtract"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "math_subtract",
      message0: "%1 - %2",
      args0: [
        numberInput("left"),
        numberInput("right"),
      ],
      inputsInline: true,
      colour: BLOCK_COLOURS.values,
      output: "Number",
      tooltip: "Subtract two numeric values",
    });
  },
};

Blockly.Blocks["math_multiply"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "math_multiply",
      message0: "%1 x %2",
      args0: [
        numberInput("left"),
        numberInput("right"),
      ],
      inputsInline: true,
      colour: BLOCK_COLOURS.values,
      output: "Number",
      tooltip: "Multiply two numeric values",
    });
  },
};

Blockly.Blocks["math_divide"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "math_divide",
      message0: "%1 / %2",
      args0: [
        numberInput("left"),
        numberInput("right"),
      ],
      inputsInline: true,
      colour: BLOCK_COLOURS.values,
      output: "Number",
      tooltip: "Divide two numeric values",
    });
  },
};

Blockly.Blocks["math_binary"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "math_binary",
      message0: "%1 %2 %3",
      args0: [
        { type: "input_value", name: "A", check: "Number" },
        {
          type: "field_dropdown",
          name: "OP",
          options: [["+", "ADD"], ["-", "MINUS"], ["x", "MULTIPLY"], ["/", "DIVIDE"], ["^", "POWER"]],
        },
        { type: "input_value", name: "B", check: "Number" },
      ],
      colour: BLOCK_COLOURS.values,
      output: "Number",
      tooltip: "Combine two numeric value expressions",
    });
  },
};

Blockly.Blocks["math_remainder"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "math_remainder",
      message0: "remainder %1 / %2",
      args0: [
        { type: "input_value", name: "A", check: "Number" },
        { type: "input_value", name: "B", check: "Number" },
      ],
      colour: BLOCK_COLOURS.values,
      output: "Number",
      tooltip: "Remainder after division",
    });
  },
};

Blockly.Blocks["math_unary"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "math_unary",
      message0: "%1 %2 angle %3",
      args0: [
        {
          type: "field_dropdown",
          name: "OP",
          options: [["abs", "ABS"], ["sqrt", "SQRT"], ["ln", "LN"], ["log10", "LOG10"], ["round", "ROUND"], ["floor", "FLOOR"], ["ceiling", "CEILING"], ["sin", "SIN"], ["cos", "COS"], ["tan", "TAN"], ["asin", "ASIN"], ["acos", "ACOS"], ["atan", "ATAN"]],
        },
        { type: "input_value", name: "ARG", check: "Number" },
        {
          type: "field_dropdown",
          name: "ANGLE_UNIT",
          options: [["degrees", "degree"], ["radians", "radian"]],
        },
      ],
      colour: BLOCK_COLOURS.values,
      output: "Number",
      tooltip: "Apply a numeric function",
    });
  },
};

Blockly.Blocks["math_random_range"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "math_random_range",
      message0: "pick random from %1 to %2",
      args0: [
        numberInput("min"),
        numberInput("max"),
      ],
      inputsInline: true,
      colour: BLOCK_COLOURS.values,
      output: "Number",
      tooltip: "Deterministic random integer in range",
    });
  },
};

Blockly.Blocks["math_modulo"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "math_modulo",
      message0: "the remainder of dividing %1 by %2",
      args0: [
        numberInput("a"),
        numberInput("b"),
      ],
      inputsInline: true,
      colour: BLOCK_COLOURS.values,
      output: "Number",
      tooltip: "Remainder after dividing a by b",
    });
  },
};

Blockly.Blocks["math_round"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "math_round",
      message0: "round %1",
      args0: [numberInput("value")],
      inputsInline: true,
      colour: BLOCK_COLOURS.values,
      output: "Number",
      tooltip: "Round a numeric value",
    });
  },
};

Blockly.Blocks["math_unary_function"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "math_unary_function",
      message0: "%1 %2",
      args0: [
        {
          type: "field_dropdown",
          name: "op",
          options: mathUnaryFunctionOptions,
        },
        numberInput("value"),
      ],
      inputsInline: true,
      colour: BLOCK_COLOURS.values,
      output: "Number",
      tooltip: "Apply a numeric function",
    });
  },
};

Blockly.Blocks["logic_literal_v2"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "logic_literal_v2",
      message0: "%1",
      args0: [
        {
          type: "field_dropdown",
          name: "BOOL",
          options: [["true", "TRUE"], ["false", "FALSE"]],
        },
      ],
      colour: BLOCK_COLOURS.logic,
      output: "Boolean",
      tooltip: "Boolean value",
    });
  },
};

Blockly.Blocks["logic_compare_v2"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "logic_compare_v2",
      message0: "%1 %2 %3",
      args0: [
        { type: "input_value", name: "A", check: "Number" },
        {
          type: "field_dropdown",
          name: "OP",
          options: [[">", "GT"], ["<", "LT"], [">=", "GTE"], ["<=", "LTE"], ["=", "EQ"], ["!=", "NEQ"]],
        },
        { type: "input_value", name: "B", check: "Number" },
      ],
      colour: BLOCK_COLOURS.logic,
      output: "Boolean",
      tooltip: "Compare two value expressions",
    });
  },
};

Blockly.Blocks["logic_operation_v2"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "logic_operation_v2",
      message0: "%1 %2 %3",
      args0: [
        { type: "input_value", name: "A", check: "Boolean" },
        {
          type: "field_dropdown",
          name: "OP",
          options: [["and", "AND"], ["or", "OR"]],
        },
        { type: "input_value", name: "B", check: "Boolean" },
      ],
      colour: BLOCK_COLOURS.logic,
      output: "Boolean",
      tooltip: "Combine boolean expressions",
    });
  },
};

Blockly.Blocks["logic_not_v2"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "logic_not_v2",
      message0: "not %1",
      args0: [{ type: "input_value", name: "BOOL", check: "Boolean" }],
      colour: BLOCK_COLOURS.logic,
      output: "Boolean",
      tooltip: "Invert a boolean expression",
    });
  },
};

Blockly.Blocks["logic_if_then"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "logic_if_then",
      message0: "if %1 then",
      args0: [{ type: "input_value", name: "condition", check: "Boolean" }],
      message1: "%1",
      args1: [{ type: "input_statement", name: "then" }],
      colour: BLOCK_COLOURS.logic,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Run blocks when a boolean expression is true",
    });
  },
};

Blockly.Blocks["logic_if_then_else"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "logic_if_then_else",
      message0: "if %1 then",
      args0: [{ type: "input_value", name: "condition", check: "Boolean" }],
      message1: "%1",
      args1: [{ type: "input_statement", name: "then" }],
      message2: "else %1",
      args2: [{ type: "input_statement", name: "else" }],
      colour: BLOCK_COLOURS.logic,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Run one branch when a boolean expression is true and another branch otherwise",
    });
  },
};

function logicCompareBlock(type: string, operatorText: string, tooltip: string): void {
  Blockly.Blocks[type] = {
    init(this: Blockly.Block) {
      this.jsonInit({
        type,
        message0: `%1 ${operatorText} %2`,
        args0: [
          { type: "input_value", name: "a", check: "Number" },
          { type: "input_value", name: "b", check: "Number" },
        ],
        inputsInline: true,
        colour: BLOCK_COLOURS.logic,
        output: "Boolean",
        tooltip,
      });
    },
  };
}

logicCompareBlock("logic_compare_lt", "<", "Check whether the left numeric value is less than the right value");
logicCompareBlock("logic_compare_gt", ">", "Check whether the left numeric value is greater than the right value");
logicCompareBlock("logic_compare_eq", "=", "Check whether two numeric values are equal");
logicCompareBlock("logic_compare_neq", "not equal", "Check whether two numeric values are not equal");

function logicBooleanBlock(type: string, operatorText: string, tooltip: string): void {
  Blockly.Blocks[type] = {
    init(this: Blockly.Block) {
      this.jsonInit({
        type,
        message0: `%1 ${operatorText} %2`,
        args0: [
          { type: "input_value", name: "cond1", check: "Boolean" },
          { type: "input_value", name: "cond2", check: "Boolean" },
        ],
        inputsInline: true,
        colour: BLOCK_COLOURS.logic,
        output: "Boolean",
        tooltip,
      });
    },
  };
}

logicBooleanBlock("logic_and", "and", "Check whether both boolean expressions are true");
logicBooleanBlock("logic_or", "or", "Check whether either boolean expression is true");

Blockly.Blocks["logic_not"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "logic_not",
      message0: "not %1",
      args0: [{ type: "input_value", name: "condition", check: "Boolean" }],
      inputsInline: true,
      colour: BLOCK_COLOURS.logic,
      output: "Boolean",
      tooltip: "Invert a boolean expression",
    });
  },
};

Blockly.Blocks["logic_sensor_group"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "logic_sensor_group",
      message0: "Group %1 detects line?",
      args0: [
        {
          type: "field_dropdown",
          name: "GROUP",
          options: [["left", "0"], ["middle", "1"], ["right", "2"]],
        },
      ],
      colour: BLOCK_COLOURS.sensor,
      output: "Boolean",
      tooltip: "Check a grayscale sensor group",
    });
  },
};

Blockly.Blocks["remote_control_button"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "remote_control_button",
      message0: "Remote button %1 pressed?",
      args0: [
        {
          type: "field_dropdown",
          name: "BUTTON",
          options: [["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"]],
        },
      ],
      colour: BLOCK_COLOURS.sensor,
      output: "Boolean",
      tooltip: "Remote control compatibility stub; returns false in simulation",
    });
  },
};

Blockly.Blocks["loop_repeat_forever"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "loop_repeat_forever",
      message0: "repeat forever",
      message1: "%1",
      args1: [{ type: "input_statement", name: "do" }],
      colour: BLOCK_COLOURS.loop,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Repeat until the interpreter loop guard stops the program",
    });
  },
};

Blockly.Blocks["loop_repeat_times"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "loop_repeat_times",
      message0: "repeat %1 times",
      args0: [numberInput("times")],
      message1: "%1",
      args1: [{ type: "input_statement", name: "do" }],
      colour: BLOCK_COLOURS.loop,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Repeat blocks a fixed number of times",
    });
  },
};

Blockly.Blocks["loop_while_condition"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "loop_while_condition",
      message0: "if %1 repeat",
      args0: [{ type: "input_value", name: "condition", check: "Boolean" }],
      message1: "%1",
      args1: [{ type: "input_statement", name: "do" }],
      colour: BLOCK_COLOURS.loop,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Repeat blocks while a condition remains true",
    });
  },
};

Blockly.Blocks["loop_repeat_until"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "loop_repeat_until",
      message0: "repeat until %1",
      args0: [{ type: "input_value", name: "condition", check: "Boolean" }],
      message1: "%1",
      args1: [{ type: "input_statement", name: "do" }],
      colour: BLOCK_COLOURS.loop,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Repeat blocks until a condition becomes true",
    });
  },
};

Blockly.Blocks["loop_break"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "loop_break",
      message0: "break",
      colour: BLOCK_COLOURS.loop,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Exit the nearest running loop",
    });
  },
};

Blockly.Blocks["loop_return_value"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "loop_return_value",
      message0: "Return %1",
      args0: [{ type: "input_value", name: "value" }],
      colour: BLOCK_COLOURS.loop,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Return a value from a custom block",
    });
  },
};

Blockly.Blocks["loop_wait_seconds"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "loop_wait_seconds",
      message0: "wait %1 secs.",
      args0: [numberInput("seconds")],
      colour: BLOCK_COLOURS.loop,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Wait for a fixed duration",
    });
  },
};

Blockly.Blocks["loop_wait_until"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "loop_wait_until",
      message0: "wait until %1",
      args0: [{ type: "input_value", name: "condition", check: "Boolean" }],
      colour: BLOCK_COLOURS.loop,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Wait until a condition becomes true",
    });
  },
};

Blockly.Blocks["control_if_v2"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "control_if_v2",
      message0: "If %1",
      args0: [{ type: "input_value", name: "COND", check: "Boolean" }],
      message1: "do %1",
      args1: [{ type: "input_statement", name: "THEN" }],
      colour: BLOCK_COLOURS.logic,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Run blocks when a boolean expression is true",
    });
  },
};

Blockly.Blocks["control_if_else_v2"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "control_if_else_v2",
      message0: "If %1",
      args0: [{ type: "input_value", name: "COND", check: "Boolean" }],
      message1: "do %1",
      args1: [{ type: "input_statement", name: "THEN" }],
      message2: "else %1",
      args2: [{ type: "input_statement", name: "ELSE" }],
      colour: BLOCK_COLOURS.logic,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Run one of two branches",
    });
  },
};

Blockly.Blocks["control_repeat_times_v2"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "control_repeat_times_v2",
      message0: "Repeat %1 times",
      args0: [{ type: "input_value", name: "TIMES", check: "Number" }],
      message1: "do %1",
      args1: [{ type: "input_statement", name: "DO" }],
      colour: BLOCK_COLOURS.logic,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Repeat blocks a computed number of times",
    });
  },
};

Blockly.Blocks["control_repeat_forever"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "control_repeat_forever",
      message0: "Repeat forever",
      message1: "do %1",
      args1: [{ type: "input_statement", name: "DO" }],
      colour: BLOCK_COLOURS.logic,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Repeat until the interpreter loop guard stops the program",
    });
  },
};

Blockly.Blocks["control_repeat_until"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "control_repeat_until",
      message0: "Repeat until %1",
      args0: [{ type: "input_value", name: "COND", check: "Boolean" }],
      message1: "do %1",
      args1: [{ type: "input_statement", name: "DO" }],
      colour: BLOCK_COLOURS.logic,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Repeat blocks until a boolean expression is true",
    });
  },
};

Blockly.Blocks["wait_seconds_v2"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "wait_seconds_v2",
      message0: "Wait %1 sec",
      args0: [{ type: "input_value", name: "SECONDS", check: "Number" }],
      colour: BLOCK_COLOURS.logic,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Wait for a computed duration",
    });
  },
};

Blockly.Blocks["control_wait_until"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "control_wait_until",
      message0: "Wait until %1 timeout ticks %2",
      args0: [
        { type: "input_value", name: "COND", check: "Boolean" },
        { type: "input_value", name: "TIMEOUT", check: "Number" },
      ],
      colour: BLOCK_COLOURS.logic,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Wait until a boolean expression becomes true or times out",
    });
  },
};

Blockly.Blocks["control_break"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "control_break",
      message0: "Break loop",
      colour: BLOCK_COLOURS.logic,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Exit the nearest running loop",
    });
  },
};

Blockly.Blocks["control_return"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "control_return",
      message0: "Return %1",
      args0: [{ type: "input_value", name: "VALUE", check: "Number" }],
      colour: BLOCK_COLOURS.logic,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Return a value from a custom block",
    });
  },
};

// ---- My Blocks: dynamic mutator definitions (C-018, C-019) ----
// Each parameter is encoded as <parameter name="..." type="..."/> in mutation XML.
// blockType_: "statement" | "reporter" | "boolean" controls call block shape in flyout.

export interface MyBlockParam {
  name: string;
  type: "Number" | "Boolean" | "String" | "Any";
  defaultValue?: string;
}

export type MyBlockType = "statement" | "reporter" | "boolean";

// Key for dynamic My Blocks flyout callback
export const MY_BLOCKS_FLYOUT_KEY = "MY_BLOCKS_FLYOUT";

// Helper to generate a random 4-char suffix like Whalesbot
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

// Registry: definition name → define block id (used by Edit function)
const MY_BLOCK_DEF_REGISTRY = new Map<string, string>();

Blockly.Blocks["my_block_definition"] = {
  init(this: any) {
    this.params_ = [] as MyBlockParam[];
    this.blockType_ = "statement" as MyBlockType;
    this.appendDummyInput("HEADER")
      .appendField("define")
      .appendField(new Blockly.FieldLabel("name_" + randomSuffix()), "NAME"); // read-only label
    this.appendStatementInput("BODY").setCheck(null);
    this.setColour(BLOCK_COLOURS.myBlocks);
    this.setTooltip("Define a custom function");
    this.setHelpUrl("");
    this.hat = "cap";
  },

  mutationToDom(this: any): Element {
    const container = Blockly.utils.xml.createElement("mutation");
    container.setAttribute("name", this.getFieldValue("NAME") ?? "my_block");
    container.setAttribute("blocktype", this.blockType_ ?? "statement");
    for (const p of (this.params_ as MyBlockParam[])) {
      const el = Blockly.utils.xml.createElement("parameter");
      el.setAttribute("name", p.name);
      el.setAttribute("type", p.type);
      if (p.defaultValue !== undefined) el.setAttribute("default", p.defaultValue);
      container.appendChild(el);
    }
    return container;
  },

  domToMutation(this: any, xmlElement: Element): void {
    this.blockType_ = (xmlElement.getAttribute("blocktype") ?? "statement") as MyBlockType;
    const name = xmlElement.getAttribute("name") ?? "my_block";
    const params: MyBlockParam[] = [];
    for (const child of Array.from(xmlElement.getElementsByTagName("parameter"))) {
      params.push({
        name: child.getAttribute("name") || "value",
        type: (child.getAttribute("type") as MyBlockParam["type"]) || "Number",
        defaultValue: child.getAttribute("default") || undefined,
      });
    }
    this.params_ = params;
    this._rebuildInputs(name);
  },

  _rebuildInputs(this: any, nameOpt?: string): void {
    const name: string = nameOpt ?? this.getFieldValue?.("NAME") ?? "my_block";

    if (this.getInput("HEADER")) this.removeInput("HEADER");
    const header = this.appendDummyInput("HEADER");
    if (this.getInput("BODY")) this.moveInputBefore?.("HEADER", "BODY");
    header.appendField("define").appendField(new Blockly.FieldLabel(name), "NAME");
    for (const p of (this.params_ as MyBlockParam[])) {
      header.appendField(" ").appendField(new Blockly.FieldLabel(p.name));
    }
  },

  onchange(this: any): void {
    // no-op: name is now read-only, nothing to sync
  },
};

// Build flyout XML elements for My Blocks dynamic category
export function buildMyBlocksFlyout(workspace: Blockly.WorkspaceSvg): Element[] {
  const mainWorkspace = workspace.isFlyout ? (workspace as any).targetWorkspace ?? workspace : workspace;
  const xmlList: Element[] = [];

  // "Create new blocks" button always first
  const btn = document.createElement("button");
  btn.setAttribute("text", "Create new blocks");
  btn.setAttribute("callbackKey", "CREATE_MY_BLOCK");
  xmlList.push(btn);

  // One call block per definition on workspace
  const defs = mainWorkspace.getAllBlocks(false).filter(
    (b: Blockly.Block) => b.type === "my_block_definition"
  );

  for (const def of defs) {
    const name = def.getFieldValue("NAME") ?? "my_block";
    const params: MyBlockParam[] = (def as any).params_ ?? [];
    const bType: MyBlockType = (def as any).blockType_ ?? "statement";

    const blockXml = Blockly.utils.xml.createElement("block");
    blockXml.setAttribute("type",
      bType === "statement" ? "my_block_call_statement" : "my_block_call_value"
    );

    const mutation = Blockly.utils.xml.createElement("mutation");
    mutation.setAttribute("name", name);
    if (bType !== "statement") {
      mutation.setAttribute("outputtype", bType === "boolean" ? "Boolean" : "Number");
    }
    for (const p of params) {
      const arg = Blockly.utils.xml.createElement("arg");
      arg.setAttribute("name", p.name);
      arg.setAttribute("type", p.type);
      mutation.appendChild(arg);
    }
    blockXml.appendChild(mutation);

    xmlList.push(blockXml);
  }

  return xmlList;
}

function _getCallParams(block: any): MyBlockParam[] {
  const ws: Blockly.Workspace = block.workspace;
  if (!ws) return [];
  const name: string = block.getFieldValue?.("NAME") ?? "";
  const defBlock: any = ws.getAllBlocks(false).find(
    (b: Blockly.Block) => b.type === "my_block_definition" && b.getFieldValue("NAME") === name
  );
  if (defBlock?.params_?.length) return defBlock.params_;
  return [];
}

const _callMixin = {
  init(this: any, isStatement: boolean): void {
    this.args_ = [] as MyBlockParam[];
    this.isStatement_ = isStatement;
    this.outputType_ = "Number";
    const header = this.appendDummyInput("HEADER");
    header.appendField(new Blockly.FieldLabel("my_block"), "NAME");
    this.setColour(BLOCK_COLOURS.myBlocks);
    if (isStatement) {
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
    } else {
      this.setOutput(true, "Number");
    }
    this.setTooltip("Call a custom function");
  },

  mutationToDom(this: any): Element {
    const container = Blockly.utils.xml.createElement("mutation");
    container.setAttribute("name", this.getFieldValue?.("NAME") ?? "my_block");
    if (!(this as any).isStatement_) {
      container.setAttribute("outputtype", (this as any).outputType_ ?? "Number");
    }
    for (const a of (this.args_ as MyBlockParam[])) {
      const el = Blockly.utils.xml.createElement("arg");
      el.setAttribute("name", a.name);
      el.setAttribute("type", a.type);
      container.appendChild(el);
    }
    return container;
  },

  domToMutation(this: any, xmlElement: Element): void {
    const name = xmlElement.getAttribute("name") ?? "my_block";
    if (this.getField("NAME")) {
      this.setFieldValue(name, "NAME");
    }
    if (!(this as any).isStatement_) {
      const ot = xmlElement.getAttribute("outputtype") ?? "Number";
      (this as any).outputType_ = ot;
      this.setOutput(false);
      this.setOutput(true, ot);
    }
    const args: MyBlockParam[] = [];
    for (const child of Array.from(xmlElement.getElementsByTagName("arg"))) {
      args.push({
        name: child.getAttribute("name") || "value",
        type: (child.getAttribute("type") as MyBlockParam["type"]) || "Number",
      });
    }
    this.args_ = args;
    this._rebuildArgInputs();
  },

  _rebuildArgInputs(this: any): void {
    let i = 0;
    while (this.getInput("ARG" + i)) {
      this.removeInput("ARG" + i);
      i++;
    }
    for (let j = 0; j < (this.args_ as MyBlockParam[]).length; j++) {
      const a = (this.args_ as MyBlockParam[])[j];
      this.appendValueInput("ARG" + j)
        .setCheck(a.type === "Boolean" ? "Boolean" : "Number")
        .appendField(a.name);
    }
  },

  _syncWithDef(this: any): void {
    const params = _getCallParams(this);
    const cur: MyBlockParam[] = this.args_ ?? [];
    const same =
      params.length === cur.length &&
      params.every((p, k) => cur[k]?.name === p.name && cur[k]?.type === p.type);
    if (!same) {
      this.args_ = params;
      this._rebuildArgInputs();
    }
  },

  onchange(this: any, event: Blockly.Events.Abstract): void {
    const relevant =
      event.type === Blockly.Events.FINISHED_LOADING ||
      event.type === Blockly.Events.BLOCK_CREATE ||
      event.type === Blockly.Events.BLOCK_CHANGE ||
      event.type === Blockly.Events.BLOCK_MOVE;
    if (relevant) this._syncWithDef();
  },
};

Blockly.Blocks["my_block_call_statement"] = {
  init(this: any) {
    _callMixin.init.call(this, true);
  },
  mutationToDom: _callMixin.mutationToDom,
  domToMutation: _callMixin.domToMutation,
  _rebuildArgInputs: _callMixin._rebuildArgInputs,
  _syncWithDef: _callMixin._syncWithDef,
  onchange: _callMixin.onchange,
};

Blockly.Blocks["my_block_call_value"] = {
  init(this: any) {
    _callMixin.init.call(this, false);
  },
  mutationToDom: _callMixin.mutationToDom,
  domToMutation: _callMixin.domToMutation,
  _rebuildArgInputs: _callMixin._rebuildArgInputs,
  _syncWithDef: _callMixin._syncWithDef,
  onchange: _callMixin.onchange,
};

Blockly.Blocks["my_block_param_value"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "my_block_param_value",
      message0: "param %1",
      args0: [{ type: "field_input", name: "PARAM", text: "value" }],
      colour: BLOCK_COLOURS.myBlocks,
      output: "Number",
      tooltip: "Read the current function parameter",
    });
  },
};

// Export for use in BlocklyEditor
export { MY_BLOCK_DEF_REGISTRY, randomSuffix };
export type { MyBlockParam as MyBlockParamType };






// ---- C-011 Motion and Patrol line runtime blocks ----

const MOTOR_PORT_OPTIONS = [["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"]];
const MOTOR_PORT_WITH_ALL_OPTIONS = [["all", "all"], ...MOTOR_PORT_OPTIONS];
const SENSOR_PORT_OPTIONS = [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]];
const STEERING_ID_OPTIONS = [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"], ["7", "7"], ["8", "8"]];
const DIRECTION_OPTIONS = [["Forward", "Forward"], ["Backward", "Backward"]];
const TURN_DIRECTION_OPTIONS = [["Turn left", "Turn left"], ["Turn right", "Turn right"]];
const PATROL_INTERSECTION_OPTIONS = [["left", "left"], ["right", "right"], ["T/Cross intersection", "T/Cross intersection"]];
const PATROL_TURN_OPTIONS = [["left", "left"], ["middle", "middle"], ["right", "right"]];
const COMPARE_OPTIONS = [["<", "<"], [">", ">"], ["=", "="], ["!=", "!="], ["<=", "<="], [">=", ">="]];
const SENSOR_CHANNEL_OPTIONS = [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]];
const GRAYSCALE_DETECTED_OPTIONS = [["black", "black"], ["white", "white"]];
const SENSOR_COLOR_OPTIONS = [["red", "red"], ["green", "green"], ["blue", "blue"], ["yellow", "yellow"], ["white", "white"], ["black", "black"]];

function sensorBooleanBlock(
  type: string,
  message0: string,
  args0: Record<string, unknown>[],
  defaultFields: Record<string, string> = {},
): void {
  Blockly.Blocks[type] = {
    init(this: Blockly.Block) {
      this.jsonInit({
        type,
        message0,
        args0,
        colour: BLOCK_COLOURS.sensor,
        output: "Boolean",
      });
      for (const [field, value] of Object.entries(defaultFields)) {
        this.setFieldValue(value, field);
      }
    },
  };
}

function sensorNumberBlock(
  type: string,
  message0: string,
  args0: Record<string, unknown>[] = [],
  defaultFields: Record<string, string> = {},
): void {
  Blockly.Blocks[type] = {
    init(this: Blockly.Block) {
      this.jsonInit({
        type,
        message0,
        args0,
        colour: BLOCK_COLOURS.sensor,
        output: "Number",
      });
      for (const [field, value] of Object.entries(defaultFields)) {
        this.setFieldValue(value, field);
      }
    },
  };
}

function sensorReporterBlock(type: string, message0: string, args0: Record<string, unknown>[] = []): void {
  Blockly.Blocks[type] = {
    init(this: Blockly.Block) {
      this.jsonInit({
        type,
        message0,
        args0,
        colour: BLOCK_COLOURS.sensor,
        output: null,
      });
    },
  };
}

function sensorStatementBlock(type: string, message0: string, args0: Record<string, unknown>[] = []): void {
  Blockly.Blocks[type] = {
    init(this: Blockly.Block) {
      this.jsonInit({
        type,
        message0,
        args0,
        colour: BLOCK_COLOURS.sensor,
        previousStatement: null,
        nextStatement: null,
      });
    },
  };
}

sensorBooleanBlock("sensor_touch_switch_pressed", "touch switch %1 pressed", [
  { type: "field_dropdown", name: "port", options: SENSOR_PORT_OPTIONS },
]);

sensorBooleanBlock("sensor_infrared_obstacle", "infrared port %1 obstacles detected", [
  { type: "field_dropdown", name: "port", options: SENSOR_PORT_OPTIONS },
]);

sensorNumberBlock("sensor_infrared_range_value", "infrared ranging sensor port %1 value", [
  { type: "field_dropdown", name: "port", options: SENSOR_PORT_OPTIONS },
]);

sensorBooleanBlock(
  "sensor_integrated_grayscale_detect_black",
  "integrated grayscale port %1 channel %2 detected %3",
  [
    { type: "field_dropdown", name: "port", options: SENSOR_PORT_OPTIONS },
    { type: "field_dropdown", name: "channel", options: SENSOR_CHANNEL_OPTIONS },
    { type: "field_dropdown", name: "color", options: GRAYSCALE_DETECTED_OPTIONS },
  ],
  { port: "5" },
);

sensorNumberBlock(
  "sensor_integrated_grayscale_value",
  "integrated grayscale port %1 channel %2",
  [
    { type: "field_dropdown", name: "port", options: SENSOR_PORT_OPTIONS },
    { type: "field_dropdown", name: "channel", options: SENSOR_CHANNEL_OPTIONS },
  ],
  { port: "5" },
);

sensorBooleanBlock("sensor_single_grayscale_detect_black", "single grayscale port %1 detected %2", [
  { type: "field_dropdown", name: "port", options: SENSOR_PORT_OPTIONS },
  { type: "field_dropdown", name: "color", options: GRAYSCALE_DETECTED_OPTIONS },
]);

sensorNumberBlock("sensor_single_grayscale_value", "single grayscale port %1 detected value", [
  { type: "field_dropdown", name: "port", options: SENSOR_PORT_OPTIONS },
]);

sensorNumberBlock("sensor_ultrasonic_distance", "ultrasonic sensor port %1 detect distance cm", [
  { type: "field_dropdown", name: "port", options: SENSOR_PORT_OPTIONS },
]);

sensorNumberBlock("sensor_ambient_light_value", "ambient light port %1 value", [
  { type: "field_dropdown", name: "port", options: SENSOR_PORT_OPTIONS },
]);

sensorNumberBlock("sensor_temperature_celsius", "temperature sensor port %1 \u00b0C", [
  { type: "field_dropdown", name: "port", options: SENSOR_PORT_OPTIONS },
]);

sensorNumberBlock("sensor_humidity_percent", "humidity sensor port %1 value %%", [
  { type: "field_dropdown", name: "port", options: SENSOR_PORT_OPTIONS },
]);

sensorNumberBlock("sensor_flame_value", "flame sensor port %1 value", [
  { type: "field_dropdown", name: "port", options: SENSOR_PORT_OPTIONS },
]);

sensorBooleanBlock("sensor_magnetic_detected", "magnetic port %1 magnetic field detected", [
  { type: "field_dropdown", name: "port", options: SENSOR_PORT_OPTIONS },
]);

sensorNumberBlock("sensor_volume_detection", "volume detection port %1", [
  { type: "field_dropdown", name: "port", options: SENSOR_PORT_OPTIONS },
]);

sensorNumberBlock("sensor_motor_encoder_value", "motor encoder port %1", [
  { type: "field_dropdown", name: "motor", options: MOTOR_PORT_OPTIONS },
]);

sensorStatementBlock("sensor_reset_motor_encoder", "reset motor encoder port %1", [
  { type: "field_dropdown", name: "motor", options: MOTOR_PORT_OPTIONS },
]);

sensorNumberBlock("sensor_current_timer_value", "current timer value");

sensorStatementBlock("sensor_reset_timer", "reset timer");

sensorReporterBlock("sensor_remote_control_button", "remote control button");

sensorReporterBlock("sensor_color_value", "Color sensor port %1", [
  { type: "field_dropdown", name: "port", options: SENSOR_PORT_OPTIONS },
]);

sensorBooleanBlock("sensor_color_detected", "Color sensor port %1 detected %2", [
  { type: "field_dropdown", name: "port", options: SENSOR_PORT_OPTIONS },
  { type: "field_dropdown", name: "color", options: SENSOR_COLOR_OPTIONS },
]);

Blockly.Blocks["motion_tank_drive_continuous"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_tank_drive_continuous",
      message0: "move left motor %1 right motor %2 %3 power %4 %%",
      args0: [
        { type: "field_dropdown", name: "leftMotor", options: MOTOR_PORT_OPTIONS },
        { type: "field_dropdown", name: "rightMotor", options: MOTOR_PORT_OPTIONS },
        { type: "field_dropdown", name: "direction", options: DIRECTION_OPTIONS },
        numberInput("power"),
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Drive the differential left/right motor pair continuously",
    });
    this.setFieldValue("B", "rightMotor");
  },
};

Blockly.Blocks["motion_tank_drive_seconds"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_tank_drive_seconds",
      message0: "move left motor %1 right motor %2 %3 power %4 %% run for %5 secs.",
      args0: [
        { type: "field_dropdown", name: "leftMotor", options: MOTOR_PORT_OPTIONS },
        { type: "field_dropdown", name: "rightMotor", options: MOTOR_PORT_OPTIONS },
        { type: "field_dropdown", name: "direction", options: DIRECTION_OPTIONS },
        numberInput("power"),
        numberInput("seconds"),
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Drive the motor pair for a duration, then stop",
    });
    this.setFieldValue("B", "rightMotor");
  },
};

Blockly.Blocks["motion_stop_pair"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_stop_pair",
      message0: "stop left motor %1 right motor %2",
      args0: [
        { type: "field_dropdown", name: "leftMotor", options: MOTOR_PORT_OPTIONS },
        { type: "field_dropdown", name: "rightMotor", options: MOTOR_PORT_OPTIONS },
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Stop the differential motor pair",
    });
    this.setFieldValue("B", "rightMotor");
  },
};

Blockly.Blocks["motion_single_motor_power"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_single_motor_power",
      message0: "set motor %1 power %2 %%",
      args0: [
        { type: "field_dropdown", name: "motor", options: MOTOR_PORT_OPTIONS },
        numberInput("power"),
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Set one differential motor where A=left and B=right",
    });
  },
};

Blockly.Blocks["motion_dual_motor_seconds"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_dual_motor_seconds",
      message0: "set motor %1 power %2 %% motor %3 power %4 %% run for %5 secs.",
      args0: [
        { type: "field_dropdown", name: "motorA", options: MOTOR_PORT_OPTIONS },
        numberInput("powerA"),
        { type: "field_dropdown", name: "motorB", options: MOTOR_PORT_OPTIONS },
        numberInput("powerB"),
        numberInput("seconds"),
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Set two motors for a duration, then stop",
    });
    this.setFieldValue("B", "motorB");
  },
};

Blockly.Blocks["motion_single_motor_seconds"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_single_motor_seconds",
      message0: "set motor %1 power %2 %% run for %3 secs.",
      args0: [
        { type: "field_dropdown", name: "motor", options: MOTOR_PORT_OPTIONS },
        numberInput("power"),
        numberInput("seconds"),
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Set one motor for a duration, then stop",
    });
  },
};

Blockly.Blocks["motion_dual_motor_degrees"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_dual_motor_degrees",
      message0: "set motor %1 power %2 %% motor %3 power %4 %% rotate for %5 degrees",
      args0: [
        { type: "field_dropdown", name: "motorA", options: MOTOR_PORT_OPTIONS },
        numberInput("powerA"),
        { type: "field_dropdown", name: "motorB", options: MOTOR_PORT_OPTIONS },
        numberInput("powerB"),
        numberInput("degrees"),
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Encoder-based motion currently emits a diagnostic",
    });
    this.setFieldValue("B", "motorB");
  },
};

Blockly.Blocks["motion_single_motor_degrees"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_single_motor_degrees",
      message0: "set motor %1 power %2 %% rotate for %3 degrees",
      args0: [
        { type: "field_dropdown", name: "motor", options: MOTOR_PORT_OPTIONS },
        numberInput("power"),
        numberInput("degrees"),
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Encoder-based motion currently emits a diagnostic",
    });
  },
};

Blockly.Blocks["motion_reverse_motor"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_reverse_motor",
      message0: "reverse motor %1",
      args0: [{ type: "field_dropdown", name: "motor", options: MOTOR_PORT_OPTIONS }],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Reverse the current target for a motor",
    });
  },
};

Blockly.Blocks["motion_stop_motor"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_stop_motor",
      message0: "stop motor %1",
      args0: [{ type: "field_dropdown", name: "motor", options: MOTOR_PORT_WITH_ALL_OPTIONS }],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Stop one motor or all motors",
    });
  },
};

Blockly.Blocks["motion_omni_move"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_omni_move",
      message0: "omni-wheel move power %1 %% towards %2 degree",
      args0: [
        numberInput("power"),
        numberInput("headingDegrees"),
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Omni-wheel motion emits a differential-drive diagnostic",
    });
  },
};

Blockly.Blocks["motion_omni_turn"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_omni_turn",
      message0: "omni-wheel turn %1 power %2 %%",
      args0: [
        { type: "field_dropdown", name: "direction", options: TURN_DIRECTION_OPTIONS },
        numberInput("power"),
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Omni-wheel turn emits a differential-drive diagnostic",
    });
  },
};

Blockly.Blocks["motion_omni_stop"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_omni_stop",
      message0: "stop omni-wheel move",
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Omni-wheel stop emits a diagnostic",
    });
  },
};

Blockly.Blocks["motion_steering_angle_mode"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_steering_angle_mode",
      message0: "set up steering gear angle mode ID %1 speed %2 angle %3",
      args0: [
        { type: "field_dropdown", name: "id", options: STEERING_ID_OPTIONS },
        numberInput("speed"),
        numberInput("angle"),
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Telemetry-only steering gear command",
    });
  },
};

Blockly.Blocks["motion_steering_rotation_mode"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_steering_rotation_mode",
      message0: "set up steering gear rotation mode ID %1 speed %2",
      args0: [
        { type: "field_dropdown", name: "id", options: STEERING_ID_OPTIONS },
        numberInput("speed"),
      ],
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Telemetry-only steering gear command",
    });
  },
};

Blockly.Blocks["motion_restore_steering_torque"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_restore_steering_torque",
      message0: "restore steering torque",
      colour: BLOCK_COLOURS.movement,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Telemetry-only steering gear command",
    });
  },
};

Blockly.Blocks["patrol_initialize_tank"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "patrol_initialize_tank",
      message0: "initialize left motor %1 %2 right motor %3 %4 integrated grayscale port %5",
      args0: [
        { type: "field_dropdown", name: "leftMotor", options: MOTOR_PORT_OPTIONS },
        numberInput("leftDirection"),
        { type: "field_dropdown", name: "rightMotor", options: MOTOR_PORT_OPTIONS },
        numberInput("rightDirection"),
        { type: "field_dropdown", name: "grayscalePort", options: SENSOR_PORT_OPTIONS },
      ],
      colour: BLOCK_COLOURS.patrolLine,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Configure tank-drive patrol line mode",
    });
  },
};

Blockly.Blocks["patrol_initialize_omni"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "patrol_initialize_omni",
      message0: "initialize omni-wheel Left front motor%1 %2 Right front motor%3 %4 Right rear motor%5 %6 Left rear motor%7 %8 integrated grayscale port %9",
      args0: [
        { type: "field_dropdown", name: "leftFrontMotor", options: MOTOR_PORT_OPTIONS },
        numberInput("leftFrontDirection"),
        { type: "field_dropdown", name: "rightFrontMotor", options: MOTOR_PORT_OPTIONS },
        numberInput("rightFrontDirection"),
        { type: "field_dropdown", name: "rightRearMotor", options: MOTOR_PORT_OPTIONS },
        numberInput("rightRearDirection"),
        { type: "field_dropdown", name: "leftRearMotor", options: MOTOR_PORT_OPTIONS },
        numberInput("leftRearDirection"),
        { type: "field_dropdown", name: "grayscalePort", options: SENSOR_PORT_OPTIONS },
      ],
      colour: BLOCK_COLOURS.patrolLine,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Omni patrol mode is accepted with a diagnostic approximation",
    });
  },
};

Blockly.Blocks["patrol_black_white_detection"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "patrol_black_white_detection",
      message0: "black and white detection",
      colour: BLOCK_COLOURS.patrolLine,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Calibrate grayscale thresholds using the current map samples",
    });
  },
};

Blockly.Blocks["patrol_line_speed"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "patrol_line_speed",
      message0: "patrol line speed %1",
      args0: [numberInput("speed")],
      colour: BLOCK_COLOURS.patrolLine,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Follow the line continuously until the patrol timeout guard stops it",
    });
  },
};

Blockly.Blocks["patrol_line_for_time"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "patrol_line_for_time",
      message0: "patrol line patrol line speed %1 for %2",
      args0: [
        numberInput("speed"),
        numberInput("seconds"),
      ],
      colour: BLOCK_COLOURS.patrolLine,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Follow the line for a duration",
    });
  },
};

Blockly.Blocks["patrol_line_intersections"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "patrol_line_intersections",
      message0: "patrol line intersections %1 patrol line speed %2 rush through intersection time %3",
      args0: [
        { type: "field_dropdown", name: "branch", options: PATROL_INTERSECTION_OPTIONS },
        numberInput("speed"),
        numberInput("rushSeconds"),
      ],
      colour: BLOCK_COLOURS.patrolLine,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Follow the line until the sensor pattern looks like an intersection",
    });
  },
};

Blockly.Blocks["patrol_turn_branch"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "patrol_turn_branch",
      message0: "turn %1 left motor speed %2 right motor speed %3",
      args0: [
        { type: "field_dropdown", name: "branch", options: PATROL_TURN_OPTIONS },
        numberInput("leftSpeed"),
        numberInput("rightSpeed"),
      ],
      colour: BLOCK_COLOURS.patrolLine,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Turn until the selected sensor group detects the line or timeout guard stops it",
    });
  },
};

Blockly.Blocks["patrol_start_motor_time"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "patrol_start_motor_time",
      message0: "start motor left motor speed %1 right motor speed %2 time %3",
      args0: [
        numberInput("leftSpeed"),
        numberInput("rightSpeed"),
        numberInput("seconds"),
      ],
      colour: BLOCK_COLOURS.patrolLine,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Start both motors for a duration",
    });
  },
};

Blockly.Blocks["patrol_start_motor_angle"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "patrol_start_motor_angle",
      message0: "start motor left motor speed %1 right motor speed %2 angle %3",
      args0: [
        numberInput("leftSpeed"),
        numberInput("rightSpeed"),
        numberInput("degrees"),
      ],
      colour: BLOCK_COLOURS.patrolLine,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Encoder-based patrol motion currently emits a diagnostic",
    });
  },
};

Blockly.Blocks["patrol_start_motor_until_sensor"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "patrol_start_motor_until_sensor",
      message0: "start motor left motor speed %1 right motor speed %2 Sensor %3 %4 %5",
      args0: [
        numberInput("leftSpeed"),
        numberInput("rightSpeed"),
        { type: "field_dropdown", name: "sensor", options: SENSOR_PORT_OPTIONS },
        { type: "field_dropdown", name: "compare", options: COMPARE_OPTIONS },
        numberInput("threshold"),
      ],
      colour: BLOCK_COLOURS.patrolLine,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Run motors until a grayscale sensor condition becomes true",
    });
  },
};

Blockly.Blocks["patrol_start_button"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "patrol_start_button",
      message0: "start button",
      colour: BLOCK_COLOURS.patrolLine,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Intentional no-op compatibility block",
    });
  },
};

// ---- C-014 C Code sandbox block ----

Blockly.Blocks["c_code_function"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "c_code_function",
      message0: "C function %1 param %2 input %3",
      args0: [
        { type: "field_input", name: "functionName", text: "_fn" },
        { type: "field_input", name: "parameterName", text: "_number1" },
        { type: "input_value", name: "ARG", check: "Number" },
      ],
      message1: "{ %1 }",
      args1: [
        {
          type: "field_input",
          name: "body",
          text: "return _number1 + 1;",
        },
      ],
      colour: BLOCK_COLOURS.cCode,
      output: "Number",
      tooltip: "Run a tiny numeric C subset through the sandbox adapter when enabled",
    });
  },
};

// Registry-backed compatibility blocks not yet hand-authored above.
const CATEGORY_COLOURS: Record<BlockCategory, string> = {
  Motion: BLOCK_COLOURS.movement,
  "Light Speaker": BLOCK_COLOURS.lightSpeaker,
  Sensor: BLOCK_COLOURS.sensor,
  Event: BLOCK_COLOURS.event,
  Loop: BLOCK_COLOURS.loop,
  Logic: BLOCK_COLOURS.logic,
  Math: BLOCK_COLOURS.values,
  Variable: BLOCK_COLOURS.variables,
  AI: BLOCK_COLOURS.ai,
  "Patrol line": BLOCK_COLOURS.patrolLine,
  "My Blocks": BLOCK_COLOURS.myBlocks,
  "C Code": BLOCK_COLOURS.cCode,
};

function fallbackFieldArg(field: BlockFieldSchema): Record<string, unknown> {
  switch (field.kind) {
    case "number":
      return numberInput(field.name);
    case "text":
      return { type: "field_input", name: field.name, text: String(field.defaultValue ?? "") };
    case "dropdown":
      return {
        type: "field_dropdown",
        name: field.name,
        options: (field.values ?? []).map((value) => [value, value]),
      };
    case "color":
      return { type: "field_input", name: field.name, text: String(field.defaultValue ?? "#ffffff") };
    case "boolean":
      return { type: "field_checkbox", name: field.name, checked: Boolean(field.defaultValue) };
    case "value-input":
      return { type: "input_value", name: field.name };
    case "boolean-input":
      return { type: "input_value", name: field.name, check: "Boolean" };
    case "statement-input":
      return { type: "input_statement", name: field.name };
    case "textarea":
      return { type: "field_input", name: field.name, text: String(field.defaultValue ?? "") };
    case "matrix":
      return { type: "field_input", name: field.name, text: "00000/00000/00000/00000/00000" };
  }
}

function fallbackMessage(entry: BlockRegistryEntry): string {
  const fieldLabels = entry.fields.map((field, index) => `${field.name} %${index + 1}`);
  return [entry.displayText, ...fieldLabels].join(" ");
}

function registerRegistryFallbackBlock(entry: BlockRegistryEntry): void {
  if (Blockly.Blocks[entry.type]) return;

  Blockly.Blocks[entry.type] = {
    init(this: Blockly.Block) {
      const config: Record<string, unknown> = {
        type: entry.type,
        message0: fallbackMessage(entry),
        args0: entry.fields.map(fallbackFieldArg),
        colour: CATEGORY_COLOURS[entry.category],
        tooltip: entry.notes ?? entry.displayText,
      };

      if (entry.kind === "boolean") {
        config.output = "Boolean";
      } else if (entry.kind === "reporter-number") {
        config.output = "Number";
      } else if (entry.kind === "reporter") {
        config.output = null;
      } else if (entry.kind === "hat") {
        config.nextStatement = null;
      } else {
        config.previousStatement = null;
        config.nextStatement = null;
      }

      this.jsonInit(config);
      if (entry.kind === "hat") {
        this.hat = "cap";
      }
    },
  };
}

WHALESBOT_BLOCK_REGISTRY.forEach(registerRegistryFallbackBlock);
