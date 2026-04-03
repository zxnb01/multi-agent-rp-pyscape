import React from 'react';
import { useJob } from '../context/JobContext';

export default function ExecutionTrace() {
  const { iterations, status } = useJob();

  if (!iterations || iterations.length === 0) {
    return <p className="text-gray-500">Waiting for iterations...</p>;
  }

  return (
    <div className="space-y-3">
      {/* Pipeline stages header */}
      <div className="flex justify-between items-center text-sm font-semibold text-gray-600 pb-2 border-b">
        <span>Pipeline Stages</span>
        <span>Planner → Generator → Critic → Refiner</span>
      </div>

      {/* Iterations list */}
      <div className="space-y-2">
        {iterations.map((iteration, idx) => {
          const prevScore = idx > 0 ? iterations[idx - 1].score : null;
          const delta = prevScore ? (iteration.score - prevScore).toFixed(3) : 'N/A';
          const improvement = prevScore && iteration.score > prevScore ? '📈' : '➡️';

          return (
            <div
              key={idx}
              className="border rounded p-3 bg-gray-50 hover:bg-gray-100 transition"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-800">
                  Iteration {iteration.iteration}
                </span>
                <span className="text-sm text-gray-600">
                  Score: {iteration.score.toFixed(3)}
                </span>
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
