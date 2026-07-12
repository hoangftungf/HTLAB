/**
 * Mô hình cảm biến dò line Grayscale 5-in-1.
 *
 * Mỗi tick lấy mẫu 5 vị trí cảm biến từ ImageData của sa bàn, dựa trên
 * vị trí robot, hướng robot và hình học cảm biến (hàng 5 mắt phía trước
 * robot, khoảng cách có thể cấu hình).
 *
 * Tính năng:
 * - Giá trị road 0-100 (0=nền trắng, 100=line đen)
 * - Nhận dạng pattern (nhị phân bật/tắt → ví dụ "00100")
 * - Vị trí line (-100..+100 theo trọng tâm có trọng số)
 * - Nhóm cảm biến (boolean phát hiện left/middle/right)
 * - Hiệu chuẩn hai pha (nền trắng → line đen)
 * - Nhiễu Gaussian, bias và độ trễ tick có thể cấu hình
 */

import type { RNG } from "../rng.js";
import type { MapData, RobotState, SensorState } from "../types.js";
import { sampleMapPixel } from "../map.js";

// ---- Cấu hình ----

export interface GrayscaleSensorConfig {
  /** mm, khoảng cách giữa hai mắt cảm biến liền kề */
  sensorSpacing: number;
  /** mm, khoảng cách từ tâm trục bánh đến hàng cảm biến phía trước */
  sensorOffset: number;
  /** độ lệch chuẩn Gaussian áp dụng cho từng giá trị road (thang 0-100) */
  noise: number;
  /** độ lệch cố định cộng vào từng giá trị road (-100..100) */
  bias: number;
  /** số tick trễ của cảm biến (0 = không trễ) */
  latency: number;
}

const DEFAULT_THRESHOLDS = { white: 100, black: 200 };

// ---- Trạng thái nội bộ ----

interface CalibrationState {
  phase: "white" | "black" | "done";
  whiteSample: [number, number, number, number, number] | null;
  blackSample: [number, number, number, number, number] | null;
}

// ---- Giao diện công khai ----

export interface GrayscaleSensor {
  /**
   * Lấy mẫu cả 5 mắt road và trả về SensorState đã cập nhật.
   * Có áp dụng noise, bias và độ trễ latency.
   */
  sample(robot: RobotState, map: MapData, prevState: SensorState, rng: RNG): SensorState;

  /**
   * Chạy một pha hiệu chuẩn tại vị trí robot hiện tại.
   * Lần gọi đầu = lấy mẫu nền trắng, lần gọi hai = lấy mẫu vạch đen.
   * Trả về ngưỡng đã cập nhật sau pha vạch đen.
   */
  calibrate(robot: RobotState, map: MapData): { white: number; black: number };

  /** Đặt lại trạng thái nội bộ (bộ đệm độ trễ, hiệu chuẩn). */
  reset(): void;
}

// ---- Hàm tạo ----

