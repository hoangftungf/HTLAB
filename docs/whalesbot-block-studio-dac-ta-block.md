# Đặc tả nhóm lệnh và khối lệnh WhalesBot Block Studio cho dò line

Tài liệu này tổng hợp từ các ảnh giao diện trong `docs/images` và PDF nguồn `docs/source_docs/Tổng hợp kiến thức EnjoyAI - Dò line.pdf`.

Mục tiêu là mô tả rõ từng nhóm lệnh, từng khối lệnh nhìn thấy trong nguồn, đặc biệt là nhóm `Patrol line` dùng cho bài toán dò line EnjoyAI/WhalesBot.

## 1. Phạm vi nguồn

Ảnh đã rà soát:

| File | Nội dung chính |
| --- | --- |
| `workspace.png` | Bố cục WhalesBot scratch, thanh công cụ, danh sách nhóm lệnh |
| `Motion_block_1.png` | Nhóm `Motion`, phần trên |
| `Motion_block_2.png` | Nhóm `Motion`, phần dưới |
| `Event_block.png` | Nhóm `Event` |
| `Loop_block.png` | Nhóm `Loop` |
| `Logic_block.png` | Nhóm `Logic` |
| `Math_block.png` | Nhóm `Math` |
| `abs_block.png` | Dropdown hàm của block `abs` trong nhóm `Math` |
| `Variable_block.png` | Nhóm `Variable` |
| `my_blocks_block.png` | Nhóm `My Blocks` |
| `patrol_line_block.png` | Nhóm `Patrol line` |
| `light_speaker_1.png`, `light_speaker_2.png` | Nhóm `Light Speaker` |
| `sensor_1.png`, `sensor_2.png` | Nhóm `Sensor` |
| `AI_block.png` | Nhóm `AI` |
| `C_code_block.png` | Nhóm `C Code` |

PDF đã rà soát gồm 11 trang, tập trung vào bản chất dò line, cảm biến Grayscale 5-in-1, initialize, hiệu chuẩn, patrol line, giao lộ, timing, turn và điều khiển motor thuần.

Lưu ý phạm vi:

- Trọng tâm của tài liệu vẫn là các block phục vụ dò line. Các nhóm `Light Speaker`, `Sensor`, `AI`, `C Code` được đặc tả theo ảnh bổ sung, nhưng chỉ dùng làm tham chiếu phụ khi không liên quan trực tiếp tới thuật toán dò line.
- Một vài block dài trong ảnh có phần tham số nhỏ khó đọc. Các field chưa chắc chắn được ghi rõ là cần xác minh.
- Tên block được giữ nguyên theo UI tiếng Anh của WhalesBot để tránh lệch với giao diện thật.

## 2. Tổng quan giao diện Workspace

Giao diện WhalesBot scratch gồm 3 vùng chính:

| Vùng | Mô tả |
| --- | --- |
| Thanh công cụ trên cùng | Mở file, lưu file, undo, redo, kết nối/tải chương trình, chọn `Program name` |
| Thanh nhóm lệnh bên trái | Danh sách category block theo màu: `Motion`, `Light Speaker`, `Sensor`, `Event`, `Loop`, `Logic`, `Math`, `Variable`, `AI`, `Patrol line`, `My Blocks`, `C Code` |
| Vùng lập trình | Nền lưới, nơi kéo thả block. Mặc định có block sự kiện `main` |

Các thao tác workspace cần hỗ trợ:

- Chọn nhóm lệnh ở sidebar để mở danh sách block tương ứng.
- Kéo block từ toolbox sang vùng lập trình.
- Kết nối block theo dạng xếp dọc, block điều kiện/lặp có khoang chứa block con.
- Phóng to, thu nhỏ và reset zoom bằng cụm nút bên phải.
- Chọn chương trình qua dropdown `Program name`, ví dụ `P1`.

## 3. Quy ước đặc tả block

Mỗi block được mô tả theo các trường:

| Trường | Ý nghĩa |
| --- | --- |
| Tên hiển thị | Chuỗi text đúng hoặc gần đúng như UI |
| Loại block | `statement`, `hat/event`, `C-block`, `reporter`, `boolean`, `button/dialog` |
| Tham số | Field nhập số, dropdown, ô boolean, ô reporter |
| Hành vi | Robot hoặc chương trình sẽ làm gì khi block chạy |
| Lưu ý | Điều kiện dùng đúng, lỗi thường gặp, quan hệ với dò line |

## 4. Nhóm `Motion`

Nhóm `Motion` chứa các block điều khiển motor thường, omni-wheel và steering gear. Đây là nhóm điều khiển chuyển động trực tiếp, không tự dò line và không tự đọc cảm biến line.

### 4.1. `move left motor A right motor B Forward power 40 %`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | `left motor`, `right motor`, hướng `Forward`, `power` phần trăm |
| Hành vi | Cho hai motor trái/phải chạy liên tục theo hướng và công suất đã chọn |
| Kết thúc | Không tự dừng. Cần block dừng hoặc block khác ghi đè motor |

Lưu ý:

- Dùng cho robot differential drive.
- Không phù hợp để dừng tại giao lộ vì không có điều kiện cảm biến.
- Nếu motor trái/phải bị lắp ngược chiều, cần cấu hình đúng trong block initialize của `Patrol line` hoặc chọn hướng/phần trăm phù hợp.

### 4.2. `move left motor A right motor B Forward power 40 % run for 1 secs.`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Motor trái, motor phải, hướng, công suất, thời gian giây |
| Hành vi | Chạy hai motor trong khoảng thời gian chỉ định rồi kết thúc block |
| Kết thúc | Block tự hết sau thời gian, nhưng cần kiểm chứng robot có tự dừng motor hay chỉ chuyển sang block tiếp theo |

Lưu ý:

- Dùng cho đoạn di chuyển ngắn, thao tác căn chỉnh, đẩy vật.
- Phụ thuộc pin, ma sát, mặt sân, nên không chính xác bằng block dò line theo sự kiện.

### 4.3. `stop left motor A right motor B`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Motor trái, motor phải |
| Hành vi | Dừng cặp motor được chỉ định |

