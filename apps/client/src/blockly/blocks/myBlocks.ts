import * as Blockly from "blockly";
import { BLOCK_COLOURS } from "./shared.js";

// ---- My Blocks: dynamic mutator definitions (C-018, C-019) ----
// Each parameter is encoded as <parameter name="..." type="..."/> in mutation XML.
// blockType_: "statement" | "reporter" | "boolean" controls call block shape in flyout.

export interface MyBlockParam {
  name: string;
  type: "Number" | "Boolean" | "String" | "Any";
  defaultValue?: string;
}

export type MyBlockType = "statement" | "reporter" | "boolean";

// Key for dynamic My Blocks flyout callback
export const MY_BLOCKS_FLYOUT_KEY = "MY_BLOCKS_FLYOUT";

// Helper to generate a random 4-char suffix like Whalesbot
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

// Registry: definition name → define block id (used by Edit function)
const MY_BLOCK_DEF_REGISTRY = new Map<string, string>();

Blockly.Blocks["my_block_definition"] = {
  init(this: any) {
    this.params_ = [] as MyBlockParam[];
    this.blockType_ = "statement" as MyBlockType;
    this.appendDummyInput("HEADER")
      .appendField("define")
      .appendField(new Blockly.FieldLabel("name_" + randomSuffix()), "NAME"); // read-only label
    this.appendStatementInput("BODY").setCheck(null);
    this.setColour(BLOCK_COLOURS.myBlocks);
    this.setTooltip("Define a custom function");
    this.setHelpUrl("");
    this.hat = "cap";
  },

  mutationToDom(this: any): Element {
    const container = Blockly.utils.xml.createElement("mutation");
    container.setAttribute("name", this.getFieldValue("NAME") ?? "my_block");
    container.setAttribute("blocktype", this.blockType_ ?? "statement");
    for (const p of (this.params_ as MyBlockParam[])) {
      const el = Blockly.utils.xml.createElement("parameter");
      el.setAttribute("name", p.name);
      el.setAttribute("type", p.type);
      if (p.defaultValue !== undefined) el.setAttribute("default", p.defaultValue);
      container.appendChild(el);
    }
    return container;
  },

  domToMutation(this: any, xmlElement: Element): void {
    this.blockType_ = (xmlElement.getAttribute("blocktype") ?? "statement") as MyBlockType;
    const name = xmlElement.getAttribute("name") ?? "my_block";
    const params: MyBlockParam[] = [];
    for (const child of Array.from(xmlElement.getElementsByTagName("parameter"))) {
      params.push({
        name: child.getAttribute("name") || "value",
        type: (child.getAttribute("type") as MyBlockParam["type"]) || "Number",
        defaultValue: child.getAttribute("default") || undefined,
      });
    }
    this.params_ = params;
    this._rebuildInputs(name);
  },

  _rebuildInputs(this: any, nameOpt?: string): void {
    const name: string = nameOpt ?? this.getFieldValue?.("NAME") ?? "my_block";

    if (this.getInput("HEADER")) this.removeInput("HEADER");
    const header = this.appendDummyInput("HEADER");
    if (this.getInput("BODY")) this.moveInputBefore?.("HEADER", "BODY");
    header.appendField("define").appendField(new Blockly.FieldLabel(name), "NAME");
    for (const p of (this.params_ as MyBlockParam[])) {
      header.appendField(" ").appendField(new Blockly.FieldLabel(p.name));
    }
  },

  onchange(this: any): void {
    // no-op: name is now read-only, nothing to sync
  },
};

// Build flyout XML elements for My Blocks dynamic category
export function buildMyBlocksFlyout(workspace: Blockly.WorkspaceSvg): Element[] {
  const mainWorkspace = workspace.isFlyout ? (workspace as any).targetWorkspace ?? workspace : workspace;
  const xmlList: Element[] = [];

  // "Create new blocks" button always first
  const btn = document.createElement("button");
  btn.setAttribute("text", "Create new blocks");
  btn.setAttribute("callbackKey", "CREATE_MY_BLOCK");
  xmlList.push(btn);

  // One call block per definition on workspace
  const defs = mainWorkspace.getAllBlocks(false).filter(
    (b: Blockly.Block) => b.type === "my_block_definition"
  );

  for (const def of defs) {
    const name = def.getFieldValue("NAME") ?? "my_block";
    const params: MyBlockParam[] = (def as any).params_ ?? [];
    const bType: MyBlockType = (def as any).blockType_ ?? "statement";

    const blockXml = Blockly.utils.xml.createElement("block");
    blockXml.setAttribute("type",
      bType === "statement" ? "my_block_call_statement" : "my_block_call_value"
    );

    const mutation = Blockly.utils.xml.createElement("mutation");
    mutation.setAttribute("name", name);
    if (bType !== "statement") {
      mutation.setAttribute("outputtype", bType === "boolean" ? "Boolean" : "Number");
    }
    for (const p of params) {
      const arg = Blockly.utils.xml.createElement("arg");
      arg.setAttribute("name", p.name);
      arg.setAttribute("type", p.type);
      mutation.appendChild(arg);
    }
    blockXml.appendChild(mutation);

    xmlList.push(blockXml);
  }

  return xmlList;
}

