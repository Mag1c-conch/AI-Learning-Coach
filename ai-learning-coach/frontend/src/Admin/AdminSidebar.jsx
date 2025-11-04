// src/Admin/AdminSidebar.jsx
import React from 'react';
import '../App.css';
import { Button, Link } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import DesignServicesIcon from '@mui/icons-material/DesignServices';

export default function AdminSidebar() {
  return (
    <div className="wordslink">
      <div className="logo">
        <DesignServicesIcon sx={{ fontSize: 30 }} />
        <hr />
      </div>

      <div className="menu">
        <Button fullWidth>
          <Link href="/admin/dashboard" sx={{ color: '#fff', textDecoration: 'none' }}>
            Dashboard
          </Link>
        </Button>
        <Button fullWidth>
          <Link href="/admin/assistant" sx={{ color: '#fff', textDecoration: 'none' }}>
            AI Assistance
          </Link>
        </Button>
        <Button fullWidth>
          <Link href="/admin/grading" sx={{ color: '#fff', textDecoration: 'none' }}>
            Grading
          </Link>
        </Button>
      </div>

      <div className="logout-icon">
        <Button fullWidth>
          <Link
            href="/signin"
            sx={{ color: '#fff', display: 'flex', gap: 1, alignItems: 'center', textDecoration: 'none' }}
          >
            <LogoutIcon sx={{ fontSize: 18 }} /> Log Out
          </Link>
        </Button>
      </div>
    </div>
  );
}
