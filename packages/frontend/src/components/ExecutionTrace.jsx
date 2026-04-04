import React, { useState } from 'react';
import { useJob } from '../context/JobContext';

export default function ExecutionTrace() {
  const { iterations, status } = useJob();
  const [expandedValidation, setExpandedValidation] = useState(null);

  if (!iterations || iterations.length === 0) {
    return <p className="text-gray-500">Waiting for iterations...</p>;
  }

  return (
    <div className="space-y-3">
      {/* Pipeline stages header */}
      <div className="flex justify-between items-center text-sm font-semibold text-gray-600 pb-2 border-b">
        <span>Pipeline Stages</span>
        <span>Planner → Generator → Critic → Refiner → Validator</span>
      </div>

      {/* Iterations list */}
      <div className="space-y-2">
        {iterations.map((iteration, idx) => {
          const prevScore = idx > 0 ? iterations[idx - 1].score : null;
          const delta = prevScore ? (iteration.score - prevScore).toFixed(3) : 'N/A';
          const improvement = prevScore && iteration.score > prevScore ? '📈' : '➡️';
          const validationStatus = iteration.validation?.is_valid ? '✅' : '❌';
          const isExpanded = expandedValidation === idx;

          return (
            <div
              key={idx}
              className="border rounded p-3 bg-gray-50 hover:bg-gray-100 transition"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-800">
                  Iteration {iteration.iteration}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    Score: {iteration.score.toFixed(3)}
                  </span>
                  <span
                    className="text-lg cursor-pointer hover:opacity-70"
                    onClick={() => setExpandedValidation(isExpanded ? null : idx)}
                    title={validationStatus === '✅' ? 'Validation Passed' : 'Validation Failed'}
                  >
                    {validationStatus}
                  </span>
                </div>
              </div>

              <div className="flex gap-4 text-xs text-gray-600">
                <span>{improvement} Delta: {delta}</span>
                {iteration.consistency_flag && (
                  <span className="text-yellow-600 font-semibold">⚠️ Unstable</span>
                )}
              </div>

              {/* Metrics details */}
              {iteration.metrics && (
                <div className="mt-2 text-xs grid grid-cols-2 gap-2 bg-white p-2 rounded">
                  <span>Clarity: {iteration.metrics.clarity?.toFixed(3)}</span>
                  <span>Correctness: {iteration.metrics.correctness?.toFixed(3)}</span>
                  <span>Pedagogy: {iteration.metrics.pedagogy?.toFixed(3)}</span>
                  <span>Pass Rate: {iteration.metrics.pass_rate?.toFixed(3)}</span>
                </div>
              )}

              {/* Validation details (expandable) */}
              {isExpanded && iteration.validation && (
                <div className="mt-3 p-2 bg-white rounded border-l-4 border-blue-400 text-xs space-y-1">
                  <div className="font-semibold text-gray-800">Validation Report:</div>
                  <div>Checks Passed: {iteration.validation.checks_passed}</div>
                  <div>Checks Failed: {iteration.validation.checks_failed}</div>
                  {iteration.validation.failed_checks && iteration.validation.failed_checks.length > 0 && (
                    <div className="mt-1">
                      <div className="font-semibold text-red-600">Issues:</div>
                      <ul className="list-disc list-inside ml-1 text-red-600">
                        {iteration.validation.failed_checks.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status indicator */}
      <div className="mt-4 p-2 text-sm bg-blue-50 text-blue-800 rounded">
        {status === 'running' ? (
          <span>⏱️ Job running... ({iterations.length} iterations)</span>
        ) : (
          <span>✓ Completed ({iterations.length} iterations)</span>
        )}
      </div>
    </div>
  );
}
