# Stage 05 — Interface Contract (the seam)

The contract is whatever sits between your core and its consumer. For HTLAB MVP, there is NO backend API — the contract is the **SimulationCore public API** (consumed by PixiJS renderer + Interpreter) and the **IR schema** (produced by Blockly codegen, consumed by Interpreter).

Written BEFORE any code. Build cards build TO this contract; renderer cards consume FROM it.

## Gate — check ALL before `/flow next`
- [x] Every PRD feature maps to at least one INTERFACE below (SimulationCore API · IR command · React component prop)
- [x] Every interface has its INPUT and OUTPUT shapes written
- [x] Access/Effects column filled for every interface
- [x] No FILL placeholders remain in this file

## Interfaces — SimulationCore public API

These are the functions that the React UI, PixiJS renderer, and Interpreter call. SimulationCore has NO knowledge of React, PixiJS, or Blockly — it only exposes this API.

| Method/Interface | Path/Name | Access/Effects | Input shape | Output shape |
|---|---|---|---|---|
| Factory | `createSimulation(config)` | none (pure create) | `SimulationConfig { map: MapData, robot: RobotConfig, seed?: number }` | `Simulation { state: SimState, tick(): void, reset(): void, getTelemetry(): TelemetryFrame[] }` |
| Method | `sim.tick()` | mutates sim state (advance 1/60s) | none (reads current motor commands + map pixels) | void (updates `sim.state` in-place) |
| Property | `sim.state` | read-only state snapshot | — (property access) | `SimState { robot: RobotState, sensors: SensorState, tick: number, running: boolean }` |
| Method | `sim.setMotors(left: number, right: number)` | sets motor targets for next tick | `left: -1.0..1.0, right: -1.0..1.0` (normalized speed) | void |
| Method | `sim.reset()` | resets to initial state | none (uses original config + seed) | void |
| Method | `sim.getTelemetry()` | read-only, no side effects | none | `TelemetryFrame[]` (array of per-tick snapshots) |

## Interfaces — IR (Intermediate Representation) Schema

Blockly code generator produces this JSON; Interpreter consumes it. The schema is the contract between the Blockly editor and the simulation engine.

| Method/Interface | Path/Name | Access/Effects | Input shape | Output shape |
|---|---|---|---|---|
| IR Program | `IRProgram` | Blockly output → interpreter input | `{ commands: IRCommand[], version: 1 }` | consumed by `Interpreter.run(program, sim)` |
| IR Command | `IRCommand` | atomic instruction | `{ op: OpCode, args: number[], label?: string }` | executed by interpreter each tick |
| Interpreter | `createInterpreter(program, sim)` | mutates sim via setMotors, reads sim.state.sensors | `program: IRProgram, sim: Simulation` | `Interpreter { step(): boolean, reset(): void, done: boolean }` |
| Interpreter | `interp.step()` | executes N instructions this tick (capped at 1000) | none | `boolean` (true = more instructions remain, false = program ended) |

### OpCode enum (IR command set for MVP)

```
INIT_HARDWARE     = 0   // tham số: không có — đặt lại robot về tư thế xuất phát
CALIBRATE_GRAYSCALE = 1 // tham số: không có — lấy mẫu trắng/đen, tính ngưỡng
SET_MOTOR         = 2   // tham số: [leftSpeed, rightSpeed] — đã chuẩn hóa -1..1
WAIT_TICKS        = 3   // tham số: [ticks] — tạm dừng thực thi N tick (motor vẫn chạy)
READ_SENSOR_ROAD  = 4   // tham số: [roadIndex: 1-5] — lưu giá trị vào thanh ghi ACC
READ_SENSOR_GROUP = 5   // tham số: [group: 0=trái,1=giữa,2=phải] — lưu boolean phát hiện
READ_LINE_POSITION = 6  // tham số: không có — lưu vị trí vạch có trọng số (-100..100) vào ACC
IF_SENSOR_VALUE   = 7   // tham số: [roadIndex, threshold, compareOp, jumpLabelIdx] — nhảy có điều kiện
SET_VAR           = 8   // tham số: [varIndex, value]
LABEL             = 9   // tham số: không có — đánh dấu vị trí hiện tại (đích nhảy)
JUMP              = 10  // tham số: [labelIndex] — nhảy vô điều kiện
LOOP_START        = 11  // tham số: [count] — bắt đầu block lặp
LOOP_END          = 12  // tham số: không có — kết thúc block lặp, nhảy lại nếu còn vòng lặp
END_PROGRAM       = 13  // tham số: không có — dừng thực thi
```

### IR v2 extension (C-009)

IR v1 remains valid and loadable:

```typescript
interface IRProgramV1 {
  version: 1;
  commands: IRCommand[];
}
```

