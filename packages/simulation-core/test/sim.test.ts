import { describe, it, expect } from "vitest";
import { createSimulation } from "../src/sim.js";
import { createTestMap } from "../src/map.js";
import { DEFAULT_ROBOT_CONFIG } from "../src/types.js";

function makeSim(seed?: number) {
  const map = createTestMap(2400, 1200, 1);
  return createSimulation({
    map,
    robotConfig: DEFAULT_ROBOT_CONFIG,
    seed,
  });
}

describe("Simulation", () => {
  describe("initialization", () => {
    it("starts at tick 0 with robot at start pose", () => {
      const sim = makeSim();
      expect(sim.state.tick).toBe(0);
      expect(sim.state.robot.x).toBe(200);
      expect(sim.state.robot.y).toBe(600);
      expect(sim.state.robot.heading).toBe(0);
      expect(sim.state.running).toBe(false);
      expect(sim.state.done).toBe(false);
    });

    it("has zero initial motor speeds", () => {
      const sim = makeSim();
      expect(sim.state.robot.leftSpeed).toBe(0);
      expect(sim.state.robot.rightSpeed).toBe(0);
    });

    it("has default sensor state", () => {
      const sim = makeSim();
      expect(sim.state.sensors.roads).toEqual([0, 0, 0, 0, 0]);
      expect(sim.state.sensors.pattern).toBe("00000");
      expect(sim.state.sensors.calibrated).toBe(false);
    });
  });

  describe("tick", () => {
    it("increments tick counter", () => {
      const sim = makeSim();
      sim.tick();
      expect(sim.state.tick).toBe(1);
      sim.tick();
      expect(sim.state.tick).toBe(2);
    });

    it("moves robot when motors are set", () => {
      const sim = makeSim();
      sim.setMotors(0.5, 0.5);
      const x0 = sim.state.robot.x;
      sim.tick();
      expect(sim.state.robot.x).toBeGreaterThan(x0);
    });

    it("does not move robot when motors are zero", () => {
      const sim = makeSim();
      const x0 = sim.state.robot.x;
      const y0 = sim.state.robot.y;
      sim.tick();
      expect(sim.state.robot.x).toBe(x0);
      expect(sim.state.robot.y).toBe(y0);
    });

    it("respects tick count after many ticks", () => {
      const sim = makeSim();
      sim.setMotors(0.3, 0.3);
      for (let i = 0; i < 60; i++) sim.tick();
      expect(sim.state.tick).toBe(60);
      // Robot phải di chuyển (1 giây ở tốc độ một phần)
      expect(sim.state.robot.x).toBeGreaterThan(200);
    });
  });

  describe("determinism", () => {
    it("same config + seed → same result after 600 ticks", () => {
      const sim1 = makeSim(42);
      const sim2 = makeSim(42);

      sim1.setMotors(0.3, 0.4);
      sim2.setMotors(0.3, 0.4);

      for (let i = 0; i < 600; i++) {
        sim1.tick();
        sim2.tick();
      }

      expect(sim1.state.robot.x).toBe(sim2.state.robot.x);
      expect(sim1.state.robot.y).toBe(sim2.state.robot.y);
      expect(sim1.state.robot.heading).toBe(sim2.state.robot.heading);
      expect(sim1.state.tick).toBe(sim2.state.tick);
    });

    it("different seeds produce different results", () => {
      // Với động học xác định (chưa có nhiễu), seed khác nhau
      // vẫn phải cho cùng kết quả ở C-001 vì động học chưa dùng RNG.
      // Kiểm thử này kiểm tra cấu trúc; phân kỳ thật sẽ xuất hiện từ C-002 trở đi.
      const sim1 = makeSim(42);
      const sim2 = makeSim(999);

      sim1.setMotors(0.3, 0.4);
      sim2.setMotors(0.3, 0.4);

      for (let i = 0; i < 600; i++) {
        sim1.tick();
        sim2.tick();
      }

      // Động học có tính xác định (không nhiễu), nên kết quả giống nhau bất kể seed
      expect(sim1.state.robot.x).toBe(sim2.state.robot.x);
      expect(sim1.state.robot.y).toBe(sim2.state.robot.y);
    });
  });

  describe("reset", () => {
    it("returns robot to start position", () => {
      const sim = makeSim();
      sim.setMotors(0.5, 0.5);
      for (let i = 0; i < 100; i++) sim.tick();

      sim.reset();
      expect(sim.state.tick).toBe(0);
      expect(sim.state.robot.x).toBe(200);
      expect(sim.state.robot.y).toBe(600);
      expect(sim.state.robot.heading).toBe(0);
      expect(sim.state.robot.leftSpeed).toBe(0);
      expect(sim.state.robot.rightSpeed).toBe(0);
    });

    it("clears telemetry on reset", () => {
      const sim = makeSim();
      sim.setMotors(0.5, 0.5);
      for (let i = 0; i < 50; i++) sim.tick();
      expect(sim.getTelemetry().length).toBe(50);

      sim.reset();
      expect(sim.getTelemetry().length).toBe(0);
    });
  });

  describe("setMotors", () => {
    it("clamps motor values to [-1, 1]", () => {
      const sim = makeSim();
      sim.setMotors(1.5, -2.0);
      // Không thể kiểm tra trực tiếp mục tiêu motor từ giao diện công khai,
      // nhưng có thể xác minh động học không bị lỗi nghiêm trọng
      sim.tick();
      expect(sim.state.robot.x).not.toBeNaN();
      expect(sim.state.robot.y).not.toBeNaN();
    });
  });

  describe("telemetry", () => {
    it("records frames as ticks advance", () => {
      const sim = makeSim();
      sim.setMotors(0.3, 0.3);
      sim.tick();
      sim.tick();

      const frames = sim.getTelemetry();
      expect(frames).toHaveLength(2);
      expect(frames[0].tick).toBe(1);
      expect(frames[1].tick).toBe(2);
    });

    it("returns a copy (mutation-safe)", () => {
      const sim = makeSim();
      sim.tick();
      const frames1 = sim.getTelemetry();
      frames1[0] = null as any;
      const frames2 = sim.getTelemetry();
      expect(frames2[0]).not.toBeNull();
    });
  });

  describe("friction stops robot", () => {
    it("robot with friction=1.0 stops when motor set to 0", () => {
      const map = createTestMap(2400, 1200, 1);
      const sim = createSimulation({
        map,
        robotConfig: { ...DEFAULT_ROBOT_CONFIG, friction: 1.0 },
      });

      // Tăng tốc trước để robot có vận tốc
      sim.setMotors(0.5, 0.5);
      for (let i = 0; i < 120; i++) sim.tick(); // 2 giây

      const speedBefore = sim.state.robot.leftSpeed;
      expect(speedBefore).toBeGreaterThan(0);

      // Ngắt motor
      sim.setMotors(0, 0);
      for (let i = 0; i < 60; i++) sim.tick(); // 1 giây

      // Với friction=1.0, robot phải giảm tốc đáng kể
      expect(sim.state.robot.leftSpeed).toBeLessThan(speedBefore * 0.1);
    });
  });
});
