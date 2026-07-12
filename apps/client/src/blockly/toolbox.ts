/**
 * Cấu hình toolbox Blockly.
 * Định nghĩa các category và block hiển thị trong toolbox.
 */

import type Blockly from "blockly";

export const toolbox: any = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Hardware",
      colour: 230,
      contents: [
        { kind: "block", type: "initialize" },
        { kind: "block", type: "calibrate_grayscale" },
      ],
    },
    {
      kind: "category",
      name: "Movement",
      colour: 120,
      contents: [
        { kind: "block", type: "patrol_line" },
        { kind: "block", type: "turn_left" },
        { kind: "block", type: "turn_right" },
        { kind: "block", type: "start_motor" },
      ],
    },
    {
      kind: "category",
      name: "Sensors",
      colour: 290,
      contents: [
        { kind: "block", type: "read_sensor_road" },
        { kind: "block", type: "sensor_group_detected" },
        { kind: "block", type: "line_position" },
      ],
    },
    {
      kind: "category",
      name: "Logic",
      colour: 210,
      contents: [
        { kind: "block", type: "if_sensor" },
        { kind: "block", type: "repeat_loop" },
        { kind: "block", type: "wait_block" },
      ],
    },
    {
      kind: "category",
      name: "Variables",
      colour: 330,
      contents: [
        { kind: "block", type: "set_var" },
      ],
    },
  ],
};
