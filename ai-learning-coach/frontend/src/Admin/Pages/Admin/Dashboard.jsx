// src/pages/admin/Dashboard.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Radio,
  RadioGroup,
  FormControlLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
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

/* ---------- 根据时间获取问候语 ---------- */
function useGreeting() {
  return useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Good morning";
    } else if (hour < 18) {
      return "Good afternoon";
    } else {
      return "Good evening";
    }
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
    studentCount: 45,
  },
  {
    id: "5259_00428",
    title: "COMP4418 - Knowledge Representation - 2025 T3",
    org: "COMPSC - School of CSE",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop",
    studentCount: 38,
  },
  {
    id: "5253_00881",
    title: "GSOE9011 Eng PGCW Research Skills - 2025 T1",
    org: "ENG - Faculty of Engineering",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800&auto=format&fit=crop",
    studentCount: 52,
  },
  {
    id: "5253_00002",
    title: "COMP9024 - Data Structures & Algorithms",
    org: "CSE",
    image:
      "https://images.unsplash.com/photo-1518085250887-2f903c200fee?q=80&w=800&auto=format&fit=crop",
    studentCount: 29,
  },
  {
    id: "5253_00003",
    title: "COMP9311 - Database Systems",
    org: "CSE",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800&auto=format&fit=crop",
    studentCount: 41,
  },
];

/* ---------- 230×210 课程卡片 ---------- */
const CourseCard = ({ course, navigate }) => (
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
        cursor: "pointer",
        "&:hover": {
          opacity: 0.9,
        },
      }}
      onClick={() => {
        // 跳转到课程页面
        navigate(`/admin/course/${course.id}`);
      }}
    />
    {/* 下半：信息 */}
    <Box sx={{ p: 1.2, textAlign: "center" }}>
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 700, lineHeight: 1.15, mb: 1 }}
        noWrap
        title={course.title}
      >
        {course.title}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: "text.secondary" }}
      >
        {course.studentCount || 0} 人
      </Typography>
    </Box>
  </Box>
);

