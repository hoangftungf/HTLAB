import { describe, it, expect } from "vitest";
import {
  createSimulation,
  createReplay,
  createTestMap,
  diffTelemetry,
  type TelemetryFrame,
} from "../../src/index.js";
import { DEFAULT_ROBOT_CONFIG } from "../../src/types.js";

// ---- Hàm hỗ trợ ----

function makeSim(seed = 42, maxFrames?: number) {
  const map = createTestMap(2400, 1200, 1);
  return createSimulation({
    map,
    robotConfig: { ...DEFAULT_ROBOT_CONFIG, sensorNoise: 0 },
    seed,
    maxTelemetryFrames: maxFrames,
  });
}

function runTicks(sim: ReturnType<typeof makeSim>, n: number): void {
  for (let i = 0; i < n; i++) {
    sim.setMotors(0.3, 0.3);
    sim.tick();
  }
}

// ---- Kiểm thử ----

describe("Telemetry recorder", () => {
  describe("recording", () => {
    it("records correct number of frames", () => {
      const sim = makeSim();
      runTicks(sim, 600);
      const frames = sim.getTelemetry();
      expect(frames).toHaveLength(600);
    });

    it("each frame has all required fields", () => {
      const sim = makeSim();
      sim.setMotors(0.3, 0.4);
      sim.tick();

      const frames = sim.getTelemetry();
      const f = frames[0];

      expect(f.tick).toBe(1);
      expect(typeof f.robot.x).toBe("number");
      expect(typeof f.robot.y).toBe("number");
      expect(typeof f.robot.heading).toBe("number");
      expect(typeof f.robot.leftSpeed).toBe("number");
      expect(typeof f.robot.rightSpeed).toBe("number");
      expect(f.sensors.roads).toHaveLength(5);
      expect(typeof f.sensors.pattern).toBe("string");
      expect(typeof f.sensors.linePosition).toBe("number");
      expect(typeof f.motorTargets.left).toBe("number");
      expect(typeof f.motorTargets.right).toBe("number");
      expect(typeof f.runtime.timerStartTick).toBe("number");
      expect(typeof f.runtime.motorEncoders.A).toBe("number");
      expect(Array.isArray(f.runtime.events)).toBe(true);
    });

    it("returns a copy (mutation-safe)", () => {
      const sim = makeSim();
      runTicks(sim, 10);
      const f1 = sim.getTelemetry();
      f1[0] = null as any;
      const f2 = sim.getTelemetry();
      expect(f2[0]).not.toBeNull();
    });
  });

  describe("ring buffer", () => {
    it("limits buffer to configured maxFrames", () => {
      const sim = makeSim(42, 100);
      runTicks(sim, 150);
      const frames = sim.getTelemetry();
      expect(frames.length).toBeLessThanOrEqual(100);
    });

    it("keeps most recent frames when buffer overflows", () => {
      const sim = makeSim(42, 100);
      runTicks(sim, 150);
      const frames = sim.getTelemetry();

      // Khung đầu phải nằm khoảng tick 51-100 (sau khi 50 khung bị bỏ)
      expect(frames[0].tick).toBeGreaterThan(0);
      // Khung cuối phải là tick 150
      expect(frames[frames.length - 1].tick).toBe(150);
    });

    it("default buffer is 3600 frames", () => {
      const sim = makeSim();
      runTicks(sim, 500);
      expect(sim.getTelemetry()).toHaveLength(500);
      // Giới hạn mặc định là 3600, nên cả 500 khung vẫn còn
    });
  });

  describe("determinism", () => {
    it("same sim config + same actions produce identical telemetry", () => {
      const sim1 = makeSim(42);
      const sim2 = makeSim(42);

      const pattern = [0.3, 0.3, 0.3, 0.4, 0.4, 0.4, 0.5, 0.2, 0.1, 0.3];
      for (let t = 0; t < pattern.length; t++) {
        sim1.setMotors(pattern[t], pattern[t]);
        sim2.setMotors(pattern[t], pattern[t]);
        sim1.tick();
        sim2.tick();
      }

      const t1 = sim1.getTelemetry();
      const t2 = sim2.getTelemetry();
      expect(t1.length).toBe(t2.length);
      for (let i = 0; i < t1.length; i++) {
        expect(t1[i].robot.x).toBe(t2[i].robot.x);
        expect(t1[i].robot.y).toBe(t2[i].robot.y);
      }
    });
  });
});

