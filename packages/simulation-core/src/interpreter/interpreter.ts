/**
 * IR Interpreter — thực thi chương trình robot từng bước theo mỗi tick mô phỏng.
 *
 * Blockly sinh IR → Interpreter thực thi IR → gọi sim.setMotors() và đọc sim.state.sensors.
 *
 * Mô hình thực thi:
 * - Mỗi lần gọi step() xử lý tối đa 1000 lệnh trong một tick.
 * - Lệnh motor được giữ qua các tick (lưu trong sim).
 * - Lệnh đọc cảm biến dùng sim.state.sensors hiện tại (được sim.tick() lấy mẫu).
 * - WAIT_TICKS tạm dừng instruction pointer; motor vẫn tiếp tục chạy.
 */

import { type Simulation } from "../types.js";
import {
  CompareOp,
  OpCode,
  type Interpreter as IInterpreter,
  type InterpreterConfig,
  type IRProgram,
} from "./types.js";

const MAX_INST_PER_TICK = 1000;
const DEFAULT_MAX_TICKS = 18000; // 5 phút ở 60Hz

interface LoopFrame {
  /** IP của lệnh LOOP_START */
  startIp: number;
  /** Số vòng lặp còn lại (giảm mỗi khi gặp LOOP_END) */
  remaining: number;
}

function compare(a: number, op: CompareOp, b: number): boolean {
  switch (op) {
    case CompareOp.EQ:  return a === b;
    case CompareOp.NEQ: return a !== b;
    case CompareOp.LT:  return a < b;
    case CompareOp.LTE: return a <= b;
    case CompareOp.GT:  return a > b;
    case CompareOp.GTE: return a >= b;
  }
}

/**
 * Phát hiện có road nào trong nhóm cảm biến đang nằm trên line (> 50) hay không.
 * Nhóm: 0 = left (road 0,1,2), 1 = middle (road 1,2,3), 2 = right (road 2,3,4).
 */
function detectGroup(roads: number[], group: number): number {
  const slices: [number, number][] = [[0, 2], [1, 3], [2, 4]];
  const [lo, hi] = slices[group] ?? [0, 0];
  for (let i = lo; i <= hi; i++) {
    if (roads[i] > 50) return 1;
  }
  return 0;
}