IR v2 is additive. Generators may emit v2 once a block needs strings, colors, enum fields, nested value expressions, boolean expressions, diagnostics, metadata, or C-code payloads. The current interpreter may keep consuming v1 while later cards add v2 execution adapters.

```typescript
type IRRuntimeStatus =
  | "implemented"
  | "telemetry-only"
  | "stub"
  | "blocked-by-sandbox";

type IRDiagnosticSeverity = "info" | "warning" | "error";
type IRPrimitive = string | number | boolean | null;

interface IRSourceRef {
  blockId?: string;
  blockType: string;
  category?: string;
  label?: string;
}

interface IRDiagnostic {
  code: string;
  severity: IRDiagnosticSeverity;
  message: string;
  source?: IRSourceRef;
  runtimeStatus?: IRRuntimeStatus;
  handlerId?: string;
}

interface IRCCodeSandboxPolicy {
  required: true;
  status: "available" | "blocked";
  timeoutMs: number;
  memoryMb: number;
  allowedApis: string[];
}

interface IRCCodePayload {
  language: "c";
  source: string;
  entryPoint?: string;
  input?: IRValueExpression;
  sandbox: IRCCodeSandboxPolicy;
}

interface CCodeSandboxConfig {
  enabled?: boolean;       // default false in UI/runtime
  timeoutMs?: number;      // capped by payload sandbox.timeoutMs
  memoryMb?: number;       // capped by payload sandbox.memoryMb
  maxStatements?: number;  // tiny-subset execution guard
  allowedApis?: string[];  // must be subset of payload sandbox.allowedApis
}

type IRValueExpression =
  | { kind: "literal"; value: IRPrimitive }
  | { kind: "variable"; name: string }
  | { kind: "sensor"; sensor: string; port?: string | number; channel?: number }
  | { kind: "unary"; op: string; arg: IRValueExpression; angleUnit?: "degree" | "radian" }
  | { kind: "binary"; op: string; left: IRValueExpression; right: IRValueExpression }
  | { kind: "call"; callee: string; args: IRValueExpression[] }
  | { kind: "c-code"; payload: IRCCodePayload; input?: IRValueExpression };

type IRBooleanExpression =
  | { kind: "literal"; value: boolean }
  | { kind: "compare"; op: "EQ" | "NEQ" | "LT" | "LTE" | "GT" | "GTE"; left: IRValueExpression; right: IRValueExpression }
  | { kind: "and"; args: IRBooleanExpression[] }
  | { kind: "or"; args: IRBooleanExpression[] }
  | { kind: "not"; arg: IRBooleanExpression }
  | { kind: "sensor"; sensor: string; port?: string | number; channel?: number; predicate: string };

type IRFieldValue = IRPrimitive | IRValueExpression | IRBooleanExpression | IRCCodePayload;

interface IRCommandV2 {
  kind: "command";
  op: string;
  args: Record<string, IRFieldValue>;
  children?: Record<string, IRNode[]>;
  source?: IRSourceRef;
  diagnostics?: IRDiagnostic[];
  metadata: {
    sourceText?: string;
    runtimeStatus: IRRuntimeStatus;
    handlerId: string;
    cCode?: IRCCodePayload;
  };
}

interface IRDiagnosticNode {
  kind: "diagnostic";
  diagnostic: IRDiagnostic;
  source?: IRSourceRef;
}

type IRNode = IRCommandV2 | IRDiagnosticNode;

interface IRProgramV2 {
  version: 2;
  nodes: IRNode[];
  diagnostics: IRDiagnostic[];
  metadata: {
    generator: string;
    generatedAt?: string;
    source: "blockly" | "import" | "sample" | "test";
    compatibility: {
      acceptsV1: true;
      migrationNotes: string[];
    };
  };
  legacyV1?: {
    commands: IRCommand[];
    note: string;
  };
}
```

Runtime-status contract:

- `implemented`: the interpreter or a runtime adapter must execute the block behavior.
- `telemetry-only`: the runtime records a telemetry/effect event but does not change robot physics.
- `stub`: the generator/runtime must emit an `IRDiagnostic`; it must not silently drop the block.
- `blocked-by-sandbox`: the block is security-sensitive and cannot execute until a sandbox policy is available.

Compatibility and migration:

