/**
 * HTLAB SimulationCore — điểm vào API public.
 * Không có phụ thuộc runtime. Chạy trên browser (ESM) và Node.js.
 *
 * @module @htlab/simulation-core
 */

export { createSimulation } from "./sim.js";
export { createReplay } from "./replay.js";
export { loadMap, createTestMap } from "./map.js";
export { computeKinematics } from "./kinematics.js";
export { createRNG } from "./rng.js";
export { createGrayscaleSensor } from "./sensor/index.js";
export { createInterpreter } from "./interpreter/index.js";
export { diffTelemetry } from "./telemetry/index.js";
export { DEFAULT_ROBOT_CONFIG } from "./types.js";

export type {
  GrayscaleSensor,
  GrayscaleSensorConfig,
} from "./sensor/index.js";

export type {
  ReplaySimulation,
  TelemetryDiff,
  TelemetryConfig,
} from "./telemetry/index.js";

export {
  OpCode,
  CompareOp,
} from "./interpreter/index.js";

export type {
  Interpreter,
  InterpreterConfig,
  IRCommand,
  IRProgram,
} from "./interpreter/index.js";

export type {
  SimulationConfig,
  Simulation,
  RobotConfig,
  RobotState,
  SensorState,
  SimState,
  MapData,
  MapMetadata,
  TelemetryFrame,
  WheelVelocities,
  Pose,
} from "./types.js";
