import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Loader2, CheckCircle2, XCircle, Play, Sparkles, Terminal, FileCode2 } from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';

// For simplicity, hardcode the known problems or fetch them.
const KNOWN_PROBLEMS = [
  { id: 'two-sum', label: 'Two Sum' },
  { id: 'reverse-linked-list', label: 'Reverse Linked List' },
];

export default function DsaManagement() {
  const [selectedProblem, setSelectedProblem] = useState(KNOWN_PROBLEMS[0].id);
  const [contributions, setContributions] = useState([]);
  const [generatorCode, setGeneratorCode] = useState('');
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [loadingGenerator, setLoadingGenerator] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [runningGenerator, setRunningGenerator] = useState(false);
  const [runResult, setRunResult] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedProblem]);

  const fetchData = async () => {
    setLoadingContributions(true);
    setLoadingGenerator(true);
    try {
      // 1. Fetch contributions
      const resContrib = await api.problems.listContributions(selectedProblem);
      if (resContrib && resContrib.contributions) {
        setContributions(resContrib.contributions.filter(c => c.status === 'pending'));
      } else {
        setContributions([]);
      }

      // 2. Fetch generator code
      const resGen = await api.request(`/problems/${selectedProblem}/testcase-generator`);
      if (resGen && resGen.exists) {
        setGeneratorCode(resGen.code);
      } else {
        setGeneratorCode('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContributions(false);
      setLoadingGenerator(false);
    }
  };

  const handleApprove = async (index) => {
    try {
      await api.problems.approveContribution(selectedProblem, index);
      fetchData();
      alert('Approved successfully.');
    } catch (e) {
      console.error(e);
      alert('Error approving.');
    }
  };

  const handleReject = async (index) => {
    try {
      await api.problems.rejectContribution(selectedProblem, index);
      fetchData();
      alert('Rejected successfully.');
    } catch (e) {
      console.error(e);
      alert('Error rejecting.');
    }
  };

  const handleGenerateAi = async () => {
    setGeneratingAi(true);
    try {
      const res = await api.request(`/problems/${selectedProblem}/testcase-generator/generate`, { method: 'POST' });
      if (res && res.code) {
        setGeneratorCode(res.code);
        alert('Generator created by AI!');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate AI code.');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleRunGenerator = async () => {
    setRunningGenerator(true);
    setRunResult(null);
    try {
      const res = await api.request(`/problems/${selectedProblem}/testcase-generator/run`, {
        method: 'POST',
        body: JSON.stringify({ count: 10, mode: 'stress' })
      });
      setRunResult(res);
    } catch (e) {
      console.error(e);
      alert('Failed to run generator.');
    } finally {
      setRunningGenerator(false);
    }
  };

  return (
    <div className="p-6 text-stone-200">
      <h2 className="text-2xl font-bold mb-6">DSA Testcase Management</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-stone-400 mb-2">Select Problem</label>
        <select 
          value={selectedProblem} 
          onChange={(e) => setSelectedProblem(e.target.value)}
          className="bg-[#2d2d2d] border border-[#3c3c3c] rounded px-4 py-2 w-full max-w-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          {KNOWN_PROBLEMS.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Generator Section */}
        <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl p-5 shadow-sm flex flex-col h-[600px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-teal-400" />
              Testcase Generator
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={handleGenerateAi}
                disabled={generatingAi}
                className="bg-[#2d2d2d] hover:bg-[#3c3c3c] text-stone-200 px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium border border-[#3c3c3c]"
              >
                {generatingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-purple-400" />}
                Generate with AI
              </button>
              <button 
                onClick={handleRunGenerator}
                disabled={runningGenerator || !generatorCode}
                className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium"
              >
                {runningGenerator ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Run Stress Test
              </button>
            </div>
          </div>
          
          <div className="flex-1 rounded overflow-hidden border border-[#3c3c3c] mb-4">
            {loadingGenerator ? (
              <div className="flex justify-center items-center h-full text-stone-500"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <MonacoEditor
                language="python"
                theme="vs-dark"
                value={generatorCode}
                options={{ readOnly: true, minimap: { enabled: false } }}
              />
            )}
          </div>
          
          {runResult && (
            <div className="bg-[#252526] p-3 rounded border border-[#3c3c3c] text-sm font-mono">
              <p className="text-emerald-400 font-bold mb-1">{runResult.message}</p>
              <p className="text-stone-400">Errors: {runResult.errors}</p>
              <p className="text-stone-400">Total Cases now: {runResult.total_test_cases}</p>
            </div>
          )}
        </div>

        {/* Contributions Section */}
        <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl p-5 shadow-sm h-[600px] overflow-y-auto">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Terminal className="w-5 h-5 text-teal-400" />
            Community Contributions ({contributions.length})
          </h3>
          
          {loadingContributions ? (
            <div className="flex justify-center p-8 text-stone-500"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : contributions.length === 0 ? (
            <p className="text-stone-500 italic text-sm">No pending contributions for this problem.</p>
          ) : (
            <div className="space-y-4">
              {contributions.map((c, i) => (
                <div key={i} className="bg-[#252526] p-4 rounded-lg border border-[#3c3c3c]">
                  <div className="mb-3">
                    <span className="text-xs text-stone-500 uppercase tracking-wider block mb-1">Input</span>
                    <div className="bg-[#1e1e1e] p-2 rounded text-stone-300 font-mono text-sm border border-[#2d2d2d]">{c.input}</div>
                  </div>
                  <div className="mb-3">
                    <span className="text-xs text-stone-500 uppercase tracking-wider block mb-1">Expected Output</span>
                    <div className="bg-[#1e1e1e] p-2 rounded text-stone-300 font-mono text-sm border border-[#2d2d2d]">{c.expected}</div>
                  </div>
                  {c.description && (
                    <div className="mb-4">
                      <span className="text-xs text-stone-500 uppercase tracking-wider block mb-1">Explanation</span>
                      <p className="text-sm text-stone-300">{c.description}</p>
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => handleReject(i)} className="p-1.5 text-stone-400 hover:text-rose-400 transition-colors bg-[#2d2d2d] rounded" title="Reject">
                      <XCircle className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleApprove(i)} className="p-1.5 text-stone-400 hover:text-emerald-400 transition-colors bg-[#2d2d2d] rounded" title="Approve">
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
