/**
 * Động học differential drive cho robot di động 2D.
 *
 * Mô hình chuẩn:
 *   v     = (vL + vR) / 2          (vận tốc tuyến tính)
 *   omega = (vR - vL) / wheelbase  (vận tốc góc)
 *
 * Cập nhật mỗi tick (1/60s):
 *   heading += omega * dt
 *   x       += v * cos(heading) * dt
 *   y       += v * sin(heading) * dt
 *
 * Tốc độ motor được chuẩn hóa trong [-1, 1] rồi chuyển thành vận tốc bánh
 * theo maxSpeed, có giới hạn gia tốc và ma sát.
 */

import type { RobotConfig, RobotState, WheelVelocities } from "./types.js";

/**
 * Chuyển mục tiêu motor đã chuẩn hóa [-1, 1] thành vận tốc bánh (mm/s),
 * có áp dụng deadzone và maxSpeed.
 */
export function motorToWheelVel(
  left: number,
  right: number,
  config: RobotConfig,
): WheelVelocities {
  const apply = (signal: number): number => {
    // Vùng chết
    if (Math.abs(signal) < config.deadzone) return 0;
    // Quy đổi theo maxSpeed
    return signal * config.maxSpeed;
  };
  return { left: apply(left), right: apply(right) };
}

/**
 * Tính vận tốc bánh thực tế từ mục tiêu, giới hạn gia tốc và vận tốc hiện tại.
 */
export function applyAccelLimit(
  target: number,
  current: number,
  dt: number,
  config: RobotConfig,
): number {
  const maxChange = config.maxAccel * dt;
  const diff = target - current;
  if (Math.abs(diff) <= maxChange) return target;
  return current + Math.sign(diff) * maxChange;
}

/**
 * Áp dụng ma sát: mất một phần vận tốc mỗi tick khi không có tín hiệu motor.
 * Chỉ áp dụng nếu mục tiêu motor của bánh đó bằng 0.
 */
export function applyFriction(
  speed: number,
  motorTarget: number,
  dt: number,
  config: RobotConfig,
): number {
  if (motorTarget !== 0) return speed;
  // Giảm dần về 0
  const decay = config.friction * config.maxSpeed * dt; // phần maxSpeed bị mất mỗi tick
  if (Math.abs(speed) <= decay) return 0;
  return speed - Math.sign(speed) * decay;
}

/**
 * Tính trạng thái robot mới sau một fixed timestep.
 * @param state - trạng thái robot hiện tại
 * @param motorLeft - tín hiệu motor trái đã chuẩn hóa [-1, 1]
 * @param motorRight - tín hiệu motor phải đã chuẩn hóa [-1, 1]
 * @param dt - timestep tính bằng giây (1/60)
 * @param config - cấu hình robot
 * @returns trạng thái robot mới
 */
export function computeKinematics(
  state: RobotState,
  motorLeft: number,
  motorRight: number,
  dt: number,
  config: RobotConfig,
): RobotState {
  // Chuyển tín hiệu motor thành vận tốc bánh mục tiêu
  const targets = motorToWheelVel(motorLeft, motorRight, config);

  // Áp dụng giới hạn gia tốc
  const leftVel = applyAccelLimit(targets.left, state.leftSpeed, dt, config);
  const rightVel = applyAccelLimit(
    targets.right,
    state.rightSpeed,
    dt,
    config,
  );

  // Áp dụng ma sát (chỉ khi mục tiêu bằng 0)
  const leftWithFriction = applyFriction(leftVel, motorLeft, dt, config);
  const rightWithFriction = applyFriction(rightVel, motorRight, dt, config);

  // Tính vận tốc thân robot
  const v = (leftWithFriction + rightWithFriction) / 2;
  const omega =
    config.wheelbase > 0
      ? (rightWithFriction - leftWithFriction) / config.wheelbase
      : 0;

  // Tích phân trạng thái
  const newHeading = state.heading + omega * dt;
  const dx = v * Math.cos(newHeading) * dt;
  const dy = v * Math.sin(newHeading) * dt;

  return {
    x: state.x + dx,
    y: state.y + dy,
    heading: newHeading,
    leftSpeed: leftWithFriction,
    rightSpeed: rightWithFriction,
  };
}
