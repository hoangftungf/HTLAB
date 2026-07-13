// @vitest-environment jsdom

import * as Blockly from "blockly";
import {
  createInterpreter,
  createSimulation,
  createTestMap,
  DEFAULT_ROBOT_CONFIG,
} from "@htlab/simulation-core";
import "../blockly/blocks.js";
import {
  applyWhalesBotFieldShapeClass,
  WHALESBOT_DROPDOWN_FIELD_CLASS,
  WHALESBOT_NUMBER_FIELD_CLASS,
} from "../blockly/fieldShapeClasses.js";
import { WHALESBOT_BLOCK_REGISTRY } from "../blockly/blockRegistry.js";
import { toolbox, variableToolboxFlyout, VARIABLE_CATEGORY_CALLBACK_KEY, VARIABLE_CATEGORY_COLOUR } from "../blockly/toolbox.js";
import { workspaceToIR } from "../blockly/generator.js";
import { loadProject, saveProject } from "./projectStore.js";
import { SAMPLE_PROGRAMS } from "./samplePrograms.js";

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const beforeEach: (fn: () => void) => void;
declare const expect: any;

function valueNumber(workspace: Blockly.Workspace, value: number): Blockly.Block {
  const block = workspace.newBlock("value_number");
  block.setFieldValue(String(value), "NUM");
  return block;
}

function connectValue(parent: Blockly.Block, inputName: string, child: Blockly.Block): void {
  const input = parent.getInput(inputName);
  if (!input?.connection || !child.outputConnection) {
    throw new Error(`Cannot connect ${child.type} to ${parent.type}.${inputName}`);
  }
  input.connection.connect(child.outputConnection);
}

function connectStatement(parent: Blockly.Block, inputName: string, child: Blockly.Block): void {
  const input = parent.getInput(inputName);
  if (!input?.connection || !child.previousConnection) {
    throw new Error(`Cannot connect ${child.type} to ${parent.type}.${inputName}`);
  }
  input.connection.connect(child.previousConnection);
}

function connectNext(parent: Blockly.Block, child: Blockly.Block): void {
  if (!parent.nextConnection || !child.previousConnection) {
    throw new Error(`Cannot connect ${parent.type} to ${child.type}`);
  }
  parent.nextConnection.connect(child.previousConnection);
}

type ToolboxItem = {
  kind: string;
  name?: string;
  colour?: string;
  custom?: string;
  type?: string;
  text?: string;
  callbackKey?: string;
  callbackkey?: string;
  inputs?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  contents?: ToolboxItem[];
};

const EXPECTED_MOTION_TOOLBOX_TYPES = [
  "motion_tank_drive_continuous",
  "motion_tank_drive_seconds",
  "motion_stop_pair",
  "motion_single_motor_power",
  "motion_dual_motor_seconds",
  "motion_single_motor_seconds",
  "motion_dual_motor_degrees",
  "motion_single_motor_degrees",
  "motion_reverse_motor",
  "motion_stop_motor",
  "motion_omni_move",
  "motion_omni_turn",
  "motion_omni_stop",
  "motion_steering_angle_mode",
  "motion_steering_rotation_mode",
  "motion_restore_steering_torque",
] as const;

const EXPECTED_MOTION_BLOCK_TEXT: Record<typeof EXPECTED_MOTION_TOOLBOX_TYPES[number], string> = {
  motion_tank_drive_continuous: "move left motor A right motor B Forward power %",
  motion_tank_drive_seconds: "move left motor A right motor B Forward power % run for secs.",
  motion_stop_pair: "stop left motor A right motor B",
  motion_single_motor_power: "set motor A power %",
  motion_dual_motor_seconds: "set motor A power % motor B power % run for secs.",
  motion_single_motor_seconds: "set motor A power % run for secs.",
  motion_dual_motor_degrees: "set motor A power % motor B power % rotate for degrees",
  motion_single_motor_degrees: "set motor A power % rotate for degrees",
  motion_reverse_motor: "reverse motor A",
  motion_stop_motor: "stop motor all",
  motion_omni_move: "omni-wheel move power % towards degree",
  motion_omni_turn: "omni-wheel turn Turn left power %",
  motion_omni_stop: "stop omni-wheel move",
  motion_steering_angle_mode: "set up steering gear angle mode ID 1 speed angle",
  motion_steering_rotation_mode: "set up steering gear rotation mode ID 1 speed",
  motion_restore_steering_torque: "restore steering torque",
};

const EXPECTED_SENSOR_TOOLBOX_TYPES = [
  "sensor_touch_switch_pressed",
  "sensor_infrared_obstacle",
  "sensor_infrared_range_value",
  "sensor_integrated_grayscale_detect_black",
  "sensor_integrated_grayscale_value",
  "sensor_single_grayscale_detect_black",
  "sensor_single_grayscale_value",
  "sensor_ultrasonic_distance",
  "sensor_ambient_light_value",
  "sensor_temperature_celsius",
  "sensor_humidity_percent",
  "sensor_flame_value",
  "sensor_magnetic_detected",
  "sensor_volume_detection",
  "sensor_motor_encoder_value",
  "sensor_reset_motor_encoder",
  "sensor_current_timer_value",
  "sensor_reset_timer",
  "sensor_remote_control_button",
  "sensor_color_value",
  "sensor_color_detected",
] as const;

