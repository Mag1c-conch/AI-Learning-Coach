import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import NotificationsIcon from "@mui/icons-material/Notifications";


// 获取用户显示名称的hook（与Dashboard保持一致）
function useDisplayName() {
  const [name, setName] = useState("Admin");
  useEffect(() => {
    const stored = localStorage.getItem("userDisplayName");
    if (stored) setName(stored);
    return () => {};
  }, []);
  return name;
}

export default function Course() {
  const name = useDisplayName();
  
  // 从URL参数获取课程ID
  const { courseId } = useParams();

  return (
    <Box sx={{ height: "100%", position: "relative" }}>
      {/* ======= 标题栏 ======= */}
      <Box
        sx={{
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        {/* 标题组 */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1 }}>
          <Typography variant="h4">Course</Typography>
          <CircleIcon sx={{ ml: "15%", fontSize: 10, color: "#B3B3B3" }} />
          <Typography variant="subtitle1" sx={{ color: "#7a7a7a" }}>
            Admin
          </Typography>
        </Box>

        {/* 通知图标 */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            position: "absolute",
            top: -10,
            right: 20,
          }}
        >
          <IconButton>
            <NotificationsIcon />
          </IconButton>
        </Box>
      </Box>

      {/* ======= 分割线（与Dashboard保持一致） ======= */}
      <Box
        sx={{
          height: 2,
          bgcolor: "rgba(21,19,19,0.45)",
          mb: 2,
          ml: "calc(-24px - 240px)",
          mr: -3,
        }}
      />

      {/* ======= 课程内容区域 ======= */}
      <Box sx={{ p: 3, height: "100vh", overflowY: "auto" }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          Course ID: {courseId}
        </Typography>
        
        {/* 这里后续可以添加课程的具体内容 */}
        <Box
          sx={{
            p: 3,
            bgcolor: "#f5f5f5",
            borderRadius: 2,
            textAlign: "center",
            color: "text.secondary",
          }}
        >
          <Typography variant="body1">
            课程详细内容将在后续开发中补充
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
