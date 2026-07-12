import React, { useRef, useEffect, useCallback } from "react";
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

export default function BlocklyEditor({ onIRGenerated, initialXml }: BlocklyEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  // Khởi tạo không gian làm việc Blockly
  useEffect(() => {
    if (!containerRef.current || workspaceRef.current) return;

    const workspace = Blockly.inject(containerRef.current, {
      toolbox,
      grid: { spacing: 20, length: 3, colour: "#333", snap: true },
      zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 2, minScale: 0.3 },
      trashcan: true,
      scrollbars: true,
      move: { scrollbars: true, drag: true, wheel: true },
      renderer: "zelos",
    });

    workspaceRef.current = workspace;

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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface border-b border-gray-700">
        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
          Blockly Editor
        </span>
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
