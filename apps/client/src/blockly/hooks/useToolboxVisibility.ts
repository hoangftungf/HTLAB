import { useState, useEffect, useCallback } from "react";
import * as Blockly from "blockly";
import { TOOLBOX_EXPANDED_STORAGE_KEY, readStoredBoolean } from "../theme.js";

export function useToolboxVisibility(workspaceRef: React.MutableRefObject<Blockly.WorkspaceSvg | null>) {
  const [toolboxExpanded, setToolboxExpanded] = useState(() =>
    readStoredBoolean(TOOLBOX_EXPANDED_STORAGE_KEY, true),
  );

  const applyToolboxVisibility = useCallback((expanded: boolean) => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const workspaceToolbox = workspace.getToolbox();
    const workspaceFlyout = workspace.getFlyout();

    workspaceToolbox?.setVisible(expanded);
    workspaceFlyout?.setContainerVisible(expanded);
    if (!expanded) {
      workspaceFlyout?.hide();
      workspaceToolbox?.clearSelection();
    }

    window.requestAnimationFrame(() => {
      workspace.resize();
      Blockly.svgResize(workspace);
    });
  }, [workspaceRef]);

  useEffect(() => {
    window.localStorage.setItem(TOOLBOX_EXPANDED_STORAGE_KEY, String(toolboxExpanded));
    applyToolboxVisibility(toolboxExpanded);
  }, [toolboxExpanded, applyToolboxVisibility]);

  return { toolboxExpanded, setToolboxExpanded };
}
