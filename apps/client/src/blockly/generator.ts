/**
 * Bộ sinh IR cho các block Blockly.
 * Duyệt Blockly workspace và tạo IRProgram dạng JSON.
 */

import * as Blockly from "blockly";
import { OpCode, CompareOp, type IRCommand, type IRProgram } from "@htlab/simulation-core";

const POWER_SPEEDS: Record<string, number> = {
  low: 0.2,
  medium: 0.4,
  high: 0.7,
};

/**
 * Bộ đếm label đơn giản để sinh chỉ số label duy nhất trong một workspace.
 */
let labelCounter = 0;
function nextLabel(): number {
  return labelCounter++;
}

/**
 * Sinh IRCommand[] từ một Blockly workspace.
 */
export function workspaceToIR(workspace: Blockly.Workspace): IRProgram {
  labelCounter = 0;
  const commands: IRCommand[] = [];

  const topBlocks = workspace.getTopBlocks(true);

  for (const block of topBlocks) {
    if (block.isEnabled()) {
      const cmds = blockToIR(block);
      commands.push(...cmds);
    }
  }

  // Tự thêm END_PROGRAM nếu chưa có
  if (commands.length === 0 || commands[commands.length - 1]?.op !== OpCode.END_PROGRAM) {
    commands.push({ op: OpCode.END_PROGRAM, args: [] });
  }

  return { commands, version: 1 };
}

/**
 * Sinh IRCommand[] từ một block đơn lẻ (đệ quy xử lý block con).
 */
