/**
 * Bộ nạp sa bàn cho mô phỏng HTLAB.
 * Nạp ảnh PNG và file metadata JSON.
 *
 * Trên browser: dùng Image + Canvas để trích xuất ImageData.
 * Trên Node.js: có thể nhận trực tiếp Uint8ClampedArray (bên gọi tự giải mã PNG).
 *
 * Đồng thời export createTestMap() để test mà không cần file ảnh thật.
 */

import type { MapData, MapMetadata } from "./types.js";

export interface MapFiles {
  imageData: ImageData | Uint8ClampedArray;
  width: number;
  height: number;
  metadata: MapMetadata;
}

/**
 * Nạp sa bàn từ dữ liệu pixel thô và metadata.
 * Đây là constructor chuẩn; bên gọi xử lý việc giải mã PNG bên ngoài.
 */
export function loadMap(files: MapFiles): MapData {
  // Kiểm tra kích thước
  const expectedWidth = Math.round(files.metadata.width * files.metadata.scale);
  const expectedHeight = Math.round(
    files.metadata.height * files.metadata.scale,
  );

  if (files.width !== expectedWidth || files.height !== expectedHeight) {
    throw new Error(
      `Map image dimensions (${files.width}x${files.height}) do not match ` +
        `metadata (${expectedWidth}x${expectedHeight}). ` +
        `Metadata: ${files.metadata.width}x${files.metadata.height}mm @ ${files.metadata.scale}px/mm`,
    );
  }

  return {
    imageData: files.imageData,
    width: files.width,
    height: files.height,
    metadata: files.metadata,
  };
}

/**
 * Tạo sa bàn test bằng code (không cần file ảnh bên ngoài).
 * Sinh một sa bàn trắng đơn giản có vạch đen để kiểm thử cảm biến.
 *
 * @param width - chiều rộng sa bàn theo mm
 * @param height - chiều cao sa bàn theo mm
 * @param scale - số pixel trên mỗi mm (mặc định 1)
 */
export function createTestMap(
  width: number = 2400,
  height: number = 1200,
  scale: number = 1,
): MapData {
  const pxW = Math.round(width * scale);
  const pxH = Math.round(height * scale);
  const pixels = new Uint8ClampedArray(pxW * pxH * 4);

  // Nền trắng
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 255; // R
    pixels[i + 1] = 255; // G
    pixels[i + 2] = 255; // B
    pixels[i + 3] = 255; // A
  }

  // Vẽ một vạch đen đơn giản (đường ngang ở giữa, dày 30px)
  const lineCenterY = Math.round(pxH / 2);
  const lineThickness = 30; // px
  const blackLineValue = 0;

  for (let y = lineCenterY - lineThickness / 2; y < lineCenterY + lineThickness / 2; y++) {
    if (y < 0 || y >= pxH) continue;
    for (let x = 0; x < pxW; x++) {
      const idx = (y * pxW + x) * 4;
      pixels[idx] = blackLineValue;
      pixels[idx + 1] = blackLineValue;
      pixels[idx + 2] = blackLineValue;
      // Alpha giữ nguyên 255
    }
  }

  const metadata: MapMetadata = {
    width,
    height,
    scale,
    startPose: { x: 200, y: height / 2, heading: 0 },
    checkpoints: [
      { x: 800, y: height / 2, radius: 50 },
      { x: 1600, y: height / 2, radius: 50 },
    ],
    finishZone: { x: width - 300, y: height / 2 - 100, width: 200, height: 200 },
  };

  return {
    imageData: pixels,
    width: pxW,
    height: pxH,
    metadata,
  };
}

/**
 * Đọc giá trị pixel grayscale trên sa bàn tại tọa độ thế giới (mm).
 * Dùng lấy mẫu lân cận gần nhất. Trả về 0 (trắng) đến 255 (đen).
 * Giá trị được đảo từ RGB để 0=nền trắng, 255=vạch đen.
 */
export function sampleMapPixel(
  map: MapData,
  xMm: number,
  yMm: number,
): number {
  const px = Math.round(xMm * map.metadata.scale);
  const py = Math.round(yMm * map.metadata.scale);

  // Chặn tọa độ trong biên sa bàn
  if (px < 0 || px >= map.width || py < 0 || py >= map.height) {
    return 0; // Ngoài sa bàn = trắng
  }

  const idx = (py * map.width + px) * 4;
  const raw = map.imageData;
  // ImageData (DOM) có thuộc tính .data; Uint8ClampedArray đã là dữ liệu pixel
  const data: Uint8ClampedArray =
    raw instanceof Uint8ClampedArray ? raw : (raw as any).data ?? raw;
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];

  // Lấy trung bình thang xám rồi đảo để 0 = trắng, 255 = đen
  const avg = (r + g + b) / 3;
  return 255 - avg;
}
