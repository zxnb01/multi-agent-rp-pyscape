import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function IterationGraph({ iterations }) {
  if (!iterations || iterations.length === 0) {
    return <p className="text-gray-500 text-center h-64 flex items-center justify-center">No data</p>;
  }

  // Prepare data for chart
  const chartData = iterations.map((it) => ({
    iteration: it.iteration,
    score: it.score,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="iteration"
          label={{ value: 'Iteration', position: 'insideBottomRight', offset: -5 }}
        />
        <YAxis
          domain={[0, 1]}
          label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip formatter={(value) => value.toFixed(3)} />
        <Legend />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#3b82f6"
          dot={{ fill: '#3b82f6', r: 4 }}
          activeDot={{ r: 6 }}
          name="Quality Score"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
