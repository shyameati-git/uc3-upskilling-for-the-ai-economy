import React from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import { useTranslation } from 'react-i18next';

// Register required Chart.js components
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const EmployeeChart = () => {
  const { t } = useTranslation(); // Access translations

  // Data for Pie chart
  const pieData = {
    labels: [t('active'), t('inactive')], // Translate labels for Pie chart
    datasets: [
      {
        label: t('status_distribution'), // Translate dataset label
        data: [13, 12], // Active and Inactive counts
        backgroundColor: ['#36a2eb', '#ff6384'],
      },
    ],
  };

  // Data for Bar chart
  const barData = {
    labels: [t('january'), t('february'), t('march'), t('april'), t('may')], // Translate months
    datasets: [
      {
        label: t('active_employees'), // Translate "Active Employees"
        data: [8, 12, 5, 7, 11], // Example data for active employees
        backgroundColor: '#36a2eb',
      },
      {
        label: t('inactive_employees'), // Translate "Inactive Employees"
        data: [2, 3, 4, 6, 2], // Example data for inactive employees
        backgroundColor: '#ff6384',
      },
    ],
  };

  // Options for Bar chart
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allow responsive resizing
    plugins: {
      legend: {
        position: 'top', // Position of the legend
      },
      title: {
        display: true,
        text: t('monthly_employee_overview'), // Translate chart title
      },
    },
  };

  // Styles for container and individual chart boxes
  const containerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap', // Ensure responsiveness
    gap: '2rem',
    marginTop: '20px',
    marginBottom: '100px',
  };

  const chartBoxStyle = {
    flex: '1 0 45%', // Shrinks to 45% for larger screens, flexes for smaller
    minWidth: '300px', // Maintain minimum width for small screens
    height: '400px', // Fixed height for charts
    marginBottom: '10px'
  };

  return (
    <div style={containerStyle}>
      {/* Pie Chart */}
      <div style={chartBoxStyle}>
        <h2>{t('status_distribution')}</h2> {/* Translate title */}
        <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false }} />
      </div>

      {/* Bar Chart */}
      <div style={chartBoxStyle}>
        <h2>{t('monthly_performance')}</h2> {/* Translate title */}
        <Bar data={barData} options={barOptions} />
      </div>
    </div>
  );
};

export default EmployeeChart;