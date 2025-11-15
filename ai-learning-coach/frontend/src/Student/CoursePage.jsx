import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Divider,
  CircularProgress,
  circularProgressClasses,
  ButtonBase,
  IconButton,
} from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import Sidebar from "../components/Sidebar.jsx";
import { useParams, useNavigate } from "react-router-dom";
import http from "../api/http";
import NotificationsBell from "../components/Notifications.jsx";

const ENROLL_EVENT = "enrollment:updated";
const TASK_TYPES = new Set(["assignment", "quiz", "lab"]);
const fallbackCourse = { code: "COMP9814", name: "Artificial Intelligence" };

const isNumericId = (v) => /^\d+$/.test(String(v));

// Get current login user id from localStorage.
function getCurrentUserId() {
  try {
    const token =
      window.sessionStorage.getItem("token") || window.localStorage.getItem("token");
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
// Load the student's course selection information from the localStorage cache
function loadEnrollments(uid = getCurrentUserId()) {
  if (!uid) return [];
  try {
    const stored = JSON.parse(localStorage.getItem(getEnrollmentKey(uid)) || "[]");
    if (!Array.isArray(stored)) return [];
    const mapped = stored
      .map((item) => {
        const id = Number(item?.id);
        return Number.isInteger(id) ? { ...item, id } : null;
      })
      .filter(Boolean);
    const seen = new Set();
    return mapped.filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)));
  } catch {
    return [];
  }
}

// Display the percentage of students' course completion.
function ProgressCircular({ value = 0, size = 160, thickness = 7 }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
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
        value={safe}
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
          fontWeight: 700,
        }}
      >
        {safe}%
      </Box>
    </Box>
  );
}

const extColor = {
  pdf: "#d32f2f",
  ppt: "#d24625",
  pptx: "#d24625",
  doc: "#2b579a",
  docx: "#2b579a",
  xls: "#217346",
  xlsx: "#217346",
  csv: "#217346",
  zip: "#6b7280",
  rar: "#6b7280",
  default: "#1f2a44",
};
const labelFromExt = (ext) => {
  if (!ext) return "File";
  const e = ext.toLowerCase();
  if (e === "pdf") return "PDF";
  if (["ppt", "pptx"].includes(e)) return "Slides";
  if (["doc", "docx"].includes(e)) return "Doc";
  if (["xls", "xlsx", "csv"].includes(e)) return "Sheet";
  return e.toUpperCase();
};

