/**
 * Blockly toolbox configuration.
 *
 * The WhalesBot registry is the canonical source for documented blocks. This
 * file keeps the user-facing category order aligned with that registry.
 */

type ToolboxBlock = {
  kind: "block";
  type: string;
  inputs?: Record<string, any>;
  fields?: Record<string, unknown>;
};

type ToolboxButton = {
  kind: "button";
  text: string;
  callbackKey: string;
  callbackkey: string;
};

type ToolboxVariable = {
  getId(): string;
  name: string;
};

type VariableWorkspace = {
  getAllVariables?: () => ToolboxVariable[];
};

export const VARIABLE_CATEGORY_CALLBACK_KEY = "HTLAB_VARIABLE";
export const VARIABLE_CATEGORY_COLOUR = "#EBCE42";

const numberShadow = (value: number) => ({
  shadow: { type: "value_number", fields: { NUM: value } },
});

const numberInputs = (values: Record<string, number>) => ({
  inputs: Object.fromEntries(Object.entries(values).map(([name, value]) => [name, numberShadow(value)])),
});

const booleanShadow = (value: boolean) => ({
  shadow: { type: "logic_literal_v2", fields: { BOOL: value ? "TRUE" : "FALSE" } },
});

const block = (
  type: string,
  options: Pick<ToolboxBlock, "inputs" | "fields"> = {},
): ToolboxBlock => ({ kind: "block", type, ...options });

const createVariableButton = (): ToolboxButton => ({
  kind: "button",
  text: "Create a variable",
  callbackKey: "CREATE_VARIABLE",
  callbackkey: "CREATE_VARIABLE",
});

const variableField = (variable: ToolboxVariable) => ({
  fields: { VAR: variable.getId() },
});

export function variableToolboxFlyout(workspace: VariableWorkspace): Array<ToolboxButton | ToolboxBlock> {
  const variables = workspace.getAllVariables?.() ?? [];
  const flyoutItems: Array<ToolboxButton | ToolboxBlock> = [createVariableButton()];

  if (variables.length === 0) return flyoutItems;

  const [firstVariable] = variables;
  flyoutItems.push(
    block("value_variable", variableField(firstVariable)),
    block("set_var_v2", {
      ...variableField(firstVariable),
      inputs: { VALUE: numberShadow(0) },
    }),
    block("change_var_v2", {
      ...variableField(firstVariable),
      inputs: { DELTA: numberShadow(1) },
    }),
  );

  return flyoutItems;
}

export const toolbox: any = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Motion",
      colour: "#ff4f7b",
      contents: [
        block("motion_tank_drive_continuous", numberInputs({ power: 40 })),
        block("motion_tank_drive_seconds", numberInputs({ power: 40, seconds: 1 })),
        block("motion_stop_pair"),
        block("motion_single_motor_power", numberInputs({ power: 40 })),
        block("motion_dual_motor_seconds", numberInputs({ powerA: 40, powerB: 40, seconds: 1 })),
        block("motion_single_motor_seconds", numberInputs({ power: 40, seconds: 1 })),
        block("motion_dual_motor_degrees", numberInputs({ powerA: 40, powerB: 40, degrees: 360 })),
        block("motion_single_motor_degrees", numberInputs({ power: 40, degrees: 360 })),
        block("motion_reverse_motor"),
        block("motion_stop_motor"),
        block("motion_omni_move", numberInputs({ power: 40, headingDegrees: 0 })),
        block("motion_omni_turn", numberInputs({ power: 40 })),
        block("motion_omni_stop"),
        block("motion_steering_angle_mode", numberInputs({ speed: 40, angle: 0 })),
        block("motion_steering_rotation_mode", numberInputs({ speed: 40 })),
        block("motion_restore_steering_torque"),
      ],
    },
    {
      kind: "category",
      name: "Sensor",
      colour: "#8b5cf6",
      contents: [
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
        block("loop_repeat_times", numberInputs({ times: 10 })),
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
        block("loop_wait_seconds", numberInputs({ seconds: 2 })),
        block("loop_wait_until", {
          inputs: { condition: booleanShadow(false) },
        }),
      ],
    },
    {
      kind: "category",
      name: "Logic",
      colour: "#24bdf2",
      contents: [
        block("logic_if_then"),
        block("logic_if_then_else"),
        block("logic_compare_lt"),
        block("logic_compare_gt"),
        block("logic_compare_eq"),
        block("logic_compare_neq"),
        block("logic_and"),
        block("logic_or"),
        block("logic_not"),
      ],
    },
    {
      kind: "category",
      name: "Math",
      colour: "#5AE05A",
      contents: [
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
          inputs: { left: numberShadow(10), right: numberShadow(10) },
        }),
        block("math_random_range", numberInputs({ min: 0, max: 10 })),
        block("math_modulo"),
        block("math_round"),
        block("math_unary_function"),
      ],
    },
    {
      kind: "category",
      name: "Variable",
      colour: VARIABLE_CATEGORY_COLOUR,
      custom: VARIABLE_CATEGORY_CALLBACK_KEY,
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
        block("patrol_initialize_tank", numberInputs({ leftDirection: 100, rightDirection: -100 })),
        block("patrol_initialize_omni"),
        block("patrol_black_white_detection"),
        block("patrol_line_speed", numberInputs({ speed: 30 })),
        block("patrol_line_for_time", numberInputs({ speed: 30, seconds: 0.5 })),
        block("patrol_line_intersections", numberInputs({ speed: 30, rushSeconds: 0 })),
        block("patrol_turn_branch", numberInputs({ leftSpeed: 0, rightSpeed: 0 })),
        block("patrol_start_motor_time", numberInputs({ leftSpeed: 20, rightSpeed: 20, seconds: 0.5 })),
        block("patrol_start_motor_angle", numberInputs({ leftSpeed: 20, rightSpeed: 20, degrees: 360 })),
        block("patrol_start_motor_until_sensor", numberInputs({ leftSpeed: 20, rightSpeed: 20, threshold: 50 })),
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
