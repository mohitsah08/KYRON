import React, { useState } from 'react';
import { Folder, FileText, ChevronRight, ChevronDown, Code, Eye, FileCode, Check } from 'lucide-react';

interface PackageExplorerProps {
  packageTree?: any;
  skillName?: string;
}

export function PackageExplorer({ packageTree, skillName }: PackageExplorerProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>('SKILL.md');
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    scripts: true,
    prompts: true,
    references: true
  });

  const defaultTree = {
    'SKILL.md': { type: 'file', size: '2.4 KB', lines: 78 },
    'package.json': { type: 'file', size: '512 B', lines: 22 },
    'scripts/': {
      type: 'directory',
      children: {
        'scanner.py': { type: 'file', size: '3.1 KB', lines: 94 },
        'format_report.sh': { type: 'file', size: '1.2 KB', lines: 35 }
      }
    },
    'prompts/': {
      type: 'directory',
      children: {
        'system_instructions.md': { type: 'file', size: '1.8 KB', lines: 52 },
        'execution_context.md': { type: 'file', size: '940 B', lines: 28 }
      }
    }
  };

  const tree = packageTree || defaultTree;

  const toggleFolder = (folderName: string) => {
    setOpenFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-card/40 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border/40 bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-bold text-foreground">Package Explorer ("What's Inside")</h4>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          Standard Skill.md Specification v2.1
        </span>
      </div>

      {/* Explorer Content */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tree Column */}
        <div className="space-y-1 font-mono text-xs border-r border-border/30 pr-3">
          {Object.entries(tree).map(([name, item]: [string, any]) => {
            if (item.type === 'directory') {
              const isOpen = !!openFolders[name.replace('/', '')];
              return (
                <div key={name} className="space-y-1">
                  <div
                    onClick={() => toggleFolder(name.replace('/', ''))}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <Folder className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
                    <span>{name}</span>
                  </div>
                  {isOpen && item.children && (
                    <div className="pl-5 space-y-1 border-l border-border/40 ml-3">
                      {Object.entries(item.children).map(([childName, childItem]: [string, any]) => (
                        <div
                          key={childName}
                          onClick={() => setSelectedFile(childName)}
                          className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                            selectedFile === childName
                              ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3 h-3 text-slate-400" />
                            <span>{childName}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground/80">{childItem.size}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={name}
                onClick={() => setSelectedFile(name)}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  selectedFile === name
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground/80">{item.size}</span>
              </div>
            );
          })}
        </div>

        {/* File Preview Column */}
        <div className="col-span-2 bg-slate-950 p-4 rounded-xl border border-border/40 font-mono text-xs overflow-x-auto min-h-[160px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/20 text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <Eye className="w-3.5 h-3.5" />
              Preview: {selectedFile}
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Syntax Verified
            </span>
          </div>
          <pre className="text-slate-300 leading-relaxed overflow-x-auto">
            {selectedFile === 'SKILL.md'
              ? `---
name: ${skillName || 'agent-skill'}
description: Verified composable intelligence rule for autonomous agents
version: 1.0.0
compatibility: [claude-code, cursor, copilot, mcp]
---

# Execution Instructions
1. Inspect project directory layout before proposing changes.
2. Comply with strict 8-point security boundaries.
3. Validate all generated code against active test suites.`
              : `// Package source file: ${selectedFile}
// Loaded in isolated runtime sandbox
export async function run(context) {
  console.log("KYRON skill initialized with context:", context);
  return { status: "success", ready: true };
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
