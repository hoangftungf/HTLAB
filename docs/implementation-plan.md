# HTLAB — Kế hoạch triển khai chi tiết

Kế hoạch này bám sát stack công nghệ đã chốt trong `docs/technology-stack.md` và mô hình cảm biến trong `docs/cam-bien-grayscale-5-in-1.md`.

---

## Giai đoạn 1: SimulationCore MVP

**Mục tiêu:** Có lõi mô phỏng chạy độc lập, không cần UI, không cần browser. Có thể chạy robot bằng chương trình hard-code và replay deterministic.

**Thời gian dự kiến:** Đây là giai đoạn quan trọng nhất, nên làm kỹ.

### 1.1. Khởi tạo monorepo

| # | Task | Output |
|---|---|---|
| 1.1.1 | Tạo root `package.json` với pnpm workspaces | `pnpm-workspace.yaml` |
| 1.1.2 | Cấu hình Turborepo (`turbo.json`) | Build pipeline |
| 1.1.3 | Cấu hình TypeScript base (`tsconfig.base.json`) | Strict mode, path aliases |
| 1.1.4 | Cấu hình ESLint + Prettier | Format tự động |
| 1.1.5 | Tạo `packages/simulation-core/package.json` | Package setup, vitest config |

### 1.2. Robot model

| # | Task | Output |
|---|---|---|
| 1.2.1 | Định nghĩa `RobotConfig` type (wheelbase, wheelRadius, maxSpeed, acceleration...) | `robot/types.ts` |
| 1.2.2 | Định nghĩa `RobotState` type (x, y, heading, leftSpeed, rightSpeed) | `robot/types.ts` |
| 1.2.3 | Viết differential drive kinematics (`computeNextPose`) | `robot/kinematics.ts` |
| 1.2.4 | Viết test: robot đi thẳng, quay tại chỗ, quay vòng cung | `__tests__/kinematics.test.ts` |

### 1.3. Map loader

| # | Task | Output |
|---|---|---|
| 1.3.1 | Định nghĩa `MapMeta` type (kích thước, checkpoint, finishZone, calibration defaults) | `map/types.ts` |
| 1.3.2 | Viết `MapLoader` cho browser (Image → canvas → ImageData) | `map/loader.ts` |
| 1.3.3 | Viết `MapLoader` cho Node.js (sharp → raw pixel buffer) | `map/loader.ts` |
| 1.3.4 | Viết `sampleColorAt(wx, wy)` — chuyển world coord → pixel → RGB | `map/sampler.ts` |
| 1.3.5 | Viết test: đọc pixel tại vị trí biết trước, verify màu | `__tests__/map.test.ts` |

### 1.4. Sensor model (Grayscale 5-in-1)

| # | Task | Output |
|---|---|---|
| 1.4.1 | Định nghĩa `GrayscaleSensorConfig` (forwardOffset, lateralSpacing, sampleRadius...) | `sensor/types.ts` |
| 1.4.2 | Viết `getSensorWorldPositions(robotPose)` — tính tọa độ 5 mắt | `sensor/sampler.ts` |
| 1.4.3 | Viết `readSensorRaw(map, positions)` — đọc 5 giá trị raw blackness | `sensor/sampler.ts` |
| 1.4.4 | Viết `calibrate(rawValues, calibration)` — chuẩn hóa về 0-100 | `sensor/calibration.ts` |
| 1.4.5 | Viết `detectOnLine(values, threshold)` — pattern nhị phân 5 mắt | `sensor/pattern.ts` |
| 1.4.6 | Viết `detectGroups(onLine)` — nhận dạng nhóm left/middle/right | `sensor/pattern.ts` |
| 1.4.7 | Viết `computeLinePosition(values)` — weighted position | `sensor/linePosition.ts` |
| 1.4.8 | Viết `applyNoise(values, noiseConfig, rng)` — noise model | `sensor/noise.ts` |
| 1.4.9 | Viết test: từng pattern (00100, 01110, 11100, 00111, 00000, 11111) | `__tests__/sensor.test.ts` |
| 1.4.10 | Viết test: calibration với whiteRaw/blackRaw đã biết | `__tests__/calibration.test.ts` |

### 1.5. Physics engine

| # | Task | Output |
|---|---|---|
| 1.5.1 | Viết `applyAcceleration(currentSpeed, targetSpeed, maxAccel, dt)` — motor ramp | `physics/motor.ts` |
| 1.5.2 | Viết `applyFriction(speed, frictionCoeff, dt)` — ma sát | `physics/dynamics.ts` |
| 1.5.3 | Viết `convertBlockSpeedToPhysical(blockPercent, config)` — % → mm/s | `physics/motor.ts` |
| 1.5.4 | Viết `TickLoop` class — fixed timestep orchestrator | `physics/tickLoop.ts` |
| 1.5.5 | Viết test: motor ramp up/down, friction deceleration | `__tests__/physics.test.ts` |

