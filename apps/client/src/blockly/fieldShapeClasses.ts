import * as Blockly from "blockly";

export const WHALESBOT_NUMBER_FIELD_CLASS = "htlab-field-number";
export const WHALESBOT_DROPDOWN_FIELD_CLASS = "htlab-field-dropdown";

const NUMBER_FIELD_RADIUS = "999";
const DROPDOWN_FIELD_RADIUS = "4";

type FieldConstructor = new (...args: any[]) => Blockly.Field;

type BlocklyWithFieldConstructors = typeof Blockly & {
  FieldNumber?: FieldConstructor;
  FieldDropdown?: FieldConstructor;
};

function getSvgRoot(field: unknown): Element | null {
  if (!field || typeof field !== "object") return null;
  const getSvgRootCandidate = (field as { getSvgRoot?: unknown }).getSvgRoot;
  if (typeof getSvgRootCandidate !== "function") return null;
  const root = getSvgRootCandidate.call(field);
  return root instanceof Element ? root : null;
}

function isFieldKind(field: unknown, constructorName: string, constructorRef: unknown): boolean {
  const actualConstructorName = (field as { constructor?: { name?: string } } | null)?.constructor?.name;
  if (actualConstructorName === constructorName) return true;
  return typeof constructorRef === "function" && field instanceof (constructorRef as FieldConstructor);
}

function applyRadius(root: Element, radius: string): void {
  const rect = root.querySelector("rect.blocklyFieldRect, rect");
  if (!rect) return;
  rect.setAttribute("rx", radius);
  rect.setAttribute("ry", radius);
}

export function applyWhalesBotFieldShapeClass(field: unknown): void {
  const root = getSvgRoot(field);
  if (!root) return;

  root.classList.remove(WHALESBOT_NUMBER_FIELD_CLASS, WHALESBOT_DROPDOWN_FIELD_CLASS);

  const blocklyConstructors = Blockly as BlocklyWithFieldConstructors;
  if (isFieldKind(field, "FieldNumber", blocklyConstructors.FieldNumber)) {
    root.classList.add(WHALESBOT_NUMBER_FIELD_CLASS);
    applyRadius(root, NUMBER_FIELD_RADIUS);
    return;
  }

  if (isFieldKind(field, "FieldDropdown", blocklyConstructors.FieldDropdown)) {
    root.classList.add(WHALESBOT_DROPDOWN_FIELD_CLASS);
    applyRadius(root, DROPDOWN_FIELD_RADIUS);
  }
}

export function applyWhalesBotFieldShapeClasses(workspace: Blockly.Workspace | null | undefined): void {
  if (!workspace) return;

  for (const block of workspace.getAllBlocks(false)) {
    for (const input of block.inputList) {
      for (const field of input.fieldRow) {
        applyWhalesBotFieldShapeClass(field);
      }
    }
  }
}

export function applyWhalesBotFieldShapeClassesForWorkspace(workspace: Blockly.WorkspaceSvg): void {
  applyWhalesBotFieldShapeClasses(workspace);

  const flyoutWorkspace = (workspace.getFlyout() as { getWorkspace?: () => Blockly.Workspace } | null)?.getWorkspace?.();
  applyWhalesBotFieldShapeClasses(flyoutWorkspace);
}
