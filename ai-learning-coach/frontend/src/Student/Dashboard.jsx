// src/Student/Dashboard.jsx
import React, { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";
import {
  Box,
  Typography,
  IconButton,
  InputBase,
  Grid,
  Paper,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Button,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import { circularProgressClasses } from "@mui/material/CircularProgress";
import Sidebar from "../components/Sidebar.jsx";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CircleIcon from "@mui/icons-material/Circle";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import SchoolIcon from "@mui/icons-material/School";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import http from "../api/http";

// ===== Search box format =====
const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.action.hover,
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.black, 0.1),
  },
  display: "flex",
  alignItems: "center",
  mr: theme.spacing(2),
  ml: 0,
  width: "200px",
  pl: theme.spacing(1),
  [theme.breakpoints.up("sm")]: {
    width: "250px",
  },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  p: theme.spacing(0, 1),
  height: "100%",
  color: "rgba(0,0,0,0.5)",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  width: "100%",
  "& .MuiInputBase-input": {
    p: theme.spacing(1, 1, 1, 0),
    transition: theme.transitions.create("width"),
    width: "100%",
  },
}));

// ===== Course sliding component =====
function CoursesSlider({ courses = [], progressMap = {} }) {
  const slidingRef = useRef(null);
  const scrollingCards = (dir = 1) => {
    const el = slidingRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.9), behavior: "smooth" });
  };

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        ref={slidingRef}
        sx={{
          display: "flex",
          gap: 2,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          px: { xs: 1, md: 2 },
          py: 1,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {courses.map((course) => (
          <Box
            key={course.id ?? course.code}
            sx={{
              flex: "0 0 auto",
              width: { xs: 260, sm: 300, md: 340 },
              scrollSnapAlign: "start",
            }}
          >
            <Box
              component={Link}
              to={
                Number.isInteger(course.id)
                  ? `/course/${course.id}`
                  : `/course/${encodeURIComponent(course.code || "")}`
              }
              sx={{ textDecoration: "none", color: "inherit" }}
            >
              <Card
                elevation={3}
                sx={{
                  borderRadius: 2,
                  height: "100%",
                  cursor: "pointer",
                  transition: "transform .15s ease, box-shadow .15s ease",
                  "&:hover": { transform: "translateY(-2px)", boxShadow: 6 },
                }}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: 1.3,
                    py: 4,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                    {course.code}
                    <br />
                    {course.name}
                  </Typography>

                  <Divider flexItem sx={{ my: 0.5, opacity: 0.2 }} />

                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {course.dueText}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    {course.meta}
                  </Typography>

                  <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700 }}>
                    Progress:{" "}
                    {Math.max(
                      0,
                      Math.min(
                        100,
                        Math.round(
                          Number(
                            progressMap[
                              course.code ?? (course.id != null ? String(course.id) : "course")
                            ] || 0
                          )
                        )
                      )
                    )}
                    %
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        ))}
      </Box>

      <IconButton
        onClick={() => scrollingCards(-1)}
        size="small"
        sx={{
          display: { xs: "none", sm: "flex" },
          position: "absolute",
          left: 4,
          top: "50%",
          transform: "translateY(-50%)",
          bgcolor: "background.paper",
          boxShadow: 2,
          "&:hover": { bgcolor: "background.paper" },
        }}
      >
        <ChevronLeftIcon />
      </IconButton>

      <IconButton
        onClick={() => scrollingCards(1)}
        size="small"
        sx={{
          display: { xs: "none", sm: "flex" },
          position: "absolute",
          right: 4,
          top: "50%",
          transform: "translateY(-50%)",
          bgcolor: "background.paper",
          boxShadow: 2,
          "&:hover": { bgcolor: "background.paper" },
        }}
      >
        <ChevronRightIcon />
      </IconButton>
    </Box>
  );
}

