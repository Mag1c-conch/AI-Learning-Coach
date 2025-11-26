import React, { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";
import {
  Box,
  Typography,
  IconButton,
  Grid,
  Paper,
  Card,
  CardContent,
  Divider,
  CircularProgress,
} from "@mui/material";
import { circularProgressClasses } from "@mui/material/CircularProgress";
import Sidebar from "../components/Sidebar.jsx";
import CircleIcon from "@mui/icons-material/Circle";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { PickersDay } from "@mui/x-date-pickers/PickersDay";
import dayjs from "dayjs";
import http from "../api/http";
import NotificationsBell from "../components/Notifications.jsx";

// horizontal cards slider
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
            sx={{ flex: "0 0 auto", width: { xs: 260, sm: 300, md: 340 }, scrollSnapAlign: "start" }}
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
                  {/* title: course code and name */}
                  <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                    {course.code}
                    <br />
                    {course.name}
                  </Typography>

                  <Divider flexItem sx={{ my: 0.5, opacity: 0.2 }} />
                  {/* emphasized line for key info */}
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {course.dueText}
                  </Typography>
                  {/* detail text */}
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

// progress slider for study progress page
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
              {/* bold course title */}
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

// cicular progress ring component
function ProgressCircular({ value = 80, size = 150, thickness = 7 }) {
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

// bsde local storage keys and helper functions
const defaultCoursesData = [];
const exerciseData = [];
const progressData = [];

function getCurrentUserId() {
  try {
    const token =
      window.sessionStorage.getItem("token") || window.localStorage.getItem("token");
    if (!token) return null;
    const u = JSON.parse(token);
    return u?.id || u?.user_id || null;
  } catch {
    return null;
  }
}

// retrieve today’s study-plan (to-do) items for each course from localStorage
const courseKeyFromCourse = (c) => c?.code ?? (c?.id != null ? String(c.id) : "course");
// Build storage keys
// Creates a unique key for storing course-progress data per user
const courseProgressKey = (uid, courseKey) =>
  `courseProgress:${uid || "anon"}:${courseKey || "course"}`;

// Creates a unique key for study-plan data, namespaced by user, course, and date
const planStorageKey = (uid, courseKey, dateStr) =>
  `studyPlan:${uid || "anon"}:${courseKey || "course"}:${dateStr}`;
const todayStr = () => new Date().toISOString().slice(0, 10); 

// load today's todo for all courses
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

// converts an enrollment object e into a card-friendly data shape
function mapEnrollmentToCard(e) {
  const id = Number(e?.id);
  const description = e?.description || "";
  const reward = Number(e?.reward) || 0;
  return {
    id: Number.isInteger(id) ? id : undefined,
    code: e?.code || "",
    name: e.name || e.title || e.code,
    dueText: "Enrolled",
    meta: description ? `· ${description}` : "", 
    badges: reward,
    reward,
  };
}

// merges two course lists so that all enrolled cards come first, and any remaining base courses
function mergeCourses(base, enrolledCards) {
  const identifiers = new Set( 
    enrolledCards.map((c) =>
      Number.isInteger(Number(c.id)) ? `id:${Number(c.id)}` : `code:${c.code}`
    )
  );
  // filters the base list to those not in enrolledCards
  const rest = base.filter((b) => { 
    const key = Number.isInteger(Number(b.id)) ? `id:${Number(b.id)}` : `code:${b.code}`;
    return !identifiers.has(key);
  });
  return [...enrolledCards, ...rest];
}

// reads the user’s saved enrollments from localStorage, cleans them up, removes duplicates, and returns a card-friendly list
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
        badges: Number(c.reward ?? c.badges ?? 0) || 0,
        reward: Number(c.reward ?? c.badges ?? 0) || 0,
      }));
  } catch {
    return [];
  }
}

