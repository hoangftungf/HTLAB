/**
 * Các kiểu IR (Intermediate Representation) cho HTLAB.
 *
 * Bộ sinh code Blockly tạo IRProgram dạng JSON.
 * Interpreter nhận IRProgram và thực thi IRCommand trên một Simulation.
 *
 * Tất cả cấu trúc khớp với contract trong flow/05-contract.md.
 */

// ---- OpCode ----

export enum OpCode {
  INIT_HARDWARE = 0,
  CALIBRATE_GRAYSCALE = 1,
  SET_MOTOR = 2,
  WAIT_TICKS = 3,
  READ_SENSOR_ROAD = 4,
  READ_SENSOR_GROUP = 5,
  READ_LINE_POSITION = 6,
  IF_SENSOR_VALUE = 7,
  SET_VAR = 8,
  LABEL = 9,
  JUMP = 10,
  LOOP_START = 11,
  LOOP_END = 12,
  END_PROGRAM = 13,
}

// ---- CompareOp (dùng cho IF_SENSOR_VALUE) ----

export enum CompareOp {
  EQ = 0,
  NEQ = 1,
  LT = 2,
  LTE = 3,
  GT = 4,
  GTE = 5,
}

// ---- IRCommand ----

export interface IRCommand {
  op: OpCode;
  args: number[];
  label?: string;
}

// ---- IRProgram ----

export interface IRProgram {
  commands: IRCommand[];
  version: 1;
}

// ---- Giao diện bộ thông dịch ----

export interface Interpreter {
  /** Thực thi tối đa 1000 lệnh cho tick này. Trả về true nếu vẫn còn lệnh. */
  step(): boolean;
  /** Đặt lại trạng thái bộ thông dịch (IP, ACC, biến, vòng lặp, chờ). KHÔNG đặt lại mô phỏng. */
  reset(): void;
  /** Chương trình đã kết thúc (gặp END_PROGRAM hoặc IP vượt lệnh cuối). */
  readonly done: boolean;
}

// ---- Cấu hình bộ thông dịch ----

export interface InterpreterConfig {
  /** Số tick tối đa trước khi buộc dừng (mặc định 18000 = 5 phút ở 60Hz). */
  maxTicks?: number;
}
