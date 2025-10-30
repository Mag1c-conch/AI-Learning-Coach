// src/Admin/Pages/Admin/TimeTable.jsx
import React, { useMemo, useEffect, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  InputBase,
  CircularProgress,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CircleIcon from "@mui/icons-material/Circle";
import { Badge, Calendar } from 'antd';
import dayjs from 'dayjs';

/* ---------- 搜索栏样式 ---------- */
const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.black, 0.05),
  "&:hover": { backgroundColor: alpha(theme.palette.common.black, 0.1) },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: 300,
  display: "flex",
  alignItems: "center",
  paddingLeft: theme.spacing(1),
  [theme.breakpoints.up("sm")]: { width: 360 },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 1),
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(0,0,0,0.5)",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  width: "100%",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    transition: theme.transitions.create("width"),
    width: "100%",
  },
}));

/* ---------- 名字从 localStorage 读取 ---------- */
function useDisplayName() {
  return useMemo(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const userData = JSON.parse(token);
        return userData.first_name || "Admin";
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }

    const fromStorage =
      localStorage.getItem("displayName") ||
      localStorage.getItem("username") ||
      "";
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();

    const email =
      localStorage.getItem("userEmail") ||
      localStorage.getItem("email") ||
      "";
    if (email.includes("@")) {
      const head = email.split("@")[0];
      return head ? head.charAt(0).toUpperCase() + head.slice(1) : "Admin";
    }
    return "Admin";
  }, []);
}

export default function TimeTable() {
  const name = useDisplayName();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:5001/assignments');
        if (response.ok) {
          const data = await response.json();
          setAssignments(data);
        } else {
          console.error('Failed to fetch assignments');
        }
      } catch (err) {
        console.error('Error fetching assignments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  // Get events for a specific date
  const getListData = (value) => {
    const dateStr = value.format('YYYY-MM-DD');
    let listData = [];

    assignments.forEach((assignment) => {
      if (assignment.due_date) {
        const dueDate = dayjs(assignment.due_date);
        const dueDateStr = dueDate.format('YYYY-MM-DD');
        
        if (dueDateStr === dateStr) {
          // Determine badge type based on assignment title or description
          let badgeType = 'success'; // default
          const title = assignment.title?.toLowerCase() || '';
          const desc = assignment.description?.toLowerCase() || '';
          
          if (title.includes('quiz') || desc.includes('quiz')) {
            badgeType = 'warning';
          } else if (title.includes('lab') || desc.includes('lab')) {
            badgeType = 'processing';
          } else if (title.includes('assignment') || desc.includes('assignment')) {
            badgeType = 'error';
          }

          listData.push({
            type: badgeType,
            content: assignment.title || 'Assignment',
            assignment: assignment,
          });
        }
      }
    });

    return listData || [];
  };

  const getMonthData = (value) => {
    // Count assignments in the month
    let count = 0;
    const month = value.month();
    const year = value.year();

    assignments.forEach((assignment) => {
      if (assignment.due_date) {
        const dueDate = dayjs(assignment.due_date);
        if (dueDate.month() === month && dueDate.year() === year) {
          count++;
        }
      }
    });

    return count > 0 ? count : null;
  };

  const monthCellRender = (value) => {
    const num = getMonthData(value);
    return num ? (
      <div className="notes-month">
        <section>{num}</section>
        <span>Assignments</span>
      </div>
    ) : null;
  };

  const dateCellRender = (value) => {
    const listData = getListData(value);
    return (
      <ul className="events" style={{ textAlign: "left", paddingLeft: "0", margin: "0" }}>
        {listData.map((item, index) => (
          <li key={`${item.content}-${index}`} style={{ textAlign: "left", listStyle: "none" }}>
            <Badge status={item.type} text={item.content} />
          </li>
        ))}
      </ul>
    );
  };

  const cellRender = (current, info) => {
    if (info.type === 'date') return dateCellRender(current);
    if (info.type === 'month') return monthCellRender(current);
    return info.originNode;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, position: "relative" }}>
      {/* ======= 页头（与Dashboard相同） ======= */}
      <Box
        sx={{
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        {/* 左：标题组 */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1 }}>
          <Typography variant="h6">TimeTable</Typography>
          <CircleIcon sx={{ ml: "15%", fontSize: 10, color: "#B3B3B3" }} />
          <Typography variant="subtitle1" sx={{ color: "#7a7a7a" }}>
            Admin
          </Typography>
        </Box>

        {/* 右：搜索 + 铃铛（保留你的绝对定位样式） */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 1,
            position: "absolute",
            top: -10,
            right: 20,
          }}
        >
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase placeholder="" inputProps={{ "aria-label": "" }} />
          </Search>
          <IconButton>
            <NotificationsIcon />
          </IconButton>
        </Box>
      </Box>

      {/* ======= 分割线（与Dashboard相同） ======= */}
      <Box
        sx={{
          height: 2,
          bgcolor: "rgba(21,19,19,0.45)",
          mb: 2,
          ml: "calc(-24px - 240px)",
          mr: -3,
        }}
      />

      {/* ======= 日历组件（调整大小） ======= */}
      <Box
        sx={{
          height: "calc(100vh - 155px)", // 减少高度，增加更多边距
          width: "100%", // 减少宽度
          maxWidth: "1000px", // 设置最大宽度
          margin: "0 auto", // 居中显示
          overflow: "hidden",
        }}
      >
        <Calendar 
          cellRender={cellRender}
          style={{
            height: "100%",
            width: "100%",
            fontSize: "18px",
            textAlign: "left", // 文本左对齐
          }}
        />
      </Box>
    </Box>
  );
}