const parsePercent = (p) => {
  if (typeof p === "number") return p;
  if (typeof p === "string") {
    const n = Number(p.replace(/%/g, "").trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const assignmentStatusKey = (uid, courseCode) =>
  `assignmentStatus:${uid || "anon"}:${courseCode || "unknown"}`;
function loadAssignmentStatus(uid, courseCode) {
  try {
    const raw = localStorage.getItem(assignmentStatusKey(uid, courseCode));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveAssignmentStatus(uid, courseCode, statusObj) {
  try {
    localStorage.setItem(assignmentStatusKey(uid, courseCode), JSON.stringify(statusObj));
  } catch {  }
}

const prettyKind = (k) => {
  const t = String(k || "").toLowerCase();
  if (t === "quiz") return "Quiz";
  if (t === "assignment") return "Assignment";
  if (t === "lab") return "Lab";
  return t ? t[0].toUpperCase() + t.slice(1) : "";
};
const kindChipSX = (k) => {
  const t = String(k || "").toLowerCase();
  if (t === "quiz") return { borderColor: "info.main", color: "info.main" };
  if (t === "assignment") return { borderColor: "primary.main", color: "primary.main" };
  if (t === "lab") return { borderColor: "success.main", color: "success.main" };
  return {};
};
const inferKindFromTitle = (title) => {
  const s = String(title || "").toLowerCase();
  if (s.includes("quiz")) return "quiz";
  if (s.includes("assignment") || s.includes("assn") || /\ba\d+\b/.test(s)) return "assignment";
  if (s.includes("lab")) return "lab";
  return "";
};

// Standardize the back-end material data so that the front-end can use it directly.
function normalizeMaterials(arr = []) {
  const getExt = (name) => {
    if (!name) return "";
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
  };
  return (Array.isArray(arr) ? arr : []).map((m) => {
    // Normalize each material object
    const ext = m.ext || getExt(m.original_name || m.stored_name);
    return {
      ...m,
      ext,
      download_url: m.download_url || (m.id ? `/materials/${m.id}/download` : null),
      uploaded_at: m.uploaded_at || m.created_at || m.updated_at,
      file_type: (m.file_type || "").toLowerCase(),
    };
  });
}

// Convert the assignment deadline to how much time is left until the deadline from the current time.
function formatTimeLeft(isoLike) {
  if (!isoLike) return "";
  const now = Date.now();
  const due = new Date(isoLike).getTime();
  if (Number.isNaN(due)) return "";
  const diff = due - now;
  const past = diff < 0;
  const abs = Math.abs(diff);
  // Calculate days, hours, minutes from milliseconds
  const SEC = 1000,
    MIN = 60 * SEC,
    HOUR = 60 * MIN,
    DAY = 24 * HOUR;
  const days = Math.floor(abs / DAY);
  const hours = Math.floor((abs % DAY) / HOUR);
  const mins = Math.floor((abs % HOUR) / MIN);
  // Show days+hours if >24h, else hours+minutes
  const part = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  return past ? `Overdue ${part}` : `Due in ${part}`;
}

// Get the file name from Content-Disposition.
const filenameFromDisposition = (disposition) => {
  if (!disposition) return null;
  const m1 = /filename\*\=UTF-8''([^;]+)/i.exec(disposition);
  if (m1) return decodeURIComponent(m1[1]);
  const m2 = /filename="?([^"]+)"?/i.exec(disposition);
  return m2 ? m2[1] : null;
};
// Course files can be downloaded when logged in.
async function downloadWithAuth(urlOrPath, fallbackName = "file") {
  try {
    const res = await http.get(urlOrPath, { responseType: "blob" });
    const cd =
      res.headers?.["content-disposition"] ||
      res.headers?.get?.("content-disposition");
    const filename = filenameFromDisposition(cd) || fallbackName;
    const blobUrl = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
        console.error("Download failed:", err);
        const status = err?.response?.status;
        alert(`Download failed${status ? ` (HTTP ${status})` : ""}, please try again`);
  }
}

// The course information detail page displays course materials, progress and assignments.
function CourseDetail() {
  // Support multiple route param formats: /course/:id, /course/:courseId, or course code
  const { id: idParam, courseId: courseIdParam } = useParams();
  const rawParam = idParam ?? courseIdParam ?? null;
  const navigate = useNavigate();

  const [enrolled, setEnrolled] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [taskMaterials, setTaskMaterials] = useState([]);
  const [matLoading, setMatLoading] = useState(false);
  const [matError, setMatError] = useState(null);

  const uid = getCurrentUserId();
  const courseProgressKey = (uid, courseKey) =>
    `courseProgress:${uid || "anon"}:${courseKey || "course"}`;

  function loadCourseProgress(uid, courseKey) {
    const raw = localStorage.getItem(courseProgressKey(uid, courseKey));
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  // Load the student's registered courses from the local storage cache.
  // Update the registered courses for monitoring if there are any changes.
  useEffect(() => {
    if (!uid) return;
    // Load cached data immediately.
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
              meta: course?.description ? `· ${course.description}` : "",
              progress: course?.progress ?? null,
              teacher: course?.teacher || course?.creator_name || "",
            };
          })
          .filter(Boolean);
        if (!cancelled) {
          setEnrolled(normalized);
          localStorage.setItem(getEnrollmentKey(uid), JSON.stringify(normalized));
        }
      } catch (err) {
        console.error("Failed to load enrollments:", err);
        if (!cancelled) setEnrolled(loadEnrollments(uid));
      }
    };

    fetchEnrollments();

    const onEnrollUpdated = (e) => {
      if (e?.detail?.user_id && e.detail.user_id !== uid) return;
      setEnrolled(loadEnrollments(uid));
      fetchEnrollments();
    };
    window.addEventListener(ENROLL_EVENT, onEnrollUpdated);

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
  }, [uid]);

  // Find the current course through the route (id or code).
  const currentCourse = useMemo(() => {
    const list = Array.isArray(enrolled) ? enrolled : [];
    if (!list.length) {
      if (rawParam) return { id: undefined, code: String(rawParam), name: "" };
      return fallbackCourse;
    }
    if (rawParam) {
      const byId = list.find((c) => String(c.id) === String(rawParam));
      const byCode = list.find((c) => String(c.code) === String(rawParam));
      return byId || byCode || { id: undefined, code: String(rawParam), name: "" };
    }
    return list[0];
  }, [enrolled, rawParam]);

  const goToStudyProgress = () => {
    if (!currentCourse) return;
    const path =
      currentCourse?.id != null
        ? `/progress/${currentCourse.id}`
        : `/progress/${encodeURIComponent(currentCourse?.code || "")}`;
    navigate(path);
  };

  // Synchronize the learning progress of updates for other components or functions
  useEffect(() => {
    const onCourseProgressUpdated = (e) => {
      const { user_id, course_key, value } = e.detail || {};
      if (user_id !== uid) return;
      const myKey =
        currentCourse?.code ??
        (currentCourse?.id != null ? String(currentCourse.id) : "course");
      if (course_key !== myKey) return;
      setEnrolled((prev) => [...prev]);
    };

    const onStorage = (e) => {
      if (!e.key) return;
      const keyPrefix = courseProgressKey(uid, "").replace(/:$/, "");
      if (e.key.startsWith(keyPrefix)) {
        setEnrolled((prev) => [...prev]);
      }
    };

    window.addEventListener("courseProgress:updated", onCourseProgressUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("courseProgress:updated", onCourseProgressUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [uid, currentCourse?.id, currentCourse?.code]);

  // When a course is determined, standardize the URL routing, fix the id or course code.
  useEffect(() => {
    if (!enrolled.length || !currentCourse) return;
    const desired = currentCourse.id != null ? String(currentCourse.id) : currentCourse.code;
    if (!rawParam || String(rawParam) !== String(desired)) {
      navigate(`/course/${encodeURIComponent(desired)}`, { replace: true });
    }
  }, [enrolled, currentCourse, rawParam, navigate]);

  // Pull the materials of the current course and categorize the materials of task types (assignments/quizzes/experiments).
  useEffect(() => {
    let alive = true;

    setMatLoading(true);
    setMatError(null);
    setMaterials([]);
    setTaskMaterials([]);

    (async () => {
      try {
        const cid = currentCourse?.id;
        const ccode = currentCourse?.code;
        if (!cid && !ccode) {
          if (alive) {
            setMaterials([]);
            setTaskMaterials([]);
            setMatLoading(false);
          }
          return;
        }

        const params =
          cid && isNumericId(cid) ? { course_id: Number(cid) } : { course_code: String(ccode) };
        const { data } = await http.get("/materials", { params });
        if (!alive) return;

        const norm = normalizeMaterials(data);

        // Check the writing of different material names and match the materials with the current course.
        // (course_id/courseId vs id, course_code/courseCode/course.code vs code)
        const courseMatch = (m) => {
          const idOk =
            currentCourse?.id != null &&
            (String(m.course_id) === String(currentCourse.id) ||
              String(m.courseId) === String(currentCourse.id));
          const codeOk =
            currentCourse?.code &&
            (m.course_code === currentCourse.code ||
              m.courseCode === currentCourse.code ||
              m.course?.code === currentCourse.code);
          return idOk || codeOk;
        };
        const onlyThisCourse = norm.filter(courseMatch);

        setMaterials(onlyThisCourse);
        setTaskMaterials(onlyThisCourse.filter((m) => TASK_TYPES.has(m.file_type)));
      } catch (e) {
        console.error("fetch materials failed", e);
        if (alive) {
          setMatError("Failed to load materials");
          setMaterials([]);
          setTaskMaterials([]);
        }
      } finally {
        if (alive) setMatLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [currentCourse?.id, currentCourse?.code]);

  // Refresh materials when teacher uploads new documents.
  useEffect(() => {
    const onUpdated = (e) => {
      const { course_id, course_code } = e?.detail ?? {};
      const sameId =
        currentCourse?.id && course_id && String(course_id) === String(currentCourse.id);
      const sameCode =
        currentCourse?.code && course_code && String(course_code) === String(currentCourse.code);
      if (!sameId && !sameCode) return;

      const params = currentCourse?.id ? { course_id: currentCourse.id } : { course_code: currentCourse?.code };
      http
        .get("/materials", { params })
        .then(({ data }) => {
          const norm = normalizeMaterials(data);
          // Match materials to current course.
          const courseMatch = (m) => {
            const idOk =
              currentCourse?.id != null &&
              (String(m.course_id) === String(currentCourse.id) ||
                String(m.courseId) === String(currentCourse.id));
            const codeOk =
              currentCourse?.code &&
              (m.course_code === currentCourse.code ||
                m.courseCode === currentCourse.code ||
                m.course?.code === currentCourse.code);
            return idOk || codeOk;
          };
          const onlyThisCourse = norm.filter(courseMatch);
          setMaterials(onlyThisCourse);
          setTaskMaterials(onlyThisCourse.filter((m) => TASK_TYPES.has(m.file_type)));
        })
        .catch(() => {});
    };
    window.addEventListener("materials:updated", onUpdated);
    return () => window.removeEventListener("materials:updated", onUpdated);
  }, [currentCourse?.id, currentCourse?.code]);

  // Use taskMaterials to generate the list of assignments to be used.
  // Loads completion status from localStorage and maps materials to assignment objects
  const [assignments, setAssignments] = useState([]);
  useEffect(() => {
    const status = loadAssignmentStatus(uid, currentCourse?.code);
    if (!taskMaterials || taskMaterials.length === 0) {
      setAssignments([]);
      return;
    }
    const mapped = taskMaterials.map((m) => {
      // Try multiple possible fields for due date (assignment.due_date, deadline, due_date, uploaded_at)
      const when = m.assignment?.due_date || m.deadline || m.due_date || m.uploaded_at || "";
      const assignmentRecordId = m.assignment_id ?? m.assignment?.id ?? null;
      const parsedAssignmentId =
        assignmentRecordId != null && !Number.isNaN(Number(assignmentRecordId))
          ? Number(assignmentRecordId)
          : null;
      return {
        id: `m-${m.id}`,
        title: m.stored_name || m.original_name || "Untitled",
        percent: "",
        due: "",
        weight: 0,
        completed: Boolean(status[`m-${m.id}`]),
        dueAt: when,
        kind: m.file_type,
        assignmentId: parsedAssignmentId,
        sourceMaterialId: m.id,
        assignment: m.assignment ?? null,
      };
    });
    setAssignments(mapped);
  }, [taskMaterials, uid, currentCourse?.code]);

  // Calculate course progress: simple completion ratio
  const computedProgress = useMemo(() => {
    const totalWeight = assignments.reduce((s, a) => s + (a.weight || 0), 0);
    if (totalWeight > 0) {
      const doneWeight = assignments.reduce((s, a) => s + (a.completed ? a.weight || 0 : 0), 0);
      return (doneWeight / totalWeight) * 100;
    }
    const total = assignments.length;
    if (!total) return 0;
    const done = assignments.filter((a) => a.completed).length;
    return (done / total) * 100;
  }, [assignments]);

  const courseKey =
    currentCourse?.code ??
    (currentCourse?.id != null ? String(currentCourse.id) : "course");

  const savedOverall = loadCourseProgress(uid, courseKey);

  const progressValue =
    savedOverall != null
      ? savedOverall
      : typeof currentCourse?.progress === "number" && currentCourse.progress >= 0
      ? currentCourse.progress
      : computedProgress;

  // Toggle assignment completion status and save to localStorage
  const toggleAssignment = (id) => {
    setAssignments((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a));
      // Build status map from all assignments and save to localStorage
      const status = next.reduce((obj, a) => {
        obj[a.id] = a.completed;
        return obj;
      }, {});
      saveAssignmentStatus(uid, currentCourse?.code, status);
      return next;
    });
  };

  // Upload the assignment files to the back end and display the status.
  const handleSubmitAssignment = (a) => {
    const studentId = getCurrentUserId();
    // Try multiple possible assignment ID fields
    const assignmentIdCandidate = a.assignmentId ?? a.assignment?.id ?? a.assignment_id ?? null;
    const assignmentId = assignmentIdCandidate != null ? Number(assignmentIdCandidate) : NaN;
    if (!studentId || Number.isNaN(assignmentId)) {
      alert("Submission failed: missing student or assignment ID");
      return;
    }
    // Programmatically trigger file input dialog
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "*/*";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("student_id", studentId);
        const url = `/materials/assignments/${assignmentId}/submissions`;
        const res = await http.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
        if (res.status >= 200 && res.status < 300) {
          alert("Submission successful!");
        } else {
          alert("Submission failed, please try again");
        }
      } catch (err) {
        console.error("submit failed:", err);
        const status = err?.response?.status;
        alert(`Submission failed${status ? ` (HTTP ${status})` : ""}`);
      }
    };
    input.click();
  };

  const courseCode = currentCourse?.code || "No course selected";
  const courseName = currentCourse?.name || "";
  const courseMeta = currentCourse?.meta || "";
  const courseTeacher = currentCourse?.teacher || "";

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

        <Box
          sx={{ 
            display: "flex",
            alignItems: "center",
            gap: 1,
            mt: -1,
            mb: 2,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Course
          </Typography>
          <CircleIcon 
            sx={{
              fontSize: 10,
              color: "#B3B3B3",
              marginLeft: "80px",
            }} 
          />
          <Typography variant="h6" sx={{ color: "#7a7a7a" }}>
            Student
          </Typography>
        </Box>

        <Paper
          elevation={1}
          sx={{
            ml: 2,
            mr: 2,
            p: 2.5,
            borderRadius: 2,
            mb: 3,
            mt: 1,
            boxShadow: 5,
          }}
        >
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
        </Paper>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(12, 1fr)" },
            gap: 3,
          }}
        >
          <Paper
            elevation={1}
            sx={{
              ml: 2,
              mr: 2,
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

            {matLoading && (
              <Typography variant="body2" color="text.secondary">
                Loading materials…
              </Typography>
            )}
            {matError && (
              <Typography variant="body2" color="error">
                {matError}
              </Typography>
            )}
            {!matLoading && !matError && materials.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No materials yet.
              </Typography>
            )}

            {!matLoading &&
              !matError &&
              materials.map((m) => {
                const color = extColor[m.ext] || extColor.default;
                const sizeKB = m.file_size ? Math.round(m.file_size / 1024) : null;
                const dateStr = m.uploaded_at
                  ? new Date(m.uploaded_at).toLocaleDateString()
                  : "";
                const label = labelFromExt(m.ext);
                const fileName = m.stored_name || m.original_name || "file";
                return (
                  <Paper
                    key={m.id}
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
                        bgcolor: color,
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{ fontWeight: 700, lineHeight: 1.1 }}
                        noWrap
                        title={fileName}
                      >
                        {fileName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {label}
                        {sizeKB ? ` · ${sizeKB} KB` : ""}
                        {dateStr ? ` · ${dateStr}` : ""}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ textTransform: "none", borderRadius: 1.2 }}
                      disabled={!m.download_url}
                      onClick={() =>
                        m.download_url && downloadWithAuth(m.download_url, fileName)
                      }
                    >
                      Download
                    </Button>
                  </Paper>
                );
              })}
          </Paper>

          <Paper
            elevation={1}
            sx={{
              ml: 2,
              mr: 2,
              gridColumn: { xs: "1 / -1", md: "span 6" },
              p: 2,
              borderRadius: 2,
              boxShadow: 2,
            }}
          >
            <ButtonBase
              onClick={goToStudyProgress}
              sx={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                alignItems: "center",
                borderRadius: 2,
                p: 1,
                cursor: "pointer",
                "&:hover": { bgcolor: "action.hover" },
              }}
              aria-label={`Open study progress for ${courseCode}`}
              title="Open Study Progress"
            >
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Course Progress
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                <ProgressCircular value={progressValue} />
              </Box>
            </ButtonBase>
          </Paper>

          <Paper
            elevation={1}
            sx={{
              ml: 2,
              mr: 2,
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
            </Box>

            <Divider sx={{ mb: 1 }} />

            {assignments.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No assignments yet.
              </Typography>
            )}

            {assignments.map((a) => {
              const timeLeft = formatTimeLeft(a.dueAt);
              const timeLeftChipSX = timeLeft.startsWith("Overdue")
                ? { borderColor: "error.main", color: "error.main" }
                : { borderColor: "info.main", color: "info.main" };
              const kind = a.kind || inferKindFromTitle(a.title);

              return (
                <Box
                  key={a.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "auto 2fr auto" },
                    alignItems: "center",
                    columnGap: 2,
                    rowGap: 2,
                    py: 1.2,
                  }}
                >
                  <Chip
                    label={prettyKind(kind)}
                    size="small"
                    variant="outlined"
                    sx={kindChipSX(kind)}
                  />

                  <Typography fontWeight={600} noWrap title={a.title}>
                    {a.title}
                  </Typography>

                  <Box
                    sx={{
                      justifySelf: "end",
                      display: "flex",
                      gap: 1,
                      alignItems: "center",
                    }}
                  >
                    {timeLeft && (
                      <Chip
                        label={timeLeft}
                        size="small"
                        variant="outlined"
                        sx={timeLeftChipSX}
                      />
                    )}
                    <Button
                      size="small"
                      variant="contained"
                      sx={{ textTransform: "none" }}
                      onClick={() => handleSubmitAssignment(a)}
                    >
                      Upload
                    </Button>
                  </Box>
                </Box>
              );
            })}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

export default CourseDetail;
