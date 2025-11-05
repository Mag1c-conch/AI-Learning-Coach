// src/Admin/Pages/Admin/CourseStudentProgress.jsx
import React, { useMemo, useState } from 'react';
import { Box, IconButton, Typography, Button, TextField } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export default function CourseStudentProgress({
  rows = [],
  pageSize = 8,          // 每页条数
  height = 420,          // 组件固定高度
  maxWidth = 800,       // 最大宽度
}) {
  const [page, setPage] = useState(1);
  const [inputRewards, setInputRewards] = useState({}); // 待发放的奖励分数（输入框中的临时值）
  const [totalRewards, setTotalRewards] = useState({}); // 累计已发放的总奖励分数

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

  // 处理输入框的奖励分数变化（临时值）
  const handleRewardChange = (studentId, value) => {
    setInputRewards(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  // 点击Give按钮，将本次奖励加到累计总分
  const handleGiveReward = (studentId) => {
    const pointsToAdd = inputRewards[studentId] || 0;
    
    if (pointsToAdd <= 0) {
      return; // 如果没有要发放的分数，不执行
    }
    
    // 将本次奖励加到累计总分
    setTotalRewards(prev => ({
      ...prev,
      [studentId]: (prev[studentId] || 0) + pointsToAdd
    }));
    
    // 清空输入框
    setInputRewards(prev => ({
      ...prev,
      [studentId]: 0
    }));
    
    console.log(`✅ Gave ${pointsToAdd} points to ${studentId}. Total: ${(totalRewards[studentId] || 0) + pointsToAdd}`);
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
              <th style={th}>Extra Points</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => {
              // 使用name作为唯一标识符
              const studentId = r.name;
              const inputValue = inputRewards[studentId] || 0; // 临时输入值
              const totalPoints = totalRewards[studentId] || 0; // 累计总分
              
              return (
                <tr key={`${studentId}-${i}`} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={td}>{r.name}</td>
                  <td style={{ ...td, color: '#6b7280' }}>{r.studentId}</td>
                  <td style={td}>{r.course}</td>
                  <td style={td}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                      {totalPoints}
                    </Typography>
                  </td>
                  <td style={td}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleRewardChange(studentId, Math.max(0, inputValue - 1))}
                        sx={{ minWidth: 30, height: 30, p: 0 }}
                      >
                        -
                      </Button>
                      <TextField
                        size="small"
                        value={inputValue}
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
                        onClick={() => handleRewardChange(studentId, inputValue + 1)}
                        sx={{ minWidth: 30, height: 30, p: 0 }}
                      >
                        +
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleGiveReward(studentId)}
                        disabled={inputValue === 0}
                        sx={{ 
                          height: 30,
                          px: 1,
                          fontSize: '0.75rem',
                          bgcolor: '#10b981',
                          '&:hover': { bgcolor: '#059669' },
                          '&:disabled': { bgcolor: '#e5e7eb' }
                        }}
                      >
                        <EmojiEventsIcon sx={{ fontSize: 14, mr: 0.5 }} />
                        Give
                      </Button>
                    </Box>
                  </td>
                </tr>
              );
            })}
            {/* 若最后一页不足条数，用空行填充，保持高度一致 */}
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
