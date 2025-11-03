import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Divider,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import InputBase from "@mui/material/InputBase";
import SearchIcon from "@mui/icons-material/Search";
import CircleIcon from "@mui/icons-material/Circle";
import NotificationsIcon from "@mui/icons-material/Notifications";
import Sidebar from "../components/Sidebar.jsx";
import { CircularProgress, circularProgressClasses } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import http from "../api/http";

/** ========= Enrollment helpers (最小侵入，无需新文件) ========= */
const ENROLL_EVENT = "enrollment:updated";

function getCurrentUserId() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const user = JSON.parse(token);
    return user?.id || user?.user_id || null;
  } catch {
    return null;
  }
}

function getEnrollmentKey(uid) {
  return `enrolledCourses:${uid}`;
}

function loadEnrollments(uid = getCurrentUserId()) {
  if (!uid) return [];
  try {
    const stored = JSON.parse(localStorage.getItem(getEnrollmentKey(uid)) || "[]");
    if (!Array.isArray(stored)) return [];
    const mapped = stored
      .map((item) => {
        const id = Number(item?.id);
        if (!Number.isInteger(id)) return null;
        return {
          ...item,
          id,
        };
      })
      .filter(Boolean);

    const seen = new Set();
    return mapped.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  } catch {
    return [];
  }
}

/** ========= Search box ========= */
const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.action.hover,
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.black, 0.1),
  },
  display: "flex",
  alignItems: "center",
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: "200px",
  paddingLeft: theme.spacing(1),
  [theme.breakpoints.up("sm")]: {
    width: "250px",
  },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(0, 1),
  height: "100%",
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

/** ========= Progress ========= */
function ProgressCircular({ value = 70, size = 160, thickness = 7 }) {
  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
      {/* Background */}
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
      {/* Foreground */}
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
      {/* Label */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
        }}
      >
        {value}%
      </Box>
    </Box>
  );
}

/** ========= Local fallback data ========= */
const fallbackMaterials = [];
const API_BASE_URL = process.env.REACT_APP_API_BASE || "http://localhost:5001";

function pickMaterialColor(filename = "", type = "") {
  const value = (type || filename.split(".").pop() || "").toLowerCase();
  if (value.includes("pdf")) return "#1f2a44";
  if (value.includes("doc")) return "#4b7bec";
  if (value.includes("ppt")) return "#f39c12";
  if (value.includes("xls") || value.includes("sheet")) return "#2ecc71";
  return "#6c5ce7";
}
const assignments = [
  { title: "Quiz 6", time: "Oct 22 08:00am", percent: "5%", due: "Due 2 days" },
  { title: "Lab 7", time: "Oct 24 10:30am", percent: "3%", due: "Due 4 days" },
  { title: "Assignment 2", time: "Oct 27 04:00pm", percent: "25%", due: "Due 9 days" },
];

