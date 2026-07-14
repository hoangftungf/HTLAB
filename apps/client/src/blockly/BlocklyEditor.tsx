import React, { useRef, useEffect, useCallback, useState } from "react";
import * as Blockly from "blockly";
import { toolbox, variableToolboxFlyout, VARIABLE_CATEGORY_CALLBACK_KEY } from "./toolbox.js";
import { workspaceToIR } from "./generator.js";
import { applyWhalesBotFieldShapeClassesForWorkspace } from "./fieldShapeClasses.js";
import { getVariableMenuOptions, setVariableMenuHandlers, randomSuffix, buildMyBlocksFlyout, MY_BLOCKS_FLYOUT_KEY } from "./blocks.js";
import type { IRProgram } from "@htlab/simulation-core";
import { DEFAULT_SAMPLE_PROGRAM_ID, SAMPLE_PROGRAMS } from "../store/samplePrograms.js";
import "./blocks.js"; // Đăng ký block tùy chỉnh

interface BlocklyEditorProps {
  onIRGenerated?: (program: IRProgram) => void;
  initialXml?: string;
}

type VariableDialogState = {
  workspace: Blockly.WorkspaceSvg;
  mode: "create" | "rename";
  variableId?: string;
  name: string;
  error?: string;
} | null;

type DeleteVariableDialogState = {
  workspace: Blockly.WorkspaceSvg;
  variableId: string;
  name: string;
} | null;

interface MyBlockElement {
  id: string;
  type: "label" | "number" | "boolean";
  name: string;
  defaultValue?: string;
}

