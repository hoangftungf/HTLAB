# Mô tả cảm biến Grayscale 5-in-1 cho robot HTLAB

Tài liệu này mô tả mô hình cảm biến dò line sẽ được sử dụng trong robot của dự án HTLAB. Mục tiêu là mô phỏng đúng cách tư duy của hệ thống WhalesBot/EnjoyAI: robot không chỉ đọc vạch đen, mà sử dụng cụm cảm biến, hiệu chuẩn, nhận dạng mẫu giao lộ và các block điều khiển theo ngữ cảnh.

Tài liệu này tập trung vào mô hình phục vụ mô phỏng, không mô tả chi tiết điện tử phần cứng thật.

## 1. Vai trò của cảm biến

Cảm biến Grayscale 5-in-1 là cảm biến chính dùng cho:

- Dò line cơ bản.
- Dò line theo thời gian.
- Dò line đến giao lộ.
- Nhận dạng nhánh trái, giữa, phải tại giao lộ.
- Hỗ trợ block `turn` bắt lại line sau khi quay.
- Ghi telemetry để học sinh và giáo viên debug thuật toán.

Trong HTLAB, cảm biến này phải được mô phỏng trong `SimulationCore`, không phụ thuộc vào Phaser hoặc React. Phaser chỉ hiển thị vị trí cảm biến và giá trị đọc được.

## 2. Cấu trúc cảm biến

Cảm biến gồm 5 mắt đọc grayscale, được đặt thành một hàng ngang phía trước robot.

Thứ tự mắt cảm biến:

| Tên mắt | Vị trí tương đối |
| --- | --- |
| `Road 1` | ngoài cùng bên trái |
| `Road 2` | lệch trái |
| `Road 3` | chính giữa |
| `Road 4` | lệch phải |
| `Road 5` | ngoài cùng bên phải |

Sơ đồ nhìn từ trên xuống:

```text
                 Phía trước robot

        Road 1   Road 2   Road 3   Road 4   Road 5
          |        |        |        |        |
       trái                                  phải
```

Trong hệ tọa độ local của robot:

- Trục `+X` là hướng robot tiến về phía trước.
- Trục `+Y` là phía bên phải robot.
- `Road 1` có tọa độ `Y` âm nhất.
- `Road 5` có tọa độ `Y` dương nhất.

Ví dụ cấu hình mặc định cho mô phỏng:

```json
{
  "type": "grayscale-5-in-1",
  "sensorCount": 5,
  "forwardOffsetMm": 55,
  "lateralSpacingMm": 12,
  "sampleRadiusMm": 2.5,
  "defaultThreshold": 50
}
```

Vị trí local của từng mắt:

| Mắt | `x` | `y` |
| --- | ---: | ---: |
| `Road 1` | `forwardOffsetMm` | `-2 * lateralSpacingMm` |
| `Road 2` | `forwardOffsetMm` | `-1 * lateralSpacingMm` |
| `Road 3` | `forwardOffsetMm` | `0` |
| `Road 4` | `forwardOffsetMm` | `1 * lateralSpacingMm` |
| `Road 5` | `forwardOffsetMm` | `2 * lateralSpacingMm` |

Các tham số trên không nên hard-code trong thuật toán. Chúng phải nằm trong `RobotConfig` để sau này có thể mô phỏng nhiều loại robot hoặc nhiều cách lắp cảm biến.

## 3. Giá trị cảm biến

Mỗi mắt cảm biến trả về một giá trị trong khoảng:

```text
0 - 100
```

Ý nghĩa:

| Giá trị | Ý nghĩa |
| --- | --- |
| gần `0` | nền trắng hoặc vùng sáng |
| gần `100` | line đen hoặc vùng tối |
| khoảng giữa | mép line, vùng xám, nhiễu hoặc vùng chuyển tiếp |

Theo mô hình EnjoyAI/WhalesBot:

- Màu đen cho giá trị cao.
- Màu trắng cho giá trị thấp.
- Robot dựa vào vị trí line nằm dưới các mắt để điều chỉnh hướng.

## 4. Cách lấy mẫu từ sa bàn ảo

Sa bàn ảo cần có một lớp dữ liệu bề mặt để cảm biến đọc được. Có hai cách triển khai:

