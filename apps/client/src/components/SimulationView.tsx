import { useEffect, useRef, useCallback } from "react";
import {
  Application,
  Container,
  Graphics,
  Sprite,
  Texture,
  type Application as AppType,
} from "pixi.js";
import type { Simulation, MapData } from "@htlab/simulation-core";

interface SimulationViewProps {
  sim: Simulation | null;
  mapData: MapData | null;
  running: boolean;
}

const MAP_SCALE = 1; // px trên mỗi mm

export default function SimulationView({ sim, mapData, running }: SimulationViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<AppType | null>(null);
  const worldRef = useRef<Container | null>(null);
  const mapSpriteRef = useRef<Sprite | null>(null);
  const robotGfxRef = useRef<Graphics | null>(null);
  const trailGfxRef = useRef<Graphics | null>(null);
  const sensorGfxRef = useRef<Graphics | null>(null);
  const trailPointsRef = useRef<Array<{ x: number; y: number }>>([]);

  // Trạng thái camera (đặt trong ref để tránh vẽ lại khi đang hoạt ảnh)
  const cameraRef = useRef({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; camX: number; camY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    camX: 0,
    camY: 0,
  });

  const updateCamera = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    const cam = cameraRef.current;
    world.scale.set(cam.scale);
    world.position.set(cam.x, cam.y);
  }, []);

  // Khởi tạo PixiJS
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Dùng kích thước thật nếu có, nếu chưa có thì fallback tối thiểu 800x600
    const initW = container.clientWidth || 800;
    const initH = container.clientHeight || 600;

    const app = new Application();
    appRef.current = app;

    let destroyed = false;

    (async () => {
      await app.init({
        width: initW,
        height: initH,
        backgroundColor: 0x0f0f23,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (destroyed) {
        app.destroy(true);
        return;
      }

      container.appendChild(app.canvas);

      // Tạo container thế giới (dùng cho thu phóng/kéo)
      const world = new Container();
      worldRef.current = world;
      app.stage.addChild(world);

      // Ảnh sa bàn tạm, sẽ được thay khi mô phỏng có dữ liệu sa bàn
      const mapSprite = new Sprite(Texture.WHITE);
      mapSprite.width = 2400;
      mapSprite.height = 1200;
      mapSprite.tint = 0x1a1a2e;
      mapSpriteRef.current = mapSprite;
      world.addChild(mapSprite);

      // Đồ họa cho quỹ đạo
      const trailGfx = new Graphics();
      trailGfxRef.current = trailGfx;
      world.addChild(trailGfx);

      // Đồ họa cho robot
      const robotGfx = new Graphics();
      robotGfxRef.current = robotGfx;
      world.addChild(robotGfx);

      // Chỉ báo cảm biến
      const sensorGfx = new Graphics();
      sensorGfxRef.current = sensorGfx;
      world.addChild(sensorGfx);

      // Vẽ sa bàn từ mapData nếu có
      if (mapData) {
        drawMapTexture(mapData, mapSprite);
      }

      // Theo dõi kích thước container và resize renderer
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          const h = entry.contentRect.height;
          if (w > 0 && h > 0) {
            app.renderer.resize(w, h);
          }
        }
      });
      resizeObserver.observe(container);
      (app.canvas as any).__resizeObserver = resizeObserver;

      // Thu phóng bằng con lăn chuột
      app.canvas.addEventListener("wheel", (e: WheelEvent) => {
        e.preventDefault();
        const rect = app.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const cam = cameraRef.current;
        const oldScale = cam.scale;
        const newScale = Math.max(0.1, Math.min(5, oldScale * (e.deltaY > 0 ? 0.9 : 1.1)));

        // Thu phóng hướng về vị trí chuột
        cam.x = mx - (mx - cam.x) * (newScale / oldScale);
        cam.y = my - (my - cam.y) * (newScale / oldScale);
        cam.scale = newScale;
        updateCamera();
      }, { passive: false });

      // Kéo góc nhìn bằng chuột
      app.canvas.addEventListener("mousedown", (e: MouseEvent) => {
        dragRef.current = {
          active: true,
          startX: e.clientX,
          startY: e.clientY,
          camX: cameraRef.current.x,
          camY: cameraRef.current.y,
        };
      });

      window.addEventListener("mousemove", (e: MouseEvent) => {
        if (!dragRef.current.active) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        cameraRef.current.x = dragRef.current.camX + dx;
        cameraRef.current.y = dragRef.current.camY + dy;
        updateCamera();
      });

      window.addEventListener("mouseup", () => {
        dragRef.current.active = false;
      });

      // Khi container được gán kích thước bởi flex layout, resize ngay
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        app.renderer.resize(container.clientWidth, container.clientHeight);
      }
    })();

    return () => {
      destroyed = true;
      // An toàn cleanup: async init có thể chưa hoàn tất (React StrictMode double-mount)
      try {
        const currentApp = appRef.current;
        if (currentApp?.canvas) {
          const obs = (currentApp.canvas as any)?.__resizeObserver;
          if (obs) obs.disconnect();
        }
      } catch {}
      try { app.destroy(true); } catch {}
      appRef.current = null;
    };
  }, []);

  // Vẽ kết cấu sa bàn từ mapData
  const drawMapTexture = useCallback((data: MapData, sprite: Sprite) => {
    try {
      const { imageData, width, height } = data;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const pixels = imageData instanceof Uint8ClampedArray
        ? imageData
        : (imageData as any).data ?? imageData;
      const imgData = new ImageData(
        new Uint8ClampedArray(pixels),
        width,
        height,
      );
      ctx.putImageData(imgData, 0, 0);

      const texture = Texture.from(canvas);
      sprite.texture = texture;
      sprite.width = width;
      sprite.height = height;
    } catch {
      // Phương án dự phòng, giữ ảnh hiển thị tạm
    }
  }, []);

  // Vòng lặp vẽ: cập nhật đối tượng hiển thị từ sim.state
  useEffect(() => {
    let rafId: number;

    function render() {
      const app = appRef.current;
      const robotGfx = robotGfxRef.current;
      const trailGfx = trailGfxRef.current;
      const sensorGfx = sensorGfxRef.current;
      const mapSprite = mapSpriteRef.current;

      if (!app || !robotGfx || !trailGfx || !sensorGfx || !sim) {
        rafId = requestAnimationFrame(render);
        return;
      }

      const state = sim.state;
      const { robot, sensors } = state;

      // Vẽ sa bàn ở lần đầu có mapData
      if (mapSprite && mapSprite.texture === Texture.WHITE && mapData) {
        drawMapTexture(mapData, mapSprite);
      }

      // --- Robot ---
      robotGfx.clear();
      const rx = robot.x * MAP_SCALE;
      const ry = robot.y * MAP_SCALE;
      const heading = robot.heading;

      // Vẽ tam giác trỏ theo hướng heading
      const size = 15;
      const cos = Math.cos(heading);
      const sin = Math.sin(heading);

      // Các điểm tam giác (tọa độ cục bộ tương đối với tâm robot)
      const tipX = rx + cos * size;
      const tipY = ry + sin * size;
      const leftX = rx + cos * (size + Math.PI * 0.75) * (-size * 0.6);
      const leftY = ry + sin * (size + Math.PI * 0.75) * (-size * 0.6);

      // Dùng hướng vuông góc để tạo đáy tam giác
      const perpX = -sin;
      const perpY = cos;
      const baseX = rx - cos * size * 0.5;
      const baseY = ry - sin * size * 0.5;
      const blX = baseX + perpX * size * 0.6;
      const blY = baseY + perpY * size * 0.6;
      const brX = baseX - perpX * size * 0.6;
      const brY = baseY - perpY * size * 0.6;

      robotGfx.poly([tipX, tipY, blX, blY, brX, brY]);
      robotGfx.fill({ color: 0xe94560 });

      // --- Quỹ đạo ---
      if (state.tick > 0) {
        trailPointsRef.current.push({ x: rx, y: ry });
        // Giới hạn vệt quỹ đạo ở 5000 điểm để giữ hiệu năng
        if (trailPointsRef.current.length > 5000) {
          trailPointsRef.current = trailPointsRef.current.slice(-5000);
        }
      }

      trailGfx.clear();
      const pts = trailPointsRef.current;
      if (pts.length > 1) {
        trailGfx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          trailGfx.lineTo(pts[i].x, pts[i].y);
        }
        trailGfx.stroke({ width: 2, color: 0xe94560, alpha: 0.6 });
      }

      // --- Chỉ báo cảm biến ---
      sensorGfx.clear();
      // Vẽ 5 chấm nhỏ tại vị trí cảm biến
      const sensorSpacing = 12; // mm
      const sensorOffset = 120; // mm
      for (let i = 0; i < 5; i++) {
        const lateral = (i - 2) * sensorSpacing;
        const sx = rx + cos * sensorOffset - sin * lateral;
        const sy = ry + sin * sensorOffset + cos * lateral;

        // Màu chuyển từ trắng (0) sang đỏ (100) theo giá trị road
        const v = sensors.roads[i] / 100;
        const r = Math.round(255 * v);
        const g = Math.round(255 * (1 - v));
        const color = (r << 16) | (g << 8) | 0;

        sensorGfx.circle(sx, sy, 3);
        sensorGfx.fill({ color });
      }

      rafId = requestAnimationFrame(render);
    }

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [sim]);

  // Đặt lại vệt quỹ đạo khi mô phỏng được đặt lại
  useEffect(() => {
    trailPointsRef.current = [];
  }, [sim]);

  function handleResetView() {
    cameraRef.current = { x: 0, y: 0, scale: 1 };
    updateCamera();
  }

  return (
    <div className="relative flex-1 overflow-hidden bg-surface-dark">
      <div ref={containerRef} className="w-full h-full" />

      {/* Nút đặt lại góc nhìn */}
      <button
        onClick={handleResetView}
        className="absolute bottom-4 right-4 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 z-10"
      >
        Reset View
      </button>
    </div>
  );
}
