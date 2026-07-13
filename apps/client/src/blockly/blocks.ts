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
  values: "#f2c94c",
  variables: "#d6b51d",
  ai: "#6574ff",
  patrolLine: "#ff7a2f",
  myBlocks: "#2f6dff",
  cCode: "#ff7a2f",
} as const;

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
        {
          type: "field_number",
          name: "SPEED",
          value: 0.3,
          min: 0.1,
          max: 1,
          precision: 0.1,
        },
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
        {
          type: "field_number",
          name: "LEFT",
          value: 0.3,
          min: -1,
          max: 1,
          precision: 0.1,
        },
        {
          type: "field_number",
          name: "RIGHT",
          value: 0.3,
          min: -1,
          max: 1,
          precision: 0.1,
        },
        {
          type: "field_number",
          name: "TIME",
          value: 1,
          min: 0.1,
          max: 60,
          precision: 0.1,
        },
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
        {
          type: "field_number",
          name: "THRESHOLD",
          value: 50,
          min: 0,
          max: 100,
        },
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
        {
          type: "field_number",
          name: "TIMES",
          value: 3,
          min: 1,
          max: 999,
        },
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
        {
          type: "field_number",
          name: "TIME",
          value: 1,
          min: 0.01,
          max: 60,
          precision: 0.01,
        },
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
        {
          type: "field_number",
          name: "VALUE",
          value: 0,
          min: -999,
          max: 999,
        },
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
      message0: "var %1",
      args0: [
        {
          type: "field_variable",
          name: "VAR",
          variable: "v0",
        },
      ],
      colour: BLOCK_COLOURS.variables,
      output: "Number",
      tooltip: "Read a numeric variable",
    });
  },
};

Blockly.Blocks["set_var_v2"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "set_var_v2",
      message0: "Set var %1 = %2",
      args0: [
        {
          type: "field_variable",
          name: "VAR",
          variable: "v0",
        },
        { type: "input_value", name: "VALUE", check: "Number" },
      ],
      colour: BLOCK_COLOURS.variables,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Set a variable from a value expression",
    });
  },
};

Blockly.Blocks["change_var_v2"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "change_var_v2",
      message0: "Change var %1 by %2",
      args0: [
        {
          type: "field_variable",
          name: "VAR",
          variable: "v0",
        },
        { type: "input_value", name: "DELTA", check: "Number" },
      ],
      colour: BLOCK_COLOURS.variables,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Add a computed value to a variable",
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
      message0: "random %1 to %2",
      args0: [
        { type: "field_number", name: "min", value: 0 },
        { type: "field_number", name: "max", value: 10 },
      ],
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
      message0: "remainder of %1 by %2",
      args0: [
        { type: "input_value", name: "a", check: "Number" },
        { type: "input_value", name: "b", check: "Number" },
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
      args0: [{ type: "input_value", name: "value", check: "Number" }],
      colour: BLOCK_COLOURS.values,
      output: "Number",
      tooltip: "Round a numeric value",
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

Blockly.Blocks["my_block_definition"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "my_block_definition",
      message0: "Define block %1 param %2 type %3 returns %4",
      args0: [
        { type: "field_input", name: "NAME", text: "my block" },
        { type: "field_input", name: "PARAM", text: "value" },
        {
          type: "field_dropdown",
          name: "PARAM_TYPE",
          options: [["Number", "Number"], ["Boolean", "Boolean"], ["String", "String"], ["Any", "Any"]],
        },
        {
          type: "field_dropdown",
          name: "RETURN_TYPE",
          options: [["Number", "Number"], ["Boolean", "Boolean"], ["String", "String"], ["Any", "Any"], ["Void", "Void"]],
        },
      ],
      message1: "do %1",
      args1: [{ type: "input_statement", name: "BODY" }],
      colour: BLOCK_COLOURS.myBlocks,
      tooltip: "Define a custom block with one typed parameter",
    });
  },
};

