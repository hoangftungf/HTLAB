import type { SimState } from "@htlab/simulation-core";

interface SidebarProps {
  state: SimState | null;
}

export default function Sidebar({ state }: SidebarProps) {
  if (!state) {
    return (
      <div className="w-64 bg-surface border-l border-gray-700 p-4 text-sm text-gray-400">
        No simulation loaded
      </div>
    );
  }

  const { robot, sensors } = state;

  return (
    <div className="w-64 bg-surface border-l border-gray-700 p-4 text-sm overflow-y-auto">
      <h3 className="text-accent font-semibold mb-3">Robot State</h3>

      <div className="space-y-1 text-gray-300">
        <div>
          <span className="text-gray-500">Position:</span> x={robot.x.toFixed(1)}, y={robot.y.toFixed(1)}
        </div>
        <div>
          <span className="text-gray-500">Heading:</span> {((robot.heading * 180) / Math.PI).toFixed(1)}°
        </div>
        <div>
          <span className="text-gray-500">Speed:</span> L={robot.leftSpeed.toFixed(1)}, R={robot.rightSpeed.toFixed(1)}
        </div>
      </div>

      <h3 className="text-accent font-semibold mt-4 mb-3">Sensors</h3>

      <div className="space-y-1 text-gray-300">
        <div>
          <span className="text-gray-500">Roads:</span> [{sensors.roads.join(", ")}]
        </div>
        <div>
          <span className="text-gray-500">Pattern:</span> {sensors.pattern}
        </div>
        <div>
          <span className="text-gray-500">Line Pos:</span> {sensors.linePosition}
        </div>
        <div>
          <span className="text-gray-500">Calibrated:</span> {sensors.calibrated ? "yes" : "no"}
        </div>
      </div>
    </div>
  );
}
