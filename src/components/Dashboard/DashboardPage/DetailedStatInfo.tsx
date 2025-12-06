import type React from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface DetailedStatInfoProps {
  title: string;
  data: number[];
  labels: string[];
}

const DetailedStatInfo: React.FC<DetailedStatInfoProps> = ({ title, data, labels }) => {
  // Transform data for Recharts
  const chartData = labels.map((label, index) => ({
    name: label,
    value: data[index],
  }));

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium mb-2">{title} - روند 7 روز گذشته</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="rgb(59, 130, 246)"
            strokeWidth={2}
            dot={{ fill: 'rgb(59, 130, 246)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DetailedStatInfo;
