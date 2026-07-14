import * as Blockly from "blockly";
import { BLOCK_COLOURS, numberInput, mathUnaryFunctionOptions } from "./shared.js";

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

