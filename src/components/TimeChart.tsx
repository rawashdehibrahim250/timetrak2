import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TimeEntry {
  id: string;
  created_at: string;
  description: string;
  start_time: string;
  end_time: string;
  duration: number;
  user_id: string;
  user_email?: string;
}

interface TimeChartProps {
  entries: TimeEntry[];
  title: string;
  isAdmin: boolean;
}

const TimeChart: React.FC<TimeChartProps> = ({ entries, title, isAdmin }) => {
  // Group entries by day
  const groupedByDay = entries.reduce<Record<string, number>>((acc, entry) => {
    const date = new Date(entry.start_time).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    acc[date] = (acc[date] || 0) + entry.duration;
    return acc;
  }, {});

  // Sort days chronologically
  const sortedDays = Object.keys(groupedByDay).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Limit the number of days shown on mobile
  const isMobile = window.innerWidth < 768;
  const displayDays = isMobile ? sortedDays.slice(-7) : sortedDays;

  // Prepare data for chart
  const chartData = {
    labels: displayDays,
    datasets: [
      {
        label: 'Hours Worked',
        data: displayDays.map(day => parseFloat(groupedByDay[day].toFixed(2))),
        backgroundColor: 'rgba(14, 165, 233, 0.7)',
        borderColor: 'rgba(14, 165, 233, 1)',
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: 'rgba(14, 165, 233, 0.9)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: "'Inter', sans-serif",
            size: isMobile ? 10 : 12,
          },
          usePointStyle: true,
          padding: isMobile ? 10 : 20,
        },
      },
      title: {
        display: true,
        text: title,
        font: {
          family: "'Lexend', sans-serif",
          size: isMobile ? 14 : 16,
          weight: '500',
        },
        padding: {
          top: isMobile ? 5 : 10,
          bottom: isMobile ? 10 : 20,
        },
        color: '#1e293b',
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#0f172a',
        bodyColor: '#334155',
        bodyFont: {
          family: "'Inter', sans-serif",
        },
        titleFont: {
          family: "'Inter', sans-serif",
          weight: '600',
        },
        borderColor: 'rgba(203, 213, 225, 0.5)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y;
            const hours = Math.floor(value);
            const minutes = Math.round((value - hours) * 60);
            return `${hours}h ${minutes}m`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: !isMobile,
          text: 'Hours',
          font: {
            family: "'Inter', sans-serif",
            size: 12,
          },
          color: '#64748b',
        },
        grid: {
          color: 'rgba(226, 232, 240, 0.7)',
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: isMobile ? 10 : 12,
          },
          color: '#64748b',
          padding: isMobile ? 4 : 8,
          maxTicksLimit: isMobile ? 5 : 8,
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: isMobile ? 10 : 12,
          },
          color: '#64748b',
          padding: isMobile ? 4 : 8,
          maxRotation: isMobile ? 45 : 0,
        },
      },
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart',
    },
    layout: {
      padding: {
        left: isMobile ? 5 : 10,
        right: isMobile ? 5 : 10,
        top: 0,
        bottom: isMobile ? 5 : 10,
      },
    },
    elements: {
      bar: {
        borderRadius: 4,
      },
    },
  };

  return (
    <div className="h-full w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default TimeChart;