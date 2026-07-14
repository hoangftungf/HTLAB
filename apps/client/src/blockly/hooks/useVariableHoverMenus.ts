import { useRef, useCallback } from "react";
import * as Blockly from "blockly";
import { getVariableMenuOptions } from "../blocks.js";

export function useVariableHoverMenus() {
  const hoveredVariableMenus = useRef(new WeakSet<SVGGElement>());

  const attachVariableHoverMenus = useCallback((flyoutWorkspace: Blockly.WorkspaceSvg | null) => {
    if (!flyoutWorkspace) return;
    for (const block of flyoutWorkspace.getAllBlocks(false)) {
      if (block.type !== "value_variable" || !flyoutWorkspace.isFlyout) continue;
      const svgRoot = (block as Blockly.BlockSvg).getSvgRoot?.();
      if (!svgRoot || hoveredVariableMenus.current.has(svgRoot)) continue;

      const showMenu = (event: MouseEvent) => {
        const options = getVariableMenuOptions(block);
        if (!options.length) return;
        Blockly.ContextMenu.show(event as unknown as PointerEvent, options, flyoutWorkspace.RTL, flyoutWorkspace);
      };

      const hideMenu = () => {
        Blockly.ContextMenu.hide();
      };

      svgRoot.addEventListener("mouseover", showMenu);
      svgRoot.addEventListener("mouseleave", hideMenu);
      hoveredVariableMenus.current.add(svgRoot);
    }
  }, []);

  return { attachVariableHoverMenus };
}
