# HTLAB — Technology Stack

Stack công nghệ được chốt dựa trên các yêu cầu đã thảo luận. Tài liệu này là tham chiếu chính thức cho toàn bộ dự án.

## Tóm tắt yêu cầu

| Yêu cầu | Quyết định |
|---|---|
| Robot | Differential drive, cấu hình qua RobotConfig |
| Cảm biến | Grayscale 5-in-1 (Road 1→5), giá trị 0-100 |
| Map | Ảnh PNG + metadata JSON, sensor đọc pixel từ ImageData |
| Lập trình | Blockly sinh IR, Interpreter chạy step-by-step mỗi tick |
| Simulation | Fixed timestep 60Hz, deterministic với randomSeed |
| Team | 2-3 người, fullstack + DevOps |
| Deploy | Local trước, cloud sau (VPS hoặc Vercel+Railway) |
| Thiết bị | Desktop browser (Chrome/Firefox/Edge trên Windows/Mac) |
| License | Private repo, có thể thương mại hóa sau |

---

## 1. Tổng quan kiến trúc

```
┌──────────────────────────────────────────────────┐
│                    Client (Browser)               │
│                                                   │
│  ┌──────────┐  ┌───────────┐  ┌───────────────┐  │
│  │  React   │  │  Blockly  │  │  PixiJS       │  │
│  │  (UI)    │  │  (Editor) │  │  (Renderer)   │  │
│  └────┬─────┘  └─────┬─────┘  └───────┬───────┘  │
│       │              │                │           │
│       └──────────────┼────────────────┘           │
│                      │                            │
│              ┌───────▼────────┐                   │
│              │ SimulationCore │ ← Shared package  │
│              │ + Interpreter  │                   │
│              └───────┬────────┘                   │
└──────────────────────┼────────────────────────────┘
                       │
         ┌─────────────▼─────────────┐
         │        Backend (NestJS)    │
         │                           │
         │  ┌─────────────────────┐  │
         │  │  API (REST)         │  │
         │  ├─────────────────────┤  │
         │  │  Auth (JWT)         │  │
         │  ├─────────────────────┤  │
         │  │  Headless Sim Runner│  │
         │  ├─────────────────────┤  │
         │  │  Job Queue (BullMQ) │  │
         │  └─────────────────────┘  │
         └───────────┬───────────────┘
                     │
         ┌───────────▼───────────────┐
         │    PostgreSQL + Redis     │
         └───────────────────────────┘
```

---

## 2. Monorepo structure

```
htlab/
├── packages/
│   ├── simulation-core/       # Lõi mô phỏng (shared client + server)
│   │   ├── src/
│   │   │   ├── robot/         # Robot model, kinematics, differential drive
│   │   │   ├── sensor/        # Grayscale5In1Sensor, calibration, noise
│   │   │   ├── map/           # MapLoader, sensor sampling từ ImageData
│   │   │   ├── physics/       # Fixed timestep loop, acceleration, friction
│   │   │   ├── interpreter/   # IR executor, RobotCommand state machine
│   │   │   ├── telemetry/     # Telemetry recorder, types
│   │   │   └── ir/            # IR codegen từ Blockly (hoặc định nghĩa IR types)
│   │   ├── __tests__/
│   │   └── package.json
│   │
│   ├── client/                # React + PixiJS + Blockly
│   │   ├── src/
│   │   │   ├── components/    # UI components
│   │   │   ├── pages/         # Editor, Dashboard, Settings
│   │   │   ├── simulation/    # Phaser/PixiJS scene, robot sprite, trajectory
│   │   │   ├── blockly/       # Custom blocks, toolbox, code generator (→ IR)
│   │   │   ├── hooks/         # React hooks (useSimulation, useTelemetry...)
│   │   │   └── store/         # Zustand stores
│   │   └── package.json
│   │
│   └── server/                # NestJS monolith
│       ├── src/
│       │   ├── auth/          # JWT auth module
│       │   ├── project/       # CRUD project (Blockly workspace, robot config)
│       │   ├── map/           # Map upload, metadata, calibration defaults
│       │   ├── submission/    # Nộp bài, queue headless simulation
│       │   ├── leaderboard/   # Leaderboard (sau MVP)
│       │   └── worker/        # BullMQ worker: headless simulation
│       └── package.json
│
├── docs/                      # Tài liệu thiết kế
├── maps/                      # Map mẫu (PNG + JSON)
├── turbo.json                 # Turborepo config
├── package.json               # Root workspace
└── tsconfig.json              # Base TypeScript config
```

