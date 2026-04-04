import React, { useState } from 'react';
import { useJob } from '../context/JobContext';
import MetricsCard from './MetricsCard';
import IterationGraph from './IterationGraph';

export default function ResultsPanel() {
  const { finalOutput, metrics, iterations } = useJob();
  const [expandedSections, setExpandedSections] = useState({
    output: true,
    source: false,
    metrics: true,
    validation: false,
    graph: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!metrics || !finalOutput) {
    return <p className="text-gray-500">Loading results...</p>;
  }

  const lesson = finalOutput.lesson || finalOutput;
  const sourceContext = finalOutput.source_context || finalOutput.sourceContext || null;

  return (
    <div className="space-y-4">
      {/* Generated Lesson Output */}
      <div className="border rounded-lg">
        <button
          onClick={() => toggleSection('output')}
          className="w-full p-3 bg-gray-100 hover:bg-gray-200 font-semibold text-left flex justify-between items-center"
        >
          <span>📝 Generated Lesson</span>
          <span>{expandedSections.output ? '▼' : '▶'}</span>
        </button>
        {expandedSections.output && (
          <div className="p-4 space-y-3 bg-white">
            <h3 className="text-lg font-bold">{lesson.title || 'Lesson'}</h3>
            <p className="text-sm text-gray-700">{lesson.content}</p>
            {lesson.examples && lesson.examples.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm">Examples:</h4>
                <ul className="text-sm text-gray-600 list-disc pl-4">
                  {lesson.examples.map((ex, i) => (
                    <li key={i}>{ex}</li>
                  ))}
                </ul>
              </div>
            )}
            {lesson.exercise && (
              <div>
                <h4 className="font-semibold text-sm">Exercise:</h4>
                <p className="text-sm text-gray-600">
                  {lesson.exercise.description || 'N/A'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Source Context */}
      {sourceContext && (
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('source')}
            className="w-full p-3 bg-gray-100 hover:bg-gray-200 font-semibold text-left flex justify-between items-center"
          >
            <span>🧭 Source Context</span>
            <span>{expandedSections.source ? '▼' : '▶'}</span>
          </button>
          {expandedSections.source && (
            <div className="p-4 bg-white space-y-3 text-sm">
              <div>
                <h4 className="font-semibold">Lesson Input</h4>
                <pre className="mt-1 p-3 bg-gray-50 rounded overflow-auto">
                  {JSON.stringify(sourceContext.lesson_input, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold">Planner Output</h4>
                <pre className="mt-1 p-3 bg-gray-50 rounded overflow-auto whitespace-pre-wrap">
                  {typeof sourceContext.plan === 'string'
                    ? sourceContext.plan
                    : JSON.stringify(sourceContext.plan, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Report */}
      {iterations && iterations.length > 0 && iterations[iterations.length - 1].validation && (
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('validation')}
            className="w-full p-3 bg-gray-100 hover:bg-gray-200 font-semibold text-left flex justify-between items-center"
          >
            <span>✓ Validation Report</span>
            <span>{expandedSections.validation ? '▼' : '▶'}</span>
          </button>
          {expandedSections.validation && (
            <div className="p-4 bg-white space-y-3 text-sm">
              {(() => {
                const validation = iterations[iterations.length - 1].validation;
                const statusColor = validation.is_valid ? 'text-green-600' : 'text-red-600';
                return (
                  <>
                    <div className={`font-semibold ${statusColor}`}>
                      Status: {validation.is_valid ? '✅ VALID' : '❌ INVALID'}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>Checks Passed: {validation.checks_passed}</div>
                      <div>Checks Failed: {validation.checks_failed}</div>
                      <div>Pass Rate: {(validation.pass_rate * 100).toFixed(1)}%</div>
                    </div>
                    {validation.failed_checks && validation.failed_checks.length > 0 && (
                      <div className="mt-2">
                        <h4 className="font-semibold text-red-600 mb-1">Failed Checks:</h4>
                        <ul className="list-disc list-inside space-y-1 text-red-600">
                          {validation.failed_checks.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs whitespace-pre-wrap break-words">
                      {validation.report}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Metrics Cards */}
      <div className="border rounded-lg">
        <button
          onClick={() => toggleSection('metrics')}
          className="w-full p-3 bg-gray-100 hover:bg-gray-200 font-semibold text-left flex justify-between items-center"
        >
          <span>📊 Metrics</span>
          <span>{expandedSections.metrics ? '▼' : '▶'}</span>
        </button>
        {expandedSections.metrics && (
          <div className="p-4 grid grid-cols-2 gap-3 bg-white">
            <MetricsCard label="Quality Score" value={metrics.quality_score} />
            <MetricsCard label="Clarity" value={metrics.clarity} />
            <MetricsCard label="Correctness" value={metrics.correctness} />
            <MetricsCard label="Pedagogy" value={metrics.pedagogy} />
            <MetricsCard label="Pass Rate" value={metrics.pass_rate} />
            <MetricsCard label="Iterations" value={metrics.iterations} suffix="x" />
            <MetricsCard label="Latency" value={metrics.total_latency} suffix="s" />
            <MetricsCard label="Tokens Used" value={metrics.tokens_used} suffix="tk" />
          </div>
        )}
      </div>

      {/* Iteration Graph */}
      <div className="border rounded-lg">
        <button
          onClick={() => toggleSection('graph')}
          className="w-full p-3 bg-gray-100 hover:bg-gray-200 font-semibold text-left flex justify-between items-center"
        >
          <span>📈 Convergence Graph</span>
          <span>{expandedSections.graph ? '▼' : '▶'}</span>
        </button>
        {expandedSections.graph && (
          <div className="p-4 bg-white">
            <IterationGraph iterations={iterations} />
          </div>
        )}
      </div>
    </div>
  );
}
