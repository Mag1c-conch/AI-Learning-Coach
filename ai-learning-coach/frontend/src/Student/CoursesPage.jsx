import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  Link,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CircleIcon from "@mui/icons-material/Circle";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import Sidebar from "../components/Sidebar.jsx";
import http from "../api/http";
import NotificationsBell from "../components/Notifications.jsx";

const PAGE_SIZE = 6;
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

function mapEnrollmentToCard(e) {
  const reward = Number(e?.reward) || 0;
  const id = Number(e?.id);
  return {
    id: Number.isInteger(id) ? id : undefined,
    code: e?.code || "",
    name: e?.name || e?.title || e?.code,
    badges: reward,
    reward,
  };
}

function readLocalEnrollments(uid) {
  if (!uid) return [];
  try {
    const perUserKey = `enrolledCourses:${uid}`;
    const commonKey = "enrolledCourses";
    const list =
      JSON.parse(localStorage.getItem(perUserKey) || "null") ??
      JSON.parse(localStorage.getItem(commonKey) || "[]");
    if (!Array.isArray(list)) return [];
    return list.map((c) => {
      const id = Number(c?.id);
      const reward = Number(c?.reward ?? c?.badges) || 0;
      return {
        id: Number.isInteger(id) ? id : undefined,
        code: c.code,
        name: c.name || c.code,
        badges: reward,
        reward,
      };
    });
  } catch {
    return [];
  }
}

const Courses = () => {
  const navigate = useNavigate();
  const [uid, setUid] = useState(getCurrentUserId());
  const [courses, setCourses] = useState([]);
  const [page, setPage] = useState(1);

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

  // load enrolled courses
  useEffect(() => {
    const load = async () => {
      if (!uid) {
        setCourses([]);
        return;
      }
      try {
        const { data } = await http.get(`/courses/users/${uid}/enrollments`);
        const enrolledCards = Array.isArray(data)
          ? data.map(mapEnrollmentToCard)
          : [];
        const fallback = enrolledCards.length ? [] : readLocalEnrollments(uid);
        setCourses(enrolledCards.length ? enrolledCards : fallback);
        setPage(1); // Reset to first page on data reload
      } catch (e) {
        console.error("course load unsuccessfulo", e?.response?.data || e.message);
        const fallback = readLocalEnrollments(uid);
        setCourses(fallback);
        setPage(1);
      }
    };

    load();

    const onUpdated = (ev) => {
      if (!ev?.detail?.user_id || ev.detail.user_id === uid) load();
    };
    window.addEventListener("enrollment:updated", onUpdated);
    return () => window.removeEventListener("enrollment:updated", onUpdated);
  }, [uid]);

  const totalPages = Math.max(1, Math.ceil(courses.length / PAGE_SIZE));
  const hasCourses = courses.length > 0;
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return courses.slice(start, start + PAGE_SIZE);
  }, [courses, page]);

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
        {/* line */}
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

        {/* notification */}
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

        {/* title */}
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1, mb: 2 }}
        >
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Courses
          </Typography>
          <CircleIcon sx={{ ml: "15%", fontSize: 10, color: "#B3B3B3" , marginLeft: "80px"}} />
          <Typography variant="h6" sx={{ color: "#7a7a7a" }}>
            Student
          </Typography>
        </Box>

        {/* My Courses + Register button */}

        <Box sx={{ px: 1, mt: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              My Courses
            </Typography>

            {hasCourses && (
              <Button
                variant="contained"
                sx={{
                  ml: "auto",
                  px: 2.5,
                  py: 1,
                  mt: 3,
                  borderRadius: 1.5,
                  background: "#1f2a44",
                  "&:hover": { background: "#1a2438" },
                  textTransform: "none",
                }}
                href="/registercourse" // 或 component={Link} to="/registercourse"
              >
                Register Courses
              </Button>
            )}
          </Box>

          {/* empty state */}
          {/* if Empty State */}
          {!hasCourses ? (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: "center",
                color: "text.secondary",
                border: "1px dashed",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                No courses yet
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Click “Register Courses” to enroll.
              </Typography>
              <Button
                variant="contained"
                href="/registercourse"
                sx={{
                  background: "#1f2a44",
                  "&:hover": { background: "#1a2438" },
                }}
              >
                Register Courses
              </Button>
            </Paper>
          ) : (
            <>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(3, 1fr)",
                  },
                  gap: 4,
                }}
              >
                {pageItems.map((course) => (
                  <Paper
                    key={course.code}
                    elevation={1}
                    onClick={() => navigate(`/course/${course.code}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigate(`/course/${course.code}`);
                    }}
                    role="button"
                    tabIndex={0}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      bgcolor: "#eef0fa",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 3,
                      textAlign: "center",
                      height: 200,
                      cursor: "pointer",
                      "&:hover": {
                        transform: "translateY(-1px)",
                        boxShadow: 3,
                      },
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      {course.code}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                      {course.name}
                    </Typography>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mt: 1,
                        gap: 1.5,
                      }}
                    >
                      <EmojiEventsOutlinedIcon sx={{ fontSize: 36 }} />
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {course.badges}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>

              {/* pagination */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mt: 3,
                  gap: 1,
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>

                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNumber = i + 1;
                  return (
                    <Button
                      key={pageNumber}
                      size="small"
                      onClick={() => setPage(pageNumber)}
                      variant={page === pageNumber ? "contained" : "text"}
                      sx={{
                        minWidth: 32,
                        fontWeight: page === pageNumber ? 700 : 500,
                        ...(page === pageNumber && {
                          background: "#1f2a44",
                          color: "#fff",
                        }),
                      }}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}

                <IconButton
                  size="small"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Courses;
