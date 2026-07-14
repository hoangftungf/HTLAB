import React from "react";
import type * as Blockly from "blockly";

export interface MyBlockElement {
  id: string;
  type: "label" | "number" | "boolean";
  name: string;
  defaultValue?: string;
}

export type MyBlockDialogState = {
  workspace: Blockly.WorkspaceSvg;
  mode: "create" | "edit";
  editBlockId?: string;
  blockType: "statement" | "reporter" | "boolean";
  blockName: string;
  elements: MyBlockElement[];
  selectedId: string | null;
} | null;

interface MyBlockDialogProps {
  myBlockDialog: NonNullable<MyBlockDialogState>;
  setMyBlockDialog: React.Dispatch<React.SetStateAction<MyBlockDialogState>>;
  submitMyBlockDialog: (event?: React.FormEvent) => void;
  addNumericParameter: () => void;
  addBooleanParameter: () => void;
  addTextLabel: () => void;
  deleteElement: (id: string) => void;
  updateSelectedElement: (updates: Partial<MyBlockElement>) => void;
}

export default function MyBlockDialog({
  myBlockDialog,
  setMyBlockDialog,
  submitMyBlockDialog,
  addNumericParameter,
  addBooleanParameter,
  addTextLabel,
  deleteElement,
  updateSelectedElement,
}: MyBlockDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 font-sans"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={submitMyBlockDialog}
        className="w-[620px] rounded-lg border border-gray-200 bg-white shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
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
          {/* Toolbar: 3 icon buttons */}
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

          {/* Block Preview */}
          <div className="relative flex items-start min-h-[56px] py-2">
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
  );
}
