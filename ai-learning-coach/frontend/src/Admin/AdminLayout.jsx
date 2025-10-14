import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import AdminSidebar from './AdminSidebar';
import '../App.css';

export default function AdminLayout() {
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AdminSidebar />
      <Box
        component="main"
        sx={{
          flex: 1,
          backgroundColor: '#f5f6fa',
          overflowY: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}