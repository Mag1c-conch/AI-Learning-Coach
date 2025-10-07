import React from 'react';
import '../App.css';
import { Button, Link } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

const Sidebar = () => {
  return (
    <div className="wordslink">
      {/* 中间菜单 */}
       
      <div className="menu">
        <Button fullWidth><Link href="#" sx={{ color: '#fff', textDecoration: 'none' }}>Courses</Link></Button>
        <Button fullWidth><Link href="#" sx={{ color: '#fff', textDecoration: 'none' }}>Exercises</Link></Button>
        <Button fullWidth><Link href="#" sx={{ color: '#fff', textDecoration: 'none' }}>Study Progress</Link></Button>
        <Button fullWidth><Link href="#" sx={{ color: '#fff', textDecoration: 'none' }}>AI Assistant</Link></Button>
        <Button fullWidth><Link href="#" sx={{ color: '#fff', textDecoration: 'none' }}>Time Table</Link></Button>
      </div>

      {/* 底部登出 */}
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