export default function Dashboard() {
  const name = useDisplayName();
  const greeting = useGreeting();
  const navigate = useNavigate();

  // —— 课程列表状态
  const [courses, setCourses] = useState(recentCourses);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // —— 翻页（固定显示 3 张）
  const CARDS_PER_PAGE = 3;
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(courses.length / CARDS_PER_PAGE));
  const start = page * CARDS_PER_PAGE;
  const visible = courses.slice(start, start + CARDS_PER_PAGE);

  // —— 弹窗
  const [openAdd, setOpenAdd] = useState(false);
  const [openDel, setOpenDel] = useState(false);
  
  // —— 创建课程表单数据
  const [courseForm, setCourseForm] = useState({
    course_name: "",
    course_code: "",
    description: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // —— 删除课程相关状态
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // —— 从后端获取课程列表
  const fetchCourses = async () => {
    setCoursesLoading(true);
    try {
      const response = await fetch('http://localhost:5001/courses');
      if (response.ok) {
        const data = await response.json();
        // 将后端数据转换为前端格式
        const formattedCourses = data.map(course => ({
          id: course.code,
          title: `${course.code} - ${course.name}`,
          org: course.description || "COMPSC - School of CSE",
          image: "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=800&auto=format&fit=crop",
          studentCount: 0, // TODO: 从enrollments计算
        }));
        setCourses(formattedCourses);
      }
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    } finally {
      setCoursesLoading(false);
    }
  };

  // —— 组件挂载时获取课程列表
  useEffect(() => {
    fetchCourses();
  }, []);

  // —— 处理表单输入
  const handleFormChange = (field, value) => {
    setCourseForm(prev => ({ ...prev, [field]: value }));
    setError(""); // Clear error when user types
  };

  // —— 创建课程
  const handleAddCourse = async () => {
    // 验证必填字段
    if (!courseForm.course_name || !courseForm.course_code) {
      setError("Course name and code are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 从localStorage获取当前用户ID
      const token = localStorage.getItem('token');
      let adminId = null;
      
      if (token) {
        const userData = JSON.parse(token);
        adminId = userData.id;
      }

      if (!adminId) {
        setError("Unable to get user information. Please login again.");
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:5001/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          course_name: courseForm.course_name,
          course_code: courseForm.course_code,
          description: courseForm.description,
          created_by: adminId
        }),
      });

      if (response.ok) {
        // 成功创建
        setOpenAdd(false);
        setCourseForm({ course_name: "", course_code: "", description: "" });
        alert("Course created successfully!");
        // 刷新课程列表
        fetchCourses();
      } else {
        const data = await response.json();
        setError(data.message || "Failed to create course");
      }
    } catch (err) {
      setError("Network error. Please check if the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  // —— 关闭弹窗时重置表单
  const handleCloseAdd = () => {
    setOpenAdd(false);
    setCourseForm({ course_name: "", course_code: "", description: "" });
    setError("");
  };

  // —— 删除课程
  const handleDeleteCourse = async () => {
    if (!selectedCourseId) {
      setDeleteError("Please select a course to delete");
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");

    try {
      // 从localStorage获取当前用户ID
      const token = localStorage.getItem('token');
      let adminId = null;
      
      if (token) {
        const userData = JSON.parse(token);
        adminId = userData.id;
      }

      if (!adminId) {
        setDeleteError("Unable to get user information. Please login again.");
        setDeleteLoading(false);
        return;
      }

      // 找到选中课程的后端ID
      const selectedCourse = courses.find(c => c.id === selectedCourseId);
      if (!selectedCourse) {
        setDeleteError("Course not found");
        setDeleteLoading(false);
        return;
      }

      // 需要从后端获取课程的数据库ID
      const coursesResponse = await fetch('http://localhost:5001/courses');
      if (!coursesResponse.ok) {
        setDeleteError("Failed to fetch course information");
        setDeleteLoading(false);
        return;
      }
      
      const coursesData = await coursesResponse.json();
      const courseToDelete = coursesData.find(c => c.code === selectedCourseId);
      
      if (!courseToDelete) {
        setDeleteError("Course not found in database");
        setDeleteLoading(false);
        return;
      }

      const response = await fetch(`http://localhost:5001/courses/${courseToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deleted_by: adminId
        }),
      });

      if (response.ok) {
        // 成功删除
        setOpenDel(false);
        setSelectedCourseId(null);
        alert("Course deleted successfully!");
        // 刷新课程列表
        fetchCourses();
      } else {
        const data = await response.json();
        setDeleteError(data.message || "Failed to delete course");
      }
    } catch (err) {
      setDeleteError("Network error. Please check if the backend server is running.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // —— 关闭删除弹窗时重置状态
  const handleCloseDel = () => {
    setOpenDel(false);
    setSelectedCourseId(null);
    setDeleteError("");
  };

  return (
    <Box sx={{ p: 3, position: "relative" }}>
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
            top: 20,
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
          {greeting}, {name}! <span role="img" aria-label="wave">👋</span>
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
            - Delete Courses
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
               mb: 1.5,
               display: "inline-flex",
             }}
           >
             <Typography variant="h6" sx={{ m: 0 }}>All Courses</Typography>
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
                  const slice = courses.slice(s, s + CARDS_PER_PAGE);
                  return (
                    <Box key={pi} sx={{ display: "flex", gap: 2, width: 730 }}>
                      {slice.map((c) => (
                        <CourseCard key={c.id} course={c} navigate={navigate} />
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
        <Box
          sx={{
            bgcolor: "#ffeb3b",
            color: "#1a1a1a",
            fontWeight: 800,
            px: 2,
            py: 1.2,
            borderRadius: 1,
            mb: 1.5,
            display: "inline-flex",
          }}
        >
          <Typography variant="h6" sx={{ m: 0 }}>Student Progress</Typography>
        </Box>
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
      <Dialog open={openAdd} onClose={handleCloseAdd} fullWidth maxWidth="sm">
        <DialogTitle>Add Course</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              required
              label="Course Code"
              placeholder="e.g., COMP9417"
              value={courseForm.course_code}
              onChange={(e) => handleFormChange('course_code', e.target.value)}
              error={error && !courseForm.course_code}
              helperText={error && !courseForm.course_code ? "Course code is required" : ""}
            />
            <TextField
              fullWidth
              required
              label="Course Name"
              placeholder="e.g., Machine Learning"
              value={courseForm.course_name}
              onChange={(e) => handleFormChange('course_name', e.target.value)}
              error={error && !courseForm.course_name}
              helperText={error && !courseForm.course_name ? "Course name is required" : ""}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description (Optional)"
              placeholder="Enter course description..."
              value={courseForm.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
            />
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdd} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddCourse}
            disabled={loading}
          >
            {loading ? "Creating..." : "Add Course"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======= 弹窗：Delete ======= */}
      <Dialog open={openDel} onClose={handleCloseDel} fullWidth maxWidth="sm">
        <DialogTitle>Delete Course</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Select a course to delete:
          </Typography>
          
          {courses.length === 0 ? (
            <Typography color="text.secondary">No courses available</Typography>
          ) : (
            <List sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
              {courses.map((course) => (
                <ListItem key={course.id} disablePadding>
                  <ListItemButton
                    selected={selectedCourseId === course.id}
                    onClick={() => {
                      setSelectedCourseId(course.id);
                      setDeleteError("");
                    }}
                  >
                    <Radio
                      checked={selectedCourseId === course.id}
                      sx={{ mr: 1 }}
                    />
                    <ListItemText
                      primary={course.title}
                      secondary={`Students: ${course.studentCount}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}

          {selectedCourseId && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
              <Typography variant="body2" color="warning.main">
                ⚠️ Warning: This action cannot be undone. All related enrollments will also be deleted.
              </Typography>
            </Box>
          )}

          {deleteError && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {deleteError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDel} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteCourse}
            disabled={deleteLoading || !selectedCourseId}
          >
            {deleteLoading ? "Deleting..." : "Delete Course"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
