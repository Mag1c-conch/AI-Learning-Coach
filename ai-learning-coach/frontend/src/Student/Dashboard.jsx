import React, { useRef, useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
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
} from "@mui/material";
import Sidebar from "../components/Sidebar.jsx";
import { styled, alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CircleIcon from "@mui/icons-material/Circle";
import { CircularProgress} from "@mui/material";
import { circularProgressClasses } from "@mui/material/CircularProgress";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import http from "../api/http";

// Search box format
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

// Course sliding component (inline)
function CoursesSlider({ courses = [] }) {
  const slidingRef = useRef(null);
  // Scrolling design
  const scrollingCards = (dir = 1) => {
    const el = slidingRef.current;
    if (!el) {
      return;
    }
    el.scrollBy({ 
      left: dir * (el.clientWidth * 0.9), 
      behavior: "smooth" 
    });  // Scrolling distance
  };

  return (
    <Box sx={{ position: "relative" }}>
      {/* Sliding direction: y (all courses)*/}
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
            key={course.code}
            sx={{
              flex: "0 0 auto",
              width: { xs: 260, sm: 300, md: 340 },
              scrollSnapAlign: "start",
            }}
          >
            {/* Change to /course/:code */}
            <Box
              component={Link}
              to={`/course/${course.code}`}
              sx={{ 
                textDecoration: "none", 
                color: "inherit", 
              }}
            >
              {/* Each course card design */}
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
                </CardContent>
              </Card>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Left and right scrolling buttons */}
      <IconButton  // Left scrolling button
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

      <IconButton  // Right scrolling button
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

// Progress sliding component (inline)
function ProgressSlider({ items = [] }) {
  const slidingRef = useRef(null);

  // Scrolling design
  const scrollingCards = (dir = 1) => {
    const el = slidingRef.current;
    if (!el) {
      return;
    }
    el.scrollBy({ 
      left: dir * (el.clientWidth * 0.9), 
      behavior: "smooth" 
    });
  };

  return (
    <Box sx={{ position: "relative" }}>
      {/* Sliding direction: y (all courses progress)*/}
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
          <Card  // Each course progress card design
            key={item.course}
            elevation={3}
            sx={{
              flex: "0 0 auto",
              width: { xs: 240, sm: 280, md: 300 }, // Set card width
              scrollSnapAlign: "start",
              borderRadius: 2,
            }}
          >
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                {item.course}
              </Typography>

              {/* Circular progress */}
              <ProgressCircular value={item.percent} size={140} />
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Left and right scrolling buttons */}
      <IconButton  // Left scrolling button
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

      <IconButton  // Right scrolling button
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


// static course data
const defaultCoursesData = [
  { code: "COMP9814", name: "Artificial Intelligence", dueText: "Due in 2 days", meta: "· 2 assignments" },
  // { code: "COMP9517", name: "Computer Vision",        dueText: "Due in 5 days", meta: "· 4 labs" },
  // { code: "COMP9024", name: "Data Structures",        dueText: "Due in 1 week", meta: "· 1 project" },
  // { code: "COMP9315", name: "Database Systems",       dueText: "Due tomorrow",  meta: "· exam review" },
];

const exerciseData = [
  { title: "Artificial Intelligence", items: ["Exercise 1", "Exercise 2"] },
  { title: "Computer Vision", item: "Lab 1" },
  { title: "Big data", item: "Lab 5" },
  { title: "Data Structures", item: "Assignment 1" },
  { title: "Database Systems", item: "Tutorial 1" },
];

const progressData = [
  { course: "Artificial Intelligence", percent: 73 },
  { course: "Computer Vision", percent: 85 },
  { course: "Data Structures", percent: 60 },
  { course: "Big data", percent: 45 },
  { course: "Database Systems", percent: 29 },
];

function ProgressCircular({ value = 80, size = 150, thickness = 5}) {
  return (
    <Box 
      sx={{ 
        position: "relative", 
        display: "inline-flex", 
        alignItems: "center", 
        justifyContent: "center", 
      }}
    >
      {/* Background circle（Pink color）*/}
      <CircularProgress
        variant="determinate"
        value={100}
        size={size}
        thickness={thickness}
        sx={{
          color: "#f6c6d1",
          [`& .${circularProgressClasses.circle}`]: {
            strokeLinecap: "round",
          },
          transform: "rotate(-110deg)", // Upper left of the opening
        }}
      />
      {/* Progress bar */}
      <CircularProgress
        variant="determinate"
        value={value}
        size={size}
        thickness={thickness}
        sx={{
          color: "#ea9cb0",
          position: "absolute",
          left: 0,
          [`& .${circularProgressClasses.circle}`]: {
            strokeLinecap: "round",
          },
          transform: "rotate(-110deg)",
        }}
      />
      {/* Percentage */}
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
// read user id from localstorage
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

function mapEnrollmentToCard(e) {
  return {
    code: e.code,
    name: e.name || e.title || e.code,   // see name than title
    dueText: "Enrolled",
    meta: e.description ? `· ${e.description}` : "",
  };
}

function mergeCourses(base, enrolledCards) {
  // put enrolled courses in front
  const codes = new Set(enrolledCards.map((c) => c.code));
  const rest = base.filter((b) => !codes.has(b.code));
  return [...enrolledCards, ...rest];
}

function readLocalEnrollments(userId) {
  if (!userId) return [];
  try {
    const key = `enrolledCourses:${userId}`;
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(list)) return [];
    return list.map((c) => ({
      code: c.code,
      name: c.name || c.code,
      dueText: "Enrolled",
      meta: c.description ? `· ${c.description}` : "",
    }));
  } catch {
    return [];
  }
}

const Dashboard = () => {
  const [sliderCourses, setSliderCourses] = useState(defaultCoursesData);
  const [uid, setUid] = useState(getCurrentUserId());
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

  // static exercise & progress data
  const [exercises] = useState(exerciseData);
  const [progress] = useState(progressData);
  const [courses] = useState([
    { code: "COMP9814", name: "Artificial Intelligence", badges: 1 },
    { code: "COMP9820", name: "Project Management", badges: 0 },
    { code: "COMP9517", name: "Computer Vision", badges: 3 },
    { code: "COMP9021", name: "Principles of Programming", badges: 2 },
    { code: "COMP9311", name: "Database Systems", badges: 1 },
    { code: "COMP9511", name: "Human Computer Interaction", badges: 0 },
    { code: "COMP9417", name: "Machine Learning", badges: 4 },
    { code: "COMP9321", name: "Data Service Engineering", badges: 2 },
    { code: "COMP6448", name: "Web Application Development", badges: 0 },
  ]);

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

  useEffect(() => {
  const load = async () => {
    if (!uid) {
      setSliderCourses(defaultCoursesData);
      return;
    }
    try {
      const { data } = await http.get(`/courses/users/${uid}/enrollments`);
      const enrolledCards = Array.isArray(data) ? data.map(mapEnrollmentToCard) : [];
      const fallback = enrolledCards.length ? [] : readLocalEnrollments(uid);
      setSliderCourses(
        mergeCourses(defaultCoursesData, enrolledCards.length ? enrolledCards : fallback)
      );
    } catch (e) {
      console.error("加载个人选课失败：", e?.response?.data || e.message);
      const fallback = readLocalEnrollments(uid);
      setSliderCourses(mergeCourses(defaultCoursesData, fallback));
    }
  };

  load();
  const onUpdated = (ev) => {
  if (!ev?.detail?.user_id || ev.detail.user_id === uid) load();
  };
  window.addEventListener("enrollment:updated", onUpdated);
  return () => window.removeEventListener("enrollment:updated", onUpdated);
}, [uid]); 


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
          <IconButton><NotificationsIcon /></IconButton>
        </Box>

        {/* Title */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1, mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Dashboard</Typography>
          <CircleIcon sx={{ ml: "15%", fontSize: 10, color: "#B3B3B3" }} />
          <Typography variant="h6" sx={{ color: "#7a7a7a" }}>Student</Typography>
        </Box>

        {/* Greating & total rewards & ai button */}
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
                <CoursesSlider courses={sliderCourses} />
              </Paper>
            </Grid>

            {/* Exercise Materials */}
            <Grid item sx={{ flexGrow: 0, flexShrink: 0, flexBasis: { xs: "100%", sm: "50%", md: "30%" }, maxWidth: { xs: "100%", sm: "50%", md: "30%" }, ml: { md: "45px" } }}>
              <Paper variant="outlined" sx={{ flex: 1, p: 2, width: "100%", borderRadius: 2, boxShadow: 2, border: "1px solid", borderColor: "divider", height: { md: "38vh" } }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Todo List</Typography>
                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1, maxHeight: "70%", overflowY: "auto" }}>
                  {exercises.length === 0 ? (
                    <Typography>No materials</Typography>
                  ) : (
                    exercises.map((e, i) => {
                      const items = e.items || (e.item ? [e.item] : []);
                      return (
                        <Box key={i} sx={{ pb: 2, "&:last-child": { pb: 0 } }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, mb: 1 }}>{e.title}</Typography>
                          {items.map((it, idx) => (
                            <Typography key={idx} variant="body1" display="block" sx={{ pb: 1, lineHeight: 1.2 }}>{it}</Typography>
                          ))}
                          {i < exercises.length - 1 && <Divider sx={{ mt: 1 }} />}
                        </Box>
                      );
                    })
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
                flexBasis: { xs: '100%', sm: '50%', md: '62.5%' },
                maxWidth: { xs: '100%', sm: '50%', md: '62.5%' },
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
                {/* Title + Upper right corner: button */}
                <Box 
                  sx={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between", 
                    mb: 1 
                  }}
                >
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
                <ProgressSlider items={progress} />
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
    </Box>
  );
};

export default Dashboard;
