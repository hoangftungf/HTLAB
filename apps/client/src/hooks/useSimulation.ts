import { useRef, useState, useCallback } from "react";
import {
  createSimulation,
  createTestMap,
  type Simulation,
  type MapData,
} from "@htlab/simulation-core";
import { DEFAULT_ROBOT_CONFIG } from "@htlab/simulation-core";

export function useSimulation() {
  const simRef = useRef<Simulation | null>(null);
  const mapDataRef = useRef<MapData | null>(null);
  const rafRef = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);

  const init = useCallback(() => {
    const map = createTestMap(2400, 1200, 1);
    mapDataRef.current = map;
    simRef.current = createSimulation({
      map,
      robotConfig: { ...DEFAULT_ROBOT_CONFIG, sensorNoise: 0 },
      seed: 42,
    });
    setTick(0);
    setRunning(false);
  }, []);

  const step = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    sim.tick();
    setTick(sim.state.tick);
  }, []);

  const start = useCallback(() => {
    if (running) return;
    setRunning(true);

    const sim = simRef.current;
    if (!sim) return;

    let lastTime = performance.now();
    const SIM_HZ = 60;
    const frameInterval = 1000 / SIM_HZ;

    const loop = (now: number) => {
      const elapsed = now - lastTime;
      const ticksToRun = Math.floor((elapsed / frameInterval) * speedRef.current);

      if (ticksToRun > 0) {
        // Giới hạn số tick bắt kịp tối đa
        const capped = Math.min(ticksToRun, 10);
        for (let i = 0; i < capped; i++) {
          sim.tick();
        }
        setTick(sim.state.tick);
        lastTime += capped * frameInterval / speedRef.current;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [running]);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    const sim = simRef.current;
    if (sim) {
      sim.reset();
      setTick(0);
    }
  }, [stop]);

  const changeSpeed = useCallback((s: number) => {
    speedRef.current = s;
    setSpeed(s);
  }, []);

  // Khởi tạo ở lần dùng đầu tiên nếu chưa được tạo
  if (!simRef.current) {
    init();
  }

  return {
    sim: simRef.current,
    mapData: mapDataRef.current,
    running,
    tick,
    speed,
    init,
    step,
    start,
    stop,
    reset,
    setSpeed: changeSpeed,
  };
}
