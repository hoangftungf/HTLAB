import { type MotorEncoderPort } from "../types.js";
import { CompareOp } from "./types.js";
import type { IRBooleanExpression, IRCCodePayload, IRDiagnostic, IRFieldValue, IRSourceRef, IRValueExpression } from "./types.js";

export function isMotorEncoderPort(value: string): value is MotorEncoderPort {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

export function compare(a: number, op: CompareOp, b: number): boolean {
  switch (op) {
    case CompareOp.EQ: return a === b;
    case CompareOp.NEQ: return a !== b;
    case CompareOp.LT: return a < b;
    case CompareOp.LTE: return a <= b;
    case CompareOp.GT: return a > b;
    case CompareOp.GTE: return a >= b;
  }
}

export function compareByName(a: number, op: string, b: number): boolean {
  switch (op) {
    case "EQ":
    case "=":
    case "==":
      return a === b;
    case "NEQ":
    case "!=":
      return a !== b;
    case "LT":
    case "<":
      return a < b;
    case "LTE":
    case "<=":
      return a <= b;
    case "GT":
    case ">":
      return a > b;
    case "GTE":
    case ">=":
      return a >= b;
    default:
      return false;
  }
}

export function detectGroup(roads: number[], group: number): number {
  const slices: [number, number][] = [[0, 2], [1, 3], [2, 4]];
  const [lo, hi] = slices[group] ?? [0, 0];
  for (let i = lo; i <= hi; i++) {
    if (roads[i] > 50) return 1;
  }
  return 0;
}

export function toNumber(value: IRFieldValue | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function toText(value: IRFieldValue | undefined, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

export function asValueExpression(value: IRFieldValue | undefined): IRValueExpression {
  if (value && typeof value === "object" && "kind" in value) {
    const kind = (value as { kind: string }).kind;
    if (
      kind === "literal" ||
      kind === "variable" ||
      kind === "sensor" ||
      kind === "unary" ||
      kind === "binary" ||
      kind === "call" ||
      kind === "c-code"
    ) {
      return value as IRValueExpression;
    }
  }
  return { kind: "literal", value: value as string | number | boolean | null | undefined ?? 0 };
}

export function asBooleanExpression(value: IRFieldValue | undefined): IRBooleanExpression {
  if (value && typeof value === "object" && "kind" in value) {
    return value as IRBooleanExpression;
  }
  return { kind: "literal", value: Boolean(value) };
}

export function normalizeAngle(value: number, unit: "degree" | "radian" | undefined): number {
  return unit === "degree" ? value * Math.PI / 180 : value;
}

export function createDiagnostic(
  code: string,
  message: string,
  source?: IRSourceRef,
  severity: IRDiagnostic["severity"] = "warning",
): IRDiagnostic {
  return { code, severity, message, source };
}

export function isCCodePayload(value: IRFieldValue | undefined): value is IRCCodePayload {
  return Boolean(
    value &&
    typeof value === "object" &&
    "language" in value &&
    value.language === "c" &&
    "source" in value &&
    "sandbox" in value,
  );
}
