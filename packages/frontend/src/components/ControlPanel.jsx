import React, { useState } from 'react';
import { useJob } from '../context/JobContext';

export default function ControlPanel() {
  const { createJob, resetJob, status, loading, systemType, setSystemType } = useJob();

  const [lessonInput, setLessonInput] = useState({
    title: 'Regular Expressions',
    type: 'projects',
    level: 4,
    module_id: 12,
    skill_id: 'skill-123',
  });

  const [config, setConfig] = useState({
    max_iterations: 3,
    quality_threshold: 0.85,
    use_critic: true,
    use_refiner: true,
    use_memory: false,
  });

  const isRunning = status === 'running' || status === 'pending';

  const handleLessonInputChange = (field, value) => {
    setLessonInput((prev) => ({
      ...prev,
      [field]: field === 'level' ? parseInt(value) : value,
    }));
  };

  const handleConfigChange = (field, value) => {
    if (field === 'max_iterations' || field === 'quality_threshold') {
      setConfig((prev) => ({
        ...prev,
        [field]: field === 'max_iterations' ? parseInt(value) : parseFloat(value),
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSystemTypeChange = (newMode) => {
    setSystemType(newMode);
  };

  const handleRunJob = async () => {
    await createJob(lessonInput, config);
  };

  const handleReset = () => {
    resetJob();
    setLessonInput({
      title: 'Regular Expressions',
      type: 'projects',
      level: 4,
      module_id: 12,
      skill_id: 'skill-123',
    });
  };

  // Determine which ablations to show based on systemType
  const shouldShowCritic = systemType === 'multi_agent';
  const shouldShowRefiner = systemType === 'multi_agent';
  const shouldShowMemory = systemType === 'multi_agent';
  const showIterationControl = systemType === 'multi_agent' || systemType === 'pipeline';

  return (
    <div className="space-y-4">
      {/* Lesson Input */}
      <div className="border-b pb-4">
        <h3 className="font-semibold mb-2">Lesson Input</h3>
        <input
          type="text"
          placeholder="Title"
          value={lessonInput.title}
          onChange={(e) => handleLessonInputChange('title', e.target.value)}
          disabled={isRunning}
          className="w-full px-3 py-2 border border-gray-300 rounded mb-2 disabled:bg-gray-100"
        />
        <select
          value={lessonInput.level}
          onChange={(e) => handleLessonInputChange('level', e.target.value)}
          disabled={isRunning}
          className="w-full px-3 py-2 border border-gray-300 rounded mb-2 disabled:bg-gray-100"
        >
          <option value={1}>L1 (Beginner)</option>
          <option value={2}>L2 (Elementary)</option>
          <option value={3}>L3 (Intermediate)</option>
          <option value={4}>L4 (Advanced)</option>
          <option value={5}>L5 (Expert)</option>
        </select>
      </div>

      {/* Mode Selection */}
      <div className="border-b pb-4">
        <h3 className="font-semibold mb-3">Execution Mode</h3>
        <div className="space-y-2">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="mode"
              value="single_llm"
              checked={systemType === 'single_llm'}
              onChange={(e) => handleSystemTypeChange(e.target.value)}
              disabled={isRunning}
              className="disabled:opacity-50"
            />
            <span className="flex-1">
              <span className="font-medium">Single LLM</span>
              <p className="text-xs text-gray-500">Direct generation (no planning)</p>
            </span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="mode"
              value="pipeline"
              checked={systemType === 'pipeline'}
              onChange={(e) => handleSystemTypeChange(e.target.value)}
              disabled={isRunning}
              className="disabled:opacity-50"
            />
            <span className="flex-1">
              <span className="font-medium">Pipeline</span>
              <p className="text-xs text-gray-500">Planner → Generator → Validator</p>
            </span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="mode"
              value="multi_agent"
              checked={systemType === 'multi_agent'}
              onChange={(e) => handleSystemTypeChange(e.target.value)}
              disabled={isRunning}
              className="disabled:opacity-50"
            />
            <span className="flex-1">
              <span className="font-medium">Multi-Agent</span>
              <p className="text-xs text-gray-500">Full iterative loop with Critic/Refiner</p>
            </span>
          </label>
        </div>
      </div>

      {/* Ablation Controls - Mode-Specific */}
      {(shouldShowCritic || shouldShowRefiner || shouldShowMemory) && (
        <div className="border-b pb-4">
          <h3 className="font-semibold mb-2">Ablations</h3>
          {shouldShowCritic && (
            <label className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                checked={config.use_critic}
                onChange={(e) => handleConfigChange('use_critic', e.target.checked)}
                disabled={isRunning}
                className="disabled:opacity-50"
              />
              <span>Use Critic</span>
            </label>
          )}
          {shouldShowRefiner && (
            <label className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                checked={config.use_refiner}
                onChange={(e) => handleConfigChange('use_refiner', e.target.checked)}
                disabled={isRunning}
                className="disabled:opacity-50"
              />
              <span>Use Refiner</span>
            </label>
          )}
          {shouldShowMemory && (
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.use_memory}
                onChange={(e) => handleConfigChange('use_memory', e.target.checked)}
                disabled={isRunning}
                className="disabled:opacity-50"
              />
              <span>Use Memory</span>
            </label>
          )}
        </div>
      )}

      {/* Config Parameters - Mode-Specific */}
      <div className="border-b pb-4">
        <h3 className="font-semibold mb-2">Parameters</h3>

        {showIterationControl && (
          <label className="block mb-2">
            <span className="text-sm">
              Max Iterations {systemType === 'pipeline' || systemType === 'single_llm' ? '(fixed to 1)' : ''}
            </span>
            <input
              type="number"
              min="1"
              max="10"
              value={config.max_iterations}
              onChange={(e) => handleConfigChange('max_iterations', e.target.value)}
              disabled={isRunning || systemType !== 'multi_agent'}
              className="w-full px-3 py-2 border border-gray-300 rounded mt-1 disabled:bg-gray-100"
            />
          </label>
        )}

        <label className="block">
          <span className="text-sm">Quality Threshold</span>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={config.quality_threshold}
            onChange={(e) => handleConfigChange('quality_threshold', e.target.value)}
            disabled={isRunning}
            className="w-full px-3 py-2 border border-gray-300 rounded mt-1 disabled:bg-gray-100"
          />
        </label>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={handleRunJob}
          disabled={isRunning || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
        >
          {loading ? 'Starting...' : isRunning ? 'Job Running...' : 'Run Job'}
        </button>
        <button
          onClick={handleReset}
          disabled={!status}
          className="w-full bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
