// src/Admin/Pages/Admin/CourseStudentProgress.jsx
import React, { useMemo, useState } from 'react';
import { Progress } from 'antd';
import { Box, IconButton, Typography, Button, TextField } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export default function CourseStudentProgress({
  rows = [],
  pageSize = 8,          // 每页条数（
  height = 420,          // 组件固定高度（可按需微调）
  maxWidth = 800,       // 增加最大宽度以容纳新列
}) {
  const [page, setPage] = useState(1);
  const [rewards, setRewards] = useState({}); // 存储每个学生的奖励分数

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

  // 处理奖励分数变化
  const handleRewardChange = (studentId, value) => {
    setRewards(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  // 确认奖励
  const handleConfirmReward = (studentId) => {
    const rewardValue = rewards[studentId] || 0;
    console.log(`Adding ${rewardValue} points to student ${studentId}`);
    // 这里可以添加实际的API调用来保存奖励
    // 成功后可以显示成功消息或更新UI
  };

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
      {/* 表格区域：占满剩余空间，固定 6 行时不会溢出 */}
      <div style={{ flex: 1, overflow: 'hidden', padding: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Student ID</th>
              <th style={th}>Course</th>
              <th style={th}>Progress</th>
              <th style={th}>Reward</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => {
              const value = r.completed ? 100 : Math.max(0, Math.min(100, r.percent ?? 0));
              const status = value === 100 ? 'success' : (r.status || 'active');
              // 使用name作为唯一标识符，因为name是唯一的
              const studentId = r.name;
              const currentReward = rewards[studentId] || 0;
              
              return (
                <tr key={`${studentId}-${i}`} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={td}>{r.name}</td>
                  <td style={{ ...td, color: '#6b7280' }}>{r.studentId}</td>
                  <td style={td}>{r.course}</td>
                  <td style={td}>
                    <div style={{ maxWidth: 200 }}>
                      <Progress percent={value} status={status} />
                    </div>
                  </td>
                  <td style={td}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleRewardChange(studentId, Math.max(0, currentReward - 1))}
                        sx={{ minWidth: 30, height: 30, p: 0 }}
                      >
                        -
                      </Button>
                      <TextField
                        size="small"
                        value={currentReward}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          handleRewardChange(studentId, Math.max(0, value));
                        }}
                        inputProps={{
                          style: { 
                            textAlign: 'center', 
                            width: 40,
                            height: 30,
                            padding: '4px 8px'
                          }
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            height: 30,
                            width: 50,
                          }
                        }}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleRewardChange(studentId, currentReward + 1)}
                        sx={{ minWidth: 30, height: 30, p: 0 }}
                      >
                        +
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleConfirmReward(studentId)}
                        sx={{ 
                          height: 30,
                          px: 1,
                          fontSize: '0.75rem',
                          bgcolor: '#142E4F',
                          '&:hover': { bgcolor: '#0f223b' }
                        }}
                      >
                        Confirm
                      </Button>
                    </Box>
                  </td>
                </tr>
              );
            })}
            {/* 若最后一页不足 6 条，用空行填充，保持高度一致 */}
            {Array.from({ length: Math.max(0, pageSize - pageRows.length) }).map((_, idx) => (
              <tr key={`placeholder-${idx}`} style={{ height: 36 }}>
                <td style={td} />
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
