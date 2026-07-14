import React from "react";
import type * as Blockly from "blockly";

export type DeleteVariableDialogState = {
  workspace: Blockly.WorkspaceSvg;
  variableId: string;
  name: string;
} | null;

interface DeleteVariableDialogProps {
  deleteVariableDialog: NonNullable<DeleteVariableDialogState>;
  setDeleteVariableDialog: React.Dispatch<React.SetStateAction<DeleteVariableDialogState>>;
}

export default function DeleteVariableDialog({
  deleteVariableDialog,
  setDeleteVariableDialog,
}: DeleteVariableDialogProps) {
  return (
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
  );
}
