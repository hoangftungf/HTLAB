import { create } from "zustand";
import {
  createSimulation,
  createReplay,
  createInterpreter,
  createTestMap,
  DEFAULT_ROBOT_CONFIG,
  type Simulation,
  type MapData,
  type TelemetryFrame,
  type ReplaySimulation,
  type Interpreter,
  type IRProgram,
} from "@htlab/simulation-core";
import { getSampleProgram } from "./samplePrograms.js";

// ---- Hình dạng trạng thái ----

export type SimMode = "live" | "replay";

export interface SimStore {
  // Tham chiếu không phản ứng, dùng cho bộ vẽ truy cập
  sim: Simulation | null;
  mapData: MapData | null;
  replaySim: ReplaySimulation | null;
  interpreter: Interpreter | null;
  irProgram: IRProgram | null;

  // Trạng thái có phản ứng
  mode: SimMode;
  running: boolean;
  tick: number;
  speed: number;
  replayFrameIndex: number;
  replayFrameCount: number;
  error: string | null;
  loading: boolean;

  // Hành động
  init: () => void;
  step: () => void;
  start: () => void;
  stop: () => void;
  reset: () => void;
  setSpeed: (s: number) => void;
  runProgram: (program: IRProgram) => void;
  clearError: () => void;

  // Phát lại
  enterReplay: (frames: TelemetryFrame[]) => void;
  exitReplay: () => void;
  replayStepForward: () => void;
  replayStepBackward: () => void;
  replayJumpTo: (frame: number) => void;
  replaySetSpeed: (s: number) => void;
}

// ---- Nội bộ: vòng lặp mô phỏng ----

let rafId: number | null = null;
let speedRef = 1;

function createSimLoop(get: () => SimStore, set: (fn: (s: SimStore) => Partial<SimStore>) => void) {
  let lastTime = performance.now();
  const SIM_HZ = 60;
  const frameInterval = 1000 / SIM_HZ;

  const loop = (now: number) => {
    const state = get();
    if (!state.running) {
      rafId = null;
      return;
    }

    const elapsed = now - lastTime;
    const ticksToRun = Math.floor((elapsed / frameInterval) * speedRef);

    if (ticksToRun > 0) {
      const capped = Math.min(ticksToRun, 10);
      const sim = state.sim;
      const interp = state.interpreter;

      if (state.mode === "live" && sim) {
        for (let i = 0; i < capped; i++) {
          // Chạy interpreter trước (để đặt lệnh motor)
          if (interp) {
            try {
              interp.step();
            } catch (err: any) {
              set(() => ({
                running: false,
                error: `Runtime error: ${err.message}`,
                interpreter: null,
              }));
              if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
              }
              return;
            }
          }
          // Tiến mô phỏng (vật lý + cảm biến)
          sim.tick();

          // Kiểm tra interpreter đã hoàn tất chưa
          if (interp?.done) {
            set(() => ({
              running: false,
              interpreter: null,
            }));
            if (rafId !== null) {
              cancelAnimationFrame(rafId);
              rafId = null;
            }
            return;
          }
        }
      } else if (state.mode === "replay" && state.replaySim) {
        for (let i = 0; i < capped; i++) state.replaySim.tick();
      }

      set(() => ({
        tick: state.mode === "live"
          ? sim?.state.tick ?? 0
          : state.replaySim?.state.tick ?? 0,
        replayFrameIndex: state.replaySim?.frameIndex ?? 0,
      }));

      lastTime += capped * frameInterval / speedRef;
    }

    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);
}

// ---- Kho trạng thái ----

