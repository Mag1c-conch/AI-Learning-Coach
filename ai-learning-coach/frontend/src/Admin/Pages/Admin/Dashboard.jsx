// src/pages/admin/Dashboard.jsx
import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  InputBase,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CircleIcon from "@mui/icons-material/Circle";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import StudentProgress from './StudentProgress';
import CalendarPanel from './CalendarPanel';


/* ---------- 你的搜索栏样式 ---------- */
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

/* ---------- 课程数据（示例） ---------- */
const recentCourses = [
  {
    id: "5259_01567",
    title: "COMP4336/COMP9336 - Mobile Data Networking - 2025 T3",
    org: "COMPSC - School of CSE",
    image:
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "5259_00428",
    title: "COMP4418 - Knowledge Representation - 2025 T3",
    org: "COMPSC - School of CSE",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "5253_00881",
    title: "GSOE9011 Eng PGCW Research Skills - 2025 T1",
    org: "ENG - Faculty of Engineering",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "5253_00002",
    title: "COMP9024 - Data Structures & Algorithms",
    org: "CSE",
    image:
      "https://images.unsplash.com/photo-1518085250887-2f903c200fee?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "5253_00003",
    title: "COMP9311 - Database Systems",
    org: "CSE",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800&auto=format&fit=crop",
  },
];

