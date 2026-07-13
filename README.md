# HTLAB

**Nền tảng mô phỏng sa bàn ảo và lập trình khối lệnh cho Robotics**

HTLAB là nền tảng web giúp học sinh luyện tập lập trình robot trên sa bàn ảo thông qua giao diện kéo thả khối lệnh (Blockly). Dự án kết hợp mô phỏng vật lý 2D deterministic, hệ thống telemetry và replay, hỗ trợ học, thử nghiệm thuật toán và huấn luyện thi đấu Robotics.

## Trạng thái MVP

**Build hoàn thành — 15/15 flow cards done. Simulation core: 155 tests, 0 failures. Client mixed-workspace smoke: 3 tests, 0 failures.**

- [x] SimulationCore: robot kinematics, 5-in-1 grayscale sensor, map loader, fixed 60Hz
- [x] IR Interpreter: 14 opcodes, ACC register, 8 variable slots, loop/label/jump
- [x] Telemetry recorder + deterministic replay + diff tool
- [x] React 18 + Vite + Tailwind CSS + PixiJS 8 renderer (zoom/pan, robot, trajectory, sensor dots)
- [x] Telemetry panel (sensor bars, motor bars, pattern, line position gauge)
- [x] Zustand state management + keyboard shortcuts (Space/R/S)
- [x] Blockly editor: WhalesBot registry toolbox, IR v2 generator, diagnostics
- [x] Project save/load (localStorage)
- [x] Sample map + bundled sample programs (line-following, mixed QA, diagnostics)
- [ ] Deploy Vercel (vercel.json ready)
- [ ] Backend (NestJS + PostgreSQL + Redis) — ngoài MVP

## Chạy dự án local

```bash
# Cài dependencies
pnpm install

# Chạy toàn bộ (Turborepo)
pnpm dev

# Hoặc chạy riêng client
cd apps/client
npx vite --port 5173
# Mở http://localhost:5173

# Chạy test
cd packages/simulation-core
npx vitest run
```

## Cấu trúc dự án

```
HTLAB/
├── apps/
│   └── client/                          # React 18 + Vite + PixiJS 8 + Blockly
│       ├── src/
│       │   ├── blockly/
│       │   │   ├── blocks.ts            # WhalesBot block definitions + registry fallbacks
│       │   │   ├── generator.ts         # IR code generator (workspaceToIR)
│       │   │   ├── toolbox.ts           # Full WhalesBot toolbox config
│       │   │   └── BlocklyEditor.tsx    # React wrapper (Zelos renderer)
│       │   ├── components/
│       │   │   ├── Controls.tsx         # Toolbar (Run/Pause/Step/Reset + speed)
│       │   │   ├── SimulationView.tsx   # PixiJS 8 canvas (map, robot, trajectory)
│       │   │   ├── TelemetryPanel.tsx   # Sensor bars, pattern, line gauge
│       │   │   ├── ReplayControls.tsx   # Replay frame scrubber
│       │   │   └── ProjectManager.tsx   # Save/Load dialogs
│       │   ├── hooks/
│       │   │   └── useSimulation.ts     # (legacy hook, superseded by Zustand)
│       │   ├── store/
│       │   │   ├── simStore.ts          # Zustand store (sim, interpreter, replay)
│       │   │   └── projectStore.ts      # localStorage persistence
│       │   ├── App.tsx                  # 3-column layout (Blockly|Canvas|Telemetry)
│       │   ├── main.tsx                 # React entry point
│       │   └── index.css                # Tailwind base
│       ├── public/favicon.svg
│       ├── index.html
│       ├── package.json
│       ├── vite.config.ts
│       └── tailwind.config.ts
│
├── packages/
│   └── simulation-core/                 # Zero-dependency TypeScript library
│       ├── src/
│       │   ├── types.ts                 # All core types + interfaces
│       │   ├── sim.ts                   # Simulation factory (createSimulation)
│       │   ├── kinematics.ts            # Differential drive kinematics
│       │   ├── map.ts                   # Map loader + pixel sampling
│       │   ├── rng.ts                   # Seeded PRNG (mulberry32)
│       │   ├── replay.ts                # Replay simulation factory
│       │   ├── index.ts                 # Package entry point
│       │   ├── sensor/
│       │   │   ├── grayscale.ts         # 5-in-1 line sensor model
│       │   │   └── index.ts
│       │   ├── interpreter/
│       │   │   ├── types.ts             # OpCode, IRCommand, IRProgram, Interpreter
│       │   │   ├── interpreter.ts       # 14-opcode IR interpreter
│       │   │   └── index.ts
│       │   └── telemetry/
│       │       ├── types.ts             # ReplaySimulation, TelemetryDiff
│       │       ├── diff.ts              # diffTelemetry — compare two logs
│       │       └── index.ts
│       └── test/
│           ├── kinematics.test.ts
│           ├── map.test.ts
│           ├── rng.test.ts
│           ├── sim.test.ts
│           ├── sensor/grayscale.test.ts
│           ├── interpreter/interpreter.test.ts
│           └── telemetry/telemetry.test.ts
│
├── flow/                                # Build flow planning artifacts
├── cards/                               # Build cards (C-001 → C-015)
├── maps/sample/                         # Sample map config
├── vercel.json                          # Vercel deploy config
├── pnpm-workspace.yaml                  # pnpm monorepo workspaces
├── turbo.json                           # Turborepo config
├── tsconfig.base.json                   # Shared TypeScript config
├── package.json                         # Root package.json
└── README.md
```

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                apps/client (Browser)                        │
│                                                             │
│  ┌──────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │ Blockly  │  │  Simulation    │  │  Telemetry Panel   │  │
│  │ Editor   │  │  View          │  │  (React)           │  │
│  │ 13 block │  │  (PixiJS 8)    │  │                    │  │
│  │ types    │  │                │  │  Sensor bars (x5)  │  │
│  │          │  │  Map bg +      │  │  Motor L/R bars    │  │
│  │ Drag→IR  │  │  Robot ▲ +    │  │  Pattern "00100"   │  │
│  │          │  │  Trajectory +  │  │  Line gauge ±100   │  │
│  │          │  │  Sensor dots   │  │  Tick counter      │  │
│  └────┬─────┘  └───────┬────────┘  └────────────────────┘  │
│       │                │                                    │
│       │        ┌───────┴────────┐                          │
│       │        │  Zustand Store │                          │
│       └───────→│  simStore.ts   │←─────────────────────────┘
│     IRProgram  │                │
│                │  sim           │
│                │  interpreter   │
│                │  replaySim     │
│                │  running/tick  │
│                │  speed/error   │
│                └───────┬────────┘
└────────────────────────┼───────────────────────────────────┘
                         │
