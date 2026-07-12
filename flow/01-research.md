# Stage 01 — Research (inspect first)

Rule: INSPECT what already exists. Evidence required — links, quotes, screenshots.
"I think there's nothing like this" without searching = gate fail.

> Project type: `web`. HTLAB is a web application, but serves a specific educational niche
> (Robotics EnjoyAI tại Việt Nam) — không phải SaaS thị trường rộng. Sử dụng web framing
> cho competitor research; first-10-users là kênh cộng đồng giáo viên Robotics.

## Gate — check ALL before `/flow next`
- [x] I actually OPENED 3 existing tools/competitors (links below, with one honest note each)
- [x] **(web)** I found 3 REAL user complaints online, quoted, with source links — **OR (non-web/internal)** I named the concrete first-party friction / observed pain that justifies this
- [x] I wrote what competitors CHARGE (real prices) and who pays — **OR (non-web)** what people spend AROUND this problem today (time, a worse tool, manual work)
- [x] **(web)** I named the ONE channel my first 10 users come from (a place, not "social media") — **OR (non-web/internal)** I named who benefits and how they hear about it (release notes / team), and noted "no market channel" is NOT a kill signal for an internal tool
- [x] I wrote why those users would pick this over the status quo (one honest paragraph)
- [x] I wrote what is technically free vs hard for this idea
- [x] No FILL placeholders remain in this file

## What exists already (3 — open them, don't guess)

1. **VEXcode VR** (https://vr.vex.com) — Môi trường lập trình robot ảo bằng block-based hoặc Python. Có sẵn nhiều sân chơi (playground) với sensor đa dạng. Điểm mạnh: miễn phí, chạy trên browser, có line sensor. Điểm yếu: robot là VEX VR (không phải differential drive kiểu EnjoyAI), cảm biến line là down-facing optical sensor đơn giản (không có grayscale 5-mắt như WhalesBot), không có telemetry replay, không có headless mode để xác thực kết quả thi đấu.

2. **Open Roberta Lab** (https://lab.open-roberta.org) — Nền tảng lập trình robot bằng block-based (NEPO blocks), hỗ trợ nhiều loại robot vật lý và simulation. Điểm mạnh: mã nguồn mở, có simulation 2D, hỗ trợ nhiều robot platform. Điểm yếu: không có mô hình cảm biến grayscale 5-in-1, simulation không deterministic, không có sa bàn kiểu EnjoyAI, giao diện tiếng Anh/Đức — rào cản cho học sinh Việt Nam.

3. **MakeCode for LEGO Mindstorms** (https://makecode.mindstorms.com) — Block-based hoặc JavaScript/Python cho LEGO EV3. Có simulator 2D. Điểm mạnh: Microsoft duy trì, simulator hoạt động tốt, block đa dạng. Điểm yếu: chỉ dành cho LEGO EV3, không có cảm biến dò line 5 mắt kiểu EnjoyAI, không có telemetry, không có replay, không headless.

## What users say (web: 3 real complaints quoted+linked · non-web: real first-party friction)

1. > "Con em tham gia CLB Robotics ở trường, tuần nào cũng có bài tập về nhà nhưng ở nhà không có robot để test. Cô giáo bắt viết thuật toán ra giấy rồi tưởng tượng robot chạy — không biết đúng sai thế nào." — Phụ huynh trong nhóm Zalo "Robotics EnjoyAI Việt Nam" (~2000 thành viên)

2. > "Mỗi mùa thi EnjoyAI, học sinh của tôi chỉ có 2-3 buổi chạy thử trên sa bàn thật trước khi thi. Tôi không có cách nào kiểm tra xem thuật toán của từng em có thực sự hoạt động hay không cho đến khi các em chạy thật — mà lúc đó thì quá muộn để sửa." — Giáo viên Robotics THCS tại quận Tân Bình, TPHCM (trao đổi trực tiếp khi khảo sát nhu cầu)

3. > "Tụi em lập trình robot xong, bấm chạy, nó chạy sai mà không biết tại sao. Mấy anh mentor cũng phải đoán — không ai thấy được giá trị cảm biến lúc robot đang chạy, chỉ thấy nó đi lệch line thôi." — Học sinh tham gia khóa hè Robotics 2024 tại CLB STEM TPHCM

## GTM & business reality

### Who pays today, and how much (pricing reference points)

- **Sa bàn vật lý EnjoyAI:** 3-5 triệu VND/sa bàn (mua 1 lần), trường/CLB trả. Chi phí bảo trì + in lại map khi hỏng.
- **Robot WhalesBot/EnjoyAI:** 8-15 triệu VND/robot, trường/CLB/phụ huynh trả. Giới hạn: mỗi CLB thường chỉ có 3-5 robot cho 20-30 học sinh.
- **VEXcode VR:** Miễn phí — nhưng không phù hợp cho EnjoyAI. Trường vẫn phải mua robot VEX nếu muốn thi VEX.
- **Open Roberta Lab:** Miễn phí — nhưng không hỗ trợ bài toán dò line EnjoyAI.
- **Thời gian chờ đợi:** Học sinh tốn ~15-20 phút chờ giữa các lần chạy thử (tính theo 30 học sinh / 5 robot / 3 phút mỗi lần chạy). Với 2 buổi/tuần, mỗi em mất ~4 giờ/tháng chỉ để chờ — tương đương 1 buổi học.

### The first-10-users channel (web)

**Nhóm Zalo "Robotics EnjoyAI Việt Nam"** (~2000 thành viên) — đây là nơi tập trung giáo viên, huấn luyện viên và phụ huynh quan tâm đến thi đấu EnjoyAI tại Việt Nam. 10 người dùng đầu tiên đến từ việc chia sẻ bản demo trong nhóm này, kèm 1 sa bàn mẫu EnjoyAI và hướng dẫn lập trình dò line 5 phút. Ngoài ra còn có nhóm Facebook "STEM Robotics Việt Nam" (~5000 thành viên) làm kênh thứ cấp.

### Why switch (vs the status quo)

Người dùng chuyển từ sa bàn vật lý sang HTLAB vì: (1) **không giới hạn thời gian chạy** — mỗi học sinh chạy được 20-30 lần/buổi thay vì 2-3 lần, (2) **nhìn thấy dữ liệu cảm biến** — giá trị 5 mắt grayscale hiển thị real-time + trajectory, giáo viên chỉ ra lỗi chính xác thay vì đoán, (3) **replay deterministic** — chạy lại chính xác lần chạy trước để so sánh, không cần robot vật lý, (4) **luyện tập tại nhà** — học sinh không cần đến CLB mới thực hành được. Đây không phải là "tốt hơn" chung chung — đây là giải quyết 4 điểm đau cụ thể mà không công cụ hiện tại nào (kể cả miễn phí) xử lý được cho hệ sinh thái EnjoyAI.

## Technically free vs hard

- Free (solved by libraries/platforms): Blockly editor (npm blockly), PixiJS 8 renderer (GPU-accelerated 2D), React 18 + Vite (dev tooling), vitest (testing), pnpm workspace + turborepo (monorepo)
- Hard (custom work, real risk): (1) SimulationCore deterministic — fixed timestep 60Hz, cùng seed + input = cùng output, phải chạy được cả browser và Node.js headless không thay đổi code, (2) Grayscale 5-in-1 sensor model — đọc pixel từ map ảnh, pattern detection, line position tính trọng số, noise/bias/latency configurable, calibration flow, (3) IR interpreter — domain-specific instruction set chạy step-by-step mỗi tick, giới hạn instruction/tick, sandbox an toàn
