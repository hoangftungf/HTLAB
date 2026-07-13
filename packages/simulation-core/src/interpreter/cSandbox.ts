import type {
  CCodeSandboxConfig,
  IRCCodePayload,
  IRDiagnostic,
  IRSourceRef,
} from "./types.js";

type CToken =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "symbol"; value: string };

export interface CCodeSandboxResult {
  ok: boolean;
  value: number;
  diagnostics: IRDiagnostic[];
  status: "ok" | "blocked" | "compile-error" | "runtime-error" | "timeout" | "disallowed-api";
}

interface CompiledFunction {
  name: string;
  parameterName: string;
  statements: string[];
}

const DEFAULT_ALLOWED_APIS = ["htlab_abs", "htlab_clamp"] as const;
const DEFAULT_MAX_STATEMENTS = 64;

function diagnostic(
  code: string,
  message: string,
  source: IRSourceRef | undefined,
  severity: IRDiagnostic["severity"] = "error",
): IRDiagnostic {
  return {
    code,
    severity,
    message,
    source,
    runtimeStatus: code === "HTLAB_C_SANDBOX_DISABLED" ? "blocked-by-sandbox" : "implemented",
    handlerId: "runtime.cSandbox",
  };
}

function fail(
  status: CCodeSandboxResult["status"],
  code: string,
  message: string,
  source?: IRSourceRef,
): CCodeSandboxResult {
  return {
    ok: false,
    value: 0,
    status,
    diagnostics: [diagnostic(code, message, source)],
  };
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

function normalizeIdentifier(value: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value) ? value : "";
}

function compileFunction(payload: IRCCodePayload, source?: IRSourceRef): CompiledFunction | CCodeSandboxResult {
  const cleanSource = stripComments(payload.source).trim();
  const match = cleanSource.match(
    /^(int|double|float|void)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*(?:(int|double|float)\s+([A-Za-z_][A-Za-z0-9_]*)\s*)?\)\s*\{([\s\S]*)\}\s*$/,
  );

  if (!match) {
    return fail("compile-error", "HTLAB_C_COMPILE_ERROR", "C Code must be one numeric function with a single numeric parameter.", source);
  }

  const name = match[2];
  const parameterName = match[4] ?? "_number1";
  if (payload.entryPoint && payload.entryPoint !== name) {
    return fail("compile-error", "HTLAB_C_ENTRYPOINT_MISMATCH", `C entry point ${payload.entryPoint} does not match ${name}.`, source);
  }

  const body = match[5].trim();
  if (/\b(while|for|do)\b/.test(body)) {
    return fail("timeout", "HTLAB_C_TIMEOUT", "C Code loop exceeded the sandbox timeout budget.", source);
  }
  if (/#\s*include|\basm\b|__|->|\[[^\]]*\]|\bmalloc\b|\bfree\b|&[A-Za-z_]/.test(cleanSource)) {
    return fail("disallowed-api", "HTLAB_C_DISALLOWED_API", "C Code used syntax or APIs outside the sandbox whitelist.", source);
  }
  const allowedApis = new Set(payload.sandbox.allowedApis.length > 0 ? payload.sandbox.allowedApis : DEFAULT_ALLOWED_APIS);
  for (const callMatch of body.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) {
    const callName = callMatch[1];
    if (!allowedApis.has(callName)) {
      return fail("disallowed-api", "HTLAB_C_DISALLOWED_API", `C API ${callName} is not whitelisted.`, source);
    }
  }

  const statements = body
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  if (statements.length === 0) {
    return fail("compile-error", "HTLAB_C_COMPILE_ERROR", "C Code function body is empty.", source);
  }

  return { name, parameterName, statements };
}

function tokenize(expression: string): CToken[] {
  const tokens: CToken[] = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    if (/\s/.test(char)) {
      index++;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      const match = expression.slice(index).match(/^(?:\d+\.?\d*|\.\d+)/);
      if (!match) throw new Error(`Invalid number near ${expression.slice(index)}`);
      tokens.push({ type: "number", value: Number(match[0]) });
      index += match[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      const match = expression.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (!match) throw new Error(`Invalid identifier near ${expression.slice(index)}`);
      tokens.push({ type: "identifier", value: match[0] });
      index += match[0].length;
      continue;
    }
    if ("+-*/%(),".includes(char)) {
      tokens.push({ type: "symbol", value: char });
      index++;
      continue;
    }
    throw new Error(`Unsupported token ${char}`);
  }
  return tokens;
}

class NumericExpressionParser {
  private index = 0;

  constructor(
    private readonly tokens: CToken[],
    private readonly locals: Map<string, number>,
    private readonly allowedApis: Set<string>,
  ) {}

  parse(): number {
    const value = this.parseAdditive();
    if (this.peek()) throw new Error("Unexpected trailing expression tokens.");
    return value;
  }

