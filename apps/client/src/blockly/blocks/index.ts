// Side-effect imports: register all custom Blockly blocks
import "./shared.js";
import "./legacy.js";
import "./values.js";
import "./logic.js";
import "./myBlocks.js";
import "./sensors.js";
import "./motion.js";
import "./patrol.js";
import "./cCode.js";
import "./fallback.js";

// Public API re-exports
export {
  setVariableMenuHandlers,
  getVariableMenuOptions,
} from "./shared.js";

export {
  MY_BLOCKS_FLYOUT_KEY,
  buildMyBlocksFlyout,
  MY_BLOCK_DEF_REGISTRY,
  randomSuffix,
} from "./myBlocks.js";

export type { MyBlockParam as MyBlockParamType, MyBlockType } from "./myBlocks.js";
export type { MyBlockParam } from "./myBlocks.js";
