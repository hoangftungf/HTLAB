import React from "react";
import type { SimState } from "@htlab/simulation-core";

interface TelemetryPanelProps {
  state: SimState | null;
  tick: number;
}

function SensorBar({ index, value }: { index: number; value: number }) {
  const intensity = value / 100;
  const r = Math.round(255 * intensity);
  const g = Math.round(255 * (1 - intensity));
  const color = `rgb(${r},${g},0)`;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 w-10 text-right">R{index + 1}</span>
      <div className="flex-1 h-3 bg-gray-800 rounded overflow-hidden">
        <div
          className="h-full rounded transition-all duration-75"
          style={{
            width: `${value}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <span className="text-gray-300 w-6 text-right font-mono">{value}</span>
    </div>
  );
}

function MotorBar({ label, value }: { label: string; value: number }) {
  const pct = Math.abs(value / 500) * 100;
  const color = value >= 0 ? "#4ade80" : "#f87171";

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 w-5">{label}</span>
      <div className="flex-1 h-2 bg-gray-800 rounded overflow-hidden">
        <div
          className="h-full rounded transition-all duration-75"
          style={{
            width: `${Math.min(pct, 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <span className="text-gray-300 w-12 text-right font-mono">{value.toFixed(0)}</span>
    </div>
  );
}

function Gauge({ value, min, max, label }: { value: number; min: number; max: number; label: string }) {
  const range = max - min;
  const pct = ((value - min) / range) * 100;
  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <div className="mt-1">
      <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
        <span>{min}</span>
        <span>{label}</span>
        <span>{max}</span>
      </div>
      <div className="h-4 bg-gray-800 rounded relative overflow-hidden">
        <div
          className="absolute top-0 h-full w-0.5 bg-white/50"
          style={{ left: "50%" }}
        />
        <div
          className="absolute top-1 h-2 w-2 rounded-full bg-accent -ml-1 transition-all duration-75"
          style={{ left: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export default function TelemetryPanel({ state, tick }: TelemetryPanelProps) {
  if (!state) {
    return (
      <div className="w-72 bg-surface border-l border-gray-700 p-4 text-sm text-gray-400">
        No simulation loaded
      </div>
    );
  }

  const { robot, sensors } = state;

  return (
    <div className="w-72 bg-surface border-l border-gray-700 p-4 text-sm overflow-y-auto flex flex-col gap-4">
      {/* Tick hiện tại */}
      <div className="text-xs text-gray-500 font-mono">
        Tick <span className="text-gray-300">{tick}</span>
      </div>

      {/* Trạng thái robot */}
      <div>
        <h3 className="text-accent text-xs font-semibold uppercase tracking-wide mb-2">Robot</h3>
        <div className="space-y-1 text-xs text-gray-300">
          <div className="flex justify-between">
            <span className="text-gray-500">Pos</span>
            <span className="font-mono">x={robot.x.toFixed(0)} y={robot.y.toFixed(0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Heading</span>
            <span className="font-mono">{((robot.heading * 180) / Math.PI).toFixed(0)}&deg;</span>
          </div>
        </div>

        <h4 className="text-gray-500 text-[10px] uppercase tracking-wide mt-3 mb-1">Motor Speeds</h4>
        <div className="space-y-1">
          <MotorBar label="L" value={robot.leftSpeed} />
          <MotorBar label="R" value={robot.rightSpeed} />
        </div>
      </div>

      {/* Cảm biến dò vạch */}
      <div>
        <h3 className="text-accent text-xs font-semibold uppercase tracking-wide mb-2">Line Sensors</h3>
        <div className="space-y-1.5">
          {sensors.roads.map((v, i) => (
            <SensorBar key={i} index={i} value={v} />
          ))}
        </div>
      </div>

      {/* Mẫu cảm biến */}
      <div>
        <h3 className="text-accent text-xs font-semibold uppercase tracking-wide mb-1">Pattern</h3>
        <div className="bg-gray-900 rounded px-3 py-2 font-mono text-2xl tracking-widest text-center">
          {sensors.pattern.split("").map((ch, i) => (
            <span
              key={i}
              className={ch === "1" ? "text-green-400" : "text-gray-600"}
            >
              {ch}
            </span>
          ))}
        </div>
      </div>

      {/* Đồng hồ vị trí vạch */}
      <div>
        <h3 className="text-accent text-xs font-semibold uppercase tracking-wide mb-1">
          Line Position
        </h3>
        <div className="text-center font-mono text-lg mb-1">
          <span className={sensors.linePosition > 0 ? "text-blue-400" : sensors.linePosition < 0 ? "text-red-400" : "text-gray-300"}>
            {sensors.linePosition}
          </span>
        </div>
        <Gauge value={sensors.linePosition} min={-100} max={100} label="pos" />
      </div>

      {/* Trạng thái hiệu chuẩn */}
      <div className="text-[10px] text-gray-500">
        Calibrated:{" "}
        <span className={sensors.calibrated ? "text-green-400" : "text-red-400"}>
          {sensors.calibrated ? "YES" : "NO"}
        </span>
      </div>
    </div>
  );
}
