/**
 * Blockly toolbox configuration.
 *
 * The WhalesBot registry is the canonical source for documented blocks. This
 * file keeps the user-facing category order aligned with that registry.
 */

type ToolboxBlock = {
  kind: "block";
  type: string;
  inputs?: Record<string, unknown>;
  fields?: Record<string, unknown>;
};

const numberShadow = (value: number) => ({
  shadow: { type: "value_number", fields: { NUM: value } },
});

const booleanShadow = (value: boolean) => ({
  shadow: { type: "logic_literal_v2", fields: { BOOL: value ? "TRUE" : "FALSE" } },
});

const block = (
  type: string,
  options: Pick<ToolboxBlock, "inputs" | "fields"> = {},
): ToolboxBlock => ({ kind: "block", type, ...options });

export const toolbox: any = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Motion",
      colour: "#ff4f7b",
      contents: [
        block("motion_tank_drive_continuous"),
        block("motion_tank_drive_seconds"),
        block("motion_stop_pair"),
        block("motion_single_motor_power"),
        block("motion_dual_motor_seconds"),
        block("motion_single_motor_seconds"),
        block("motion_reverse_motor"),
        block("motion_stop_motor"),
        block("motion_dual_motor_degrees"),
        block("motion_single_motor_degrees"),
        block("motion_omni_move"),
        block("motion_omni_turn"),
        block("motion_omni_stop"),
        block("motion_steering_angle_mode"),
        block("motion_steering_rotation_mode"),
        block("motion_restore_steering_torque"),
        block("motion_set_motors_v2", {
          inputs: {
            LEFT: numberShadow(0.3),
            RIGHT: numberShadow(0.3),
          },
        }),
        block("motion_set_motors_for_time_v2", {
          inputs: {
            LEFT: numberShadow(0.3),
            RIGHT: numberShadow(0.3),
            SECONDS: numberShadow(1),
          },
        }),
        block("patrol_line"),
        block("turn_left"),
        block("turn_right"),
        block("start_motor"),
      ],
    },
    {
      kind: "category",
      name: "Light Speaker",
      colour: "#5aa2ff",
      contents: [
        block("light_play_sound"),
        block("light_electromagnet"),
        block("light_emotion_expression"),
        block("light_clear_emotion_expressions"),
        block("light_emotion_symbols"),
        block("light_emotion_customization"),
        block("light_clear_emotion_screen"),
        block("light_reading_1"),
        block("light_led_rgb"),
        block("light_led_swatch"),
        block("light_led_off"),
        block("light_digital_tube_display", {
          inputs: { value: numberShadow(0) },
        }),
        block("light_clear_digital_tube"),
        block("light_screen_display", {
          inputs: { value: numberShadow(1) },
        }),
        block("light_clear_screen"),
      ],
    },
    {
      kind: "category",
      name: "Sensor",
      colour: "#8b5cf6",
      contents: [
        block("read_sensor_road"),
        block("sensor_group_detected"),
        block("line_position"),
        block("value_sensor_road"),
        block("value_line_position"),
        block("logic_sensor_group"),
        block("remote_control_button"),
        block("sensor_touch_switch_pressed"),
        block("sensor_infrared_obstacle"),
        block("sensor_infrared_range_value"),
        block("sensor_integrated_grayscale_detect_black"),
        block("sensor_integrated_grayscale_value"),
        block("sensor_single_grayscale_detect_black"),
        block("sensor_single_grayscale_value"),
        block("sensor_ultrasonic_distance"),
        block("sensor_ambient_light_value"),
        block("sensor_temperature_celsius"),
        block("sensor_humidity_percent"),
        block("sensor_flame_value"),
        block("sensor_magnetic_detected"),
        block("sensor_volume_detection"),
        block("sensor_motor_encoder_value"),
        block("sensor_reset_motor_encoder"),
        block("sensor_current_timer_value"),
        block("sensor_reset_timer"),
        block("sensor_remote_control_button"),
        block("sensor_color_value"),
        block("sensor_color_detected"),
      ],
    },
    {
      kind: "category",
      name: "Event",
      colour: "#12cfc0",
      contents: [
        block("event_program_execute"),
        block("event_touch_switch_pressed"),
      ],
    },
    {
      kind: "category",
      name: "Loop",
      colour: "#ffad33",
      contents: [
        block("loop_repeat_forever"),
        block("loop_repeat_times"),
        block("loop_while_condition", {
          inputs: { condition: booleanShadow(true) },
        }),
        block("loop_repeat_until", {
          inputs: { condition: booleanShadow(false) },
        }),
        block("loop_break"),
        block("loop_return_value", {
          inputs: { value: numberShadow(0) },
        }),
        block("loop_wait_seconds"),
        block("loop_wait_until", {
          inputs: { condition: booleanShadow(false) },
        }),
        block("control_repeat_times_v2", {
          inputs: { TIMES: numberShadow(3) },
        }),
        block("control_repeat_forever"),
        block("control_repeat_until", {
          inputs: { COND: booleanShadow(false) },
        }),
        block("wait_seconds_v2", {
          inputs: { SECONDS: numberShadow(1) },
        }),
        block("control_wait_until", {
          inputs: {
            COND: booleanShadow(false),
            TIMEOUT: numberShadow(600),
          },
        }),
        block("control_break"),
        block("control_return", {
          inputs: { VALUE: numberShadow(0) },
        }),
      ],
    },
    {
      kind: "category",
      name: "Logic",
      colour: "#24bdf2",
      contents: [
        block("logic_if_then", {
          inputs: { condition: booleanShadow(true) },
        }),
        block("logic_if_then_else", {
          inputs: { condition: booleanShadow(true) },
        }),
        block("logic_compare_lt", {
          inputs: { a: numberShadow(0), b: numberShadow(1) },
        }),
        block("logic_compare_gt", {
          inputs: { a: numberShadow(1), b: numberShadow(0) },
        }),
        block("logic_compare_eq", {
          inputs: { a: numberShadow(0), b: numberShadow(0) },
        }),
        block("logic_compare_neq", {
          inputs: { a: numberShadow(0), b: numberShadow(1) },
        }),
        block("logic_and", {
          inputs: { cond1: booleanShadow(true), cond2: booleanShadow(false) },
        }),
        block("logic_or", {
          inputs: { cond1: booleanShadow(true), cond2: booleanShadow(false) },
        }),
        block("logic_not", {
          inputs: { condition: booleanShadow(true) },
        }),
        block("logic_literal_v2"),
        block("logic_compare_v2", {
          inputs: { A: numberShadow(0), B: numberShadow(0) },
        }),
        block("logic_operation_v2", {
          inputs: { A: booleanShadow(true), B: booleanShadow(false) },
        }),
        block("logic_not_v2", {
          inputs: { BOOL: booleanShadow(true) },
        }),
        block("if_sensor"),
        block("repeat_loop"),
        block("wait_block"),
      ],
    },
    {
      kind: "category",
      name: "Math",
      colour: "#f2c94c",
      contents: [
        block("value_number"),
        block("math_add", {
          inputs: { left: numberShadow(10), right: numberShadow(10) },
        }),
        block("math_subtract", {
          inputs: { left: numberShadow(10), right: numberShadow(10) },
        }),
        block("math_multiply", {
          inputs: { left: numberShadow(10), right: numberShadow(10) },
        }),
        block("math_divide", {
          inputs: { left: numberShadow(10), right: numberShadow(2) },
        }),
        block("math_random_range"),
        block("math_modulo", {
          inputs: { a: numberShadow(5), b: numberShadow(2) },
        }),
        block("math_round", {
          inputs: { value: numberShadow(1.5) },
        }),
        block("math_unary_function", {
          inputs: { value: numberShadow(90) },
        }),
        block("math_binary", {
          inputs: { A: numberShadow(1), B: numberShadow(1) },
        }),
        block("math_remainder", {
          inputs: { A: numberShadow(5), B: numberShadow(2) },
        }),
        block("math_unary", {
          inputs: { ARG: numberShadow(90) },
        }),
      ],
    },
    {
      kind: "category",
      name: "Variable",
      colour: "#d6b51d",
      contents: [
        { kind: "button", text: "Create variable", callbackKey: "CREATE_VARIABLE" },
        block("variable_create"),
        block("set_var"),
        block("set_var_v2", {
          inputs: { VALUE: numberShadow(0) },
        }),
        block("change_var_v2", {
          inputs: { DELTA: numberShadow(1) },
        }),
        block("value_variable"),
      ],
    },
    {
      kind: "category",
      name: "AI",
      colour: "#6574ff",
      contents: [
        block("ai_image_recognition"),
        block("ai_recognition_is", {
          inputs: { input: numberShadow(0) },
        }),
      ],
    },
    {
      kind: "category",
      name: "Patrol line",
      colour: "#ff7a2f",
      contents: [
        block("patrol_initialize_tank"),
        block("patrol_initialize_omni"),
        block("patrol_black_white_detection"),
        block("patrol_line_speed"),
        block("patrol_line_for_time"),
        block("patrol_line_intersections"),
        block("patrol_turn_branch"),
        block("patrol_start_motor_time"),
        block("patrol_start_motor_angle"),
        block("patrol_start_motor_until_sensor"),
        block("patrol_start_button"),
      ],
    },
    {
      kind: "category",
      name: "My Blocks",
      colour: "#2f6dff",
      contents: [
        { kind: "button", text: "Create block", callbackKey: "CREATE_MY_BLOCK" },
        block("my_blocks_create"),
        block("my_block_definition"),
        block("my_block_call_statement", {
          inputs: { ARG0: numberShadow(1) },
        }),
        block("my_block_call_value", {
          inputs: { ARG0: numberShadow(1) },
        }),
        block("my_block_param_value"),
      ],
    },
    {
      kind: "category",
      name: "C Code",
      colour: "#c2410c",
      contents: [
        block("c_code_function", {
          inputs: { ARG: numberShadow(1) },
        }),
      ],
    },
  ],
};