### 4.4. `set motor A power 40 %`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Motor đơn, công suất phần trăm |
| Hành vi | Đặt công suất chạy cho một motor |
| Kết thúc | Không tự dừng nếu không có block dừng hoặc block ghi đè |

### 4.5. `set motor A power 40 % motor B power 40 % run for 1 secs.`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Motor A, power A, motor B, power B, thời gian giây |
| Hành vi | Chạy hai motor với hai mức công suất độc lập trong thời gian chỉ định |

Lưu ý:

- Có thể dùng để quay tại chỗ bằng cách cho một motor âm, một motor dương nếu UI cho nhập giá trị âm.
- Không thay thế block `turn` của nhóm `Patrol line` vì không tự bắt line sau giao lộ.

### 4.6. `set motor A power 40 % run for 1 secs.`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Motor đơn, công suất, thời gian |
| Hành vi | Chạy một motor trong thời gian chỉ định |

### 4.7. `set motor A power 40 % motor B power 40 % rotate for 360 degrees`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Motor A, power A, motor B, power B, góc quay encoder độ |
| Hành vi | Chạy hai motor cho đến khi đạt số độ quay encoder |

Lưu ý:

- Đây là điều khiển theo encoder motor, không phải góc quay thân robot tuyệt đối.
- Sai số phụ thuộc đường kính bánh, trượt bánh, tỉ số truyền và mặt sân.

### 4.8. `set motor A power 40 % rotate for 360 degrees`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Motor đơn, công suất, góc quay encoder độ |
| Hành vi | Chạy một motor đến khi encoder đạt số độ chỉ định |

### 4.9. `reverse motor A`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Motor đơn |
| Hành vi | Đảo chiều quay hiện tại của motor |

Lưu ý:

- Chỉ nên dùng khi học sinh hiểu trạng thái motor hiện tại.
- Trong đặc tả mô phỏng, block này cần đọc trạng thái tốc độ motor trước đó rồi nhân với `-1`.

### 4.10. `stop motor all`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Dropdown `all` hoặc motor cụ thể |
| Hành vi | Dừng toàn bộ motor hoặc motor được chọn |

### 4.11. `omni-wheel move power 40 % towards 0 degree`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Công suất, hướng di chuyển tính bằng độ |
| Hành vi | Điều khiển robot omni-wheel tịnh tiến theo hướng mong muốn |

Lưu ý:

- Chỉ áp dụng cho khung gầm omni-wheel đã cấu hình đúng motor.
- Hướng `0 degree` cần được định nghĩa nhất quán: thường là hướng tiến của robot hoặc trục tọa độ của sân, tùy firmware.

### 4.12. `omni-wheel turn Turn left power 40 %`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Hướng quay `Turn left`/các lựa chọn khác, công suất |
| Hành vi | Cho robot omni-wheel quay tại chỗ |

### 4.13. `stop omni-wheel move`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Hành vi | Dừng chuyển động omni-wheel |

### 4.14. `set up steering gear angle mode ID 1 speed 40 angle 0`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Servo ID, tốc độ, góc |
| Hành vi | Đưa steering gear/servo về chế độ điều khiển góc và chạy đến góc chỉ định |

### 4.15. `set up steering gear rotation mode ID 1 speed 40`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Servo ID, tốc độ |
| Hành vi | Đưa steering gear/servo sang chế độ quay liên tục |

### 4.16. `restore steering torque`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Hành vi | Khôi phục torque/giữ lực cho steering gear |

## 5. Nhóm `Event`

Nhóm `Event` chứa block bắt đầu chương trình hoặc block kích hoạt theo sự kiện phần cứng.

### 5.1. `When program execute`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `hat/event` |
| Hành vi | Điểm bắt đầu khi chương trình được chạy |
| Quan hệ với workspace | Trong ảnh workspace mặc định có block `main`, tương đương vai trò entry point |

Lưu ý:

- Mọi chuỗi lệnh chính nên nối dưới block này hoặc dưới `main`.
- Trong mô phỏng, đây là nơi tạo chương trình IR hoặc command list bắt đầu.

### 5.2. `when touch switch is pressed port 1`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `hat/event` |
| Tham số | Cổng touch switch |
| Hành vi | Chạy chuỗi block bên dưới khi công tắc chạm ở cổng đã chọn được nhấn |

Lưu ý:

- Đây là event bất đồng bộ. Nếu chương trình đang chạy một chuỗi khác, cần quy định firmware/mô phỏng có cho chạy song song hay không.
- Trong lớp học, dùng tốt cho nút bắt đầu hoặc trigger thao tác phụ.

## 6. Nhóm `Loop`

Nhóm `Loop` chứa các khối lặp, chờ và thoát luồng.

### 6.1. `repeat forever`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `C-block` |
| Hành vi | Lặp vô hạn các block bên trong |
| Kết thúc | Chỉ kết thúc khi chương trình bị dừng, gặp `break` hợp lệ hoặc có cơ chế ngoài |

Lưu ý:

- Dùng cho robot luôn kiểm tra cảm biến.
- Khi dùng với motor, cần tránh vòng lặp không có `wait` nếu môi trường mô phỏng chạy theo tick.

### 6.2. `repeat 10 times`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `C-block` |
| Tham số | Số lần lặp |
| Hành vi | Lặp block bên trong đúng N lần |

### 6.3. `if [condition] repeat`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `C-block` |
| Tham số | Điều kiện boolean |
| Hành vi | Lặp khi điều kiện đúng |

Lưu ý:

- Tên UI trong ảnh là `if ... repeat`, bản chất tương đương `while condition`.
- Điều kiện thường lấy từ nhóm `Logic` hoặc sensor reporter.

### 6.4. `repeat until [condition]`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `C-block` |
| Tham số | Điều kiện boolean |
| Hành vi | Lặp cho đến khi điều kiện đúng |

### 6.5. `break`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Hành vi | Thoát khỏi vòng lặp gần nhất |

### 6.6. `Return [value]`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Giá trị trả về |
| Hành vi | Kết thúc function/my block hiện tại và trả giá trị |

Lưu ý:

- Chỉ có nghĩa đầy đủ trong custom block/function có kiểu trả về.
- Nếu dùng trong chương trình chính, cần quy định là dừng chương trình hay bị bỏ qua.

