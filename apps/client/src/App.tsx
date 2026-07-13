import React, { useEffect, useRef, useCallback, useState } from "react";
import { useSimStore } from "./store/simStore.js";
import Controls from "./components/Controls.js";
import ReplayControls from "./components/ReplayControls.js";
import SimulationView from "./components/SimulationView.js";
import TelemetryPanel from "./components/TelemetryPanel.js";
import BlocklyEditor from "./blockly/BlocklyEditor.js";
import ProjectManager from "./components/ProjectManager.js";
import type { IRProgram } from "@htlab/simulation-core";

const LEFT_PANE_STORAGE_KEY = "htlab:leftPaneWidth";
const RIGHT_PANE_STORAGE_KEY = "htlab:rightPaneWidth";
const TELEMETRY_STORAGE_KEY = "htlab:telemetryOpen";

const DEFAULT_LEFT_PANE_WIDTH = 560;
const DEFAULT_RIGHT_PANE_WIDTH = 300;
const MIN_LEFT_PANE_WIDTH = 420;
const MAX_LEFT_PANE_WIDTH = 820;
const MIN_RIGHT_PANE_WIDTH = 260;
const MAX_RIGHT_PANE_WIDTH = 420;
const MIN_SIMULATION_WIDTH = 360;
const SPLITTER_WIDTH = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function readStoredNumber(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value === "true";
}

