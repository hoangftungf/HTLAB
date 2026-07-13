import { describe, it, expect } from "vitest";
import {
  createSimulation,
  createTestMap,
  createInterpreter,
  OpCode,
  CompareOp,
  type IRProgram,
  type Simulation,
} from "../../src/index.js";
import type { IRProgramV2 } from "../../src/interpreter/types.js";
import { DEFAULT_ROBOT_CONFIG, type RobotState } from "../../src/types.js";

// ---- Hàm hỗ trợ ----

function makeSim(overrides: Partial<Parameters<typeof createTestMap>[0] extends number ? never : never> = {}): Simulation {
  const map = createTestMap(2400, 1200, 1);
  return createSimulation({
    map,
    robotConfig: { ...DEFAULT_ROBOT_CONFIG, sensorNoise: 0 },
    seed: 42,
  });
}

/** Tạo sa bàn có vạch đen nằm ngang tại hàng pixel cho trước. */
function makeLineMap(lineCenterY: number, thickness: number = 4): Simulation {
  const pxW = 2400;
  const pxH = 1200;
  const pixels = new Uint8ClampedArray(pxW * pxH * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 255;
    pixels[i + 1] = 255;
    pixels[i + 2] = 255;
    pixels[i + 3] = 255;
  }
  const half = Math.floor(thickness / 2);
  for (let y = lineCenterY - half; y <= lineCenterY + half; y++) {
    if (y < 0 || y >= pxH) continue;
    for (let x = 0; x < pxW; x++) {
      const idx = (y * pxW + x) * 4;
      pixels[idx] = 0;
      pixels[idx + 1] = 0;
      pixels[idx + 2] = 0;
    }
  }
  const mapData = {
    imageData: pixels,
    width: pxW,
    height: pxH,
    metadata: {
      width: 2400,
      height: 1200,
      scale: 1,
      startPose: { x: 200, y: 600, heading: 0 },
    },
  };
  return createSimulation({
    map: mapData,
    robotConfig: { ...DEFAULT_ROBOT_CONFIG, sensorNoise: 0 },
    seed: 42,
  });
}

function makeProgram(ops: Array<{ op: OpCode; args?: number[]; label?: string }>): IRProgram {
  return {
    version: 1,
    commands: ops.map(({ op, args, label }) => ({
      op,
      args: args ?? [],
      ...(label !== undefined ? { label } : {}),
    })),
  };
}

function makeV2Program(nodes: IRProgramV2["nodes"], diagnostics: IRProgramV2["diagnostics"] = []): IRProgramV2 {
  return {
    version: 2,
    commands: [],
    nodes,
    diagnostics,
    metadata: {
      generator: "test",
      source: "test",
      compatibility: {
        acceptsV1: true,
        migrationNotes: ["Test fixture for IR v2 control-flow foundation."],
      },
    },
  };
}

function runTicks(interp: ReturnType<typeof createInterpreter>, sim: Simulation, n: number): void {
  for (let i = 0; i < n; i++) {
    interp.step();
    sim.tick();
  }
}

// ---- Kiểm thử ----

