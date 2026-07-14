export const MOTOR_PORTS = ["A", "B", "C", "D"] as const;
export const MOTOR_PORTS_WITH_ALL = ["all", "A", "B", "C", "D"] as const;
export const PORTS = ["1", "2", "3", "4", "5"] as const;
export const STEERING_IDS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;
export const DIRECTIONS = ["Forward", "Backward"] as const;
export const TURN_DIRECTIONS = ["Turn left", "Turn right"] as const;
export const PATROL_INTERSECTION_BRANCHES = ["left", "right", "T/Cross intersection"] as const;
export const PATROL_TURN_BRANCHES = ["left", "middle", "right"] as const;
export const COMPARE_OPS = ["<", ">", "=", "!=", "<=", ">="] as const;
export const GRAYSCALE_DETECTED_VALUES = ["black", "white"] as const;
export const ANGLE_UNITS = ["degree", "radian"] as const;
export const MATH_UNARY_OPS = [
  "abs",
  "floor",
  "ceiling",
  "sqrt",
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "ln",
  "log",
  "e^",
  "10^",
] as const;
export const COLORS = ["red", "green", "blue", "yellow", "white", "black"] as const;
