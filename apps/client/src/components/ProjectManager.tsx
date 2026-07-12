import React, { useState, useCallback } from "react";
import { useSimStore } from "../store/simStore.js";
import {
  saveProject,
  loadProject,
  deleteProject,
  getProjects,
  type SavedProject,
} from "../store/projectStore.js";

interface ProjectManagerProps {
  onLoadWorkspace: (xml: string) => void;
  onGetWorkspaceXml: () => string;
}

export default function ProjectManager({ onLoadWorkspace, onGetWorkspaceXml }: ProjectManagerProps) {
  const [showSave, setShowSave] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [message, setMessage] = useState("");

  const handleSave = useCallback(() => {
    if (!saveName.trim()) {
      setMessage("Enter a project name");
      return;
    }
    const xml = onGetWorkspaceXml();
    try {
      saveProject(saveName.trim(), xml, null, "default");
      setMessage("Saved!");
      setShowSave(false);
      setSaveName("");
      setTimeout(() => setMessage(""), 2000);
    } catch {
      setMessage("Save failed");
    }
  }, [saveName, onGetWorkspaceXml]);

  const handleLoad = useCallback(
    (name: string) => {
      const project = loadProject(name);
      if (project) {
        onLoadWorkspace(project.workspaceXml);
        setMessage("Loaded!");
        setShowLoad(false);
        setTimeout(() => setMessage(""), 2000);
      }
    },
    [onLoadWorkspace],
  );

  const handleDelete = useCallback((name: string) => {
    deleteProject(name);
    setProjects(getProjects());
  }, []);

  const openLoad = useCallback(() => {
    setProjects(getProjects());
    setShowLoad(true);
  }, []);

  return (
    <div className="relative">
      {/* Các nút */}
      <div className="flex gap-1 px-3 py-1.5 bg-surface border-b border-gray-700">
        <button
          onClick={() => setShowSave(!showSave)}
          className="px-2 py-0.5 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300"
        >
          Save
        </button>
        <button
          onClick={openLoad}
          className="px-2 py-0.5 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300"
        >
          Load
        </button>
        {message && (
          <span className="text-xs text-green-400 ml-2 self-center">{message}</span>
        )}
      </div>

      {/* Hộp thoại lưu */}
      {showSave && (
        <div className="absolute top-full left-0 z-20 mt-1 ml-2 w-56 bg-surface border border-gray-600 rounded shadow-lg p-3">
          <h4 className="text-xs text-gray-400 mb-2">Save Project</h4>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Project name..."
            className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white mb-2"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-2 py-1 rounded text-xs bg-accent text-white flex-1"
            >
              Save
            </button>
            <button
              onClick={() => setShowSave(false)}
              className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Hộp thoại nạp */}
      {showLoad && (
        <div className="absolute top-full left-0 z-20 mt-1 ml-2 w-64 bg-surface border border-gray-600 rounded shadow-lg p-3">
          <h4 className="text-xs text-gray-400 mb-2">Load Project</h4>
          {projects.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">No saved projects</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-2 py-1 rounded hover:bg-gray-800"
                >
                  <button
                    onClick={() => handleLoad(p.name)}
                    className="text-xs text-gray-300 hover:text-white text-left flex-1"
                  >
                    {p.name}
                    <span className="text-gray-600 ml-2">
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(p.name)}
                    className="text-xs text-red-500 hover:text-red-400 ml-2"
                    title="Delete"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowLoad(false)}
            className="mt-2 px-2 py-1 rounded text-xs bg-gray-700 text-gray-300 w-full"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