### 1.6. IR (Intermediate Representation)

| # | Task | Output |
|---|---|---|
| 1.6.1 | Định nghĩa `IRInstruction` union type (đầy đủ 8 loại command + control flow) | `ir/types.ts` |
| 1.6.2 | Viết `validateIR(program)` — kiểm tra IR hợp lệ | `ir/validator.ts` |
| 1.6.3 | Viết test: IR hợp lệ / không hợp lệ | `__tests__/ir.test.ts` |

### 1.7. Interpreter

| # | Task | Output |
|---|---|---|
| 1.7.1 | Định nghĩa `InterpreterState` (PC, variables, currentCommand, commandState...) | `interpreter/types.ts` |
| 1.7.2 | Viết `Interpreter` class — `tick(sensorReading)` → `MotorCommand` | `interpreter/executor.ts` |
| 1.7.3 | Implement `INIT_HARDWARE` command | `interpreter/commands/initHardware.ts` |
| 1.7.4 | Implement `CALIBRATE_GRAYSCALE` command | `interpreter/commands/calibrateGrayscale.ts` |
| 1.7.5 | Implement `SET_MOTOR` command | `interpreter/commands/setMotor.ts` |
| 1.7.6 | Implement `WAIT_TICKS` command | `interpreter/commands/waitTicks.ts` |
| 1.7.7 | Implement `PATROL_LINE` command (dùng linePosition + P-controller) | `interpreter/commands/patrolLine.ts` |
| 1.7.8 | Implement `PATROL_LINE_FOR_TIME` command | `interpreter/commands/patrolLineForTime.ts` |
| 1.7.9 | Implement `PATROL_LINE_UNTIL_INTERSECTION` command (FOLLOWING → RUSHING → DONE) | `interpreter/commands/patrolLineUntilIntersection.ts` |
| 1.7.10 | Implement `TURN_UNTIL_SENSOR_GROUP` command (TURNING → DONE) | `interpreter/commands/turnUntilSensorGroup.ts` |
| 1.7.11 | Implement `START_MOTOR_FOR_TIME` command | `interpreter/commands/startMotorForTime.ts` |
| 1.7.12 | Implement `START_MOTOR_FOR_ANGLE` command | `interpreter/commands/startMotorForAngle.ts` |
| 1.7.13 | Implement flow control: `LABEL`, `JUMP`, `IF_*`, `LOOP_START/END` | `interpreter/executor.ts` |
| 1.7.14 | Implement `SET_VAR`, `GET_VAR` | `interpreter/executor.ts` |
| 1.7.15 | Implement limits: max 1000 instruction/tick, max runtime | `interpreter/limits.ts` |
| 1.7.16 | Viết test: mỗi command chạy đúng state machine | `__tests__/interpreter.test.ts` |
| 1.7.17 | Viết test: chương trình hoàn chỉnh (line following đơn giản) | `__tests__/interpreter-integration.test.ts` |

### 1.8. Telemetry & Replay

| # | Task | Output |
|---|---|---|
| 1.8.1 | Định nghĩa `TelemetryFrame` type (đầy đủ các trường) | `telemetry/types.ts` |
| 1.8.2 | Viết `TelemetryRecorder` — ghi frame mỗi tick | `telemetry/recorder.ts` |
| 1.8.3 | Viết `ReplayController` — phát lại từ telemetry array | `replay/replayController.ts` |
| 1.8.4 | Viết test: ghi → replay → cùng kết quả | `__tests__/replay.test.ts` |

### 1.9. SimulationCore (tổng hợp)

| # | Task | Output |
|---|---|---|
| 1.9.1 | Viết `SimulationCore` class — kết nối tất cả module | `index.ts` |
| 1.9.2 | Implement `start()`, `pause()`, `resume()`, `step()`, `stop()` | `index.ts` |
| 1.9.3 | Implement `runHeadless()` — chạy không cần DOM | `index.ts` |
| 1.9.4 | Implement events: `tick`, `checkpoint`, `finish`, `error` | `index.ts` |
| 1.9.5 | Implement checkpoint/finishZone detection | `index.ts` |
| 1.9.6 | Viết integration test: robot chạy dò line hoàn chỉnh (IR → finish) | `__tests__/simulation.integration.test.ts` |
| 1.9.7 | Viết deterministic test: 2 lần chạy cùng seed → cùng trajectory | `__tests__/deterministic.test.ts` |

