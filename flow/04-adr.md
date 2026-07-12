# Stage 04 — ADR (architecture decisions)

Short. The most valuable section is what you are NOT doing and why.

## Gate — check ALL before `/flow next`
- [x] Each decision has a one-line "why" and a one-line "what I rejected"
- [x] The NOT-doing list is written
- [x] Decisions cover: data storage, auth approach, deploy target
- [x] No FILL placeholders remain in this file

## Decisions

| # | Decision | Why | Rejected alternative |
|---|---|---|---|
| 1 | SimulationCore là package riêng, zero dependencies | Phải chạy được trên browser VÀ Node.js headless không thay đổi code; deterministic requirement yêu cầu kiểm soát hoàn toàn môi trường thực thi | Gom chung vào React app → không chạy được headless, không test được nếu không có DOM |
| 2 | Fixed timestep 60Hz, tách physics tick khỏi render frame | Kết quả không phụ thuộc FPS máy; cùng input + seed = cùng output dù chạy trên máy 30fps hay 144fps | Variable timestep + deltaTime → non-deterministic, kết quả khác nhau giữa các lần chạy và các máy |
| 3 | Blockly sinh IR (JSON), không sinh JavaScript | An toàn (không eval code người dùng), kiểm soát được tập lệnh, chạy được trên interpreter sandbox với giới hạn instruction/tick | Blockly sinh JS trực tiếp → lỗ hổng bảo mật, không giới hạn được runtime, không deterministic |
| 4 | PixiJS 8 cho renderer (WebGL/Canvas) | GPU-accelerated, vẽ được 10,000+ điểm trajectory không lag, cross-browser, có sẵn interaction system cho zoom/pan/drag | Canvas 2D API thuần → chậm với nhiều đối tượng; Three.js → quá nặng cho 2D; Konva → không tối ưu bằng PixiJS cho game loop |
| 5 | Zustand cho state management (React) | Nhẹ (~1KB), không boilerplate, đủ dùng cho simulation state + UI state, không cần Redux-scale | Redux Toolkit → quá nhiều boilerplate cho app nhỏ; Jotai → atomic model không phù hợp với simulation state tập trung; Context API → re-render không kiểm soát được ở 60fps |
| 6 | localStorage cho persistence (MVP, chưa có backend) | Lưu project + telemetry log, không cần server, đủ cho MVP single-user. Không cần IndexedDB vì dữ liệu nhỏ (<5MB/project) | IndexedDB → overkill cho MVP; server-side storage → cần backend, nằm ngoài MVP scope |
| 7 | Không auth, không backend trong MVP | MVP chứng minh phần khó nhất (SimulationCore + Blockly + telemetry); auth/backend thêm ~20 giờ và không làm thay đổi quyết định GO/KILL | NestJS + Prisma + JWT → để G4; Firebase/Supabase → thêm dependency bên ngoài, vẫn tốn thời gian tích hợp |
| 8 | Deploy lên Vercel (static site) hoặc GitHub Pages | MVP là client-side only (React SPA), không cần server. Vercel miễn phí, auto-deploy từ GitHub, hỗ trợ custom domain | Netlify → tương đương, chọn Vercel vì quen thuộc hơn; self-host → không cần thiết cho MVP demo |
| 9 | Monorepo với Turborepo + pnpm workspaces | Tách SimulationCore thành package riêng, chia sẻ types, chạy test riêng từng package. pnpm cho disk efficiency, Turborepo cho parallel build | NX → mạnh hơn nhưng phức tạp hơn; single repo → khó tách SimulationCore độc lập |

## NOT doing in v1 (and why it's safe to skip)

- **Backend (NestJS) + Database (PostgreSQL):** MVP là client-side only, chứng minh giá trị cốt lõi trước khi đầu tư hạ tầng. Lưu = localStorage, chưa cần multi-user. G4 sẽ thêm backend khi đã validate được SimulationCore hoạt động.
- **Authentication (JWT):** Không có backend → không cần auth. Học sinh dùng chung máy hoặc máy riêng, dữ liệu lưu local. An toàn vì không có dữ liệu nhạy cảm trên server.
- **Headless verification (BullMQ + Redis):** Chưa có backend → chưa có headless runner. Deterministic requirement đã được thiết kế từ đầu để hỗ trợ headless sau này (SimulationCore chạy được trên Node.js). Để G5.
- **Mobile/tablet support:** MVP tập trung desktop/laptop — học sinh lập trình Blockly cần màn hình đủ lớn. Tablet có thể xem replay sau này.
- **i18n:** Chỉ tiếng Việt cho MVP. Đối tượng là học sinh Việt Nam. Code/docs tiếng Anh để dễ maintain.
- **Dark mode:** Không cần cho MVP, UI tập trung vào chức năng.
- **CI/CD phức tạp:** GitHub Actions cơ bản (lint + test) là đủ. Không cần E2E test pipeline phức tạp cho MVP.