1. Đọc trực tiếp từ ảnh sa bàn.
2. Đọc từ một `line mask` hoặc `surface layer` riêng.

Khuyến nghị cho HTLAB:

- Giai đoạn MVP có thể đọc từ ảnh grayscale hoặc mask đơn giản.
- Về sau nên tách `visual map` và `sensor map`.
- `visual map` dùng để hiển thị cho người dùng.
- `sensor map` dùng để mô phỏng cảm biến, đảm bảo kết quả ổn định và dễ kiểm thử.

Quy trình lấy mẫu mỗi tick:

1. Lấy pose hiện tại của robot: `x`, `y`, `heading`.
2. Chuyển vị trí local của từng mắt sang tọa độ thế giới.
3. Lấy mẫu màu hoặc độ sáng tại vị trí đó trên `sensor map`.
4. Chuyển màu bề mặt thành giá trị grayscale thô.
5. Áp dụng hiệu chuẩn để đưa về thang `0 - 100`.
6. Áp dụng noise, bias hoặc smoothing nếu chế độ mô phỏng yêu cầu.

Công thức chuyển từ RGB sang độ sáng:

```text
luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B
```

Chuyển độ sáng sang độ đen thô:

```text
rawBlackness = (255 - luminance) / 255 * 100
```

Trong đó:

- `luminance` cao nghĩa là bề mặt sáng.
- `rawBlackness` cao nghĩa là bề mặt tối.

## 5. Hiệu chuẩn đen trắng

Block `black and white detection` là bước bắt buộc trước khi dò line.

Vai trò:

- Dạy robot phân biệt line đen và nền trắng.
- Giảm sai lệch do ánh sáng, màu nền, chất lượng ảnh sa bàn hoặc noise.
- Cho phép cùng một thuật toán hoạt động trên nhiều sa bàn khác nhau.

Trong mô phỏng, hiệu chuẩn nên lưu riêng cho từng mắt cảm biến:

```ts
type GrayscaleCalibration = {
  whiteRaw: [number, number, number, number, number];
  blackRaw: [number, number, number, number, number];
  threshold: [number, number, number, number, number];
  calibrated: boolean;
};
```

Công thức chuẩn hóa:

```text
normalized = clamp((rawBlackness - whiteRaw) / (blackRaw - whiteRaw) * 100, 0, 100)
```

Trong đó:

- `whiteRaw` là giá trị đọc được khi mắt nằm trên nền trắng.
- `blackRaw` là giá trị đọc được khi mắt nằm trên line đen.
- `normalized` là giá trị cuối cùng trả về cho chương trình robot.

Nếu chưa hiệu chuẩn:

- Simulator nên hiển thị cảnh báo.
- Các block dò line có thể không được phép chạy.
- Hoặc chạy bằng cấu hình mặc định nhưng phải đánh dấu telemetry là `uncalibrated`.

Khuyến nghị cho MVP:

- Cho phép `black and white detection` dùng cấu hình mặc định của map.
- Ví dụ: `whiteRaw = 5`, `blackRaw = 95`, `threshold = 50`.
- Sau này bổ sung chế độ hiệu chuẩn thủ công để học sinh đặt robot lên nền trắng và line đen.

## 6. Nhận dạng line theo từng mắt

Sau khi có giá trị `0 - 100`, mỗi mắt được chuyển thành trạng thái nhị phân:

```text
onLine = value >= threshold
```

Mặc định:

```text
threshold = 50
```

Ví dụ:

| Giá trị 5 mắt | Pattern | Ý nghĩa |
| --- | --- | --- |
| `[5, 8, 90, 10, 6]` | `00100` | line nằm dưới mắt giữa |
| `[5, 70, 95, 65, 8]` | `01110` | line rộng hoặc giao lộ giữa |
| `[90, 85, 75, 8, 5]` | `11100` | line hoặc nhánh nằm bên trái |
| `[5, 8, 80, 88, 92]` | `00111` | line hoặc nhánh nằm bên phải |
| `[4, 7, 8, 6, 5]` | `00000` | mất line |

Để tránh trạng thái nhấp nháy do nhiễu, có thể dùng hysteresis:

```text
onThreshold = 55
offThreshold = 45
```

