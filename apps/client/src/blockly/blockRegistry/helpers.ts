import type { BlockFieldSchema, BlockRegistryEntry, FieldKind } from "./types.js";

export function field(
  name: string,
  kind: FieldKind,
  defaultValue: string | number | boolean | null,
  options: Partial<Omit<BlockFieldSchema, "name" | "kind" | "defaultValue">> = {},
): BlockFieldSchema {
  return { name, kind, defaultValue, ...options };
}

export function entry(e: BlockRegistryEntry): BlockRegistryEntry {
  return e;
}

export const noFields: readonly BlockFieldSchema[] = [];