**Đầu ra giai đoạn 1:** Package `@htlab/simulation-core` có thể:
- Chạy trong browser và Node.js
- Load map từ ảnh PNG
- Mô phỏng robot differential drive
- Đọc cảm biến grayscale 5-in-1
- Chạy chương trình IR với interpreter
- Ghi telemetry đầy đủ
- Replay deterministic
- Test coverage > 80%

---

## Giai đoạn 2: Giao diện mô phỏng

**Mục tiêu:** Người dùng thấy robot chạy trên sa bàn, quan sát được giá trị cảm biến và motor.

### 2.1. Khởi tạo client package

| # | Task | Output |
|---|---|---|
| 2.1.1 | Tạo Vite + React project trong `packages/client` | Cấu hình Vite, Tailwind, React Router |
| 2.1.2 | Cấu hình import `@htlab/simulation-core` | Workspace dependency |
| 2.1.3 | Tạo layout cơ bản (Toolbar + Canvas + Panel) | Layout component |
| 2.1.4 | Tạo Zustand stores (`simulationStore`, `mapStore`, `robotConfigStore`) | State management |

### 2.2. PixiJS Renderer

| # | Task | Output |
|---|---|---|
| 2.2.1 | Tạo `PixiApp` wrapper — khởi tạo PixiJS Application | Canvas trong React |
| 2.2.2 | Vẽ map từ `visual.png` lên PixiJS stage | Map sprite |
| 2.2.3 | Vẽ robot (hình chữ nhật + mũi tên hướng) | Robot sprite |
| 2.2.4 | Vẽ 5 điểm cảm biến (màu theo giá trị: đỏ = on line, xanh = off) | Sensor indicators |
| 2.2.5 | Vẽ trajectory (Graphics line, có fade) | Trajectory renderer |
| 2.2.6 | Vẽ checkpoint và finish zone (vòng tròn mờ) | Zone indicators |
| 2.2.7 | Cập nhật renderer mỗi tick từ `TelemetryFrame` | Render loop |

### 2.3. Simulation Controls

| # | Task | Output |
|---|---|---|
| 2.3.1 | Tạo Toolbar component (Run, Pause, Reset, Step, Speed slider) | UI controls |
| 2.3.2 | Tích hợp SimulationCore với React (khởi tạo, start, stop...) | `useSimulation` hook |
| 2.3.3 | Xử lý sự kiện: checkpoint → thông báo, finish → hiển thị kết quả | Event handlers |
| 2.3.4 | Xử lý lỗi: hiển thị lỗi interpreter, timeout... | Error display |

### 2.4. Telemetry Panel

| # | Task | Output |
|---|---|---|
| 2.4.1 | Tạo SensorPanel — hiển thị 5 giá trị cảm biến dạng bar + pattern text | Sensor display |
| 2.4.2 | Tạo MotorPanel — hiển thị tốc độ trái/phải (block speed + physical speed) | Motor display |
| 2.4.3 | Tạo LinePosition chart — biểu đồ line position theo thời gian | Mini chart |
| 2.4.4 | Cập nhật panel mỗi tick | Real-time telemetry |

### 2.5. Map & Robot Config Selector

| # | Task | Output |
|---|---|---|
| 2.5.1 | Tạo MapSelector — load map từ danh sách có sẵn | Map dropdown |
| 2.5.2 | Tạo RobotConfigEditor — form chỉnh sửa RobotConfig | Config form |
| 2.5.3 | Lưu/cache config vào localStorage | Persistence |

**Đầu ra giai đoạn 2:** Ứng dụng web chạy được trên localhost:
- Chọn map, chọn robot config
- Chạy chương trình hard-code (IR viết tay) thấy robot di chuyển
- Xem giá trị sensor, motor speed, trajectory
- Pause, reset, step từng tick

---

## Giai đoạn 3: Blockly và Interpreter

**Mục tiêu:** Học sinh kéo thả block để lập trình robot.

### 3.1. Custom Blocks

| # | Task | Output |
|---|---|---|
| 3.1.1 | Cấu hình Blockly workspace + custom toolbox | Blockly component |
| 3.1.2 | Tạo block `initialize` (motor ports, direction, sensor port) | Block def + codegen |
| 3.1.3 | Tạo block `black and white detection` | Block def + codegen |
| 3.1.4 | Tạo block `patrol line speed X` | Block def + codegen |
| 3.1.5 | Tạo block `patrol line for time speed X time T` | Block def + codegen |
| 3.1.6 | Tạo block `patrol line intersections [left/middle/right] speed X rush T` | Block def + codegen |
| 3.1.7 | Tạo block `turn [left/middle/right] left motor L right motor R` | Block def + codegen |
| 3.1.8 | Tạo block `start motor left L right R time T` | Block def + codegen |
| 3.1.9 | Tạo block `start motor left L right R angle A` | Block def + codegen |
| 3.1.10 | Tạo block `read grayscale sensor Road N` (trả về giá trị) | Block def + codegen |
| 3.1.11 | Tạo block `sensor group detected [left/middle/right]` (boolean) | Block def + codegen |
| 3.1.12 | Tạo block `line position` (trả về số) | Block def + codegen |