Tool quản lý monorepo: **Turborepo** (nhẹ, dễ dùng, đủ cho 2-3 người). Không cần Nx phức tạp.

Runtime: **Bun** hoặc **Node.js 20+**. Nếu team quen Node.js thì dùng Node.js. Nếu muốn nhanh hơn thì Bun. Không quyết định ngay.

---

## 3. SimulationCore — Chi tiết

### 3.1. Công nghệ

| Mục | Lựa chọn |
|---|---|
| Ngôn ngữ | TypeScript (strict mode) |
| Dependencies | **Zero external dependencies** (chỉ type devDeps như vitest) |
| Test | Vitest |
| Build | tsc hoặc tsup (xuất CommonJS + ESM) |

### 3.2. API bề mặt

```ts
// Tạo bộ mô phỏng
const sim = new SimulationCore({
  mapPath: "maps/arena-01/visual.png",  // đường dẫn ảnh
  mapMeta: { ... },                      // siêu dữ liệu (checkpoints, finishZone...)
  robotConfig: { ... },                  // RobotConfig
  program: [...],                        // mảng lệnh IR
  randomSeed: 12345,
  tickRate: 60,
  maxRuntimeSec: 120,
});

// Chạy
sim.on("tick", (frame: TelemetryFrame) => { /* vẽ khung hình */ });
sim.on("checkpoint", (id: number) => { /* hiển thị */ });
sim.on("finish", (result: SimulationResult) => { /* hoàn tất */ });
sim.on("error", (err: SimulationError) => { /* lỗi */ });

sim.start();   // bắt đầu
sim.pause();   // tạm dừng
sim.resume();  // tiếp tục
sim.step();    // chạy 1 tick
sim.stop();    // dừng

// Phát lại
sim.replay(telemetryFrames);  // chạy lại từ telemetry đã ghi

// Chạy không giao diện (phía máy chủ)
const result = sim.runHeadless();  // chạy không cần DOM, trả về kết quả
```

### 3.3. Các module bên trong

```
simulation-core/src/
├── index.ts                  # SimulationCore class (entry point)
├── robot/
│   ├── types.ts              # RobotConfig, RobotState
│   └── kinematics.ts         # Differential drive equations
├── sensor/
│   ├── types.ts              # GrayscaleReading, SensorGroup, Calibration
│   ├── sampler.ts            # Đọc pixel từ ImageData → luminance → blackness
│   ├── calibration.ts        # Black/white calibration, normalize
│   ├── pattern.ts            # onLine detection, pattern string, group logic
│   ├── linePosition.ts       # Weighted position calculation
│   └── noise.ts              # Noise models
├── map/
│   ├── types.ts              # MapMeta, Checkpoint, FinishZone
│   ├── loader.ts             # Load ảnh → ImageData (browser) hoặc sharp (node)
│   └── sampler.ts            # getSurfaceColorAt(x, y) → RGB
├── physics/
│   ├── types.ts              # MotorCommand, PhysicsState
│   ├── motor.ts              # Acceleration ramp, deadzone, speed conversion
│   ├── dynamics.ts           # Friction, movement integration
│   └── tickLoop.ts           # Fixed timestep orchestrator
├── interpreter/
│   ├── types.ts              # IRInstruction, RobotCommand, InterpreterState
│   ├── executor.ts           # Step-by-step execution per tick
│   ├── commands/             # Mỗi command là 1 state machine
│   │   ├── initHardware.ts
│   │   ├── calibrateGrayscale.ts
│   │   ├── setMotor.ts
│   │   ├── patrolLine.ts
│   │   ├── patrolLineForTime.ts
│   │   ├── patrolLineUntilIntersection.ts
│   │   ├── turnUntilSensorGroup.ts
│   │   ├── startMotorForTime.ts
│   │   └── startMotorForAngle.ts
│   └── limits.ts             # Instruction limit, runtime limit
├── telemetry/
│   ├── types.ts              # TelemetryFrame, TrajectoryPoint
│   └── recorder.ts           # Ghi telemetry mỗi tick
└── replay/
    └── replayController.ts   # Phát lại từ telemetry đã lưu
```

