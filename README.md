# HTLAB

**Nền tảng mô phỏng sa bàn ảo và lập trình khối lệnh cho Robotics**

HTLAB là nền tảng web giúp học sinh luyện tập lập trình robot trên sa bàn ảo thông qua giao diện kéo thả khối lệnh (Blockly). Dự án kết hợp mô phỏng vật lý 2D deterministic, hệ thống telemetry và headless simulation để hỗ trợ học, thử nghiệm thuật toán và huấn luyện thi đấu Robotics.

Mục tiêu dài hạn: trở thành môi trường luyện tập Digital Twin cho các bài toán robot dò line, điều khiển vi sai, xử lý cảm biến và tối ưu thời gian chạy sa bàn.

## 1. Bối cảnh và vấn đề

Trong huấn luyện Robotics, đặc biệt với các bài thi dạng sa bàn như EnjoyAI, học sinh và giáo viên gặp các hạn chế:

- Không đủ robot hoặc sa bàn vật lý cho tất cả học sinh.
- Thử sai thuật toán tốn thời gian, dễ hỏng thiết bị hoặc lệch cấu hình.
- Khó quan sát trực tiếp giá trị cảm biến, sai số, tốc độ động cơ và quỹ đạo.
- Giáo viên khó so sánh nhiều lần chạy, phân tích nguyên nhân robot chạy sai.
- Khi thi trực tuyến, kết quả từ client có nguy cơ bị can thiệp.

HTLAB giải quyết các vấn đề trên bằng môi trường mô phỏng chạy trên trình duyệt, có ghi log, replay và xác thực kết quả phía server.

## 2. Mô hình robot và cảm biến

### 2.1. Robot

- **Loại:** Differential drive (2 bánh chủ động)
- **Kích thước tối đa:** 30 x 30 cm
- **Tham số configurable:** wheelbase, wheelRadius, maxSpeed, maxAccel, friction, deadzone, noise
- **Cấu hình:** lưu trong `RobotConfig`, có thể tạo nhiều preset

### 2.2. Cảm biến Grayscale 5-in-1

Cảm biến dò line chính, mô phỏng theo mô hình WhalesBot/EnjoyAI:

- **5 mắt** (Road 1 → Road 5), bố trí hàng ngang phía trước robot
- **Giá trị:** 0 (nền trắng) → 100 (line đen)
- **Pattern nhị phân:** mỗi mắt on/off theo threshold, tạo pattern như `00100`, `01110`, `11100`
- **Nhóm cảm biến:** left (Road 1-2-3), middle (Road 2-3-4), right (Road 3-4-5)
- **Line position:** tính bằng trọng số, dùng cho P-controller dò line
- **Hiệu chuẩn:** black-and-white detection bắt buộc trước khi dò line
- **Noise:** sensorNoise, sensorBias, latency có thể cấu hình theo chế độ luyện tập

Chi tiết: xem [docs/cam-bien-grayscale-5-in-1.md](docs/cam-bien-grayscale-5-in-1.md)

## 3. Mô hình lập trình

### 3.1. Blockly → IR → Interpreter

Blockly không sinh JavaScript. Thay vào đó:

```
Blockly workspace → Code Generator → IR (JSON) → Interpreter → MotorCommand mỗi tick
```

- **IR (Intermediate Representation):** tập lệnh domain-specific, mỗi block là một stateful command
- **Interpreter:** chạy step-by-step mỗi simulation tick, giới hạn 1000 instruction/tick
- **Kết quả:** deterministic, an toàn, chạy được cả trên browser và headless

### 3.2. Các block chính

| Nhóm | Block |
|---|---|
| Hardware | `initialize`, `black and white detection` |
| Dò line | `patrol line`, `patrol line for time`, `patrol line intersections` |
| Rẽ | `turn [left/middle/right]` |
| Motor thuần | `start motor time`, `start motor angle` |
| Cảm biến | `read grayscale sensor`, `sensor group detected`, `line position` |
| Logic | `if/else`, `repeat`, `while`, `wait` |
| Biến & Math | `set/get variable`, toán tử cơ bản |

### 3.3. Các command chính trong IR

```
INIT_HARDWARE, CALIBRATE_GRAYSCALE, SET_MOTOR, WAIT_TICKS,
READ_SENSOR_ROAD, READ_SENSOR_GROUP, READ_LINE_POSITION,
IF_SENSOR_VALUE, IF_GROUP_DETECTED,
SET_VAR, LABEL, JUMP, LOOP_START, LOOP_END,
END_PROGRAM
```

## 4. Map (sa bàn)

- **Định dạng:** ảnh PNG (top-down) + file metadata JSON
- **Kích thước:** configurable (VD: 2400x1200mm, scale 1px = 1mm)
- **Sensor sampling:** SimulationCore đọc pixel trực tiếp từ ImageData (browser) hoặc sharp buffer (Node.js headless)
- **Metadata:** chứa kích thước, scale, calibration defaults, checkpoint, finishZone, startPose
- **Tạo map:** vẽ bằng bất kỳ phần mềm đồ họa nào, thêm file JSON metadata

## 5. Kiến trúc hệ thống

```
┌────────────────────────────────────────┐
│            Client (Browser)            │
│                                        │
│  React (UI)   Blockly (Editor)         │
│       │            │                   │
│       └────────────┼───────────────┐   │
│                    │               │   │
│           PixiJS 8 (Renderer)      │   │
│                    │               │   │
│            SimulationCore + Interpreter │
└────────────────────┼───────────────────┘
                     │
          ┌──────────▼──────────┐
          │   Backend (NestJS)  │
          │                     │
          │  REST API (JWT)     │
          │  Headless Sim Runner│
          │  BullMQ Worker      │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │ PostgreSQL + Redis  │
          └─────────────────────┘
```

