import { describe, expect, it } from "vitest";
import {
  createInterpreter,
  createSimulation,
  createTestMap,
  DEFAULT_ROBOT_CONFIG,
} from "../../src/index.js";
import type {
  IRBooleanExpression,
  IRCommandV2,
  IRFieldValue,
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

function sensor(sensorName: string, port?: string | number, channel?: number): IRValueExpression {
  return {
    kind: "sensor",
    sensor: sensorName,
    ...(port !== undefined ? { port } : {}),
    ...(channel !== undefined ? { channel } : {}),
  };
}

function compare(left: IRValueExpression, op: IRBooleanExpression & { kind: "compare" }["op"], right: IRValueExpression): IRBooleanExpression {
  return { kind: "compare", op, left, right };
}

function command(
  op: string,
  args: Record<string, IRFieldValue> = {},
  children?: Record<string, IRCommandV2[]>,
  runtimeStatus: IRCommandV2["metadata"]["runtimeStatus"] = "implemented",
): IRCommandV2 {
  return {
    kind: "command",
    op,
    args,
    ...(children ? { children } : {}),
    source: { blockType: op, category: "test" },
    metadata: {
      runtimeStatus,
      handlerId: `test.${op}`,
    },
  };
}

function makeProgram(nodes: IRProgramV2["nodes"]): IRProgramV2 {
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
        migrationNotes: ["C-012 compatibility fixture."],
      },
    },
  };
}

function run(interpreter: ReturnType<typeof createInterpreter>, sim: ReturnType<typeof makeSim>, maxTicks = 60): void {
  for (let i = 0; i < maxTicks; i++) {
    const active = interpreter.step();
    sim.tick();
    if (!active) return;
  }
}

describe("C-012 sensor compatibility runtime", () => {
  it("covers grayscale reporters, timer reset, encoder state, and placeholder hardware diagnostics", () => {
    const sim = makeSim();
    const program = makeProgram([
      command(
        "control.if",
        {
          condition: compare(
            sensor("single-grayscale", "1"),
            "EQ",
            sensor("integrated-grayscale", "5", 1),
          ),
        },
        {
          then: [
            command("motion.setMotorPair", {
              left: literal(0.25),
              right: literal(0.25),
            }),
          ],
        },
      ),
      command("sensor.resetTimer"),
      command("control.waitUntil", {
        condition: compare(sensor("timer"), "GTE", literal(2)),
        timeoutTicks: literal(10),
      }),
      command("motion.setMotorPair", {
        left: literal(0.5),
        right: literal(0.5),
      }),
      command("control.waitTicks", { ticks: literal(4) }),
      command("motion.stopMotorPair"),
      command("motion.setMotorPair", {
        left: sensor("ultrasonic-distance", "1"),
        right: sensor("ambient-light", "1"),
      }),
    ]);

    const interpreter = createInterpreter(program, sim);
    run(interpreter, sim);

    expect(sim.getTelemetry().some((frame) => frame.motorTargets.left === 0.25)).toBe(true);
    expect(sim.state.runtime.motorEncoders.A).toBeGreaterThan(0);
    expect(interpreter.diagnostics.some((diagnostic) => diagnostic.code === "HTLAB_WAIT_UNTIL_TIMEOUT")).toBe(false);
    expect(interpreter.diagnostics.some((diagnostic) => diagnostic.code === "HTLAB_ULTRASONIC_PLACEHOLDER")).toBe(true);
    expect(interpreter.diagnostics.some((diagnostic) => diagnostic.code === "HTLAB_SENSOR_PLACEHOLDER")).toBe(true);
    expect(sim.getEvents().some((event) => event.op === "sensor.resetTimer")).toBe(true);

    const resetEncoder = createInterpreter(makeProgram([
      command("sensor.resetMotorEncoder", { motor: "A" }),
    ]), sim);
    resetEncoder.step();

    expect(sim.state.runtime.motorEncoders.A).toBe(0);
    expect(sim.getEvents().some((event) => event.op === "sensor.resetMotorEncoder")).toBe(true);
  });

  it("emits side-effect events without changing pose and surfaces explicit stubs", () => {
    const sim = makeSim();
    const start = sim.state.robot;
    const program = makeProgram([
      command("effect.setLedRgb", { port: "1", r: literal(255), g: literal(32), b: literal(8) }, undefined, "telemetry-only"),
      command("effect.playSound", { group: "Greet", sound: "Hello" }, undefined, "telemetry-only"),
      command("effect.screenDisplay", { value: literal("READY") }, undefined, "telemetry-only"),
      command("compat.reading1", { value: literal(1) }, undefined, "stub"),
      command("control.if", {
        condition: {
          kind: "sensor",
          sensor: "remote-control",
          port: "A",
          predicate: "pressed",
        },
      }),
      command("motion.setMotorPair", {
        left: sensor("ai.imageRecognition", "1"),
        right: literal(0),
      }),
    ]);

    const interpreter = createInterpreter(program, sim);
    interpreter.step();

    expect(sim.state.robot).toEqual(start);
    expect(sim.getEvents().filter((event) => event.kind === "effect").map((event) => event.op)).toEqual([
      "effect.setLedRgb",
      "effect.playSound",
      "effect.screenDisplay",
    ]);
    expect(interpreter.diagnostics.some((diagnostic) => diagnostic.code === "HTLAB_READING1_STUB")).toBe(true);
    expect(interpreter.diagnostics.some((diagnostic) => diagnostic.code === "HTLAB_REMOTE_STUB")).toBe(true);
    expect(interpreter.diagnostics.some((diagnostic) => diagnostic.code === "HTLAB_AI_STUB")).toBe(true);
    expect(sim.getEvents().some((event) => event.code === "HTLAB_READING1_STUB")).toBe(true);
  });
});
