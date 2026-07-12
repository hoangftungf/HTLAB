# Stage 02 — Scope (go/no-go)

Scope = features chosen by IMPACT × COST, inside your time budget.
KILL here is cheap and smart. Killing a weak idea at this gate is a SUCCESS outcome.

## Impact rubric (business value — score BEFORE looking at cost)

| Impact | Meaning |
|---|---|
| H | moves money or the core promise: gets users in (acquisition), gets them paying (revenue), or delivers the one job they came for |
| M | keeps users / saves real time weekly (retention, operations) |
| L | nice-to-have; nobody would pay for or switch over it |

## AI coding grade rubric

| Grade | Meaning | Examples |
|---|---|---|
| A | cheap for AI | CRUD, forms, dashboards, content sites, API wrappers |
| B | moderate | file processing, 3rd-party integrations, auth via library, single LLM call, HITL AI drafts |
| C | expensive | realtime, payments from scratch, custom auth, autonomous agentic AI pipelines, heavy concurrency |

## Gate — check ALL before `/flow next`
- [x] Every feature below has an IMPACT (H/M/L with the business reason) AND a grade (A/B/C)
- [x] No L-impact feature above grade A survives in v1
- [x] The suggested-features section was actually considered (each suggestion has an in/out decision)
- [x] fit(grades, budget) holds — every C in scope is justified as path 1, 2, or 3 above (written next to the feature)
- [x] If the product IS a C feature: it is FIRST in build order, and its sibling C features are on the cut list
- [x] The cut list is written (what I am NOT building in v1)
- [x] GO / KILL decision is written below
- [x] No FILL placeholders remain in this file

## Time budget

~40 giờ làm việc (tương đương 2 tuần full-time 1 người, hoặc 1 tháng bán thời gian)

## Features in v1 (each with impact AND grade)

### G1: SimulationCore

- **Robot kinematics (differential drive)** — H (core promise: robot chạy được) — B (custom physics model, nhưng tài liệu kinematics có sẵn) — cập nhật vị trí, góc, vận tốc mỗi tick dựa trên motor speed trái/phải, ma sát, deadzone
- **Grayscale 5-in-1 sensor model** — H (core promise: dò line là bài toán chính) — C — PATH 1: ĐÂY LÀ SẢN PHẨM. Đọc pixel từ map, tính pattern 5 mắt, line position trọng số, noise/bias/latency configurable, black-and-white calibration. Là tính năng C khó nhất — làm ĐẦU TIÊN.
- **Map loader** — H (không có map = không có gì để chạy) — A (đọc PNG + JSON metadata)
- **IR interpreter** — H (chạy chương trình người dùng) — C — PATH 2: re-architect từ "custom VM" xuống B: interpreter đơn giản với ~8 lệnh chính (SET_MOTOR, WAIT_TICKS, READ_SENSOR, IF_SENSOR_VALUE, SET_VAR, LABEL, JUMP, END_PROGRAM), giới hạn 1000 instruction/tick. Không làm multi-threaded, không JIT.
- **Telemetry recorder + replay** — M (giáo viên debug được, giữ chân người dùng) — B (JSONL log mỗi tick, đọc lại replay)

### G2: Giao diện

- **React shell + PixiJS renderer** — H (nhìn thấy robot chạy) — A (React layout + PixiJS vẽ robot, map, sensor indicators, trajectory)
- **Simulation controls** (run/pause/reset/step/speed) — M (trải nghiệm người dùng) — A (button bar + keyboard shortcuts)
- **Telemetry panel** (5 sensor values, motor speed, trajectory, pattern text) — M (debug không cần đoán) — A (component hiển thị số + mini chart)

### G3: Blockly

- **Custom Blockly blocks** (~12 blocks: init, calibrate, patrol line x3, turn, motor x2, sensor x3, logic cơ bản) — H (không code text được — Blockly là cách duy nhất học sinh dùng) — B (custom Blockly blocks + custom toolbox, có tài liệu Blockly API đầy đủ)
- **IR code generator** (Blockly → IR JSON) — H (cầu nối Blockly → interpreter) — B (Blockly generator stub → JSON, mỗi block type có 1 generator function)
- **Project save/load** — M (tiếp tục bài làm sau) — A (localStorage JSON, chưa cần backend)

## Suggested features (impact-first — proposed, not decided)

- **Shareable replay link** — M (giáo viên muốn gửi replay cho học sinh/phụ huynh xem) — B (encode telemetry log → URL hash, decode + replay) — OUT: phụ thuộc vào backend hoặc URL quá dài với dữ liệu telemetry. Để G4.
- **Map editor** — L (nice-to-have, người dùng chính là học sinh không cần tạo map) — B (canvas editor cho map) — OUT: giáo viên có thể dùng Photoshop/bất kỳ phần mềm đồ họa nào để vẽ map. Không phải v1.
- **Multi-robot race mode** — M (hấp dẫn cho thi đấu, giữ chân học sinh) — C (multi-agent physics, collision, đồng bộ hóa) — OUT: quá phức tạp cho MVP. Để G5/G6.

## Cut list (NOT in v1 — deferred, not deleted)

- Backend (NestJS, Prisma, JWT auth) → G4
- PostgreSQL + Redis + BullMQ → G4
- Leaderboard + headless verification → G5
- Classroom management, lesson mode → G6
- Map editor → G6
- PID visualizer → G6
- Code export cho robot thật → G6
- Multi-robot race mode → G6
- Shareable replay link → G4
- Đăng nhập / tài khoản người dùng → G4

## Decision

**GO** — MVP tập trung vào phần khó nhất (SimulationCore deterministic + Grayscale sensor + IR interpreter) và chứng minh được giá trị cốt lõi (nhìn thấy robot dò line + debug bằng dữ liệu). Không backend, không auth — chỉ client-side với localStorage. Các tính năng C được xử lý: Grayscale sensor là path 1 (đây là sản phẩm, xây dựng đầu tiên), IR interpreter re-architect xuống B (đơn giản, 8 lệnh, giới hạn instruction/tick). Thời gian 40 giờ là khả thi cho scope này với AI hỗ trợ.