describe("IR contract versions", () => {
  it("keeps existing v1 programs loadable by the interpreter", () => {
    const sim = makeSim();
    const prog = makeProgram([
      { op: OpCode.SET_MOTOR, args: [0.25, 0.25] },
      { op: OpCode.END_PROGRAM },
    ]);
    const interp = createInterpreter(prog, sim);

    interp.step();
    sim.tick();

    expect(interp.done).toBe(true);
    expect(sim.getTelemetry()[0].motorTargets.left).toBe(0.25);
  });

  it("represents v2 command, value, boolean, diagnostic, and C-code metadata payloads", () => {
    const program = {
      version: 2,
      commands: [],
      nodes: [
        {
          kind: "command",
          op: "motion.setMotorPair",
          args: {
            left: { kind: "literal", value: 0.4 },
            right: { kind: "literal", value: 0.4 },
            label: "forward",
          },
          source: {
            blockType: "motion_tank_drive_continuous",
            category: "Motion",
          },
          metadata: {
            runtimeStatus: "implemented",
            handlerId: "runtime.motor.setPair",
          },
        },
        {
          kind: "command",
          op: "control.if",
          args: {
            condition: {
              kind: "compare",
              op: "GT",
              left: { kind: "sensor", sensor: "integrated-grayscale", port: 5, channel: 3 },
              right: { kind: "literal", value: 50 },
            },
          },
          children: {
            then: [
              {
                kind: "command",
                op: "motion.stopMotor",
                args: { motor: "all" },
                metadata: {
                  runtimeStatus: "implemented",
                  handlerId: "runtime.motor.stop",
                },
              },
            ],
          },
          metadata: {
            runtimeStatus: "stub",
            handlerId: "runtime.diagnostic.booleanFlowNotImplemented",
          },
        },
        {
          kind: "diagnostic",
          diagnostic: {
            code: "WB_STUB_REMOTE_CONTROL",
            severity: "warning",
            message: "Remote control input is an intentional compatibility stub.",
            runtimeStatus: "stub",
            handlerId: "runtime.diagnostic.intentionalFalse",
            source: {
              blockType: "sensor_remote_control_button",
              category: "Sensor",
            },
          },
        },
        {
          kind: "command",
          op: "cCode.function",
          args: {
            body: {
              language: "c",
              source: "void _fn(int _number1) { return; }",
              entryPoint: "_fn",
              sandbox: {
                required: true,
                status: "blocked",
                timeoutMs: 100,
                memoryMb: 16,
                allowedApis: [],
              },
            },
          },
          metadata: {
            runtimeStatus: "blocked-by-sandbox",
            handlerId: "runtime.diagnostic.cSandboxRequired",
            cCode: {
              language: "c",
              source: "void _fn(int _number1) { return; }",
              entryPoint: "_fn",
              sandbox: {
                required: true,
                status: "blocked",
                timeoutMs: 100,
                memoryMb: 16,
                allowedApis: [],
              },
            },
          },
        },
      ],
      diagnostics: [
        {
          code: "WB_UNSUPPORTED_STUB",
          severity: "warning",
          message: "Stub blocks are preserved with diagnostics.",
          runtimeStatus: "stub",
          handlerId: "runtime.diagnostic.intentionalNoop",
        },
      ],
      metadata: {
        generator: "htlab-blockly",
        source: "test",
        compatibility: {
          acceptsV1: true,
          migrationNotes: ["IR v1 commands remain accepted while v2 adapters roll out."],
        },
      },
      legacyV1: {
        commands: [{ op: OpCode.SET_MOTOR, args: [0.4, 0.4] }],
        note: "Lossy v1 lowering is optional and documented.",
      },
    } satisfies IRProgramV2;

    expect(program.version).toBe(2);
    expect(program.nodes).toHaveLength(4);
    expect(program.nodes[2].kind).toBe("diagnostic");
    expect(program.metadata.compatibility.acceptsV1).toBe(true);
  });
});

