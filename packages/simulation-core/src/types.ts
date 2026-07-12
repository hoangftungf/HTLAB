/**
 * Các kiểu dữ liệu lõi cho HTLAB SimulationCore.
 * Không có phụ thuộc runtime, chỉ chứa type.
 */

// ---- Tư thế và trạng thái robot ----

export interface Pose {
  x: number; // mm, tâm trục bánh xe
  y: number; // mm
  heading: number; // radian, 0 = +x (sang phải), tăng theo chiều kim đồng hồ trong tọa độ màn hình
}

export interface RobotState {
  x: number;
  y: number;
  heading: number;
  leftSpeed: number; // mm/s, vận tốc thực của bánh trái
  rightSpeed: number; // mm/s, vận tốc thực của bánh phải
}

// ---- Cấu hình robot ----

export interface RobotConfig {
  wheelbase: number; // mm, khoảng cách giữa bánh trái và bánh phải
  wheelRadius: number; // mm
  maxSpeed: number; // mm/s
  maxAccel: number; // mm/s^2, tốc độ thay đổi vận tốc bánh
  friction: number; // hệ số 0-1, phần vận tốc mất mỗi tick khi motor=0
  deadzone: number; // biên độ tín hiệu motor tối thiểu (|signal| < deadzone → 0)
  sensorSpacing: number; // mm, khoảng cách giữa hai mắt cảm biến grayscale liền kề
  sensorOffset: number; // mm, khoảng cách từ tâm trục bánh đến hàng cảm biến phía trước
  sensorNoise: number; // thang 0-100, độ lệch chuẩn Gaussian trên giá trị road
  sensorBias: number; // -100..100, độ lệch cố định cộng vào từng road
  latency: number; // số tick trễ cảm biến (0 = không trễ)
}

export const DEFAULT_ROBOT_CONFIG: RobotConfig = {
  wheelbase: 150,
  wheelRadius: 32,
  maxSpeed: 500,
  maxAccel: 2000,
  friction: 0.15,
  deadzone: 0.02,
  sensorSpacing: 12,
  sensorOffset: 120,
  sensorNoise: 0,
  sensorBias: 0,
  latency: 0,
};

// ---- Trạng thái cảm biến (khung cho C-002 theo hợp đồng kỹ thuật) ----

export interface SensorState {
  roads: [number, number, number, number, number]; // mỗi giá trị nằm trong khoảng 0-100
  pattern: string; // mẫu nhị phân, ví dụ "00100"
  linePosition: number; // -100..100
  calibrated: boolean;
  thresholds: { white: number; black: number };
}

export const DEFAULT_SENSOR_STATE: SensorState = {
  roads: [0, 0, 0, 0, 0],
  pattern: "00000",
  linePosition: 0,
  calibrated: false,
  thresholds: { white: 100, black: 200 },
};

// ---- Trạng thái mô phỏng ----

export interface SimState {
  tick: number;
  running: boolean;
  done: boolean;
  robot: RobotState;
  sensors: SensorState;
}

// ---- Sa bàn ----

export interface MapMetadata {
  width: number; // mm
  height: number; // mm
  scale: number; // px trên mỗi mm
  startPose: Pose;
  checkpoints?: { x: number; y: number; radius: number }[];
  finishZone?: { x: number; y: number; width: number; height: number };
}

export interface MapData {
  imageData: ImageData | Uint8ClampedArray; // pixel RGBA, width*height*4
  width: number; // px
  height: number; // px
  metadata: MapMetadata;
}

// ---- Cấu hình mô phỏng ----

export interface SimulationConfig {
  map: MapData;
  robotConfig: RobotConfig;
  seed?: number;
  /** Số khung telemetry tối đa trong bộ đệm vòng (mặc định 3600 = 60s ở 60Hz). */
  maxTelemetryFrames?: number;
}

// ---- Giao diện mô phỏng ----

export interface Simulation {
  readonly state: SimState;
  tick(): void;
  setMotors(left: number, right: number): void;
  reset(): void;
  getTelemetry(): TelemetryFrame[];
  calibrateGrayscale(): void;
}

// ---- Telemetry ----

export interface TelemetryFrame {
  tick: number;
  robot: RobotState;
  sensors: SensorState;
  motorTargets: { left: number; right: number };
}

// ---- Động học ----

export interface WheelVelocities {
  left: number; // mm/s
  right: number; // mm/s
}

// ---- Mục tiêu motor nội bộ (dùng cho telemetry) ----

export interface MotorTargets {
  left: number; // -1..1, đã chuẩn hóa
  right: number; // -1..1, đã chuẩn hóa
}