Blockly.Blocks["my_block_call_statement"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "my_block_call_statement",
      message0: "Call block %1 with %2",
      args0: [
        { type: "field_input", name: "NAME", text: "my block" },
        { type: "input_value", name: "ARG0", check: "Number" },
      ],
      colour: BLOCK_COLOURS.myBlocks,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Call a custom block and ignore its return value",
    });
  },
};

Blockly.Blocks["my_block_call_value"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "my_block_call_value",
      message0: "Call block %1 with %2",
      args0: [
        { type: "field_input", name: "NAME", text: "my block" },
        { type: "input_value", name: "ARG0", check: "Number" },
      ],
      colour: BLOCK_COLOURS.myBlocks,
      output: "Number",
      tooltip: "Call a custom block and use its return value",
    });
  },
};

Blockly.Blocks["my_block_param_value"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "my_block_param_value",
      message0: "param %1",
      args0: [{ type: "field_input", name: "PARAM", text: "value" }],
      colour: BLOCK_COLOURS.myBlocks,
      output: "Number",
      tooltip: "Read the current custom-block parameter",
    });
  },
};

// ---- C-011 Motion and Patrol line runtime blocks ----

const MOTOR_PORT_OPTIONS = [["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"]];
const MOTOR_PORT_WITH_ALL_OPTIONS = [["all", "all"], ...MOTOR_PORT_OPTIONS];
const SENSOR_PORT_OPTIONS = [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]];
const STEERING_ID_OPTIONS = [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"], ["7", "7"], ["8", "8"]];
const DIRECTION_OPTIONS = [["Forward", "Forward"], ["Backward", "Backward"]];
const TURN_DIRECTION_OPTIONS = [["Turn left", "Turn left"], ["Turn right", "Turn right"]];
const BRANCH_OPTIONS = [["left", "left"], ["middle", "middle"], ["right", "right"], ["T/Cross intersection", "T/Cross intersection"]];
const COMPARE_OPTIONS = [["<", "<"], [">", ">"], ["=", "="], ["!=", "!="], ["<=", "<="], [">=", ">="]];

Blockly.Blocks["motion_tank_drive_continuous"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "motion_tank_drive_continuous",
      message0: "move left motor %1 right motor %2 %3 power %4 %%",
      args0: [
        { type: "field_dropdown", name: "leftMotor", options: MOTOR_PORT_OPTIONS },
        { type: "field_dropdown", name: "rightMotor", options: MOTOR_PORT_OPTIONS },
        { type: "field_dropdown", name: "direction", options: DIRECTION_OPTIONS },
        { type: "field_number", name: "power", value: 40, min: -100, max: 100 },
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
        { type: "field_number", name: "power", value: 40, min: -100, max: 100 },
        { type: "field_number", name: "seconds", value: 1, min: 0, precision: 0.01 },
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
        { type: "field_number", name: "power", value: 40, min: -100, max: 100 },
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
        { type: "field_number", name: "powerA", value: 40, min: -100, max: 100 },
        { type: "field_dropdown", name: "motorB", options: MOTOR_PORT_OPTIONS },
        { type: "field_number", name: "powerB", value: 40, min: -100, max: 100 },
        { type: "field_number", name: "seconds", value: 1, min: 0, precision: 0.01 },
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
        { type: "field_number", name: "power", value: 40, min: -100, max: 100 },
        { type: "field_number", name: "seconds", value: 1, min: 0, precision: 0.01 },
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
        { type: "field_number", name: "powerA", value: 40, min: -100, max: 100 },
        { type: "field_dropdown", name: "motorB", options: MOTOR_PORT_OPTIONS },
        { type: "field_number", name: "powerB", value: 40, min: -100, max: 100 },
        { type: "field_number", name: "degrees", value: 360 },
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
        { type: "field_number", name: "power", value: 40, min: -100, max: 100 },
        { type: "field_number", name: "degrees", value: 360 },
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
        { type: "field_number", name: "power", value: 40, min: -100, max: 100 },
        { type: "field_number", name: "headingDegrees", value: 0 },
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
        { type: "field_number", name: "power", value: 40, min: -100, max: 100 },
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
        { type: "field_number", name: "speed", value: 40, min: 0, max: 100 },
        { type: "field_number", name: "angle", value: 0 },
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
        { type: "field_number", name: "speed", value: 40, min: -100, max: 100 },
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
      message0: "Initialize tank line follower left %1 dir %2 right %3 dir %4 grayscale port %5",
      args0: [
        { type: "field_dropdown", name: "leftMotor", options: MOTOR_PORT_OPTIONS },
        { type: "field_number", name: "leftDirection", value: 100 },
        { type: "field_dropdown", name: "rightMotor", options: MOTOR_PORT_OPTIONS },
        { type: "field_number", name: "rightDirection", value: -100 },
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
      message0: "Initialize omni line follower LF %1 RF %2 RR %3 LR %4 grayscale port %5",
      args0: [
        { type: "field_dropdown", name: "leftFrontMotor", options: MOTOR_PORT_OPTIONS },
        { type: "field_dropdown", name: "rightFrontMotor", options: MOTOR_PORT_OPTIONS },
        { type: "field_dropdown", name: "rightRearMotor", options: MOTOR_PORT_OPTIONS },
        { type: "field_dropdown", name: "leftRearMotor", options: MOTOR_PORT_OPTIONS },
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
      message0: "Black and white detection",
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
      message0: "Patrol line speed %1",
      args0: [{ type: "field_number", name: "speed", value: 30, min: 0, max: 100 }],
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
      message0: "Patrol line speed %1 for %2 sec",
      args0: [
        { type: "field_number", name: "speed", value: 30, min: 0, max: 100 },
        { type: "field_number", name: "seconds", value: 0.5, min: 0, precision: 0.01 },
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
      message0: "Patrol until %1 speed %2 rush through %3 sec",
      args0: [
        { type: "field_dropdown", name: "branch", options: BRANCH_OPTIONS },
        { type: "field_number", name: "speed", value: 30, min: 0, max: 100 },
        { type: "field_number", name: "rushSeconds", value: 0, min: 0, precision: 0.01 },
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
      message0: "Turn to %1 left speed %2 right speed %3",
      args0: [
        { type: "field_dropdown", name: "branch", options: BRANCH_OPTIONS },
        { type: "field_number", name: "leftSpeed", value: 0, min: -100, max: 100 },
        { type: "field_number", name: "rightSpeed", value: 0, min: -100, max: 100 },
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
      message0: "Start motor left speed %1 right speed %2 time %3 sec",
      args0: [
        { type: "field_number", name: "leftSpeed", value: 20, min: -100, max: 100 },
        { type: "field_number", name: "rightSpeed", value: 20, min: -100, max: 100 },
        { type: "field_number", name: "seconds", value: 0.5, min: 0, precision: 0.01 },
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
      message0: "Start motor left speed %1 right speed %2 angle %3",
      args0: [
        { type: "field_number", name: "leftSpeed", value: 20, min: -100, max: 100 },
        { type: "field_number", name: "rightSpeed", value: 20, min: -100, max: 100 },
        { type: "field_number", name: "degrees", value: 360 },
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
      message0: "Start motor left speed %1 right speed %2 until sensor %3 %4 %5",
      args0: [
        { type: "field_number", name: "leftSpeed", value: 20, min: -100, max: 100 },
        { type: "field_number", name: "rightSpeed", value: 20, min: -100, max: 100 },
        { type: "field_dropdown", name: "sensor", options: SENSOR_PORT_OPTIONS },
        { type: "field_dropdown", name: "compare", options: COMPARE_OPTIONS },
        { type: "field_number", name: "threshold", value: 50 },
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
      message0: "Start button",
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
      return {
        type: "field_number",
        name: field.name,
        value: Number(field.defaultValue ?? 0),
        ...(field.min !== undefined ? { min: field.min } : {}),
        ...(field.max !== undefined ? { max: field.max } : {}),
      };
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
