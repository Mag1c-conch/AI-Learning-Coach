// src/Admin/Pages/Admin/CourseStudentProgress.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Box, IconButton, Typography, Button, TextField } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export default function CourseStudentProgress({
  rows = [],
  pageSize = 8,          // number of rows 
  height = 420,          
  maxWidth = 800,       
  onGiveReward,
}) {
  const [page, setPage] = useState(1);
  const [inputRewards, setInputRewards] = useState({}); // temporary value in the input box
  const [submitting, setSubmitting] = useState({});

  const { total, totalPages, pageRows } = useMemo(() => {
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);
    return { total, totalPages, pageRows };
  }, [rows, page, pageSize]);

  //  the current page is valid 
  if (page > Math.max(1, Math.ceil(rows.length / pageSize))) {
    setTimeout(() => setPage(1), 0);
  }

  useEffect(() => {
    setInputRewards({});
  }, [rows]);

  // handle the reward score change in the input box (temporary value)
  const handleRewardChange = (studentId, value) => {
    setInputRewards(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const handleGiveReward = async (studentId) => {
    const pointsToAdd = inputRewards[studentId] || 0;

    if (pointsToAdd <= 0 || !onGiveReward) {
      return; 
    }

    try {
      setSubmitting(prev => ({ ...prev, [studentId]: true }));
      await onGiveReward(studentId, pointsToAdd);
      setInputRewards(prev => ({ ...prev, [studentId]: 0 }));
      console.log(` Gave ${pointsToAdd} points to student ${studentId}.`);
    } catch (error) {
      console.error("Failed to give reward", error);
      const message = error?.message || "Failed to give reward";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
    } finally {
      setSubmitting(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth,
        height,                  
        border: '1px solid rgba(0,0,0,0.2)',
        borderRadius: 8,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* table area: fill the remaining space, do not overflow when fixed 6 rows */}
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
              // use name as the unique identifier
              const studentKey = r.id ?? r.studentId ?? r.name;
              const inputValue = inputRewards[studentKey] || 0; 
              const totalPoints = Number(r.reward) || 0; 
              const isSubmitting = !!submitting[studentKey];
              
              return (
                <tr key={`${studentKey}-${i}`} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
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
                        onClick={() => handleRewardChange(studentKey, Math.max(0, inputValue - 1))}
                        sx={{ minWidth: 30, height: 30, p: 0 }}
                        disabled={isSubmitting}
                      >
                        -
                      </Button>
                      <TextField
                        size="small"
                        value={inputValue}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10);
                          handleRewardChange(studentKey, Math.max(0, Number.isFinite(value) ? value : 0));
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
                        onClick={() => handleRewardChange(studentKey, inputValue + 1)}
                        sx={{ minWidth: 30, height: 30, p: 0 }}
                        disabled={isSubmitting}
                      >
                        +
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleGiveReward(studentKey)}
                        disabled={inputValue === 0 || isSubmitting}
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
            {/* if the last page has less than the number of rows, use empty rows to fill */}
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
