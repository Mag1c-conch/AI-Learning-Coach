// src/admin/AdminLayout.jsx
import * as React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar />
      <Box component="main" sx={{ flex: 1, p: 3}}>
        <Outlet />
      </Box>
    </Box>
  );
}
