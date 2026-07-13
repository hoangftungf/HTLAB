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

// ---- Phần cứng ----

Blockly.Blocks["initialize"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "initialize",
      message0: "Initialize robot",
      colour: 230,
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
      colour: 230,
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
      colour: 120,
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
      colour: 120,
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
      colour: 120,
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
      colour: 120,
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
      colour: 290,
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
      colour: 290,
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
      colour: 290,
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
      colour: 210,
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
      colour: 210,
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
      colour: 210,
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
      colour: 330,
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
      colour: 120,
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
      colour: 120,
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
      colour: 45,
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
          type: "field_dropdown",
          name: "VAR",
          options: [["v0", "v0"], ["v1", "v1"], ["v2", "v2"], ["v3", "v3"], ["v4", "v4"], ["v5", "v5"], ["v6", "v6"], ["v7", "v7"]],
        },
      ],
      colour: 330,
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
          type: "field_dropdown",
          name: "VAR",
          options: [["v0", "v0"], ["v1", "v1"], ["v2", "v2"], ["v3", "v3"], ["v4", "v4"], ["v5", "v5"], ["v6", "v6"], ["v7", "v7"]],
        },
        { type: "input_value", name: "VALUE", check: "Number" },
      ],
      colour: 330,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Set a variable from a value expression",
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
      colour: 290,
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
      colour: 290,
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
      colour: 45,
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
      colour: 45,
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
      colour: 45,
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
        { type: "input_value", name: "MIN", check: "Number" },
        { type: "input_value", name: "MAX", check: "Number" },
      ],
      colour: 45,
      output: "Number",
      tooltip: "Deterministic random integer in range",
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
      colour: 210,
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
      colour: 210,
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
      colour: 210,
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
      colour: 210,
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
      colour: 290,
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
      colour: 290,
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
      colour: 210,
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
      colour: 210,
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
      colour: 210,
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
      colour: 210,
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
      colour: 210,
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
      colour: 210,
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
      colour: 210,
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
      colour: 210,
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
      message0: "Return",
      colour: 210,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Stop program execution",
    });
  },
};
