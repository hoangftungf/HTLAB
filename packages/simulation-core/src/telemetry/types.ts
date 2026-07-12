/**
 * Các kiểu telemetry và replay cho HTLAB SimulationCore.
 */

import type { Simulation } from "../types.js";

/**
 * Interface mô phỏng mở rộng cho chế độ replay.
 * Bổ sung bước lùi và điều khiển tốc độ ngoài Simulation cơ bản.
 */
export interface ReplaySimulation extends Simulation {
  /** Lùi một khung (phát lại ngược). */
  stepBackward(): void;
  /** Đặt hệ số tốc độ phát lại (1 = bình thường, 2 = gấp đôi, 0.5 = một nửa). */
  setSpeed(speed: number): void;
  /** Lấy tốc độ phát lại hiện tại. */
  readonly speed: number;
  /** Chỉ số khung hiện tại trong mảng telemetry. */
  readonly frameIndex: number;
  /** Tổng số khung trong phát lại. */
  readonly frameCount: number;
}

/**
 * Kết quả so sánh hai log telemetry.
 */
export interface TelemetryDiff {
  /** Tick đầu tiên có khung khác nhau, hoặc -1 nếu hoàn toàn giống nhau. */
  divergedAt: number;
  /** Các field khác nhau tại điểm phân kỳ. */
  diffFields: string[];
  /** Hai log có giống nhau trong toàn bộ phần chồng lấp hay không. */
  identical: boolean;
}

/**
 * Cấu hình cho ring buffer của bộ ghi telemetry.
 */
export interface TelemetryConfig {
  /** Số khung tối đa giữ trong bộ đệm vòng (mặc định 3600 = 60s ở 60Hz). */
  maxFrames?: number;
}
