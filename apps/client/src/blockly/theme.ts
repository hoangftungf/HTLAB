import * as Blockly from "blockly";

export const TOOLBOX_EXPANDED_STORAGE_KEY = "htlab:blocklyToolboxExpanded";

export const whalesBotBlocklyTheme = Blockly.Theme.defineTheme("htlab-whalesbot", {
  name: "htlab-whalesbot",
  base: Blockly.Themes.Zelos,
  componentStyles: {
    workspaceBackgroundColour: "#fff4ec",
    toolboxBackgroundColour: "#ffded2",
    toolboxForegroundColour: "#4b5563",
    flyoutBackgroundColour: "#fff7f1",
    flyoutForegroundColour: "#3f4652",
    flyoutOpacity: 0.96,
    scrollbarColour: "#ff7a2f",
    scrollbarOpacity: 0.9,
    insertionMarkerColour: "#ff7a2f",
    insertionMarkerOpacity: 0.28,
    markerColour: "#ff7a2f",
    cursorColour: "#ff7a2f",
    selectedGlowColour: "#ff7a2f",
    selectedGlowOpacity: 0.55,
    replacementGlowColour: "#ff9d5c",
    replacementGlowOpacity: 0.45,
  },
  fontStyle: {
    family: "Inter, Segoe UI, Arial, sans-serif",
    size: 13,
  },
});

export function readStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value === "true";
}
