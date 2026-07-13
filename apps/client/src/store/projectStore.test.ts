// @vitest-environment jsdom

import * as Blockly from "blockly";
import "../blockly/blocks.js";
import { workspaceToIR } from "../blockly/generator.js";
import { loadProject, saveProject } from "./projectStore.js";

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

describe("projectStore C-013 save/load compatibility", () => {
  beforeEach(() => {
    localStorage.clear();
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
});
