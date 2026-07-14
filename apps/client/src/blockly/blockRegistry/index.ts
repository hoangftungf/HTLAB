export { BLOCK_CATEGORIES } from "./types.js";
export type { BlockCategory, RuntimeStatus, BlockKind, FieldKind, BlockFieldSchema, BlockRegistryEntry } from "./types.js";

import type { BlockRegistryEntry } from "./types.js";
import { BLOCK_CATEGORIES } from "./types.js";
import { motionEntries } from "./entries/motion.js";
import { eventEntries } from "./entries/event.js";
import { loopEntries } from "./entries/loop.js";
import { logicEntries } from "./entries/logic.js";
import { mathEntries } from "./entries/math.js";
import { variableEntries } from "./entries/variable.js";
import { myBlocksEntries } from "./entries/myBlocks.js";
import { patrolEntries } from "./entries/patrol.js";
import { lightSpeakerEntries } from "./entries/lightSpeaker.js";
import { sensorEntries } from "./entries/sensor.js";
import { aiEntries } from "./entries/ai.js";
import { cCodeEntries } from "./entries/cCode.js";

export const WHALESBOT_BLOCK_REGISTRY = [
  ...motionEntries,
  ...eventEntries,
  ...loopEntries,
  ...logicEntries,
  ...mathEntries,
  ...variableEntries,
  ...myBlocksEntries,
  ...patrolEntries,
  ...lightSpeakerEntries,
  ...sensorEntries,
  ...aiEntries,
  ...cCodeEntries,
] as const satisfies readonly BlockRegistryEntry[];

export const BLOCK_REGISTRY_BY_TYPE = Object.fromEntries(
  WHALESBOT_BLOCK_REGISTRY.map((block) => [block.type, block]),
) as Record<(typeof WHALESBOT_BLOCK_REGISTRY)[number]["type"], (typeof WHALESBOT_BLOCK_REGISTRY)[number]>;

export const BLOCK_REGISTRY_BY_CATEGORY = BLOCK_CATEGORIES.reduce(
  (acc, category) => {
    acc[category] = WHALESBOT_BLOCK_REGISTRY.filter((block) => block.category === category);
    return acc;
  },
  {} as Record<(typeof BLOCK_CATEGORIES)[number], readonly BlockRegistryEntry[]>,
);

export const DOCUMENTED_BLOCK_COUNT = WHALESBOT_BLOCK_REGISTRY.length;
