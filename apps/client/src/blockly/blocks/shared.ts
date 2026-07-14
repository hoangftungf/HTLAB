import * as Blockly from "blockly";

export const BLOCK_COLOURS = {
  hardware: "#5b7cff",
  movement: "#ff4f7b",
  sensor: "#8b5cf6",
  lightSpeaker: "#5aa2ff",
  event: "#12cfc0",
  loop: "#ffad33",
  logic: "#24bdf2",
  values: "#5AE05A",
  variables: "#EBCE42",
  ai: "#6574ff",
  patrolLine: "#ff7a2f",
  myBlocks: "#2f6dff",
  cCode: "#ff7a2f",
} as const;

export const numberInput = (name: string): Record<string, unknown> => ({ type: "input_value", name, check: "Number" });

export const mathUnaryFunctionOptions = [
  ["abs", "abs"],
  ["floor", "floor"],
  ["ceiling", "ceiling"],
  ["sqrt", "sqrt"],
  ["sin", "sin"],
  ["cos", "cos"],
  ["tan", "tan"],
  ["asin", "asin"],
  ["acos", "acos"],
  ["atan", "atan"],
  ["ln", "ln"],
  ["log", "log"],
  ["e^", "e^"],
  ["10^", "10^"],
];

class FieldVariableSelect extends Blockly.FieldVariable {
  constructor(
    varName: string | null | typeof Blockly.Field.SKIP_SETUP,
    validator?: Blockly.FieldVariableValidator,
    variableTypes?: string[],
    defaultType?: string,
    config?: Blockly.FieldVariableConfig,
  ) {
    super(varName, validator, variableTypes, defaultType, config);
    this.menuGenerator_ = FieldVariableSelect.dropdownCreate as unknown as Blockly.MenuGeneratorFunction;
  }

  static override dropdownCreate(this: Blockly.FieldVariable): Blockly.MenuOption[] {
    return Blockly.FieldVariable.dropdownCreate.call(this).filter((option) => {
      const id = option[1];
      return id !== "RENAME_VARIABLE_ID" && id !== "DELETE_VARIABLE_ID";
    });
  }
}

Blockly.fieldRegistry.register("field_variable_select", FieldVariableSelect);

// Shared option constants used by sensor/motion/patrol blocks
export const MOTOR_PORT_OPTIONS = [["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"]];
export const MOTOR_PORT_WITH_ALL_OPTIONS = [["all", "all"], ...MOTOR_PORT_OPTIONS];
export const SENSOR_PORT_OPTIONS = [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]];
export const STEERING_ID_OPTIONS = [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"], ["7", "7"], ["8", "8"]];
export const DIRECTION_OPTIONS = [["Forward", "Forward"], ["Backward", "Backward"]];
export const TURN_DIRECTION_OPTIONS = [["Turn left", "Turn left"], ["Turn right", "Turn right"]];
export const PATROL_INTERSECTION_OPTIONS = [["left", "left"], ["right", "right"], ["T/Cross intersection", "T/Cross intersection"]];
export const PATROL_TURN_OPTIONS = [["left", "left"], ["middle", "middle"], ["right", "right"]];
export const COMPARE_OPTIONS = [["<", "<"], [">", ">"], ["=", "="], ["!=", "!="], ["<=", "<="], [">=", ">="]];
export const SENSOR_CHANNEL_OPTIONS = [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]];
export const GRAYSCALE_DETECTED_OPTIONS = [["black", "black"], ["white", "white"]];
export const SENSOR_COLOR_OPTIONS = [["red", "red"], ["green", "green"], ["blue", "blue"], ["yellow", "yellow"], ["white", "white"], ["black", "black"]];

type VariableMenuHandlers = {
  openRename: (workspace: Blockly.WorkspaceSvg, variable: Blockly.VariableModel) => void;
  openDelete: (workspace: Blockly.WorkspaceSvg, variable: Blockly.VariableModel) => void;
};

let variableMenuHandlers: VariableMenuHandlers | null = null;

export function setVariableMenuHandlers(handlers: VariableMenuHandlers | null): void {
  variableMenuHandlers = handlers;
}

export function getVariableMenuOptions(block: Blockly.Block): Array<{ enabled: boolean; text: string; callback: () => void }> {
  const field = block.getField("VAR") as Blockly.FieldVariable | null;
  const variable = field?.getVariable();
  if (!variable || !variableMenuHandlers) return [];

  return [
    {
      enabled: true,
      text: Blockly.Msg.RENAME_VARIABLE,
      callback: () => {
        variableMenuHandlers?.openRename(block.workspace as Blockly.WorkspaceSvg, variable);
      },
    },
    {
      enabled: true,
      text: Blockly.Msg.DELETE_VARIABLE.replace("%1", variable.name),
      callback: () => {
        variableMenuHandlers?.openDelete(block.workspace as Blockly.WorkspaceSvg, variable);
      },
    },
  ];
}
