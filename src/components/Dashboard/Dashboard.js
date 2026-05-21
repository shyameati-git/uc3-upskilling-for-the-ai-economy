import React, { useState, useEffect} from 'react';
import EmployeeChart from './EmployeeChart'; // Adjust the path based on your folder structure
import { Table, Select, Input } from 'antd'; // Use Select and Input components from Ant Design
import { useTranslation } from 'react-i18next';
import dataSource from '../../data.json'; // Import the JSON data
import OverviewTable from './OverviewTable'
import TaskInsightsPieChart from './TaskInsights'
import ErrorAlertTable from './ErrorAlertTable'
import TimeEfficiencyTable from './TimeEfficiencyTable'

const { Option } = Select; // Option for dropdown
const { Search } = Input; // Search input for filtering
const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const [filteredData, setFilteredData] = useState(dataSource); // State for filtered data
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  // Function to change language
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng); // Change the language dynamically in i18n
    setCurrentLanguage(lng); // Update the dropdown state
  };

  useEffect(() => {
    setCurrentLanguage(i18n.language); // Sync dropdown to i18n's current language
  }, [i18n.language]);

  // Search Functionality: Filter by Buddy ID
  const handleSearch = (value) => {
    const filtered = dataSource.filter((item) =>
      item.id.toString().includes(value) || item.name.toLowerCase().includes(value.toLowerCase()) 
    );
    setFilteredData(filtered);
  };

  // Table columns (localized)
  const columns = [
    {
      title: t('table_header_id'),
      dataIndex: 'id',
      key: 'id',
      sorter: (a, b) => a.id - b.id, // Numeric sorting by ID
    },
    {
      title: t('table_header_name'),
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name), // Alphabetical sorting by Name
    },
    {
      title: t('table_header_status'),
      dataIndex: 'status',
      key: 'status',
      render: (text) => t(text), // Dynamically translate 'active' and 'inactive'
      sorter: (a, b) => a.status.localeCompare(b.status), // Alphabetical sorting by Status
    },
  ];

  return (
    <div style={{margin: '20px'}}>
      {/* Language Dropdown */}
      <div style={{ textAlign: 'right', marginBottom: '20px' }}>
        <Select
          value={currentLanguage} // Sync dropdown's value with the current language
          style={{ width: 120 }}
          onChange={changeLanguage}
        >
          <Option value="en">English</Option>
          <Option value="es">Español</Option>
        </Select>
      </div>

      {/* Dashboard Title */}
      <h1 style={{background: 'yellow', padding: "20px"}}>{t('dashboard_title')}</h1>

      <div>
      <OverviewTable />

      <TaskInsightsPieChart />
    </div>

      {/* Search Input */}
      <div style={{ marginBottom: '20px' }}>
        <h2>Buddy Details</h2>
        <Search
          placeholder={t('search_placeholder')} // "Search by Buddy ID"
          enterButton
          allowClear
          onSearch={handleSearch}
          style={{ width: 300 }} // Width of the search bar
        />
      </div>

      {/* Table Section with Virtual Scrolling */}
      <div style={{ marginTop: '20px' }}>
      <Table
          dataSource={filteredData} // Use filtered data for the table
          columns={columns} // Columns with sorting
          pagination={false} // Disable pagination for better virtual scroll performance
          scroll={{ y: 400 }} // Enable vertical scrolling with a height of 400px
          rowKey="id" // Unique key for rows (important for virtual scrolling and sorting)
        />
      </div>

       {/* Charts Section */}
       <EmployeeChart />

      <TimeEfficiencyTable />

      <ErrorAlertTable />
    </div>
  );
};

export default Dashboard;