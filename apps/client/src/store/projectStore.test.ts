// @vitest-environment jsdom

import * as Blockly from "blockly";
import {
  createInterpreter,
  createSimulation,
  createTestMap,
  DEFAULT_ROBOT_CONFIG,
} from "@htlab/simulation-core";
import "../blockly/blocks.js";
import { WHALESBOT_BLOCK_REGISTRY } from "../blockly/blockRegistry.js";
import { toolbox } from "../blockly/toolbox.js";
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
  type?: string;
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
  motion_tank_drive_continuous: "move left motor A right motor B Forward power 40 %",
  motion_tank_drive_seconds: "move left motor A right motor B Forward power 40 % run for 1 secs.",
  motion_stop_pair: "stop left motor A right motor B",
  motion_single_motor_power: "set motor A power 40 %",
  motion_dual_motor_seconds: "set motor A power 40 % motor B power 40 % run for 1 secs.",
  motion_single_motor_seconds: "set motor A power 40 % run for 1 secs.",
  motion_dual_motor_degrees: "set motor A power 40 % motor B power 40 % rotate for 360 degrees",
  motion_single_motor_degrees: "set motor A power 40 % rotate for 360 degrees",
  motion_reverse_motor: "reverse motor A",
  motion_stop_motor: "stop motor all",
  motion_omni_move: "omni-wheel move power 40 % towards 0 degree",
  motion_omni_turn: "omni-wheel turn Turn left power 40 %",
  motion_omni_stop: "stop omni-wheel move",
  motion_steering_angle_mode: "set up steering gear angle mode ID 1 speed 40 angle 0",
  motion_steering_rotation_mode: "set up steering gear rotation mode ID 1 speed 40",
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

function collectToolboxBlocks(items: readonly ToolboxItem[], blocks: ToolboxItem[] = []): ToolboxItem[] {
  for (const item of items) {
    if (item.kind === "block") blocks.push(item);
    if (item.contents) collectToolboxBlocks(item.contents, blocks);
  }
  return blocks;
}

function findToolboxCategory(items: readonly ToolboxItem[], name: string): ToolboxItem {
  const category = items.find((item) => item.kind === "category" && item.name === name);
  if (!category?.contents) {
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
  repeat.setFieldValue("2", "times");
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
  wait.setFieldValue("0", "seconds");
  connectStatement(ifThen, "then", wait);
  connectStatement(repeat, "do", ifThen);
  connectNext(drive, repeat);

  const led = workspace.newBlock("light_led_swatch");
  led.setFieldValue("1", "port");
  led.setFieldValue("#33ffaa", "color");
  connectNext(repeat, led);

  const readingStub = workspace.newBlock("light_reading_1");
  readingStub.setFieldValue("1", "value");
  connectNext(led, readingStub);

  const patrol = workspace.newBlock("patrol_line_for_time");
  patrol.setFieldValue("30", "speed");
  patrol.setFieldValue("0.05", "seconds");
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

  it("renders Math random range as a compact field block", () => {
    const workspace = new Blockly.Workspace();
    const block = workspace.newBlock("math_random_range");

    expect(block.outputConnection).not.toBeNull();
    expect(block.getField("min")).not.toBeNull();
    expect(block.getField("max")).not.toBeNull();
    expect(block.getInput("MIN")).toBeNull();
    expect(block.getInput("MAX")).toBeNull();
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
