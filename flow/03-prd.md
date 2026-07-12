# Stage 03 — PRD

1-2 pages max. Test: could a stranger build v1 from this without asking you anything?

## Gate — check ALL before `/flow next`
- [x] Every section below is filled from MY scope decision (stage 02), not re-expanded
- [x] Success metric is a NUMBER, not vibes ("save time" fails; "first response < 2h" passes)
- [x] Each feature names the user action and the observable result, tagged with a stable `FRn:` id
- [x] Pain & gain is a MAPPING TABLE: every pain cites evidence (a stage-01 quote or a named observation), and names the v1 feature that kills it; every v1 feature kills at least one pain
- [x] A stranger could build v1 from this without asking me anything
- [x] No FILL placeholders remain in this file

## Context

HTLAB là nền tảng web mô phỏng sa bàn ảo cho lập trình Robotics, nhắm đến học sinh và giáo viên tham gia cuộc thi EnjoyAI tại Việt Nam. Học sinh lập trình robot differential drive bằng Blockly, chạy mô phỏng trên sa bàn ảo với cảm biến grayscale 5 mắt, xem dữ liệu cảm biến và trajectory theo thời gian thực. Giáo viên dùng telemetry replay để phân tích và chấm bài. MVP là client-side only (React + PixiJS + Blockly, không backend), chạy hoàn toàn trên trình duyệt.

## Target users

- **Học sinh THCS-THPT** (12-17 tuổi): đã biết cơ bản về lập trình kéo thả, đang học Robotics, cần luyện tập thuật toán dò line cho kỳ thi EnjoyAI. Không có robot ở nhà. Dùng Blockly vì chưa thành thạo Python/C++.
- **Giáo viên/Huấn luyện viên Robotics**: phụ trách 20-30 học sinh/đội tuyển, cần công cụ để kiểm tra thuật toán của học sinh trước khi chạy thật, so sánh nhiều lần chạy, chỉ ra lỗi chính xác qua dữ liệu cảm biến.

## Pain & gain (mapping table — the traceability spine of the PRD)

| # | Persona | Pain (concrete) | Evidence (stage-01 quote/source or named observation) | Today's workaround | V1 feature that kills it | Observable gain |
|---|---|---|---|---|---|---|
| P1 | Học sinh | Không có robot/sa bàn ở nhà để luyện tập | "Con em tham gia CLB Robotics... ở nhà không có robot để test" — phụ huynh nhóm Zalo EnjoyAI | Viết thuật toán ra giấy, tưởng tượng robot chạy | SimulationCore + Map loader (FR1, FR2) | Mở browser, load sa bàn, chạy robot — không cần thiết bị vật lý |
| P2 | Học sinh | Chạy robot xong không biết tại sao sai | "Tụi em lập trình robot xong... chạy sai mà không biết tại sao" — học sinh khóa hè CLB STEM | Nhìn bằng mắt thường, đoán | Telemetry panel real-time (FR5) | Nhìn thấy giá trị 5 cảm biến, motor speed, pattern từng tick |
| P3 | Giáo viên | Không thể kiểm tra thuật toán của 30 học sinh với 3 sa bàn | "Học sinh của tôi chỉ có 2-3 buổi chạy thử trên sa bàn thật" — giáo viên THCS Tân Bình | Học sinh xếp hàng chờ, mỗi em 2-3 lần/buổi | SimulationCore + Project save/load (FR1, FR8) | Mỗi học sinh chạy 20-30 lần/buổi, không cần xếp hàng |
| P4 | Giáo viên | Không so sánh được nhiều lần chạy để phân tích lỗi | "Không ai thấy được giá trị cảm biến lúc robot đang chạy" — học sinh CLB STEM | Đoán, quay video điện thoại | Telemetry recorder + replay (FR6) | Replay chính xác từng tick, so sánh 2 lần chạy cạnh nhau |
| P5 | Cả hai | Không lập trình được nếu không biết code text | Blockly là yêu cầu từ các cuộc thi EnjoyAI, học sinh quen kéo thả | Học Python cơ bản trước (2-3 tháng) | Blockly editor + IR codegen (FR7, FR3) | Kéo thả block, bấm Run, robot chạy — không cần biết code |
| P6 | Học sinh | Không biết thuật toán dò line của mình có hoạt động không | "Cô giáo bắt viết thuật toán ra giấy rồi tưởng tượng" — phụ huynh | Tưởng tượng | Grayscale 5-in-1 sensor + P-controller dò line (FR4) | Nhìn robot đi theo line trên sa bàn ảo, thấy line position real-time |

### Pains NOT addressed in v1 (deliberate — tie to the scope cut list)

