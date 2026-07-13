# WhalesBot block registry

This is the C-009 canonical registry audit table. The executable metadata lives in
`apps/client/src/blockly/blockRegistry.ts`; this document mirrors the block ids,
categories, runtime status, and field surface for review.

Runtime status values:

- `implemented`: runtime shape can be represented by the current simulator or v1 opcode path.
- `telemetry-only`: safe side effect/log metadata, with no robot physics effect yet.
- `stub`: compatibility entry that must emit a diagnostic/comment until implemented.
- `blocked-by-sandbox`: cannot execute until a sandbox contract exists.

Compatibility decisions from `docs/whalesbot-block-studio-dac-ta-block.md` section 15:

- `patrol_start_button`, `light_reading_1`, and `sensor_remote_control_button` are intentional stubs.
- Trig and inverse trig use explicit `angleUnit: degree | radian`.
- `c_code_function` targets real sandboxed C execution and is `blocked-by-sandbox` until the sandbox ships.

## C-015 toolbox and runtime QA status

The Blockly toolbox now exposes every documented registry category:
`Motion`, `Light Speaker`, `Sensor`, `Event`, `Loop`, `Logic`, `Math`,
`Variable`, `AI`, `Patrol line`, `My Blocks`, and `C Code`. Legacy
`initialize` and `calibrate_grayscale` blocks remain loadable for existing
projects and samples, but are not exposed as a toolbox category.

| Category | Toolbox status | Runtime status and limitation |
| --- | --- | --- |
| Motion | Present, including tank, single motor, omni, and steering gear blocks from WhalesBot Block Studio | Differential-drive motor blocks run; encoder and omni blocks emit diagnostics where the simulator has no matching hardware. Steering gear is telemetry-only. |
| Light Speaker | Present | Sound, LED, display, and electromagnet blocks emit telemetry events. `reading 1` is an intentional stub diagnostic. Color fields use hex text in the current Blockly package because the colour field plugin is not registered. |
| Sensor | Present | Integrated grayscale, timer, and motor encoder paths are implemented where simulator data exists. Other hardware sensors are preserved as value/boolean expressions or stub diagnostics. |
| Event | Present | `When program execute` is treated as the main entry marker. Touch-switch async events are preserved and emit a stub diagnostic. |
| Loop | Present | Repeat, wait, break, return, repeat-until, and wait-until lower to IR v2. While-loop compatibility remains a diagnostic stub. |
| Logic | Present | If/else and boolean expression blocks lower to IR v2. Unsupported expression-as-statement usage emits a value-block diagnostic. |
| Math | Present | Arithmetic, modulo, random, round, and unary/trig expressions lower to IR v2. Domain errors are runtime diagnostics. |
| Variable | Present | Blockly variable dialog, set/change/get, and compatibility create block are present. The create dialog block itself is a no-op diagnostic when dragged into the workspace. |
| AI | Present | Recognition blocks are compatibility sensor expressions/stubs; no camera model exists yet. |
| Patrol line | Present | Tank initialization, calibration, line following, timed patrol, intersection, turn, and sensor-stop flows lower to IR v2. Omni and encoder-specific variants emit diagnostics. |
| My Blocks | Present | One-parameter custom block definitions and calls execute through the function/call-frame model. The create-block dialog compatibility block emits a no-op diagnostic. |
| C Code | Present | Tiny numeric C-subset payloads are generated, but the client keeps `cSandbox.enabled=false`; runtime emits `HTLAB_C_SANDBOX_DISABLED` unless explicitly enabled in tests. |

Bundled samples in `apps/client/src/store/samplePrograms.ts` cover line
following, math/logic/control-flow, telemetry-only effects, variables/custom
blocks, C Code disabled behavior, and a mixed-category QA workspace.

## Registry table