┌────────────────────────┼───────────────────────────────────┐
│     packages/simulation-core (zero deps, browser + Node)   │
│                         │                                   │
│  ┌──────────────────────┼──────────────────────────────┐   │
│  │                Simulation                           │   │
│  │  tick(): sensor.sample() → kinematics → telemetry   │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────┐  ┌───────┴────────┐  ┌──────────────────┐   │
│  │ Sensor   │  │  Interpreter   │  │  Telemetry       │   │
│  │ 5-in-1   │  │  14 opcodes    │  │  Recorder        │   │
│  │ pattern  │  │  ACC + 8 vars  │  │  Replay + Diff   │   │
│  │ calibrate│  │  label + jump  │  │  Ring buffer     │   │
│  │ noise    │  │  loop + wait   │  │                  │   │
│  └──────────┘  └────────────────┘  └──────────────────┘   │
│                                                             │
│  155 core tests · 3 client smoke tests · deterministic       │
└─────────────────────────────────────────────────────────────┘
```

## Luồng dữ liệu end-to-end

```
Blockly Editor          IR Generator            Interpreter
┌──────────┐   XML    ┌──────────────┐  IR    ┌──────────────┐
│ Kéo thả  │ ───────→ │ workspaceToIR│ ─────→ │ createInterp  │
│ block    │          │ 13 generators│        │ 14 opcodes    │
└──────────┘          └──────────────┘        └──────┬───────┘
                                                     │
                                        step() → setMotors()
                                        reads  ← sim.state.sensors
                                                     │
┌──────────────┐    ┌──────────────┐    ┌───────────┴──────┐
│ Telemetry    │ ←─ │ Simulation   │ ←─ │ Zustand Store    │
│ Panel (UI)   │    │ tick() 60Hz  │    │ run/stop/step    │
└──────────────┘    └──────┬───────┘    └──────────────────┘
                           │ sim.state (rAF each frame)
                    ┌──────┴───────┐
                    │ PixiJS 8     │
                    │ Renderer     │
                    │ map+robot    │
                    │ +trajectory  │
                    └──────────────┘