Nếu mắt đang `off`, nó chỉ chuyển sang `on` khi giá trị >= `55`.
Nếu mắt đang `on`, nó chỉ chuyển sang `off` khi giá trị <= `45`.

## 7. Nhóm mắt cảm biến

Các block giao lộ và block `turn` không chỉ nhìn từng mắt riêng lẻ, mà nhìn theo nhóm mắt.

| Nhóm | Các mắt | Ý nghĩa |
| --- | --- | --- |
| `left` | `Road 1`, `Road 2`, `Road 3` | nhận line/nhánh bên trái |
| `middle` | `Road 2`, `Road 3`, `Road 4` | nhận line giữa hoặc T/Cross intersection |
| `right` | `Road 3`, `Road 4`, `Road 5` | nhận line/nhánh bên phải |

Quy tắc nhận dạng cơ bản:

```ts
leftGroup = road1.onLine && road2.onLine && road3.onLine;
middleGroup = road2.onLine && road3.onLine && road4.onLine;
rightGroup = road3.onLine && road4.onLine && road5.onLine;
```

Pattern thường gặp:

| Pattern | Nhóm nhận dạng |
| --- | --- |
| `11100` | `left` |
| `01110` | `middle` hoặc `T/Cross intersection` |
| `00111` | `right` |
| `11111` | có thể khớp nhiều nhóm, cần xét theo block đang chờ |

Khi một pattern khớp nhiều nhóm, interpreter nên ưu tiên nhóm mà block hiện tại đang yêu cầu. Ví dụ nếu block đang chờ `left`, chỉ cần nhóm `left` thỏa điều kiện là hợp lệ.

## 8. Mô hình cho block dò line cơ bản

Block `patrol line speed` là hành vi chạy liên tục theo line, không tự dừng và không xử lý giao lộ.

Để mô phỏng block này, `SimulationCore` nên có một bộ điều khiển nội bộ:

1. Đọc 5 giá trị cảm biến.
2. Tính vị trí tương đối của line.
3. Tính sai số so với tâm robot.
4. Tính correction.
5. Xuất tốc độ motor trái/phải.

Cách tính line position bằng trọng số:

```text
weights = [-2, -1, 0, 1, 2]
linePosition = sum(weights[i] * value[i]) / sum(value[i])
```

Ý nghĩa:

- `linePosition < 0`: line lệch trái.
- `linePosition = 0`: line ở giữa.
- `linePosition > 0`: line lệch phải.

Ví dụ bộ điều khiển P đơn giản:

```text
error = linePosition
correction = kp * error
leftSpeed = baseSpeed + correction
rightSpeed = baseSpeed - correction
```

Nếu line lệch phải, `correction` dương, motor trái chạy nhanh hơn motor phải để robot quay về bên phải.

Nếu mất line:

- Dùng `lastLinePosition` để quay tìm lại line.
- Nếu `lastLinePosition < 0`, robot tìm về bên trái.
- Nếu `lastLinePosition > 0`, robot tìm về bên phải.
- Nếu chưa từng thấy line, robot có thể dừng hoặc đi chậm về phía trước tùy cấu hình bài học.

Các hệ số như `kp`, `kd`, `searchSpeed`, `maxCorrection` nên nằm trong cấu hình simulator, không để học sinh phải biết ngay ở MVP.

## 9. Mô hình cho block initialize

Block `initialize` dùng để khai báo phần cứng:

- Motor trái nằm ở cổng nào.
- Motor phải nằm ở cổng nào.
- Hệ số chiều quay của motor trái.
- Hệ số chiều quay của motor phải.
- Cổng cảm biến grayscale.

Block này không làm robot chạy.

Ví dụ từ mô hình EnjoyAI:

```text
initialize left motor A 100 right motor B -100 integrated grayscale port 5
```

Ý nghĩa mô phỏng:

```text
effectiveLeftMotor = leftDirectionScale * blockLeftSpeed / 100
effectiveRightMotor = rightDirectionScale * blockRightSpeed / 100
```

Nếu `rightDirectionScale = -100`, tốc độ block dương vẫn có thể trở thành lệnh quay vật lý đúng chiều cho motor phải, tùy cách lắp motor.

Trong HTLAB, cần tách hai lớp:

