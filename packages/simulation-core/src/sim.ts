/**
 * Simulation — engine mô phỏng lõi.
 *
 * Chạy mô phỏng robotics 2D xác định với fixed timestep 60Hz.
 * Dùng PRNG có seed cho mọi hành vi không xác định (noise, v.v.)
 * để cùng config + seed luôn cho cùng output.
 *
 * Thiết kế:
 * - tick() luôn tiến đúng 1/60s
 * - Vật lý độc lập với frame rate render
 * - Việc lấy mẫu cảm biến được ủy quyền cho module grayscale sensor
 * - Ghi telemetry bằng ring buffer (mở rộng ở C-004)
 */

import { computeKinematics } from "./kinematics.js";
import { createRNG, type RNG } from "./rng.js";
import {
  createGrayscaleSensor,
  type GrayscaleSensor,
} from "./sensor/index.js";
import {
  DEFAULT_ROBOT_CONFIG,
  DEFAULT_SENSOR_STATE,
  type MotorEncoderPort,
  type MotorTargets,
  type RobotConfig,
  type RobotState,
  type RuntimeState,
  type SensorState,
  type SimState,
  type Simulation,
  type SimulationConfig,
  type TelemetryEvent,
  type TelemetryFrame,
} from "./types.js";

const FIXED_DT = 1 / 60; // 16.667ms
const DEFAULT_MAX_TELEMETRY = 3600; // 60 giây ở 60fps

export function createSimulation(config: SimulationConfig): Simulation {
  const rng: RNG = createRNG(config.seed ?? 42);
  const robotConfig: RobotConfig = {
    ...DEFAULT_ROBOT_CONFIG,
    ...config.robotConfig,
  };
  const map = config.map;
  const startPose = map.metadata.startPose;

  // Trạng thái
  let robot: RobotState = {
    x: startPose.x,
    y: startPose.y,
    heading: startPose.heading,
    leftSpeed: 0,
    rightSpeed: 0,
  };
  let sensors: SensorState = { ...DEFAULT_SENSOR_STATE };
  let tickCounter = 0;
  let running = false;
  let done = false;
  let motorTargets: MotorTargets = { left: 0, right: 0 };
  let timerStartTick = 0;
  let motorEncoders: Record<MotorEncoderPort, number> = { A: 0, B: 0, C: 0, D: 0 };
  let events: TelemetryEvent[] = [];
  let eventSequence = 0;
  let telemetry: TelemetryFrame[] = [];
  const maxTelemetryFrames = config.maxTelemetryFrames ?? DEFAULT_MAX_TELEMETRY;

  // Cảm biến grayscale
  const grayscaleSensor: GrayscaleSensor = createGrayscaleSensor({
    sensorSpacing: robotConfig.sensorSpacing,
    sensorOffset: robotConfig.sensorOffset,
    noise: robotConfig.sensorNoise,
    bias: robotConfig.sensorBias,
    latency: robotConfig.latency,
  });

  function copyRuntimeState(): RuntimeState {
    return {
      timerStartTick,
      motorEncoders: { ...motorEncoders },
      events: events.map((event) => ({
        ...event,
        payload: { ...event.payload },
        source: event.source ? { ...event.source } : undefined,
      })),
    };
  }

  function recordTelemetry(): void {
    const frame: TelemetryFrame = {
      tick: tickCounter,
      robot: { ...robot },
      sensors: { ...sensors, roads: [...sensors.roads] as SensorState["roads"] },
      motorTargets: { ...motorTargets },
      runtime: copyRuntimeState(),
    };
    telemetry.push(frame);
    if (telemetry.length > maxTelemetryFrames) {
      telemetry = telemetry.slice(-maxTelemetryFrames);
    }
  }

  function trimEvents(): void {
    if (events.length > maxTelemetryFrames) {
      events = events.slice(-maxTelemetryFrames);
    }
  }

  function resetEncoder(port: MotorEncoderPort | "all" = "all"): void {
    if (port === "all") {
      motorEncoders = { A: 0, B: 0, C: 0, D: 0 };
      return;
    }
    motorEncoders = { ...motorEncoders, [port]: 0 };
  }

  const sim: Simulation = {
    get state(): SimState {
      return {
        tick: tickCounter,
        running,
        done,
        robot: { ...robot },
        sensors: { ...sensors, roads: [...sensors.roads] as SensorState["roads"] },
        runtime: copyRuntimeState(),
      };
    },

    tick(): void {
      // Lấy mẫu cảm biến grayscale tại vị trí robot hiện tại
      sensors = grayscaleSensor.sample(robot, config.map, sensors, rng);

      // Cập nhật động học
      robot = computeKinematics(
        robot,
        motorTargets.left,
        motorTargets.right,
        FIXED_DT,
        robotConfig,
      );

      const degreesPerMm = 360 / (2 * Math.PI * robotConfig.wheelRadius);
      motorEncoders = {
        ...motorEncoders,
        A: motorEncoders.A + robot.leftSpeed * FIXED_DT * degreesPerMm,
        B: motorEncoders.B + robot.rightSpeed * FIXED_DT * degreesPerMm,
      };

      tickCounter++;
      recordTelemetry();
    },

    setMotors(left: number, right: number): void {
      // Chặn trong khoảng [-1, 1]
      motorTargets.left = Math.max(-1, Math.min(1, left));
      motorTargets.right = Math.max(-1, Math.min(1, right));
    },

    reset(): void {
      robot = {
        x: startPose.x,
        y: startPose.y,
        heading: startPose.heading,
        leftSpeed: 0,
        rightSpeed: 0,
      };
      sensors = { ...DEFAULT_SENSOR_STATE };
      tickCounter = 0;
      running = false;
      done = false;
      motorTargets = { left: 0, right: 0 };
      timerStartTick = 0;
      resetEncoder("all");
      events = [];
      eventSequence = 0;
      telemetry = [];
      grayscaleSensor.reset();
    },

    calibrateGrayscale(): void {
      const newThresholds = grayscaleSensor.calibrate(robot, config.map);
      sensors = {
        ...sensors,
        thresholds: newThresholds,
        calibrated: true,
      };
    },

    getTelemetry(): TelemetryFrame[] {
      return [...telemetry];
    },

    resetTimer(): void {
      timerStartTick = tickCounter;
      this.recordEvent({
        kind: "state",
        op: "sensor.resetTimer",
        label: "Reset timer",
        payload: { timerStartTick },
        severity: "info",
      });
    },

    resetMotorEncoder(port: MotorEncoderPort | "all" = "all"): void {
      resetEncoder(port);
      this.recordEvent({
        kind: "state",
        op: "sensor.resetMotorEncoder",
        label: "Reset motor encoder",
        payload: { port },
        severity: "info",
      });
    },

    recordEvent(event: Omit<TelemetryEvent, "tick" | "sequence">): void {
      events.push({
        ...event,
        tick: tickCounter,
        sequence: eventSequence++,
        payload: { ...event.payload },
        source: event.source ? { ...event.source } : undefined,
      });
      trimEvents();
    },

    getEvents(): TelemetryEvent[] {
      return copyRuntimeState().events;
    },
  };

  return sim;
}
