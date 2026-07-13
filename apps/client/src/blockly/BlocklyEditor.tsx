import React, { useRef, useEffect, useCallback, useState } from "react";
import * as Blockly from "blockly";
import { toolbox, variableToolboxFlyout, VARIABLE_CATEGORY_CALLBACK_KEY } from "./toolbox.js";
import { workspaceToIR } from "./generator.js";
import { applyWhalesBotFieldShapeClassesForWorkspace } from "./fieldShapeClasses.js";
import type { IRProgram } from "@htlab/simulation-core";
import { DEFAULT_SAMPLE_PROGRAM_ID, SAMPLE_PROGRAMS } from "../store/samplePrograms.js";
import "./blocks.js"; // Đăng ký block tùy chỉnh

interface BlocklyEditorProps {
  onIRGenerated?: (program: IRProgram) => void;
  initialXml?: string;
}

type VariableDialogState = {
  workspace: Blockly.WorkspaceSvg;
  name: string;
  error?: string;
} | null;

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
  const [selectedSampleId, setSelectedSampleId] = useState(DEFAULT_SAMPLE_PROGRAM_ID);
  const [variableDialog, setVariableDialog] = useState<VariableDialogState>(null);

  const openVariableDialog = useCallback((workspace: Blockly.WorkspaceSvg) => {
    setVariableDialog({ workspace, name: "" });
  }, []);

  const closeVariableDialog = useCallback(() => {
    setVariableDialog(null);
  }, []);

  const submitVariableDialog = useCallback((event?: React.FormEvent) => {
    event?.preventDefault();
    if (!variableDialog) return;

    const name = variableDialog.name.trim();
    if (!name) {
      setVariableDialog({ ...variableDialog, error: "Variable name is required." });
      return;
    }

    if (Blockly.Variables.nameUsedWithAnyType(name, variableDialog.workspace)) {
      setVariableDialog({ ...variableDialog, error: `Variable "${name}" already exists.` });
      return;
    }

    variableDialog.workspace.createVariable(name, "Number");
    variableDialog.workspace.refreshToolboxSelection();
    setVariableDialog(null);
  }, [variableDialog]);

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
      sounds: false,
    });

    workspaceRef.current = workspace;
    workspace.registerToolboxCategoryCallback(VARIABLE_CATEGORY_CALLBACK_KEY, variableToolboxFlyout);
    workspace.registerButtonCallback("CREATE_VARIABLE", (button) => {
      const targetWorkspace = (button as any).getTargetWorkspace?.() ?? workspace;
      openVariableDialog(targetWorkspace);
    });
    workspace.registerButtonCallback("CREATE_MY_BLOCK", (button) => {
      const targetWorkspace = (button as any).getTargetWorkspace?.() ?? workspace;
      const definition = targetWorkspace.newBlock("my_block_definition") as Blockly.BlockSvg;
      definition.initSvg();
      definition.render();
      definition.moveBy(80, 80);
      targetWorkspace.centerOnBlock(definition.id);
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

    let fieldShapeFrame = 0;
    const scheduleFieldShapeSync = () => {
      if (fieldShapeFrame) window.cancelAnimationFrame(fieldShapeFrame);
      fieldShapeFrame = window.requestAnimationFrame(() => {
        fieldShapeFrame = 0;
        applyWhalesBotFieldShapeClassesForWorkspace(workspace);
      });
    };

    const mutationObserver = new MutationObserver(scheduleFieldShapeSync);
    mutationObserver.observe(containerRef.current, { childList: true, subtree: true });
    workspace.addChangeListener(scheduleFieldShapeSync);
    scheduleFieldShapeSync();

    return () => {
      if (fieldShapeFrame) window.cancelAnimationFrame(fieldShapeFrame);
      mutationObserver.disconnect();
      workspace.removeChangeListener(scheduleFieldShapeSync);
      observer.disconnect();
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, [openVariableDialog]);

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
      Blockly.svgResize(ws);
    } catch {
      // Bỏ qua lỗi nạp
    }
  }, []);

  const handleLoadSelectedSample = useCallback(() => {
    const sample = SAMPLE_PROGRAMS.find((candidate) => candidate.id === selectedSampleId);
    if (sample) {
      loadWorkspaceXml(sample.xml);
    }
  }, [loadWorkspaceXml, selectedSampleId]);

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
    (window as any).__htlabSamplePrograms = SAMPLE_PROGRAMS;
    (window as any).__blocklyLoadSampleById = (id: string) => {
      const sample = SAMPLE_PROGRAMS.find((candidate) => candidate.id === id);
      if (sample) loadWorkspaceXml(sample.xml);
    };
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
        <div className="flex min-w-0 items-center gap-2">
          <select
            value={selectedSampleId}
            onChange={(event) => setSelectedSampleId(event.target.value)}
            aria-label="Sample program"
            className="max-w-40 rounded border border-gray-700 bg-gray-900 px-2 py-0.5 text-xs text-gray-200"
          >
            {SAMPLE_PROGRAMS.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {sample.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleLoadSelectedSample}
            className="rounded bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-200 hover:bg-gray-700"
          >
            Load
          </button>
          <button
            onClick={handleGenerate}
            className="px-2 py-0.5 rounded text-xs font-medium bg-accent hover:bg-accent-light text-white"
          >
            Generate IR
          </button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1" />
      {variableDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35"
          role="dialog"
          aria-modal="true"
          aria-labelledby="variable-dialog-title"
        >
          <form
            onSubmit={submitVariableDialog}
            className="w-[376px] rounded-md border border-gray-300 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between rounded-t-md bg-[#e4f5ed] px-3 py-2">
              <h2 id="variable-dialog-title" className="text-sm font-medium text-gray-900">
                Create a variable
              </h2>
              <button
                type="button"
                onClick={closeVariableDialog}
                className="rounded px-2 text-lg leading-none text-gray-800 hover:bg-black/10"
                aria-label="Close variable dialog"
              >
                x
              </button>
            </div>
            <div className="px-4 py-7">
              <label className="flex items-center gap-3 text-sm text-gray-900">
                <span className="shrink-0">Variable name:</span>
                <input
                  autoFocus
                  value={variableDialog.name}
                  onChange={(event) => setVariableDialog({ ...variableDialog, name: event.target.value, error: undefined })}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") closeVariableDialog();
                  }}
                  className="min-w-0 flex-1 rounded border border-[#ff7a2f] px-2 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#ffb58c]"
                />
              </label>
              {variableDialog.error ? (
                <p className="mt-2 text-xs text-red-600">{variableDialog.error}</p>
              ) : null}
            </div>
            <div className="flex justify-center gap-3 px-4 pb-7">
              <button
                type="submit"
                className="min-w-28 rounded bg-[#ff865c] px-6 py-2 text-sm font-medium text-white hover:bg-[#ff7444]"
              >
                OK
              </button>
              <button
                type="button"
                onClick={closeVariableDialog}
                className="min-w-28 rounded border border-[#ff865c] px-6 py-2 text-sm font-medium text-[#ff865c] hover:bg-[#fff1ea]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
