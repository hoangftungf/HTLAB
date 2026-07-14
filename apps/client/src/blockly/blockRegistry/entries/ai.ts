import { PORTS } from "../constants.js";
import { entry, field } from "../helpers.js";

export const aiEntries = [
  entry({
    type: "ai_image_recognition",
    category: "AI",
    displayText: "image recognition port 1",
    kind: "reporter",
    fields: [field("port", "dropdown", "1", { values: PORTS })],
    runtimeStatus: "stub",
    generatorHandlerId: "ai.imageRecognition",
    runtimeHandlerId: "runtime.diagnostic.aiNotImplemented",
    irV2Op: "ai.imageRecognition",
  }),
  entry({
    type: "ai_recognition_is",
    category: "AI",
    displayText: "recognition [input] is Number 0",
    kind: "boolean",
    fields: [
      field("input", "value-input", null, { required: true }),
      field("classType", "dropdown", "Number", { values: ["Number"] }),
      field("classValue", "text", "0"),
    ],
    runtimeStatus: "stub",
    generatorHandlerId: "ai.recognitionIs",
    runtimeHandlerId: "runtime.diagnostic.aiNotImplemented",
    irV2Op: "ai.recognitionMatches",
  }),
];
