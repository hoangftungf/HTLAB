import { describe, it, expect } from "vitest";
import {
  computeKinematics,
  motorToWheelVel,
  applyAccelLimit,
  applyFriction,
} from "../src/kinematics.js";
import {
  type RobotConfig,
  type RobotState,
  DEFAULT_ROBOT_CONFIG,
} from "../src/types.js";

const DT = 1 / 60;
const config: RobotConfig = {
  ...DEFAULT_ROBOT_CONFIG,
  maxSpeed: 500,
  maxAccel: 2000,
  friction: 0.0, // tắt ma sát cho hầu hết kiểm thử
  deadzone: 0.02,
  wheelbase: 150,
};

describe("motorToWheelVel", () => {
  it("converts normalized signals to wheel velocities", () => {
    const result = motorToWheelVel(1.0, -1.0, config);
    expect(result.left).toBeCloseTo(500, 1);
    expect(result.right).toBeCloseTo(-500, 1);
  });

  it("handles deadzone", () => {
    const result = motorToWheelVel(0.01, 0.01, config);
    expect(result.left).toBe(0);
    expect(result.right).toBe(0);
  });

  it("handles zero signal", () => {
    const result = motorToWheelVel(0, 0, config);
    expect(result.left).toBe(0);
    expect(result.right).toBe(0);
  });

  it("scales partial signals correctly", () => {
    const result = motorToWheelVel(0.5, 0.5, config);
    expect(result.left).toBeCloseTo(250, 1);
    expect(result.right).toBeCloseTo(250, 1);
  });
});

describe("applyAccelLimit", () => {
  it("reaches target when change is within limits", () => {
    const result = applyAccelLimit(100, 90, DT, config);
    // maxChange = 2000 * 1/60 ≈ 33.3, nên 90→100 vẫn hợp lệ
    expect(result).toBeCloseTo(100, 1);
  });

  it("caps acceleration at maxAccel", () => {
    const result = applyAccelLimit(500, 0, DT, config);
    // maxChange = 2000 / 60 ≈ 33.3
    expect(result).toBeCloseTo(33.33, 1);
  });

  it("caps deceleration at maxAccel (symmetry)", () => {
    const result = applyAccelLimit(-500, 0, DT, config);
    expect(result).toBeCloseTo(-33.33, 1);
  });

  it("handles negative current to more negative target", () => {
    const result = applyAccelLimit(-200, -100, DT, config);
    expect(result).toBeCloseTo(-133.33, 1);
  });
});

describe("applyFriction", () => {
  const fricConfig = { ...config, friction: 0.15, maxSpeed: 500 };

  it("applies friction when motor target is zero", () => {
    const result = applyFriction(200, 0, DT, fricConfig);
    // decay = 0.15 * 500 * 1/60 = 1.25
    expect(result).toBeCloseTo(200 - 1.25, 1);
  });

  it("does NOT apply friction when motor target is non-zero", () => {
    const result = applyFriction(200, 0.5, DT, fricConfig);
    expect(result).toBe(200);
  });

  it("stops at zero when speed is below decay threshold", () => {
    const result = applyFriction(0.5, 0, DT, fricConfig);
    // decay = 1.25 > 0.5, nên kết quả phải là 0
    expect(result).toBe(0);
  });
});

describe("computeKinematics", () => {
  it("robot moves forward with both motors at 0.5", () => {
    const state: RobotState = {
      x: 0,
      y: 0,
      heading: 0,
      leftSpeed: 0,
      rightSpeed: 0,
    };

    // Sau một tick ở gia tốc tối đa, tốc độ bắt đầu tăng
    const result = computeKinematics(state, 0.5, 0.5, DT, config);
    expect(result.x).toBeGreaterThan(0);
    expect(result.y).toBeCloseTo(0, 5);
    expect(result.heading).toBeCloseTo(0, 5);
  });

  it("robot turns in place with opposite motors", () => {
    const state: RobotState = {
      x: 0,
      y: 0,
      heading: 0,
      leftSpeed: 0,
      rightSpeed: 0,
    };

    const result = computeKinematics(state, 0.3, -0.3, DT, config);
    // Heading phải thay đổi (quay theo chiều kim đồng hồ vì trái tiến, phải lùi)
    expect(result.heading).not.toBe(0);
    // Vị trí không nên thay đổi nhiều (quay tại chỗ)
    expect(Math.abs(result.x)).toBeLessThan(1);
    expect(Math.abs(result.y)).toBeLessThan(1);
  });

  it("robot with friction=1.0 stops quickly", () => {
    const highFricConfig = { ...config, friction: 1.0 };

    // Trước tiên tăng tốc robot
    let state: RobotState = {
      x: 0,
      y: 0,
      heading: 0,
      leftSpeed: 200,
      rightSpeed: 200,
    };

    // Áp dụng tín hiệu motor bằng 0 với ma sát cao
    state = computeKinematics(state, 0, 0, DT, highFricConfig);
    // Tốc độ phải giảm
    expect(state.leftSpeed).toBeLessThan(200);
    expect(state.rightSpeed).toBeLessThan(200);
  });

  it("is deterministic — same inputs = same outputs", () => {
    const state: RobotState = {
      x: 50,
      y: 100,
      heading: Math.PI / 4,
      leftSpeed: 150,
      rightSpeed: 100,
    };

    const r1 = computeKinematics(state, 0.8, 0.2, DT, config);
    const r2 = computeKinematics(state, 0.8, 0.2, DT, config);

    expect(r1.x).toBe(r2.x);
    expect(r1.y).toBe(r2.y);
    expect(r1.heading).toBe(r2.heading);
    expect(r1.leftSpeed).toBe(r2.leftSpeed);
    expect(r1.rightSpeed).toBe(r2.rightSpeed);
  });

  it("respects maxSpeed limit", () => {
    const state: RobotState = {
      x: 0,
      y: 0,
      heading: 0,
      leftSpeed: 499,
      rightSpeed: 499,
    };

    const result = computeKinematics(state, 1.0, 1.0, DT, config);
    // Tốc độ không được vượt maxSpeed
    expect(result.leftSpeed).toBeLessThanOrEqual(config.maxSpeed + 0.01);
    expect(result.rightSpeed).toBeLessThanOrEqual(config.maxSpeed + 0.01);
  });
});
