import * as Blockly from "blockly";
import { BLOCK_COLOURS, numberInput, mathUnaryFunctionOptions } from "./shared.js";

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
