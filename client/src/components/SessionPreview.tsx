import React, { useState } from 'react';
import { Terminal, Play, CheckCircle2, Copy, Check } from 'lucide-react';

interface SessionPreviewProps {
  sessionData?: {
    command: string;
    description: string;
    steps: Array<{
      type: 'user' | 'agent' | 'tool';
      text: string;
    }>;
  };
}

export function SessionPreview({ sessionData }: SessionPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'terminal' | 'raw'>('terminal');

  const defaultSession = {
    command: '/skill execute',
    description: 'Autonomous execution workflow for Claude Code & Cursor',
    steps: [
      { type: 'user', text: 'Analyze this project and generate an actionable optimization report.' },
      { type: 'agent', text: 'Executing skill rules and inspecting local architecture...' },
      { type: 'tool', text: 'kyron_agent_scan(target=".", depth=3) -> Complete. 0 vulnerabilities found.' },
      { type: 'agent', text: 'Audit complete! All 8 security rules satisfied. Optimization plan generated.' }
    ]
  };

  const data = sessionData || defaultSession;

  const copyCommand = () => {
    navigator.clipboard.writeText(data.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-slate-950/90 shadow-2xl overflow-hidden font-mono text-xs">
      {/* Terminal Titlebar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[11px] text-slate-400 pl-2 flex items-center gap-1.5 font-sans">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            Interactive Agent Execution Preview
          </span>
        </div>

        <button
          onClick={copyCommand}
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy Command'}</span>
        </button>
      </div>

      {/* Terminal Body */}
      <div className="p-4 space-y-3 min-h-[160px] max-h-[320px] overflow-y-auto">
        {/* Prompt line */}
        <div className="flex items-center gap-2 text-cyan-400 font-bold">
          <span className="text-slate-500">$</span>
          <span>{data.command}</span>
        </div>

        {/* Workflow steps */}
        <div className="space-y-2.5 pt-1">
          {data.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2.5 leading-relaxed">
              {step.type === 'user' && (
                <>
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] uppercase font-bold shrink-0">
                    USER
                  </span>
                  <span className="text-slate-200">{step.text}</span>
                </>
              )}
              {step.type === 'agent' && (
                <>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] uppercase font-bold shrink-0">
                    AGENT
                  </span>
                  <span className="text-slate-300">{step.text}</span>
                </>
              )}
              {step.type === 'tool' && (
                <>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-bold shrink-0">
                    TOOL
                  </span>
                  <span className="text-emerald-300/90 font-mono text-[11px] bg-slate-900/80 px-2 py-1 rounded border border-emerald-500/20 w-full">
                    {step.text}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