function blockToIR(block: Blockly.Block): IRCommand[] {
  const type = block.type;
  const result: IRCommand[] = [];

  switch (type) {
    // ---- Phần cứng ----
    case "initialize":
      result.push({ op: OpCode.INIT_HARDWARE, args: [] });
      break;

    case "calibrate_grayscale":
      // Hiệu chuẩn hai pha
      result.push({ op: OpCode.CALIBRATE_GRAYSCALE, args: [] });
      result.push({ op: OpCode.CALIBRATE_GRAYSCALE, args: [] });
      break;

    // ---- Di chuyển ----
    case "patrol_line": {
      const dir = block.getFieldValue("DIRECTION");
      const speed = parseFloat(block.getFieldValue("SPEED") || "0.3");
      const sign = dir === "backward" ? -1 : 1;
      const s = speed * sign;

      // Vòng lặp dò vạch:
      // LABEL loop
      // IF road[3] > 50 → nhảy tới nhãn straight
      //   quay phải để tìm vạch → nhảy về loop
      // LABEL straight
      //   SET_MOTOR(s, s) → chờ 1 → nhảy về loop
      const labelLoop = nextLabel();
      const labelStraight = nextLabel();

      result.push({ op: OpCode.LABEL, args: [], label: `patrol_loop_${labelLoop}` });
      result.push({ op: OpCode.IF_SENSOR_VALUE, args: [3, 50, CompareOp.GT, labelStraight] });
      // Mất vạch, quay phải để tìm lại
      result.push({ op: OpCode.SET_MOTOR, args: [s * 0.5, 0] });
      result.push({ op: OpCode.WAIT_TICKS, args: [1] });
      result.push({ op: OpCode.JUMP, args: [labelLoop] });
      // Đã thấy vạch, đi thẳng
      result.push({ op: OpCode.LABEL, args: [], label: `patrol_straight_${labelStraight}` });
      result.push({ op: OpCode.SET_MOTOR, args: [s, s] });
      result.push({ op: OpCode.WAIT_TICKS, args: [1] });
      result.push({ op: OpCode.JUMP, args: [labelLoop] });
      break;
    }

    case "turn_left": {
      const power = POWER_SPEEDS[block.getFieldValue("POWER")] || 0.4;
      result.push({ op: OpCode.SET_MOTOR, args: [-power, power] });
      break;
    }

    case "turn_right": {
      const power = POWER_SPEEDS[block.getFieldValue("POWER")] || 0.4;
      result.push({ op: OpCode.SET_MOTOR, args: [power, -power] });
      break;
    }

    case "start_motor": {
      const dir = block.getFieldValue("DIR");
      const left = parseFloat(block.getFieldValue("LEFT") || "0.3");
      const right = parseFloat(block.getFieldValue("RIGHT") || "0.3");
      const time = parseFloat(block.getFieldValue("TIME") || "1");
      const sign = dir === "backward" ? -1 : 1;
      const ticks = Math.round(time * 60); // giây → tick ở 60Hz
      result.push({ op: OpCode.SET_MOTOR, args: [left * sign, right * sign] });
      result.push({ op: OpCode.WAIT_TICKS, args: [ticks] });
      result.push({ op: OpCode.SET_MOTOR, args: [0, 0] });
      break;
    }

    // ---- Cảm biến ----
    case "read_sensor_road": {
      const road = parseInt(block.getFieldValue("ROAD") || "3");
      result.push({ op: OpCode.READ_SENSOR_ROAD, args: [road] });
      break;
    }

    case "sensor_group_detected": {
      const group = parseInt(block.getFieldValue("GROUP") || "1");
      result.push({ op: OpCode.READ_SENSOR_GROUP, args: [group] });
      break;
    }

    case "line_position":
      result.push({ op: OpCode.READ_LINE_POSITION, args: [] });
      break;

    // ---- Logic ----
    case "if_sensor": {
      const road = parseInt(block.getFieldValue("ROAD") || "3");
      const op = block.getFieldValue("OP") as keyof typeof CompareOp;
      const threshold = parseFloat(block.getFieldValue("THRESHOLD") || "50");
      const compareOp = CompareOp[op] ?? CompareOp.GT;

      const afterLabel = nextLabel();
      const doBlock = block.getInputTargetBlock("DO");

      // IF road[road] op threshold → nhảy tới do_body
      // nhảy tới nhãn after_label
      // LABEL do_body (được sinh từ block con)
      // LABEL nhãn after_label
      if (doBlock) {
        const doLabel = nextLabel();
        result.push({ op: OpCode.IF_SENSOR_VALUE, args: [road, threshold, compareOp, doLabel] });
        result.push({ op: OpCode.JUMP, args: [afterLabel] });
        result.push({ op: OpCode.LABEL, args: [], label: `if_do_${doLabel}` });
        const doCmds = blockToIR(doBlock);
        result.push(...doCmds);
        const nextCmds = processNextBlock(block);
        if (nextCmds.length > 0) {
          result.push(...nextCmds);
        }
      }
      result.push({ op: OpCode.LABEL, args: [], label: `if_after_${afterLabel}` });
      // Xử lý block tiếp theo sau if
      if (doBlock) {
        // Đã xử lý ở trên
      } else {
        const nextCmds = processNextBlock(block);
        if (nextCmds.length > 0) result.push(...nextCmds);
      }
      break;
    }

    case "repeat_loop": {
      const times = parseInt(block.getFieldValue("TIMES") || "3");
      const doBlock = block.getInputTargetBlock("DO");

      result.push({ op: OpCode.LOOP_START, args: [times] });
      if (doBlock) {
        const doCmds = blockToIR(doBlock);
        result.push(...doCmds);
      }
      result.push({ op: OpCode.LOOP_END, args: [] });
      break;
    }

    case "wait_block": {
      const time = parseFloat(block.getFieldValue("TIME") || "1");
      const ticks = Math.round(time * 60);
      result.push({ op: OpCode.WAIT_TICKS, args: [ticks] });
      break;
    }

    // ---- Biến ----
    case "set_var": {
      const varIdx = parseInt(block.getFieldValue("VAR") || "0");
      const value = parseFloat(block.getFieldValue("VALUE") || "0");
      result.push({ op: OpCode.SET_VAR, args: [varIdx, value] });
      break;
    }

    default:
      // Loại block không xác định, bỏ qua
      break;
  }

  // Xử lý block tiếp theo trong chuỗi (đối với block câu lệnh)
  if (block.nextConnection?.isConnected()) {
    const nextBlock = block.getNextBlock();
    if (nextBlock) {
      const nextCmds = blockToIR(nextBlock);
      result.push(...nextCmds);
    }
  }

  return result;
}

/**
 * Lấy lệnh IR từ block được nối phía sau block hiện tại qua nextConnection.
 */
function processNextBlock(block: Blockly.Block): IRCommand[] {
  if (block.nextConnection?.isConnected()) {
    const next = block.getNextBlock();
    if (next) return blockToIR(next);
  }
  return [];
}
