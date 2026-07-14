export interface SampleProgram {
  id: string;
  label: string;
  xml: string;
}

export const DEFAULT_SAMPLE_PROGRAM_ID = "line-following-route";

const lineFollowingRouteXml = `\
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="event_program_execute" x="24" y="24">
    <next>
      <block type="patrol_initialize_tank">
            <field name="leftMotor">A</field>
            <value name="leftDirection">
              <shadow type="value_number">
                <field name="NUM">100</field>
              </shadow>
            </value>
            <field name="rightMotor">B</field>
            <value name="rightDirection">
              <shadow type="value_number">
                <field name="NUM">-100</field>
              </shadow>
            </value>
            <field name="grayscalePort">5</field>
            <next>
              <block type="patrol_black_white_detection">
                <next>
                  <block type="patrol_line_for_time">
                    <value name="speed">
                      <shadow type="value_number">
                        <field name="NUM">32</field>
                      </shadow>
                    </value>
                    <value name="seconds">
                      <shadow type="value_number">
                        <field name="NUM">1.25</field>
                      </shadow>
                    </value>
                    <next>
                      <block type="patrol_turn_branch">
                        <field name="branch">middle</field>
                        <value name="leftSpeed">
                          <shadow type="value_number">
                            <field name="NUM">-20</field>
                          </shadow>
                        </value>
                        <value name="rightSpeed">
                          <shadow type="value_number">
                            <field name="NUM">20</field>
                          </shadow>
                        </value>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`;

const mathLogicControlXml = `\
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="event_program_execute" x="24" y="24">
    <next>
      <block type="set_var">
        <field name="VAR">0</field>
        <value name="VALUE">
          <shadow type="value_number">
            <field name="NUM">1</field>
          </shadow>
        </value>
        <next>
          <block type="loop_repeat_times">
            <value name="times">
              <shadow type="value_number">
                <field name="NUM">3</field>
              </shadow>
            </value>
            <statement name="do">
              <block type="logic_if_then">
                <value name="condition">
                  <block type="logic_compare_gt">
                    <value name="a">
                      <block type="math_add">
                        <value name="left">
                          <shadow type="value_number">
                            <field name="NUM">1</field>
                          </shadow>
                        </value>
                        <value name="right">
                          <shadow type="value_number">
                            <field name="NUM">2</field>
                          </shadow>
                        </value>
                      </block>
                    </value>
                    <value name="b">
                      <shadow type="value_number">
                        <field name="NUM">2</field>
                      </shadow>
                    </value>
                  </block>
                </value>
                <statement name="then">
                  <block type="wait_seconds_v2">
                    <value name="SECONDS">
                      <shadow type="value_number">
                        <field name="NUM">0.05</field>
                      </shadow>
                    </value>
                  </block>
                </statement>
              </block>
            </statement>
          </block>
        </next>
      </block>
</xml>`;

const sideEffectDiagnosticsXml = `\
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="event_program_execute" x="24" y="24">
    <next>
      <block type="light_play_sound">
        <field name="group">Greet</field>
        <field name="sound">Hello</field>
        <next>
          <block type="light_led_swatch">
            <field name="port">1</field>
            <field name="color">#ff3355</field>
            <next>
              <block type="motion_omni_stop">
                <next>
                  <block type="light_reading_1">
                    <value name="value">
                      <shadow type="value_number">
                        <field name="NUM">1</field>
                      </shadow>
                    </value>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`;

const myBlocksCCodeXml = `\
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="my_block_definition" x="420" y="24">
    <field name="NAME">double</field>
    <field name="PARAM">x</field>
    <field name="PARAM_TYPE">Number</field>
    <field name="RETURN_TYPE">Number</field>
    <statement name="BODY">
      <block type="control_return">
        <value name="VALUE">
          <block type="math_multiply">
            <value name="left">
              <block type="my_block_param_value">
                <field name="PARAM">x</field>
              </block>
            </value>
            <value name="right">
              <shadow type="value_number">
                <field name="NUM">2</field>
              </shadow>
            </value>
          </block>
        </value>
      </block>
    </statement>
  </block>
  <block type="event_program_execute" x="24" y="24">
    <next>
      <block type="motion_set_motors_v2">
        <value name="LEFT">
          <block type="my_block_call_value">
            <field name="NAME">double</field>
            <value name="ARG0">
              <shadow type="value_number">
                <field name="NUM">0.2</field>
              </shadow>
            </value>
          </block>
        </value>
        <value name="RIGHT">
          <block type="c_code_function">
            <field name="functionName">_fn</field>
            <field name="parameterName">_number1</field>
            <field name="body">return _number1 + 1;</field>
            <value name="ARG">
              <shadow type="value_number">
                <field name="NUM">1</field>
              </shadow>
            </value>
          </block>
        </value>
      </block>
    </next>
  </block>
</xml>`;

