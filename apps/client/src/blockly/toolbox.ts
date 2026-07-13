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
        { kind: "block", type: "motion_tank_drive_continuous" },
        { kind: "block", type: "motion_tank_drive_seconds" },
        { kind: "block", type: "motion_stop_pair" },
        { kind: "block", type: "motion_single_motor_power" },
        { kind: "block", type: "motion_dual_motor_seconds" },
        { kind: "block", type: "motion_single_motor_seconds" },
        { kind: "block", type: "motion_reverse_motor" },
        { kind: "block", type: "motion_stop_motor" },
        { kind: "block", type: "motion_dual_motor_degrees" },
        { kind: "block", type: "motion_single_motor_degrees" },
        { kind: "block", type: "motion_omni_move" },
        { kind: "block", type: "motion_omni_turn" },
        { kind: "block", type: "motion_omni_stop" },
        { kind: "block", type: "motion_steering_angle_mode" },
        { kind: "block", type: "motion_steering_rotation_mode" },
        { kind: "block", type: "motion_restore_steering_torque" },
        {
          kind: "block",
          type: "motion_set_motors_v2",
          inputs: {
            LEFT: { shadow: { type: "value_number", fields: { NUM: 0.3 } } },
            RIGHT: { shadow: { type: "value_number", fields: { NUM: 0.3 } } },
          },
        },
        {
          kind: "block",
          type: "motion_set_motors_for_time_v2",
          inputs: {
            LEFT: { shadow: { type: "value_number", fields: { NUM: 0.3 } } },
            RIGHT: { shadow: { type: "value_number", fields: { NUM: 0.3 } } },
            SECONDS: { shadow: { type: "value_number", fields: { NUM: 1 } } },
          },
        },
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
        { kind: "block", type: "value_sensor_road" },
        { kind: "block", type: "value_line_position" },
        { kind: "block", type: "logic_sensor_group" },
        { kind: "block", type: "remote_control_button" },
      ],
    },
    {
      kind: "category",
      name: "Values",
      colour: 45,
      contents: [
        { kind: "block", type: "value_number" },
        { kind: "block", type: "value_variable" },
        {
          kind: "block",
          type: "math_binary",
          inputs: {
            A: { shadow: { type: "value_number", fields: { NUM: 1 } } },
            B: { shadow: { type: "value_number", fields: { NUM: 1 } } },
          },
        },
        {
          kind: "block",
          type: "math_remainder",
          inputs: {
            A: { shadow: { type: "value_number", fields: { NUM: 5 } } },
            B: { shadow: { type: "value_number", fields: { NUM: 2 } } },
          },
        },
        {
          kind: "block",
          type: "math_unary",
          inputs: {
            ARG: { shadow: { type: "value_number", fields: { NUM: 90 } } },
          },
        },
        {
          kind: "block",
          type: "math_random_range",
          inputs: {
            MIN: { shadow: { type: "value_number", fields: { NUM: 1 } } },
            MAX: { shadow: { type: "value_number", fields: { NUM: 10 } } },
          },
        },
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
        { kind: "block", type: "logic_literal_v2" },
        {
          kind: "block",
          type: "logic_compare_v2",
          inputs: {
            A: { shadow: { type: "value_number", fields: { NUM: 0 } } },
            B: { shadow: { type: "value_number", fields: { NUM: 0 } } },
          },
        },
        {
          kind: "block",
          type: "logic_operation_v2",
          inputs: {
            A: { shadow: { type: "logic_literal_v2", fields: { BOOL: "TRUE" } } },
            B: { shadow: { type: "logic_literal_v2", fields: { BOOL: "FALSE" } } },
          },
        },
        {
          kind: "block",
          type: "logic_not_v2",
          inputs: {
            BOOL: { shadow: { type: "logic_literal_v2", fields: { BOOL: "TRUE" } } },
          },
        },
        {
          kind: "block",
          type: "control_if_v2",
          inputs: {
            COND: { shadow: { type: "logic_literal_v2", fields: { BOOL: "TRUE" } } },
          },
        },
        {
          kind: "block",
          type: "control_if_else_v2",
          inputs: {
            COND: { shadow: { type: "logic_literal_v2", fields: { BOOL: "TRUE" } } },
          },
        },
        {
          kind: "block",
          type: "control_repeat_times_v2",
          inputs: {
            TIMES: { shadow: { type: "value_number", fields: { NUM: 3 } } },
          },
        },
        { kind: "block", type: "control_repeat_forever" },
        {
          kind: "block",
          type: "control_repeat_until",
          inputs: {
            COND: { shadow: { type: "logic_literal_v2", fields: { BOOL: "FALSE" } } },
          },
        },
        {
          kind: "block",
          type: "wait_seconds_v2",
          inputs: {
            SECONDS: { shadow: { type: "value_number", fields: { NUM: 1 } } },
          },
        },
        {
          kind: "block",
          type: "control_wait_until",
          inputs: {
            COND: { shadow: { type: "logic_literal_v2", fields: { BOOL: "FALSE" } } },
            TIMEOUT: { shadow: { type: "value_number", fields: { NUM: 600 } } },
          },
        },
        { kind: "block", type: "control_break" },
        { kind: "block", type: "control_return" },
      ],
    },
    {
      kind: "category",
      name: "Variables",
      colour: 330,
      contents: [
        { kind: "block", type: "set_var" },
        {
          kind: "block",
          type: "set_var_v2",
          inputs: {
            VALUE: { shadow: { type: "value_number", fields: { NUM: 0 } } },
          },
        },
        { kind: "block", type: "value_variable" },
      ],
    },
    {
      kind: "category",
      name: "Patrol line",
      colour: 30,
      contents: [
        { kind: "block", type: "patrol_initialize_tank" },
        { kind: "block", type: "patrol_initialize_omni" },
        { kind: "block", type: "patrol_black_white_detection" },
        { kind: "block", type: "patrol_line_speed" },
        { kind: "block", type: "patrol_line_for_time" },
        { kind: "block", type: "patrol_line_intersections" },
        { kind: "block", type: "patrol_turn_branch" },
        { kind: "block", type: "patrol_start_motor_time" },
        { kind: "block", type: "patrol_start_motor_angle" },
        { kind: "block", type: "patrol_start_motor_until_sensor" },
        { kind: "block", type: "patrol_start_button" },
      ],
    },
  ],
};
