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
  PATROL_INTERSECTION_OPTIONS,
  PATROL_TURN_OPTIONS,
  COMPARE_OPTIONS,
  SENSOR_CHANNEL_OPTIONS,
  GRAYSCALE_DETECTED_OPTIONS,
  SENSOR_COLOR_OPTIONS,
} from "./shared.js";

// ---- C-011 Motion and Patrol line runtime blocks ----

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

