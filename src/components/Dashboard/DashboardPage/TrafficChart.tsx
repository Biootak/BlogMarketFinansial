'use client';

import type React from 'react';
import { motion } from 'framer-motion';
import { HiOutlineChartBar } from 'react-icons/hi2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartData,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface TrafficChartProps {
  data: number[];
  labels: string[];
}

const TrafficChart: React.FC<TrafficChartProps> = ({ data, labels }) => {
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: 'rgba(75, 85, 99, 1)',
          font: {
            size: 12,
            weight: 'bold',
          },
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        reverse: true,
        position: 'top' as const,
        grid: {
          color: 'rgba(75, 85, 99, 0.1)',
        },
        ticks: {
          color: 'rgba(75, 85, 99, 0.8)',
        },
      },
      y: {
        position: 'right' as const,
        grid: {
          color: 'rgba(75, 85, 99, 0.1)',
        },
        ticks: {
          color: 'rgba(75, 85, 99, 0.8)',
        },
      },
    },
  };

  const chartData: ChartData<'line'> = {
    labels,
    datasets: [
      {
        label: 'بازدید',
        data,
        borderColor: 'rgb(129, 140, 248)',
        backgroundColor: 'rgba(129, 140, 248, 0.5)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(129, 140, 248)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(129, 140, 248)',
      },
    ],
  };

  return (
    <div
      dir="rtl"
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8  transition-all duration-300 hover:shadow-xl"
    >
      <h3 className="text-xl font-bold mb-6 dark:text-white flex items-center">
        <HiOutlineChartBar className="w-7 h-7 ml-3 text-indigo-500" />
        آمار بازدید
      </h3>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="h-72 pt-4"
      >
        <Line options={options} data={chartData} />
      </motion.div>
    </div>
  );
};

export default TrafficChart;