const EXPECTED_SENSOR_BLOCK_TEXT: Record<typeof EXPECTED_SENSOR_TOOLBOX_TYPES[number], string> = {
  sensor_touch_switch_pressed: "touch switch 1 pressed",
  sensor_infrared_obstacle: "infrared port 1 obstacles detected",
  sensor_infrared_range_value: "infrared ranging sensor port 1 value",
  sensor_integrated_grayscale_detect_black: "integrated grayscale port 5 channel 1 detected black",
  sensor_integrated_grayscale_value: "integrated grayscale port 5 channel 1",
  sensor_single_grayscale_detect_black: "single grayscale port 1 detected black",
  sensor_single_grayscale_value: "single grayscale port 1 detected value",
  sensor_ultrasonic_distance: "ultrasonic sensor port 1 detect distance cm",
  sensor_ambient_light_value: "ambient light port 1 value",
  sensor_temperature_celsius: "temperature sensor port 1 \u00b0C",
  sensor_humidity_percent: "humidity sensor port 1 value %",
  sensor_flame_value: "flame sensor port 1 value",
  sensor_magnetic_detected: "magnetic port 1 magnetic field detected",
  sensor_volume_detection: "volume detection port 1",
  sensor_motor_encoder_value: "motor encoder port A",
  sensor_reset_motor_encoder: "reset motor encoder port A",
  sensor_current_timer_value: "current timer value",
  sensor_reset_timer: "reset timer",
  sensor_remote_control_button: "remote control button",
  sensor_color_value: "Color sensor port 1",
  sensor_color_detected: "Color sensor port 1 detected red",
};

const EXPECTED_LOOP_TOOLBOX_TYPES = [
  "loop_repeat_forever",
  "loop_repeat_times",
  "loop_while_condition",
  "loop_repeat_until",
  "loop_break",
  "loop_return_value",
  "loop_wait_seconds",
  "loop_wait_until",
] as const;

const EXPECTED_LOOP_BLOCK_TEXT: Record<typeof EXPECTED_LOOP_TOOLBOX_TYPES[number], string> = {
  loop_repeat_forever: "repeat forever",
  loop_repeat_times: "repeat times",
  loop_while_condition: "if repeat",
  loop_repeat_until: "repeat until",
  loop_break: "break",
  loop_return_value: "Return",
  loop_wait_seconds: "wait secs.",
  loop_wait_until: "wait until",
};

const EXPECTED_LOGIC_TOOLBOX_TYPES = [
  "logic_if_then",
  "logic_if_then_else",
  "logic_compare_lt",
  "logic_compare_gt",
  "logic_compare_eq",
  "logic_compare_neq",
  "logic_and",
  "logic_or",
  "logic_not",
] as const;

const EXPECTED_LOGIC_BLOCK_TEXT: Record<typeof EXPECTED_LOGIC_TOOLBOX_TYPES[number], string> = {
  logic_if_then: "if then",
  logic_if_then_else: "if then else",
  logic_compare_lt: "<",
  logic_compare_gt: ">",
  logic_compare_eq: "=",
  logic_compare_neq: "not equal",
  logic_and: "and",
  logic_or: "or",
  logic_not: "not",
};

const MATH_BLOCK_COLOUR = "#5AE05A";

const EXPECTED_MATH_TOOLBOX_TYPES = [
  "math_add",
  "math_subtract",
  "math_multiply",
  "math_divide",
  "math_random_range",
  "math_modulo",
  "math_round",
  "math_unary_function",
] as const;

const EXPECTED_MATH_BLOCK_TEXT: Record<typeof EXPECTED_MATH_TOOLBOX_TYPES[number], string> = {
  math_add: "+",
  math_subtract: "-",
  math_multiply: "x",
  math_divide: "/",
  math_random_range: "pick random from to",
  math_modulo: "the remainder of dividing by",
  math_round: "round",
  math_unary_function: "abs",
};

const EXPECTED_VARIABLE_TOOLBOX_TYPES = [
  "value_variable",
  "set_var_v2",
  "change_var_v2",
] as const;

const EXPECTED_VARIABLE_BLOCK_TEXT: Record<typeof EXPECTED_VARIABLE_TOOLBOX_TYPES[number], string> = {
  value_variable: "number",
  set_var_v2: "set number to",
  change_var_v2: "variables number by",
};

function collectToolboxBlocks(items: readonly ToolboxItem[], blocks: ToolboxItem[] = []): ToolboxItem[] {
  for (const item of items) {
    if (item.kind === "block") blocks.push(item);
    if (item.contents) collectToolboxBlocks(item.contents, blocks);
  }
  return blocks;
}

function findToolboxCategory(items: readonly ToolboxItem[], name: string): ToolboxItem {
  const category = items.find((item) => item.kind === "category" && item.name === name);
  if (!category) {
    throw new Error(`Toolbox category not found: ${name}`);
  }
  return category;
}

function collectToolboxCategoryNames(items: readonly ToolboxItem[]): string[] {
  return items
    .filter((item) => item.kind === "category")
    .map((item) => {
      if (!("name" in item) || typeof item.name !== "string") {
        throw new Error("Toolbox category is missing a name");
      }
      return item.name;
    });
}

