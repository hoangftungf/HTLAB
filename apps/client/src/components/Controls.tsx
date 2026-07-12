import React from "react";
import { useSimStore } from "../store/simStore.js";

const SPEEDS = [0.25, 0.5, 1, 2, 4];

export default function Controls() {
  const running = useSimStore((s) => s.running);
  const tick = useSimStore((s) => s.tick);
  const speed = useSimStore((s) => s.speed);
  const mode = useSimStore((s) => s.mode);
  const start = useSimStore((s) => s.start);
  const stop = useSimStore((s) => s.stop);
  const step = useSimStore((s) => s.step);
  const reset = useSimStore((s) => s.reset);
  const setSpeed = useSimStore((s) => s.setSpeed);

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-surface border-b border-gray-700">
      <span className="text-sm font-semibold text-accent mr-2">HTLAB</span>

      {/* Chạy/Tạm dừng */}
      <button
        onClick={running ? stop : start}
        className={`px-3 py-1 rounded text-sm font-medium ${
          running
            ? "bg-red-600 hover:bg-red-500"
            : "bg-green-600 hover:bg-green-500"
        }`}
        title="Space"
      >
        {running ? "Pause" : "Run"}
      </button>

      {/* Chạy từng bước */}
      <button
        onClick={step}
        disabled={running}
        className="px-3 py-1 rounded text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
        title="S"
      >
        Step
      </button>

      {/* Đặt lại */}
      <button
        onClick={reset}
        className="px-3 py-1 rounded text-sm font-medium bg-gray-600 hover:bg-gray-500"
        title="R"
      >
        Reset
      </button>

      {/* Thanh trượt tốc độ */}
      <div className="flex items-center gap-2 ml-4">
        <span className="text-xs text-gray-400">Speed:</span>
        <input
          type="range"
          min="0"
          max="4"
          step="0"
          value={SPEEDS.indexOf(speed)}
          onChange={(e) => {
            const idx = parseInt(e.target.value);
            setSpeed(SPEEDS[idx]);
          }}
          className="w-24 h-1 accent-accent"
        />
        <span className="text-xs text-gray-300 font-mono w-8">{speed}x</span>
      </div>

      {/* Chỉ báo chế độ */}
      <span className={`text-xs px-2 py-0.5 rounded ml-2 ${
        mode === "replay" ? "bg-purple-700 text-purple-200" : "bg-gray-700 text-gray-400"
      }`}>
        {mode === "replay" ? "Replay" : "Live"}
      </span>

      {/* Bộ đếm tick */}
      <span className="ml-auto text-xs text-gray-400 font-mono">
        tick: {tick}
      </span>

      {/* Gợi ý phím tắt */}
      <div className="text-[10px] text-gray-600 ml-2">
        Space=Play R=Reset S=Step
      </div>
    </div>
  );
}
