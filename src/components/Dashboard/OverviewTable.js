import React from "react";
import { useTranslation } from "react-i18next";

const OverviewTable = () => {
  const { t } = useTranslation();

  // Internationalized data: Use valid metricKeys for translation
  const overviewData = [
    { metricKey: "Total_Tasks_Completed", value: "430 tasks" },
    { metricKey: "Books_Scanned", value: "1,250 books" },
    { metricKey: "Shelves_Organized", value: "85 shelves" },
    { metricKey: "Task_Success_Rate", value: "92%" },
    { metricKey: "Average_Time_Per_Task", value: "5 minutes 30 seconds" },
    { metricKey: "Most_Used_Feature", value: '"Self Scan" (38%)' },
    { metricKey: "Peak_Usage_Time", value: "2:00 PM - 5:00 PM" },
    { metricKey: "Number_of_Users", value: "15 active users" },
  ];

  const styles = {
    container: {
      width: "100%",
      display: "flex",
      flexDirection: "column",
      marginTop: "20px",
    },
    heading: {
      textAlign: "left",
      color: "#333",
      marginBottom: "20px",
    },
    table: {
      width: "80%",
      marginBottom: "20px",
      borderCollapse: "collapse",
      fontFamily: "Arial, sans-serif",
      border: "1px solid #ddd",
    },
    thead: {
      backgroundColor: "#f4f4f4",
    },
    th: {
      padding: "12px",
      textAlign: "left",
      fontWeight: "bold",
      borderBottom: "2px solid #ddd",
      fontSize: "16px",
    },
    td: {
      padding: "10px 15px",
      borderBottom: "1px solid #ddd",
      fontSize: "14px",
    },
    trHover: {
      cursor: "pointer",
      transition: "background-color 0.3s ease",
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>{t("Overview_Section")}</h2>
      <table style={styles.table}>
        <thead style={styles.thead}>
          <tr>
            <th style={styles.th}>{t("Tasks")}</th>
            <th style={styles.th}>{t("Value")}</th>
          </tr>
        </thead>
        <tbody>
          {overviewData.map((item, index) => (
            <tr
              key={index}
              style={{
                ...styles.trHover,
                backgroundColor: index % 2 === 0 ? "#f9f9f9" : "#fff",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f1f1f1")}
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor =
                  index % 2 === 0 ? "#f9f9f9" : "#fff")
              }
            >
              {/* Translate the metricKey using t() */}
              <td style={styles.td}>{t(`${item.metricKey}`)}</td>
              <td style={styles.td}>{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OverviewTable;