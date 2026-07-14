export const BLOCK_CATEGORIES = [
  "Motion",
  "Light Speaker",
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
] as const;

export type BlockCategory = (typeof BLOCK_CATEGORIES)[number];

export type RuntimeStatus =
  | "implemented"
  | "telemetry-only"
  | "stub"
  | "blocked-by-sandbox";

export type BlockKind =
  | "statement"
  | "hat"
  | "c-block"
  | "reporter"
  | "reporter-number"
  | "boolean"
  | "button-dialog"
  | "custom-code";

export type FieldKind =
  | "number"
  | "text"
  | "dropdown"
  | "color"
  | "boolean"
  | "value-input"
  | "boolean-input"
  | "statement-input"
  | "textarea"
  | "matrix";

export interface BlockFieldSchema {
  name: string;
  kind: FieldKind;
  defaultValue: string | number | boolean | null;
  values?: readonly string[];
  unit?: string;
  min?: number;
  max?: number;
  required?: boolean;
}

export interface BlockRegistryEntry {
  type: string;
  category: BlockCategory;
  displayText: string;
  kind: BlockKind;
  fields: readonly BlockFieldSchema[];
  runtimeStatus: RuntimeStatus;
  generatorHandlerId: string;
  runtimeHandlerId: string;
  irV2Op: string;
  notes?: string;
}
