import React, { useRef, useEffect, useCallback, useState } from "react";
import * as Blockly from "blockly";
import { toolbox } from "./toolbox.js";
import { workspaceToIR } from "./generator.js";
import type { IRProgram } from "@htlab/simulation-core";
import "./blocks.js"; // Đăng ký block tùy chỉnh

interface BlocklyEditorProps {
  onIRGenerated?: (program: IRProgram) => void;
  initialXml?: string;
}

export { workspaceToIR };
export type { IRProgram };

const TOOLBOX_EXPANDED_STORAGE_KEY = "htlab:blocklyToolboxExpanded";
const whalesBotBlocklyTheme = Blockly.Theme.defineTheme("htlab-whalesbot", {
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

function readStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value === "true";
}

export default function BlocklyEditor({ onIRGenerated, initialXml }: BlocklyEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
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
  }, []);

  // Khởi tạo không gian làm việc Blockly
  useEffect(() => {
    if (!containerRef.current || workspaceRef.current) return;

    const workspace = Blockly.inject(containerRef.current, {
      toolbox,
      grid: { spacing: 18, length: 1, colour: "#e7d3c7", snap: true },
      zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 2, minScale: 0.3 },
      trashcan: true,
      scrollbars: true,
      move: { scrollbars: true, drag: true, wheel: true },
      renderer: "zelos",
      theme: whalesBotBlocklyTheme,
    });

    workspaceRef.current = workspace;
    workspace.registerButtonCallback("CREATE_VARIABLE", (button) => {
      const targetWorkspace = (button as any).getTargetWorkspace?.() ?? workspace;
      Blockly.Variables.createVariableButtonHandler(targetWorkspace);
    });

    // Nạp không gian làm việc ban đầu nếu có
    if (initialXml) {
      try {
        const xml = Blockly.utils.xml.textToDom(initialXml);
        Blockly.Xml.domToWorkspace(xml, workspace);
      } catch {
        // Bỏ qua lỗi phân tích XML đã lưu
      }
    }

    // Cập nhật kích thước khi vùng chứa thay đổi
    const observer = new ResizeObserver(() => {
      Blockly.svgResize(workspace);
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(TOOLBOX_EXPANDED_STORAGE_KEY, String(toolboxExpanded));
    applyToolboxVisibility(toolboxExpanded);
  }, [applyToolboxVisibility, toolboxExpanded]);

  // Sinh IR từ không gian làm việc
  const generateIR = useCallback((): IRProgram | null => {
    const ws = workspaceRef.current;
    if (!ws) return null;
    try {
      return workspaceToIR(ws);
    } catch {
      return null;
    }
  }, []);

  const handleGenerate = useCallback(() => {
    const ir = generateIR();
    if (ir && onIRGenerated) {
      onIRGenerated(ir);
    }
  }, [generateIR, onIRGenerated]);

  // Xuất XML không gian làm việc để lưu
  const getWorkspaceXml = useCallback((): string => {
    const ws = workspaceRef.current;
    if (!ws) return "";
    const xml = Blockly.Xml.workspaceToDom(ws);
    return Blockly.Xml.domToText(xml);
  }, []);

  // Nạp XML không gian làm việc
  const loadWorkspaceXml = useCallback((xml: string) => {
    const ws = workspaceRef.current;
    if (!ws) return;
    try {
      ws.clear();
      const dom = Blockly.utils.xml.textToDom(xml);
      Blockly.Xml.domToWorkspace(dom, ws);
    } catch {
      // Bỏ qua lỗi nạp
    }
  }, []);

  // Nạp chương trình mẫu (được gọi từ kho mô phỏng khi khởi tạo)
  const loadSampleProgram = useCallback((xml: string) => {
    if (!xml) return;
    const ws = workspaceRef.current;
    if (!ws) {
      // Thử lại sau khi không gian làm việc được khởi tạo
      setTimeout(() => loadSampleProgram(xml), 200);
      return;
    }
    // Chỉ nạp nếu không gian làm việc đang trống
    if (ws.getTopBlocks(true).length === 0) {
      loadWorkspaceXml(xml);
    }
  }, [loadWorkspaceXml]);

  // Công khai phương thức qua hàm gọi lại kiểu tham chiếu và biến toàn cục trên cửa sổ trình duyệt
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      (el as any).__blocklyGenerate = handleGenerate;
      (el as any).__blocklyGetXml = getWorkspaceXml;
      (el as any).__blocklyLoadXml = loadWorkspaceXml;
    }
    (window as any).__blocklyLoadSample = loadSampleProgram;
  }, [handleGenerate, getWorkspaceXml, loadWorkspaceXml, loadSampleProgram]);

  return (
    <div className={`flex h-full flex-col ${toolboxExpanded ? "" : "blockly-toolbox-collapsed"}`}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
            Blockly Editor
          </span>
          <div className="flex items-center overflow-hidden rounded border border-gray-700 text-xs font-medium">
            <button
              onClick={() => setToolboxExpanded(true)}
              aria-pressed={toolboxExpanded}
              className={`px-2 py-0.5 ${
                toolboxExpanded
                  ? "bg-accent text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
              }`}
              title="Show block categories"
            >
              Show
            </button>
            <button
              onClick={() => setToolboxExpanded(false)}
              aria-pressed={!toolboxExpanded}
              className={`border-l border-gray-700 px-2 py-0.5 ${
                !toolboxExpanded
                  ? "bg-accent text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
              }`}
              title="Hide block categories"
            >
              Hide
            </button>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          className="px-2 py-0.5 rounded text-xs font-medium bg-accent hover:bg-accent-light text-white"
        >
          Generate IR
        </button>
      </div>
      <div ref={containerRef} className="flex-1" />
    </div>
  );
}
