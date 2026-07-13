// @vitest-environment jsdom

import * as Blockly from "blockly";
import {
  createInterpreter,
  createSimulation,
  createTestMap,
  DEFAULT_ROBOT_CONFIG,
} from "@htlab/simulation-core";
import "../blockly/blocks.js";
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
  type?: string;
  inputs?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  contents?: ToolboxItem[];
};

function collectToolboxBlocks(items: readonly ToolboxItem[], blocks: ToolboxItem[] = []): ToolboxItem[] {
  for (const item of items) {
    if (item.kind === "block") blocks.push(item);
    if (item.contents) collectToolboxBlocks(item.contents, blocks);
  }
  return blocks;
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
