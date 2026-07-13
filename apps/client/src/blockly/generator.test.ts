import { OpCode, type IRProgram } from "@htlab/simulation-core";

export const C010_GENERATOR_SNAPSHOT = {
  version: 2,
  commands: [{ op: OpCode.END_PROGRAM, args: [] }],
  nodes: [
    {
      kind: "command",
      op: "control.ifElse",
      args: {
        condition: {
          kind: "and",
          args: [
            {
              kind: "compare",
              op: "GTE",
              left: {
                kind: "binary",
                op: "+",
                left: { kind: "literal", value: 2 },
                right: {
                  kind: "binary",
                  op: "%",
                  left: { kind: "literal", value: 5 },
                  right: { kind: "literal", value: 2 },
                },
              },
              right: { kind: "literal", value: 3 },
            },
            {
              kind: "not",
              arg: {
                kind: "sensor",
                sensor: "remote-control",
                port: "A",
                predicate: "pressed",
              },
            },
          ],
        },
      },
      children: {
        then: [
          {
            kind: "command",
            op: "motion.setMotorPair",
            args: {
              left: {
                kind: "unary",
                op: "sin",
                arg: { kind: "literal", value: 90 },
                angleUnit: "degree",
              },
              right: {
                kind: "call",
                callee: "randomRange",
                args: [{ kind: "literal", value: 1 }, { kind: "literal", value: 5 }],
              },
            },
            metadata: { runtimeStatus: "implemented", handlerId: "runtime.motor.setPair" },
          },
        ],
        else: [
          {
            kind: "command",
            op: "motion.setMotorPair",
            args: {
              left: { kind: "literal", value: 0 },
              right: { kind: "literal", value: 0 },
            },
            metadata: { runtimeStatus: "implemented", handlerId: "runtime.motor.setPair" },
          },
        ],
      },
      metadata: { runtimeStatus: "implemented", handlerId: "runtime.control.ifElse" },
    },
    {
      kind: "command",
      op: "control.repeatUntil",
      args: {
        condition: {
          kind: "compare",
          op: "GTE",
          left: { kind: "variable", name: "v0" },
          right: { kind: "literal", value: 3 },
        },
      },
      children: {
        do: [
          {
            kind: "command",
            op: "variable.set",
            args: {
              name: "v0",
              value: {
                kind: "binary",
                op: "+",
                left: { kind: "variable", name: "v0" },
                right: { kind: "literal", value: 1 },
              },
            },
            metadata: { runtimeStatus: "implemented", handlerId: "runtime.variable.set" },
          },
        ],
      },
      metadata: { runtimeStatus: "implemented", handlerId: "runtime.control.repeatUntil" },
    },
    {
      kind: "command",
      op: "control.waitUntil",
      args: {
        condition: {
          kind: "compare",
          op: "GTE",
          left: { kind: "sensor", sensor: "timer" },
          right: { kind: "literal", value: 10 },
        },
        timeoutTicks: { kind: "literal", value: 600 },
      },
      metadata: { runtimeStatus: "implemented", handlerId: "runtime.control.waitUntil" },
    },
  ],
  diagnostics: [],
  metadata: {
    generator: "htlab-blockly",
    source: "test",
    compatibility: {
      acceptsV1: true,
      migrationNotes: ["C-010 generator snapshot keeps v2 expression/control-flow shape stable."],
    },
  },
} satisfies IRProgram;

export function assertC010GeneratorSnapshotShape(program: IRProgram): void {
  if (program.version !== 2) throw new Error("Expected IR v2 snapshot.");
  const ops = program.nodes.map((node) => node.kind === "command" ? node.op : node.diagnostic.code);
  for (const op of ["control.ifElse", "control.repeatUntil", "control.waitUntil"]) {
    if (!ops.includes(op)) throw new Error(`Missing ${op} in C-010 generator snapshot.`);
  }
}