type MyBlockDialogState = {
  workspace: Blockly.WorkspaceSvg;
  mode: "create" | "edit";
  editBlockId?: string;
  blockType: "statement" | "reporter" | "boolean";
  blockName: string;
  elements: MyBlockElement[];
  selectedId: string | null;
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
  const [deleteVariableDialog, setDeleteVariableDialog] = useState<DeleteVariableDialogState>(null);
  const [myBlockDialog, setMyBlockDialog] = useState<MyBlockDialogState>(null);
  const hoveredVariableMenus = useRef(new WeakSet<SVGGElement>());

  const openCreateVariableDialog = useCallback((workspace: Blockly.WorkspaceSvg) => {
    setVariableDialog({ workspace, mode: "create", name: "" });
  }, []);

  const openRenameVariableDialog = useCallback((workspace: Blockly.WorkspaceSvg, variable: Blockly.VariableModel) => {
    setVariableDialog({
      workspace,
      mode: "rename",
      variableId: variable.getId(),
      name: variable.name,
    });
  }, []);

  const openDeleteVariableDialog = useCallback((workspace: Blockly.WorkspaceSvg, variable: Blockly.VariableModel) => {
    setDeleteVariableDialog({
      workspace,
      variableId: variable.getId(),
      name: variable.name,
    });
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

    if (variableDialog.mode === "create" && Blockly.Variables.nameUsedWithAnyType(name, variableDialog.workspace)) {
      setVariableDialog({ ...variableDialog, error: `Variable "${name}" already exists.` });
      return;
    }

    if (variableDialog.mode === "rename" && variableDialog.variableId) {
      variableDialog.workspace.renameVariableById(variableDialog.variableId, name);
    } else {
      variableDialog.workspace.createVariable(name, "Number");
    }
    variableDialog.workspace.refreshToolboxSelection();
    setVariableDialog(null);
  }, [variableDialog]);

  const addNumericParameter = useCallback(() => {
    if (!myBlockDialog) return;
    const numCount = myBlockDialog.elements.filter(e => e.type === "number").length + 1;
    const id = "num-" + Date.now();
    const newElem: MyBlockElement = {
      id,
      type: "number",
      name: `number${numCount}`,
      defaultValue: "0"
    };
    setMyBlockDialog({
      ...myBlockDialog,
      elements: [...myBlockDialog.elements, newElem],
      selectedId: id
    });
  }, [myBlockDialog]);

  const addBooleanParameter = useCallback(() => {
    if (!myBlockDialog) return;
    const boolCount = myBlockDialog.elements.filter(e => e.type === "boolean").length + 1;
    const id = "bool-" + Date.now();
    const newElem: MyBlockElement = {
      id,
      type: "boolean",
      name: `boolean${boolCount}`,
      defaultValue: "false"
    };
    setMyBlockDialog({
      ...myBlockDialog,
      elements: [...myBlockDialog.elements, newElem],
      selectedId: id
    });
  }, [myBlockDialog]);

  const addTextLabel = useCallback(() => {
    if (!myBlockDialog) return;
    const labelCount = myBlockDialog.elements.filter(e => e.type === "label").length + 1;
    const id = "label-" + Date.now();
    const newElem: MyBlockElement = {
      id,
      type: "label",
      name: `label${labelCount}`
    };
    setMyBlockDialog({
      ...myBlockDialog,
      elements: [...myBlockDialog.elements, newElem],
      selectedId: id
    });
  }, [myBlockDialog]);

  const deleteElement = useCallback((id: string) => {
    if (!myBlockDialog) return;
    // Don't allow deleting the first function-name label
    const firstLabelId = myBlockDialog.elements.find(e => e.type === "label")?.id;
    if (id === firstLabelId) return;
    const updated = myBlockDialog.elements.filter(e => e.id !== id);
    setMyBlockDialog({
      ...myBlockDialog,
      elements: updated,
      selectedId: updated.length > 0 ? updated[updated.length - 1].id : null
    });
  }, [myBlockDialog]);

  const updateSelectedElement = useCallback((updates: Partial<MyBlockElement>) => {
    if (!myBlockDialog || !myBlockDialog.selectedId) return;
    const updated = myBlockDialog.elements.map(e =>
      e.id === myBlockDialog.selectedId ? { ...e, ...updates } : e
    );
    // Block name tracks the first label element
    const firstLabel = updated.find(e => e.type === "label");
    const blockName = firstLabel ? firstLabel.name : myBlockDialog.blockName;
    setMyBlockDialog({ ...myBlockDialog, blockName, elements: updated });
  }, [myBlockDialog]);

  const submitMyBlockDialog = useCallback((event?: React.FormEvent) => {
    event?.preventDefault();
    if (!myBlockDialog) return;

    const name = myBlockDialog.blockName.trim() || "my_block";
    // params = non-label elements
    const params = myBlockDialog.elements
      .filter(e => e.type !== "label")
      .map(e => ({
        name: e.name.trim() || "value",
        type: (e.type === "boolean" ? "Boolean" : "Number") as "Number" | "Boolean",
        defaultValue: e.defaultValue,
      }));

    const workspace = myBlockDialog.workspace;

    if (myBlockDialog.mode === "edit" && myBlockDialog.editBlockId) {
      const existingBlock = workspace.getBlockById(myBlockDialog.editBlockId) as any;
      if (existingBlock) {
        existingBlock.setFieldValue(name, "NAME");
        existingBlock.params_ = params;
        existingBlock.blockType_ = myBlockDialog.blockType;
        existingBlock._rebuildInputs?.();
        if (existingBlock.rendered) {
          (existingBlock as any).initSvg?.();
          (existingBlock as any).render?.();
        }
        workspace.refreshToolboxSelection();
      }
    } else {
      const definition = workspace.newBlock("my_block_definition") as any;
      definition.setFieldValue(name, "NAME");
      definition.params_ = params;
      definition.blockType_ = myBlockDialog.blockType;
      definition._rebuildInputs?.();
      definition.initSvg();
      definition.render();
      definition.moveBy(80, 80);
      workspace.centerOnBlock(definition.id);
      workspace.refreshToolboxSelection();
    }

    setMyBlockDialog(null);
  }, [myBlockDialog]);

  const openEditMyBlockDialog = useCallback((workspace: Blockly.WorkspaceSvg, block: Blockly.Block) => {
    const blockName = block.getFieldValue("NAME") ?? "my_block";
    const rawParams: Array<{ name: string; type: string; defaultValue?: string }> =
      (block as any).params_ ?? [];
    const blockType: "statement" | "reporter" | "boolean" =
      (block as any).blockType_ ?? "statement";

    const elements: MyBlockElement[] = [
      { id: "label-0", type: "label", name: blockName },
      ...rawParams.map((p, idx) => ({
        id: `param-${idx}-${Date.now()}`,
        type: (p.type === "Boolean" ? "boolean" : "number") as "number" | "boolean",
        name: p.name,
        defaultValue: p.defaultValue,
      })),
    ];

    setMyBlockDialog({
      workspace,
      mode: "edit",
      editBlockId: block.id,
      blockType,
      blockName,
      elements,
      selectedId: "label-0",
    });
  }, []);

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
    setVariableMenuHandlers({
      openRename: openRenameVariableDialog,
      openDelete: openDeleteVariableDialog,
    });
    workspace.registerButtonCallback("CREATE_VARIABLE", (button) => {
      const targetWorkspace = (button as any).getTargetWorkspace?.() ?? workspace;
      openCreateVariableDialog(targetWorkspace);
    });
    // Register dynamic My Blocks flyout (Fix 1: no static param_value; Fix 3: shows created blocks)
    workspace.registerToolboxCategoryCallback(MY_BLOCKS_FLYOUT_KEY, buildMyBlocksFlyout);

    workspace.registerButtonCallback("CREATE_MY_BLOCK", (button) => {
      const targetWorkspace = (button as any).getTargetWorkspace?.() ?? workspace;
      const newName = "name_" + randomSuffix();
      setMyBlockDialog({
        workspace: targetWorkspace,
        mode: "create",
        blockType: "statement",
        blockName: newName,
        elements: [
          { id: "label-0", type: "label", name: newName }
        ],
        selectedId: "label-0"
      });
    });

    // Register context menu option for "Edit function" on define blocks
    Blockly.ContextMenuRegistry.registry.register({
      id: "edit_my_block_function",
      displayText: () => "Edit function",
      weight: 6,
      scopeType: Blockly.ContextMenuRegistry.ScopeType.BLOCK,
      preconditionFn: (scope) => {
        return scope.block?.type === "my_block_definition" ? "enabled" : "hidden";
      },
      callback: (scope) => {
        const block = scope.block;
        if (!block) return;
        const ws = block.workspace as Blockly.WorkspaceSvg;
        openEditMyBlockDialog(ws, block);
      },
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
        attachVariableHoverMenus(workspace.getFlyout()?.getWorkspace() ?? null);
      });
    };

    const mutationObserver = new MutationObserver(scheduleFieldShapeSync);
    mutationObserver.observe(containerRef.current, { childList: true, subtree: true });
    const syncWorkspaceState = () => {
      scheduleFieldShapeSync();
    };
    workspace.addChangeListener(syncWorkspaceState);
    scheduleFieldShapeSync();
    attachVariableHoverMenus(workspace.getFlyout()?.getWorkspace() ?? null);

    return () => {
      setVariableMenuHandlers(null);
      if (fieldShapeFrame) window.cancelAnimationFrame(fieldShapeFrame);
      mutationObserver.disconnect();
      workspace.removeChangeListener(syncWorkspaceState);
      observer.disconnect();
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, [attachVariableHoverMenus, openCreateVariableDialog, openDeleteVariableDialog, openRenameVariableDialog]);

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
                {variableDialog.mode === "rename" ? "Rename variable" : "Create a variable"}
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
                {variableDialog.mode === "rename" ? "Rename" : "OK"}
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
      {deleteVariableDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35"
          role="dialog"
          aria-modal="true"
          aria-labelledby="variable-delete-dialog-title"
        >
          <div className="w-[376px] rounded-md border border-gray-300 bg-white shadow-xl">
            <div className="flex items-center justify-between rounded-t-md bg-[#fbe3d5] px-3 py-2">
              <h2 id="variable-delete-dialog-title" className="text-sm font-medium text-gray-900">
                Delete variable
              </h2>
              <button
                type="button"
                onClick={() => setDeleteVariableDialog(null)}
                className="rounded px-2 text-lg leading-none text-gray-800 hover:bg-black/10"
                aria-label="Close delete dialog"
              >
                x
              </button>
            </div>
            <div className="px-4 py-7">
              <p className="text-sm text-gray-900">
                Delete variable "{deleteVariableDialog.name}"?
              </p>
            </div>
            <div className="flex justify-center gap-3 px-4 pb-7">
              <button
                type="button"
                onClick={() => {
                  deleteVariableDialog.workspace.deleteVariableById(deleteVariableDialog.variableId);
                  deleteVariableDialog.workspace.refreshToolboxSelection();
                  setDeleteVariableDialog(null);
                }}
                className="min-w-28 rounded bg-[#ff865c] px-6 py-2 text-sm font-medium text-white hover:bg-[#ff7444]"
              >
                Delete
              </button>
               <button
                 type="button"
                 onClick={() => setDeleteVariableDialog(null)}
                 className="min-w-28 rounded border border-[#ff865c] px-6 py-2 text-sm font-medium text-[#ff865c] hover:bg-[#fff1ea]"
               >
                 Cancel
               </button>
             </div>
           </div>
         </div>
       ) : null}
        {myBlockDialog ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 font-sans"
            role="dialog"
            aria-modal="true"
          >
            <form
              onSubmit={submitMyBlockDialog}
              className="w-[620px] rounded-lg border border-gray-200 bg-white shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header — matches Whalesbot style but branded as HTLABS */}
              <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  {/* Orange icon square like Whalesbot */}
                  <span className="w-5 h-5 rounded bg-[#ff7a2f] flex items-center justify-center text-white text-xs font-bold">f</span>
                  <h2 className="text-sm font-medium text-gray-800">
                    {myBlockDialog.mode === "edit" ? "Edit function - HTLABS block" : "Create a function - HTLABS block"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMyBlockDialog(null)}
                  className="rounded px-2 text-lg leading-none text-gray-500 hover:bg-gray-100 transition"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col gap-4 bg-white">
                {/* Toolbar: 3 icon buttons (type selector) — functional */}
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    title="Function"
                    onClick={() => setMyBlockDialog({ ...myBlockDialog, blockType: "statement" })}
                    className={`w-10 h-9 rounded border-2 flex items-center justify-center transition ${
                      myBlockDialog.blockType === "statement" ? "border-[#2f6dff] bg-[#eef3ff]" : "border-gray-300 bg-white"
                    }`}
                  >
                    <svg width="20" height="16" viewBox="0 0 24 20" fill="none">
                      <rect x="1" y="2" width="22" height="16" rx="3" fill="#2f6dff"/>
                      <path d="M6 10h12M6 10l3-3M6 10l3 3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="Number param"
                    onClick={() => setMyBlockDialog({ ...myBlockDialog, blockType: "reporter" })}
                    className={`w-10 h-9 rounded border-2 flex items-center justify-center transition ${
                      myBlockDialog.blockType === "reporter" ? "border-[#2f6dff] bg-[#eef3ff]" : "border-gray-300 bg-white"
                    }`}
                  >
                    <div className="w-7 h-4 rounded-full bg-[#2f6dff]"/>
                  </button>
                  <button
                    type="button"
                    title="Boolean param"
                    onClick={() => setMyBlockDialog({ ...myBlockDialog, blockType: "boolean" })}
                    className={`w-10 h-9 rounded border-2 flex items-center justify-center transition ${
                      myBlockDialog.blockType === "boolean" ? "border-[#2f6dff] bg-[#eef3ff]" : "border-gray-300 bg-white"
                    }`}
                  >
                    <div className="w-7 h-4 bg-[#2f6dff]" style={{ clipPath: "polygon(15% 0%,85% 0%,100% 50%,85% 100%,15% 100%,0% 50%)" }}/>
                  </button>
                </div>

                {/* Block Preview — blue Scratch-style block */}
                <div className="relative flex items-start min-h-[56px] py-2">
                  {/* Trash icon — shown above selected non-first element */}
                  {myBlockDialog.selectedId &&
                    myBlockDialog.selectedId !== myBlockDialog.elements[0]?.id && (
                    <button
                      type="button"
                      onClick={() => deleteElement(myBlockDialog.selectedId!)}
                      className="absolute -top-1 right-0 text-[#ff7a2f] hover:text-red-500 transition"
                      title="Delete selected parameter"
                    >
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                    </button>
                  )}
                  {/* The block itself */}
                  <div
                    className={`inline-flex items-center bg-[#2f6dff] text-white px-3 py-2 gap-1.5 flex-wrap shadow select-none transition-all ${
                      myBlockDialog.blockType === "statement"
                        ? "rounded px-3 py-2"
                        : myBlockDialog.blockType === "reporter"
                        ? "rounded-full px-4 py-2"
                        : "px-5 py-2"
                    }`}
                    style={
                      myBlockDialog.blockType === "boolean"
                        ? { clipPath: "polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)" }
                        : undefined
                    }
                  >
                    {myBlockDialog.elements.map((el) => {
                      const isSelected = myBlockDialog.selectedId === el.id;
                      const selRing = isSelected ? "ring-2 ring-yellow-300 ring-offset-1 ring-offset-[#2f6dff]" : "";

                      if (el.type === "label") {
                        return (
                          <span
                            key={el.id}
                            onClick={() => setMyBlockDialog({ ...myBlockDialog, selectedId: el.id })}
                            className={`cursor-pointer text-white text-sm font-medium px-0.5 rounded ${selRing}`}
                          >
                            {el.name || "\u00a0"}
                          </span>
                        );
                      } else if (el.type === "number") {
                        return (
                          <span
                            key={el.id}
                            onClick={() => setMyBlockDialog({ ...myBlockDialog, selectedId: el.id })}
                            className={`cursor-pointer bg-white text-gray-800 text-xs font-semibold px-3 py-0.5 rounded-full ${selRing}`}
                          >
                            {el.name}
                          </span>
                        );
                      } else {
                        return (
                          <span
                            key={el.id}
                            onClick={() => setMyBlockDialog({ ...myBlockDialog, selectedId: el.id })}
                            className={`cursor-pointer bg-white text-gray-800 text-xs font-semibold px-4 py-0.5 ${selRing}`}
                            style={{ clipPath: "polygon(12% 0%,88% 0%,100% 50%,88% 100%,12% 100%,0% 50%)" }}
                          >
                            {el.name}
                          </span>
                        );
                      }
                    })}
                  </div>
                </div>

                {/* Controls grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Left: Add buttons */}
                  <div className="flex flex-col gap-3 bg-[#fafafa] rounded-lg border border-gray-100 p-4 justify-center">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">add a numeric parameter</span>
                      <button
                        type="button"
                        onClick={addNumericParameter}
                        className="w-14 h-7 rounded-full border border-gray-300 bg-white flex items-center justify-center hover:border-[#4ecdc4] transition"
                        title="Add a numeric parameter"
                      >
                        <div className="w-9 h-3.5 rounded-full bg-[#4ecdc4]"/>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">add a boolean parameter</span>
                      <button
                        type="button"
                        onClick={addBooleanParameter}
                        className="w-14 h-7 border border-gray-300 bg-white flex items-center justify-center hover:border-[#4ecdc4] transition"
                        style={{ clipPath: "polygon(15% 0%,85% 0%,100% 50%,85% 100%,15% 100%,0% 50%)" }}
                        title="Add a boolean parameter"
                      >
                        <div className="w-9 h-3.5 bg-[#4ecdc4]" style={{ clipPath: "polygon(15% 0%,85% 0%,100% 50%,85% 100%,15% 100%,0% 50%)" }}/>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">add text labels</span>
                      <button
                        type="button"
                        onClick={addTextLabel}
                        className="px-3 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition"
                      >
                        text
                      </button>
                    </div>
                  </div>

                  {/* Right: detail editor */}
                  <div className="flex flex-col gap-3 bg-[#fafafa] rounded-lg border border-gray-100 p-4">
                    {myBlockDialog.selectedId ? (() => {
                      const sel = myBlockDialog.elements.find(e => e.id === myBlockDialog.selectedId);
                      if (!sel) return null;
                      return (
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-600">Parameter/Label Name</label>
                            <input
                              type="text"
                              value={sel.name}
                              onChange={e => updateSelectedElement({ name: e.target.value })}
                              className="border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-800 bg-white outline-none focus:border-[#4ecdc4] focus:ring-1 focus:ring-[#4ecdc4]"
                            />
                          </div>
                          {sel.type !== "label" && (
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-gray-600">Default value</label>
                              <input
                                type="text"
                                value={sel.defaultValue || ""}
                                onChange={e => updateSelectedElement({ defaultValue: e.target.value })}
                                className="border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-800 bg-white outline-none focus:border-[#4ecdc4] focus:ring-1 focus:ring-[#4ecdc4]"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })() : (
                      <div className="text-xs text-gray-400 flex items-center justify-center h-full">
                        Click a parameter to edit
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-center gap-3 px-5 py-4 bg-white border-t border-gray-100">
                <button
                  type="submit"
                  className="min-w-24 rounded bg-[#ff865c] px-6 py-2 text-sm font-medium text-white hover:bg-[#ff7444] transition"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setMyBlockDialog(null)}
                  className="min-w-24 rounded border border-[#ff865c] px-6 py-2 text-sm font-medium text-[#ff865c] hover:bg-[#fff1ea] transition"
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
