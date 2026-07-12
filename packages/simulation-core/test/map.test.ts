import { describe, it, expect } from "vitest";
import { createTestMap, loadMap, sampleMapPixel } from "../src/map.js";

describe("createTestMap", () => {
  it("creates a map with correct dimensions", () => {
    const map = createTestMap(2400, 1200, 1);
    expect(map.width).toBe(2400);
    expect(map.height).toBe(1200);
    expect(map.imageData.length).toBe(2400 * 1200 * 4);
  });

  it("respects scale parameter", () => {
    const map = createTestMap(1000, 500, 2);
    expect(map.width).toBe(2000);
    expect(map.height).toBe(1000);
  });

  it("has correct metadata", () => {
    const map = createTestMap(2400, 1200, 1);
    expect(map.metadata.width).toBe(2400);
    expect(map.metadata.height).toBe(1200);
    expect(map.metadata.scale).toBe(1);
    expect(map.metadata.startPose.x).toBe(200);
    expect(map.metadata.startPose.y).toBe(600);
    expect(map.metadata.startPose.heading).toBe(0);
    expect(map.metadata.checkpoints).toHaveLength(2);
    expect(map.metadata.finishZone).toBeDefined();
  });
});

describe("sampleMapPixel", () => {
  it("returns white (near 0) on the white background", () => {
    const map = createTestMap(2400, 1200, 1);
    // Lấy mẫu một điểm xa vạch giữa (phía trên sa bàn)
    const val = sampleMapPixel(map, 100, 100);
    // Nền trắng -> thang xám là 255, đảo thành 0
    expect(val).toBeLessThan(5);
  });

  it("returns black (near 255) on the line", () => {
    const map = createTestMap(2400, 1200, 1);
    // Lấy mẫu vạch giữa
    const val = sampleMapPixel(map, 500, 600);
    // Vạch đen -> thang xám là 0, đảo thành 255
    expect(val).toBeGreaterThan(250);
  });

  it("returns 0 for out-of-bounds coordinates", () => {
    const map = createTestMap(2400, 1200, 1);
    const val = sampleMapPixel(map, -100, -100);
    expect(val).toBe(0);
  });

  it("handles edge of line (grayscale transition)", () => {
    const map = createTestMap(2400, 1200, 1);
    // Lấy mẫu gần mép vạch
    // Tâm ở y=600, vạch dày 30px → hai mép ở 585 và 615
    const valCenter = sampleMapPixel(map, 500, 601); // hơi lệch khỏi tâm
    const valEdge = sampleMapPixel(map, 500, 620); // ngoài vạch
    // Vùng giữa phải tối hơn nhiều so với mép
    expect(valCenter).toBeGreaterThan(valEdge);
  });
});

describe("loadMap", () => {
  it("accepts valid map data", () => {
    const map = createTestMap(100, 100, 1);
    const loaded = loadMap({
      imageData: map.imageData,
      width: map.width,
      height: map.height,
      metadata: map.metadata,
    });
    expect(loaded.width).toBe(100);
    expect(loaded.height).toBe(100);
  });

  it("throws on dimension mismatch", () => {
    const map = createTestMap(100, 100, 1);
    expect(() =>
      loadMap({
        imageData: map.imageData,
        width: 50, // sai chiều rộng
        height: 100,
        metadata: map.metadata,
      }),
    ).toThrow("do not match");
  });
});
