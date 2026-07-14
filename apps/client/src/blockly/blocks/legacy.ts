import * as Blockly from "blockly";
import { BLOCK_COLOURS, numberInput, mathUnaryFunctionOptions } from "./shared.js";

// ---- Phần cứng ----




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

