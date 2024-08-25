import type React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DetailedStatInfoProps {
  title: string;
  data: number[];
  labels: string[];
}

const DetailedStatInfo: React.FC<DetailedStatInfoProps> = ({ title, data, labels }) => {
  const chartData = {
    labels,
    datasets: [
      {
        label: title,
        data,
        borderColor: 'rgb(59, 130, 246)', // Tailwind blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.1
      }
    ]
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${title} - روند 7 روز گذشته`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      }
    }
  };

  return (
    <div className="mt-4">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default DetailedStatInfo;