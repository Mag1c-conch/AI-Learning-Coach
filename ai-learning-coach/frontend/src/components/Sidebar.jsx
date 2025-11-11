import React from 'react';
import '../App.css';
import { Button, Link} from '@mui/material';
import { NavLink } from 'react-router-dom';
import LogoutIcon from '@mui/icons-material/Logout';
import DesignServicesIcon from '@mui/icons-material/DesignServices';

const Sidebar = () => {
  const buttonStyle = ({ isActive }) => ({
    color: "#fff",
    fontSize: 19,
    lineHeight: 2,     
    textDecoration: "none",
    justifyContent: "center",
    textTransform: 'none',
    backgroundColor: isActive ? "rgba(255,255,255,0.12)" : "transparent",
  });
  return (
    <div className="wordslink">
      <div className="logo">
        <DesignServicesIcon sx={{ fontSize: 30}} />
        <hr />
      </div>
      
      <div className="menu">
        <Button fullWidth component={NavLink} to="/dashboard" style={buttonStyle}>Dashboard</Button>
        <Button fullWidth component={NavLink} to="/courses"   style={buttonStyle}>Courses</Button>
        <Button fullWidth sx={{whiteSpace: "nowrap"}} component={NavLink} to="/progress"  style={buttonStyle}>Study Progress</Button>
        <Button fullWidth component={NavLink} to="/studentai" style={buttonStyle}>AI Assistant</Button>
        <Button fullWidth component={NavLink} to="/calendar" style={buttonStyle}>Time Table</Button>
      </div>

      <div className="logout-icon">
        <Button fullWidth>
          <Link href="/signin" sx={{ color: '#fff', display: 'flex', gap: 1, alignItems: 'center', textDecoration: 'none' }}>
            <LogoutIcon sx={{ fontSize: 18 }} /> Log Out
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
