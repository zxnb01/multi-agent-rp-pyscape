import React from 'react';
import { useJob } from '../context/JobContext';
import ControlPanel from './ControlPanel';
import ExecutionTrace from './ExecutionTrace';
import ResultsPanel from './ResultsPanel';

export default function Layout() {
  const { status } = useJob();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">
          PyScape UI – Multi-Agent Observability Console
        </h1>

        <div className="grid grid-cols-3 gap-6 auto-rows-max">
          {/* Left Panel: Control */}
          <div className="bg-white rounded-lg shadow-md p-6 min-h-96">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Control Panel</h2>
            <ControlPanel />
          </div>

          {/* Center Panel: Execution Trace */}
          <div className="bg-white rounded-lg shadow-md p-6 min-h-96 overflow-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Execution Trace</h2>
            {status ? <ExecutionTrace /> : <p className="text-gray-500">No job running</p>}
          </div>

          {/* Right Panel: Results */}
          <div className="bg-white rounded-lg shadow-md p-6 min-h-96 overflow-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Results & Metrics</h2>
            {status === 'completed' ? (
              <ResultsPanel />
            ) : (
              <p className="text-gray-500">
                {status === null
                  ? 'Run a job to see results'
                  : `Job status: ${status}`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
