import React from 'react';

export default function MetricsCard({ label, value, suffix = '' }) {
  // Determine color based on value
  let bgColor = 'bg-gray-50';
  if (typeof value === 'number') {
    if (value >= 0.8) bgColor = 'bg-green-50';
    else if (value >= 0.6) bgColor = 'bg-yellow-50';
    else bgColor = 'bg-red-50';
  }

  const displayValue =
    typeof value === 'number' ? value.toFixed(3) : value;

  return (
    <div className={`${bgColor} border border-gray-200 rounded-lg p-4 text-center`}>
      <p className="text-sm text-gray-600 font-semibold uppercase mb-2">{label}</p>
      <p className="text-2xl font-bold text-gray-900">
        {displayValue}
        <span className="text-sm text-gray-600 ml-1">{suffix}</span>
      </p>
    </div>
  );
}
