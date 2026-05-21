import React from "react";

const ErrorAlertTable = () => {
  // Dummy data for Error/Alert Metrics
  const errorAlertData = [
    {
      errorType: "Scanning Error",
      frequency: 12,
      location: "Aisle 5 / Shelf 2",
      severity: "Medium",
    },
    {
      errorType: "Placement Error",
      frequency: 8,
      location: "Aisle 3 / Shelf 4",
      severity: "High",
    },
    {
      errorType: "Order Mismatch",
      frequency: 5,
      location: "Aisle 8 / Shelf 1",
      severity: "Low",
    },
  ];

  // Inline styles
  const styles = {
    tableContainer: {
      width: "90%",
      textAlign: "left",
    },
    tableHeading: {
      textAlign: "left",
      marginBottom: "20px",
      color: "#333",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    th: {
      padding: "12px",
      border: "1px solid #ccc",
      backgroundColor: "#fef4f4",
      textAlign: "left",
    },
    td: {
      padding: "12px",
      border: "1px solid #ccc",
      textAlign: "left",
    },
    severityHigh: {
      color: "red",
      fontWeight: "bold",
    },
    severityMedium: {
      color: "orange",
      fontWeight: "bold",
    },
    severityLow: {
      color: "green",
      fontWeight: "bold",
    },
    trHover: {
      cursor: "pointer",
      transition: "background-color 0.3s ease",
    },
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case "High":
        return styles.severityHigh;
      case "Medium":
        return styles.severityMedium;
      case "Low":
        return styles.severityLow;
      default:
        return {};
    }
  };

  return (
    <div style={styles.tableContainer}>
      <h2 style={styles.tableHeading}>Error/Alert Metrics</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Error Type</th>
            <th style={styles.th}>Frequency</th>
            <th style={styles.th}>Aisle/Shelf Details</th>
            <th style={styles.th}>Severity Level</th>
          </tr>
        </thead>
        <tbody>
          {errorAlertData.map((row, index) => (
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
              <td style={styles.td}>{row.errorType}</td>
              <td style={styles.td}>{row.frequency}</td>
              <td style={styles.td}>{row.location}</td>
              <td style={{ ...styles.td, ...getSeverityStyle(row.severity) }}>
                {row.severity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ErrorAlertTable;