import { PORTS } from "../constants.js";
import { entry, field, noFields } from "../helpers.js";

export const eventEntries = [
  entry({
    type: "event_program_execute",
    category: "Event",
    displayText: "When program execute",
    kind: "hat",
    fields: noFields,
    runtimeStatus: "implemented",
    generatorHandlerId: "event.programExecute",
    runtimeHandlerId: "runtime.program.entryPoint",
    irV2Op: "event.programExecute",
  }),
  entry({
    type: "event_touch_switch_pressed",
    category: "Event",
    displayText: "when touch switch is pressed port 1",
    kind: "hat",
    fields: [field("port", "dropdown", "1", { values: PORTS })],
    runtimeStatus: "stub",
    generatorHandlerId: "event.touchSwitchPressed",
    runtimeHandlerId: "runtime.diagnostic.asyncEventsNotImplemented",
    irV2Op: "event.touchSwitchPressed",
  }),
];
