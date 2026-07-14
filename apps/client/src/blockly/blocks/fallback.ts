import * as Blockly from "blockly";
import { BLOCK_COLOURS, numberInput } from "./shared.js";
import { WHALESBOT_BLOCK_REGISTRY, type BlockCategory, type BlockFieldSchema, type BlockRegistryEntry } from "../blockRegistry.js";

// Registry-backed compatibility blocks not yet hand-authored above.
const CATEGORY_COLOURS: Record<BlockCategory, string> = {
  Motion: BLOCK_COLOURS.movement,
  "Light Speaker": BLOCK_COLOURS.lightSpeaker,
  Sensor: BLOCK_COLOURS.sensor,
  Event: BLOCK_COLOURS.event,
  Loop: BLOCK_COLOURS.loop,
  Logic: BLOCK_COLOURS.logic,
  Math: BLOCK_COLOURS.values,
  Variable: BLOCK_COLOURS.variables,
  AI: BLOCK_COLOURS.ai,
  "Patrol line": BLOCK_COLOURS.patrolLine,
  "My Blocks": BLOCK_COLOURS.myBlocks,
  "C Code": BLOCK_COLOURS.cCode,
};

function fallbackFieldArg(field: BlockFieldSchema): Record<string, unknown> {
  switch (field.kind) {
    case "number":
      return numberInput(field.name);
    case "text":
      return { type: "field_input", name: field.name, text: String(field.defaultValue ?? "") };
    case "dropdown":
      return {
        type: "field_dropdown",
        name: field.name,
        options: (field.values ?? []).map((value) => [value, value]),
      };
    case "color":
      return { type: "field_input", name: field.name, text: String(field.defaultValue ?? "#ffffff") };
    case "boolean":
      return { type: "field_checkbox", name: field.name, checked: Boolean(field.defaultValue) };
    case "value-input":
      return { type: "input_value", name: field.name };
    case "boolean-input":
      return { type: "input_value", name: field.name, check: "Boolean" };
    case "statement-input":
      return { type: "input_statement", name: field.name };
    case "textarea":
      return { type: "field_input", name: field.name, text: String(field.defaultValue ?? "") };
    case "matrix":
      return { type: "field_input", name: field.name, text: "00000/00000/00000/00000/00000" };
  }
}

function fallbackMessage(entry: BlockRegistryEntry): string {
  const fieldLabels = entry.fields.map((field, index) => `${field.name} %${index + 1}`);
  return [entry.displayText, ...fieldLabels].join(" ");
}

function registerRegistryFallbackBlock(entry: BlockRegistryEntry): void {
  if (Blockly.Blocks[entry.type]) return;

  Blockly.Blocks[entry.type] = {
    init(this: Blockly.Block) {
      const config: Record<string, unknown> = {
        type: entry.type,
        message0: fallbackMessage(entry),
        args0: entry.fields.map(fallbackFieldArg),
        colour: CATEGORY_COLOURS[entry.category],
        tooltip: entry.notes ?? entry.displayText,
      };

      if (entry.kind === "boolean") {
        config.output = "Boolean";
      } else if (entry.kind === "reporter-number") {
        config.output = "Number";
      } else if (entry.kind === "reporter") {
        config.output = null;
      } else if (entry.kind === "hat") {
        config.nextStatement = null;
      } else {
        config.previousStatement = null;
        config.nextStatement = null;
      }

      this.jsonInit(config);
      if (entry.kind === "hat") {
        this.hat = "cap";
      }
    },
  };
}

WHALESBOT_BLOCK_REGISTRY.forEach(registerRegistryFallbackBlock);
