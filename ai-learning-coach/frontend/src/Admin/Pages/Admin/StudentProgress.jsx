// src/Admin/Pages/Admin/StudentProgress.jsx
import React, { useMemo, useState } from 'react';
import { Progress } from 'antd';
import { Box, IconButton, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export default function StudentProgress({
  rows = [],
  pageSize = 6,          
  height = 290,          
  maxWidth = 850,        // maximum width, keep the layout stable
}) {
  const [page, setPage] = useState(1);

  const { total, totalPages, pageRows } = useMemo(() => {
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);
    return { total, totalPages, pageRows };
  }, [rows, page, pageSize]);

  // ensure the current page is valid after data changes
  if (page > Math.max(1, Math.ceil(rows.length / pageSize))) {
    setTimeout(() => setPage(1), 0);
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth,
        height,                  // fixed overall height
        border: '1px solid rgba(0,0,0,0.2)',
        borderRadius: 8,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* table area: fill the remaining space, do not overflow when fixed 5 rows; if the fields are many, set overflow:auto */}
      <div style={{ flex: 1, overflow: 'hidden', padding: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Student ID</th>
              <th style={th}>Course</th>
              <th style={th}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => {
              const value = r.completed ? 100 : Math.max(0, Math.min(100, r.percent ?? 0));
              const status = value === 100 ? 'success' : (r.status || 'active');
              return (
                <tr key={`${r.studentId || r.name}-${i}`} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={td}>{r.name}</td>
                  <td style={{ ...td, color: '#6b7280' }}>{r.studentId}</td>
                  <td style={td}>{r.course}</td>
                  <td style={td}>
                    <div style={{ maxWidth: 260 }}>
                      <Progress percent={value} status={status} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {/* if the last page has less than 5 rows, use empty rows to fill, keep the height consistent */}
            {Array.from({ length: Math.max(0, pageSize - pageRows.length) }).map((_, idx) => (
              <tr key={`placeholder-${idx}`} style={{ height: 36 }}>
                <td style={td} />
                <td style={td} />
                <td style={td} />
                <td style={td} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* custom pagination bar: fixed at the bottom, no spacing */}
      <Box
        sx={{
          borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 16px',
          gap: 1,
          marginTop: 0,
        }}
      >
        <IconButton
          size="small"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          sx={{
            width: 24,
            height: 24,
            opacity: page === 1 ? 0.5 : 1,
          }}
        >
          <ChevronLeftIcon sx={{ fontSize: 16 }} />
        </IconButton>
        
        <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'center' }}>
          {page} / {totalPages}
        </Typography>
        
        <IconButton
          size="small"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          sx={{
            width: 24,
            height: 24,
            opacity: page >= totalPages ? 0.5 : 1,
          }}
        >
          <ChevronRightIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </div>
  );
}

const th = {
  textAlign: 'left',
  padding: '6px 12px',
  color: '#374151',
  fontWeight: 600,
  fontSize: 14,
};

const td = {
  padding: '6px 12px',
  fontSize: 14,
};