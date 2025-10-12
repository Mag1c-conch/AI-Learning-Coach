import * as React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AdminSidebar />
      <Box
        component="main"
        className="main-content"
        sx={{
          flex: 1,
          backgroundColor: '#f5f6fa',
          p: 3,
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