export function createInterpreter(
  program: IRProgram,
  sim: Simulation,
  config: InterpreterConfig = {},
): IInterpreter {
  const maxTicks = config.maxTicks ?? DEFAULT_MAX_TICKS;
  const commands = program.commands;

  // Xây dựng bảng ánh xạ nhãn: labelIndex → chỉ số lệnh
  const labelMap = new Map<number, number>();
  let labelIdx = 0;
  for (let i = 0; i < commands.length; i++) {
    if (commands[i].op === OpCode.LABEL) {
      labelMap.set(labelIdx, i);
      labelIdx++;
    }
  }

  // Trạng thái khi chạy
  let ip = 0;             // con trỏ lệnh
  let waitCounter = 0;    // số WAIT_TICKS còn lại
  let acc = 0;            // thanh ghi tích lũy
  const vars = new Array(8).fill(0); // 8 ô biến (0-7)
  const loopStack: LoopFrame[] = [];
  let tickCount = 0;
  let _done = false;

  function reset(): void {
    ip = 0;
    waitCounter = 0;
    acc = 0;
    for (let i = 0; i < 8; i++) vars[i] = 0;
    loopStack.length = 0;
    tickCount = 0;
    _done = false;
  }

  function step(): boolean {
    if (_done) return false;

    // Kiểm tra giới hạn thời gian chạy
    tickCount++;
    if (tickCount > maxTicks) {
      _done = true;
      return false;
    }

    // Nếu đang chờ, giảm bộ đếm và bỏ qua tick này
    if (waitCounter > 0) {
      waitCounter--;
      return true;
    }

    // Thực thi lệnh trong tick này (có giới hạn)
    let executed = 0;

    while (executed < MAX_INST_PER_TICK && ip < commands.length) {
      const cmd = commands[ip];

      switch (cmd.op) {
        case OpCode.INIT_HARDWARE:
          sim.reset();
          ip++;
          break;

        case OpCode.CALIBRATE_GRAYSCALE:
          sim.calibrateGrayscale();
          ip++;
          break;

        case OpCode.SET_MOTOR: {
          const left = cmd.args[0] ?? 0;
          const right = cmd.args[1] ?? 0;
          sim.setMotors(left, right);
          ip++;
          break;
        }

        case OpCode.WAIT_TICKS: {
          const ticks = cmd.args[0] ?? 0;
          waitCounter = ticks;
          ip++;
          executed++;
          // Dừng thực thi trong tick này, bắt đầu chờ
          return true;
        }

        case OpCode.READ_SENSOR_ROAD: {
          const roadIdx = (cmd.args[0] ?? 1) - 1; // từ 1-based sang 0-based
          const roads = sim.state.sensors.roads;
          acc = roads[Math.max(0, Math.min(4, roadIdx))];
          ip++;
          break;
        }

        case OpCode.READ_SENSOR_GROUP: {
          const group = cmd.args[0] ?? 0;
          acc = detectGroup(sim.state.sensors.roads as number[], group);
          ip++;
          break;
        }

        case OpCode.READ_LINE_POSITION:
          acc = sim.state.sensors.linePosition;
          ip++;
          break;

        case OpCode.IF_SENSOR_VALUE: {
          const roadIdx = (cmd.args[0] ?? 1) - 1;
          const threshold = cmd.args[1] ?? 50;
          const op = cmd.args[2] as CompareOp;
          const jumpLabelIdx = cmd.args[3];

          const roads = sim.state.sensors.roads;
          const value = roads[Math.max(0, Math.min(4, roadIdx))];
          const condition = compare(value, op, threshold);
          acc = condition ? 1 : 0;

          if (condition && jumpLabelIdx !== undefined) {
            const targetIp = labelMap.get(jumpLabelIdx);
            if (targetIp !== undefined) {
              ip = targetIp + 1; // nhảy tới lệnh sau nhãn
            } else {
              ip++;
            }
          } else {
            ip++;
          }
          break;
        }

        case OpCode.SET_VAR: {
          const varIdx = cmd.args[0] ?? 0;
          const value = cmd.args[1] ?? 0;
          if (varIdx >= 0 && varIdx < 8) {
            vars[varIdx] = value;
          }
          ip++;
          break;
        }

        case OpCode.LABEL:
          // Nhãn là thụ động, đã được xử lý trước vào labelMap nên chỉ cần bỏ qua
          ip++;
          break;

        case OpCode.JUMP: {
          const jumpLabelIdx = cmd.args[0];
          const targetIp = labelMap.get(jumpLabelIdx);
          if (targetIp !== undefined) {
            ip = targetIp + 1; // nhảy tới lệnh sau nhãn
          } else {
            ip++;
          }
          break;
        }

        case OpCode.LOOP_START: {
          const count = cmd.args[0] ?? 0;
          loopStack.push({ startIp: ip, remaining: count });
          ip++;
          break;
        }

        case OpCode.LOOP_END: {
          const frame = loopStack[loopStack.length - 1];
          if (frame && frame.remaining > 0) {
            frame.remaining--;
            if (frame.remaining > 0) {
              ip = frame.startIp + 1; // nhảy về lệnh đầu tiên sau LOOP_START
            } else {
              loopStack.pop();
              ip++;
            }
          } else {
            // LOOP_END không khớp, chỉ pop và tiếp tục
            if (frame) loopStack.pop();
            ip++;
          }
          break;
        }

        case OpCode.END_PROGRAM:
          _done = true;
          return false;

        default:
          // Opcode không xác định, bỏ qua
          ip++;
          break;
      }

      executed++;
    }

    // Nếu đã chạy vượt khỏi cuối chương trình
    if (ip >= commands.length) {
      _done = true;
      return false;
    }

    return true;
  }

  return {
    step,
    reset,
    get done() {
      return _done;
    },
  };
}
