/**
 * Mô phỏng replay — tạo một sim chỉ đọc để phát lại telemetry frame
 * theo từng tick, không tính vật lý mà chỉ playback.
 *
 * Hỗ trợ:
 * - Bước tiến/lùi theo frame
 * - Tốc độ có thể chỉnh (1x, 2x, 0.5x, v.v.)
 * - Đủ method của interface Simulation (setMotors/calibrateGrayscale là no-op)
 */

import type { ReplaySimulation } from "./telemetry/index.js";
import type {
  MotorEncoderPort,
  RuntimeState,
  SensorState,
  SimState,
  Simulation,
  TelemetryEvent,
  TelemetryFrame,
} from "./types.js";

/**
 * Tạo mô phỏng replay từ dữ liệu telemetry đã ghi.
 * Mỗi lần gọi tick() sẽ đẩy playback tiến `speed` frame.
 */
export function createReplay(telemetry: TelemetryFrame[]): ReplaySimulation {
  const frames = telemetry;
  let frameIdx = 0;
  let _speed = 1;

  function currentFrame(): TelemetryFrame | undefined {
    return frames[Math.max(0, Math.min(frameIdx, frames.length - 1))];
  }

  function emptyRuntime(): RuntimeState {
    return {
      timerStartTick: 0,
      motorEncoders: { A: 0, B: 0, C: 0, D: 0 },
      events: [],
    };
  }

  function copyRuntime(runtime: RuntimeState | undefined): RuntimeState {
    const source = runtime ?? emptyRuntime();
    return {
      timerStartTick: source.timerStartTick,
      motorEncoders: { ...source.motorEncoders },
      events: source.events.map((event) => ({
        ...event,
        payload: { ...event.payload },
        source: event.source ? { ...event.source } : undefined,
      })),
    };
  }

  function buildState(): SimState {
    const f = currentFrame();
    if (!f) {
      return {
        tick: 0,
        running: false,
        done: true,
        robot: { x: 0, y: 0, heading: 0, leftSpeed: 0, rightSpeed: 0 },
        sensors: {
          roads: [0, 0, 0, 0, 0],
          pattern: "00000",
          linePosition: 0,
          calibrated: false,
          thresholds: { white: 100, black: 200 },
        },
        runtime: emptyRuntime(),
      };
    }
    return {
      tick: f.tick,
      running: false,
      done: frameIdx >= frames.length - 1,
      robot: { ...f.robot },
      sensors: {
        ...f.sensors,
        roads: [...(f.sensors.roads as number[])] as SensorState["roads"],
      },
      runtime: copyRuntime(f.runtime),
    };
  }

  const replay: ReplaySimulation = {
    get state(): SimState {
      return buildState();
    },

    tick(): void {
      frameIdx = Math.min(frameIdx + Math.round(_speed), frames.length - 1);
    },

    stepBackward(): void {
      frameIdx = Math.max(frameIdx - Math.round(_speed), 0);
    },

    setSpeed(speed: number): void {
      _speed = Math.max(0, speed);
    },

    get speed(): number {
      return _speed;
    },

    get frameIndex(): number {
      return frameIdx;
    },

    get frameCount(): number {
      return frames.length;
    },

    setMotors(): void {
      // Không làm gì trong chế độ phát lại
    },

    reset(): void {
      frameIdx = 0;
    },

    getTelemetry(): TelemetryFrame[] {
      return [...frames];
    },

    calibrateGrayscale(): void {
      // Không làm gì trong chế độ phát lại
    },
    resetTimer(): void {
      // No-op in replay mode.
    },

    resetMotorEncoder(_port: MotorEncoderPort | "all" = "all"): void {
      // No-op in replay mode.
    },

    recordEvent(_event: Omit<TelemetryEvent, "tick" | "sequence">): void {
      // No-op in replay mode.
    },

    getEvents(): TelemetryEvent[] {
      return copyRuntime(currentFrame()?.runtime).events;
    },
  };

  return replay;
}