export const useSimStore = create<SimStore>((set, get) => ({
  sim: null,
  mapData: null,
  replaySim: null,
  interpreter: null,
  irProgram: null,
  mode: "live",
  running: false,
  tick: 0,
  speed: 1,
  replayFrameIndex: 0,
  replayFrameCount: 0,
  error: null,
  loading: false,

  init: () => {
    const map = createTestMap(2400, 1200, 1);
    const sim = createSimulation({
      map,
      robotConfig: { ...DEFAULT_ROBOT_CONFIG, sensorNoise: 0 },
      seed: 42,
    });

    set({
      sim,
      mapData: map,
      interpreter: null,
      irProgram: null,
      mode: "live",
      running: false,
      tick: 0,
      speed: 1,
      replaySim: null,
      replayFrameIndex: 0,
      replayFrameCount: 0,
      error: null,
      loading: false,
    });

    // Nạp chương trình mẫu sau một khoảng trễ ngắn để Blockly kịp init
    setTimeout(() => {
      const sample = getSampleProgram();
      if (sample && (window as any).__blocklyLoadSample) {
        (window as any).__blocklyLoadSample(sample);
      }
    }, 500);
  },

  step: () => {
    const { sim, interpreter, mode, replaySim } = get();
    if (mode === "live" && sim) {
      if (interpreter) {
        try {
          interpreter.step();
        } catch (err: any) {
          set({ error: `Runtime error: ${err.message}` });
          return;
        }
        if (interpreter.done) {
          set({ interpreter: null });
        }
      }
      sim.tick();
      set({ tick: sim.state.tick });
    } else if (mode === "replay" && replaySim) {
      replaySim.tick();
      set({
        tick: replaySim.state.tick,
        replayFrameIndex: replaySim.frameIndex,
      });
    }
  },

  start: () => {
    const { running } = get();
    if (running) return;
    set({ running: true, error: null });
    speedRef = get().speed;
    createSimLoop(get, set as any);
  },

  stop: () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    set({ running: false });
  },

  reset: () => {
    get().stop();
    const { sim, interpreter, mode, replaySim } = get();
    if (mode === "live" && sim) {
      sim.reset();
      // Tạo lại interpreter nếu chương trình đang active
      const prog = get().irProgram;
      if (prog) {
        const newInterp = createInterpreter(prog, sim, { cSandbox: { enabled: false } });
        set({ interpreter: newInterp });
      }
    } else if (mode === "replay" && replaySim) {
      replaySim.reset();
    }
    set({ tick: 0, replayFrameIndex: 0, error: null });
  },

  setSpeed: (s: number) => {
    speedRef = s;
    set({ speed: s });
  },

  runProgram: (program: IRProgram) => {
    get().stop();
    const { sim } = get();
    if (!sim) {
      set({ error: "No simulation loaded" });
      return;
    }

    sim.reset();
    try {
      const interp = createInterpreter(program, sim, { cSandbox: { enabled: false } });
      set({
        interpreter: interp,
        irProgram: program,
        tick: 0,
        error: null,
      });
    } catch (err: any) {
      set({ error: `Failed to create interpreter: ${err.message}` });
    }
  },

  clearError: () => set({ error: null }),

  enterReplay: (frames: TelemetryFrame[]) => {
    get().stop();
    const replay = createReplay(frames);
    set({
      mode: "replay",
      replaySim: replay,
      replayFrameIndex: 0,
      replayFrameCount: frames.length,
      tick: replay.state.tick,
      interpreter: null,
    });
  },

  exitReplay: () => {
    get().stop();
    set({
      mode: "live",
      replaySim: null,
      replayFrameIndex: 0,
      replayFrameCount: 0,
      tick: get().sim?.state.tick ?? 0,
    });
  },

  replayStepForward: () => {
    const { replaySim } = get();
    if (replaySim) {
      replaySim.tick();
      set({
        replayFrameIndex: replaySim.frameIndex,
        tick: replaySim.state.tick,
      });
    }
  },

  replayStepBackward: () => {
    const { replaySim } = get();
    if (replaySim) {
      replaySim.stepBackward();
      set({
        replayFrameIndex: replaySim.frameIndex,
        tick: replaySim.state.tick,
      });
    }
  },

  replayJumpTo: (frame: number) => {
    const { replaySim } = get();
    if (!replaySim) return;
    const frames = replaySim.getTelemetry();
    get().stop();
    const newReplay = createReplay(frames);
    for (let i = 0; i < frame; i++) newReplay.tick();
    set({
      replaySim: newReplay,
      replayFrameIndex: newReplay.frameIndex,
      tick: newReplay.state.tick,
    });
  },

  replaySetSpeed: (s: number) => {
    const { replaySim } = get();
    if (replaySim) replaySim.setSpeed(s);
    set({ speed: s });
  },
}));

// ---- Chương trình mẫu ----

// ---- Thiết lập phím tắt ----

if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    switch (e.code) {
      case "Space":
        e.preventDefault();
        useSimStore.getState().running
          ? useSimStore.getState().stop()
          : useSimStore.getState().start();
        break;
      case "KeyR":
        if (!e.ctrlKey && !e.metaKey) {
          useSimStore.getState().reset();
        }
        break;
      case "KeyS":
        if (!e.ctrlKey && !e.metaKey) {
          useSimStore.getState().step();
        }
        break;
    }
  });
}