function CourseDetail() {
  const [enrolled, setEnrolled] = useState([]);
  const [materials, setMaterials] = useState(fallbackMaterials);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState("");
  const { courseId: courseIdParam } = useParams();
  const navigate = useNavigate();
  const normalizedParam = courseIdParam ? decodeURIComponent(courseIdParam) : null;
  const numericCourseId = courseIdParam ? Number(courseIdParam) : NaN;

  useEffect(() => {
    const uid = getCurrentUserId();
    if (!uid) return;
    setEnrolled(loadEnrollments(uid));

    let cancelled = false;

    const fetchEnrollments = async () => {
      try {
        const res = await http.get(`/courses/users/${uid}/enrollments`);
        const payload = Array.isArray(res.data) ? res.data : [];
        const normalized = payload
          .map((course) => {
            const id = Number(course?.id);
            if (!Number.isInteger(id)) return null;
            return {
              id,
              code: course?.code || "",
              name: course?.name || course?.title || "",
              dueText: "Enrolled",
              meta: course?.description ? `· ${course.description}` : "",
              progress: course?.progress ?? 0,
              teacher: course?.teacher || course?.creator_name || "",
            };
          })
          .filter(Boolean);
        if (!cancelled) {
          setEnrolled(normalized);
          localStorage.setItem(getEnrollmentKey(uid), JSON.stringify(normalized));
        }
      } catch (err) {
        console.error("加载选课信息失败", err);
      }
    };

    fetchEnrollments();

    const onEnrollUpdated = (e) => {
      if (e?.detail?.user_id !== uid) return;
      setEnrolled(loadEnrollments(uid));
      fetchEnrollments();
    };
    window.addEventListener(ENROLL_EVENT, onEnrollUpdated);

    // 跨标签页同步
    const onStorage = (e) => {
      if (e.key === getEnrollmentKey(uid)) {
        setEnrolled(loadEnrollments(uid));
        fetchEnrollments();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener(ENROLL_EVENT, onEnrollUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const currentCourse = useMemo(() => {
    if (!enrolled.length) return null;

    if (Number.isInteger(numericCourseId)) {
      const byId = enrolled.find((c) => Number.isInteger(c.id) && c.id === numericCourseId);
      if (byId) return byId;
      return null;
    }

    if (normalizedParam) {
      const lowered = normalizedParam.toLowerCase();
      const byCode = enrolled.find((c) => (c.code || "").toLowerCase() === lowered);
      if (byCode) return byCode;
      return null;
    }

    return enrolled[0];
  }, [enrolled, numericCourseId, normalizedParam]);

  useEffect(() => {
    if (!enrolled.length) return;
    const target = currentCourse;
    if (!target) return;

    if (!courseIdParam) {
      if (Number.isInteger(target.id)) {
        navigate(`/course/${target.id}`, { replace: true });
      } else if (target.code) {
        navigate(`/course/${encodeURIComponent(target.code)}`, { replace: true });
      }
      return;
    }

    if (Number.isInteger(target.id) && courseIdParam !== String(target.id)) {
      navigate(`/course/${target.id}`, { replace: true });
      return;
    }

    if (!Number.isInteger(target.id) && target.code) {
      const desiredKey = encodeURIComponent(target.code);
      if (courseIdParam !== desiredKey) {
        navigate(`/course/${desiredKey}`, { replace: true });
      }
    }
  }, [courseIdParam, currentCourse, enrolled, navigate]);

  useEffect(() => {
    const courseId = currentCourse?.id;
    if (!courseId) {
      setMaterials([]);
      setMaterialsError("");
      setMaterialsLoading(false);
      return;
    }

    let cancelled = false;
    const fetchMaterials = async () => {
      try {
        setMaterialsLoading(true);
        setMaterialsError("");
        const res = await http.get("/materials", { params: { course_id: courseId } });
        const payload = Array.isArray(res.data) ? res.data : [];
        const mapped = payload.map((item) => ({
          id: item?.id,
          title: item?.original_name || item?.stored_name || "Course material",
          type: item?.file_type || "material",
          color: pickMaterialColor(item?.original_name || item?.stored_name, item?.file_type),
          downloadUrl: item?.id ? `${API_BASE_URL}/materials/${item.id}/download` : null,
        }));
        if (!cancelled) {
          setMaterials(mapped);
        }
      } catch (err) {
        console.error("加载课程资料失败", err);
        if (!cancelled) {
          setMaterials([]);
          setMaterialsError(err?.response?.data?.description || err.message);
        }
      } finally {
        if (!cancelled) {
          setMaterialsLoading(false);
        }
      }
    };

    fetchMaterials();

    return () => {
      cancelled = true;
    };
  }, [currentCourse?.id]);

  const progressValue =
    typeof currentCourse?.progress === "number" ? currentCourse.progress : 0;
  const courseCode = currentCourse?.code || "No course selected";
  const courseName = currentCourse?.name || "";
  const courseMeta = currentCourse?.meta || "";
  const courseTeacher = currentCourse?.teacher || "";
  const hasCourse = Boolean(currentCourse);

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      {/* Right content */}
      <Box
        sx={{
          flex: 1,
          backgroundColor: "#f5f6fa",
          p: 3,
          overflowY: "auto",
          position: "relative",
        }}
      >
        <Divider sx={{ position: "sticky", top: 56, zIndex: 1, mb: 2, opacity: 0.5 }} />

        {/* Upper right corner: Search + Notifications */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            position: "absolute",
            top: 10,
            right: 20,
            gap: 1,
          }}
        >
          <Search>
            <SearchIconWrapper>
              <SearchIcon aria-hidden />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Search"
              inputProps={{ "aria-label": "Search" }}
            />
          </Search>
          <IconButton aria-label="Notifications">
            <NotificationsIcon />
          </IconButton>
        </Box>

        {/* Page title */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1, mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Course
          </Typography>
          <CircleIcon sx={{ marginLeft: "15%", fontSize: 10, color: "#B3B3B3" }} />
          <Typography variant="h6" sx={{ color: "#7a7a7a" }}>
            Student
          </Typography>
        </Box>

        {/* Course title */}
        <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, mb: 3, mt: 4, boxShadow: 5 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {courseCode}
            {courseName ? ` · ${courseName}` : ""}
          </Typography>
          {courseTeacher && (
            <Typography sx={{ mt: 0.5 }} color="text.secondary">
              {courseTeacher}
            </Typography>
          )}
          {courseMeta && (
            <Typography sx={{ mt: 0.5 }} color="text.secondary">
              {courseMeta}
            </Typography>
          )}
          {!hasCourse && (
            <Typography sx={{ mt: 1 }} color="text.secondary">
              You have not selected a course yet. Please enroll to see materials.
            </Typography>
          )}
        </Paper>

        {/* Materials + Progress + Assignments */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(12, 1fr)" },
            gap: 3,
          }}
        >
          {/* Materials */}
          <Paper
            elevation={1}
            sx={{
              gridColumn: { xs: "1 / -1", md: "span 6" },
              p: 2,
              borderRadius: 2,
              boxShadow: 2,
              height: "100%",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Materials
            </Typography>

            {materialsLoading ? (
              <Typography color="text.secondary">Loading materials…</Typography>
            ) : !hasCourse ? (
              <Typography color="text.secondary">
                Enroll in a course to view its materials.
              </Typography>
            ) : materialsError ? (
              <Typography color="error">{materialsError}</Typography>
            ) : materials.length === 0 ? (
              <Typography color="text.secondary">No materials available yet.</Typography>
            ) : (
              materials.map((m, idx) => (
                <Paper
                  key={m.id ?? idx}
                  variant="outlined"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mb: 1.2,
                    p: 1,
                    gap: 1.2,
                    borderRadius: 1.5,
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      width: 4,
                      height: 28,
                      borderRadius: 2,
                      bgcolor: m.color,
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                      {m.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {m.type || "material"}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ textTransform: "none", borderRadius: 1.2 }}
                    disabled={!m.downloadUrl}
                    onClick={() => {
                      if (m.downloadUrl) {
                        window.open(m.downloadUrl, "_blank", "noopener");
                      }
                    }}
                  >
                    Download
                  </Button>
                </Paper>
              ))
            )}
          </Paper>

          {/* Course Progress */}
          <Paper
            elevation={1}
            sx={{
              gridColumn: { xs: "1 / -1", md: "span 6" },
              p: 2,
              borderRadius: 2,
              boxShadow: 2,
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Course Progress
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
              <ProgressCircular value={progressValue} />
            </Box>
          </Paper>

          {/* Assignments */}
          <Paper
            elevation={1}
            sx={{
              gridColumn: "1 / -1",
              p: 2,
              borderRadius: 2,
              mt: 5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
                Assignments
              </Typography>
              <Button
                variant="contained"
                sx={{
                  textTransform: "none",
                  background: "#1f2a44",
                  "&:hover": { background: "#1a2438" },
                  borderRadius: 1.2,
                }}
                onClick={() => console.log("Generate study plan")}
              >
                Generate Study Plan
              </Button>
            </Box>

            <Divider sx={{ mb: 1 }} />

            {assignments.map((a, i) => (
              <Box
                key={i}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "2fr 2fr auto auto",
                  },
                  alignItems: "center",
                  columnGap: 2,
                  rowGap: 2,
                  py: 1.2,
                }}
              >
                <Typography fontWeight={600}>{a.title}</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Chip label={a.time} size="small" variant="outlined" />
                  <Typography sx={{ fontWeight: 700 }}>{a.percent}</Typography>
                </Box>
                <Typography color="text.secondary">{a.due}</Typography>
                <Button
                  size="small"
                  variant="text"
                  sx={{ justifySelf: "end", textTransform: "none" }}
                  onClick={() => console.log("Open assignment", a.title)}
                >
                  Details
                </Button>
              </Box>
            ))}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

export default CourseDetail;