function _getCallParams(block: any): MyBlockParam[] {
  const ws: Blockly.Workspace = block.workspace;
  if (!ws) return [];
  const name: string = block.getFieldValue?.("NAME") ?? "";
  const defBlock: any = ws.getAllBlocks(false).find(
    (b: Blockly.Block) => b.type === "my_block_definition" && b.getFieldValue("NAME") === name
  );
  if (defBlock?.params_?.length) return defBlock.params_;
  return [];
}

const _callMixin = {
  init(this: any, isStatement: boolean): void {
    this.args_ = [] as MyBlockParam[];
    this.isStatement_ = isStatement;
    this.outputType_ = "Number";
    const header = this.appendDummyInput("HEADER");
    header.appendField(new Blockly.FieldLabel("my_block"), "NAME");
    this.setColour(BLOCK_COLOURS.myBlocks);
    if (isStatement) {
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
    } else {
      this.setOutput(true, "Number");
    }
    this.setTooltip("Call a custom function");
  },

  mutationToDom(this: any): Element {
    const container = Blockly.utils.xml.createElement("mutation");
    container.setAttribute("name", this.getFieldValue?.("NAME") ?? "my_block");
    if (!(this as any).isStatement_) {
      container.setAttribute("outputtype", (this as any).outputType_ ?? "Number");
    }
    for (const a of (this.args_ as MyBlockParam[])) {
      const el = Blockly.utils.xml.createElement("arg");
      el.setAttribute("name", a.name);
      el.setAttribute("type", a.type);
      container.appendChild(el);
    }
    return container;
  },

  domToMutation(this: any, xmlElement: Element): void {
    const name = xmlElement.getAttribute("name") ?? "my_block";
    if (this.getField("NAME")) {
      this.setFieldValue(name, "NAME");
    }
    if (!(this as any).isStatement_) {
      const ot = xmlElement.getAttribute("outputtype") ?? "Number";
      (this as any).outputType_ = ot;
      this.setOutput(false);
      this.setOutput(true, ot);
    }
    const args: MyBlockParam[] = [];
    for (const child of Array.from(xmlElement.getElementsByTagName("arg"))) {
      args.push({
        name: child.getAttribute("name") || "value",
        type: (child.getAttribute("type") as MyBlockParam["type"]) || "Number",
      });
    }
    this.args_ = args;
    this._rebuildArgInputs();
  },

  _rebuildArgInputs(this: any): void {
    let i = 0;
    while (this.getInput("ARG" + i)) {
      this.removeInput("ARG" + i);
      i++;
    }
    for (let j = 0; j < (this.args_ as MyBlockParam[]).length; j++) {
      const a = (this.args_ as MyBlockParam[])[j];
      this.appendValueInput("ARG" + j)
        .setCheck(a.type === "Boolean" ? "Boolean" : "Number")
        .appendField(a.name);
    }
  },

  _syncWithDef(this: any): void {
    const params = _getCallParams(this);
    const cur: MyBlockParam[] = this.args_ ?? [];
    const same =
      params.length === cur.length &&
      params.every((p, k) => cur[k]?.name === p.name && cur[k]?.type === p.type);
    if (!same) {
      this.args_ = params;
      this._rebuildArgInputs();
    }
  },

  onchange(this: any, event: Blockly.Events.Abstract): void {
    const relevant =
      event.type === Blockly.Events.FINISHED_LOADING ||
      event.type === Blockly.Events.BLOCK_CREATE ||
      event.type === Blockly.Events.BLOCK_CHANGE ||
      event.type === Blockly.Events.BLOCK_MOVE;
    if (relevant) this._syncWithDef();
  },
};

Blockly.Blocks["my_block_call_statement"] = {
  init(this: any) {
    _callMixin.init.call(this, true);
  },
  mutationToDom: _callMixin.mutationToDom,
  domToMutation: _callMixin.domToMutation,
  _rebuildArgInputs: _callMixin._rebuildArgInputs,
  _syncWithDef: _callMixin._syncWithDef,
  onchange: _callMixin.onchange,
};

Blockly.Blocks["my_block_call_value"] = {
  init(this: any) {
    _callMixin.init.call(this, false);
  },
  mutationToDom: _callMixin.mutationToDom,
  domToMutation: _callMixin.domToMutation,
  _rebuildArgInputs: _callMixin._rebuildArgInputs,
  _syncWithDef: _callMixin._syncWithDef,
  onchange: _callMixin.onchange,
};

Blockly.Blocks["my_block_param_value"] = {
  init(this: Blockly.Block) {
    this.jsonInit({
      type: "my_block_param_value",
      message0: "param %1",
      args0: [{ type: "field_input", name: "PARAM", text: "value" }],
      colour: BLOCK_COLOURS.myBlocks,
      output: "Number",
      tooltip: "Read the current function parameter",
    });
  },
};

// Export for use in BlocklyEditor
export { MY_BLOCK_DEF_REGISTRY, randomSuffix };
export type { MyBlockParam as MyBlockParamType };