- `blockSpeed`: giá trị người dùng nhập trong block.
- `physicalWheelSpeed`: tốc độ thật được đưa vào mô hình động học.

Telemetry nên hiển thị cả hai để học sinh hiểu vì sao initialize ảnh hưởng đến robot.

## 10. Mô hình cho block black and white detection

Block này cập nhật trạng thái hiệu chuẩn.

Trong MVP, có thể triển khai theo một trong hai cách:

### Cách 1: Hiệu chuẩn tự động từ map

Map cung cấp sẵn:

```json
{
  "whiteRawDefault": 5,
  "blackRawDefault": 95,
  "thresholdDefault": 50
}
```

Khi chạy block, simulator gán calibration mặc định cho 5 mắt.

Ưu điểm:

- Dễ triển khai.
- Phù hợp cho bài học đầu tiên.
- Không cần UI phức tạp.

Nhược điểm:

- Ít giống quá trình hiệu chuẩn robot thật.

### Cách 2: Hiệu chuẩn theo vị trí robot

Người dùng đặt robot lên vùng trắng và vùng đen, sau đó chạy calibration.

Ưu điểm:

- Giống thực tế hơn.
- Dạy học sinh hiểu vì sao cần hiệu chuẩn.

Nhược điểm:

- Cần UI hướng dẫn.
- Cần thêm trạng thái calibration nhiều bước.

Khuyến nghị:

- MVP dùng cách 1.
- Sau MVP bổ sung cách 2 như một chế độ nâng cao.

## 11. Mô hình cho block patrol line for time

Block này gồm hai hành vi:

1. Dò line bằng bộ điều khiển line-following.
2. Tự dừng khi hết thời gian.

Pseudo-state:

```text
state = RUNNING
elapsed = 0

while elapsed < duration:
  read sensors
  follow line
  elapsed += dt

stop motors
state = DONE
```

Đây là block không chính xác cho giao lộ vì nó dừng theo thời gian, không dừng theo pattern cảm biến.

Trong mô phỏng, block này nên bị ảnh hưởng bởi:

- Tốc độ robot.
- Ma sát.
- Gia tốc.
- Noise.
- Pin hoặc hệ số motor nếu sau này có.

## 12. Mô hình cho block patrol line intersections

Block này là block quan trọng cho thi đấu.

Tham số:

- `intersectionTarget`: `left`, `right`, hoặc `T/Cross intersection`.
- `patrolLineSpeed`: tốc độ dò line.
- `rushThroughIntersectionTime`: thời gian băng qua giao lộ sau khi phát hiện.

Hành vi:

1. Robot dò line như block `patrol line`.
2. Mỗi tick kiểm tra nhóm mắt tương ứng với `intersectionTarget`.
3. Khi nhóm mắt mục tiêu phát hiện line, block ghi nhận đã gặp giao lộ.
4. Nếu `rushThroughIntersectionTime = 0`, robot dừng ngay và block kết thúc.
5. Nếu `rushThroughIntersectionTime > 0`, robot đi thẳng thêm thời gian đó, không dò line trong giai đoạn rush.
6. Hết thời gian rush, block kết thúc.

Pseudo-state:

```text
state = FOLLOWING

if state == FOLLOWING:
  followLine(speed)
  if targetGroupDetected():
    if rushTime == 0:
      stopMotors()
      state = DONE
    else:
      rushElapsed = 0
      state = RUSHING

if state == RUSHING:
  driveForward(speed)
  rushElapsed += dt
  if rushElapsed >= rushTime:
    stopMotors()
    state = DONE
```

Lưu ý:

- Giai đoạn rush không dò line.
- Rush time thường nhỏ, ví dụ `0.1` đến `0.2` giây.
- Mục đích là đưa robot vào sâu giữa giao lộ để chuẩn bị quay, không phải để đi xa.

## 13. Mô hình cho block turn

Block `turn` dễ bị hiểu sai. Trong mô hình EnjoyAI, block này không đơn thuần là rẽ trái/phải theo góc cố định.

Ý nghĩa đúng:

- `left`, `middle`, `right` là nhóm cảm biến cần bắt lại line.
- Motor speed chỉ quyết định cách robot quay.
- Nhánh được chọn bởi nhóm cảm biến mục tiêu, không phải chỉ bởi dấu của motor.