### Nguyên tắc cốt lõi

1. **SimulationCore là package riêng, zero dependencies** — chạy được trên browser và Node.js
2. **PixiJS chỉ render** — không chứa logic vật lý
3. **Fixed timestep 60Hz** — kết quả không phụ thuộc FPS máy
4. **Deterministic** — cùng chương trình + seed + config = cùng kết quả
5. **Blockly sinh IR, không sinh JS** — an toàn, kiểm soát được

## 6. Stack công nghệ

| Layer | Công nghệ |
|---|---|
| Simulation Core | TypeScript (strict), zero deps, vitest |
| Client UI | React 18, Vite, Tailwind CSS, Zustand |
| Client Renderer | PixiJS 8 |
| Block Editor | Blockly (npm) + custom blocks + IR codegen |
| Backend | NestJS, Prisma, Zod, JWT |
| Database | PostgreSQL + JSONB |
| Job Queue | BullMQ (Redis) |
| Monorepo | Turborepo + pnpm workspaces |

Chi tiết: xem [docs/technology-stack.md](docs/technology-stack.md)

## 7. MVP

Phạm vi MVP được thu hẹp để chứng minh phần khó nhất: robot mô phỏng đúng, cảm biến đọc đúng, thuật toán debug được.

### Trong MVP

- 1 sa bàn mẫu (PNG + metadata)
- 1 robot differential drive (configurable qua RobotConfig)
- Cảm biến Grayscale 5-in-1 đầy đủ (đọc, calibrate, pattern, group, line position)
- Blockly với ~12 custom blocks (initialize, calibrate, patrol line x3, turn, motor x2, sensor x3, + logic/variable cơ bản)
- Interpreter chạy IR step-by-step mỗi tick
- Run, Pause, Reset, Step, Speed control
- Telemetry panel: 5 giá trị sensor, motor speed, trajectory, pattern text
- Telemetry recorder + replay deterministic từ file log
- Giao diện React + PixiJS đầy đủ (map, robot, sensor indicators, trajectory)
- Lưu/load project (localStorage cho MVP chưa có backend)

### Ngoài MVP

- Backend, auth, database
- Nhiều loại robot, nhiều sa bàn
- Classroom, lesson mode
- Leaderboard + headless verification
- Map editor
- PID visualizer
- Export code cho robot thật

## 8. Lộ trình triển khai

| Giai đoạn | Nội dung chính | Đầu ra |
|---|---|---|
| **G1: SimulationCore** | Robot kinematics, sensor model, map loader, physics, interpreter (8 command), telemetry, replay. Test coverage > 80%. | Robot chạy dò line bằng IR hard-code, deterministic replay |
| **G2: Giao diện** | React shell, PixiJS renderer, run/pause/reset/step, telemetry panel | Nhìn thấy robot chạy, debug được sensor |
| **G3: Blockly** | Custom blocks, custom toolbox, IR code generator, workspace save/load | Kéo thả block lập trình robot |
| **G4: Backend** | NestJS, Prisma, auth (JWT), project CRUD, map upload, run storage | Tài khoản, lưu bài làm |
| **G5: Leaderboard** | BullMQ headless worker, submission flow, result verification, leaderboard UI | Thi đấu online có xác thực |
| **G6: Ecosystem** | Lesson mode, classroom dashboard, map editor, PID visualizer, code export | Nền tảng huấn luyện hoàn chỉnh |

Chi tiết: xem [docs/implementation-plan.md](docs/implementation-plan.md)

## 9. Tiêu chí thành công

Một prototype được xem là thành công nếu:

- Robot chạy theo line trên sa bàn mẫu
- Học sinh điều khiển robot bằng Blockly
- Giá trị 5 cảm biến hiển thị rõ ràng theo thời gian thực
- Quan sát được trajectory của robot
- Pause, reset, step, replay hoạt động
- Cùng chương trình + seed + config → kết quả giống nhau qua mọi lần chạy
- SimulationCore chạy độc lập khỏi UI, test được không cần DOM

## 10. Tài liệu chi tiết

| Tài liệu | Nội dung |
|---|---|
| [docs/cam-bien-grayscale-5-in-1.md](docs/cam-bien-grayscale-5-in-1.md) | Mô hình cảm biến, calibration, pattern, group, line position, noise |
| [docs/technology-stack.md](docs/technology-stack.md) | Stack công nghệ, kiến trúc, database schema, cấu trúc monorepo |
| [docs/implementation-plan.md](docs/implementation-plan.md) | Kế hoạch triển khai chi tiết 6 giai đoạn, task breakdown, dependencies |

## 11. Rủi ro và hướng xử lý

| Rủi ro | Xử lý |
|---|---|
| Khoảng cách mô phỏng - thực tế | Noise, trễ motor, ma sát, sai số bánh xe đều configurable. Đánh giá qua nhiều seed. |
| SimulationCore phụ thuộc UI | Package riêng, PixiJS chỉ render state, mọi physics qua API SimulationCore |
| Leaderboard gian lận | Backend chạy headless simulation, lưu version + seed + IR, từ chối nếu không khớp |
| Blockly sinh code quá tự do | Sinh IR thay vì JS, interpreter giới hạn instruction/tick và runtime |
| Phạm vi phình to quá sớm | MVP chỉ tập trung SimulationCore + renderer + Blockly. Backend làm sau. |
