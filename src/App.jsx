import React from 'react';
import { NavLink, BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './i18n/index.js';
import Dashboard from './components/Dashboard/Dashboard';
import BuddyWork from './BuddyWork';
import { useTranslation } from 'react-i18next';

const navLinkStyle = {
  marginRight: '10px',
  textDecoration: 'none',
  color: 'black',
  fontWeight: 'normal',
};

const activeNavLinkStyle = {
  color: 'green',
  fontWeight: 'bold',
};

const App = () => {
  const { t } = useTranslation();
  return (
    <Router>
      {/* Navigation Links */}
      <nav style={{ textAlign: 'center', marginBottom: '20px' }}>
        {/* Home Link */}
        <NavLink
          to="/"
          style={({ isActive }) =>
            isActive
              ? { ...navLinkStyle, ...activeNavLinkStyle } // Merge default and active styles
              : navLinkStyle // Default styles
          }
        >
          { t('home') }
        </NavLink>

        {/* Dashboard Link */}
        <NavLink
          to="/dashboard"
          style={({ isActive }) =>
            isActive
              ? { ...navLinkStyle, ...activeNavLinkStyle }
              : navLinkStyle
          }
        >
          {t('dashboard')}
        </NavLink>
      </nav>
      
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<BuddyWork />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;