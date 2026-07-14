import * as Blockly from "blockly";
import {
  BLOCK_COLOURS,
  numberInput,
  mathUnaryFunctionOptions,
  MOTOR_PORT_OPTIONS,
  SENSOR_PORT_OPTIONS,
  PATROL_INTERSECTION_OPTIONS,
  PATROL_TURN_OPTIONS,
  COMPARE_OPTIONS,
} from "./shared.js";

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