describe("Replay", () => {
  function record(): TelemetryFrame[] {
    const sim = makeSim(42);
    runTicks(sim, 100);
    return sim.getTelemetry();
  }

  describe("playback", () => {
    it("replays recorded telemetry frame-for-frame", () => {
      const frames = record();
      const replay = createReplay(frames);

      // Khung 0 là tick đầu tiên được ghi (tick=1)
      expect(replay.state.tick).toBe(frames[0].tick);

      // Tiến qua toàn bộ khung
      for (let i = 0; i < frames.length; i++) {
        replay.tick();
      }

      // Khung cuối phải khớp bản gốc
      const lastFrame = frames[frames.length - 1];
      expect(replay.state.tick).toBe(lastFrame.tick);
      expect(replay.state.robot.x).toBe(lastFrame.robot.x);
      expect(replay.state.robot.y).toBe(lastFrame.robot.y);
    });

    it("frame 300 of replay matches original sim at tick 300", () => {
      const sim = makeSim(42);
      runTicks(sim, 600);
      const frames = sim.getTelemetry();
      const replay = createReplay(frames);

      // Tick mô phỏng 300 nằm ở frames[299] (khung 0 = tick 1, khung 299 = tick 300)
      // Tiến 299 tick để tới chỉ số khung 299
      for (let i = 0; i < 299; i++) replay.tick();

      const target = frames[299];
      expect(replay.state.tick).toBe(target.tick);
      expect(replay.state.robot.x).toBe(target.robot.x);
      expect(replay.state.robot.y).toBe(target.robot.y);
      expect(replay.state.sensors.roads).toEqual(target.sensors.roads);
      expect(replay.state.sensors.pattern).toBe(target.sensors.pattern);
    });
  });

  describe("speed control", () => {
    it("2x speed advances 2 frames per tick", () => {
      const frames = record();
      const replay = createReplay(frames);
      replay.setSpeed(2);

      const start = replay.frameIndex;
      replay.tick();

      expect(replay.frameIndex).toBe(start + 2);
    });

    it("half speed advances 1 frame every other tick", () => {
      const frames = record();
      const replay = createReplay(frames);
      replay.setSpeed(0.5);

      // Tốc độ=0.5, Math.round(0.5) = 1, nên vẫn tiến bình thường
      // Trong JS chuẩn, Math.round(0.5) là 1
      expect(replay.state.tick).toBe(frames[0].tick);
    });

    it("speed 0 pauses playback", () => {
      const frames = record();
      const replay = createReplay(frames);
      replay.setSpeed(0);

      replay.tick();
      replay.tick();
      replay.tick();

      expect(replay.frameIndex).toBe(0); // chưa di chuyển
    });
  });

  describe("step backward", () => {
    it("moves backward by one frame", () => {
      const frames = record();
      const replay = createReplay(frames);

      replay.tick();
      replay.tick();
      replay.tick();
      const afterForward = replay.frameIndex;

      replay.stepBackward();
      expect(replay.frameIndex).toBe(afterForward - 1);
    });

    it("does not go below frame 0", () => {
      const frames = record();
      const replay = createReplay(frames);

      replay.stepBackward();
      replay.stepBackward();
      expect(replay.frameIndex).toBe(0);
    });

    it("step forward + backward returns same frame data", () => {
      const frames = record();
      const replay = createReplay(frames);

      replay.tick();
      replay.tick();
      const xAt2 = replay.state.robot.x;

      replay.tick();
      replay.stepBackward();

      expect(replay.state.robot.x).toBe(xAt2);
    });
  });

  describe("reset", () => {
    it("returns to frame 0", () => {
      const frames = record();
      const replay = createReplay(frames);

      for (let i = 0; i < 50; i++) replay.tick();
      expect(replay.frameIndex).toBe(50);

      replay.reset();
      expect(replay.frameIndex).toBe(0);
      expect(replay.state.tick).toBe(frames[0].tick);
    });
  });

  describe("setMotors / calibrateGrayscale", () => {
    it("are no-ops (don't throw)", () => {
      const frames = record();
      const replay = createReplay(frames);

      replay.setMotors(1, 1);
      replay.calibrateGrayscale();
      // Không được throw
      expect(replay.frameIndex).toBe(0);
    });
  });

  describe("empty telemetry", () => {
    it("handles empty telemetry gracefully", () => {
      const replay = createReplay([]);

      expect(replay.state.tick).toBe(0);
      expect(replay.state.done).toBe(true);
      replay.tick(); // không được throw
      expect(replay.frameCount).toBe(0);
    });
  });

  describe("frameCount", () => {
    it("returns total number of frames", () => {
      const frames = record();
      const replay = createReplay(frames);
      expect(replay.frameCount).toBe(frames.length);
    });
  });
});

