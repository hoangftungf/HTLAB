import { describe, expect, it } from "vitest";
import {
  createInterpreter,
  createSimulation,
  createTestMap,
  DEFAULT_ROBOT_CONFIG,
} from "../../src/index.js";
import type {
  IRCCodePayload,
  IRCommandV2,
  IRFieldValue,
  IRNode,
  IRProgramV2,
  IRValueExpression,
} from "../../src/interpreter/types.js";

function makeSim() {
  return createSimulation({
    map: createTestMap(2400, 1200, 1),
    robotConfig: { ...DEFAULT_ROBOT_CONFIG, sensorNoise: 0 },
    seed: 42,
  });
}

function literal(value: string | number | boolean | null): IRValueExpression {
  return { kind: "literal", value };
}

function payload(source: string): IRCCodePayload {
  return {
    language: "c",
    source,
    entryPoint: "_fn",
    sandbox: {
      required: true,
      status: "available",
      timeoutMs: 50,
      memoryMb: 4,
      allowedApis: ["htlab_abs", "htlab_clamp"],
    },
  };
}

function command(op: string, args: Record<string, IRFieldValue> = {}): IRCommandV2 {
  return {
    kind: "command",
    op,
    args,
    source: { blockType: op, category: "test" },
    metadata: {
      runtimeStatus: "implemented",
      handlerId: `test.${op}`,
    },
  };
}

function makeProgram(nodes: IRNode[]): IRProgramV2 {
  return {
    version: 2,
    commands: [],
    nodes,
    diagnostics: [],
    metadata: {
      generator: "test",
      source: "test",
      compatibility: {
        acceptsV1: true,
        migrationNotes: ["C-014 C sandbox fixture."],
      },
    },
  };
}

function run(program: IRProgramV2, enabled = true) {
  const sim = makeSim();
  const interpreter = createInterpreter(program, sim, {
    cSandbox: { enabled, timeoutMs: 50, maxStatements: 16 },
  });
  interpreter.step();
  sim.tick();
  return { interpreter, sim };
}

describe("C-014 C Code sandbox", () => {
  it("runs a tiny numeric C function through the sandbox command bridge", () => {
    const program = makeProgram([
      command("cCode.call", {
        body: payload("int _fn(int _number1) { return _number1 * 2 + 1; }"),
        input: literal(3),
      }),
    ]);

    const { sim } = run(program);

    expect(sim.getEvents().some((event) => event.op === "cCode.call" && event.payload.result === 7)).toBe(true);
  });

  it("uses a C Code value expression in a motor field", () => {
    const program = makeProgram([
      command("motion.setMotorPair", {
        left: {
          kind: "c-code",
          payload: payload("int _fn(int _number1) { return htlab_clamp(_number1 * 2, -1, 1); }"),
          input: literal(0.2),
        },
        right: literal(0),
      }),
    ]);

    const { sim } = run(program);

    expect(sim.getTelemetry()[0].motorTargets.left).toBeCloseTo(0.4, 5);
  });

  it("stops loop-like C code with a timeout diagnostic", () => {
    const program = makeProgram([
      command("cCode.call", {
        body: payload("int _fn(int _number1) { while (1) { } return _number1; }"),
        input: literal(1),
      }),
    ]);

    const { interpreter } = run(program);

    expect(interpreter.diagnostics.some((diagnostic) => diagnostic.code === "HTLAB_C_TIMEOUT")).toBe(true);
  });

  it("reports compile errors without executing unsafe fallback code", () => {
    const program = makeProgram([
      command("cCode.call", {
        body: payload("int _fn(int _number1) { return _number1 + ; }"),
        input: literal(1),
      }),
    ]);

    const { interpreter } = run(program);

    expect(interpreter.diagnostics.some((diagnostic) => diagnostic.code === "HTLAB_C_COMPILE_ERROR")).toBe(true);
  });

  it("fails closed on disallowed API usage", () => {
    const program = makeProgram([
      command("cCode.call", {
        body: payload("int _fn(int _number1) { system(_number1); return 0; }"),
        input: literal(1),
      }),
    ]);

    const { interpreter } = run(program);

    expect(interpreter.diagnostics.some((diagnostic) => diagnostic.code === "HTLAB_C_DISALLOWED_API")).toBe(true);
  });

  it("keeps C execution disabled unless the feature flag is enabled", () => {
    const program = makeProgram([
      command("cCode.call", {
        body: payload("int _fn(int _number1) { return _number1 + 1; }"),
        input: literal(1),
      }),
    ]);

    const { interpreter, sim } = run(program, false);

    expect(interpreter.diagnostics.some((diagnostic) => diagnostic.code === "HTLAB_C_SANDBOX_DISABLED")).toBe(true);
    expect(sim.getEvents().some((event) => event.op === "cCode.call" && event.payload.result === 2)).toBe(false);
  });
});