Tham số:

- `targetGroup`: `left`, `middle`, hoặc `right`.
- `leftMotorSpeed`.
- `rightMotorSpeed`.

Hành vi:

1. Robot chạy motor theo tốc độ được nhập.
2. Mỗi tick đọc cảm biến.
3. Khi nhóm cảm biến mục tiêu phát hiện line, block dừng và kết thúc.

Pseudo-state:

```text
state = TURNING

while state == TURNING:
  setMotor(leftMotorSpeed, rightMotorSpeed)
  read sensors
  if targetGroupDetected(targetGroup):
    stopMotors()
    state = DONE
```

Ví dụ rẽ trái:

```text
turn middle left motor speed -30 right motor speed 30
```

Ý nghĩa:

- Motor trái âm, motor phải dương làm robot quay trái.
- `middle` nghĩa là kết thúc quay khi nhóm mắt giữa `Road 2-3-4` bắt lại line.

Trong HTLAB, UI nên giải thích bằng visualization thay vì chỉ bằng text:

- Highlight nhóm mắt đang được chờ.
- Hiển thị pattern hiện tại.
- Hiển thị trạng thái `TURNING` và `DONE`.

## 14. Block điều khiển motor thuần

Ngoài dò line, robot cần block motor thuần để:

- Đẩy vật.
- Xoay góc cố định.
- Di chuyển không cần line.

Các dạng block:

```text
start motor left motor speed X right motor speed Y time T
start motor left motor speed X right motor speed Y angle A
```

Các block này không thay thế cho dò line. Chúng chỉ nên dùng trong các đoạn robot không cần đọc cảm biến hoặc cần thao tác vật thể.

## 15. Dữ liệu đọc cảm biến trong SimulationCore

Kiểu dữ liệu đề xuất:

```ts
type RoadIndex = 1 | 2 | 3 | 4 | 5;

type SensorGroup = "left" | "middle" | "right";

type GrayscaleReading = {
  tick: number;
  values: [number, number, number, number, number];
  onLine: [boolean, boolean, boolean, boolean, boolean];
  pattern: string;
  groups: {
    left: boolean;
    middle: boolean;
    right: boolean;
  };
  linePosition: number | null;
  confidence: number;
  calibrated: boolean;
};
```

Ý nghĩa:

- `values`: giá trị `0 - 100` sau hiệu chuẩn.
- `onLine`: trạng thái nhị phân từng mắt.
- `pattern`: chuỗi như `00100`, `01110`, `11100`.
- `groups`: kết quả nhận dạng nhóm mắt.
- `linePosition`: vị trí line tương đối từ trái sang phải.
- `confidence`: độ tin cậy, có thể dựa trên tổng giá trị cảm biến.
- `calibrated`: cảm biến đã hiệu chuẩn hay chưa.

## 16. Telemetry cần ghi lại

Mỗi tick nên ghi các thông tin sau:

```ts
type SensorTelemetryFrame = {
  tick: number;
  timeMs: number;
  robotPose: {
    x: number;
    y: number;
    heading: number;
  };
  sensorWorldPositions: Array<{
    road: RoadIndex;
    x: number;
    y: number;
  }>;
  grayscale: GrayscaleReading;
  activeCommand: string;
  targetGroup?: SensorGroup;
  motorCommand: {
    leftBlockSpeed: number;
    rightBlockSpeed: number;
    leftPhysicalSpeed: number;
    rightPhysicalSpeed: number;
  };
};
```

Telemetry này phục vụ:

- Replay.
- Debug vì sao robot mất line.
- Hiển thị biểu đồ sensor.
- Xác thực kết quả khi chạy headless simulation.
- So sánh các lần chạy khác nhau.

## 17. Noise và sai số nên mô phỏng

Để giảm khoảng cách giữa mô phỏng và thực tế, cảm biến nên hỗ trợ các loại sai số sau:

| Sai số | Ý nghĩa | Gợi ý MVP |
| --- | --- | --- |
| `sensorNoise` | nhiễu ngẫu nhiên trên giá trị đọc | có thể tắt mặc định |
| `sensorBias` | mỗi mắt lệch một lượng cố định | thêm sau MVP |
| `latencyTicks` | cảm biến trễ vài tick | thêm sau MVP |
| `sampleRadius` | mắt đọc một vùng nhỏ thay vì một pixel | nên có từ MVP |
| `thresholdDrift` | ngưỡng thay đổi theo ánh sáng | thêm sau MVP |
| `surfaceVariation` | nền không trắng tuyệt đối | có thể có trong map |

Công thức noise đơn giản:

```text
noisyValue = clamp(normalized + randomUniform(-noiseAmount, noiseAmount), 0, 100)
```

Với chế độ huấn luyện cơ bản:

```json
{
  "sensorNoise": 0,
  "sensorBias": [0, 0, 0, 0, 0],
  "latencyTicks": 0
}
```

Với chế độ gần thực tế:

```json
{
  "sensorNoise": 3,
  "sensorBias": [-1, 2, 0, -2, 1],
  "latencyTicks": 1
}
```

## 18. Các case kiểm thử bắt buộc

SimulationCore cần có test cho các case sau:

| Case | Giá trị cảm biến | Kết quả mong muốn |
| --- | --- | --- |
| nền trắng | `[5, 5, 5, 5, 5]` | pattern `00000`, không có nhóm nào |
| line giữa | `[5, 10, 90, 10, 5]` | pattern `00100`, linePosition gần `0` |
| line hơi trái | `[10, 85, 70, 10, 5]` | linePosition âm |
| line hơi phải | `[5, 10, 70, 85, 10]` | linePosition dương |
| giao lộ trái | `[90, 90, 90, 10, 5]` | group `left = true` |
| giao lộ giữa | `[5, 90, 90, 90, 5]` | group `middle = true` |
| giao lộ phải | `[5, 10, 90, 90, 90]` | group `right = true` |
| giao lộ rộng | `[90, 90, 90, 90, 90]` | nhiều nhóm true, ưu tiên target block |
| mất line | `[5, 5, 5, 5, 5]` sau khi từng thấy line | dùng `lastLinePosition` để tìm lại |

Các test này nên chạy không cần Phaser và không cần DOM.

## 19. Quy tắc thiết kế cho Blockly blocks

Các block liên quan đến cảm biến nên được thiết kế theo hướng stateful command:

```ts
type RobotCommand =
  | InitializeHardwareCommand
  | CalibrateGrayscaleCommand
  | PatrolLineCommand
  | PatrolLineForTimeCommand
  | PatrolLineUntilIntersectionCommand
  | TurnUntilSensorGroupCommand
  | StartMotorForTimeCommand
  | StartMotorForAngleCommand;
```

Lý do:

- Nhiều block không hoàn thành trong một tick.
- `patrol line intersections` phải chạy cho đến khi gặp pattern.
- `turn` phải quay cho đến khi nhóm mắt mục tiêu bắt lại line.
- Cách này dễ chạy headless trên backend.
- Cách này dễ replay và kiểm thử hơn so với JavaScript tự do.

## 20. Kết luận

Cảm biến Grayscale 5-in-1 trong HTLAB nên được xem là một mô hình hành vi đầy đủ, không chỉ là 5 con số đọc từ ảnh.

Những điểm quan trọng nhất:

- 5 mắt cảm biến có thứ tự rõ ràng từ `Road 1` đến `Road 5`.
- Giá trị đọc nằm trong khoảng `0 - 100`, đen cao, trắng thấp.
- Hiệu chuẩn đen trắng là bắt buộc trước khi dò line.
- Dò line cơ bản là hành vi liên tục.
- Dò line theo thời gian không phù hợp cho giao lộ chính xác.
- Giao lộ được nhận dạng bằng nhóm mắt `1-2-3`, `2-3-4`, `3-4-5`.
- `rush through intersection time` là giai đoạn đi thẳng không dò line.
- `turn` là block chọn nhánh dựa trên nhóm cảm biến bắt lại line, không chỉ là rẽ theo góc.
- Mọi logic cảm biến phải nằm trong `SimulationCore` để chạy được cả trên client và server.

Nếu mô hình cảm biến này được làm đúng từ đầu, HTLAB sẽ có nền tảng tốt để xây dựng Blockly, telemetry, replay và leaderboard xác thực phía server.