export function createGrayscaleSensor(
  config: GrayscaleSensorConfig,
): GrayscaleSensor {
  const { sensorSpacing, sensorOffset, noise, bias, latency } = config;

  // Bộ đệm độ trễ: vòng lưu các bản ghi SensorState gần nhất
  const latencyBuffer: SensorState[] = [];

  // Trạng thái hiệu chuẩn
  let calib: CalibrationState = {
    phase: "white",
    whiteSample: null,
    blackSample: null,
  };

  // Ngưỡng đã hiệu chuẩn cho từng road (tính từ dữ liệu hiệu chuẩn)
  let roadThresholds: { white: number; black: number }[] = Array.from(
    { length: 5 },
    () => ({ ...DEFAULT_THRESHOLDS }),
  );

  // ---- Hình học cảm biến ----

  function computeSensorPositions(
    robot: RobotState,
  ): Array<{ x: number; y: number }> {
    const cos = Math.cos(robot.heading);
    const sin = Math.sin(robot.heading);

    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 5; i++) {
      const lateral = (i - 2) * sensorSpacing;
      positions.push({
        x: robot.x + cos * sensorOffset - sin * lateral,
        y: robot.y + sin * sensorOffset + cos * lateral,
      });
    }
    return positions;
  }

  // ---- Lấy mẫu thô (không nhiễu, không độ trễ) ----

  function sampleRawRoads(
    robot: RobotState,
    map: MapData,
  ): [number, number, number, number, number] {
    const positions = computeSensorPositions(robot);
    const roads: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5; i++) {
      roads[i] = sampleMapPixel(map, positions[i].x, positions[i].y);
    }
    return roads;
  }

  // ---- Chuyển đổi giá trị thô sang giá trị road ----

  function rawToRoadValue(raw: number, i: number): number {
    const t = roadThresholds[i];
    if (raw <= t.white) return 0;
    if (raw >= t.black) return 100;
    return ((raw - t.white) / (t.black - t.white)) * 100;
  }

  function computePattern(roads: [number, number, number, number, number]): string {
    let p = "";
    for (let i = 0; i < 5; i++) {
      p += roads[i] > 50 ? "1" : "0";
    }
    return p;
  }

  function computeLinePosition(
    roads: [number, number, number, number, number],
  ): number {
    let weightedSum = 0;
    let totalWeight = 0;
    for (let i = 0; i < 5; i++) {
      weightedSum += i * roads[i];
      totalWeight += roads[i];
    }
    if (totalWeight < 1) return 0;
    const weighted = weightedSum / totalWeight; // 0..4
    return ((weighted - 2) / 2) * 100; // -100..+100
  }

  // ---- Giao diện công khai ----

  function sample(
    robot: RobotState,
    map: MapData,
    prevState: SensorState,
    rng: RNG,
  ): SensorState {
    // Đọc giá trị pixel thô
    const rawRoads = sampleRawRoads(robot, map);

    // Chuyển sang giá trị road 0-100 bằng ngưỡng hiệu chuẩn của từng road
    const cleanRoads: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5; i++) {
      cleanRoads[i] = rawToRoadValue(rawRoads[i], i);
    }

    // Áp dụng độ lệch và nhiễu Gaussian
    const noisyRoads: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5; i++) {
      let v = cleanRoads[i] + bias;
      if (noise > 0) {
        v += rng.nextGaussian(noise);
      }
      noisyRoads[i] = Math.max(0, Math.min(100, Math.round(v)));
    }

    const pattern = computePattern(noisyRoads);
    const linePosition = computeLinePosition(noisyRoads);

    const newState: SensorState = {
      roads: noisyRoads,
      pattern,
      linePosition: Math.round(linePosition),
      calibrated: calib.phase === "done",
      thresholds: {
        white: roadThresholds[2].white,
        black: roadThresholds[2].black,
      },
    };

    // Độ trễ: đưa vào bộ đệm và trả về mẫu đọc bị trễ
    if (latency > 0) {
      latencyBuffer.push(newState);
      if (latencyBuffer.length > latency + 1) {
        latencyBuffer.shift();
      }
      return latencyBuffer[0] ?? prevState;
    }

    return newState;
  }

  function calibrate(
    robot: RobotState,
    map: MapData,
  ): { white: number; black: number } {
    const rawRoads = sampleRawRoads(robot, map);

    if (calib.phase === "white") {
      calib.whiteSample = rawRoads;
      calib.phase = "black";
    } else if (calib.phase === "black") {
      calib.blackSample = rawRoads;
      calib.phase = "done";

      // Tính ngưỡng từng road từ các mẫu
      const ws = calib.whiteSample!;
      const bs = calib.blackSample!;

      for (let i = 0; i < 5; i++) {
        // Ngưỡng trắng = mẫu trắng + một biên an toàn (10% hướng về đen)
        // Ngưỡng đen = mẫu đen - một biên an toàn
        const range = bs[i] - ws[i];
        const margin = Math.max(range * 0.1, 5);
        roadThresholds[i] = {
          white: ws[i] + margin,
          black: bs[i] - margin,
        };
      }

      // Trả về ngưỡng của road giữa làm đại diện
      return {
        white: roadThresholds[2].white,
        black: roadThresholds[2].black,
      };
    }

    // Đã hoàn tất, trả về ngưỡng hiện tại
    return {
      white: roadThresholds[2].white,
      black: roadThresholds[2].black,
    };
  }

  function reset(): void {
    latencyBuffer.length = 0;
    calib = { phase: "white", whiteSample: null, blackSample: null };
    roadThresholds = Array.from({ length: 5 }, () => ({ ...DEFAULT_THRESHOLDS }));
  }

  return { sample, calibrate, reset };
}
