/**
 * Công cụ diff telemetry — so sánh hai log telemetry và tìm điểm phân kỳ.
 */

import type { TelemetryFrame } from "../types.js";
import type { TelemetryDiff } from "./types.js";

/**
 * So sánh hai log telemetry theo từng frame.
 * Trả về tick đầu tiên phân kỳ và các field khác nhau.
 */
export function diffTelemetry(
  a: TelemetryFrame[],
  b: TelemetryFrame[],
): TelemetryDiff {
  const minLen = Math.min(a.length, b.length);

  for (let i = 0; i < minLen; i++) {
    const fa = a[i];
    const fb = b[i];
    const fields = diffFrame(fa, fb);

    if (fields.length > 0) {
      return {
        divergedAt: i,
        diffFields: fields,
        identical: false,
      };
    }
  }

  // Nếu độ dài khác nhau, chúng phân kỳ tại độ dài ngắn hơn
  if (a.length !== b.length) {
    return {
      divergedAt: minLen,
      diffFields: ["length"],
      identical: false,
    };
  }

  return { divergedAt: -1, diffFields: [], identical: true };
}

/**
 * So sánh hai frame telemetry riêng lẻ và trả về tên các field khác nhau.
 */
function diffFrame(a: TelemetryFrame, b: TelemetryFrame): string[] {
  const fields: string[] = [];

  if (a.tick !== b.tick) fields.push("tick");

  // Trạng thái robot
  if (a.robot.x !== b.robot.x) fields.push("robot.x");
  if (a.robot.y !== b.robot.y) fields.push("robot.y");
  if (a.robot.heading !== b.robot.heading) fields.push("robot.heading");
  if (a.robot.leftSpeed !== b.robot.leftSpeed) fields.push("robot.leftSpeed");
  if (a.robot.rightSpeed !== b.robot.rightSpeed) fields.push("robot.rightSpeed");

  // Cảm biến
  for (let i = 0; i < 5; i++) {
    if (a.sensors.roads[i] !== b.sensors.roads[i]) {
      fields.push(`sensors.roads[${i}]`);
    }
  }
  if (a.sensors.pattern !== b.sensors.pattern) fields.push("sensors.pattern");
  if (a.sensors.linePosition !== b.sensors.linePosition) fields.push("sensors.linePosition");

  // Mục tiêu motor
  if (a.motorTargets.left !== b.motorTargets.left) fields.push("motorTargets.left");
  if (a.motorTargets.right !== b.motorTargets.right) fields.push("motorTargets.right");

  return fields;
}
