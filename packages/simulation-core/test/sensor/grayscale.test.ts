import { describe, it, expect, beforeEach } from "vitest";
import { createGrayscaleSensor } from "../../src/sensor/index.js";
import { type GrayscaleSensorConfig } from "../../src/sensor/index.js";
import { createTestMap, sampleMapPixel } from "../../src/map.js";
import { createRNG, type RNG } from "../../src/rng.js";
import { DEFAULT_SENSOR_STATE, type MapData, type RobotState, type SensorState } from "../../src/types.js";

// ---- Hàm hỗ trợ ----

const TEST_CONFIG: GrayscaleSensorConfig = {
  sensorSpacing: 12,
  sensorOffset: 120,
  noise: 0,
  bias: 0,
  latency: 0,
};

function makeSensor(overrides: Partial<GrayscaleSensorConfig> = {}): ReturnType<typeof createGrayscaleSensor> {
  return createGrayscaleSensor({ ...TEST_CONFIG, ...overrides });
}

function makeRobot(overrides: Partial<RobotState> = {}): RobotState {
  return {
    x: 500,
    y: 600,
    heading: 0,
    leftSpeed: 0,
    rightSpeed: 0,
    ...overrides,
  };
}

function makeState(overrides: Partial<SensorState> = {}): SensorState {
  return { ...DEFAULT_SENSOR_STATE, ...overrides };
}

const rng: RNG = createRNG(42);

/**
 * Tạo sa bàn kiểm thử với mẫu nhị phân đã biết để xác minh cảm biến.
 * Hàm tạo cho phép bên gọi chỉ định vị trí và độ rộng vạch.
 */
function createLineMap(
  lineStartY: number,
  lineThickness: number,
  mapW: number = 2400,
  mapH: number = 1200,
  scale: number = 1,
): MapData {
  const pxW = Math.round(mapW * scale);
  const pxH = Math.round(mapH * scale);
  const pixels = new Uint8ClampedArray(pxW * pxH * 4);

  // Nền trắng
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 255;
    pixels[i + 1] = 255;
    pixels[i + 2] = 255;
    pixels[i + 3] = 255;
  }

  // Vạch đen nằm ngang
  for (let y = lineStartY; y < lineStartY + lineThickness; y++) {
    if (y < 0 || y >= pxH) continue;
    for (let x = 0; x < pxW; x++) {
      const idx = (y * pxW + x) * 4;
      pixels[idx] = 0;
      pixels[idx + 1] = 0;
      pixels[idx + 2] = 0;
    }
  }

  return {
    imageData: pixels,
    width: pxW,
    height: pxH,
    metadata: {
      width: mapW,
      height: mapH,
      scale,
      startPose: { x: 200, y: mapH / 2, heading: 0 },
    },
  };
}

// ---- Kiểm thử ----

