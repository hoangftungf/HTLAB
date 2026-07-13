import React from "react";
import type { SimState, TelemetryEvent } from "@htlab/simulation-core";

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

function formatPayload(event: TelemetryEvent): string {
  const entries = Object.entries(event.payload)
    .filter(([, value]) => value !== null && value !== "")
    .slice(0, 3);
  if (entries.length === 0) return "";
  return entries.map(([key, value]) => `${key}=${String(value)}`).join(" ");
}

function EventRow({ event }: { event: TelemetryEvent }) {
  const tone = event.severity === "error"
    ? "border-red-500/40 bg-red-950/30 text-red-200"
    : event.severity === "warning"
      ? "border-amber-500/40 bg-amber-950/30 text-amber-100"
      : event.kind === "effect"
        ? "border-cyan-500/40 bg-cyan-950/30 text-cyan-100"
        : "border-gray-700 bg-gray-900 text-gray-200";
  const payload = formatPayload(event);

  return (
    <div className={`rounded border px-2 py-1 ${tone}`}>
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide">
        <span>{event.kind}</span>
        <span className="font-mono text-gray-400">t{event.tick}</span>
      </div>
      <div className="mt-0.5 break-words text-xs">{event.label}</div>
      {payload ? <div className="mt-0.5 break-words font-mono text-[10px] text-gray-400">{payload}</div> : null}
    </div>
  );
}

export default function TelemetryPanel({ state, tick }: TelemetryPanelProps) {
  if (!state) {
    return (
      <div className="h-full w-full bg-surface p-4 text-sm text-gray-400">
        No simulation loaded
      </div>
    );
  }

  const { robot, sensors, runtime } = state;
  const recentEvents = runtime.events.slice(-8).reverse();

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto bg-surface p-4 text-sm">
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

      <div>
        <h3 className="text-accent text-xs font-semibold uppercase tracking-wide mb-2">Runtime Events</h3>
        {recentEvents.length > 0 ? (
          <div className="space-y-1.5">
            {recentEvents.map((event) => (
              <EventRow key={`${event.tick}-${event.sequence}`} event={event} />
            ))}
          </div>
        ) : (
          <div className="rounded border border-gray-800 bg-gray-900 px-2 py-2 text-xs text-gray-500">
            No events
          </div>
        )}
      </div>
    </div>
  );
}