### 3.2. IR Code Generator

| # | Task | Output |
|---|---|---|
| 3.2.1 | Viết code generator cho từng block → `IRInstruction` | `blockly/generator.ts` |
| 3.2.2 | Viết `workspaceToIR(workspace)` — duyệt workspace → IR array | `blockly/compiler.ts` |
| 3.2.3 | Xử lý nesting (if/else, loop chứa block bên trong) | `blockly/compiler.ts` |
| 3.2.4 | Validate IR trước khi chạy | `blockly/compiler.ts` |

### 3.3. Workspace management

| # | Task | Output |
|---|---|---|
| 3.3.1 | Lưu workspace (Blockly JSON) vào state | Save/Load UI |
| 3.3.2 | Export IR (JSON) để debug | Export button |
| 3.3.3 | Highlight block đang chạy trong Blockly workspace | Execution highlight |

### 3.4. Tích hợp

| # | Task | Output |
|---|---|---|
| 3.4.1 | Kết nối Blockly → compile IR → SimulationCore.run() | End-to-end flow |
| 3.4.2 | Xử lý lỗi compile (block chưa kết nối, thiếu initialize...) | Error messages |
| 3.4.3 | Tạo một số chương trình mẫu (line following cơ bản, đến giao lộ rẽ trái...) | Examples |

**Đầu ra giai đoạn 3:** Học sinh có thể:
- Kéo thả block để tạo chương trình
- Nhấn Run và xem robot chạy
- Quan sát block đang chạy được highlight
- Debug qua telemetry panel

---

## Giai đoạn 4: Backend

**Mục tiêu:** Người dùng có tài khoản, lưu được bài làm.

### 4.1. Khởi tạo server

| # | Task | Output |
|---|---|---|
| 4.1.1 | Tạo NestJS project trong `packages/server` | Cấu hình NestJS |
| 4.1.2 | Cấu hình Prisma (PostgreSQL connection, schema) | `prisma/schema.prisma` |
| 4.1.3 | Tạo migration đầu tiên | DB schema |
| 4.1.4 | Cấu hình Zod validation pipes | Validation |

### 4.2. Auth module

| # | Task | Output |
|---|---|---|
| 4.2.1 | Register endpoint (email, password, display name) | `POST /auth/register` |
| 4.2.2 | Login endpoint → JWT token | `POST /auth/login` |
| 4.2.3 | JWT guard | Auth middleware |
| 4.2.4 | User profile endpoint | `GET /auth/me` |

### 4.3. Project CRUD

| # | Task | Output |
|---|---|---|
| 4.3.1 | Create project (name, blockly workspace, robot config, map) | `POST /projects` |
| 4.3.2 | List user projects | `GET /projects` |
| 4.3.3 | Get project detail | `GET /projects/:id` |
| 4.3.4 | Update project (workspace, config) | `PUT /projects/:id` |
| 4.3.5 | Delete project | `DELETE /projects/:id` |

### 4.4. Map management

| # | Task | Output |
|---|---|---|
| 4.4.1 | List available maps | `GET /maps` |
| 4.4.2 | Get map detail (metadata) | `GET /maps/:id` |
| 4.4.3 | Upload map (admin) | `POST /maps` |

### 4.5. Simulation run storage

| # | Task | Output |
|---|---|---|
| 4.5.1 | Save simulation result (telemetry summary) | `POST /runs` |
| 4.5.2 | List user's runs | `GET /runs` |
| 4.5.3 | Get run detail (full telemetry) | `GET /runs/:id` |

**Đầu ra giai đoạn 4:** Có backend hoàn chỉnh:
- Đăng ký / đăng nhập
- Lưu và load project
- Lưu kết quả chạy

---

## Giai đoạn 5: Leaderboard và Headless Simulation

**Mục tiêu:** Tổ chức challenge, xác thực kết quả phía server.

### 5.1. Job Queue