---

## 4. Client — Chi tiết

### 4.1. Công nghệ

| Mục | Lựa chọn | Lý do |
|---|---|---|
| UI framework | **React 18+** | Team đã biết, hệ sinh thái lớn |
| Build tool | **Vite** | Nhanh, đơn giản, mặc định cho React hiện đại |
| Renderer | **PixiJS 8** | Nhẹ, thuần render, không có physics engine → không xung đột với SimulationCore |
| Blockly | **@blockly/blockly** (npm) | Thư viện chính thức, custom block qua BlockDefinition |
| State management | **Zustand** | Nhẹ, đơn giản, đủ dùng. Không cần Redux |
| Styling | **Tailwind CSS** | Nhanh, nhất quán, dễ tạo layout editor |
| Routing | **React Router v6** | Chỉ cần vài route (editor, dashboard, settings) |

### 4.2. Tại sao PixiJS thay vì Phaser?

| Tiêu chí | PixiJS 8 | Phaser 3 |
|---|---|---|
| Physics engine | Không có → tốt (mình tự viết) | Arcade/Matter → có thể xung đột |
| Bundle size | ~400KB | ~1.2MB |
| API style | Thuần render (Scene, Sprite, Graphics) | Game framework (Scene chứa physics, input...) |
| Học | Đơn giản hơn | Nhiều concept hơn |

PixiJS chỉ làm đúng 3 việc cần: vẽ map, vẽ robot, vẽ trajectory. SimulationCore tính toán mọi thứ rồi đưa cho PixiJS render.

### 4.3. Cấu trúc UI (MVP)

```
┌──────────────────────────────────────────────────────┐
│  Toolbar (Run | Pause | Reset | Step | Speed)        │
├──────────────────────┬───────────────────────────────┤
│                      │                               │
│   PixiJS Canvas      │   Blockly Workspace           │
│   (sa bàn + robot)   │   (kéo thả block)             │
│                      │                               │
│                      │                               │
│                      │                               │
├──────────────────────┴───────────────────────────────┤
│  Telemetry Panel                                     │
│  ┌─────────┐ ┌──────────┐ ┌──────────────────────┐   │
│  │ Sensors │ │ Motors   │ │ PID / Line Position  │   │
│  │ R1-R5   │ │ L:60 R:57│ │         ╱╲           │   │
│  │ 00100   │ │          │ │        ╱  ╲──        │   │
│  └─────────┘ └──────────┘ └──────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## 5. Blockly Integration

### 5.1. Custom blocks

Blockly không chạy JavaScript trực tiếp. Thay vào đó:

```
Blockly workspace
       ↓
Custom Code Generator → sinh ra IR (JSON)
       ↓