const mixedCategoryQaXml = `\
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="my_block_definition" x="520" y="24">
    <field name="NAME">boost</field>
    <field name="PARAM">x</field>
    <field name="PARAM_TYPE">Number</field>
    <field name="RETURN_TYPE">Number</field>
    <statement name="BODY">
      <block type="control_return">
        <value name="VALUE">
          <block type="math_add">
            <value name="left">
              <block type="my_block_param_value">
                <field name="PARAM">x</field>
              </block>
            </value>
            <value name="right">
              <shadow type="value_number">
                <field name="NUM">0.1</field>
              </shadow>
            </value>
          </block>
        </value>
      </block>
    </statement>
  </block>
  <block type="event_touch_switch_pressed" x="860" y="24">
    <field name="port">1</field>
  </block>
  <block type="event_program_execute" x="24" y="24">
    <next>
      <block type="patrol_initialize_tank">
            <field name="leftMotor">A</field>
            <value name="leftDirection">
              <shadow type="value_number">
                <field name="NUM">100</field>
              </shadow>
            </value>
            <field name="rightMotor">B</field>
            <value name="rightDirection">
              <shadow type="value_number">
                <field name="NUM">-100</field>
              </shadow>
            </value>
            <field name="grayscalePort">5</field>
            <next>
              <block type="patrol_black_white_detection">
                <next>
                  <block type="motion_set_motors_v2">
                    <value name="LEFT">
                      <block type="my_block_call_value">
                        <field name="NAME">boost</field>
                        <value name="ARG0">
                          <shadow type="value_number">
                            <field name="NUM">0.2</field>
                          </shadow>
                        </value>
                      </block>
                    </value>
                    <value name="RIGHT">
                      <block type="c_code_function">
                        <field name="functionName">_fn</field>
                        <field name="parameterName">_number1</field>
                        <field name="body">return _number1 + 1;</field>
                        <value name="ARG">
                          <shadow type="value_number">
                            <field name="NUM">1</field>
                          </shadow>
                        </value>
                      </block>
                    </value>
                    <next>
                      <block type="loop_repeat_times">
                        <value name="times">
                          <shadow type="value_number">
                            <field name="NUM">2</field>
                          </shadow>
                        </value>
                        <statement name="do">
                          <block type="logic_if_then">
                            <value name="condition">
                              <block type="logic_and">
                                <value name="cond1">
                                  <block type="sensor_integrated_grayscale_detect_black">
                                    <field name="port">5</field>
                                    <field name="channel">3</field>
                                  </block>
                                </value>
                                <value name="cond2">
                                  <block type="ai_recognition_is">
                                    <field name="classType">Number</field>
                                    <field name="classValue">0</field>
                                    <value name="input">
                                      <shadow type="value_number">
                                        <field name="NUM">0</field>
                                      </shadow>
                                    </value>
                                  </block>
                                </value>
                              </block>
                            </value>
                            <statement name="then">
                              <block type="light_led_swatch">
                                <field name="port">1</field>
                                <field name="color">#33ffaa</field>
                                <next>
                                  <block type="light_reading_1">
                                    <value name="value">
                                      <shadow type="value_number">
                                        <field name="NUM">1</field>
                                      </shadow>
                                    </value>
                                  </block>
                                </next>
                              </block>
                            </statement>
                          </block>
                        </statement>
                        <next>
                          <block type="patrol_line_for_time">
                            <value name="speed">
                              <shadow type="value_number">
                                <field name="NUM">30</field>
                              </shadow>
                            </value>
                            <value name="seconds">
                              <shadow type="value_number">
                                <field name="NUM">0.4</field>
                              </shadow>
                            </value>
                            <next>
                              <block type="motion_omni_stop"></block>
                            </next>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
</xml>`;

export const SAMPLE_PROGRAMS: readonly SampleProgram[] = [
  { id: "line-following-route", label: "Line route", xml: lineFollowingRouteXml },
  { id: "math-logic-control", label: "Math control", xml: mathLogicControlXml },
  { id: "effects-diagnostics", label: "Effects diagnostics", xml: sideEffectDiagnosticsXml },
  { id: "my-blocks-c-code", label: "My Blocks + C", xml: myBlocksCCodeXml },
  { id: "mixed-category-qa", label: "Mixed QA", xml: mixedCategoryQaXml },
];

export function getSampleProgram(id = DEFAULT_SAMPLE_PROGRAM_ID): string | null {
  return SAMPLE_PROGRAMS.find((sample) => sample.id === id)?.xml ?? null;
}