```

## Mô hình robot và cảm biến

### Robot

- **Loại:** Differential drive (2 bánh chủ động)
- **Configurable:** wheelbase, wheelRadius, maxSpeed, maxAccel, friction, deadzone
- **Sensor config:** sensorSpacing, sensorOffset, sensorNoise, sensorBias, latency
- **Cấu hình:** `RobotConfig` trong `packages/simulation-core/src/types.ts`

### Cảm biến Grayscale 5-in-1

- **5 mắt** (Road 1 → Road 5), hàng ngang phía trước robot, khoảng cách configurable
- **Giá trị:** 0 (nền trắng) → 100 (line đen), tính từ grayscale pixel + threshold
- **Pattern nhị phân:** `"00100"`, `"01110"`, `"11100"` — mỗi ký tự on/off theo ngưỡng 50
- **Nhóm cảm biến:** left (R1-R3), middle (R2-R4), right (R3-R5)
- **Line position:** weighted centroid, -100 (far left) → +100 (far right)
- **Hiệu chuẩn:** hai pha (white floor → black line), per-road thresholds nội bộ
- **Noise/bias/latency:** configurable, Gaussian noise qua seeded RNG

### IR Interpreter — 14 opcodes

```
INIT_HARDWARE(0)  CALIBRATE_GRAYSCALE(1)  SET_MOTOR(2)
WAIT_TICKS(3)     READ_SENSOR_ROAD(4)     READ_SENSOR_GROUP(5)
READ_LINE_POSITION(6)  IF_SENSOR_VALUE(7)  SET_VAR(8)
LABEL(9)          JUMP(10)               LOOP_START(11)
LOOP_END(12)      END_PROGRAM(13)
```

- Max 1000 instructions/tick, configurable runtime cap (default 18000 ticks = 5 phút)
- ACC register + 8 variable slots (SET_VAR/GET_VAR)
- Loop stack cho LOOP_START/LOOP_END lồng nhau
- Label map cho JUMP và IF_SENSOR_VALUE

### Blockly Toolbox — WhalesBot registry coverage

| Category | Status |
|----------|--------|
| Motion | Tank/single motor implemented where differential-drive physics exists; omni/encoder diagnostics |
| Light Speaker | Telemetry-only effects and intentional `reading 1` stub |
| Sensor | Grayscale/timer/encoder implemented; external hardware sensors preserved as expressions/stubs |
| Event | Main entry marker plus touch-event diagnostic compatibility |
| Loop | Repeat/wait/break/return flows lower to IR v2; while compatibility remains diagnostic |
| Logic | If/else, compare, and boolean expressions lower to IR v2 |
| Math | Arithmetic, modulo, random, round, unary/trig expressions lower to IR v2 |
| Variable | Blockly variable dialog plus set/change/get and compatibility diagnostics |
| AI | Recognition compatibility expressions/stubs |
| Patrol line | Tank line-following route blocks implemented; omni/encoder variants diagnostic |
| My Blocks | One-parameter custom block definitions/calls execute through IR v2 |
| C Code | Tiny C-subset payloads generated; client sandbox remains disabled by default |

Legacy `initialize` and `calibrate_grayscale` blocks remain loadable for existing
projects and samples, but are not exposed as a WhalesBot toolbox category.

## Stack công nghệ

| Layer | Công nghệ |
|---|---|
| Simulation Core | TypeScript (strict), zero deps, vitest |
| Client UI | React 18, Vite, Tailwind CSS, Zustand |
| Client Renderer | PixiJS 8 |
| Block Editor | Blockly 11 (Zelos renderer) + custom blocks + IR codegen |
| Monorepo | Turborepo + pnpm workspaces |
| Deploy | Vercel (static site) |
| Backend (ngoài MVP) | NestJS, Prisma, PostgreSQL, Redis, BullMQ |

## Tiến độ (theo flow cards)

| Card | Nội dung | Tests |
|------|----------|-------|
| C-001 | SimulationCore: kinematics + map + fixed 60Hz | 46 pass |
| C-002 | Grayscale 5-in-1 sensor model (noise, bias, latency, calibrate) | 31 pass |
| C-003 | IR Interpreter: 14 opcodes (ACC, vars, loop, label, jump) | 27 pass |
| C-004 | Telemetry recorder + replay + diff tool | 24 pass |
| C-005 | React 18 + PixiJS 8 renderer + zoom/pan | — |
| C-006 | Telemetry panel + Zustand store + keyboard shortcuts | — |
| C-007 | Blockly 13 custom blocks + IR codegen + save/load | — |
| C-008 | Integration + error handling + vercel config | — |
| C-009 | WhalesBot block registry + IR v2 contract | docs/metadata |
| C-010 | Value/boolean/control-flow foundation | covered in core/client checks |
| C-011 | Motion + Patrol line expanded runtime | covered in core/client checks |
| C-012 | Sensor + Light Speaker + AI compatibility | covered in core/client checks |
| C-013 | Variable + My Blocks model | covered in core/client checks |
| C-014 | C Code sandbox spike, disabled by default | covered in core checks |
| C-015 | Full toolbox parity, samples, QA smoke | client smoke: 3 pass |

**Tong hien tai: 155 simulation-core tests, 3 client smoke tests, 0 failures in the latest C-015 verification run.**

## Lộ trình triển khai

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| **G1: SimulationCore** | Kinematics, sensor, map, interpreter, telemetry, replay | Done |
| **G2: Giao diện** | React shell, PixiJS renderer, controls, telemetry panel | Done |
| **G3: Blockly** | Custom blocks, IR generator, toolbox, save/load | Done |
| **G4: Backend** | NestJS, Prisma, auth (JWT), project CRUD | Ngoài MVP |
| **G5: Leaderboard** | Headless worker, submission flow, leaderboard | Ngoài MVP |
| **G6: Ecosystem** | Classroom, map editor, PID visualizer, code export | Ngoài MVP |

## Tiêu chí thành công MVP

- [x] Robot chạy theo line trên sa bàn mẫu
- [x] Học sinh điều khiển robot bằng Blockly
- [x] Giá trị 5 cảm biến hiển thị theo thời gian thực (sensor bars + pattern)
- [x] Quan sát được trajectory của robot
- [x] Pause, reset, step, replay hoạt động
- [x] Cùng chương trình + seed + config → kết quả giống nhau (155 core tests deterministic)
- [x] SimulationCore chạy độc lập khỏi UI (zero DOM dependencies, 155 unit tests)
- [ ] Deploy lên public URL (vercel.json ready, chờ Vercel account)
