import { describe, it, expect } from "vitest";
import { createRNG } from "../src/rng.js";

describe("RNG (mulberry32)", () => {
  it("produces values in [0, 1)", () => {
    const rng = createRNG(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is deterministic — same seed = same sequence", () => {
    const rng1 = createRNG(12345);
    const rng2 = createRNG(12345);
    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it("different seeds produce different sequences", () => {
    const rng1 = createRNG(1);
    const rng2 = createRNG(2);
    let same = 0;
    for (let i = 0; i < 100; i++) {
      if (rng1.next() === rng2.next()) same++;
    }
    // Xác suất 100 lần trùng nhau là cực thấp
    expect(same).toBeLessThan(10);
  });

  it("nextInt produces values in [min, max]", () => {
    const rng = createRNG(99);
    for (let i = 0; i < 500; i++) {
      const v = rng.nextInt(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("clone produces independent copy with same state", () => {
    const rng1 = createRNG(77);
    // Cho RNG tiến thêm vài bước
    for (let i = 0; i < 10; i++) rng1.next();

    const rng2 = rng1.clone();
    // Cả hai phải sinh cùng giá trị kế tiếp
    expect(rng2.next()).toBe(rng1.next());
  });

  it("nextGaussian produces values with approximately correct stddev", () => {
    const rng = createRNG(42);
    const values: number[] = [];
    for (let i = 0; i < 10000; i++) {
      values.push(rng.nextGaussian(10));
    }
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const stddev = Math.sqrt(variance);
    // Phải xấp xỉ 10 (cho phép sai số rộng vì ngẫu nhiên)
    expect(stddev).toBeGreaterThan(9);
    expect(stddev).toBeLessThan(11);
    expect(Math.abs(mean)).toBeLessThan(0.5); // giá trị trung bình phải xấp xỉ 0
  });
});