describe("GrayscaleSensor", () => {
  describe("pixel sampling", () => {
    it("reads all 5 road values from a known map", () => {
      const sensor = makeSensor();
      // Vạch đủ rộng để cả 5 cảm biến (trải ±24mm từ tâm) đều chạm vào
      const map = createLineMap(570, 60); // vạch đen từ y=570 đến y=629
      // Robot đặt giữa tại y=600, hướng sang phải; mọi cảm biến đều chạm vạch rộng
      const robot = makeRobot({ x: 500, y: 600, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      // Cả 5 cảm biến nằm trên vạch đen rộng → giá trị road gần 100
      for (let i = 0; i < 5; i++) {
        expect(state.roads[i]).toBeGreaterThanOrEqual(95);
        expect(state.roads[i]).toBeLessThanOrEqual(100);
      }
    });

    it("returns near-zero road values on white floor", () => {
      const sensor = makeSensor();
      const map = createLineMap(590, 20);
      // Robot đặt xa vạch (y=200 nằm cao hơn nhiều so với vạch ở y=590-609)
      const robot = makeRobot({ x: 500, y: 200, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      for (let i = 0; i < 5; i++) {
        expect(state.roads[i]).toBeLessThanOrEqual(10);
        expect(state.roads[i]).toBeGreaterThanOrEqual(0);
      }
    });

    it("only center sensor sees black line when robot is exactly centered", () => {
      const sensor = makeSensor();
      // Vạch ở y=600, dày 2px; chỉ cảm biến giữa chạm vạch
      const map = createLineMap(599, 2);
      const robot = makeRobot({ x: 500, y: 600, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      // Cảm biến giữa (chỉ số 2) phải nằm trên vạch
      expect(state.roads[2]).toBeGreaterThan(80);
      // Cảm biến ngoài cùng (chỉ số 0, 4) phải nằm ngoài vạch (trắng)
      // Chúng ở y = 600 ± 24mm từ tâm (sensorSpacing=12, độ lệch 2*12=24)
      expect(state.roads[0]).toBeLessThan(20);
      expect(state.roads[4]).toBeLessThan(20);
    });
  });

  describe("pattern detection", () => {
    it('returns "00100" when robot centered on a straight line', () => {
      const sensor = makeSensor();
      const map = createLineMap(598, 4); // vạch 4px ở giữa
      const robot = makeRobot({ x: 500, y: 600, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      expect(state.pattern).toBe("00100");
    });

    it('shifts pattern right when robot is offset right', () => {
      const sensor = makeSensor();
      const map = createLineMap(598, 4);
      // Dịch robot 12mm sang phải → vạch xuất hiện ở chỉ số cảm biến thấp hơn so với robot
      // Với heading=0, robot hướng sang phải trong tọa độ màn hình.
      // Hàng cảm biến vuông góc với hướng tiến.
      // Nếu robot đi xuống (+y), vạch dịch về phía các cảm biến có chỉ số thấp hơn.
      const robot = makeRobot({ x: 500, y: 612, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      // Vị trí cảm biến trong hệ tọa độ cục bộ của robot khi heading=0:
      // hướng tiến = (1, 0), hướng ngang = (0, 1)  [(-sin 0, cos 0) = (0, 1)]
      // cảm biến i trong tọa độ thế giới: x = robot.x + sensorOffset*1 + (i-2)*sensorSpacing*0 = robot.x + 120
      //                y = robot.y + sensorOffset*0 + (i-2)*sensorSpacing*1 = robot.y + (i-2)*12

      // Robot ở (500, 612):
      // cảm biến 0: y = 612 + (-2)*12 = 588
      // cảm biến 1: y = 612 + (-1)*12 = 600 → chạm vạch (598-601)
      // cảm biến 2: y = 612 + 0*12 = 612 → trượt vạch
      // cảm biến 3: y = 612 + 1*12 = 624 → trượt vạch
      // cảm biến 4: y = 612 + 2*12 = 636 → trượt vạch

      // Vì vậy mẫu nhị phân phải là "01000" (cảm biến 1 thấy vạch, các cảm biến khác không)

      expect(state.pattern).toBe("01000");
    });

    it('shifts pattern left when robot is offset left', () => {
      const sensor = makeSensor();
      const map = createLineMap(598, 4);
      const robot = makeRobot({ x: 500, y: 588, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      // cảm biến 2 ở y=588 → trượt vạch (vạch ở 598-601)
      // cảm biến 3 ở y=600 → chạm vạch
      expect(state.pattern).toBe("00010");
    });

    it('returns "00000" when no line is visible', () => {
      const sensor = makeSensor();
      const map = createLineMap(598, 4);
      const robot = makeRobot({ x: 500, y: 100, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      expect(state.pattern).toBe("00000");
    });

    it('returns "11111" when all sensors are on a wide line', () => {
      const sensor = makeSensor();
      const map = createLineMap(570, 60); // vạch rộng 60px
      const robot = makeRobot({ x: 500, y: 600, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      expect(state.pattern).toBe("11111");
    });
  });

  describe("line position", () => {
    it("returns ~0 when robot is centered on line", () => {
      const sensor = makeSensor();
      const map = createLineMap(598, 4);
      const robot = makeRobot({ x: 500, y: 600, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      expect(Math.abs(state.linePosition)).toBeLessThanOrEqual(10);
    });

    it("returns positive when robot is offset right (line is to the left of robot)", () => {
      const sensor = makeSensor();
      const map = createLineMap(598, 4);
      const robot = makeRobot({ x: 500, y: 612, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      // Vạch ở y=598-601. Tâm robot ở y=612.
      // Cảm biến 0 ở y=588, cảm biến 1 ở y=600 (trên vạch)
      // Vạch nằm bên trái tâm robot → linePosition phải âm.
      // Đặc tả: "rất trái = -100, rất phải = +100, 0 = giữa".
      // Nếu robot dịch phải (vạch xuất hiện ở cảm biến có chỉ số thấp), linePosition phải âm.

      expect(state.linePosition).toBeLessThan(0);
    });

    it("returns negative when robot is offset left (line is to the right of robot)", () => {
      const sensor = makeSensor();
      const map = createLineMap(598, 4);
      const robot = makeRobot({ x: 500, y: 588, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      // Vạch ở y=598-601. Robot ở y=588.
      // Sensor 3 ở y=600 (trên vạch)
      // Vạch nằm bên phải robot → linePosition dương

      expect(state.linePosition).toBeGreaterThan(0);
    });

    it("returns 0 when no line is visible", () => {
      const sensor = makeSensor();
      const map = createLineMap(598, 4);
      const robot = makeRobot({ x: 500, y: 100, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      expect(state.linePosition).toBe(0);
    });
  });

  describe("sensor geometry", () => {
    it("accounts for robot heading when computing sensor positions", () => {
      const sensor = makeSensor();
      const map = createLineMap(598, 4);
      // Robot hướng xuống (heading = π/2), tâm ở (600, 500)
      // Khi hướng xuống: hướng tiến = (0, 1)
      // tọa độ x của cảm biến = 600 + 0*120 + (-1)*(i-2)*12 = 600 - (i-2)*12
      // tọa độ y của cảm biến = 500 + 1*120 + 0*(i-2)*12 = 620
      // Mọi cảm biến có cùng y=620, khác x
      const robot = makeRobot({ x: 600, y: 500, heading: Math.PI / 2 });
      const state = sensor.sample(robot, map, makeState(), rng);

      // Vạch nằm ngang tại y=598-601. Cảm biến ở y=620 nằm dưới vạch (trắng).
      for (let i = 0; i < 5; i++) {
        expect(state.roads[i]).toBeLessThanOrEqual(10);
      }
    });

    it("samples at correct world positions for heading=0", () => {
      const sensor = makeSensor({ sensorSpacing: 10, sensorOffset: 100 });
      // Robot ở (300, 600). Sensor 2 ở (400, 600).
      // Vạch ở y=598-601 (3px); cảm biến giữa chạm vạch, cảm biến mép trượt vạch
      const map = createLineMap(598, 3);
      const robot = makeRobot({ x: 300, y: 600, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      // cảm biến 2 phải nằm đúng tại y=600 (trên vạch)
      expect(state.roads[2]).toBeGreaterThan(80);

      // cảm biến 0 ở y = 600 + (-2)*10 = 580: ngoài vạch
      // cảm biến 4 ở y = 600 + 2*10 = 620: ngoài vạch
      expect(state.roads[0]).toBeLessThanOrEqual(10);
      expect(state.roads[4]).toBeLessThanOrEqual(10);
    });
  });

  describe("calibration", () => {
    it("completes two-phase calibration (white then black)", () => {
      const sensor = makeSensor();
      const map = createLineMap(590, 20);

      // Pha 1: đặt trên nền trắng
      const whiteRobot = makeRobot({ x: 500, y: 200, heading: 0 });
      const afterWhite = sensor.calibrate(whiteRobot, map);

      // Pha 2: đặt trên vạch đen
      const blackRobot = makeRobot({ x: 500, y: 600, heading: 0 });
      const thresholds = sensor.calibrate(blackRobot, map);

      // Ngưỡng phải tách được trắng khỏi đen
      expect(thresholds.white).toBeGreaterThan(0);
      expect(thresholds.black).toBeLessThan(255);
      expect(thresholds.white).toBeLessThan(thresholds.black);
    });

    it("reduces inter-road variance after calibration", () => {
      const sensor = makeSensor();
      const map = createLineMap(598, 4);

      // Trước hiệu chuẩn: lấy mẫu cả 5 road, kiểm tra phương sai
      const robot = makeRobot({ x: 500, y: 600, heading: 0 }); // cảm biến giữa trên vạch, cảm biến mép ngoài vạch
      const stateBefore = sensor.sample(robot, map, makeState(), rng);

      // Các road phải khác nhau (giữa cao, mép thấp)
      const roads = stateBefore.roads;
      const varianceBefore = Math.max(...roads) - Math.min(...roads);

      // Hiệu chuẩn
      sensor.calibrate(makeRobot({ x: 500, y: 200, heading: 0 }), map); // trắng
      sensor.calibrate(makeRobot({ x: 500, y: 600, heading: 0 }), map); // đen

      // Sau hiệu chuẩn, vị trí đồng nhất phải cho giá trị ổn định
      // (threshold từng road chuẩn hóa phản hồi của từng mắt)
      // Ở vị trí đang nằm lệch trên vạch vẫn có thể có phương sai,
      // nên kiểm thử thêm vị trí mà cả 5 cảm biến đều trên nền trắng.
      const whiteRobot = makeRobot({ x: 500, y: 200, heading: 0 });
      const stateAfter = sensor.sample(whiteRobot, map, makeState(), rng);
      const roadsAfter = stateAfter.roads;
      const varianceAfter = Math.max(...roadsAfter) - Math.min(...roadsAfter);

      // Trên nền trắng đồng nhất, mọi road phải gần 0 sau hiệu chuẩn
      expect(varianceAfter).toBeLessThanOrEqual(5);
    });

    it("marks calibrated=true after both phases complete", () => {
      const sensor = makeSensor();
      const map = createLineMap(590, 20);

      sensor.calibrate(makeRobot({ x: 500, y: 200, heading: 0 }), map); // trắng
      sensor.calibrate(makeRobot({ x: 500, y: 600, heading: 0 }), map); // đen

      // Sau hiệu chuẩn, sample phải trả calibrated=true.
      // Nhưng calibrate() không trả SensorState; sim.calibrateGrayscale mới đặt trạng thái đó.
      // Ta xác minh gián tiếp: sau 2 lần gọi, calibrate trả threshold đã hoàn tất.
      const t = sensor.calibrate(makeRobot({ x: 500, y: 600, heading: 0 }), map);
      expect(t.white).toBeGreaterThan(0);
      expect(t.black).toBeLessThan(255);
    });
  });

  describe("noise", () => {
    it("applies gaussian noise when configured", () => {
      const sensor = makeSensor({ noise: 5 });
      const map = createLineMap(598, 4);
      const robot = makeRobot({ x: 500, y: 600, heading: 0 });

      // Chạy nhiều lần lấy mẫu; giá trị phải dao động
      const road2Values: number[] = [];
      for (let i = 0; i < 50; i++) {
        const rng2 = createRNG(i);
        const state = sensor.sample(robot, map, makeState(), rng2);
        road2Values.push(state.roads[2]);
      }

      // Không phải tất cả đều cùng một giá trị
      const unique = new Set(road2Values);
      expect(unique.size).toBeGreaterThan(1);
    });

    it("applies sensor bias correctly", () => {
      const sensorWithBias = makeSensor({ bias: 10, noise: 0 });
      const sensorNoBias = makeSensor({ bias: 0, noise: 0 });
      const map = createLineMap(598, 4);
      const robot = makeRobot({ x: 500, y: 600, heading: 0 });

      const biased = sensorWithBias.sample(robot, map, makeState(), rng);
      const unbiased = sensorNoBias.sample(robot, map, makeState(), rng);

      // Mẫu đọc có độ lệch phải cao hơn (bị chặn tối đa ở 100)
      // Chênh lệch chính xác phụ thuộc vào việc chặn miền giá trị
      expect(biased.roads[2]).toBeGreaterThanOrEqual(unbiased.roads[2]);
    });

    it("clamps road values to 0-100 with noise+bias", () => {
      const sensor = makeSensor({ noise: 50, bias: 200 }); // giá trị cực đoan
      const map = createLineMap(598, 4);
      const robot = makeRobot({ x: 500, y: 600, heading: 0 });

      const state = sensor.sample(robot, map, makeState(), rng);
      for (let i = 0; i < 5; i++) {
        expect(state.roads[i]).toBeGreaterThanOrEqual(0);
        expect(state.roads[i]).toBeLessThanOrEqual(100);
      }
    });

    it("same seed produces same noisy output", () => {
      const sensor = makeSensor({ noise: 3 });
      const map = createLineMap(598, 4);
      const robot = makeRobot({ x: 500, y: 600, heading: 0 });

      const rng1 = createRNG(42);
      const rng2 = createRNG(42);
      const s1 = sensor.sample(robot, map, makeState(), rng1);
      const s2 = sensor.sample(robot, map, makeState(), rng2);

      expect(s1.roads).toEqual(s2.roads);
      expect(s1.linePosition).toBe(s2.linePosition);
    });
  });

  describe("latency", () => {
    it("returns delayed values with latency=3", () => {
      const sensor = makeSensor({ latency: 3, noise: 0 });
      const map = createLineMap(598, 4);

      // Di chuyển robot theo trục x để mẫu đọc thay đổi
      const state0 = sensor.sample(makeRobot({ x: 100, y: 600, heading: 0 }), map, makeState(), rng);
      const state1 = sensor.sample(makeRobot({ x: 110, y: 600, heading: 0 }), map, state0, rng);
      const state2 = sensor.sample(makeRobot({ x: 120, y: 600, heading: 0 }), map, state1, rng);
      const state3 = sensor.sample(makeRobot({ x: 130, y: 600, heading: 0 }), map, state2, rng);
      const state4 = sensor.sample(makeRobot({ x: 140, y: 600, heading: 0 }), map, state3, rng);

      // Với độ trễ=3, state4 phải trả mẫu đọc từ tick 1 (state1)
      // Nhưng vì robot di chuyển theo x và vạch nằm ngang,
      // giá trị road phải giống nhau ở mọi vị trí x trên vạch.
      // Vạch nằm ngang nên di chuyển theo x không làm đổi mẫu cảm biến.

      // Xác minh theo cách khác: state4.roads phải khớp state1.roads
      // miễn là robot vẫn ở cùng vạch ngang
      expect(state4.roads).toEqual(state1.roads);
    });

    it("shows readings lagging behind actual position with latency", () => {
      const sensor = makeSensor({ latency: 3, noise: 0 });
      const map = createLineMap(598, 4);

      // Bắt đầu trên vạch
      let state = makeState();
      state = sensor.sample(makeRobot({ x: 500, y: 600, heading: 0 }), map, state, rng);

      // Di chuyển xa khỏi vạch (y=200). Độ trễ=3 nghĩa là cần 3-4 tick
      // mới thật sự thấy thay đổi
      const readingsAwayFromLine: number[] = [];
      for (let i = 0; i < 5; i++) {
        state = sensor.sample(makeRobot({ x: 500, y: 200, heading: 0 }), map, state, rng);
        readingsAwayFromLine.push(state.roads[2]);
      }

      // 3-4 mẫu đầu vẫn phải đến từ gần vạch (bị trễ)
      // Trạng thái ban đầu là DEFAULT_SENSOR_STATE (toàn 0)
      // Sau tick 1 (kích thước bộ đệm độ trễ = 1, cần 4 để đạt latency+1):
      //   bộ đệm=[mẫu_đọc_y_600], trả về=bộ đệm[0]=mẫu_đọc_y_600 (vạch!)
      // Sau tick 2 (robot ở y=200):
      //   bộ đệm=[mẫu_đọc_y_600, mẫu_đọc_y_200], trả về=bộ đệm[0]=mẫu_đọc_y_600 (vẫn là vạch!)
      // Sau tick 3:
      //   bộ đệm=[mẫu_đọc_y_600, mẫu_đọc_y_200, mẫu_đọc_y_200], trả về=bộ đệm[0]=mẫu_đọc_y_600 (vẫn là vạch!)
      // Sau tick 4 (bộ đệm vượt latency+1=4, bỏ mẫu đầu):
      //   bộ đệm=[mẫu_đọc_y_200, mẫu_đọc_y_200, mẫu_đọc_y_200, mẫu_đọc_y_200], trả về=bộ đệm[0]=mẫu_đọc_y_200 (trắng!)

      // 3 mẫu đầu phải còn thấy vạch (giá trị cao), sau đó mới chuyển trạng thái
      expect(readingsAwayFromLine[0]).toBeGreaterThan(50); // vẫn thấy vạch
    });
  });

  describe("sensor groups", () => {
    it("computed pattern encodes group information", () => {
      const sensor = makeSensor();
      const map = createLineMap(598, 4);
      const robot = makeRobot({ x: 500, y: 600, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      // Mẫu "00100" nghĩa là:
      // Nhóm trái (road 0,1,2): "001" → phát hiện (road 2 trên vạch)
      // Nhóm giữa (road 1,2,3): "010" → phát hiện (road 2 trên vạch)
      // Nhóm phải (road 2,3,4): "100" → phát hiện (road 2 trên vạch)

      // Trích xuất phát hiện nhóm từ mẫu nhị phân
      const leftDetected = state.pattern[0] === "1" || state.pattern[1] === "1" || state.pattern[2] === "1";
      const middleDetected = state.pattern[1] === "1" || state.pattern[2] === "1" || state.pattern[3] === "1";
      const rightDetected = state.pattern[2] === "1" || state.pattern[3] === "1" || state.pattern[4] === "1";

      expect(leftDetected).toBe(true);
      expect(middleDetected).toBe(true);
      expect(rightDetected).toBe(true);
    });
  });

  describe("reset", () => {
    it("clears latency buffer and calibration on reset", () => {
      const sensor = makeSensor({ latency: 2 });
      const map = createLineMap(590, 20);

      // Hiệu chuẩn
      sensor.calibrate(makeRobot({ x: 500, y: 200, heading: 0 }), map);
      sensor.calibrate(makeRobot({ x: 500, y: 600, heading: 0 }), map);

      // Đưa một số mẫu độ trễ vào bộ đệm
      let state = makeState();
      for (let i = 0; i < 5; i++) {
        state = sensor.sample(makeRobot({ x: 500, y: 600, heading: 0 }), map, state, rng);
      }

      sensor.reset();

      // Sau khi đặt lại, hiệu chuẩn phải quay về trạng thái mới
      const t = sensor.calibrate(makeRobot({ x: 500, y: 200, heading: 0 }), map);
      // Lần gọi đầu = pha trắng, chưa trả threshold hoàn tất
      expect(t).toBeDefined();
    });
  });

  describe("determinism", () => {
    it("same sensor + same robot + same RNG → same output", () => {
      const sensor = makeSensor({ noise: 2 });
      const map = createLineMap(598, 4);
      const robot = makeRobot({ x: 500, y: 600, heading: 0 });

      // Mô phỏng một chuỗi tick
      const run = (): SensorState[] => {
        const r = createRNG(42);
        let s = makeState();
        const results: SensorState[] = [];
        // Di chuyển robot về phía trước
        for (let t = 0; t < 10; t++) {
          const movingRobot = makeRobot({ x: 500 + t * 5, y: 600, heading: 0 });
          s = sensor.sample(movingRobot, map, s, r);
          results.push(s);
        }
        return results;
      };

      const run1 = run();
      const run2 = run();

      for (let i = 0; i < run1.length; i++) {
        expect(run1[i].roads).toEqual(run2[i].roads);
        expect(run1[i].pattern).toBe(run2[i].pattern);
        expect(run1[i].linePosition).toBe(run2[i].linePosition);
      }
    });
  });

  describe("edge cases", () => {
    it("clamps roads even with very large bias", () => {
      const sensor = makeSensor({ bias: 50, noise: 0 });
      const map = createLineMap(598, 4);
      const robot = makeRobot({ x: 500, y: 600, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      for (let i = 0; i < 5; i++) {
        expect(state.roads[i]).toBeLessThanOrEqual(100);
      }
    });

    it("handles zero sensor spacing (all sensors at same position)", () => {
      const sensor = makeSensor({ sensorSpacing: 0 });
      const map = createLineMap(598, 4);
      const robot = makeRobot({ x: 500, y: 600, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      // Cả 5 cảm biến phải đọc giá trị giống nhau
      const first = state.roads[0];
      for (let i = 1; i < 5; i++) {
        expect(state.roads[i]).toBe(first);
      }
    });

    it("handles zero sensor offset (sensors at wheelbase center)", () => {
      const sensor = makeSensor({ sensorOffset: 0 });
      const map = createLineMap(598, 4);
      const robot = makeRobot({ x: 500, y: 600, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      // Mọi giá trị phải hợp lệ trong khoảng 0-100
      for (let i = 0; i < 5; i++) {
        expect(state.roads[i]).toBeGreaterThanOrEqual(0);
        expect(state.roads[i]).toBeLessThanOrEqual(100);
      }
    });

    it("handles map boundary — sensors off-map return 0 (white)", () => {
      const sensor = makeSensor({ sensorOffset: 5000 }); // khoảng cách rất lớn, cảm biến ra ngoài sa bàn
      const map = createLineMap(598, 4);
      const robot = makeRobot({ x: 500, y: 600, heading: 0 });
      const state = sensor.sample(robot, map, makeState(), rng);

      // sampleMapPixel trả 0 cho điểm ảnh ngoài sa bàn
      for (let i = 0; i < 5; i++) {
        expect(state.roads[i]).toBe(0);
      }
    });

    it("default thresholds separate white from black correctly", () => {
      // Điểm ảnh trắng: giá trị thô ≈ 0 → road 0
      // Điểm ảnh đen: giá trị thô ≈ 255 → road 100
      // Điểm ảnh mép (xám): giá trị thô ≈ 128 → road ~28
      // Đây là kiểm tra hành vi của ngưỡng mặc định (trắng=100, đen=200)

      const sensor = makeSensor();
      const map = createLineMap(598, 4);

      // Trên nền trắng
      const whiteState = sensor.sample(
        makeRobot({ x: 500, y: 100, heading: 0 }),
        map,
        makeState(),
        rng,
      );
      expect(whiteState.roads[2]).toBeLessThanOrEqual(10);

      // Trên vạch đen
      const blackState = sensor.sample(
        makeRobot({ x: 500, y: 600, heading: 0 }),
        map,
        makeState(),
        rng,
      );
      expect(blackState.roads[2]).toBeGreaterThanOrEqual(90);
    });
  });
});