// ===== Progress slider =====
function ProgressSlider({ items = [], onOpen }) {
  const slidingRef = useRef(null);
  const scrollingCards = (dir = 1) => {
    const el = slidingRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.9), behavior: "smooth" });
  };

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        ref={slidingRef}
        sx={{
          display: "flex",
          gap: 2,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          px: { xs: 1, md: 2 },
          py: 1,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {items.map((item) => (
          <Card
            key={item.courseKey}
            elevation={3}
            onClick={() => onOpen?.(item.courseKey)}
            role="button"
            tabIndex={0}
            sx={{
              flex: "0 0 auto",
              width: { xs: 240, sm: 280, md: 300 },
              scrollSnapAlign: "start",
              borderRadius: 2,
              cursor: "pointer",
            }}
          >
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                {item.course}
              </Typography>
              <ProgressCircular value={item.percent} size={140} />
            </CardContent>
          </Card>
        ))}
      </Box>

      <IconButton
        onClick={() => scrollingCards(-1)}
        size="small"
        sx={{
          display: { xs: "none", sm: "flex" },
          position: "absolute",
          left: 4,
          top: "50%",
          transform: "translateY(-50%)",
          bgcolor: "background.paper",
          boxShadow: 2,
          "&:hover": { bgcolor: "background.paper" },
        }}
      >
        <ChevronLeftIcon />
      </IconButton>

      <IconButton
        onClick={() => scrollingCards(1)}
        size="small"
        sx={{
          display: { xs: "none", sm: "flex" },
          position: "absolute",
          right: 4,
          top: "50%",
          transform: "translateY(-50%)",
          bgcolor: "background.paper",
          boxShadow: 2,
          "&:hover": { bgcolor: "background.paper" },
        }}
      >
        <ChevronRightIcon />
      </IconButton>
    </Box>
  );
}

// ===== ProgressCircular =====
function ProgressCircular({ value = 80, size = 150, thickness = 5 }) {
  return (
    <Box sx={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress
        variant="determinate"
        value={100}
        size={size}
        thickness={thickness}
        sx={{
          color: "#f6c6d1",
          [`& .${circularProgressClasses.circle}`]: { strokeLinecap: "round" },
          transform: "rotate(-110deg)",
        }}
      />
      <CircularProgress
        variant="determinate"
        value={value}
        size={size}
        thickness={thickness}
        sx={{
          color: "#ea9cb0",
          position: "absolute",
          left: 0,
          [`& .${circularProgressClasses.circle}`]: { strokeLinecap: "round" },
          transform: "rotate(-110deg)",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {Math.round(value)}%
        </Typography>
      </Box>
    </Box>
  );
}

// ===== helpers =====
const defaultCoursesData = [];
const exerciseData = [];
const progressData = [];

function getCurrentUserId() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const u = JSON.parse(token);
    return u?.id || u?.user_id || null;
  } catch {
    return null;
  }
}

const courseKeyFromCourse = (c) => c?.code ?? (c?.id != null ? String(c.id) : "course");
const courseProgressKey = (uid, courseKey) =>
  `courseProgress:${uid || "anon"}:${courseKey || "course"}`;

const planStorageKey = (uid, courseKey, dateStr) =>
  `studyPlan:${uid || "anon"}:${courseKey || "course"}:${dateStr}`;
const todayStr = () => new Date().toISOString().slice(0, 10);

function loadTodayTodosForUser(uid, courseList = []) {
  const t = todayStr();
  const out = [];
  for (const c of courseList) {
    const key = courseKeyFromCourse(c);
    const raw = localStorage.getItem(planStorageKey(uid, key, t));
    const items = raw ? JSON.parse(raw) : [];
    if (Array.isArray(items) && items.length) {
      out.push({
        courseKey: key,
        courseLabel: c.code || c.name || key,
        items,
      });
    }
  }
  return out;
}

function mapEnrollmentToCard(e) {
  const id = Number(e?.id);
  const description = e?.description || "";
  return {
    id: Number.isInteger(id) ? id : undefined,
    code: e?.code || "",
    name: e.name || e.title || e.code,
    dueText: "Enrolled",
    meta: description ? `· ${description}` : "",
  };
}

function mergeCourses(base, enrolledCards) {
  const identifiers = new Set(
    enrolledCards.map((c) =>
      Number.isInteger(Number(c.id)) ? `id:${Number(c.id)}` : `code:${c.code}`
    )
  );
  const rest = base.filter((b) => {
    const key = Number.isInteger(Number(b.id)) ? `id:${Number(b.id)}` : `code:${b.code}`;
    return !identifiers.has(key);
  });
  return [...enrolledCards, ...rest];
}

function readLocalEnrollments(userId) {
  if (!userId) return [];
  try {
    const key = `enrolledCourses:${userId}`;
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(list)) return [];
    const normalized = list
      .map((c) => {
        const id = Number(c?.id);
        if (!Number.isInteger(id)) return null;
        return { ...c, id };
      })
      .filter(Boolean);

    const seen = new Set();
    return normalized
      .filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      })
      .map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name || c.code,
        dueText: "Enrolled",
        meta: c.description ? `· ${c.description}` : "",
      }));
  } catch {
    return [];
  }
}