### 6.7. `wait 2 secs.`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Thời gian giây |
| Hành vi | Tạm dừng luồng lệnh trong thời gian chỉ định |

Lưu ý:

- Motor có thể tiếp tục chạy trong thời gian chờ nếu trước đó đã được bật và firmware không tự dừng.
- Trong mô phỏng 60 Hz, `2 secs.` tương đương khoảng 120 tick.

### 6.8. `wait until [condition]`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Điều kiện boolean |
| Hành vi | Chặn luồng cho đến khi điều kiện đúng |

## 7. Nhóm `Logic`

Nhóm `Logic` chứa điều kiện, so sánh và toán tử boolean.

### 7.1. `if [condition] then`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `C-block` |
| Tham số | Điều kiện boolean |
| Hành vi | Nếu điều kiện đúng thì chạy các block trong nhánh `then` |

### 7.2. `if [condition] then else`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `C-block` |
| Tham số | Điều kiện boolean |
| Hành vi | Nếu đúng chạy nhánh `then`, nếu sai chạy nhánh `else` |

### 7.3. `[a] < [b]`, `[a] > [b]`, `[a] = [b]`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `boolean` |
| Tham số | Hai giá trị số hoặc reporter |
| Hành vi | Trả về đúng/sai theo phép so sánh |

### 7.4. `[a] not equal [b]`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `boolean` |
| Hành vi | Trả về đúng khi hai giá trị khác nhau |

### 7.5. `[cond1] and [cond2]`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `boolean` |
| Hành vi | Đúng khi cả hai điều kiện đều đúng |

### 7.6. `[cond1] or [cond2]`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `boolean` |
| Hành vi | Đúng khi ít nhất một điều kiện đúng |

### 7.7. `not [condition]`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `boolean` |
| Hành vi | Đảo giá trị đúng/sai của điều kiện |

## 8. Nhóm `Math`

Nhóm `Math` chứa block số học và xử lý số.

### 8.1. `[10] + [10]`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `reporter number` |
| Hành vi | Cộng hai số |

### 8.2. `[10] - [10]`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `reporter number` |
| Hành vi | Trừ hai số |

### 8.3. `[10] x [10]`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `reporter number` |
| Hành vi | Nhân hai số |

### 8.4. `[10] / [10]`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `reporter number` |
| Hành vi | Chia hai số |

Lưu ý:

- Cần quy định hành vi chia cho 0 trong mô phỏng: trả `0`, `Infinity`, báo lỗi hay bỏ qua block.

### 8.5. `pick random from 0 to 10`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `reporter number` |
| Tham số | Cận dưới, cận trên |
| Hành vi | Trả về số ngẫu nhiên trong khoảng |

Lưu ý:

- Nếu mô phỏng cần replay chính xác, random phải dùng seed.

### 8.6. `the remainder of dividing [a] by [b]`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `reporter number` |
| Hành vi | Trả phần dư của phép chia |

### 8.7. `round [x]`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `reporter number` |
| Hành vi | Làm tròn số |

### 8.8. `abs [x]`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `reporter number` |
| Tham số | Dropdown hàm, ô nhập giá trị |
| Hành vi | Áp dụng hàm toán học được chọn lên giá trị đầu vào |

Các lựa chọn dropdown đã xác nhận từ `abs_block.png`:

| Lựa chọn | Hành vi |
| --- | --- |
| `abs` | Giá trị tuyệt đối |
| `floor` | Làm tròn xuống |
| `ceiling` | Làm tròn lên |
| `sqrt` | Căn bậc hai |
| `sin`, `cos`, `tan` | Hàm lượng giác |
| `asin`, `acos`, `atan` | Hàm lượng giác ngược |
| `ln` | Log tự nhiên |
| `log` | Log cơ số 10 |
| `e ^` | Lũy thừa cơ số e |
| `10 ^` | Lũy thừa cơ số 10 |

Lưu ý:

- Runtime nên hỗ trợ cả hai chế độ góc cho `sin`, `cos`, `tan`, `asin`, `acos`, `atan`: `degree` và `radian`. UI cần cho phép chọn rõ đơn vị, mặc định nên là `degree` để gần với môi trường giáo dục/robotics.
- Với các hàm có miền xác định hẹp như `sqrt`, `ln`, `asin`, `acos`, runtime cần có quy tắc lỗi khi đầu vào không hợp lệ.

## 9. Nhóm `Variable`

Ảnh hiện chỉ ghi nhận nút tạo biến và dialog nhập tên biến.

### 9.1. `Create a variable`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `button/dialog` |
| Hành vi | Mở dialog `Create a variable` |
| Tham số dialog | `Variable name`, `OK`, `Cancel` |

Hành vi kỳ vọng:

- Người dùng nhập tên biến.
- Nhấn `OK` để tạo biến trong workspace hiện tại.
- Sau khi tạo, toolbox thường sinh thêm các block đọc/ghi biến, nhưng ảnh không hiển thị nên chưa đặc tả tên cụ thể.

Yêu cầu triển khai:

- Tên biến không được rỗng.
- Cần tránh trùng tên hoặc quy định rõ khi trùng.
- Biến phải có phạm vi rõ: toàn chương trình, theo function, hay theo workspace.

## 10. Nhóm `My Blocks`

Nhóm `My Blocks` dùng để tạo block/function tùy chỉnh.

### 10.1. `Create new blocks`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `button/dialog` |
| Hành vi | Mở dialog `Create a function` để thiết kế block mới |

Dialog `Create a function` gồm:

| Thành phần | Đặc tả |
| --- | --- |
| Chọn kiểu block | Các biểu tượng dạng statement/oval/boolean tương ứng kiểu block |
| Preview block | Khối mẫu tên mặc định dạng `name_PgLX` trong ảnh |
| `add a numeric parameter` | Thêm tham số số vào block |
| `add a boolean parameter` | Thêm tham số boolean vào block |
| `add text labels` | Thêm nhãn chữ tĩnh vào block |
| `Parameter Name` | Tên tham số đang chọn |
| `Default value` | Giá trị mặc định của tham số |
| `OK`/`Cancel` | Xác nhận hoặc hủy tạo block |

Yêu cầu triển khai:

- Function cần có định danh duy nhất.
- Tham số số sinh input kiểu number/reporter.
- Tham số boolean sinh input kiểu boolean.
- Text label là thành phần hiển thị, không phải dữ liệu runtime.
- Sau khi tạo function, toolbox cần có block gọi function và vùng định nghĩa function tương ứng.

## 11. Nhóm `Patrol line`

Đây là nhóm trọng tâm cho dò line. Theo PDF, dò line trong WhalesBot không chỉ là chạy theo vạch, mà là hệ thống gồm cảm biến, thuật toán và block xử lý theo ngữ cảnh.

### 11.1. Nền tảng cảm biến Grayscale 5-in-1

Robot dùng cảm biến Grayscale 5-in-1 gồm 5 mắt:

| Mắt cảm biến | Vị trí |
| --- | --- |
| `Road 1` | Trái ngoài |
| `Road 2` | Trái gần giữa |
| `Road 3` | Giữa |
| `Road 4` | Phải gần giữa |
| `Road 5` | Phải ngoài |

Nguyên lý:

- Giá trị cảm biến nằm trong khoảng 0-100.
- Màu đen, tức line, cho giá trị cao.
- Màu trắng, tức nền, cho giá trị thấp.
- Robot dựa vào vị trí vạch đen dưới 5 mắt để điều chỉnh hướng.

Nhóm nhận dạng giao lộ:

| Lựa chọn | Mẫu cảm biến cần nhận line | Ý nghĩa |
| --- | --- | --- |
| `T/Cross interaction` hoặc `T/Cross intersection` | Road 2-3-4 | Giao lộ giữa, ngã T hoặc ngã tư |
| `left` | Road 1-2-3 | Có nhánh/line phía trái |
| `right` | Road 3-4-5 | Có nhánh/line phía phải |

### 11.2. `initialize left motor A 100 right motor B -100 integrated grayscale port 5`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement`, thường đặt ngay dưới `main` |
| Tham số | Motor trái, hệ số chiều/tốc độ motor trái, motor phải, hệ số chiều/tốc độ motor phải, cổng cảm biến grayscale |
| Hành vi | Khai báo phần cứng cho dò line: motor nào là trái/phải, chiều quay chuẩn, cảm biến grayscale ở cổng nào |

Ý nghĩa cốt lõi từ PDF:

- `initialize` không làm robot chạy.
- Đây là block khai báo phần cứng.
- Tốc độ thật = hệ số trong initialize x tốc độ block / 100.

Ví dụ với ảnh:

- Left motor `A`, hệ số `100`.
- Right motor `B`, hệ số `-100`.
- Integrated grayscale port `5`.

Lưu ý:

- Hệ số âm thường dùng để đảo chiều motor bị lắp ngược so với motor còn lại.
- Nếu khai báo sai motor trái/phải, tất cả block `patrol line`, `turn`, `start motor` sẽ sai hướng.
- Block này nên xuất hiện trước `black and white detection` và trước mọi block dò line.

### 11.3. `initialize omni-wheel Left front motorA 100 Right front motorB 100 Right rear motorC 100 Left rear motorD 100 integrated grayscale port 5`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Motor trước trái A, trước phải B, sau phải C, sau trái D, hệ số từng motor, cổng cảm biến grayscale |
| Hành vi | Khai báo phần cứng cho robot omni-wheel dùng cảm biến grayscale |

Lưu ý:

- Phần cuối block là `integrated grayscale port 5`, cùng ý nghĩa khai báo cổng cảm biến như block initialize cho robot hai bánh.
- Các hệ số motor trong initialize quyết định chiều và tỉ lệ tốc độ thật của từng bánh omni-wheel.
- Nếu mô phỏng omni-wheel, cần dùng đúng thứ tự motor: left front, right front, right rear, left rear.

### 11.4. `black and white detection`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Hành vi | Hiệu chuẩn cảm biến để robot phân biệt line đen và nền trắng |

Ý nghĩa cốt lõi từ PDF:

- Đây là bước bắt buộc trước khi dò line.
- Không hiệu chuẩn thì dò line dễ sai.
- Mỗi sa bàn và điều kiện ánh sáng có thể cần hiệu chuẩn lại.

Yêu cầu mô phỏng:

- Cần lưu trạng thái đã hiệu chuẩn.
- Nếu chương trình chạy dò line khi chưa hiệu chuẩn, nên cảnh báo hoặc dùng threshold mặc định có gắn trạng thái `uncalibrated`.

### 11.5. `patrol line speed 30`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` hoặc block điều khiển liên tục |
| Tham số | `speed` |
| Hành vi | Robot chạy theo line liên tục với tốc độ đã chọn |
| Kết thúc | Không tự dừng. Cần block dừng hoặc block khác ghi đè motor |

Theo PDF, dùng khi:

- Đi thẳng theo line.
- Sau khi rẽ xong và cần tiếp tục bám line.
- Đoạn đường không cần quyết định.

Không dùng khi:

- Cần dừng chính xác tại giao lộ.
- Cần xử lý chọn nhánh.

Lưu ý:

- Đây là trạng thái mặc định của robot khi chỉ cần bám line.
- Speed cao làm robot nhanh hơn nhưng dễ vượt line nếu thuật toán điều khiển không đủ ổn định.

### 11.6. `patrol line patrol line speed 30 for 0.5`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Tốc độ dò line, thời gian |
| Hành vi | Dò line trong thời gian xác định, hết thời gian thì kết thúc/dừng |

Theo PDF:

- Bản chất là dò line theo thời gian.
- Dừng theo thời gian, không dừng theo vạch.
- Phụ thuộc pin và ma sát.

Dùng cho:

- Bài làm quen.
- Đi đoạn ngắn.
- Timing trước khi rẽ.

Không dùng cho:

- Giao lộ.
- Bài cần độ chính xác cao.

### 11.7. `patrol line intersections left patrol line speed 30 rush through intersection time 0`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Loại giao lộ/nhánh, tốc độ dò line, thời gian lao qua giao lộ |
| Hành vi | Robot dò line cho đến khi cảm biến phát hiện mẫu giao lộ tương ứng, sau đó xử lý dừng hoặc lao qua |

Dropdown lựa chọn nhìn thấy trong PDF:

| Lựa chọn | Điều kiện cảm biến |
| --- | --- |
| `left` | Road 1-2-3 nhận line |
| `right` | Road 3-4-5 nhận line |
| `T/Cross intersection` | Road 2-3-4 nhận line |

Tham số `rush through intersection time`:

| Giá trị | Hành vi |
| --- | --- |
| `0` | Dừng ngay khi nhận giao lộ |
| `> 0` | Băng qua giao lộ trong thời gian chỉ định, không dò line trong đoạn này |

Theo PDF:

- Đây là block chính xác để dùng thi đấu.
- Bản chất là dò line theo sự kiện cảm biến, không phải theo thời gian.
- Dùng để dừng tại nhánh/giao lộ cần ra quyết định.

Lưu ý triển khai:

- Trạng thái nên chia thành `FOLLOWING`, `RUSHING`, `DONE`.
- Trong `FOLLOWING`, robot bám line và liên tục kiểm tra mẫu Road.
- Khi phát hiện mẫu, nếu rush time = 0 thì dừng/kết thúc block.
- Nếu rush time > 0, robot chạy thẳng theo motor hiện tại hoặc tốc độ cấu hình trong khoảng rush time, sau đó kết thúc block.

### 11.8. `turn middle left motor speed 0 right motor speed 0`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Nhánh cần chọn: `left`= Road 2 bắt line, `middle`= Road 3 bắt line, `right`= Road 4 bắt line; tốc độ motor trái; tốc độ motor phải |
| Hành vi | Quay/điều khiển motor để robot bắt lại line theo nhóm cảm biến được chọn |

Ý nghĩa thật từ PDF:

| Lựa chọn | Ý nghĩa |
| --- | --- |
| `left` | Nhóm cảm biến left, tức Road 2, nhận line |
| `middle` | Nhóm cảm biến middle, tức Road 3, nhận line |
| `right` | Nhóm cảm biến right, tức Road 4, nhận line |

Điểm dễ hiểu sai:

- Block `turn` không chỉ là "rẽ trái/phải" cơ học.
- Đây là block chọn nhánh giao lộ bằng cảm biến.
- Motor speed chỉ quyết định cách quay.
- Motor speed không tự quyết định nhánh nào.
- Rẽ bên nào thì motor bên đó thường có giá trị âm.

Ví dụ PDF:

- Rẽ trái có thể chọn `middle` rồi đặt `left motor speed -30`, `right motor speed 30` sau khi đã dùng intersection và timing phù hợp.
- Các giá trị cụ thể cần hiệu chỉnh theo robot thật và sa bàn.

### 11.9. `start motor left motor speed 20 right motor speed 20 time 0.5`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Tốc độ motor trái, tốc độ motor phải, thời gian |
| Hành vi | Điều khiển motor thuần trong thời gian xác định |

Theo PDF, dùng khi:

- Đẩy vật.
- Xoay góc cố định.
- Di chuyển khi không cần line.

Không dùng để thay thế dò line.

### 11.10. `start motor left motor speed 20 right motor speed 20 angle 360`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Tốc độ motor trái, tốc độ motor phải, góc encoder |
| Hành vi | Điều khiển motor thuần cho đến khi đạt góc quay encoder |

Lưu ý:

- Phù hợp cho xoay hoặc di chuyển tương đối.
- Không tự nhận biết line hoặc giao lộ.

### 11.11. `start motor left motor speed 20 right motor speed 20 Sensor 1 < 50`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement` |
| Tham số | Tốc độ motor trái, tốc độ motor phải, cảm biến, phép so sánh, ngưỡng |
| Hành vi | Điều khiển motor thuần trong khi điều kiện cảm biến còn đúng |

Lưu ý:

- Semantics đã xác nhận là `while`, không phải `until`.
- Ví dụ `Sensor 1 < 50`: motor tiếp tục chạy khi cảm biến 1 còn nhỏ hơn 50; khi điều kiện sai thì block kết thúc.
- Block này là điều khiển motor theo điều kiện cảm biến, không phải thuật toán dò line chuyên dụng.

### 11.12. `start button`

| Thuộc tính | Đặc tả |
| --- | --- |
| Loại | `statement`/stub |
| Hành vi | Trong phạm vi hiện tại có thể để trống logic; generator vẫn nên sinh comment/diagnostic để người dùng biết block chưa ảnh hưởng tới mô phỏng |

Lưu ý:

- Quyết định hiện tại: không cần mô phỏng hành vi nút thật cho v1 mở rộng.
- Khi gặp block này, runtime không thay đổi trạng thái robot; telemetry/debug log nên ghi `START_BUTTON_STUB`.

## 12. Chu trình dò line chuẩn

Theo PDF, chu trình cần thuộc:

```text
Initialize
-> Black & White Detection
-> Patrol line
-> Patrol line intersections
-> Timing
-> Turn
-> Patrol line tiếp
```

Diễn giải:

1. `Initialize`: khai báo motor trái/phải, chiều motor và cổng cảm biến.
2. `Black & White Detection`: hiệu chuẩn nền trắng và line đen.
3. `Patrol line`: bám line ở đoạn thường.
4. `Patrol line intersections`: dừng hoặc băng qua khi gặp mẫu giao lộ cần tìm.
5. `Timing`: đi sâu vào giữa giao lộ để tránh rẽ sớm.
6. `Turn`: chọn nhánh bằng nhóm cảm biến left/middle/right.
7. `Patrol line tiếp`: sau khi bắt lại line, quay về bám line bình thường.

Năm câu cốt lõi:

1. `Initialize` không phải là chạy.
2. Không hiệu chuẩn thì dò line sai.
3. `Patrol line for time` không chính xác bằng dò line theo sự kiện.
4. `Intersections` là dò theo sự kiện cảm biến.
5. `Turn` là chọn nhánh, không chỉ là rẽ.

## 13. Các nhóm hỗ trợ ngoài dò line

### 13.1. `Light Speaker`

Nhóm này điều khiển âm thanh, LED, màn hình biểu cảm, LED RGB, ống hiển thị số và màn hình hiển thị. Theo ghi chú bổ sung, nhóm này không ảnh hưởng trực tiếp tới điều khiển robot dò line, nên không phải phần trọng tâm của mô phỏng dò line.

