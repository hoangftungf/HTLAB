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

// ---- IRProgram v1 ----

export interface IRProgramV1 {
  commands: IRCommand[];
  version: 1;
  diagnostics?: IRDiagnostic[];
}

// ---- IR v2 foundation ----

export type IRRuntimeStatus =
  | "implemented"
  | "telemetry-only"
  | "stub"
  | "blocked-by-sandbox";

export type IRDiagnosticSeverity = "info" | "warning" | "error";

export type IRPrimitive = string | number | boolean | null;

export interface IRSourceRef {
  blockId?: string;
  blockType: string;
  category?: string;
  label?: string;
}

export interface IRDiagnostic {
  code: string;
  severity: IRDiagnosticSeverity;
  message: string;
  source?: IRSourceRef;
  runtimeStatus?: IRRuntimeStatus;
  handlerId?: string;
}

export interface IRCCodeSandboxPolicy {
  required: true;
  status: "available" | "blocked";
  timeoutMs: number;
  memoryMb: number;
  allowedApis: string[];
}

export interface IRCCodePayload {
  language: "c";
  source: string;
  entryPoint?: string;
  sandbox: IRCCodeSandboxPolicy;
}

export type IRValueExpression =
  | { kind: "literal"; value: IRPrimitive }
  | { kind: "variable"; name: string }
  | { kind: "sensor"; sensor: string; port?: string | number; channel?: number }
  | { kind: "unary"; op: string; arg: IRValueExpression; angleUnit?: "degree" | "radian" }
  | { kind: "binary"; op: string; left: IRValueExpression; right: IRValueExpression }
  | { kind: "call"; callee: string; args: IRValueExpression[] }
  | { kind: "c-code"; payload: IRCCodePayload };

export type IRBooleanExpression =
  | { kind: "literal"; value: boolean }
  | { kind: "compare"; op: "EQ" | "NEQ" | "LT" | "LTE" | "GT" | "GTE"; left: IRValueExpression; right: IRValueExpression }
  | { kind: "and"; args: IRBooleanExpression[] }
  | { kind: "or"; args: IRBooleanExpression[] }
  | { kind: "not"; arg: IRBooleanExpression }
  | { kind: "sensor"; sensor: string; port?: string | number; channel?: number; predicate: string };

export type IRFieldValue = IRPrimitive | IRValueExpression | IRBooleanExpression | IRCCodePayload;

export interface IRCommandMetadata {
  sourceText?: string;
  runtimeStatus: IRRuntimeStatus;
  handlerId: string;
  cCode?: IRCCodePayload;
}

export interface IRCommandV2 {
  kind: "command";
  op: string;
  args: Record<string, IRFieldValue>;
  children?: Record<string, IRNode[]>;
  source?: IRSourceRef;
  diagnostics?: IRDiagnostic[];
  metadata: IRCommandMetadata;
}

export interface IRDiagnosticNode {
  kind: "diagnostic";
  diagnostic: IRDiagnostic;
  source?: IRSourceRef;
}

export type IRNode = IRCommandV2 | IRDiagnosticNode;

export interface IRProgramMetadata {
  generator: string;
  generatedAt?: string;
  source: "blockly" | "import" | "sample" | "test";
  compatibility: {
    acceptsV1: true;
    migrationNotes: string[];
  };
}

export interface IRProgramV2 {
  version: 2;
  commands: IRCommand[];
  nodes: IRNode[];
  diagnostics: IRDiagnostic[];
  metadata: IRProgramMetadata;
  legacyV1?: {
    commands: IRCommand[];
    note: string;
  };
}

export type IRProgram = IRProgramV1 | IRProgramV2;

export type AnyIRProgram = IRProgram;

// ---- Giao diện bộ thông dịch ----

export interface Interpreter {
  /** Thực thi tối đa 1000 lệnh cho tick này. Trả về true nếu vẫn còn lệnh. */
  step(): boolean;
  /** Đặt lại trạng thái bộ thông dịch (IP, ACC, biến, vòng lặp, chờ). KHÔNG đặt lại mô phỏng. */
  reset(): void;
  /** Chương trình đã kết thúc (gặp END_PROGRAM hoặc IP vượt lệnh cuối). */
  readonly done: boolean;
  /** Diagnostics emitted by v2 expression/control-flow runtime guards. */
  readonly diagnostics: IRDiagnostic[];
}

// ---- Cấu hình bộ thông dịch ----

export interface InterpreterConfig {
  /** Số tick tối đa trước khi buộc dừng (mặc định 18000 = 5 phút ở 60Hz). */
  maxTicks?: number;
  /** Instruction cap per tick. Defaults to 1000. */
  maxInstructionsPerTick?: number;
  /** Loop body iterations before a safe stop diagnostic. Defaults to 10000. */
  maxLoopIterations?: number;
  /** Default timeout for wait-until when the node does not specify one. Defaults to 600 ticks. */
  waitUntilTimeoutTicks?: number;
  /** Deterministic seed for v2 random expressions. */
  randomSeed?: number;
}