// ===== Dashboard component =====
const Dashboard = () => {
  const [sliderCourses, setSliderCourses] = useState(defaultCoursesData);
  const [uid, setUid] = useState(getCurrentUserId());
  const [todosByCourse, setTodosByCourse] = useState([]);
  const [exercises] = useState(exerciseData);
  const [courses, setCourses] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [progressItems, setProgressItems] = useState([]);
  const navigate = useNavigate();
  const openStudyProgress = (courseKey) =>
    navigate(`/progress/${encodeURIComponent(courseKey)}`);

  useEffect(() => {
    const onStorage = () => setUid(getCurrentUserId());
    const onLogin = () => setUid(getCurrentUserId());
    window.addEventListener("storage", onStorage);
    window.addEventListener("login:success", onLogin);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("login:success", onLogin);
    };
  }, []);

  const totalRewards = courses.reduce((s, c) => s + (c.badges || 0), 0);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, []);
  const firstName = useMemo(() => {
    try {
      const token = localStorage.getItem("token");
      return token ? (JSON.parse(token)?.first_name || "Student") : "Student";
    } catch {
      return "Student";
    }
  }, []);

  const rebuildProgress = useCallback(
    (list = courses, userId = uid) => {
      const map = {};
      for (const c of list) {
        const key = courseKeyFromCourse(c);
        const raw = localStorage.getItem(courseProgressKey(userId, key));
        const num = Math.max(0, Math.min(100, Math.round(Number(raw) || 0)));
        map[key] = num;
      }
      setProgressMap(map);
      const items = list.map((c) => {
        const key = courseKeyFromCourse(c);
        return {
          courseKey: key,
          courseLabel: c.code || c.name || key,
          percent: map[key] ?? 0,
          course: c.code || c.name || key,
        };
      });
      setProgressItems(items);
    },
    [uid, courses]
  );

  useEffect(() => {
    const load = async () => {
      if (!uid) {
        setSliderCourses(defaultCoursesData);
        setCourses([]);
        setTodosByCourse([]);
        return;
      }
      try {
        const { data } = await http.get(`/courses/users/${uid}/enrollments`);
        const enrolledCards = Array.isArray(data) ? data.map(mapEnrollmentToCard) : [];
        const fallback = enrolledCards.length ? [] : readLocalEnrollments(uid);
        const merged = mergeCourses(defaultCoursesData, enrolledCards.length ? enrolledCards : fallback);
        setSliderCourses(merged);
        const base = (enrolledCards.length ? enrolledCards : fallback)
          .map((c) => ({ id: c.id, code: c.code, name: c.name, badges: 0 }));
        setCourses(base);
        rebuildProgress(base, uid);
        setTodosByCourse(loadTodayTodosForUser(uid, base));
      } catch (e) {
        console.error("Failed to load enrollments", e?.response?.data || e.message);
        const fallback = readLocalEnrollments(uid);
        const merged = mergeCourses(defaultCoursesData, fallback);
        setSliderCourses(merged);
        const base = fallback.map((c) => ({ id: c.id, code: c.code, name: c.name, badges: 0 }));
        setCourses(base);
        rebuildProgress(base, uid);
        setTodosByCourse(loadTodayTodosForUser(uid, base));
      }
    };

    load();
    const onUpdated = (ev) => {
      if (!ev?.detail?.user_id || ev.detail.user_id === uid) load();
    };
    window.addEventListener("enrollment:updated", onUpdated);
    return () => window.removeEventListener("enrollment:updated", onUpdated);
  }, [uid, rebuildProgress]);

  useEffect(() => {
    if (courses?.length) {
      rebuildProgress(courses, uid);
      setTodosByCourse(loadTodayTodosForUser(uid, courses));
    }
  }, [courses, uid, rebuildProgress]);

  useEffect(() => {
    const onProgressUpdated = (e) => {
      const { course_key, value } = e?.detail || {};
      if (!course_key) return;
      const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
      setProgressMap((m) => ({ ...m, [course_key]: v }));
      setProgressItems((items) =>
        items.map((it) => (it.courseKey === course_key ? { ...it, percent: v } : it))
      );
    };
    const onPlanUpdated = () => {
      setTodosByCourse(loadTodayTodosForUser(uid, courses));
    };
    window.addEventListener("courseProgress:updated", onProgressUpdated);
    window.addEventListener("studyplan:updated", onPlanUpdated);
    return () => {
      window.removeEventListener("courseProgress:updated", onProgressUpdated);
      window.removeEventListener("studyplan:updated", onPlanUpdated);
    };
  }, [uid, courses]);

  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key) return;
      const pfx1 = `courseProgress:${uid || "anon"}:`;
      const pfx2 = `studyPlan:${uid || "anon"}:`;
      if (e.key.startsWith(pfx1)) {
        const course_key = e.key.slice(pfx1.length);
        const v = Math.max(0, Math.min(100, Math.round(Number(e.newValue) || 0)));
        setProgressMap((m) => ({ ...m, [course_key]: v }));
        setProgressItems((items) =>
          items.map((it) => (it.courseKey === course_key ? { ...it, percent: v } : it))
        );
      } else if (e.key.startsWith(pfx2)) {
        setTodosByCourse(loadTodayTodosForUser(uid, courses));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [uid, courses]);

  // ===================== Notifications (Feedback) =====================
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const unreadCount = useMemo(
    () => (Array.isArray(notifs) ? notifs.filter((n) => !n.is_read).length : 0),
    [notifs]
  );

  const fetchNotifications = useCallback(async () => {
    if (!uid) return;
    setNotifLoading(true);
    try {
      const params = new URLSearchParams({
        student_id: String(uid),
        include_related: "true",
      });
      const { data } = await http.get(`/feedback?${params.toString()}`);
      setNotifs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load notifications", e?.response?.data || e.message);
    } finally {
      setNotifLoading(false);
    }
  }, [uid]);

  const markNotificationRead = useCallback(
    async (id) => {
      if (!uid) return;
      try {
        await http.patch(`/feedback/${id}/read`, { student_id: uid, is_read: true });
        setNotifs((list) =>
          list.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
        );
      } catch (e) {
        console.error("Failed to mark read", e?.response?.data || e.message);
      }
    },
    [uid]
  );

  const markAllRead = useCallback(async () => {
    if (!uid) return;
    const pending = notifs.filter((n) => !n.is_read);
    for (const n of pending) {
      try {
        await http.patch(`/feedback/${n.id}/read`, { student_id: uid, is_read: true });
      } catch (e) {
        console.error("Failed to mark one read", e?.response?.data || e.message);
      }
    }
    setNotifs((list) => list.map((n) => ({ ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() })));
  }, [uid, notifs]);

  const openNotif = useCallback(async () => {
    setNotifOpen(true);
    await fetchNotifications();
  }, [fetchNotifications]);

  // 首次与轮询（60s）
  useEffect(() => {
    if (!uid) {
      setNotifs([]);
      return;
    }
    fetchNotifications();
    const id = window.setInterval(fetchNotifications, 60000);
    return () => window.clearInterval(id);
  }, [uid, fetchNotifications]);

  // ===================== render =====================
  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Sidebar />

      <Box className="main-content" sx={{ flex: 1, backgroundColor: "#f5f6fa", p: 3, overflowY: "auto", position: "relative" }}>
        {/* line */}
        <Box sx={{ position: "absolute", top: "63px", left: 0, width: "100%", height: "2px", backgroundColor: "rgba(21, 19, 19, 0.3)" }} />

        {/* search & notification */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1, position: "absolute", top: 10, right: 20 }}>
          <Search>
            <SearchIconWrapper><SearchIcon /></SearchIconWrapper>
            <StyledInputBase placeholder="Search" inputProps={{ "aria-label": "Search" }} />
          </Search>

          <Tooltip title="Notifications">
            <IconButton onClick={openNotif}>
              <Badge badgeContent={unreadCount} color="error" overlap="circular">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Title */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1, mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Dashboard</Typography>
          <CircleIcon sx={{ ml: "15%", fontSize: 10, color: "#B3B3B3" }} />
          <Typography variant="h6" sx={{ color: "#7a7a7a" }}>Student</Typography>
        </Box>

        {/* Greeting & rewards & AI */}
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 5, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
            {greeting}, {firstName}! 👋
          </Typography>
          <Typography variant="h7" sx={{ fontWeight: 700 }}>
            Total Rewards:
            <Box component="span" sx={{ fontWeight: 800, ml: 1 }}>{totalRewards}</Box>
          </Typography>
          <Paper elevation={1} sx={{ display: "flex", alignItems: "center", gap: 2, px: 1.5, py: 0.5, ml: "auto" }}>
            <SmartToyIcon fontSize="small" />
            <Typography variant="body1">AI</Typography>
          </Paper>
        </Box>

        <Box sx={{ mt: 2, pb: 2, width: "100%", height: "100%" }}>
          <Grid container spacing={3} sx={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", height: "100%", width: "100%" }}>
            {/* Courses */}
            <Grid item sx={{ flexGrow: 0, flexShrink: 0, flexBasis: { xs: "100%", sm: "50%", md: "60%" }, maxWidth: { xs: "100%", sm: "50%", md: "60%" } }}>
              <Paper sx={{ p: 3, height: "85%", width: "97.5%", borderRadius: 2, boxShadow: 2 }}>
                <Typography component={Link} to="/courses" variant="h5" sx={{ fontWeight: 700, mb: 2, textDecoration: "none", color: "inherit", "&:hover": { textDecoration: "underline" } }}>
                  Courses
                </Typography>
                <CoursesSlider courses={sliderCourses} progressMap={progressMap} />
              </Paper>
            </Grid>

            {/* Todo List */}
            <Grid item sx={{ flexGrow: 0, flexShrink: 0, flexBasis: { xs: "100%", sm: "50%", md: "30%" }, maxWidth: { xs: "100%", sm: "50%", md: "30%" }, ml: { md: "45px" } }}>
              <Paper variant="outlined" sx={{ flex: 1, p: 2, width: "100%", borderRadius: 2, boxShadow: 2, border: "1px solid", borderColor: "divider", height: { md: "38vh" } }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Todo List</Typography>
                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1, maxHeight: "70%", overflowY: "auto" }}>
                  {todosByCourse.length === 0 ? (
                    <Typography>No materials</Typography>
                  ) : (
                    todosByCourse.map((g) => (
                      <Box key={g.courseKey} sx={{ pb: 1.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, mb: .5 }}>
                          {g.courseLabel}
                        </Typography>
                        {g.items.map((it, idx) => (
                          <Typography key={idx} variant="body2" sx={{ display: "block", lineHeight: 1.3 }}>
                            • {it.title}
                          </Typography>
                        ))}
                        <Divider sx={{ mt: 1 }} />
                      </Box>
                    ))
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Study Progress */}
            <Grid
              item
              sx={{
                flexGrow: 0,
                flexShrink: 0,
                flexBasis: { xs: "100%", sm: "50%", md: "62.5%" },
                maxWidth: { xs: "100%", sm: "50%", md: "62.5%" },
              }}
            >
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 2,
                  boxShadow: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  height: "80%",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    Study Progress
                  </Typography>
                  <Box
                    component="button"
                    style={{
                      border: "none",
                      padding: "10px 14px",
                      borderRadius: 6,
                      background: "#1f2a44",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                    onClick={() => console.log("Generate study plan")}
                  >
                    Generate study Plan
                  </Box>
                </Box>
                <ProgressSlider items={progressItems} onOpen={openStudyProgress} />
              </Paper>
            </Grid>

            {/* Calendar */}
            <Grid item sx={{ flexGrow: 0, flexShrink: 0, flexBasis: { xs: "100%", sm: "50%", md: "30%" }, maxWidth: { xs: "100%", sm: "50%", md: "30%" }, mt: { md: "2px" }, ml: { md: "15px" } }}>
              <Paper sx={{ p: 2, height: "85%", width: "100%", borderRadius: 2, boxShadow: 2 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateCalendar />
                </LocalizationProvider>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* ===== Notifications Dialog ===== */}
      <Dialog open={notifOpen} onClose={() => setNotifOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Feedback Notifications</DialogTitle>
        <DialogContent dividers>
          {notifLoading ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 1 }}>Loading…</Typography>
            </Box>
          ) : !notifs.length ? (
            <Typography variant="body2">No notifications.</Typography>
          ) : (
            <List dense>
              {notifs.map((n) => {
                const courseLabel =
                  n.course?.code || n.course?.name || (n.course_id ? `Course #${n.course_id}` : "Course");
                const isUnread = !n.is_read;
                return (
                  <ListItemButton
                    key={n.id}
                    alignItems="flex-start"
                    onClick={() => {
                      if (isUnread) markNotificationRead(n.id);
                    }}
                    sx={{
                      borderRadius: 1,
                      mb: .5,
                      bgcolor: isUnread ? "action.hover" : "transparent",
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar>
                        {n.assignment_id ? <AssignmentTurnedInIcon /> : <SchoolIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {n.title || "New feedback"}
                          </Typography>
                          {isUnread && <Chip size="small" color="error" label="NEW" />}
                          {courseLabel && (
                            <Chip size="small" variant="outlined" label={courseLabel} sx={{ ml: .5 }} />
                          )}
                          {n.assignment?.title && (
                            <Chip size="small" variant="outlined" label={n.assignment.title} />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                            {n.content}
                          </Typography>
                          {n.created_at && (
                            <Typography variant="caption" color="text.secondary">
                              {new Date(n.created_at).toLocaleString()}
                            </Typography>
                          )}
                        </>
                      }
                    />
                    {!n.is_read && (
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          markNotificationRead(n.id);
                        }}
                      >
                        Mark read
                      </Button>
                    )}
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={markAllRead} disabled={!unreadCount}>
            Mark all as read
          </Button>
          <Button variant="contained" onClick={() => setNotifOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
