/**
 * Bộ sinh số giả ngẫu nhiên có seed (mulberry32).
 * Có tính xác định: cùng seed luôn sinh cùng một chuỗi.
 */

export interface RNG {
  /** Số thực tiếp theo trong [0, 1) */
  next(): number;
  /** Số nguyên tiếp theo trong [min, max], bao gồm cả hai đầu */
  nextInt(min: number, max: number): number;
  /** Số ngẫu nhiên phân phối Gaussian với độ lệch chuẩn cho trước, giá trị trung bình=0 */
  nextGaussian(stddev: number): number;
  /** Sao chép trạng thái RNG này (dùng khi rẽ nhánh) */
  clone(): RNG;
}

export function createRNG(seed: number = 42): RNG {
  let state = seed | 0;

  function mulberry32(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next(): number {
      return mulberry32();
    },

    nextInt(min: number, max: number): number {
      return Math.floor(this.next() * (max - min + 1)) + min;
    },

    nextGaussian(stddev: number): number {
      // Biến đổi Box-Muller
      const u1 = this.next();
      const u2 = this.next();
      // Tránh log(0)
      const r = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10)));
      const theta = 2 * Math.PI * u2;
      return r * Math.cos(theta) * stddev;
    },

    clone(): RNG {
      return createRNG(state);
    },
  };
}