function visibleBlockText(block: Blockly.Block): string {
  return block.inputList
    .flatMap((input) => input.fieldRow.map((field) => field.getText()))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function dropdownValues(field: Blockly.Field | null): string[] {
  if (!field || typeof (field as any).getOptions !== "function") {
    throw new Error("Expected a dropdown field");
  }
  return (field as any).getOptions(false).map((option: readonly string[]) => option[1]);
}

function shadowNumber(toolboxBlock: ToolboxItem, inputName: string): number {
  const input = toolboxBlock.inputs?.[inputName] as { shadow?: { type?: string; fields?: { NUM?: number } } } | undefined;
  if (input?.shadow?.type !== "value_number") {
    throw new Error(`Expected ${toolboxBlock.type}.${inputName} to use a value_number shadow`);
  }
  return Number(input.shadow.fields?.NUM);
}

function makeSvgFieldRoot(): { root: SVGGElement; rect: SVGRectElement } {
  const root = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.classList.add("blocklyFieldRect");
  root.append(rect);
  return { root, rect };
}

function makeWorkspace(): Blockly.Workspace {
  const workspace = new Blockly.Workspace();
  workspace.createVariable("speed", "Number", "var-speed");

  const setSpeed = workspace.newBlock("set_var_v2");
  setSpeed.setFieldValue("var-speed", "VAR");
  connectValue(setSpeed, "VALUE", valueNumber(workspace, 0.3));

  const definition = workspace.newBlock("my_block_definition");
  definition.setFieldValue("double", "NAME");
  definition.setFieldValue("x", "PARAM");

  const returnBlock = workspace.newBlock("control_return");
  const multiply = workspace.newBlock("math_binary");
  multiply.setFieldValue("MULTIPLY", "OP");
  const param = workspace.newBlock("my_block_param_value");
  param.setFieldValue("x", "PARAM");
  connectValue(multiply, "A", param);
  connectValue(multiply, "B", valueNumber(workspace, 2));
  connectValue(returnBlock, "VALUE", multiply);
  connectStatement(definition, "BODY", returnBlock);

  const drive = workspace.newBlock("motion_set_motors_v2");
  const call = workspace.newBlock("my_block_call_value");
  call.setFieldValue("double", "NAME");
  connectValue(call, "ARG0", valueNumber(workspace, 0.2));
  connectValue(drive, "LEFT", call);
  connectValue(drive, "RIGHT", valueNumber(workspace, 0));
  if (!setSpeed.nextConnection || !drive.previousConnection) {
    throw new Error("Cannot connect variable set to drive block");
  }
  setSpeed.nextConnection.connect(drive.previousConnection);

  return workspace;
}

function makeMixedCategoryWorkspace(): Blockly.Workspace {
  const workspace = new Blockly.Workspace();
  workspace.createVariable("speed", "Number", "var-speed");

  const entry = workspace.newBlock("event_program_execute");
  const initialize = workspace.newBlock("initialize");
  connectNext(entry, initialize);

  const patrolInit = workspace.newBlock("patrol_initialize_tank");
  connectNext(initialize, patrolInit);

  const calibrate = workspace.newBlock("patrol_black_white_detection");
  connectNext(patrolInit, calibrate);

  const setSpeed = workspace.newBlock("set_var_v2");
  setSpeed.setFieldValue("var-speed", "VAR");
  const mathAdd = workspace.newBlock("math_add");
  connectValue(mathAdd, "left", valueNumber(workspace, 0.2));
  connectValue(mathAdd, "right", valueNumber(workspace, 0.1));
  connectValue(setSpeed, "VALUE", mathAdd);
  connectNext(calibrate, setSpeed);

  const drive = workspace.newBlock("motion_set_motors_v2");
  const cCode = workspace.newBlock("c_code_function");
  cCode.setFieldValue("_fn", "functionName");
  cCode.setFieldValue("_number1", "parameterName");
  cCode.setFieldValue("return _number1 + 1;", "body");
  connectValue(cCode, "ARG", valueNumber(workspace, 1));
  connectValue(drive, "LEFT", cCode);
  connectValue(drive, "RIGHT", valueNumber(workspace, 0.1));
  connectNext(setSpeed, drive);

  const repeat = workspace.newBlock("loop_repeat_times");
  connectValue(repeat, "times", valueNumber(workspace, 2));
  const ifThen = workspace.newBlock("logic_if_then");
  const logicAnd = workspace.newBlock("logic_and");
  const grayscaleBlack = workspace.newBlock("sensor_integrated_grayscale_detect_black");
  grayscaleBlack.setFieldValue("5", "port");
  grayscaleBlack.setFieldValue("3", "channel");
  const aiRecognition = workspace.newBlock("ai_recognition_is");
  aiRecognition.setFieldValue("Number", "classType");
  aiRecognition.setFieldValue("0", "classValue");
  connectValue(aiRecognition, "input", valueNumber(workspace, 0));
  connectValue(logicAnd, "cond1", grayscaleBlack);
  connectValue(logicAnd, "cond2", aiRecognition);
  connectValue(ifThen, "condition", logicAnd);
  const wait = workspace.newBlock("loop_wait_seconds");
  connectValue(wait, "seconds", valueNumber(workspace, 0));
  connectStatement(ifThen, "then", wait);
  connectStatement(repeat, "do", ifThen);
  connectNext(drive, repeat);

  const led = workspace.newBlock("light_led_swatch");
  led.setFieldValue("1", "port");
  led.setFieldValue("#33ffaa", "color");
  connectNext(repeat, led);

  const readingStub = workspace.newBlock("light_reading_1");
  connectValue(readingStub, "value", valueNumber(workspace, 1));
  connectNext(led, readingStub);

  const patrol = workspace.newBlock("patrol_line_for_time");
  connectValue(patrol, "speed", valueNumber(workspace, 30));
  connectValue(patrol, "seconds", valueNumber(workspace, 0.05));
  connectNext(readingStub, patrol);

  const omniStub = workspace.newBlock("motion_omni_stop");
  connectNext(patrol, omniStub);

  const definition = workspace.newBlock("my_block_definition");
  definition.setFieldValue("boost", "NAME");
  definition.setFieldValue("x", "PARAM");
  const returnBlock = workspace.newBlock("control_return");
  const multiply = workspace.newBlock("math_multiply");
  const param = workspace.newBlock("my_block_param_value");
  param.setFieldValue("x", "PARAM");
  connectValue(multiply, "left", param);
  connectValue(multiply, "right", valueNumber(workspace, 2));
  connectValue(returnBlock, "VALUE", multiply);
  connectStatement(definition, "BODY", returnBlock);

  const call = workspace.newBlock("my_block_call_statement");
  call.setFieldValue("boost", "NAME");
  connectValue(call, "ARG0", valueNumber(workspace, 0.2));
  connectNext(omniStub, call);

  const touchEvent = workspace.newBlock("event_touch_switch_pressed");
  touchEvent.setFieldValue("1", "port");

  const variableDialog = workspace.newBlock("variable_create");
  variableDialog.setFieldValue("speed", "variableName");

  return workspace;
}

describe("projectStore C-013 save/load compatibility", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders Event trigger blocks as hat blocks", () => {
    const workspace = new Blockly.Workspace();

    for (const type of ["event_program_execute", "event_touch_switch_pressed"]) {
      const block = workspace.newBlock(type);

      expect(block.previousConnection).toBeNull();
      expect(block.nextConnection).not.toBeNull();
      expect(block.hat).toBe("cap");
    }
  });

  it("renders Math random range with connectable number inputs", () => {
    const workspace = new Blockly.Workspace();
    const block = workspace.newBlock("math_random_range");

    expect(block.outputConnection).not.toBeNull();
    expect(block.getField("min")).toBeNull();
    expect(block.getField("max")).toBeNull();
    expect(block.getInput("min")?.connection?.getCheck()).toEqual(["Number"]);
    expect(block.getInput("max")?.connection?.getCheck()).toEqual(["Number"]);
  });

  it("matches the line-following toolbox category set", () => {
    const categories = collectToolboxCategoryNames((toolbox as { contents: ToolboxItem[] }).contents);

    expect(categories).toEqual([
      "Motion",
      "Sensor",
      "Event",
      "Loop",
      "Logic",
      "Math",
      "Variable",
      "AI",
      "Patrol line",
      "My Blocks",
      "C Code",
    ]);
    expect(categories).not.toContain("Hardware");
    expect(categories).not.toContain("Light Speaker");
  });

  it("matches WhalesBot Motion toolbox order and visible block text", () => {
    const workspace = new Blockly.Workspace();
    const motionCategory = findToolboxCategory((toolbox as { contents: ToolboxItem[] }).contents, "Motion");
    const motionTypes = (motionCategory.contents ?? [])
      .filter((item) => item.kind === "block")
      .map((item) => item.type);
    const registryMotionTypes = WHALESBOT_BLOCK_REGISTRY
      .filter((entry) => entry.category === "Motion")
      .map((entry) => entry.type);

    expect(motionTypes).toEqual([...EXPECTED_MOTION_TOOLBOX_TYPES]);
    expect(motionTypes).toEqual(registryMotionTypes);

    const toolboxBlocksByType = new Map(
      (motionCategory.contents ?? [])
        .filter((item) => item.kind === "block" && item.type)
        .map((item) => [item.type, item]),
    );
    expect(shadowNumber(toolboxBlocksByType.get("motion_tank_drive_continuous")!, "power")).toBe(40);
    expect(shadowNumber(toolboxBlocksByType.get("motion_tank_drive_seconds")!, "seconds")).toBe(1);
    expect(shadowNumber(toolboxBlocksByType.get("motion_dual_motor_degrees")!, "degrees")).toBe(360);
    expect(shadowNumber(toolboxBlocksByType.get("motion_omni_move")!, "headingDegrees")).toBe(0);
    expect(shadowNumber(toolboxBlocksByType.get("motion_steering_angle_mode")!, "angle")).toBe(0);

    for (const type of EXPECTED_MOTION_TOOLBOX_TYPES) {
      const block = workspace.newBlock(type);
      expect(visibleBlockText(block), type).toBe(EXPECTED_MOTION_BLOCK_TEXT[type]);
    }
  });

  it("matches WhalesBot Motion dropdown field shapes", () => {
    const workspace = new Blockly.Workspace();

    const drive = workspace.newBlock("motion_tank_drive_continuous");
    expect(dropdownValues(drive.getField("leftMotor"))).toEqual(["A", "B", "C", "D"]);
    expect(dropdownValues(drive.getField("rightMotor"))).toEqual(["A", "B", "C", "D"]);

    const stopMotor = workspace.newBlock("motion_stop_motor");
    expect(dropdownValues(stopMotor.getField("motor"))).toEqual(["all", "A", "B", "C", "D"]);

    const steeringAngle = workspace.newBlock("motion_steering_angle_mode");
    const steeringRotation = workspace.newBlock("motion_steering_rotation_mode");
    expect(dropdownValues(steeringAngle.getField("id"))).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    expect(dropdownValues(steeringRotation.getField("id"))).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
  });

  it("uses connectable number inputs and dropdown fields for Motion, Sensor, Event, and Loop", () => {
    const workspace = new Blockly.Workspace();
    const auditedCategories = new Set(["Motion", "Sensor", "Event", "Loop"]);

    for (const entry of WHALESBOT_BLOCK_REGISTRY.filter((candidate) => auditedCategories.has(candidate.category))) {
      const block = workspace.newBlock(entry.type);

      for (const schema of entry.fields) {
        if (schema.kind !== "number" && schema.kind !== "dropdown") continue;

        if (schema.kind === "number") {
          expect(block.getField(schema.name), `${entry.type}.${schema.name}`).toBeNull();
          expect(block.getInput(schema.name)?.connection?.getCheck(), `${entry.type}.${schema.name}`).toEqual(["Number"]);
        } else {
          const field = block.getField(schema.name);
          expect(field, `${entry.type}.${schema.name}`).not.toBeNull();
          expect(field, `${entry.type}.${schema.name}`).toBeInstanceOf(Blockly.FieldDropdown);
        }
      }
    }
  });

  it("marks numeric Blockly fields as pill inputs and dropdown fields as rectangular", () => {
    class FieldNumber {
      constructor(private readonly root: SVGGElement) {}
      getSvgRoot(): SVGGElement {
        return this.root;
      }
    }

    class FieldDropdown {
      constructor(private readonly root: SVGGElement) {}
      getSvgRoot(): SVGGElement {
        return this.root;
      }
    }

    const numberField = makeSvgFieldRoot();
    applyWhalesBotFieldShapeClass(new FieldNumber(numberField.root));
    expect(numberField.root.classList.contains(WHALESBOT_NUMBER_FIELD_CLASS)).toBe(true);
    expect(numberField.rect.getAttribute("rx")).toBe("8");
    expect(numberField.rect.getAttribute("ry")).toBe("8");

    const dropdownField = makeSvgFieldRoot();
    applyWhalesBotFieldShapeClass(new FieldDropdown(dropdownField.root));
    expect(dropdownField.root.classList.contains(WHALESBOT_DROPDOWN_FIELD_CLASS)).toBe(true);
    expect(dropdownField.rect.getAttribute("rx")).toBe("4");
    expect(dropdownField.rect.getAttribute("ry")).toBe("4");
  });

  it("matches WhalesBot Sensor toolbox order and visible block text", () => {
    const workspace = new Blockly.Workspace();
    const sensorCategory = findToolboxCategory((toolbox as { contents: ToolboxItem[] }).contents, "Sensor");
    const sensorTypes = (sensorCategory.contents ?? [])
      .filter((item) => item.kind === "block")
      .map((item) => item.type);
    const registrySensorTypes = WHALESBOT_BLOCK_REGISTRY
      .filter((entry) => entry.category === "Sensor")
      .map((entry) => entry.type);

    expect(sensorTypes).toEqual([...EXPECTED_SENSOR_TOOLBOX_TYPES]);
    expect(sensorTypes).toEqual(registrySensorTypes);

    for (const type of EXPECTED_SENSOR_TOOLBOX_TYPES) {
      const block = workspace.newBlock(type);
      expect(visibleBlockText(block), type).toBe(EXPECTED_SENSOR_BLOCK_TEXT[type]);
    }
  });

  it("matches WhalesBot Sensor dropdown and output shapes", () => {
    const workspace = new Blockly.Workspace();

    const integratedBlack = workspace.newBlock("sensor_integrated_grayscale_detect_black");
    expect(integratedBlack.outputConnection?.getCheck()).toEqual(["Boolean"]);
    expect(integratedBlack.getFieldValue("port")).toBe("5");
    expect(dropdownValues(integratedBlack.getField("channel"))).toEqual(["1", "2", "3", "4", "5"]);
    expect(dropdownValues(integratedBlack.getField("color"))).toEqual(["black", "white"]);

    const range = workspace.newBlock("sensor_infrared_range_value");
    expect(range.outputConnection?.getCheck()).toEqual(["Number"]);
    expect(dropdownValues(range.getField("port"))).toEqual(["1", "2", "3", "4", "5"]);

    const remote = workspace.newBlock("sensor_remote_control_button");
    expect(remote.outputConnection).not.toBeNull();
    expect(remote.getField("button")).toBeNull();

    const resetEncoder = workspace.newBlock("sensor_reset_motor_encoder");
    expect(resetEncoder.outputConnection).toBeNull();
    expect(resetEncoder.previousConnection).not.toBeNull();
    expect(resetEncoder.nextConnection).not.toBeNull();

    const colorDetected = workspace.newBlock("sensor_color_detected");
    expect(colorDetected.outputConnection?.getCheck()).toEqual(["Boolean"]);
    expect(dropdownValues(colorDetected.getField("color"))).toEqual(["red", "green", "blue", "yellow", "white", "black"]);
  });

  it("matches WhalesBot Loop toolbox order and visible block text", () => {
    const workspace = new Blockly.Workspace();
    const loopCategory = findToolboxCategory((toolbox as { contents: ToolboxItem[] }).contents, "Loop");
    const loopTypes = (loopCategory.contents ?? [])
      .filter((item) => item.kind === "block")
      .map((item) => item.type);
    const registryLoopTypes = WHALESBOT_BLOCK_REGISTRY
      .filter((entry) => entry.category === "Loop")
      .map((entry) => entry.type);

    expect(loopTypes).toEqual([...EXPECTED_LOOP_TOOLBOX_TYPES]);
    expect(loopTypes).toEqual(registryLoopTypes);

    const toolboxBlocksByType = new Map(
      (loopCategory.contents ?? [])
        .filter((item) => item.kind === "block" && item.type)
        .map((item) => [item.type, item]),
    );
    expect(shadowNumber(toolboxBlocksByType.get("loop_repeat_times")!, "times")).toBe(10);
    expect(shadowNumber(toolboxBlocksByType.get("loop_wait_seconds")!, "seconds")).toBe(2);

    for (const type of EXPECTED_LOOP_TOOLBOX_TYPES) {
      const block = workspace.newBlock(type);
      expect(visibleBlockText(block), type).toBe(EXPECTED_LOOP_BLOCK_TEXT[type]);
    }
  });

  it("matches WhalesBot Loop statement and input shapes", () => {
    const workspace = new Blockly.Workspace();

    for (const type of ["loop_repeat_forever", "loop_repeat_times", "loop_while_condition", "loop_repeat_until"]) {
      const block = workspace.newBlock(type);
      expect(block.previousConnection, type).not.toBeNull();
      expect(block.nextConnection, type).not.toBeNull();
      expect(block.getInput("do")?.connection, type).not.toBeNull();
    }

    const repeatTimes = workspace.newBlock("loop_repeat_times");
    expect(repeatTimes.getInput("times")?.connection?.getCheck()).toEqual(["Number"]);

    const whileLoop = workspace.newBlock("loop_while_condition");
    expect(whileLoop.getInput("condition")?.connection?.getCheck()).toEqual(["Boolean"]);

    const returnBlock = workspace.newBlock("loop_return_value");
    expect(returnBlock.getInput("value")?.connection).not.toBeNull();
    expect(returnBlock.outputConnection).toBeNull();

    const waitSeconds = workspace.newBlock("loop_wait_seconds");
    expect(waitSeconds.getInput("seconds")?.connection?.getCheck()).toEqual(["Number"]);

    const waitUntil = workspace.newBlock("loop_wait_until");
    expect(waitUntil.getInput("condition")?.connection?.getCheck()).toEqual(["Boolean"]);
  });

  it("matches WhalesBot Logic toolbox order and visible block text", () => {
    const workspace = new Blockly.Workspace();
    const logicCategory = findToolboxCategory((toolbox as { contents: ToolboxItem[] }).contents, "Logic");
    const logicTypes = (logicCategory.contents ?? [])
      .filter((item) => item.kind === "block")
      .map((item) => item.type);
    const registryLogicTypes = WHALESBOT_BLOCK_REGISTRY
      .filter((entry) => entry.category === "Logic")
      .map((entry) => entry.type);

    expect(logicTypes).toEqual([...EXPECTED_LOGIC_TOOLBOX_TYPES]);
    expect(logicTypes).toEqual(registryLogicTypes);

    for (const toolboxBlock of logicCategory.contents ?? []) {
      if (toolboxBlock.kind !== "block") continue;
      expect(toolboxBlock.inputs, toolboxBlock.type).toBeUndefined();
    }

    for (const type of EXPECTED_LOGIC_TOOLBOX_TYPES) {
      const block = workspace.newBlock(type);
      expect(visibleBlockText(block), type).toBe(EXPECTED_LOGIC_BLOCK_TEXT[type]);
    }
  });

  it("matches WhalesBot Logic statement and boolean input shapes", () => {
    const workspace = new Blockly.Workspace();

    const ifThen = workspace.newBlock("logic_if_then");
    expect(ifThen.previousConnection).not.toBeNull();
    expect(ifThen.nextConnection).not.toBeNull();
    expect(ifThen.getInput("condition")?.connection?.getCheck()).toEqual(["Boolean"]);
    expect(ifThen.getInput("then")?.connection).not.toBeNull();

    const ifThenElse = workspace.newBlock("logic_if_then_else");
    expect(ifThenElse.previousConnection).not.toBeNull();
    expect(ifThenElse.nextConnection).not.toBeNull();
    expect(ifThenElse.getInput("condition")?.connection?.getCheck()).toEqual(["Boolean"]);
    expect(ifThenElse.getInput("then")?.connection).not.toBeNull();
    expect(ifThenElse.getInput("else")?.connection).not.toBeNull();

    for (const type of ["logic_compare_lt", "logic_compare_gt", "logic_compare_eq", "logic_compare_neq"]) {
      const block = workspace.newBlock(type);
      expect(block.outputConnection?.getCheck(), type).toEqual(["Boolean"]);
      expect(block.previousConnection, type).toBeNull();
      expect(block.nextConnection, type).toBeNull();
      expect(block.getInput("a")?.connection?.getCheck(), type).toEqual(["Number"]);
      expect(block.getInput("b")?.connection?.getCheck(), type).toEqual(["Number"]);
    }

    for (const type of ["logic_and", "logic_or"]) {
      const block = workspace.newBlock(type);
      expect(block.outputConnection?.getCheck(), type).toEqual(["Boolean"]);
      expect(block.getInput("cond1")?.connection?.getCheck(), type).toEqual(["Boolean"]);
      expect(block.getInput("cond2")?.connection?.getCheck(), type).toEqual(["Boolean"]);
    }

    const notBlock = workspace.newBlock("logic_not");
    expect(notBlock.outputConnection?.getCheck()).toEqual(["Boolean"]);
    expect(notBlock.getInput("condition")?.connection?.getCheck()).toEqual(["Boolean"]);
  });

  it("matches WhalesBot Math toolbox order, visible block text, and colour", () => {
    const workspace = new Blockly.Workspace();
    const mathCategory = findToolboxCategory((toolbox as { contents: ToolboxItem[] }).contents, "Math");
    const mathTypes = (mathCategory.contents ?? [])
      .filter((item) => item.kind === "block")
      .map((item) => item.type);
    const registryMathTypes = WHALESBOT_BLOCK_REGISTRY
      .filter((entry) => entry.category === "Math")
      .map((entry) => entry.type);

    expect(mathCategory.colour).toBe(MATH_BLOCK_COLOUR);
    expect(mathTypes).toEqual([...EXPECTED_MATH_TOOLBOX_TYPES]);
    expect(mathTypes).toEqual(registryMathTypes);

    const toolboxBlocksByType = new Map(
      (mathCategory.contents ?? [])
        .filter((item) => item.kind === "block" && item.type)
        .map((item) => [item.type, item]),
    );
    expect(shadowNumber(toolboxBlocksByType.get("math_add")!, "left")).toBe(10);
    expect(shadowNumber(toolboxBlocksByType.get("math_add")!, "right")).toBe(10);
    expect(shadowNumber(toolboxBlocksByType.get("math_divide")!, "right")).toBe(10);
    expect(shadowNumber(toolboxBlocksByType.get("math_random_range")!, "min")).toBe(0);
    expect(shadowNumber(toolboxBlocksByType.get("math_random_range")!, "max")).toBe(10);
    expect(toolboxBlocksByType.get("math_modulo")?.inputs).toBeUndefined();
    expect(toolboxBlocksByType.get("math_round")?.inputs).toBeUndefined();
    expect(toolboxBlocksByType.get("math_unary_function")?.inputs).toBeUndefined();

    for (const type of EXPECTED_MATH_TOOLBOX_TYPES) {
      const block = workspace.newBlock(type);
      expect(visibleBlockText(block), type).toBe(EXPECTED_MATH_BLOCK_TEXT[type]);
      expect(block.outputConnection?.getCheck(), type).toEqual(["Number"]);
      expect(block.previousConnection, type).toBeNull();
      expect(block.nextConnection, type).toBeNull();
      expect(block.getColour().toLowerCase(), type).toBe(MATH_BLOCK_COLOUR.toLowerCase());
    }
  });

  it("matches WhalesBot Math reporter input shapes", () => {
    const workspace = new Blockly.Workspace();

    for (const type of ["math_add", "math_subtract", "math_multiply", "math_divide"]) {
      const block = workspace.newBlock(type);
      expect(block.getInput("left")?.connection?.getCheck(), `${type}.left`).toEqual(["Number"]);
      expect(block.getInput("right")?.connection?.getCheck(), `${type}.right`).toEqual(["Number"]);
    }

    const random = workspace.newBlock("math_random_range");
    expect(random.getInput("min")?.connection?.getCheck()).toEqual(["Number"]);
    expect(random.getInput("max")?.connection?.getCheck()).toEqual(["Number"]);

    const modulo = workspace.newBlock("math_modulo");
    expect(modulo.getInput("a")?.connection?.getCheck()).toEqual(["Number"]);
    expect(modulo.getInput("b")?.connection?.getCheck()).toEqual(["Number"]);

    const round = workspace.newBlock("math_round");
    expect(round.getInput("value")?.connection?.getCheck()).toEqual(["Number"]);

    const unary = workspace.newBlock("math_unary_function");
    expect(dropdownValues(unary.getField("op"))).toEqual([
      "abs",
      "floor",
      "ceiling",
      "sqrt",
      "sin",
      "cos",
      "tan",
      "asin",
      "acos",
      "atan",
      "ln",
      "log",
      "e^",
      "10^",
    ]);
    expect(unary.getInput("value")?.connection?.getCheck()).toEqual(["Number"]);
    expect(unary.getField("angleUnit")).toBeNull();
  });

  it("matches WhalesBot Variable dynamic toolbox behavior", () => {
    const variableCategory = findToolboxCategory((toolbox as { contents: ToolboxItem[] }).contents, "Variable");

    expect(variableCategory.colour).toBe(VARIABLE_CATEGORY_COLOUR);
    expect(variableCategory.custom).toBe(VARIABLE_CATEGORY_CALLBACK_KEY);
    expect(variableCategory.contents).toBeUndefined();

    const emptyWorkspace = new Blockly.Workspace();
    const initialFlyout = variableToolboxFlyout(emptyWorkspace) as Element[];
    expect(initialFlyout).toHaveLength(1);
    expect(initialFlyout[0].tagName.toLowerCase()).toBe("button");
    expect(initialFlyout[0].getAttribute("text")).toBe("Create a variable");
    expect(initialFlyout[0].getAttribute("callbackKey")).toBe("CREATE_VARIABLE");

    const workspace = new Blockly.Workspace();
    workspace.createVariable("number", "Number", "var-number");
    const flyout = variableToolboxFlyout(workspace) as Element[];
    const blocks = flyout.filter((item) => item.tagName.toLowerCase() === "block");

    expect(flyout[0].getAttribute("text")).toBe("Create a variable");
    expect(blocks.map((item) => item.getAttribute("type"))).toEqual([...EXPECTED_VARIABLE_TOOLBOX_TYPES]);
    for (const item of blocks) {
      expect(item.querySelector('field[name="VAR"]')?.getAttribute("id")).toBe("var-number");
    }
    expect(blocks.find((item) => item.getAttribute("type") === "set_var_v2")?.querySelector('shadow[type="value_number"] field[name="NUM"]')?.textContent).toBe("0");
    expect(blocks.find((item) => item.getAttribute("type") === "change_var_v2")?.querySelector('shadow[type="value_number"] field[name="NUM"]')?.textContent).toBe("1");
  });

  it("matches WhalesBot Variable block text and input shapes", () => {
    const workspace = new Blockly.Workspace();
    workspace.createVariable("number", "Number", "var-number");

    for (const type of EXPECTED_VARIABLE_TOOLBOX_TYPES) {
      const block = workspace.newBlock(type);
      block.setFieldValue("var-number", "VAR");
      expect(visibleBlockText(block), type).toBe(EXPECTED_VARIABLE_BLOCK_TEXT[type]);
      expect(block.getColour().toLowerCase(), type).toBe(VARIABLE_CATEGORY_COLOUR.toLowerCase());
    }

    const reporter = workspace.newBlock("value_variable");
    reporter.setFieldValue("var-number", "VAR");
    expect(reporter.outputConnection?.getCheck()).toEqual(["Number"]);
    expect(reporter.previousConnection).toBeNull();
    expect(reporter.nextConnection).toBeNull();

    const set = workspace.newBlock("set_var_v2");
    set.setFieldValue("var-number", "VAR");
    expect(set.outputConnection).toBeNull();
    expect(set.previousConnection).not.toBeNull();
    expect(set.nextConnection).not.toBeNull();
    expect(set.getInput("VALUE")?.connection?.getCheck()).toEqual(["Number"]);

    const change = workspace.newBlock("change_var_v2");
    change.setFieldValue("var-number", "VAR");
    expect(change.outputConnection).toBeNull();
    expect(change.previousConnection).not.toBeNull();
    expect(change.nextConnection).not.toBeNull();
    expect(change.getInput("DELTA")?.connection?.getCheck()).toEqual(["Number"]);
  });

  it("keeps toolbox input and field names aligned with block definitions", () => {
    const workspace = new Blockly.Workspace();
    const toolboxBlocks = collectToolboxBlocks((toolbox as { contents: ToolboxItem[] }).contents);

    for (const toolboxBlock of toolboxBlocks) {
      if (!toolboxBlock.type) continue;
      const block = workspace.newBlock(toolboxBlock.type);

      for (const inputName of Object.keys(toolboxBlock.inputs ?? {})) {
        const input = block.getInput(inputName);
        expect(input, `${toolboxBlock.type}.${inputName}`).not.toBeNull();
        expect(input?.connection, `${toolboxBlock.type}.${inputName}`).not.toBeNull();
      }

      for (const fieldName of Object.keys(toolboxBlock.fields ?? {})) {
        expect(block.getField(fieldName), `${toolboxBlock.type}.${fieldName}`).not.toBeNull();
      }
    }
  });

  it("preserves variable ids and custom-block definitions through save/load/regenerate", () => {
    const workspace = makeWorkspace();
    const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
    const ir = workspaceToIR(workspace);

    saveProject("c013", xml, ir, "default");
    const loaded = loadProject("c013");
    expect(loaded).not.toBeNull();

    const reloadedWorkspace = new Blockly.Workspace();
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(loaded!.workspaceXml), reloadedWorkspace);
    const regenerated = workspaceToIR(reloadedWorkspace);

    expect(regenerated.version).toBe(2);
    if (regenerated.version !== 2 || ir.version !== 2) throw new Error("Expected v2 IR");
    expect(regenerated.variables?.map((variable) => [variable.id, variable.name])).toEqual([["var-speed", "speed"]]);
    expect(regenerated.functions?.map((definition) => definition.name)).toEqual(["double"]);
    expect(regenerated.functions?.[0]?.params[0]).toMatchObject({ name: "x", valueType: "Number" });
    expect(regenerated.nodes.map((node) => node.kind === "command" ? node.op : node.diagnostic.code)).toEqual(
      ir.nodes.map((node) => node.kind === "command" ? node.op : node.diagnostic.code),
    );
  });

  it("round-trips a mixed-category workspace and preserves runtime diagnostics", () => {
    const workspace = makeMixedCategoryWorkspace();
    const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
    const ir = workspaceToIR(workspace);

    saveProject("c015-mixed", xml, ir, "default");
    const loaded = loadProject("c015-mixed");
    expect(loaded).not.toBeNull();

    const reloadedWorkspace = new Blockly.Workspace();
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(loaded!.workspaceXml), reloadedWorkspace);
    const regenerated = workspaceToIR(reloadedWorkspace);

    expect(regenerated.version).toBe(2);
    if (regenerated.version !== 2) throw new Error("Expected v2 IR");

    const xmlAfterReload = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(reloadedWorkspace));
    for (const type of [
      "event_program_execute",
      "initialize",
      "motion_set_motors_v2",
      "light_led_swatch",
      "sensor_integrated_grayscale_detect_black",
      "loop_repeat_times",
      "logic_if_then",
      "math_add",
      "set_var_v2",
      "ai_recognition_is",
      "patrol_line_for_time",
      "my_block_definition",
      "c_code_function",
    ]) {
      expect(xmlAfterReload).toContain(`type="${type}"`);
    }

    const sim = createSimulation({
      map: createTestMap(2400, 1200, 1),
      robotConfig: { ...DEFAULT_ROBOT_CONFIG, sensorNoise: 0 },
      seed: 42,
    });
    const interpreter = createInterpreter(regenerated as any, sim, {
      cSandbox: { enabled: false },
      maxTicks: 300,
      maxLoopIterations: 20,
    });

    for (let i = 0; i < 120 && !interpreter.done; i++) {
      interpreter.step();
      sim.tick();
    }

    const events = sim.state.runtime.events;
    expect(events.some((event) => event.kind === "effect" && event.op === "effect.setLedColor")).toBe(true);

    const diagnosticCodes = new Set(
      events
        .filter((event) => event.kind === "diagnostic")
        .map((event) => event.code),
    );
    expect(diagnosticCodes.has("HTLAB_C_SANDBOX_DISABLED")).toBe(true);
    expect(diagnosticCodes.has("HTLAB_READING1_STUB")).toBe(true);
    expect(diagnosticCodes.has("HTLAB_UNSUPPORTED_BLOCK")).toBe(true);
  });

  it("loads every bundled sample and regenerates IR", () => {
    for (const sample of SAMPLE_PROGRAMS) {
      const workspace = new Blockly.Workspace();
      Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(sample.xml), workspace);
      const program = workspaceToIR(workspace);
      expect(program.commands.length).toBeGreaterThan(0);
    }
  });
});
