import { entry, field } from "../helpers.js";

export const variableEntries = [
  entry({
    type: "variable_create",
    category: "Variable",
    displayText: "Create a variable",
    kind: "button-dialog",
    fields: [field("variableName", "text", "my variable", { required: true })],
    runtimeStatus: "stub",
    generatorHandlerId: "variable.create",
    runtimeHandlerId: "runtime.diagnostic.variablesNotImplemented",
    irV2Op: "variable.declare",
  }),
  entry({
    type: "value_variable",
    category: "Variable",
    displayText: "number",
    kind: "reporter-number",
    fields: [field("VAR", "text", "number", { required: true })],
    runtimeStatus: "implemented",
    generatorHandlerId: "variable.get",
    runtimeHandlerId: "runtime.variable.get",
    irV2Op: "variable.get",
  }),
  entry({
    type: "set_var_v2",
    category: "Variable",
    displayText: "set number to [value]",
    kind: "statement",
    fields: [
      field("VAR", "text", "number", { required: true }),
      field("VALUE", "value-input", 0),
    ],
    runtimeStatus: "implemented",
    generatorHandlerId: "variable.set",
    runtimeHandlerId: "runtime.variable.set",
    irV2Op: "variable.set",
  }),
  entry({
    type: "change_var_v2",
    category: "Variable",
    displayText: "variables number by [value]",
    kind: "statement",
    fields: [
      field("VAR", "text", "number", { required: true }),
      field("DELTA", "value-input", 1),
    ],
    runtimeStatus: "implemented",
    generatorHandlerId: "variable.change",
    runtimeHandlerId: "runtime.variable.change",
    irV2Op: "variable.change",
  }),
];
