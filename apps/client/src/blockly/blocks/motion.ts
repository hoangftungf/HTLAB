import * as Blockly from "blockly";
import {
  BLOCK_COLOURS,
  numberInput,
  mathUnaryFunctionOptions,
  MOTOR_PORT_OPTIONS,
  MOTOR_PORT_WITH_ALL_OPTIONS,
  SENSOR_PORT_OPTIONS,
  STEERING_ID_OPTIONS,
  DIRECTION_OPTIONS,
  TURN_DIRECTION_OPTIONS,
} from "./shared.js";

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
