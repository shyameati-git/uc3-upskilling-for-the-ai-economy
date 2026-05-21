import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useTranslation } from "react-i18next";

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

const TaskInsightsPieChart = () => {
  const { t } = useTranslation();

  // Dummy data for task insights
  const data = {
    labels: [
      "Shelves Scanned",
      "Books Organized",
      "Shelves Fixed",
      "Correct Order",
      "Errors Detected",
    ], // Pie chart sections
    datasets: [
      {
        label: "Task Insights",
        data: [45, 30, 15, 8, 2], // Example data values (you can add real data here)
        backgroundColor: [
          "#4CAF50", // Shelves Scanned: Green
          "#2196F3", // Books Organized: Blue
          "#FF9800", // Shelves Fixed: Orange
          "#9C27B0", // Correct Order: Purple
          "#F44336", // Errors Detected: Red
        ],
        borderColor: ["#FFFFFF"],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        position: "top", // Legend position
        labels: {
          color: "#333", // Customize labels (text color)
        },
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem) {
            return `${tooltipItem.label}: ${tooltipItem.raw}%`;
          },
        },
      },
    },
    maintainAspectRatio: false, // To allow custom width/height
  };

  // Render the pie chart
  return (
    <div style={{ width: "500px", height: "500px",  textAlign: "left", margin: "20px auto" }}>
      <h2 style={{ marginBottom: "20px", color: "#333" }}>
        {t("task_insight")}
      </h2>
      <Pie data={data} options={options} />
    </div>
  );
};

export default TaskInsightsPieChart;