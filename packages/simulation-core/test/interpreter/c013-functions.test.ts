import { describe, expect, it } from "vitest";
import {
  createInterpreter,
  createSimulation,
  createTestMap,
  DEFAULT_ROBOT_CONFIG,
} from "../../src/index.js";
import type {
  IRCommandV2,
  IRFieldValue,
  IRFunctionDefinition,
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

function variable(name: string, id?: string): IRValueExpression {
  return { kind: "variable", name, ...(id ? { id } : {}) };
}

function binary(op: string, left: IRValueExpression, right: IRValueExpression): IRValueExpression {
  return { kind: "binary", op, left, right };
}

function call(callee: string, args: IRValueExpression[]): IRValueExpression {
  return { kind: "call", callee, args };
}

function command(
  op: string,
  args: Record<string, IRFieldValue> = {},
  children?: Record<string, IRNode[]>,
): IRCommandV2 {
  return {
    kind: "command",
    op,
    args,
    ...(children ? { children } : {}),
    source: { blockType: op, category: "test" },
    metadata: {
      runtimeStatus: "implemented",
      handlerId: `test.${op}`,
    },
  };
}

function fn(
  id: string,
  name: string,
  paramName: string,
  paramId: string,
  body: IRNode[],
): IRFunctionDefinition {
  return {
    id,
    name,
    params: [{ id: paramId, name: paramName, valueType: "Number" }],
    returnType: "Number",
    body,
    source: { blockType: "my_block_definition", category: "My Blocks" },
  };
}

function makeProgram(nodes: IRNode[], functions: IRFunctionDefinition[] = []): IRProgramV2 {
  return {
    version: 2,
    commands: [],
    nodes,
    diagnostics: [],
    variables: [{ id: "var-speed", name: "speed", valueType: "Number" }],
    functions,
    metadata: {
      generator: "test",
      source: "test",
      compatibility: {
        acceptsV1: true,
        migrationNotes: ["C-013 variables and custom blocks fixture."],
      },
    },
  };
}

function runOneTick(program: IRProgramV2, options: Parameters<typeof createInterpreter>[2] = {}) {
  const sim = makeSim();
  const interpreter = createInterpreter(program, sim, options);
  interpreter.step();
  sim.tick();
  return { interpreter, sim };
}

describe("C-013 variables and custom blocks", () => {
  it("sets, changes, and reads variables by stable id/name", () => {
    const program = makeProgram([
      command("variable.set", {
        id: "var-speed",
        name: "speed",
        value: literal(0.1),
      }),
      command("variable.change", {
        id: "var-speed",
        name: "speed",
        delta: literal(0.2),
      }),
      command("motion.setMotorPair", {
        left: variable("speed", "var-speed"),
        right: variable("speed", "var-speed"),
      }),
    ]);

    const { sim } = runOneTick(program);

    expect(sim.getTelemetry()[0].motorTargets.left).toBeCloseTo(0.3, 5);
    expect(sim.getTelemetry()[0].motorTargets.right).toBeCloseTo(0.3, 5);
  });

  it("calls a custom block with one numeric parameter and applies runtime side effects", () => {
    const drive = fn("fn-drive", "drive", "power", "param-power", [
      command("motion.setMotorPair", {
        left: variable("power", "param-power"),
        right: variable("power", "param-power"),
      }),
    ]);
    const program = makeProgram([
      command("function.call", {
        callee: "drive",
        argumentCount: literal(1),
        arg0: literal(0.4),
      }),
    ], [drive]);

    const { sim } = runOneTick(program);

    expect(sim.getTelemetry()[0].motorTargets.left).toBeCloseTo(0.4, 5);
    expect(sim.getTelemetry()[0].motorTargets.right).toBeCloseTo(0.4, 5);
  });

  it("uses custom-block return values in expressions and nested calls", () => {
    const addTenth = fn("fn-add", "addTenth", "x", "param-x", [
      command("control.return", {
        value: binary("+", variable("x", "param-x"), literal(0.1)),
      }),
    ]);
    const twice = fn("fn-twice", "twice", "x", "param-x2", [
      command("control.return", {
        value: call("addTenth", [call("addTenth", [variable("x", "param-x2")])]),
      }),
    ]);
    const program = makeProgram([
      command("motion.setMotorPair", {
        left: call("twice", [literal(0.2)]),
        right: binary("*", call("addTenth", [literal(0.2)]), literal(2)),
      }),
    ], [addTenth, twice]);

    const { sim } = runOneTick(program);

    expect(sim.getTelemetry()[0].motorTargets.left).toBeCloseTo(0.4, 5);
    expect(sim.getTelemetry()[0].motorTargets.right).toBeCloseTo(0.6, 5);
  });

  it("diagnoses recursive custom-block calls", () => {
    const recursive = fn("fn-loop", "loop", "x", "param-x", [
      command("control.return", {
        value: call("loop", [variable("x", "param-x")]),
      }),
    ]);
    const program = makeProgram([
      command("motion.setMotorPair", {
        left: call("loop", [literal(0.2)]),
        right: literal(0),
      }),
    ], [recursive]);

    const { interpreter } = runOneTick(program);

    expect(interpreter.diagnostics.some((diagnostic) => diagnostic.code === "HTLAB_RECURSION_GUARD")).toBe(true);
  });

  it("diagnoses too-deep custom-block call chains", () => {
    const f2 = fn("fn-f2", "f2", "x", "param-f2", [
      command("control.return", { value: variable("x", "param-f2") }),
    ]);
    const f1 = fn("fn-f1", "f1", "x", "param-f1", [
      command("control.return", { value: call("f2", [variable("x", "param-f1")]) }),
    ]);
    const f0 = fn("fn-f0", "f0", "x", "param-f0", [
      command("control.return", { value: call("f1", [variable("x", "param-f0")]) }),
    ]);
    const program = makeProgram([
      command("motion.setMotorPair", {
        left: call("f0", [literal(0.2)]),
        right: literal(0),
      }),
    ], [f0, f1, f2]);

    const { interpreter } = runOneTick(program, { maxCallDepth: 2 });

    expect(interpreter.diagnostics.some((diagnostic) => diagnostic.code === "HTLAB_MAX_CALL_DEPTH")).toBe(true);
  });

  it("diagnoses Return outside a callable context without crashing", () => {
    const program = makeProgram([
      command("control.return", { value: literal(1) }),
      command("motion.setMotorPair", {
        left: literal(0.25),
        right: literal(0.25),
      }),
    ]);

    const { interpreter, sim } = runOneTick(program);

    expect(interpreter.diagnostics.some((diagnostic) => diagnostic.code === "HTLAB_RETURN_OUTSIDE_FUNCTION")).toBe(true);
    expect(sim.getTelemetry()[0].motorTargets.left).toBeCloseTo(0.25, 5);
  });
});