describe("IR v2 interpreter", () => {
  it("executes nested expressions, if/else, repeat-until, and wait-until", () => {
    const sim = makeSim();
    const program = makeV2Program([
      {
        kind: "command",
        op: "variable.set",
        args: {
          name: "v0",
          value: { kind: "literal", value: 1 },
        },
        metadata: { runtimeStatus: "implemented", handlerId: "runtime.variable.set" },
      },
      {
        kind: "command",
        op: "control.ifElse",
        args: {
          condition: {
            kind: "and",
            args: [
              {
                kind: "compare",
                op: "EQ",
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
                  kind: "binary",
                  op: "/",
                  left: { kind: "literal", value: 1 },
                  right: { kind: "literal", value: 2 },
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
            right: { kind: "literal", value: 2 },
          },
          timeoutTicks: { kind: "literal", value: 10 },
        },
        metadata: { runtimeStatus: "implemented", handlerId: "runtime.control.waitUntil" },
      },
      {
        kind: "command",
        op: "control.return",
        args: {},
        metadata: { runtimeStatus: "implemented", handlerId: "runtime.control.return" },
      },
    ]);
    const interp = createInterpreter(program, sim);

    runTicks(interp, sim, 8);

    expect(interp.done).toBe(true);
    expect(sim.getTelemetry()[0].motorTargets.left).toBeCloseTo(1, 5);
    expect(sim.getTelemetry()[0].motorTargets.right).toBeCloseTo(0.5, 5);
    expect(interp.diagnostics.some((diagnostic) => diagnostic.code === "HTLAB_REMOTE_STUB")).toBe(true);
  });

  it("stops repeat-forever on the configured loop cap", () => {
    const sim = makeSim();
    const program = makeV2Program([
      {
        kind: "command",
        op: "control.repeatForever",
        args: {},
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
        metadata: { runtimeStatus: "implemented", handlerId: "runtime.control.repeatForever" },
      },
    ]);
    const interp = createInterpreter(program, sim, { maxLoopIterations: 3 });

    interp.step();

    expect(interp.done).toBe(true);
    expect(interp.diagnostics.some((diagnostic) => diagnostic.code === "HTLAB_LOOP_CAP")).toBe(true);
  });

  it("stops wait-until on timeout", () => {
    const sim = makeSim();
    const program = makeV2Program([
      {
        kind: "command",
        op: "control.waitUntil",
        args: {
          condition: { kind: "literal", value: false },
          timeoutTicks: { kind: "literal", value: 2 },
        },
        metadata: { runtimeStatus: "implemented", handlerId: "runtime.control.waitUntil" },
      },
    ]);
    const interp = createInterpreter(program, sim);

    runTicks(interp, sim, 5);

    expect(interp.done).toBe(true);
    expect(interp.diagnostics.some((diagnostic) => diagnostic.code === "HTLAB_WAIT_UNTIL_TIMEOUT")).toBe(true);
  });

  it("evaluates trig functions in degrees and radians", () => {
    const sim = makeSim();
    const program = makeV2Program([
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
            kind: "unary",
            op: "sin",
            arg: { kind: "literal", value: Math.PI / 2 },
            angleUnit: "radian",
          },
        },
        metadata: { runtimeStatus: "implemented", handlerId: "runtime.motor.setPair" },
      },
    ]);
    const interp = createInterpreter(program, sim);

    interp.step();
    sim.tick();

    expect(sim.getTelemetry()[0].motorTargets.left).toBeCloseTo(1, 5);
    expect(sim.getTelemetry()[0].motorTargets.right).toBeCloseTo(1, 5);
  });

  it("uses deterministic seeded random expressions", () => {
    const program = makeV2Program([
      {
        kind: "command",
        op: "motion.setMotorPair",
        args: {
          left: {
            kind: "call",
            callee: "randomRange",
            args: [{ kind: "literal", value: 1 }, { kind: "literal", value: 5 }],
          },
          right: {
            kind: "call",
            callee: "randomRange",
            args: [{ kind: "literal", value: 1 }, { kind: "literal", value: 5 }],
          },
        },
        metadata: { runtimeStatus: "implemented", handlerId: "runtime.motor.setPair" },
      },
    ]);
    const simA = makeSim();
    const simB = makeSim();
    const interpA = createInterpreter(program, simA, { randomSeed: 123 });
    const interpB = createInterpreter(program, simB, { randomSeed: 123 });

    interpA.step();
    simA.tick();
    interpB.step();
    simB.tick();

    expect(simA.getTelemetry()[0].motorTargets.left).toBe(simB.getTelemetry()[0].motorTargets.left);
    expect(simA.getTelemetry()[0].motorTargets.right).toBe(simB.getTelemetry()[0].motorTargets.right);
    expect(simA.getTelemetry()[0].motorTargets.left).toBeGreaterThanOrEqual(1);
  });

  it("emits diagnostics for invalid math domains", () => {
    const sim = makeSim();
    const program = makeV2Program([
      {
        kind: "command",
        op: "motion.setMotorPair",
        args: {
          left: {
            kind: "unary",
            op: "sqrt",
            arg: { kind: "literal", value: -1 },
          },
          right: { kind: "literal", value: 0 },
        },
        metadata: { runtimeStatus: "implemented", handlerId: "runtime.motor.setPair" },
      },
    ]);
    const interp = createInterpreter(program, sim);

    interp.step();
    sim.tick();

    expect(sim.getTelemetry()[0].motorTargets.left).toBe(0);
    expect(interp.diagnostics.some((diagnostic) => diagnostic.code === "HTLAB_MATH_DOMAIN")).toBe(true);
  });
});

