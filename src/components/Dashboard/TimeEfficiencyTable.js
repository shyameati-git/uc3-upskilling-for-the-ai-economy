import React, { useState } from "react";

const TimeEfficiencyTable = () => {
  // Full dataset with dates and times
  const allTimeEfficiencyData = [
    {
      taskType: "Shelves Scanned",
      avgTime: "2 minutes",
      completedOnTime: "95%",
      delayed: "5%",
      date: "2023-10-01",
      time: "10:00", // Time in HH:mm format
    },
    {
      taskType: "Books Organized",
      avgTime: "3 minutes",
      completedOnTime: "90%",
      delayed: "10%",
      date: "2023-10-05",
      time: "14:00",
    },
    {
      taskType: "Shelves Fixed",
      avgTime: "5 minutes",
      completedOnTime: "85%",
      delayed: "15%",
      date: "2023-10-10",
      time: "09:30",
    },
    {
      taskType: "Books Organized",
      avgTime: "3.5 minutes",
      completedOnTime: "88%",
      delayed: "12%",
      date: "2023-10-12",
      time: "16:00",
    },
    // Data for 2026
    {
      taskType: "Shelves Scanned",
      avgTime: "2.2 minutes",
      completedOnTime: "93%",
      delayed: "7%",
      date: "2026-05-20",
      time: "10:45",
    },
    {
      taskType: "Books Organized",
      avgTime: "2.8 minutes",
      completedOnTime: "96%",
      delayed: "4%",
      date: "2026-07-15",
      time: "13:30",
    },
    {
      taskType: "Shelves Fixed",
      avgTime: "4.5 minutes",
      completedOnTime: "92%",
      delayed: "8%",
      date: "2026-08-10",
      time: "11:15",
    },
  ];

  // State for filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Filter the dataset based on date and time range
  const filteredData = allTimeEfficiencyData.filter((row) => {
    // Filter by date range
    if (startDate && new Date(row.date) < new Date(startDate)) {
      return false;
    }
    if (endDate && new Date(row.date) > new Date(endDate)) {
      return false;
    }

    // Filter by time range
    if (startTime && row.time < startTime) {
      return false;
    }
    if (endTime && row.time > endTime) {
      return false;
    }

    return true;
  });

  // Inline styles
  const styles = {
    tableContainer: {
      width: "90%",
      textAlign: "left",
      margin: "20px auto",
    },
    tableHeading: {
      textAlign: "left",
      marginBottom: "20px",
      color: "#333",
    },
    filterContainer: {
      marginBottom: "20px",
      display: "flex",
      alignItems: "center",
      gap: "15px",
      flexWrap: "wrap",
    },
    label: {
      fontSize: "16px",
      fontWeight: "500",
    },
    input: {
      padding: "8px",
      fontSize: "14px",
      border: "1px solid #ccc",
      borderRadius: "4px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    th: {
      padding: "12px",
      border: "1px solid #ccc",
      backgroundColor: "#f4f4f4",
      textAlign: "left",
    },
    td: {
      padding: "12px",
      border: "1px solid #ccc",
      textAlign: "left",
    },
    trHover: {
      cursor: "pointer",
      transition: "background-color 0.3s ease",
    },
  };

  return (
    <div style={styles.tableContainer}>
      <h2 style={styles.tableHeading}>Time/Efficiency Metrics</h2>

      {/* Date & Time Range Filters */}
      <div style={styles.filterContainer}>
        {/* Date Filters */}
        <label style={styles.label} htmlFor="start-date">
          Start Date:
        </label>
        <input
          type="date"
          id="start-date"
          style={styles.input}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)} // Update the start date
        />
        <label style={styles.label} htmlFor="end-date">
          End Date:
        </label>
        <input
          type="date"
          id="end-date"
          style={styles.input}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)} // Update the end date
        />

        {/* Time Filters */}
        <label style={styles.label} htmlFor="start-time">
          Start Time:
        </label>
        <input
          type="time"
          id="start-time"
          style={styles.input}
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)} // Update the start time
        />
        <label style={styles.label} htmlFor="end-time">
          End Time:
        </label>
        <input
          type="time"
          id="end-time"
          style={styles.input}
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)} // Update the end time
        />
      </div>

      {/* Table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Task Type</th>
            <th style={styles.th}>Average Time Per Task</th>
            <th style={styles.th}>Tasks Completed On Time (%)</th>
            <th style={styles.th}>Tasks Delayed (%)</th>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Time</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((row, index) => (
            <tr
              key={index}
              style={{
                backgroundColor: index % 2 === 0 ? "#f9f9f9" : "#fff",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#f1f1f1")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor =
                  index % 2 === 0 ? "#f9f9f9" : "#fff")
              }
            >
              <td style={styles.td}>{row.taskType}</td>
              <td style={styles.td}>{row.avgTime}</td>
              <td style={styles.td}>{row.completedOnTime}</td>
              <td style={styles.td}>{row.delayed}</td>
              <td style={styles.td}>{row.date}</td>
              <td style={styles.td}>{row.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TimeEfficiencyTable;