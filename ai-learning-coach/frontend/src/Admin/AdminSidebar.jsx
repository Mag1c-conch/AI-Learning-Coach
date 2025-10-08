// src/admin/AdminSidebar.jsx
import * as React from 'react';
import { Box, Divider, List, ListItemButton, ListItemText } from '@mui/material';
import { NavLink } from 'react-router-dom';
import DesignServicesIcon from '@mui/icons-material/DesignServices';

const navItems = [
  { label: 'Dashboard',     to: '/admin/dashboard' },
  { label: 'AI Assistance', to: '/admin/assistant' },
  { label: 'Time Table',    to: '/admin/timetable' },
];

export default function AdminSidebar() {
  return (
    <aside
      className="adminSidebar"
      role="navigation"
      aria-label="Admin Sidebar"
      style={{ width: 240, minHeight: '100vh' }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#fff' }}>
        <DesignServicesIcon sx={{ fontSize: 28 }} />
        <span style={{ fontWeight: 600 }}>Admin</span>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />

      <List sx={{ py: 1 }}>
        {navItems.map(item => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            sx={{
              color: '#fff',
              '&.active': { bgcolor: 'rgba(255,255,255,0.16)' },
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            <ListItemText primaryTypographyProps={{ fontSize: 14 }} primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </aside>
  );
}