Các block đã xác nhận từ `light_speaker_1.png` và `light_speaker_2.png`:

| Block | Loại | Hành vi |
| --- | --- | --- |
| `play sound Greet Hello` | `statement` | Phát âm thanh theo nhóm âm thanh và mẫu âm thanh đã chọn |
| `electromagnet port 1 absorption` | `statement` | Điều khiển nam châm điện ở cổng chọn, ví dụ hút/nhả tùy dropdown |
| `emotion screen expression [eyes] left eye port 1 right eye port 2` | `statement` | Hiển thị biểu cảm hai mắt trên hai module emotion screen |
| `clear emotion screen expressions left eye port 1 right eye port 2` | `statement` | Xóa biểu cảm hai mắt |
| `emotion screen symbols [?] port 1` | `statement` | Hiển thị biểu tượng có sẵn trên emotion screen |
| `emotion screen customization [matrix] port 1` | `statement` | Hiển thị mẫu LED tự thiết kế trên emotion screen |
| `clear emotion screen port 1` | `statement` | Xóa màn hình emotion screen ở cổng chọn |
| `reading 1` | `statement`/stub | Không quan trọng cho mô phỏng hiện tại; giữ block trong toolbox nhưng generator/runtime chỉ ghi comment/diagnostic, không đổi trạng thái robot |
| `set LED lights port 1 color R 255 G 255 B 255` | `statement` | Đặt màu LED RGB bằng ba kênh R, G, B |
| `set LED lights port 1 color [swatch]` | `statement` | Đặt màu LED bằng ô chọn màu |
| `turn off LED port 1` | `statement` | Tắt LED ở cổng chọn |
| `digital tube port 1 [value]` | `statement` | Hiển thị giá trị trên ống LED số/digital tube |
| `clear digital tube port 1` | `statement` | Xóa nội dung digital tube |
| `screen display [value]` | `statement` | Hiển thị giá trị hoặc chuỗi trên màn hình |
| `clear screen` | `statement` | Xóa màn hình |

Lưu ý triển khai:

- Các block phát âm thanh/hiển thị nên được coi là side effect, không làm thay đổi động học robot.
- Nếu chưa mô phỏng phần cứng hiển thị, có thể ghi event vào telemetry/log thay vì render đầy đủ.
- `electromagnet` có thể cần mô phỏng riêng nếu bài thi có cơ chế gắp/hút vật.

### 13.2. `Sensor`

Nhóm `Sensor` cung cấp reporter số và điều kiện boolean để dùng trong `Logic`, `Loop`, `wait until` hoặc các block điều khiển theo cảm biến.

Các block đã xác nhận từ `sensor_1.png` và `sensor_2.png`:

| Block | Loại | Hành vi |
| --- | --- | --- |
| `touch switch 1 pressed` | `boolean` | Đúng khi công tắc chạm ở cổng chọn đang được nhấn |
| `infrared port 1 obstacles detected` | `boolean` | Đúng khi cảm biến hồng ngoại phát hiện vật cản |
| `infrared ranging sensor port 1 value` | `reporter number` | Trả giá trị đo khoảng cách/độ phản hồi của cảm biến hồng ngoại đo xa |
| `integrated grayscale port 5 channel 1 detected black` | `boolean` | Đúng khi kênh cảm biến grayscale tích hợp phát hiện màu đen |
| `integrated grayscale port 5 channel 1` | `reporter number` | Trả giá trị của kênh grayscale tích hợp |
| `single grayscale port 1 detected black` | `boolean` | Đúng khi cảm biến grayscale đơn phát hiện màu đen |
| `single grayscale port 1 detected value` | `reporter number` | Trả giá trị đọc của cảm biến grayscale đơn |
| `ultrasonic sensor port 1 detect distance cm` | `reporter number` | Trả khoảng cách đo được theo cm |
| `ambient light port 1 value` | `reporter number` | Trả giá trị ánh sáng môi trường |
| `temperature sensor port 1 °C` | `reporter number` | Trả nhiệt độ theo độ C |
| `humidity sensor port 1 value %` | `reporter number` | Trả độ ẩm theo phần trăm |
| `flame sensor port 1 value` | `reporter number` | Trả giá trị cảm biến lửa |
| `magnetic port 1 magnetic field detected` | `boolean` | Đúng khi phát hiện từ trường |
| `volume detection port 1` | `reporter number` | Trả mức âm lượng/âm thanh phát hiện được |
| `motor encoder port A` | `reporter number` | Trả giá trị encoder của motor/cổng chọn |
| `reset motor encoder port A` | `statement` | Đặt lại encoder motor về mốc ban đầu |
| `current timer value` | `reporter number` | Trả giá trị bộ đếm thời gian hiện tại |
| `reset timer` | `statement` | Đặt lại bộ đếm thời gian |
| `remote control button` | `reporter`/stub | Không quan trọng cho mô phỏng hiện tại; giữ block để workspace tương thích và ghi comment/diagnostic |
| `Color sensor port 1` | `reporter` | Trả giá trị/mã màu từ cảm biến màu |
| `Color sensor port 1 detected red` | `boolean` | Đúng khi cảm biến màu phát hiện màu đã chọn, ví dụ `red` |

Lưu ý cho dò line:

- Các block grayscale trong nhóm `Sensor` là block đọc cảm biến rời/từng kênh. Các block `Patrol line` vẫn là lớp điều khiển cao hơn, dùng thuật toán bám line và nhận dạng giao lộ.
- `integrated grayscale port 5 channel 1 detected black` có thể dùng để tự viết logic dò line thủ công, nhưng không thay thế hoàn toàn các block `patrol line intersections` khi cần dừng chính xác ở giao lộ.
- Khi mô phỏng, cần thống nhất kênh `channel 1` tương ứng `Road 1` hay chỉ là kênh nội bộ của module.
- `remote control button` được đưa vào nhóm tương thích workspace, nhưng chưa cần mô phỏng remote thật trong phạm vi hiện tại.

### 13.3. `AI`

Nhóm `AI` chứa block nhận dạng hình ảnh.

Các block đã xác nhận từ `AI_block.png`:

| Block | Loại | Hành vi |
| --- | --- | --- |
| `image recognition port 1` | `reporter` | Trả kết quả nhận dạng hình ảnh từ module/cổng AI |
| `recognition [input] is Number 0` | `boolean` | So sánh kết quả nhận dạng với loại đối tượng và giá trị được chọn |

Lưu ý:

- Dropdown trong ảnh hiển thị loại `Number` và giá trị `0`.
- Nhóm này không cần cho thuật toán dò line cơ bản.
- Nếu mô phỏng AI, cần xác định nguồn ảnh/camera, danh sách lớp nhận dạng và định dạng kết quả.

### 13.4. `C Code`

Nhóm `C Code` cho phép chèn hoặc định nghĩa đoạn mã C trực tiếp.

Block đã xác nhận từ `C_code_block.png`:

| Block | Loại | Hành vi |
| --- | --- | --- |
| `void _fn(int _number1) { ... }` | `statement`/custom code block | Cho phép nhập thân hàm C trong vùng textarea |

Lưu ý:

- Đây là block nâng cao, không phải block Blockly thuần có semantics dễ mô phỏng.
- Quyết định hiện tại: `C Code` phải hướng tới thực thi C thật, không chỉ lưu metadata.
- Việc thực thi C cần đi qua một sandbox rõ ràng, ví dụ Web Worker/WASM hoặc runtime server-side bị giới hạn, kèm timeout, memory limit, whitelist API phần cứng và cơ chế đồng bộ biến/block.
- Nếu runtime C chưa sẵn sàng ở một mốc triển khai, block vẫn phải xuất diagnostic rõ ràng thay vì âm thầm bỏ qua.

## 14. Gợi ý ánh xạ sang mô phỏng HTLAB

Nếu dùng tài liệu này để triển khai trong simulator, nên tách block thành các lớp hành vi sau:

| Lớp hành vi | Block tiêu biểu | IR/Runtime gợi ý |
| --- | --- | --- |
| Khởi tạo phần cứng | `initialize ...` | `INIT_HARDWARE` với motor mapping, hệ số chiều, sensor port |
| Hiệu chuẩn | `black and white detection` | `CALIBRATE_GRAYSCALE` |
| Dò line liên tục | `patrol line speed` | State machine bám line, không tự kết thúc |
| Dò line theo thời gian | `patrol line ... for ...` | `PATROL_LINE_FOR_TIME` |
| Dò line đến giao lộ | `patrol line intersections ...` | `PATROL_LINE_UNTIL_INTERSECTION` |
| Chọn nhánh | `turn left/middle/right ...` | `TURN_UNTIL_SENSOR_GROUP` |
| Motor thuần | `start motor ... time/angle/sensor` | `SET_MOTOR`, wait theo time/encoder/sensor |
| Control flow | `repeat`, `if`, `wait` | Label, jump, loop stack |
| Biến/function | `Variable`, `My Blocks` | Symbol table, call frame nếu có function |
| Block tương thích chưa mô phỏng | `start button`, `reading 1`, `remote control button` | Stub/no-op có diagnostic/comment rõ ràng |
| Toán nâng cao | `sin`, `cos`, `tan`, `asin`, `acos`, `atan` | Math evaluator có tùy chọn `degree`/`radian` |
| C Code | `void _fn(int _number1) { ... }` | Sandbox thực thi C thật, có timeout và API phần cứng được whitelist |

Quy tắc lỗi nên có:

- Thiếu `initialize` trước block dò line: cảnh báo cấu hình phần cứng.
- Thiếu `black and white detection`: cảnh báo chưa hiệu chuẩn.
- Dùng `patrol line for time` để nhận giao lộ: cảnh báo rủi ro sai số.
- `turn` không bắt được line sau thời gian tối đa: dừng an toàn và báo lỗi.
- Cảm biến đọc ngoài bản đồ: trả nền trắng hoặc trạng thái invalid có telemetry.

## 15. Quyết định đã chốt từ câu trả lời

Các câu hỏi chính ở bản trước đã được trả lời và được phản ánh vào nội dung ở trên. Quyết định triển khai hiện tại:

| Vấn đề | Quyết định |
| --- | --- |
| `start button` trong nhóm `Patrol line` | Có thể để trống logic trong phạm vi hiện tại. Khi triển khai, giữ block để tương thích UI nhưng runtime no-op và ghi diagnostic/comment. |
| `reading 1` trong nhóm `Light Speaker` | Không quan trọng cho mô phỏng hiện tại. Giữ block dạng stub, có comment/diagnostic rõ ràng. |
| `remote control button` trong nhóm `Sensor` | Không quan trọng cho mô phỏng hiện tại. Giữ block dạng reporter stub theo ảnh, mặc định chỉ ghi diagnostic/comment khi được dùng. |
| Lượng giác trong `Math` | Hỗ trợ cả hai chế độ `degree` và `radian`; UI/generator phải ghi rõ đơn vị đang dùng. |
| `C Code` | Mục tiêu là thực thi C thật. Không coi đây chỉ là metadata; cần sandbox và API phần cứng giới hạn trước khi bật chạy. |

## 16. Kế hoạch triển khai tích hợp toàn bộ block lệnh vào dự án

Trạng thái dự án hiện tại theo `flow resume`: planning đã qua `05-contract`, các card MVP đã hoàn tất; Blockly/IR hiện mới bao phủ tập nhỏ khoảng 13 block. Vì vậy không nên nhét toàn bộ block vào card cũ đã done, mà nên mở vòng triển khai mở rộng với contract/IR mới trước khi code.

### 16.1. Nguyên tắc triển khai

1. Contract là nguồn thật: cập nhật `flow/05-contract.md` hoặc contract mở rộng trước khi đổi Blockly/generator/runtime.
2. Mỗi block phải có đủ bốn lớp: định nghĩa Blockly, schema tham số, generator sang IR/diagnostic, runtime hoặc stub có chủ đích.
3. Block chưa mô phỏng thật vẫn phải xuất hiện có kiểm soát: comment/diagnostic rõ ràng, không âm thầm bỏ qua.
4. C Code là hạng mục rủi ro cao: chỉ bật thực thi khi sandbox, timeout, memory limit và whitelist API đã được kiểm chứng.