| Category | Type id | Source block text | Kind | Runtime status | Field schema |
| --- | --- | --- | --- | --- | --- |
| Motion | `motion_tank_drive_continuous` | `move left motor A right motor B Forward power 40 %` | statement | implemented | `leftMotor=A`, `rightMotor=B`, `direction=Forward/Backward`, `power=40%` |
| Motion | `motion_tank_drive_seconds` | `move left motor A right motor B Forward power 40 % run for 1 secs.` | statement | implemented | `leftMotor=A`, `rightMotor=B`, `direction=Forward/Backward`, `power=40%`, `seconds=1` |
| Motion | `motion_stop_pair` | `stop left motor A right motor B` | statement | implemented | `leftMotor=A`, `rightMotor=B` |
| Motion | `motion_single_motor_power` | `set motor A power 40 %` | statement | implemented | `motor=A`, `power=40%` |
| Motion | `motion_dual_motor_seconds` | `set motor A power 40 % motor B power 40 % run for 1 secs.` | statement | implemented | `motorA=A`, `powerA=40%`, `motorB=B`, `powerB=40%`, `seconds=1` |
| Motion | `motion_single_motor_seconds` | `set motor A power 40 % run for 1 secs.` | statement | implemented | `motor=A`, `power=40%`, `seconds=1` |
| Motion | `motion_dual_motor_degrees` | `set motor A power 40 % motor B power 40 % rotate for 360 degrees` | statement | stub | `motorA=A`, `powerA=40%`, `motorB=B`, `powerB=40%`, `degrees=360` |
| Motion | `motion_single_motor_degrees` | `set motor A power 40 % rotate for 360 degrees` | statement | stub | `motor=A`, `power=40%`, `degrees=360` |
| Motion | `motion_reverse_motor` | `reverse motor A` | statement | implemented | `motor=A` |
| Motion | `motion_stop_motor` | `stop motor all` | statement | implemented | `motor=all/A/B/C/D` |
| Motion | `motion_omni_move` | `omni-wheel move power 40 % towards 0 degree` | statement | stub | `power=40%`, `headingDegrees=0` |
| Motion | `motion_omni_turn` | `omni-wheel turn Turn left power 40 %` | statement | stub | `direction=Turn left/Turn right`, `power=40%` |
| Motion | `motion_omni_stop` | `stop omni-wheel move` | statement | stub | none |
| Motion | `motion_steering_angle_mode` | `set up steering gear angle mode ID 1 speed 40 angle 0` | statement | telemetry-only | `id=1`, `speed=40`, `angle=0` |
| Motion | `motion_steering_rotation_mode` | `set up steering gear rotation mode ID 1 speed 40` | statement | telemetry-only | `id=1`, `speed=40` |
| Motion | `motion_restore_steering_torque` | `restore steering torque` | statement | telemetry-only | none |
| Event | `event_program_execute` | `When program execute` | hat | implemented | none |
| Event | `event_touch_switch_pressed` | `when touch switch is pressed port 1` | hat | stub | `port=1..5` |
| Loop | `loop_repeat_forever` | `repeat forever` | c-block | implemented | `do` statement input |
| Loop | `loop_repeat_times` | `repeat 10 times` | c-block | implemented | `times=10`, `do` statement input |
| Loop | `loop_while_condition` | `if [condition] repeat` | c-block | stub | `condition` boolean input, `do` statement input |
| Loop | `loop_repeat_until` | `repeat until [condition]` | c-block | stub | `condition` boolean input, `do` statement input |
| Loop | `loop_break` | `break` | statement | stub | none |
| Loop | `loop_return_value` | `Return [value]` | statement | stub | `value` input |
| Loop | `loop_wait_seconds` | `wait 2 secs.` | statement | implemented | `seconds=2` |
| Loop | `loop_wait_until` | `wait until [condition]` | statement | stub | `condition` boolean input |
| Logic | `logic_if_then` | `if [condition] then` | c-block | stub | `condition`, `then` statement input |
| Logic | `logic_if_then_else` | `if [condition] then else` | c-block | stub | `condition`, `then`, `else` statement inputs |
| Logic | `logic_compare_lt` | `[a] < [b]` | boolean | stub | `a`, `b` value inputs |
| Logic | `logic_compare_gt` | `[a] > [b]` | boolean | stub | `a`, `b` value inputs |
| Logic | `logic_compare_eq` | `[a] = [b]` | boolean | stub | `a`, `b` value inputs |
| Logic | `logic_compare_neq` | `[a] not equal [b]` | boolean | stub | `a`, `b` value inputs |
| Logic | `logic_and` | `[cond1] and [cond2]` | boolean | stub | `cond1`, `cond2` boolean inputs |
| Logic | `logic_or` | `[cond1] or [cond2]` | boolean | stub | `cond1`, `cond2` boolean inputs |
| Logic | `logic_not` | `not [condition]` | boolean | stub | `condition` boolean input |
| Math | `math_add` | `[10] + [10]` | reporter-number | stub | `left=10`, `right=10` |
| Math | `math_subtract` | `[10] - [10]` | reporter-number | stub | `left=10`, `right=10` |
| Math | `math_multiply` | `[10] x [10]` | reporter-number | stub | `left=10`, `right=10` |
| Math | `math_divide` | `[10] / [10]` | reporter-number | stub | `left=10`, `right=10` |
| Math | `math_random_range` | `pick random from 0 to 10` | reporter-number | stub | `min=0`, `max=10` |
| Math | `math_modulo` | `the remainder of dividing [a] by [b]` | reporter-number | stub | `a`, `b` value inputs |
| Math | `math_round` | `round [x]` | reporter-number | stub | `value` input |
| Math | `math_unary_function` | `abs [x]` | reporter-number | stub | `op=abs/floor/ceiling/sqrt/sin/cos/tan/asin/acos/atan/ln/log/e^/10^`, `value`, `angleUnit=degree/radian` |
| Variable | `variable_create` | `Create a variable` | button-dialog | stub | `variableName=my variable` |
| My Blocks | `my_blocks_create` | `Create new blocks` | button-dialog | stub | `blockName=my block`, `parameters=number:boolean:text` |
| Patrol line | `patrol_initialize_tank` | `initialize left motor A 100 right motor B -100 integrated grayscale port 5` | statement | implemented | `leftMotor=A`, `leftDirection=100`, `rightMotor=B`, `rightDirection=-100`, `grayscalePort=5` |
| Patrol line | `patrol_initialize_omni` | `initialize omni-wheel Left front motorA 100 Right front motorB 100 Right rear motorC 100 Left rear motorD 100 integrated grayscale port 5` | statement | stub | motor ports A/B/C/D, four direction coefficients, `grayscalePort=5` |
| Patrol line | `patrol_black_white_detection` | `black and white detection` | statement | implemented | none |
| Patrol line | `patrol_line_speed` | `patrol line speed 30` | statement | implemented | `speed=30` |
| Patrol line | `patrol_line_for_time` | `patrol line patrol line speed 30 for 0.5` | statement | implemented | `speed=30`, `seconds=0.5` |
| Patrol line | `patrol_line_intersections` | `patrol line intersections left patrol line speed 30 rush through intersection time 0` | statement | stub | `branch=left/middle/right/T-Cross`, `speed=30`, `rushSeconds=0` |
| Patrol line | `patrol_turn_branch` | `turn middle left motor speed 0 right motor speed 0` | statement | stub | `branch=middle`, `leftSpeed=0`, `rightSpeed=0` |
| Patrol line | `patrol_start_motor_time` | `start motor left motor speed 20 right motor speed 20 time 0.5` | statement | implemented | `leftSpeed=20`, `rightSpeed=20`, `seconds=0.5` |
| Patrol line | `patrol_start_motor_angle` | `start motor left motor speed 20 right motor speed 20 angle 360` | statement | stub | `leftSpeed=20`, `rightSpeed=20`, `degrees=360` |
| Patrol line | `patrol_start_motor_until_sensor` | `start motor left motor speed 20 right motor speed 20 Sensor 1 < 50` | statement | stub | `leftSpeed=20`, `rightSpeed=20`, `sensor=1`, `compare=<`, `threshold=50` |
| Patrol line | `patrol_start_button` | `start button` | statement | stub | none |
| Light Speaker | `light_play_sound` | `play sound Greet Hello` | statement | telemetry-only | `group=Greet`, `sound=Hello` |
| Light Speaker | `light_electromagnet` | `electromagnet port 1 absorption` | statement | telemetry-only | `port=1`, `mode=absorption/release` |
| Light Speaker | `light_emotion_expression` | `emotion screen expression [eyes] left eye port 1 right eye port 2` | statement | telemetry-only | `expression=eyes`, `leftEyePort=1`, `rightEyePort=2` |
| Light Speaker | `light_clear_emotion_expressions` | `clear emotion screen expressions left eye port 1 right eye port 2` | statement | telemetry-only | `leftEyePort=1`, `rightEyePort=2` |
| Light Speaker | `light_emotion_symbols` | `emotion screen symbols [?] port 1` | statement | telemetry-only | `symbol=?`, `port=1` |
| Light Speaker | `light_emotion_customization` | `emotion screen customization [matrix] port 1` | statement | telemetry-only | `matrix`, `port=1` |
| Light Speaker | `light_clear_emotion_screen` | `clear emotion screen port 1` | statement | telemetry-only | `port=1` |
| Light Speaker | `light_reading_1` | `reading 1` | statement | stub | `value=1` |
| Light Speaker | `light_led_rgb` | `set LED lights port 1 color R 255 G 255 B 255` | statement | telemetry-only | `port=1`, `r=255`, `g=255`, `b=255` |
| Light Speaker | `light_led_swatch` | `set LED lights port 1 color [swatch]` | statement | telemetry-only | `port=1`, `color=#ffffff` |
| Light Speaker | `light_led_off` | `turn off LED port 1` | statement | telemetry-only | `port=1` |
| Light Speaker | `light_digital_tube_display` | `digital tube port 1 [value]` | statement | telemetry-only | `port=1`, `value` input |
| Light Speaker | `light_clear_digital_tube` | `clear digital tube port 1` | statement | telemetry-only | `port=1` |
| Light Speaker | `light_screen_display` | `screen display [value]` | statement | telemetry-only | `value` input |
| Light Speaker | `light_clear_screen` | `clear screen` | statement | telemetry-only | none |
| Sensor | `sensor_touch_switch_pressed` | `touch switch 1 pressed` | boolean | stub | `port=1` |
| Sensor | `sensor_infrared_obstacle` | `infrared port 1 obstacles detected` | boolean | stub | `port=1` |
| Sensor | `sensor_infrared_range_value` | `infrared ranging sensor port 1 value` | reporter-number | stub | `port=1` |
| Sensor | `sensor_integrated_grayscale_detect_black` | `integrated grayscale port 5 channel 1 detected black` | boolean | implemented | `port=5`, `channel=1` |
| Sensor | `sensor_integrated_grayscale_value` | `integrated grayscale port 5 channel 1` | reporter-number | implemented | `port=5`, `channel=1` |
| Sensor | `sensor_single_grayscale_detect_black` | `single grayscale port 1 detected black` | boolean | stub | `port=1` |
| Sensor | `sensor_single_grayscale_value` | `single grayscale port 1 detected value` | reporter-number | stub | `port=1` |
| Sensor | `sensor_ultrasonic_distance` | `ultrasonic sensor port 1 detect distance cm` | reporter-number | stub | `port=1` |
| Sensor | `sensor_ambient_light_value` | `ambient light port 1 value` | reporter-number | stub | `port=1` |
| Sensor | `sensor_temperature_celsius` | `temperature sensor port 1 degC` | reporter-number | stub | `port=1` |
| Sensor | `sensor_humidity_percent` | `humidity sensor port 1 value %` | reporter-number | stub | `port=1` |
| Sensor | `sensor_flame_value` | `flame sensor port 1 value` | reporter-number | stub | `port=1` |
| Sensor | `sensor_magnetic_detected` | `magnetic port 1 magnetic field detected` | boolean | stub | `port=1` |
| Sensor | `sensor_volume_detection` | `volume detection port 1` | reporter-number | stub | `port=1` |
| Sensor | `sensor_motor_encoder_value` | `motor encoder port A` | reporter-number | stub | `motor=A` |
| Sensor | `sensor_reset_motor_encoder` | `reset motor encoder port A` | statement | stub | `motor=A` |
| Sensor | `sensor_current_timer_value` | `current timer value` | reporter-number | stub | none |
| Sensor | `sensor_reset_timer` | `reset timer` | statement | stub | none |
| Sensor | `sensor_remote_control_button` | `remote control button` | boolean | stub | `button=A/up/down/left/right` |
| Sensor | `sensor_color_value` | `Color sensor port 1` | reporter | stub | `port=1` |
| Sensor | `sensor_color_detected` | `Color sensor port 1 detected red` | boolean | stub | `port=1`, `color=red` |
| AI | `ai_image_recognition` | `image recognition port 1` | reporter | stub | `port=1` |
| AI | `ai_recognition_is` | `recognition [input] is Number 0` | boolean | stub | `input`, `classType=Number`, `classValue=0` |
| C Code | `c_code_function` | `void _fn(int _number1) { ... }` | custom-code | blocked-by-sandbox | `functionName=_fn`, `parameterName=_number1`, `body` textarea |

Total registry entries: 95.