  private parseAdditive(): number {
    let value = this.parseMultiplicative();
    while (this.match("+") || this.match("-")) {
      const op = this.previous().value;
      const right = this.parseMultiplicative();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }

  private parseMultiplicative(): number {
    let value = this.parseUnary();
    while (this.match("*") || this.match("/") || this.match("%")) {
      const op = this.previous().value;
      const right = this.parseUnary();
      if ((op === "/" || op === "%") && right === 0) throw new Error("Division by zero.");
      if (op === "*") value *= right;
      if (op === "/") value /= right;
      if (op === "%") value %= right;
    }
    return value;
  }

  private parseUnary(): number {
    if (this.match("+")) return this.parseUnary();
    if (this.match("-")) return -this.parseUnary();
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const token = this.advance();
    if (!token) throw new Error("Expected expression.");
    if (token.type === "number") return token.value;
    if (token.type === "identifier") {
      if (this.match("(")) {
        return this.callApi(token.value);
      }
      if (!this.locals.has(token.value)) throw new Error(`Unknown identifier ${token.value}.`);
      return this.locals.get(token.value) ?? 0;
    }
    if (token.value === "(") {
      const value = this.parseAdditive();
      this.consume(")", "Expected closing parenthesis.");
      return value;
    }
    throw new Error(`Unexpected token ${token.value}.`);
  }

  private callApi(name: string): number {
    if (!this.allowedApis.has(name)) throw new Error(`Disallowed API ${name}.`);
    const args: number[] = [];
    if (!this.check(")")) {
      do {
        args.push(this.parseAdditive());
      } while (this.match(","));
    }
    this.consume(")", "Expected closing API call parenthesis.");

    if (name === "htlab_abs") return Math.abs(args[0] ?? 0);
    if (name === "htlab_clamp") {
      const value = args[0] ?? 0;
      const min = args[1] ?? -1;
      const max = args[2] ?? 1;
      return Math.max(Math.min(min, max), Math.min(Math.max(min, max), value));
    }
    throw new Error(`Disallowed API ${name}.`);
  }

  private consume(value: string, message: string): void {
    if (!this.match(value)) throw new Error(message);
  }

  private match(value: string): boolean {
    if (!this.check(value)) return false;
    this.index++;
    return true;
  }

  private check(value: string): boolean {
    const token = this.peek();
    return token?.type === "symbol" && token.value === value;
  }

  private advance(): CToken | undefined {
    return this.tokens[this.index++];
  }

  private previous(): CToken {
    return this.tokens[this.index - 1];
  }

  private peek(): CToken | undefined {
    return this.tokens[this.index];
  }
}

function evaluateExpression(expression: string, locals: Map<string, number>, allowedApis: Set<string>): number {
  return new NumericExpressionParser(tokenize(expression), locals, allowedApis).parse();
}

export function executeCCodePayload(
  payload: IRCCodePayload,
  input: number,
  config: CCodeSandboxConfig = {},
  source?: IRSourceRef,
): CCodeSandboxResult {
  const enabled = config.enabled === true;
  if (!enabled || payload.sandbox.status !== "available") {
    return fail(
      "blocked",
      "HTLAB_C_SANDBOX_DISABLED",
      "C Code execution is disabled until the sandbox feature flag is enabled and verified.",
      source,
    );
  }

  const compiled = compileFunction(payload, source);
  if ("ok" in compiled) return compiled;

  const timeoutMs = Math.max(1, Math.min(config.timeoutMs ?? payload.sandbox.timeoutMs, payload.sandbox.timeoutMs));
  const startedAt = Date.now();
  const maxStatements = Math.max(1, config.maxStatements ?? DEFAULT_MAX_STATEMENTS);
  const allowedApiList = config.allowedApis ?? (
    payload.sandbox.allowedApis.length > 0 ? payload.sandbox.allowedApis : [...DEFAULT_ALLOWED_APIS]
  );
  const allowedApis = new Set(allowedApiList);
  const locals = new Map<string, number>([[compiled.parameterName, input]]);

  try {
    if (compiled.statements.length > maxStatements) {
      return fail("timeout", "HTLAB_C_TIMEOUT", `C Code exceeded ${maxStatements} sandbox statements.`, source);
    }

    for (const statement of compiled.statements) {
      if (Date.now() - startedAt > timeoutMs) {
        return fail("timeout", "HTLAB_C_TIMEOUT", `C Code exceeded ${timeoutMs}ms timeout.`, source);
      }

      if (statement === "return") {
        return { ok: true, value: 0, diagnostics: [], status: "ok" };
      }

      const returnMatch = statement.match(/^return\s+(.+)$/);
      if (returnMatch) {
        const value = evaluateExpression(returnMatch[1], locals, allowedApis);
        if (!Number.isFinite(value)) throw new Error("Non-finite numeric result.");
        return { ok: true, value, diagnostics: [], status: "ok" };
      }

      const declarationMatch = statement.match(/^(?:int|double|float)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (declarationMatch) {
        const name = normalizeIdentifier(declarationMatch[1]);
        if (!name) throw new Error("Invalid local variable name.");
        locals.set(name, evaluateExpression(declarationMatch[2], locals, allowedApis));
        continue;
      }

      const assignmentMatch = statement.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (assignmentMatch) {
        const name = normalizeIdentifier(assignmentMatch[1]);
        if (!name || !locals.has(name)) throw new Error(`Unknown assignment target ${assignmentMatch[1]}.`);
        locals.set(name, evaluateExpression(assignmentMatch[2], locals, allowedApis));
        continue;
      }

      return fail("compile-error", "HTLAB_C_COMPILE_ERROR", `Unsupported C statement: ${statement}.`, source);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown C runtime error.";
    const isDisallowed = message.startsWith("Disallowed API");
    const isCompileError = /Expected|Unexpected|Unsupported token|Unknown identifier|trailing expression/.test(message);
    const status = isDisallowed ? "disallowed-api" : isCompileError ? "compile-error" : "runtime-error";
    const code = isDisallowed
      ? "HTLAB_C_DISALLOWED_API"
      : isCompileError
        ? "HTLAB_C_COMPILE_ERROR"
        : "HTLAB_C_RUNTIME_ERROR";
    return fail(status, code, message, source);
  }

  return fail("compile-error", "HTLAB_C_COMPILE_ERROR", "C Code function completed without returning a numeric result.", source);
}
