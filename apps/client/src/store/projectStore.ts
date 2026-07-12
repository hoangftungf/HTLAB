/**
 * Lưu project bằng localStorage.
 * Lưu: XML workspace Blockly, chương trình IR, cấu hình robot, tên sa bàn.
 */

const STORAGE_KEY = "htlab-projects";
const CURRENT_KEY = "htlab-current-project";

export interface SavedProject {
  id: string;
  name: string;
  workspaceXml: string;
  irProgram: any;
  mapName: string;
  createdAt: string;
  updatedAt: string;
}

export function getProjects(): SavedProject[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveProjects(projects: SavedProject[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function saveProject(
  name: string,
  workspaceXml: string,
  irProgram: any,
  mapName: string = "default",
): SavedProject {
  const projects = getProjects();
  const now = new Date().toISOString();

  // Kiểm tra project hiện có cùng tên
  const existing = projects.find((p) => p.name === name);

  const project: SavedProject = {
    id: existing?.id ?? `proj-${Date.now()}`,
    name,
    workspaceXml,
    irProgram,
    mapName,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    Object.assign(existing, project);
  } else {
    projects.push(project);
    // Giới hạn tối đa 20 project đã lưu
    if (projects.length > 20) projects.shift();
  }

  saveProjects(projects);
  setCurrentProject(name);
  return project;
}

export function loadProject(name: string): SavedProject | null {
  const projects = getProjects();
  const project = projects.find((p) => p.name === name);
  if (project) setCurrentProject(name);
  return project ?? null;
}

export function deleteProject(name: string): void {
  const projects = getProjects().filter((p) => p.name !== name);
  saveProjects(projects);
  if (getCurrentProject() === name) {
    localStorage.removeItem(CURRENT_KEY);
  }
}

export function getCurrentProject(): string | null {
  return localStorage.getItem(CURRENT_KEY);
}

function setCurrentProject(name: string): void {
  localStorage.setItem(CURRENT_KEY, name);
}

export function exportProjectJSON(project: SavedProject): string {
  return JSON.stringify(project, null, 2);
}

export function importProjectJSON(json: string): SavedProject | null {
  try {
    return JSON.parse(json) as SavedProject;
  } catch {
    return null;
  }
}
