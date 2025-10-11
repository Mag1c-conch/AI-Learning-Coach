// src/Admin/Pages/Admin/StudentProgress.jsx
import React, { useMemo, useState } from 'react';
import { Progress } from 'antd';
import { Box, IconButton, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export default function StudentProgress({
  rows = [],
  pageSize = 6,          // 每页条数（默认 8）
  height = 280,          // 组件固定高度（可按需微调）
  maxWidth = 850,        // 最大宽度，保持布局稳定
}) {
  const [page, setPage] = useState(1);

  const { total, totalPages, pageRows } = useMemo(() => {
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);
    return { total, totalPages, pageRows };
  }, [rows, page, pageSize]);

  // 保证当前页在数据变更后也有效
  if (page > Math.max(1, Math.ceil(rows.length / pageSize))) {
    setTimeout(() => setPage(1), 0);
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth,
        height,                  // 固定整体高度
        border: '1px solid rgba(0,0,0,0.2)',
        borderRadius: 8,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 表格区域：占满剩余空间，固定 5 行时不会溢出；若字段多可设置 overflow:auto */}
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
            {/* 若最后一页不足 5 条，用空行填充，保持高度一致（可选） */}
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

      {/* 自定义翻页条：固定在底部，无间距 */}
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