/* ---------- 230×210 课程卡片 ---------- */
const CourseCard = ({ course }) => (
  <Box
    sx={{
      width: 230,
      height: 210,
      flex: "0 0 auto",
      borderRadius: 2,
      boxShadow: 1,
      bgcolor: "#fff",
      overflow: "hidden",
    }}
  >
    {/* 上半：封面 */}
    <Box
      sx={{
        height: 130,
        backgroundImage: `url(${course.image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
    {/* 下半：信息 */}
    <Box sx={{ p: 1.2 }}>
      <Typography variant="caption" color="text.secondary" noWrap>
        {course.id}
      </Typography>
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 700, lineHeight: 1.15 }}
        noWrap
        title={course.title}
      >
        {course.title}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap title={course.org}>
        {course.org}
      </Typography>
    </Box>
  </Box>
);

export default function Dashboard() {
  const name = useDisplayName();

  // —— 翻页（固定显示 3 张）
  const CARDS_PER_PAGE = 3;
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(recentCourses.length / CARDS_PER_PAGE));
  const start = page * CARDS_PER_PAGE;
  const visible = recentCourses.slice(start, start + CARDS_PER_PAGE);

  // —— 弹窗
  const [openAdd, setOpenAdd] = useState(false);
  const [openDel, setOpenDel] = useState(false);
  const [courseName, setCourseName] = useState("");

  return (
    <Box sx={{ height: "100%", position: "relative" }}>
      {/* ======= 你的页头（不改布局） ======= */}
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
          <Typography variant="h4">Dashboard</Typography>
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

      {/* ======= 分割线（保持原样） ======= */}
      <Box
        sx={{
          height: 2,
          bgcolor: "rgba(21,19,19,0.45)",
          mb: 2,
          ml: "calc(-24px - 240px)",
          mr: -3,
        }}
      />

      {/* ======= 问候 + 右侧操作按钮 ======= */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography
          variant="h3"
          sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}
        >
          Good morning, {name}! <span role="img" aria-label="wave">👋</span>
        </Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            sx={{ bgcolor: "#142E4F", "&:hover": { bgcolor: "#0f223b" }, px: 2.5 }}
            onClick={() => setOpenAdd(true)}
          >
            + Add Courses
          </Button>
          <Button
            variant="contained"
            color="error"
            sx={{ px: 2.5 }}
            onClick={() => setOpenDel(true)}
          >
            – Delete Courses
          </Button>
        </Box>
      </Box>

      {/* Left (label + carousel + dots) + Right (calendar) in one row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          mb: -5,
        }}
      >
        {/* LEFT: label + carousel + dots */}
        <Box sx={{ flex: "1 1 730px", minWidth: 730 }}>
          {/* Label */}
          <Box
            sx={{
              bgcolor: "#ffeb3b",
              color: "#1a1a1a",
              fontWeight: 800,
              px: 2,
              py: 1.2,
              borderRadius: 1,
              mb: 2,
              display: "inline-flex",
            }}
          >
            Recently accessed courses
          </Box>

          {/* Carousel row (left arrow + window + right arrow) */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              gap: 1,
              mb: 2,
            }}
          >
            <IconButton
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              sx={{
                bgcolor: "#fff",
                boxShadow: 1,
                "&:hover": { bgcolor: "#fff" },
                opacity: page === 0 ? 0.5 : 1,
              }}
            >
              <ChevronLeftIcon />
            </IconButton>

            <Box sx={{ width: 730, overflow: "hidden" }}>
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  transition: "transform 300ms ease",
                  transform: `translateX(-${page * 730}px)`,
                  width: `${totalPages * 730}px`,
                }}
              >
                {Array.from({ length: totalPages }).map((_, pi) => {
                  const s = pi * CARDS_PER_PAGE;
                  const slice = recentCourses.slice(s, s + CARDS_PER_PAGE);
                  return (
                    <Box key={pi} sx={{ display: "flex", gap: 2, width: 730 }}>
                      {slice.map((c) => (
                        <CourseCard key={c.id} course={c} />
                      ))}
                      {Array.from({ length: Math.max(0, CARDS_PER_PAGE - slice.length) }).map(
                        (_, i) => <Box key={`ph-${i}`} sx={{ width: 230, height: 210 }} />
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <IconButton
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              sx={{
                bgcolor: "#fff",
                boxShadow: 1,
                "&:hover": { bgcolor: "#fff" },
                opacity: page >= totalPages - 1 ? 0.5 : 1,
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>

          {/* Dots */}
          <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
            <Box sx={{ width: 730, display: "flex", justifyContent: "center", gap: 1 }}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <Box
                  key={i}
                  onClick={() => setPage(i)}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: i === page ? "#142E4F" : "rgba(0,0,0,0.25)",
                    cursor: "pointer",
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>

        {/* RIGHT: calendar card */}
        <Box sx={{ flex: "0 0" }}>
          <CalendarPanel />
        </Box>
      </Box>

      {/* Student Progress */}
      <Box sx={{ mt: 0, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>Student Progress</Typography>
        <StudentProgress
          rows={[
            { name: 'Jack',   studentId: 'zXXXXXXXX', course: 'Math101', percent: 30 },
            { name: 'Suzuki', studentId: 'zXXXXXXXX', course: 'Math108', percent: 55 },
            { name: 'Tom',    studentId: 'zXXXXXXXX', course: 'Math108', percent: 70 },
            { name: 'Jerry',  studentId: 'zXXXXXXXX', course: 'Math101', completed: true },
            { name: 'Jack',   studentId: 'zXXXXXXXX', course: 'Math101', percent: 30 },
            { name: 'Suzuki', studentId: 'zXXXXXXXX', course: 'Math108', percent: 55 },
            { name: 'Tom',    studentId: 'zXXXXXXXX', course: 'Math108', percent: 70 },
            { name: 'Jerry',  studentId: 'zXXXXXXXX', course: 'Math101', completed: true },
            { name: 'Amy',    studentId: 'zYYYYYYYY', course: 'Math108', percent: 10 },
            { name: 'Bob',    studentId: 'zZZZZZZZZ', course: 'Math101', percent: 45 },
          ]}
        />
      </Box>

      {/* Model：Add  */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add Course</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label="Course name"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              // TODO: 新增课程逻辑
              setOpenAdd(false);
              setCourseName("");
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======= 弹窗：Delete ======= */}
      <Dialog open={openDel} onClose={() => setOpenDel(false)} fullWidth maxWidth="xs">
        <DialogTitle>Delete Course</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography>Are you sure you want to delete the selected course?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDel(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              // TODO: 删除课程逻辑
              setOpenDel(false);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
