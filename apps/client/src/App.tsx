import React, { useEffect, useRef, useCallback, useState } from "react";
import { useSimStore } from "./store/simStore.js";
import Controls from "./components/Controls.js";
import ReplayControls from "./components/ReplayControls.js";
import SimulationView from "./components/SimulationView.js";
import TelemetryPanel from "./components/TelemetryPanel.js";
import BlocklyEditor from "./blockly/BlocklyEditor.js";
import ProjectManager from "./components/ProjectManager.js";
import type { IRProgram } from "@htlab/simulation-core";

export default function App() {
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

  return (
    <div className="flex flex-col h-screen">
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

      <div className="flex flex-1 overflow-hidden">
        {/* Trái: Blockly Editor */}
        <div className="w-80 flex flex-col border-r border-gray-700 flex-shrink-0">
          <ProjectManager
            onLoadWorkspace={loadWorkspaceXml}
            onGetWorkspaceXml={getWorkspaceXml}
          />
          <div className="flex-1 blockly-workspace-container">
            <BlocklyEditor onIRGenerated={handleIRGenerated} />
          </div>
        </div>

        {/* Giữa: Simulation View */}
        <div className="flex-1 flex flex-col">
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
        </div>

        {/* Phải: Telemetry */}
        <TelemetryPanel state={activeSim?.state ?? null} tick={tick} />
      </div>
    </div>
  );
}
