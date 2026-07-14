import { entry, field } from "../helpers.js";

export const cCodeEntries = [
  entry({
    type: "c_code_function",
    category: "C Code",
    displayText: "void _fn(int _number1) { ... }",
    kind: "custom-code",
    fields: [
      field("functionName", "text", "_fn", { required: true }),
      field("parameterName", "text", "_number1"),
      field("arg", "value-input", 0),
      field("body", "textarea", "return _number1 + 1;", { required: true }),
    ],
    runtimeStatus: "blocked-by-sandbox",
    generatorHandlerId: "cCode.functionDefinition",
    runtimeHandlerId: "runtime.cSandbox.call",
    irV2Op: "cCode.call",
    notes: "Security-class: uses the C sandbox adapter and remains disabled unless the runtime feature flag is enabled.",
  }),
];