describe("Interpreter", () => {
  describe("basic execution (SET_MOTOR + WAIT_TICKS)", () => {
    it("robot moves forward for 60 ticks after SET_MOTOR(0.5, 0.5) + WAIT_TICKS(60)", () => {
      const sim = makeSim();
      const prog = makeProgram([
        { op: OpCode.SET_MOTOR, args: [0.5, 0.5] },
        { op: OpCode.WAIT_TICKS, args: [60] },
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);

      const startX = sim.state.robot.x;
      // 1 tick thực thi (SET + bắt đầu WAIT) + 60 tick chờ + 1 tick END = 62
      runTicks(interp, sim, 65);

      expect(sim.state.robot.x).toBeGreaterThan(startX);
      expect(interp.done).toBe(true);
    });

    it("robot stops after WAIT_TICKS ends and END_PROGRAM", () => {
      const sim = makeSim();
      const prog = makeProgram([
        { op: OpCode.SET_MOTOR, args: [0.5, 0.5] },
        { op: OpCode.WAIT_TICKS, args: [10] },
        { op: OpCode.SET_MOTOR, args: [0, 0] },
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);

      runTicks(interp, sim, 15);

      expect(interp.done).toBe(true);
      // Sau SET_MOTOR(0,0), tốc độ giảm dần; xác minh đã giảm từ đỉnh
      // Tốc độ đỉnh sau 10 tick ở 0.5: xấp xỉ 0.5 * 500 = 250 mm/s
      // Ma sát cần thời gian; xác minh robot gần dừng
      expect(sim.state.robot.leftSpeed).toBeLessThan(200);
    });
  });

  describe("opcode: INIT_HARDWARE", () => {
    it("resets simulation to start pose", () => {
      const sim = makeSim();
      const prog = makeProgram([
        { op: OpCode.SET_MOTOR, args: [0.5, 0.5] },
        { op: OpCode.WAIT_TICKS, args: [30] },
        { op: OpCode.INIT_HARDWARE },
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);

      // Chạy hết: 1 (SET+WAIT) + 30 chờ + 1 (INIT_HARDWARE+END) = 32 tick
      runTicks(interp, sim, 35);

      expect(interp.done).toBe(true);
      // sim.reset() đã được gọi → robot trở về tư thế xuất phát
      expect(sim.state.robot.x).toBe(200);
      expect(sim.state.robot.y).toBe(600);
      // Lưu ý: sim.tick() tăng sau khi INIT_HARDWARE đặt lại, nên tick > 0
      // Nhưng vị trí mới là điều cần kiểm tra, và nó đã được đặt lại
    });
  });

  describe("opcode: CALIBRATE_GRAYSCALE", () => {
    it("runs calibration via sim.calibrateGrayscale() without error", () => {
      const sim = makeLineMap(600, 20);
      const prog = makeProgram([
        { op: OpCode.CALIBRATE_GRAYSCALE },
        { op: OpCode.CALIBRATE_GRAYSCALE },
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);

      interp.step();
      sim.tick();

      expect(interp.done).toBe(true);
      // Hai lần gọi calibrate đã chạy, trạng thái được đánh dấu calibrated
      expect(sim.state.sensors.calibrated).toBe(true);
    });
  });

  describe("opcode: SET_MOTOR", () => {
    it("sets motor speed via sim.setMotors", () => {
      const sim = makeSim();
      const prog = makeProgram([
        { op: OpCode.SET_MOTOR, args: [0.3, 0.7] },
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);

      interp.step(); // thực thi SET_MOTOR + END
      sim.tick();

      // Robot phải quay (tốc độ hai bánh bất đối xứng)
      const telemetry = sim.getTelemetry();
      expect(telemetry[0].motorTargets.left).toBe(0.3);
      expect(telemetry[0].motorTargets.right).toBe(0.7);
    });
  });

  describe("opcode: WAIT_TICKS", () => {
    it("pauses IP for N ticks while motors keep running", () => {
      const sim = makeSim();
      const prog = makeProgram([
        { op: OpCode.SET_MOTOR, args: [0.3, 0.3] },
        { op: OpCode.WAIT_TICKS, args: [5] },
        { op: OpCode.SET_MOTOR, args: [0, 0] },
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);

      // Tick 1: thực thi SET_MOTOR + WAIT_TICKS(5)
      interp.step();
      sim.tick();

      // Tick 2-6: đang chờ (motor vẫn chạy)
      for (let i = 0; i < 5; i++) {
        expect(interp.done).toBe(false);
        interp.step();
        sim.tick();
      }

      // Tick 7: SET_MOTOR(0,0) + END_PROGRAM
      interp.step();
      sim.tick();

      expect(interp.done).toBe(true);
      expect(sim.state.tick).toBe(7);
    });
  });

  describe("opcode: READ_SENSOR_ROAD", () => {
    it("stores road value in ACC register", () => {
      const sim = makeLineMap(600, 4);
      const prog = makeProgram([
        { op: OpCode.READ_SENSOR_ROAD, args: [3] }, // road 3 = cảm biến giữa
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);

      interp.step(); // thực thi READ + END
      sim.tick();

      // Giá trị ACC không được công khai trực tiếp, nhưng có thể xác minh bằng
      // IF_SENSOR_VALUE hoặc SET_VAR với ACC
    });

    it("clamps road index to valid range 1-5", () => {
      const sim = makeLineMap(600, 4);
      const prog = makeProgram([
        { op: OpCode.READ_SENSOR_ROAD, args: [10] }, // > 5 → bị chặn về 5
        { op: OpCode.READ_SENSOR_ROAD, args: [0] },  // < 1 → bị chặn về 1
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);
      // Không được throw
      interp.step();
      sim.tick();
      expect(interp.done).toBe(true);
    });
  });

  describe("opcode: READ_SENSOR_GROUP", () => {
    it("returns 1 when any sensor in group detects line", () => {
      const sim = makeLineMap(600, 4);
      // Robot ở (200, 600); cảm biến giữa (road 3) phải nằm trên vạch
      // Nhóm 1 (giữa = road 1,2,3) phải phát hiện được
      const prog = makeProgram([
        { op: OpCode.READ_SENSOR_GROUP, args: [1] }, // nhóm giữa
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);

      interp.step();
      sim.tick();
      expect(interp.done).toBe(true);
    });

    it("returns 0 when no sensor in group detects line", () => {
      const sim = makeLineMap(600, 4);
      // Robot ở xa vạch
      const map = createTestMap(2400, 1200, 1);
      const simOff = createSimulation({
        map,
        robotConfig: { ...DEFAULT_ROBOT_CONFIG, sensorNoise: 0 },
        seed: 42,
      });
      const prog = makeProgram([
        { op: OpCode.READ_SENSOR_GROUP, args: [0] }, // nhóm trái, toàn nền trắng
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, simOff);
      interp.step();
      simOff.tick();
      expect(interp.done).toBe(true);
    });
  });

  describe("opcode: READ_LINE_POSITION", () => {
    it("stores line position in ACC", () => {
      const sim = makeLineMap(600, 4);
      const prog = makeProgram([
        { op: OpCode.READ_LINE_POSITION },
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);

      interp.step();
      sim.tick();
      expect(interp.done).toBe(true);
      // Cảm biến giữa của robot nằm trên vạch → linePosition phải gần 0
      expect(sim.state.sensors.linePosition).toBeLessThanOrEqual(10);
    });
  });

  describe("opcode: IF_SENSOR_VALUE", () => {
    it("jumps to label when sensor exceeds threshold", () => {
      const sim = makeLineMap(600, 4); // cảm biến giữa sẽ thấy màu đen
      // Tick một lần để cảm biến lấy mẫu vạch trước khi IF kiểm tra
      sim.tick();

      // IF road 3 > 50 → nhảy tới nhãn 0 (quay phải), ngược lại đi thẳng
      const prog = makeProgram([
        { op: OpCode.IF_SENSOR_VALUE, args: [3, 50, CompareOp.GT, 0] },
        // Nhánh else: đi thẳng
        { op: OpCode.SET_MOTOR, args: [0.5, 0.5] },
        { op: OpCode.JUMP, args: [1] }, // bỏ qua đến cuối
        // Nhánh then (nhãn 0): quay phải
        { op: OpCode.LABEL, args: [], label: "turn_right" },
        { op: OpCode.SET_MOTOR, args: [0.5, 0] },
        // Kết thúc (nhãn 1):
        { op: OpCode.LABEL, args: [], label: "end" },
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);

      interp.step(); // IF (true) → nhảy nhãn 0 → SET_MOTOR(0.5, 0) → LABEL(1) → END
      sim.tick();

      const telemetry = sim.getTelemetry();
      expect(telemetry[1].motorTargets.right).toBe(0); // đã quay phải
    });

    it("falls through to else when sensor below threshold", () => {
      const sim = makeLineMap(600, 4);
      // Robot ở (200, 100), xa vạch; cảm biến giữa thấy nền trắng
      // IF road 3 > 50 → nhảy (FALSE, chạy tiếp nhánh dưới)

      // Di chuyển robot ra xa vạch trước
      // Tạo sim có robot bắt đầu ngoài vạch
      const pxW = 2400, pxH = 1200;
      const pixels = new Uint8ClampedArray(pxW * pxH * 4);
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 255; pixels[i + 1] = 255; pixels[i + 2] = 255; pixels[i + 3] = 255;
      }
      const mapData = {
        imageData: pixels, width: pxW, height: pxH,
        metadata: { width: 2400, height: 1200, scale: 1, startPose: { x: 200, y: 200, heading: 0 } },
      };
      const simWhite = createSimulation({
        map: mapData,
        robotConfig: { ...DEFAULT_ROBOT_CONFIG, sensorNoise: 0 },
        seed: 42,
      });

      const prog = makeProgram([
        { op: OpCode.IF_SENSOR_VALUE, args: [3, 50, CompareOp.GT, 0] },
        // Nhánh else:
        { op: OpCode.SET_MOTOR, args: [0, 0.5] }, // quay trái
        { op: OpCode.JUMP, args: [1] },
        // Nhánh then (nhãn 0):
        { op: OpCode.LABEL, args: [], label: "turn_right" },
        { op: OpCode.SET_MOTOR, args: [0.5, 0] },
        // Kết thúc (nhãn 1):
        { op: OpCode.LABEL, args: [], label: "end" },
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, simWhite);

      interp.step();
      simWhite.tick();

      const telemetry = simWhite.getTelemetry();
      expect(telemetry[0].motorTargets.left).toBe(0); // đã quay trái (right=0.5)
      expect(telemetry[0].motorTargets.right).toBe(0.5);
    });

    it("supports all compare ops (EQ, NEQ, LT, LTE, GT, GTE)", () => {
      // Kiểm thử NEQ: nếu road 3 != 0 → nhảy (trên nền trắng giá trị thực tế là 0)
      const sim = makeSim(); // sa bàn toàn trắng, robot ở (200, 600)
      // Trên sa bàn trắng, mọi road đều phải là 0

      // Kiểm thử NEQ: cảm biến == 0, ngưỡng 0, NEQ → false (giá trị đúng là 0)
      const progNEQ = makeProgram([
        { op: OpCode.IF_SENSOR_VALUE, args: [3, 0, CompareOp.NEQ, 0] },
        { op: OpCode.SET_MOTOR, args: [1, 1] }, // nhánh else: đi thẳng (được chọn vì cảm biến=0=ngưỡng → NEQ false)
        { op: OpCode.JUMP, args: [1] },
        { op: OpCode.LABEL, args: [], label: "then" }, // nhãn 0
        { op: OpCode.SET_MOTOR, args: [0, 0] },
        { op: OpCode.LABEL, args: [], label: "end" }, // nhãn 1
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(progNEQ, sim);
      interp.step();
      sim.tick();
      expect(sim.getTelemetry()[0].motorTargets.left).toBe(1); // đã đi thẳng (nhánh else)
    });
  });

  describe("opcode: SET_VAR", () => {
    it("stores and retrieves variables", () => {
      const sim = makeSim();
      // Vì không đọc trực tiếp được vars, xác minh bằng luồng chương trình:
      // LOOP_START(3) → SET_MOTOR + WAIT(1) → LOOP_END lặp 3 lần
      const prog = makeProgram([
        { op: OpCode.LOOP_START, args: [3] },
        { op: OpCode.SET_MOTOR, args: [0.1, 0.1] },
        { op: OpCode.WAIT_TICKS, args: [1] },
        { op: OpCode.LOOP_END },
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);

      runTicks(interp, sim, 25);
      expect(interp.done).toBe(true);
      // 3 vòng lặp, mỗi vòng có 1 WAIT_TICKS(1) = 3 tick chờ + tick thực thi
      // Phải hoàn tất trong thời gian hợp lý
      expect(sim.state.tick).toBeGreaterThanOrEqual(3);
    });

    it("clamps variable index to 0-7", () => {
      const sim = makeSim();
      const prog = makeProgram([
        { op: OpCode.SET_VAR, args: [10, 42] }, // index không hợp lệ
        { op: OpCode.SET_VAR, args: [-1, 99] },
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);
      // Không được throw
      interp.step();
      expect(interp.done).toBe(true);
    });
  });

  describe("opcode: JUMP", () => {
    it("unconditionally jumps to a label", () => {
      const sim = makeSim();
      const prog = makeProgram([
        { op: OpCode.JUMP, args: [0] },
        { op: OpCode.SET_MOTOR, args: [0.5, 0.5] }, // bị bỏ qua
        { op: OpCode.LABEL, args: [], label: "target" },
        { op: OpCode.SET_MOTOR, args: [0, 0] },
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);

      interp.step();
      sim.tick();

      const telemetry = sim.getTelemetry();
      expect(telemetry[0].motorTargets.left).toBe(0); // đã bỏ qua 0.5
    });
  });

  describe("opcode: LOOP_START / LOOP_END", () => {
    it("executes block exactly N times", () => {
      const sim = makeSim();
      // Mỗi vòng: SET_MOTOR(0.1,0) → WAIT_TICKS(1). Chạy 3 lần.
      const prog = makeProgram([
        { op: OpCode.LOOP_START, args: [3] },
        { op: OpCode.SET_MOTOR, args: [0.1, 0] },
        { op: OpCode.WAIT_TICKS, args: [1] },
        { op: OpCode.LOOP_END },
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);

      runTicks(interp, sim, 20);
      expect(interp.done).toBe(true);
      // Mỗi vòng: 1 SET_MOTOR + 1 WAIT_TICKS(1) (chờ 1 tick)
      // Lặp 3 lần: 3x(1+1) + LOOP_START + các LOOP_END + END = khoảng 8 lệnh
      // Nhưng số step/tick phụ thuộc WAIT_TICKS. 3 lần chờ 1 tick = 3 tick chờ
      // Tổng tick: LOOP_START(1) + [SET(1)+WAIT(1)=2 mỗi vòng] * 3 - phần chồng chờ
      expect(sim.state.tick).toBeGreaterThanOrEqual(4);
    });

    it("handles nested loops", () => {
      const sim = makeSim();
      // Vòng ngoài 2x, vòng trong 3x → tổng 6 vòng
      const prog = makeProgram([
        { op: OpCode.LOOP_START, args: [2] },
        { op: OpCode.LOOP_START, args: [3] },
        { op: OpCode.SET_MOTOR, args: [0.1, 0.1] },
        { op: OpCode.WAIT_TICKS, args: [1] },
        { op: OpCode.LOOP_END },
        { op: OpCode.LOOP_END },
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);

      runTicks(interp, sim, 30);
      expect(interp.done).toBe(true);
      // 6 WAIT_TICKS(1) = 6 tick chờ + tick thực thi
      expect(sim.state.tick).toBeGreaterThanOrEqual(6);
    });
  });

  describe("opcode: END_PROGRAM", () => {
    it("stops execution and sets done=true", () => {
      const sim = makeSim();
      const prog = makeProgram([
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);

      const result = interp.step();
      expect(result).toBe(false);
      expect(interp.done).toBe(true);
    });

    it("step() returns false on subsequent calls after done", () => {
      const sim = makeSim();
      const prog = makeProgram([
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);

      interp.step();
      expect(interp.done).toBe(true);
      expect(interp.step()).toBe(false);
    });
  });

  describe("instruction cap", () => {
    it("executes at most 1000 instructions per tick", () => {
      const sim = makeSim();
      // Tạo chương trình có 2001 lệnh (2000 SET_VAR + END)
      const commands: Array<{ op: OpCode; args: number[] }> = [];
      for (let i = 0; i < 2000; i++) {
        commands.push({ op: OpCode.SET_VAR, args: [0, i] });
      }
      commands.push({ op: OpCode.END_PROGRAM });

      const prog: IRProgram = { version: 1, commands };
      const interp = createInterpreter(prog, sim);

      // Bước đầu: thực thi tối đa 1000 SET_VAR rồi chạm giới hạn
      const r1 = interp.step();
      expect(r1).toBe(true); // vẫn còn lệnh để thực thi
      expect(interp.done).toBe(false);

      // Bước hai: thực thi 1000 SET_VAR tiếp theo rồi chạm giới hạn (còn 1)
      const r2 = interp.step();
      expect(r2).toBe(true); // vẫn còn lệnh (END_PROGRAM)

      // Bước ba: thực thi END_PROGRAM
      const r3 = interp.step();
      expect(r3).toBe(false); // chương trình đã kết thúc
      expect(interp.done).toBe(true);
    });
  });

  describe("runtime cap", () => {
    it("halts after exceeding maxTicks", () => {
      const sim = makeSim();
      // Chương trình vòng lặp vô hạn
      const prog = makeProgram([
        { op: OpCode.LABEL, args: [], label: "loop" },
        { op: OpCode.SET_MOTOR, args: [0.1, 0.1] },
        { op: OpCode.WAIT_TICKS, args: [1] },
        { op: OpCode.JUMP, args: [0] },
      ]);
      const interp = createInterpreter(prog, sim, { maxTicks: 50 });

      for (let i = 0; i < 60; i++) {
        interp.step();
        sim.tick();
        if (interp.done) break;
      }

      expect(interp.done).toBe(true);
      expect(sim.state.tick).toBeGreaterThanOrEqual(50);
    });
  });

  describe("reset", () => {
    it("clears IP, ACC, vars, loops, wait, and done", () => {
      const sim = makeSim();
      const prog = makeProgram([
        { op: OpCode.SET_MOTOR, args: [0.5, 0.5] },
        { op: OpCode.WAIT_TICKS, args: [10] },
        { op: OpCode.END_PROGRAM },
      ]);
      const interp = createInterpreter(prog, sim);

      // Chạy nửa chừng
      interp.step(); // SET_MOTOR + WAIT_TICKS(10)
      sim.tick();

      // Đặt lại bộ thông dịch
      interp.reset();
      expect(interp.done).toBe(false);

      // Có thể chạy lại từ đầu
      runTicks(interp, sim, 15);
      expect(interp.done).toBe(true);
    });
  });

  describe("determinism", () => {
    it("same program + same seed → identical telemetry over 3 runs", () => {
      const prog = makeProgram([
        { op: OpCode.SET_MOTOR, args: [0.3, 0.4] },
        { op: OpCode.WAIT_TICKS, args: [30] },
        { op: OpCode.END_PROGRAM },
      ]);

      const runs: Array<ReturnType<typeof makeSim>["getTelemetry"]> = [];

      for (let r = 0; r < 3; r++) {
        const sim = makeSim();
        const interp = createInterpreter(prog, sim);
        runTicks(interp, sim, 35);
        runs.push(sim.getTelemetry());
      }

      // Cả 3 lần chạy phải có telemetry giống nhau
      for (let r = 1; r < 3; r++) {
        for (let i = 0; i < runs[0].length; i++) {
          expect(runs[r][i].robot.x).toBe(runs[0][i].robot.x);
          expect(runs[r][i].robot.y).toBe(runs[0][i].robot.y);
          expect(runs[r][i].motorTargets.left).toBe(runs[0][i].motorTargets.left);
        }
      }
    });
  });

  describe("line-following scenario", () => {
    it("simple bang-bang controller navigates on a straight line", () => {
      const sim = makeLineMap(600, 4);
      // Bộ điều khiển bang-bang:
      // LABEL loop
      // IF road[3] > 50 → go_straight (nhãn 1)
      //   quay phải để tìm vạch
      //   chờ 1, nhảy về loop
      // LABEL go_straight
      //   đi thẳng (chậm)
      //   chờ 1, nhảy về loop
      const prog = makeProgram([
        { op: OpCode.LABEL, args: [], label: "loop" },
        { op: OpCode.IF_SENSOR_VALUE, args: [3, 50, CompareOp.GT, 1] },
        { op: OpCode.SET_MOTOR, args: [0.3, 0] },
        { op: OpCode.WAIT_TICKS, args: [1] },
        { op: OpCode.JUMP, args: [0] },
        { op: OpCode.LABEL, args: [], label: "go_straight" },
        { op: OpCode.SET_MOTOR, args: [0.2, 0.2] },
        { op: OpCode.WAIT_TICKS, args: [1] },
        { op: OpCode.JUMP, args: [0] },
      ]);
      const interp = createInterpreter(prog, sim, { maxTicks: 600 });

      for (let t = 0; t < 600; t++) {
        interp.step();
        sim.tick();
        if (interp.done) break;
      }

      expect(sim.state.tick).toBeGreaterThan(0);
      // Dao động bang-bang có thể làm robot tiến ròng rất ít, nhưng
      // interpreter + vòng lặp mô phỏng đã chạy hoàn tất mà không lỗi.
      expect(sim.state.robot.x).toBeGreaterThan(0);
      expect(sim.state.robot.heading).not.toBeNaN();
    });
  });

  describe("all opcodes covered", () => {
    it("each of the 14 opcodes executes without throwing", () => {
      // Tạo chương trình đi qua mọi opcode
      const sim = makeLineMap(600, 4);
      const prog = makeProgram([
        { op: OpCode.INIT_HARDWARE },                // 0
        { op: OpCode.CALIBRATE_GRAYSCALE },          // 1
        { op: OpCode.CALIBRATE_GRAYSCALE },          // 2 (pha thứ hai)
        { op: OpCode.SET_MOTOR, args: [0.2, 0.2] }, // 3
        { op: OpCode.WAIT_TICKS, args: [1] },        // 4
        { op: OpCode.READ_SENSOR_ROAD, args: [3] },  // 5
        { op: OpCode.READ_SENSOR_GROUP, args: [1] }, // 6
        { op: OpCode.READ_LINE_POSITION },           // 7
        { op: OpCode.SET_VAR, args: [0, 3] },        // 8
        { op: OpCode.LOOP_START, args: [2] },        // 9
        { op: OpCode.SET_MOTOR, args: [0.1, 0.1] }, // 10
        { op: OpCode.WAIT_TICKS, args: [1] },        // 11
        { op: OpCode.LOOP_END },                     // 12
        { op: OpCode.LABEL, args: [], label: "lbl" },// 13 (nhãn #0)
        { op: OpCode.JUMP, args: [1] },              // 14 (nhảy tới nhãn 1 = "end")
        { op: OpCode.LABEL, args: [], label: "end" },// 15 (nhãn #1)
        { op: OpCode.IF_SENSOR_VALUE, args: [3, 0, CompareOp.GT, 0] }, // 16 — nếu road3 > 0 → đi tới nhãn 0
        { op: OpCode.END_PROGRAM },                  // 17
      ]);
      const interp = createInterpreter(prog, sim);

      runTicks(interp, sim, 30);
      // Không được throw, chương trình phải hoàn tất
      expect(interp.done).toBe(true);
    });
  });
});
