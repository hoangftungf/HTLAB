// Re-export barrel: import this file for side effects (block registration)
// and for the public API symbols.
import "./blocks/index.js";

export {
  setVariableMenuHandlers,
  getVariableMenuOptions,
  MY_BLOCKS_FLYOUT_KEY,
  buildMyBlocksFlyout,
  MY_BLOCK_DEF_REGISTRY,
  randomSuffix,
} from "./blocks/index.js";

export type { MyBlockParamType, MyBlockType, MyBlockParam } from "./blocks/index.js";
