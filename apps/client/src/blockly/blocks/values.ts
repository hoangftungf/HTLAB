import * as Blockly from "blockly";
import { BLOCK_COLOURS, numberInput, mathUnaryFunctionOptions } from "./shared.js";

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