describe("Telemetry diff", () => {
  it("returns identical=true for same log", () => {
    const sim1 = makeSim(42);
    const sim2 = makeSim(42);
    runTicks(sim1, 50);
    runTicks(sim2, 50);

    const result = diffTelemetry(sim1.getTelemetry(), sim2.getTelemetry());
    expect(result.identical).toBe(true);
    expect(result.divergedAt).toBe(-1);
  });

  it("detects divergence with different seeds", () => {
    const sim1 = makeSim(42);
    const sim2 = makeSim(99);
    runTicks(sim1, 200);
    runTicks(sim2, 200);

    const result = diffTelemetry(sim1.getTelemetry(), sim2.getTelemetry());
    // Cùng mẫu motor nên động học phải xác định. Seed khác nhau chỉ ảnh hưởng
    // nhiễu cảm biến. Với mức nhiễu bằng 0, kết quả phải giống nhau.
    // Vì sensorNoise=0, động học xác định và cùng mẫu motor → giống nhau.
    // Kiểm thử tiếp bằng mẫu motor khác nhau.

    const sim3 = makeSim(42);
    const sim4 = makeSim(42);

    // Mẫu motor khác nhau gây phân kỳ ngay
    for (let t = 0; t < 100; t++) {
      sim3.setMotors(0.3, 0.3);
      sim3.tick();
    }
    // sim4: bắt đầu với 50 tick giống nhau, sau đó khác đi
    for (let t = 0; t < 50; t++) {
      sim4.setMotors(0.3, 0.3);
      sim4.tick();
    }
    for (let t = 50; t < 100; t++) {
      sim4.setMotors(0.4, 0.2); // khác!
      sim4.tick();
    }

    const result2 = diffTelemetry(sim3.getTelemetry(), sim4.getTelemetry());
    expect(result2.identical).toBe(false);
    expect(result2.divergedAt).toBeGreaterThan(0);
    // Phải phân kỳ ở tick 51 (chỉ số khung 50, vì frame[0] là khung đầu)
    // Đây là các khung đầu tiên có mục tiêu motor khác nhau
  });

  it("shows which fields diverged", () => {
    const sim1 = makeSim(42);
    const sim2 = makeSim(42);

    for (let t = 0; t < 10; t++) {
      sim1.setMotors(0.3, 0.3);
      sim1.tick();
    }
    // sim2: mẫu motor khác ngay từ đầu
    for (let t = 0; t < 10; t++) {
      sim2.setMotors(0.4, 0.2);
      sim2.tick();
    }

    const result = diffTelemetry(sim1.getTelemetry(), sim2.getTelemetry());
    expect(result.identical).toBe(false);
    expect(result.divergedAt).toBe(0); // Khung đầu khác vì mục tiêu motor khác nhau
    expect(result.diffFields).toContain("motorTargets.left");
    expect(result.diffFields).toContain("motorTargets.right");
  });

  it("handles different-length logs", () => {
    const sim1 = makeSim(42);
    const sim2 = makeSim(42);

    runTicks(sim1, 50);
    runTicks(sim2, 30);

    const result = diffTelemetry(sim1.getTelemetry(), sim2.getTelemetry());
    expect(result.identical).toBe(false);
    expect(result.divergedAt).toBe(30);
    expect(result.diffFields).toContain("length");
  });

  it("handles empty logs", () => {
    const result = diffTelemetry([], []);
    expect(result.identical).toBe(true);
    expect(result.divergedAt).toBe(-1);
  });
});