IR lưu vào project, gửi cho Interpreter
```

### 5.2. Các block cần xây dựng

| Nhóm | Blocks |
|---|---|
| Hardware | `initialize`, `black and white detection` |
| Movement | `patrol line`, `patrol line for time`, `patrol line intersections`, `turn`, `start motor time`, `start motor angle` |
| Sensing | `read grayscale sensor`, `read line position`, `sensor group detected?` |
| Logic | `if/else`, `repeat N times`, `while`, `wait ms` |
| Variables | `set variable`, `get variable` |
| Math | `+`, `-`, `*`, `/`, `>`, `<`, `=`, `and`, `or`, `not` |

### 5.3. Code Generator

Ví dụ Blockly `patrol line intersections left speed 60 rush 0.1` sinh ra:

```json
{
  "type": "PATROL_LINE_UNTIL_INTERSECTION",
  "intersectionTarget": "left",
  "speed": 60,
  "rushTimeSec": 0.1
}
```

Block `turn middle left motor -30 right motor 30` sinh ra:

```json
{
  "type": "TURN_UNTIL_SENSOR_GROUP",
  "targetGroup": "middle",
  "leftMotorSpeed": -30,
  "rightMotorSpeed": 30
}
```

---

## 6. Backend — Chi tiết

### 6.1. Công nghệ

| Mục | Lựa chọn | Lý do |
|---|---|---|
| Framework | **NestJS** | Cùng TypeScript với SimulationCore, cấu trúc module rõ ràng |
| ORM | **Prisma** | Type-safe, migration tự động, hỗ trợ PostgreSQL JSONB tốt |
| Auth | **JWT** (passport-jwt) | Đơn giản, stateless, đủ dùng cho MVP |
| Queue | **BullMQ** (Redis) | Chạy headless simulation không block API |
| Validation | **Zod** | Dùng chung type schema giữa client và server |
| API style | **REST** (không GraphQL) | Đơn giản, đủ dùng, không cần real-time ngay |

### 6.2. Tại sao NestJS mà không phải Go?

- SimulationCore viết bằng TypeScript → **dùng chung code** cho headless simulation
- Team fullstack TS → không cần học thêm ngôn ngữ
- NestJS đủ nhanh cho workload này (không phải high-frequency trading)
- Nếu sau này cần performance cao hơn cho headless simulation, tách riêng worker service bằng Go cũng không muộn

### 6.3. Database schema (PostgreSQL)

```sql
-- Người dùng
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Robot config
CREATE TABLE robot_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  config JSONB NOT NULL,          -- RobotConfig type
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Map
CREATE TABLE maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  image_url TEXT NOT NULL,         -- path/to/visual.png
  metadata JSONB NOT NULL,         -- MapMeta type
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Project (một bài làm)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  blockly_workspace JSONB NOT NULL, -- Blockly workspace state
  ir_program JSONB,                 -- IR array (sinh từ Blockly)
  robot_config_id UUID REFERENCES robot_configs(id),
  map_id UUID REFERENCES maps(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Simulation run result
CREATE TABLE simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending/running/success/failed
  random_seed INT NOT NULL,
  tick_rate INT NOT NULL DEFAULT 60,
  start_time TIMESTAMPTZ,
  finish_time TIMESTAMPTZ,
  elapsed_ms INT,
  checkpoints_hit INT[],
  trajectory_summary JSONB,         -- tóm tắt quỹ đạo
  telemetry JSONB,                  -- telemetry đầy đủ (có thể để object storage nếu lớn)
  verified_by_server BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 7. Headless Simulation (dành cho leaderboard sau MVP)

```
Luồng:
  1. Client gửi submission (IR program + robotConfig + mapId + seed)
  2. Server lưu vào simulation_runs (status=pending)
  3. Server đẩy job vào BullMQ queue
  4. Worker pick job → import SimulationCore → runHeadless()
  5. Worker so sánh kết quả với client claim
  6. Nếu khớp → status=success, ghi leaderboard
  7. Nếu không khớp → status=rejected
```

Headless simulation loader (dùng `sharp` thay vì DOM Image):

```ts
// packages/simulation-core/src/map/loader.ts
// Trình duyệt: new Image() + vẽ lên canvas → getImageData()
// Node.js: sharp(filePath).raw().toBuffer() → đối tượng tương tự ImageData
```

---

## 8. Dev tools

| Mục | Lựa chọn |
|---|---|
| Monorepo | **Turborepo** |
| Package manager | **pnpm** (nhanh, workspace tốt) |
| Lint | **ESLint** (flat config) |
| Format | **Prettier** |
| TypeScript | **strict mode** toàn bộ packages |
| Testing | **Vitest** (unit + integration cho SimulationCore) |
| E2E | **Playwright** (test UI sau MVP) |
| CI/CD | **GitHub Actions** |

---

## 9. Lộ trình triển khai với stack

### Giai đoạn 1: SimulationCore MVP (làm trước, không cần UI)

```
packages/simulation-core/
  - Robot kinematics (differential drive)
  - Grayscale5In1Sensor
  - MapLoader (load ảnh → ImageData)
  - Fixed timestep loop
  - Interpreter với 8 command
  - Telemetry recorder
  - Test coverage > 80%

→ Có thể chạy robot bằng IR hard-code
→ Có thể replay deterministic
```

### Giai đoạn 2: Client MVP

```
packages/client/
  - React shell
  - PixiJS renderer (map + robot + trajectory)
  - Run/Pause/Reset/Step controls
  - Telemetry panel (sensor values, motor speed)
  - Tích hợp SimulationCore (chạy trong browser)

→ Nhìn thấy robot chạy trên sa bàn
→ Debug được sensor values
```

### Giai đoạn 3: Blockly

```
packages/client/src/blockly/
  - Custom blocks (8 blocks Robotics)
  - Custom toolbox
  - IR code generator
  - Workspace save/load

packages/simulation-core/src/ir/
  - IR type definitions (dùng chung client + server)

→ Học sinh kéo thả block điều khiển robot
```

### Giai đoạn 4: Backend

```
packages/server/
  - NestJS setup
  - Prisma schema + migrations
  - Auth (JWT)
  - Project CRUD
  - Map upload
  - Simulation run storage

→ Lưu được bài làm, map, robot config
```

### Giai đoạn 5: Leaderboard + Headless

```
packages/server/src/worker/
  - BullMQ worker
  - Headless simulation runner
  - Result verification

→ Thi đấu / challenge online cơ bản
```

### Giai đoạn 6: Nâng cao

```
- Lesson mode
- Classroom dashboard
- Map editor
- PID visualizer
- Export code cho robot thật
```

---

## 10. Tóm tắt stack

| Layer | Công nghệ |
|---|---|
| Simulation Core | **TypeScript**, zero deps, vitest |
| Client UI | **React 18**, Vite, Tailwind CSS, Zustand, React Router |
| Client Renderer | **PixiJS 8** |
| Block Editor | **Blockly** (npm) + custom blocks + IR codegen |
| Backend | **NestJS**, Prisma, Zod, JWT |
| Database | **PostgreSQL** (JSONB cho config, workspace, telemetry) |
| Queue | **BullMQ** (Redis) — headless simulation worker |
| Monorepo | **Turborepo** + pnpm workspaces |
| Dev | ESLint, Prettier, TypeScript strict, GitHub Actions |

---

## 11. Những gì đã cố ý bỏ qua khỏi MVP

| Mục | Lý do |
|---|---|
| Microservices | Monolith đủ dùng, chia sau khi có nhu cầu thực sự |
| GraphQL / WebSocket | REST đủ cho MVP, thêm sau |
| MongoDB | PostgreSQL + JSONB làm được mọi thứ cần |
| Redis cluster / HA | Single Redis đủ cho queue vài trăm job/ngày |
| Kubernetes | Docker Compose đủ cho MVP |
| CI/CD phức tạp | GitHub Actions free tier đủ cho private repo |
| Mobile support | Desktop browser trước |
| SSR / SEO | Không cần cho app dạng tool |
