import React from "react";
import { Table } from "antd";
import { useTranslation } from "react-i18next";
import dataSource from '../../data.json';

const EmployeeTable = () => {
  const { t } = useTranslation();
  const columns = [
    {
      title: t("table_header_id"), // Correctly translated
      dataIndex: "id",
      key: "id",
    },
    {
      title: t("table_header_name"), // Correctly translated
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    {
      title: t("table_header_status"), // Correctly translated
      dataIndex: "status",
      key: "status",
      render: (text) => t(text), // Translate status values ("active", "inactive")
      sorter: (a, b) => a.status.localeCompare(b.status)
    },
  ];

  return <Table dataSource={dataSource} columns={columns} />;
};

export default EmployeeTable;