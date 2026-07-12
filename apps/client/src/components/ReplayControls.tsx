import React from "react";
import { useSimStore } from "../store/simStore.js";

export default function ReplayControls() {
  const mode = useSimStore((s) => s.mode);
  const replayFrameIndex = useSimStore((s) => s.replayFrameIndex);
  const replayFrameCount = useSimStore((s) => s.replayFrameCount);
  const speed = useSimStore((s) => s.speed);
  const replayStepForward = useSimStore((s) => s.replayStepForward);
  const replayStepBackward = useSimStore((s) => s.replayStepBackward);
  const replayJumpTo = useSimStore((s) => s.replayJumpTo);
  const replaySetSpeed = useSimStore((s) => s.replaySetSpeed);

  if (mode !== "replay") return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-purple-900/30 border-b border-purple-800 text-xs">
      <span className="text-purple-300 font-semibold mr-2">Replay</span>

      <button
        onClick={replayStepBackward}
        className="px-2 py-0.5 rounded bg-purple-800 hover:bg-purple-700 text-purple-200"
        title="Step backward"
      >
        &larr; Back
      </button>

      <button
        onClick={replayStepForward}
        className="px-2 py-0.5 rounded bg-purple-800 hover:bg-purple-700 text-purple-200"
        title="Step forward"
      >
        Fwd &rarr;
      </button>

      {/* Thanh trượt vị trí khung */}
      <input
        type="range"
        min={0}
        max={replayFrameCount - 1}
        value={replayFrameIndex}
        onChange={(e) => replayJumpTo(parseInt(e.target.value))}
        className="flex-1 h-1 accent-purple-500 mx-2"
      />

      <span className="text-purple-300 font-mono">
        {replayFrameIndex} / {replayFrameCount - 1}
      </span>

      {/* Tốc độ phát lại */}
      <span className="text-purple-400 ml-2">Speed:</span>
      {[0.5, 1, 2, 4].map((s) => (
        <button
          key={s}
          onClick={() => replaySetSpeed(s)}
          className={`px-1.5 py-0.5 rounded ${
            speed === s
              ? "bg-purple-600 text-white"
              : "bg-purple-900/50 text-purple-300 hover:bg-purple-800"
          }`}
        >
          {s}x
        </button>
      ))}
    </div>
  );
}