### 16.2. Thứ tự card đề xuất

| Card | Mục tiêu | File/miền chính | Done evidence |
| --- | --- | --- | --- |
| `C-009` | Block registry + contract IR v2 | `flow/05-contract.md`, `packages/simulation-core/src/interpreter/types.ts`, tài liệu block registry | Có bảng đủ tất cả block trong tài liệu, mỗi block có `type`, category, field schema, output kind, runtime status |
| `C-010` | Value/boolean/control-flow foundation | Blockly generator, interpreter, tests | `if/else`, `repeat forever`, `repeat until`, `wait until`, logic/math reporter sinh IR hợp lệ và có test snapshot |
| `C-011` | Motion + Patrol line đầy đủ | Blockly blocks/toolbox, generator, SimulationCore motor/line runtime | Các block motor, stop, reverse, timed/angle/sensor motor, patrol line/intersection/turn chạy được trên map test |
| `C-012` | Sensor + Light Speaker + AI compatibility | Toolbox, generator diagnostics, telemetry effects | Sensor reporter/boolean có mô phỏng nơi có dữ liệu; Light/Speaker/AI chưa có runtime thật thì ghi telemetry/comment rõ ràng |
| `C-013` | Variable + My Blocks | Symbol table, variable ops, function/call-frame model | Biến, set/get/change và custom block đơn giản chạy qua generator/interpreter với test |
| `C-014` | C Code sandbox spike | C runtime sandbox, API whitelist, timeout/error reporting | Chạy được một hàm C nhỏ có input/output giới hạn; chương trình lỗi/treo bị chặn và báo diagnostic |
| `C-015` | UI parity + QA toàn bộ toolbox | `apps/client/src/blockly/*`, UI smoke tests, docs | Toolbox có đủ category/block theo tài liệu; load/save workspace giữ được block; chương trình mẫu chạy lại sau reload |

### 16.3. Kiến trúc cần thêm

| Thành phần | Việc cần làm |
| --- | --- |
| Block registry | Tách danh sách block khỏi `blocks.ts` thủ công: mỗi block có id, text, category, color, input fields, output/statement kind, runtime status. |
| IR v2 | Mở rộng `IRCommand` để hỗ trợ value expression, boolean expression, side effects không phải motor, diagnostics và metadata. `args: number[]` hiện tại không đủ cho string, màu, enum phong phú và C code. |
| Generator | Chuyển từ `switch` lớn theo block type sang registry + handler map. Handler có thể trả `commands`, `valueExpr`, `booleanExpr`, hoặc `diagnostic`. |
| Interpreter/runtime | Tách runtime thành motor, sensor, display/audio/effect, variable/function và C sandbox adapters. |
| Diagnostics | Chuẩn hóa warning/error: unsupported block, unsafe C, missing initialize, missing calibration, invalid math domain, timeout khi turn/patrol. |
| Tests | Snapshot IR cho từng category, unit test interpreter cho control-flow/math/variable, integration test Blockly -> IR -> Interpreter, smoke test save/load workspace. |

### 16.4. Phạm vi ưu tiên

Ưu tiên 1 là các block ảnh hưởng trực tiếp đến mô phỏng robot: `Motion`, `Patrol line`, `Sensor`, `Loop`, `Logic`, `Math`, `Variable`. Ưu tiên 2 là tương thích workspace và telemetry side-effect: `Light Speaker`, `AI`, `My Blocks`. Ưu tiên 3 là `C Code`, vì yêu cầu thực thi C thật làm thay đổi threat model và cần sandbox riêng.

### 16.5. Rủi ro cần kiểm soát

- IR hiện dùng `args: number[]`, không đủ biểu diễn block có chuỗi, màu, biểu thức lồng nhau, custom function và C code.
- Một số block có semantics phần cứng thật nhưng simulator chưa có thiết bị tương ứng; phải phân biệt `implemented`, `telemetry-only`, `stub`, `blocked-by-sandbox`.
- `repeat forever`, `wait until` và patrol/intersection dễ gây loop vô hạn; interpreter cần hard cap và telemetry lỗi.
- Thực thi C thật là security-class work: không bật trong browser/main thread, không cho truy cập DOM/localStorage/network tùy ý, không chạy không timeout.

### 16.6. C-015 UI parity status

The line-following implementation now exposes these categories in the HTLAB Blockly toolbox:
`Motion`, `Sensor`, `Event`, `Loop`, `Logic`, `Math`, `Variable`,
`AI`, `Patrol line`, `My Blocks`, and `C Code`. Legacy simulator-specific
`initialize` and `calibrate_grayscale` blocks remain loadable for existing
projects and samples, but are not exposed as a toolbox category. `Light Speaker`
blocks also remain loadable for existing projects and telemetry compatibility,
but are hidden from the line-following toolbox.

Current user-facing limitations:

| Category | Status | Known limitation |
| --- | --- | --- |
| Motion | Implemented/stub mix | Differential-drive motor commands run; omni and encoder commands emit diagnostics. |
| Light Speaker | Hidden/telemetry-only | Effects remain loadable for compatibility and are recorded in runtime telemetry, but the category is hidden from the line-following toolbox. |
| Sensor | Implemented/stub mix | Grayscale/timer/encoder data is available; external sensors without a simulator model stay as stubs or value expressions. |
| Event | Compatibility | Main event is an entry marker; async touch events emit diagnostics. |
| Loop/Logic/Math | IR v2 | Core control-flow and expressions lower to IR v2; unsupported expression-as-statement cases emit diagnostics. |
| Variable/My Blocks | IR v2 | Variables and one-parameter custom blocks execute; create-dialog compatibility blocks are no-op diagnostics when dragged. |
| AI | Stub | Recognition blocks preserve shape and diagnostics; no camera model is implemented. |
| Patrol line | Implemented/stub mix | Tank line following is implemented; omni/encoder variants remain diagnostic approximations. |
| C Code | Blocked by default | Tiny numeric C subset exists, but the client disables sandbox execution unless explicitly configured. |

C-015 bundled samples cover line following, math/logic/control-flow, telemetry
effects, variable/custom block behavior, C Code disabled diagnostics, and a
mixed-category QA workspace that can be saved, reloaded, regenerated, and run.