- Existing `version: 1` programs remain the stable interpreter input. No existing sample or saved v1 program needs migration before it can run.
- A v2-capable generator may include `legacyV1.commands` when the program can be lowered losslessly to v1 opcodes.
- If a block cannot be lowered to v1, the v2 program must carry a diagnostic node with the source block type, handler id, and runtime status.
- Intentional compatibility stubs are `patrol_start_button`, `light_reading_1`, and `sensor_remote_control_button`.
- Math trig/inverse-trig nodes must include `angleUnit: "degree" | "radian"`.
- `C Code` nodes must use `IRCCodePayload`; execution remains feature-flagged by `InterpreterConfig.cSandbox.enabled`.
- When `cSandbox.enabled` is false or payload policy is `status: "blocked"`, C Code emits `HTLAB_C_SANDBOX_DISABLED` with runtime status `blocked-by-sandbox`.
- C-014 sandbox execution is a strict tiny C subset adapter: one numeric function, one numeric parameter, arithmetic expressions, and whitelisted APIs only (`htlab_abs`, `htlab_clamp`). No DOM, localStorage, network, filesystem, arbitrary JS, pointer/array allocation, or arbitrary C library calls.

## Shared shapes

```typescript
// Trạng thái robot
interface RobotState {
  x: number;        // mm, tâm trục bánh xe
  y: number;        // mm
  heading: number;  // radian, 0 = phải, π/2 = xuống (tọa độ màn hình)
  leftSpeed: number;  // mm/s
  rightSpeed: number; // mm/s
}

// Trạng thái cảm biến (grayscale 5-in-1)
interface SensorState {
  roads: [number, number, number, number, number]; // mỗi giá trị 0-100, Road 1→5
  pattern: string;    // mẫu nhị phân, ví dụ "00100", "01110", "11100"
  linePosition: number; // -100 (rất trái) đến +100 (rất phải), 0 = giữa
  calibrated: boolean;
  thresholds: { white: number; black: number };
}

// Khung telemetry (mỗi tick một khung, được ghi để phát lại)
interface TelemetryFrame {
  tick: number;
  robot: RobotState;
  sensors: SensorState;
  motorTargets: { left: number; right: number };
}

// Dữ liệu sa bàn
interface MapData {
  imageData: ImageData;  // pixel thô để lấy mẫu cảm biến
  width: number;         // mm
  height: number;        // mm
  scale: number;         // px trên mỗi mm
  metadata: {
    startPose: { x: number; y: number; heading: number };
    checkpoints?: { x: number; y: number; radius: number }[];
    finishZone?: { x: number; y: number; width: number; height: number };
  };
}

// Cấu hình robot
interface RobotConfig {
  wheelbase: number;     // mm, khoảng cách giữa bánh trái và bánh phải
  wheelRadius: number;   // mm
  maxSpeed: number;      // mm/s
  maxAccel: number;      // mm/s²
  friction: number;      // hệ số 0-1
  deadzone: number;      // tín hiệu motor tối thiểu
  noise: number;         // độ lệch chuẩn của nhiễu cảm biến Gaussian (mm)
  sensorNoise: number;   // thang 0-100
  sensorBias: number;    // độ lệch -100..100
  latency: number;       // số tick trễ cảm biến
  startPoseOnMap: { x: number; y: number; heading: number };
}
```

## Feature → interface map

Reference each PRD feature by its `FRn` id.

- **FR1** (robot chạy trên sa bàn) → `createSimulation()`, `sim.tick()`, `sim.state`, `MapData`
- **FR2** (robot dò line) → `CALIBRATE_GRAYSCALE`, `READ_SENSOR_ROAD`, `READ_SENSOR_GROUP`, `READ_LINE_POSITION`, `SET_MOTOR`, `SensorState`
- **FR3** (Blockly sinh IR) → `IRProgram`, `IRCommand`, `OpCode` enum, Blockly generator → IR JSON
- **FR4** (đọc giá trị 5 mắt grayscale) → `SensorState.roads`, `SensorState.pattern` (real-time từ sim.state)
- **FR5** (telemetry panel) → `sim.state`, `sim.getTelemetry()`, `TelemetryFrame[]`
- **FR6** (telemetry recorder + replay) → `sim.getTelemetry()`, `TelemetryFrame[]`; replay = chạy lại sim với telemetry playback (SimulationCore replay mode: thay vì đọc motor từ interpreter, đọc từ telemetry log)
- **FR7** (12 custom Blockly blocks) → mỗi block type → 1 generator function → `IRCommand` tương ứng. Toolbox XML → block categories defined in Blockly workspace config
- **FR8** (save/load project) → localStorage key: `htlab-project-{name}` → JSON `{ program: IRProgram, robotConfig: RobotConfig, mapName: string }`

### React component interface (internal, not a formal contract)

```
<App>
  <SimulationView sim={sim} />          // canvas PixiJS — nhận sim.state
  <BlocklyEditor onProgramChange />     // không gian Blockly — sinh IRProgram
  <TelemetryPanel telemetry={frames} /> // nhận TelemetryFrame[]
  <Toolbar onRun onPause onReset onStep onSpeed /> // điều khiển mô phỏng
</App>
```