// simple localStorage helpers for a user’s timetable + a local-date helper
const TT_KEY = (uid) => `timetableEvents:${uid || "anon"}`;
function ttGetEvents(uid) {
  try {
    const raw = localStorage.getItem(TT_KEY(uid));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
// Uses local time
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// today’s to-do lists from AI-generated timetable events
function todayTodosFromAIEvents(uid, courses = []) {
  const events = ttGetEvents(uid);
  if (!events.length || !Array.isArray(courses) || !courses.length) return [];

  const today = todayISO(); 

  const courseMap = new Map(); 
  for (const c of courses) {
    const key = c.code ?? (c.id != null ? String(c.id) : "course");
    const label = c.code || c.name || key;
    courseMap.set(String(c.id), { key, label });
    if (c.code) courseMap.set(c.code, { key, label });
  }

  const byCourse = new Map();
  for (const e of events) {
    if (!e?.start || typeof e.start !== "string") continue;

    const d = dayjs(e.start);
    if (!d.isValid()) continue;
    const dateLocal = d.format("YYYY-MM-DD");
    if (dateLocal !== today) continue;

    const title = e.title || "Study Session";
    const time = d.format("HH:mm");
    // determines which course bucket this event belongs to
    let ck = "course";
    let clabel = "Others";
    if (e.courseId != null && courseMap.has(String(e.courseId))) {
      const meta = courseMap.get(String(e.courseId));
      ck = meta.key;
      clabel = meta.label;
    }
    // accumulates events into a per-course structure
    const list = byCourse.get(ck) || { courseKey: ck, courseLabel: clabel, items: [] };
    list.items.push({ title: time ? `${time} · ${title}` : title });
    byCourse.set(ck, list);
  }

  return Array.from(byCourse.values());
}

// 1. merges “today’s to-dos” from two sources
// 2. grouped by course and de-duplicated by item title
function mergeTodayTodos(uid, courses = []) { 
  const localTodos = loadTodayTodosForUser(uid, courses); 
  const aiTodos = todayTodosFromAIEvents(uid, courses); 

  const map = new Map();
  for (const g of [...localTodos, ...aiTodos]) {
    const existed =
      map.get(g.courseKey) || { courseKey: g.courseKey, courseLabel: g.courseLabel, items: [] };
    const seen = new Set(existed.items.map((x) => x.title));
    for (const it of g.items) { 
      if (!seen.has(it.title)) {
        existed.items.push(it);
        seen.add(it.title);
      }
    }
    map.set(g.courseKey, existed);
  }
  const out = Array.from(map.values()).filter((g) => g.items.length > 0);
  out.sort((a, b) => String(a.courseLabel).localeCompare(String(b.courseLabel)));
  return out;
}

// computes a sorted list of unique dates
function computeMarkedDates(uid) { 
  const events = ttGetEvents(uid);
  const validDays = new Set();
  for (const e of events) {
    if (!e?.start) continue;
    const d = dayjs(e.start);
    if (!d.isValid()) continue;
    validDays.add(d.format("YYYY-MM-DD"));
  }
  return Array.from(validDays).sort((a, b) => a.localeCompare(b)); 
}

// Dashboard 
const Dashboard = () => {
  const [sliderCourses, setSliderCourses] = useState(defaultCoursesData);
  const [uid, setUid] = useState(getCurrentUserId()); 
  const [todosByCourse, setTodosByCourse] = useState([]); 
  const [exercises] = useState(exerciseData); 
  const [courses, setCourses] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [progressItems, setProgressItems] = useState([]);
  const [markedDates, setMarkedDates] = useState(() => computeMarkedDates(getCurrentUserId()));

  const navigate = useNavigate();
  const openStudyProgress = (courseKey) =>
    navigate(`/progress/${encodeURIComponent(courseKey)}`); 

  // Auth / storage listeners
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

  // sum of badges across all courses
  const totalRewards = courses.reduce((s, c) => s + (c.badges || 0), 0);

  // Computes a greeting once on mount based on current hour
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, []);
  const firstName = useMemo(() => {
    try {
      const token =
        window.sessionStorage.getItem("token") || window.localStorage.getItem("token");
      return token ? (JSON.parse(token)?.first_name || "Student") : "Student";
    } catch {
      return "Student";
    }
  }, []);

  // recompute progress map + progress slider items
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

  // load enrollments, compute derived state, and listen for updates
  useEffect(() => {
    const load = async () => {
      if (!uid) {
        setSliderCourses(defaultCoursesData);
        setCourses([]);
        setTodosByCourse([]);
        setMarkedDates([]);
        return;
      }
      try {
        const { data } = await http.get(`/courses/users/${uid}/enrollments`);
        const enrolledCards = Array.isArray(data) ? data.map(mapEnrollmentToCard) : [];
        // Fallback to local enrollments if API returns empty
        const fallback = enrolledCards.length ? [] : readLocalEnrollments(uid);
        // Slider: enrolled first, then defaults (no duplicates)
        const merged = mergeCourses(defaultCoursesData, enrolledCards.length ? enrolledCards : fallback);
        setSliderCourses(merged);
        // Canonical base courses for the rest of the dashboard state
        const source = enrolledCards.length ? enrolledCards : fallback;
        const base = source.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          badges: Number(c.badges ?? c.reward ?? 0),
          reward: Number(c.badges ?? c.reward ?? 0),
        }));
        setCourses(base);
        rebuildProgress(base, uid);
        // today’s todos (local + AI merged) and marked dates
        setTodosByCourse(mergeTodayTodos(uid, base));
        setMarkedDates(computeMarkedDates(uid));
      } catch (e) {
        console.error("Failed to load enrollments", e?.response?.data || e.message);
        const fallback = readLocalEnrollments(uid);
        const merged = mergeCourses(defaultCoursesData, fallback);
        setSliderCourses(merged);
        const base = fallback.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          badges: Number(c.badges ?? c.reward ?? 0),
          reward: Number(c.badges ?? c.reward ?? 0),
        }));
        setCourses(base);
        rebuildProgress(base, uid);

        setTodosByCourse(mergeTodayTodos(uid, base));
        setMarkedDates(computeMarkedDates(uid));
      }
    };

    // when enrollments change elsewhere in the app, reload (same user, or no user_id guard)
    load();
    const onUpdated = (ev) => {
      if (!ev?.detail?.user_id || ev.detail.user_id === uid) load();
    };
    window.addEventListener("enrollment:updated", onUpdated);
    return () => window.removeEventListener("enrollment:updated", onUpdated);
  }, [uid]);

  // recompute derived state whenever courses or uid changes
  useEffect(() => {
    if (courses?.length) {
      rebuildProgress(courses, uid);
      setTodosByCourse(mergeTodayTodos(uid, courses));
      setMarkedDates(computeMarkedDates(uid));
    }
  }, [courses, uid, rebuildProgress]);

  // listen for in-app custom events and patch state accordingly
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
      setTodosByCourse(mergeTodayTodos(uid, courses));
      setMarkedDates(computeMarkedDates(uid));
    };
    window.addEventListener("courseProgress:updated", onProgressUpdated);
    window.addEventListener("studyplan:updated", onPlanUpdated);
    return () => {
      window.removeEventListener("courseProgress:updated", onProgressUpdated);
      window.removeEventListener("studyplan:updated", onPlanUpdated);
    };
  }, [uid, courses]);

  // react to timetable changes
  useEffect(() => {
    const onTimetableUpdated = () => {
      setTodosByCourse(mergeTodayTodos(uid, courses));
      setMarkedDates(computeMarkedDates(uid));
    };
    window.addEventListener("timetable:updated", onTimetableUpdated);
    return () => window.removeEventListener("timetable:updated", onTimetableUpdated);
  }, [uid, courses]);

  // sync changes coming from other tabs/windows (storage event)
  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key) return;
      const pfx1 = `courseProgress:${uid || "anon"}:`;
      const ttKey = TT_KEY(uid);
      const pfx2 = `studyPlan:${uid || "anon"}:`;
      if (e.key.startsWith(pfx1)) {
        const course_key = e.key.slice(pfx1.length);
        const v = Math.max(0, Math.min(100, Math.round(Number(e.newValue) || 0)));
        setProgressMap((m) => ({ ...m, [course_key]: v }));
        setProgressItems((items) =>
          items.map((it) => (it.courseKey === course_key ? { ...it, percent: v } : it))
        );
      } else if (e.key.startsWith(pfx2) || e.key === ttKey) {
        setTodosByCourse(mergeTodayTodos(uid, courses));
        setMarkedDates(computeMarkedDates(uid));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [uid, courses]);

  // marked dates → fast lookup
  const markedSet = useMemo(() => new Set(markedDates), [markedDates]);

  // custom day renderer
  const DotDay = (props) => {
    const { day, outsideCurrentMonth, ...other } = props;
    const hasEvent = markedSet.has(day.format("YYYY-MM-DD"));
    return (
      <Box sx={{ position: "relative" }}>
        <PickersDay day={day} outsideCurrentMonth={outsideCurrentMonth} {...other} />
        {hasEvent && (
          <Box
            sx={{
              position: "absolute",
              left: "50%",
              bottom: 6,
              transform: "translateX(-50%)",
              width: 6,
              height: 6,
              borderRadius: "50%",
              bgcolor: "primary.main",
            }}
          />
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Sidebar />

      <Box
        className="main-content"
        sx={{
          flex: 1,
          backgroundColor: "#f5f6fa",
          p: 3,
          overflowY: "auto",
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "63px",
            left: 0,
            width: "100%",
            height: "2px",
            backgroundColor: "rgba(21, 19, 19, 0.3)",
          }}
        />

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 1,
            position: "absolute",
            top: 10,
            right: 20,
          }}
        >
          <IconButton>
            <NotificationsBell />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1, mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Dashboard
          </Typography>
          <CircleIcon sx={{ ml: "15%", fontSize: 10, color: "#B3B3B3", marginLeft: "80px" }} />
          <Typography variant="h6" sx={{ color: "#7a7a7a" }}>
            Student
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
            mb: 3,
          }}
        >
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}
          >
            {greeting}, {firstName}!{" "}
            <span role="img" aria-label="wave" >
              👋
            </span>
          </Typography>
        </Box>

        {/* scrollable area */}
        <Box sx={{ ml: 2, mt: 2, pb: 2, width: "100%", height: "100%" }}>
          <Grid
            container
            spacing={3}
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "stretch",
              height: "100%",
              width: "100%",
            }}
          >
            {/* Courses */}
            <Grid
              item
              sx={{
                flexGrow: 0,
                flexShrink: 0,
                flexBasis: { xs: "100%", sm: "50%", md: "60%" },
                maxWidth: { xs: "100%", sm: "50%", md: "60%" },
              }}
            >
              <Paper
                sx={{
                  p: 3,
                  height: "85%",
                  width: "97.5%",
                  borderRadius: 2,
                  boxShadow: 2,
                }}
              >
                <Typography
                  component={Link}
                  to="/courses"
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    mb: 2,
                    textDecoration: "none",
                    color: "inherit",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Courses
                </Typography>
                <CoursesSlider courses={sliderCourses} progressMap={progressMap} />
              </Paper>
            </Grid>

            {/* Todo List */}
            <Grid
              item
              sx={{
                flexGrow: 0,
                flexShrink: 0,
                flexBasis: { xs: "100%", sm: "50%", md: "30%" },
                maxWidth: { xs: "100%", sm: "50%", md: "30%" },
                ml: { md: "45px" },
              }}
            >
              <Paper
                variant="outlined"
                sx={{
                  flex: 1,
                  p: 2,
                  width: "100%",
                  borderRadius: 2,
                  boxShadow: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  height: { md: "38vh" },
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                  Todo List
                </Typography>
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 1,
                    maxHeight: "70%",
                    overflowY: "auto",
                  }}
                >
                  {todosByCourse.length === 0 ? (
                    <Typography>No materials</Typography>
                  ) : (
                    todosByCourse.map((g) => (
                      <Box key={g.courseKey} sx={{ pb: 1.5 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 700, lineHeight: 1.2, mb: 0.5 }}
                        >
                          {g.courseLabel}
                        </Typography>
                        {g.items.map((it, idx) => (
                          <Typography
                            key={idx}
                            variant="body2"
                            sx={{ display: "block", lineHeight: 1.3 }}
                          >
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
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    Study Progress
                  </Typography>
                </Box>
                <ProgressSlider items={progressItems} onOpen={openStudyProgress} />
              </Paper>
            </Grid>

            {/* Calendar with dots */}
            <Grid
              item
              sx={{
                flexGrow: 0,
                flexShrink: 0,
                flexBasis: { xs: "100%", sm: "50%", md: "30%" },
                maxWidth: { xs: "100%", sm: "50%", md: "30%" },
                mt: { md: "2px" },
                ml: { md: "15px" },
              }}
            >
              <Paper
                sx={{
                  p: 2,
                  height: "85%",
                  width: "100%",
                  borderRadius: 2,
                  boxShadow: 2,
                }}
              >
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateCalendar disableHighlightToday={false} slots={{ day: DotDay }} />
                </LocalizationProvider>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
