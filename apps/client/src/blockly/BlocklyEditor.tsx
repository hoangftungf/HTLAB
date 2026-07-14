import React, { useRef, useEffect, useCallback, useState } from "react";
import * as Blockly from "blockly";
import { toolbox, variableToolboxFlyout, VARIABLE_CATEGORY_CALLBACK_KEY } from "./toolbox.js";
import { workspaceToIR } from "./generator.js";
import { applyWhalesBotFieldShapeClassesForWorkspace } from "./fieldShapeClasses.js";
import { setVariableMenuHandlers, randomSuffix, buildMyBlocksFlyout, MY_BLOCKS_FLYOUT_KEY } from "./blocks.js";
import type { IRProgram } from "@htlab/simulation-core";
import { DEFAULT_SAMPLE_PROGRAM_ID, SAMPLE_PROGRAMS } from "../store/samplePrograms.js";
import { whalesBotBlocklyTheme } from "./theme.js";
import VariableDialog, { type VariableDialogState } from "./dialogs/VariableDialog.js";
import DeleteVariableDialog, { type DeleteVariableDialogState } from "./dialogs/DeleteVariableDialog.js";
import MyBlockDialog, { type MyBlockDialogState, type MyBlockElement } from "./dialogs/MyBlockDialog.js";
import { useToolboxVisibility } from "./hooks/useToolboxVisibility.js";
import { useVariableHoverMenus } from "./hooks/useVariableHoverMenus.js";
import "./blocks.js"; // Register custom blocks

export { workspaceToIR };
export type { IRProgram };

interface BlocklyEditorProps {
  onIRGenerated?: (program: IRProgram) => void;
  initialXml?: string;
}

export default function BlocklyEditor({ onIRGenerated, initialXml }: BlocklyEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState(DEFAULT_SAMPLE_PROGRAM_ID);
  const [variableDialog, setVariableDialog] = useState<VariableDialogState>(null);
  const [deleteVariableDialog, setDeleteVariableDialog] = useState<DeleteVariableDialogState>(null);
  const [myBlockDialog, setMyBlockDialog] = useState<MyBlockDialogState>(null);
  const { toolboxExpanded, setToolboxExpanded } = useToolboxVisibility(workspaceRef);
  const { attachVariableHoverMenus } = useVariableHoverMenus();

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
    const firstLabel = updated.find(e => e.type === "label");
    const blockName = firstLabel ? firstLabel.name : myBlockDialog.blockName;
    setMyBlockDialog({ ...myBlockDialog, blockName, elements: updated });
  }, [myBlockDialog]);

  const submitMyBlockDialog = useCallback((event?: React.FormEvent) => {
    event?.preventDefault();
    if (!myBlockDialog) return;

    const name = myBlockDialog.blockName.trim() || "my_block";
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

  // Initialize Blockly workspace
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

    if (initialXml) {
      try {
        const xml = Blockly.utils.xml.textToDom(initialXml);
        Blockly.Xml.domToWorkspace(xml, workspace);
      } catch {
        // Ignore parse errors for saved XML
      }
    }

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

  // Generate IR from workspace
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

  const getWorkspaceXml = useCallback((): string => {
    const ws = workspaceRef.current;
    if (!ws) return "";
    const xml = Blockly.Xml.workspaceToDom(ws);
    return Blockly.Xml.domToText(xml);
  }, []);

  const loadWorkspaceXml = useCallback((xml: string) => {
    const ws = workspaceRef.current;
    if (!ws) return;
    try {
      ws.clear();
      const dom = Blockly.utils.xml.textToDom(xml);
      Blockly.Xml.domToWorkspace(dom, ws);
      Blockly.svgResize(ws);
    } catch {
      // Ignore load errors
    }
  }, []);

  const handleLoadSelectedSample = useCallback(() => {
    const sample = SAMPLE_PROGRAMS.find((candidate) => candidate.id === selectedSampleId);
    if (sample) {
      loadWorkspaceXml(sample.xml);
    }
  }, [loadWorkspaceXml, selectedSampleId]);

  const loadSampleProgram = useCallback((xml: string) => {
    if (!xml) return;
    const ws = workspaceRef.current;
    if (!ws) {
      setTimeout(() => loadSampleProgram(xml), 200);
      return;
    }
    if (ws.getTopBlocks(true).length === 0) {
      loadWorkspaceXml(xml);
    }
  }, [loadWorkspaceXml]);

  // Expose methods via ref and global window
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
        <VariableDialog
          variableDialog={variableDialog}
          setVariableDialog={setVariableDialog}
          closeVariableDialog={closeVariableDialog}
          submitVariableDialog={submitVariableDialog}
        />
      ) : null}
      {deleteVariableDialog ? (
        <DeleteVariableDialog
          deleteVariableDialog={deleteVariableDialog}
          setDeleteVariableDialog={setDeleteVariableDialog}
        />
      ) : null}
      {myBlockDialog ? (
        <MyBlockDialog
          myBlockDialog={myBlockDialog}
          setMyBlockDialog={setMyBlockDialog}
          submitMyBlockDialog={submitMyBlockDialog}
          addNumericParameter={addNumericParameter}
          addBooleanParameter={addBooleanParameter}
          addTextLabel={addTextLabel}
          deleteElement={deleteElement}
          updateSelectedElement={updateSelectedElement}
        />
      ) : null}
    </div>
  );
}
