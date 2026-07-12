import React from "react";

interface ToolbarProps {
  running: boolean;
  tick: number;
  speed: number;
  onStart: () => void;
  onStop: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

const speeds = [0.5, 1, 2, 4];

export default function Toolbar({
  running,
  tick,
  speed,
  onStart,
  onStop,
  onStep,
  onReset,
  onSpeedChange,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-surface border-b border-gray-700">
      {/* Tiêu đề */}
      <span className="text-sm font-semibold text-accent mr-4">HTLAB</span>

      {/* Điều khiển */}
      <button
        onClick={running ? onStop : onStart}
        className={`px-3 py-1 rounded text-sm font-medium ${
          running
            ? "bg-red-600 hover:bg-red-500"
            : "bg-green-600 hover:bg-green-500"
        }`}
      >
        {running ? "Pause" : "Run"}
      </button>

      <button
        onClick={onStep}
        disabled={running}
        className="px-3 py-1 rounded text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
      >
        Step
      </button>

      <button
        onClick={onReset}
        className="px-3 py-1 rounded text-sm font-medium bg-gray-600 hover:bg-gray-500"
      >
        Reset
      </button>

      {/* Bộ chọn tốc độ */}
      <div className="flex items-center gap-1 ml-4">
        <span className="text-xs text-gray-400">Speed:</span>
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-2 py-0.5 rounded text-xs ${
              speed === s
                ? "bg-accent text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Bộ đếm tick */}
      <span className="ml-auto text-xs text-gray-400 font-mono">
        tick: {tick}
      </span>
    </div>
  );
}