- Không xác thực được kết quả thi đấu online (lo ngại gian lận client) → G5: Backend headless verification
- Không quản lý được danh sách học sinh, bài làm → G4: Backend + database
- Không so sánh điểm với bạn bè (thiếu yếu tố cạnh tranh) → G5: Leaderboard

## Problem statement

Học sinh và giáo viên Robotics EnjoyAI cần một môi trường sa bàn ảo nơi họ có thể lập trình robot bằng Blockly, chạy mô phỏng với cảm biến grayscale chính xác, và xem dữ liệu cảm biến theo thời gian thực — tất cả trên trình duyệt, không cần thiết bị vật lý.

## Features (user-centric — action → observable result)

- **FR1:** As a học sinh, tôi mở browser, load 1 sa bàn mẫu, đặt robot lên vị trí bắt đầu, bấm Run, và tôi thấy robot di chuyển trên sa bàn với chuyển động differential drive chân thực (có quán tính, ma sát).
- **FR2:** As a học sinh, tôi chạy chương trình dò line có sẵn, và tôi thấy robot đi theo line đen trên sa bàn, không bị trôi ra ngoài khi vào cua.
- **FR3:** As a học sinh, tôi viết chương trình bằng Blockly, và hệ thống tự động sinh ra IR để interpreter chạy — tôi không cần biết IR là gì.
- **FR4:** As a học sinh, tôi đọc được giá trị của từng mắt trong cảm biến grayscale 5-in-1 (Road 1→5) khi robot đang chạy, và tôi thấy pattern (VD: `00100`, `01110`) hiển thị theo thời gian thực.
- **FR5:** As a học sinh, tôi mở telemetry panel và thấy: 5 giá trị sensor dạng số + biểu đồ nhỏ, tốc độ 2 motor, trajectory robot (đường màu trên map), và pattern text.
- **FR6:** As a giáo viên, tôi chạy robot, ghi lại toàn bộ telemetry, replay chính xác lần chạy đó, pause/step để phân tích từng thời điểm robot ra quyết định, và so sánh 2 lần replay của 2 học sinh khác nhau.
- **FR7:** As a học sinh, tôi kéo thả ~12 block được thiết kế riêng cho EnjoyAI (initialize, calibrate grayscale, patrol line, turn left/middle/right, start motor, read sensor, if sensor value, repeat, wait, set/get variable) và toolbox được tổ chức theo nhóm hợp lý.
- **FR8:** As a học sinh, tôi lưu bài làm xuống máy (localStorage), tải lại sau, và tiếp tục chỉnh sửa — không mất dữ liệu khi đóng browser.

## Non-functional requirements

- **Deterministic:** Cùng chương trình + seed + config → cùng kết quả (vị trí, cảm biến, thời gian) qua mọi lần chạy và mọi máy. Đây là NFR quan trọng nhất.
- **60fps fixed timestep:** Mô phỏng chạy 60 tick/giây, không phụ thuộc FPS render. Nếu render chậm, vật lý vẫn chạy đúng.
- **Offline-first:** Chạy hoàn toàn trên browser, không cần internet sau lần load đầu tiên.
- **Performance:** 60fps render với 1 robot + 1 map 2400x1200px + trajectory tối đa 10,000 điểm. Không giật lag khi telemetry panel đang hiển thị.
- **Zero runtime dependencies cho SimulationCore:** SimulationCore là package riêng, không import bất kỳ thư viện ngoài nào — chạy được trên browser và Node.js headless.
- **Browser:** Chrome, Edge, Firefox (2 phiên bản gần nhất). Không cần Safari cho MVP.

## Tech stack

| Layer | Công nghệ |
|---|---|
| Simulation Core | TypeScript (strict), zero deps, vitest |
| Client UI | React 18, Vite, Tailwind CSS, Zustand |
| Client Renderer | PixiJS 8 |
| Block Editor | Blockly (npm) + custom blocks + IR codegen |
| Monorepo | Turborepo + pnpm workspaces |
| Testing | vitest (SimulationCore), Playwright (UI smoke) |

## Success metric (numbers only)

- Học sinh lớp 7 (12 tuổi) tự load sa bàn, kéo 5 block tạo chương trình dò line cơ bản, và thấy robot chạy theo line trong **dưới 5 phút** kể từ lần đầu mở browser.
- SimulationCore test coverage **> 80%**, tất cả test passed.
- Cùng chương trình + seed chạy **5 lần** cho ra **cùng trajectory** (sai khác 0 pixel — deterministic).
- 1 robot + map 2400x1200 render ở **≥ 55fps** trên laptop Core i5, 8GB RAM.
- 1 học sinh chạy được **ít nhất 20 lần** trong 1 buổi 90 phút (bao gồm thời gian chỉnh sửa Blockly).