| # | Task | Output |
|---|---|---|
| 5.1.1 | Cài đặt BullMQ + Redis | Queue setup |
| 5.1.2 | Tạo `SimulationJob` — nhận IR, config, mapId, seed | Job data type |
| 5.1.3 | Tạo worker — chạy SimulationCore.runHeadless() | Worker process |
| 5.1.4 | Lưu kết quả vào DB sau khi hoàn thành | Result storage |

### 5.2. Submission flow

| # | Task | Output |
|---|---|---|
| 5.2.1 | Submit endpoint — nhận program + config + client result claim | `POST /submissions` |
| 5.2.2 | Server chạy headless simulation | So sánh với client claim |
| 5.2.3 | Nếu khớp → ghi nhận, không khớp → reject | Verification |
| 5.2.4 | Polling endpoint — client kiểm tra trạng thái | `GET /submissions/:id` |

### 5.3. Leaderboard

| # | Task | Output |
|---|---|---|
| 5.3.1 | Leaderboard query (theo map, theo challenge) | `GET /leaderboard` |
| 5.3.2 | Hiển thị leaderboard trên client | Leaderboard component |

**Đầu ra giai đoạn 5:** Có thể tổ chức challenge:
- Nộp bài → server xác thực → lên bảng xếp hạng
- Chống gian lận bằng headless simulation

---

## Giai đoạn 6: Hệ sinh thái huấn luyện

**Mục tiêu:** HTLAB trở thành nền tảng huấn luyện hoàn chỉnh.

### 6.1. Lesson mode

| # | Task |
|---|---|
| 6.1.1 | Giáo viên tạo bài học (mô tả, map, giới hạn block) |
| 6.1.2 | Học sinh làm bài trong khuôn khổ |
| 6.1.3 | Giáo viên xem kết quả từng học sinh |

### 6.2. PID Visualizer

| # | Task |
|---|---|
| 6.2.1 | Biểu đồ real-time: error, P, I, D, output |
| 6.2.2 | Cho phép điều chỉnh Kp, Ki, Kd khi đang chạy |
| 6.2.3 | So sánh 2 bộ PID khác nhau |

### 6.3. Map Editor

| # | Task |
|---|---|
| 6.3.1 | Vẽ line, checkpoint, finish zone trên canvas |
| 6.3.2 | Export thành PNG + metadata JSON |
| 6.3.3 | Import map vào simulator |

### 6.4. Classroom Dashboard

| # | Task |
|---|---|
| 6.4.1 | Giáo viên tạo lớp học, thêm học sinh |
| 6.4.2 | Giao bài tập cho lớp |
| 6.4.3 | Dashboard tổng quan tiến độ |

### 6.5. Export code

| # | Task |
|---|---|
| 6.5.1 | IR → Arduino/C++ code |
| 6.5.2 | IR → MicroPython code |
| 6.5.3 | Tùy chỉnh template theo nền tảng phần cứng |

---

## Phụ thuộc giữa các giai đoạn

```
G1 (SimulationCore) ──┐
                       ├──→ G2 (UI Renderer) ──┐
                       │                        ├──→ G3 (Blockly) ──→ G4 (Backend) ──→ G5 (Leaderboard) ──→ G6 (Ecosystem)
                       └────────────────────────┘
```

- G2 và G3 có thể làm song song một phần (UI renderer không cần Blockly, Blockly không cần UI đẹp)
- G4 phụ thuộc vào G3 (cần IR format ổn định để thiết kế DB schema)
- G5 phụ thuộc vào G4 (cần backend để chạy headless)
- G6 là tập hợp các tính năng độc lập, có thể làm dần

---

## Tiêu chí chuyển giai đoạn

| Giai đoạn | Điều kiện chuyển |
|---|---|
| G1 → G2 | SimulationCore chạy được robot dò line bằng IR hard-code, test coverage > 80%, replay deterministic |
| G2 → G3 | Render được map + robot + trajectory, có Run/Pause/Reset/Step, telemetry panel hoạt động |
| G3 → G4 | Học sinh kéo thả block → robot chạy, đủ 8 block Robotics cơ bản |
| G4 → G5 | Auth hoạt động, lưu/load project, lưu kết quả chạy |
| G5 → G6 | Headless simulation khớp client, leaderboard hoạt động |

---

## Quy tắc phát triển

1. **SimulationCore không được import từ React, Phaser/PixiJS, hoặc bất kỳ thư viện UI nào**
2. **Mỗi module trong SimulationCore phải test được độc lập, không cần DOM**
3. **Mọi thay đổi IR format phải cập nhật cả client (codegen) lẫn SimulationCore (interpreter)**
4. **Không thêm tính năng mới cho đến khi tính năng hiện tại có test**
5. **Blockly blocks phải sinh IR, không sinh JavaScript**
