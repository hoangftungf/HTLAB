import React from "react";
import type * as Blockly from "blockly";

export type VariableDialogState = {
  workspace: Blockly.WorkspaceSvg;
  mode: "create" | "rename";
  variableId?: string;
  name: string;
  error?: string;
} | null;

interface VariableDialogProps {
  variableDialog: NonNullable<VariableDialogState>;
  setVariableDialog: React.Dispatch<React.SetStateAction<VariableDialogState>>;
  closeVariableDialog: () => void;
  submitVariableDialog: (event?: React.FormEvent) => void;
}

export default function VariableDialog({
  variableDialog,
  setVariableDialog,
  closeVariableDialog,
  submitVariableDialog,
}: VariableDialogProps) {
  return (
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
  );
}