export default function App() {
  const layoutRef = useRef<HTMLDivElement>(null);
  const init = useSimStore((s) => s.init);
  const sim = useSimStore((s) => s.sim);
  const mapData = useSimStore((s) => s.mapData);
  const mode = useSimStore((s) => s.mode);
  const replaySim = useSimStore((s) => s.replaySim);
  const running = useSimStore((s) => s.running);
  const tick = useSimStore((s) => s.tick);
  const error = useSimStore((s) => s.error);
  const loading = useSimStore((s) => s.loading);
  const runProgram = useSimStore((s) => s.runProgram);
  const clearError = useSimStore((s) => s.clearError);

  const [irOutput, setIrOutput] = useState<IRProgram | null>(null);
  const [leftPaneWidth, setLeftPaneWidth] = useState(() =>
    readStoredNumber(LEFT_PANE_STORAGE_KEY, DEFAULT_LEFT_PANE_WIDTH),
  );
  const [rightPaneWidth, setRightPaneWidth] = useState(() =>
    readStoredNumber(RIGHT_PANE_STORAGE_KEY, DEFAULT_RIGHT_PANE_WIDTH),
  );
  const [telemetryOpen, setTelemetryOpen] = useState(() =>
    readStoredBoolean(TELEMETRY_STORAGE_KEY, true),
  );

  // Khởi tạo mô phỏng khi component được gắn
  useEffect(() => {
    init();
  }, [init]);

  // Dùng mô phỏng phát lại trong chế độ phát lại, còn lại dùng mô phỏng trực tiếp
  const activeSim = mode === "replay" ? replaySim : sim;

  // Xử lý IR được sinh từ Blockly
  const handleIRGenerated = useCallback((program: IRProgram) => {
    setIrOutput(program);
  }, []);

  // Callback cho trình quản lý project
  const getWorkspaceXml = useCallback((): string => {
    const containers = document.querySelectorAll(".blockly-workspace-container");
    if (containers.length > 0) {
      return (containers[0] as any).__blocklyGetXml?.() ?? "";
    }
    return "";
  }, []);

  const loadWorkspaceXml = useCallback((xml: string) => {
    const containers = document.querySelectorAll(".blockly-workspace-container");
    if (containers.length > 0) {
      (containers[0] as any).__blocklyLoadXml?.(xml);
    }
  }, []);

  const handleRunProgram = useCallback(() => {
    if (!irOutput) return;
    runProgram(irOutput);
  }, [irOutput, runProgram]);

  const constrainLeftPaneWidth = useCallback(
    (nextWidth: number) => {
      const layoutWidth = layoutRef.current?.clientWidth ?? window.innerWidth;
      const activeRightWidth = telemetryOpen ? rightPaneWidth + SPLITTER_WIDTH : 0;
      const maxFromViewport =
        layoutWidth - activeRightWidth - MIN_SIMULATION_WIDTH - SPLITTER_WIDTH;
      const maxWidth = Math.max(
        MIN_LEFT_PANE_WIDTH,
        Math.min(MAX_LEFT_PANE_WIDTH, maxFromViewport),
      );

      return clamp(nextWidth, MIN_LEFT_PANE_WIDTH, maxWidth);
    },
    [rightPaneWidth, telemetryOpen],
  );

  const constrainRightPaneWidth = useCallback(
    (nextWidth: number) => {
      const layoutWidth = layoutRef.current?.clientWidth ?? window.innerWidth;
      const maxFromViewport =
        layoutWidth - leftPaneWidth - MIN_SIMULATION_WIDTH - SPLITTER_WIDTH * 2;
      const maxWidth = Math.max(
        MIN_RIGHT_PANE_WIDTH,
        Math.min(MAX_RIGHT_PANE_WIDTH, maxFromViewport),
      );

      return clamp(nextWidth, MIN_RIGHT_PANE_WIDTH, maxWidth);
    },
    [leftPaneWidth],
  );

  const beginPaneResize = useCallback(
    (side: "left" | "right", event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();

      const startX = event.clientX;
      const startLeftWidth = leftPaneWidth;
      const startRightWidth = rightPaneWidth;

      document.body.classList.add("is-resizing-pane");

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;

        if (side === "left") {
          setLeftPaneWidth(constrainLeftPaneWidth(startLeftWidth + deltaX));
          return;
        }

        setRightPaneWidth(constrainRightPaneWidth(startRightWidth - deltaX));
      };

      const stopResize = () => {
        document.body.classList.remove("is-resizing-pane");
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", stopResize);
        document.removeEventListener("pointercancel", stopResize);
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", stopResize, { once: true });
      document.addEventListener("pointercancel", stopResize, { once: true });
    },
    [
      constrainLeftPaneWidth,
      constrainRightPaneWidth,
      leftPaneWidth,
      rightPaneWidth,
    ],
  );

  useEffect(() => {
    window.localStorage.setItem(LEFT_PANE_STORAGE_KEY, String(Math.round(leftPaneWidth)));
  }, [leftPaneWidth]);

  useEffect(() => {
    window.localStorage.setItem(RIGHT_PANE_STORAGE_KEY, String(Math.round(rightPaneWidth)));
  }, [rightPaneWidth]);

  useEffect(() => {
    window.localStorage.setItem(TELEMETRY_STORAGE_KEY, String(telemetryOpen));
  }, [telemetryOpen]);

  useEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;

    const observer = new ResizeObserver(() => {
      setLeftPaneWidth((current) => constrainLeftPaneWidth(current));
      setRightPaneWidth((current) => constrainRightPaneWidth(current));
    });

    observer.observe(layout);
    return () => observer.disconnect();
  }, [constrainLeftPaneWidth, constrainRightPaneWidth]);

  return (
    <div className="flex h-screen flex-col">
      <Controls />
      <ReplayControls />

      {/* Lớp phủ lỗi */}
      {error && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 bg-red-900/90 border border-red-700 rounded-lg shadow-lg">
          <span className="text-red-200 text-sm">{error}</span>
          <button
            onClick={clearError}
            className="px-2 py-0.5 rounded text-xs bg-red-700 hover:bg-red-600 text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Lớp phủ đang tải */}
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface-dark/80">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Loading...</span>
          </div>
        </div>
      )}

      <div ref={layoutRef} className="flex min-h-0 flex-1 overflow-hidden">
        {/* Trái: Blockly Editor */}
        <div
          className="flex min-w-0 flex-col border-r border-gray-700 bg-surface"
          style={{ flex: `0 0 ${leftPaneWidth}px` }}
        >
          <ProjectManager
            onLoadWorkspace={loadWorkspaceXml}
            onGetWorkspaceXml={getWorkspaceXml}
          />
          <div className="blockly-workspace-container min-h-0 flex-1 overflow-hidden">
            <BlocklyEditor onIRGenerated={handleIRGenerated} />
          </div>
        </div>

        {/* Giữa: Simulation View */}
        <div
          role="separator"
          aria-label="Resize Blockly editor"
          aria-orientation="vertical"
          className="pane-splitter"
          onPointerDown={(event) => beginPaneResize("left", event)}
        />

        <div className="relative flex min-w-0 flex-1 flex-col">
          <SimulationView sim={activeSim} mapData={mapData} running={running} />

          {/* Thanh trạng thái kết quả IR */}
          {irOutput && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-900/30 border-t border-green-800 text-xs">
              <span className="text-green-400">IR ready</span>
              <span className="text-gray-300 font-mono">
                {irOutput.commands.length} commands
              </span>
              <button
                onClick={handleRunProgram}
                className="ml-auto px-3 py-0.5 rounded bg-accent hover:bg-accent-light text-white text-xs font-medium"
              >
                Run Program
              </button>
            </div>
          )}

          {!telemetryOpen && (
            <button
              onClick={() => setTelemetryOpen(true)}
              className="absolute right-4 top-4 z-10 rounded bg-gray-700 px-3 py-1.5 text-xs text-gray-200 shadow hover:bg-gray-600"
              title="Show telemetry panel"
            >
              Telemetry
            </button>
          )}
        </div>

        {/* Phải: Telemetry */}
        {telemetryOpen && (
          <>
            <div
              role="separator"
              aria-label="Resize telemetry panel"
              aria-orientation="vertical"
              className="pane-splitter"
              onPointerDown={(event) => beginPaneResize("right", event)}
            />
            <div
              className="relative min-w-0 border-l border-gray-700 bg-surface"
              style={{ flex: `0 0 ${rightPaneWidth}px` }}
            >
              <button
                onClick={() => setTelemetryOpen(false)}
                className="absolute right-2 top-2 z-10 rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300 hover:bg-gray-600"
                title="Hide telemetry panel"
              >
                Hide
              </button>
              <TelemetryPanel state={activeSim?.state ?? null} tick={tick} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
