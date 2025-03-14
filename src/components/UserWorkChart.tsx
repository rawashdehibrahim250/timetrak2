import React, { useMemo } from 'react';
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
import { Users } from 'lucide-react';

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

interface UserWorkChartProps {
  entries: TimeEntry[];
}

const UserWorkChart: React.FC<UserWorkChartProps> = ({ entries }) => {
  const isMobile = window.innerWidth < 768;
  
  const userData = useMemo(() => {
    // Group entries by user
    const userHours: Record<string, number> = {};
    
    entries.forEach(entry => {
      if (!entry.user_email) return;
      
      const userEmail = entry.user_email;
      if (!userHours[userEmail]) {
        userHours[userEmail] = 0;
      }
      
      userHours[userEmail] += entry.duration;
    });
    
    // Sort users by hours worked (descending)
    const sortedUsers = Object.entries(userHours)
      .sort((a, b) => b[1] - a[1])
      .slice(0, isMobile ? 5 : 10); // Limit to top 5 users on mobile, 10 on desktop
    
    // Truncate email addresses on mobile
    const labels = sortedUsers.map(([email]) => {
      if (isMobile && email.length > 15) {
        const parts = email.split('@');
        return `${parts[0].substring(0, 8)}...@${parts[1].substring(0, 5)}...`;
      }
      return email;
    });
    
    return {
      labels,
      data: sortedUsers.map(([_, hours]) => parseFloat(hours.toFixed(2))),
      originalEmails: sortedUsers.map(([email]) => email),
    };
  }, [entries, isMobile]);

  const chartData = {
    labels: userData.labels,
    datasets: [
      {
        label: 'Total Hours',
        data: userData.data,
        backgroundColor: 'rgba(139, 92, 246, 0.7)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: 'rgba(139, 92, 246, 0.9)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const, // Horizontal bar chart
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
        text: 'Hours Worked by User',
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
          title: function(tooltipItems: any) {
            // Show full email in tooltip
            const index = tooltipItems[0].dataIndex;
            return userData.originalEmails[index];
          },
          label: function(context: any) {
            const value = context.parsed.x;
            const hours = Math.floor(value);
            const minutes = Math.round((value - hours) * 60);
            return `${hours}h ${minutes}m`;
          }
        }
      }
    },
    scales: {
      x: {
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
      y: {
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
  };

  if (userData.labels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-neutral-50 rounded-lg border border-neutral-200">
        <div className="bg-neutral-100 rounded-full p-3 mb-3">
          <Users className="h-6 w-6 text-neutral-400" />
        </div>
        <p className="text-neutral-500 font-medium">No data available for chart</p>
        <p className="text-sm text-neutral-400 mt-1">Add time entries to see user work distribution</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default UserWorkChart;