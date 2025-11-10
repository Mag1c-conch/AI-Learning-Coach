import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Divider,
  Checkbox,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import InputBase from "@mui/material/InputBase";
import SearchIcon from "@mui/icons-material/Search";
import CircleIcon from "@mui/icons-material/Circle";
// import NotificationsIcon from "@mui/icons-material/Notifications"; // ❌ 不再需要
import Sidebar from "../components/Sidebar.jsx";
import { CircularProgress, circularProgressClasses } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { ButtonBase } from "@mui/material";
import http from "../api/http";
import NotificationsBell from "../components/Notifications.jsx"; // ✅ 全局同步小铃铛

/** ========= 常量 & 工具 ========= */
const ENROLL_EVENT = "enrollment:updated";
const TASK_TYPES = new Set(["assignment", "quiz", "lab"]);
const fallbackCourse = { code: "COMP9814", name: "Artificial Intelligence" };

const isNumericId = (v) => /^\d+$/.test(String(v));

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
function loadEnrollments(uid = getCurrentUserId()) {
  if (!uid) return [];
  try {
    const stored = JSON.parse(localStorage.getItem(getEnrollmentKey(uid)) || "[]");
    if (!Array.isArray(stored)) return [];
    // 规范化 + 去重
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

/** 进度环 */
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

/** 顶部搜索框样式 */
const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.action.hover,
  "&:hover": { backgroundColor: alpha(theme.palette.common.black, 0.1) },
  display: "flex",
  alignItems: "center",
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: "200px",
  paddingLeft: theme.spacing(1),
  [theme.breakpoints.up("sm")]: { width: "250px" },
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

/** 文件扩展名→颜色/标签 */
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
  } catch {}
}

/** kind 显示/样式 */
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

/** 规范化 materials（加 ext / file_type / download_url / uploaded_at） */
function normalizeMaterials(arr = []) {
  const getExt = (name) => {
    if (!name) return "";
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
  };
  return (Array.isArray(arr) ? arr : []).map((m) => {
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

/** 剩余时间 */
function formatTimeLeft(isoLike) {
  if (!isoLike) return "";
  const now = Date.now();
  const due = new Date(isoLike).getTime();
  if (Number.isNaN(due)) return "";
  const diff = due - now;
  const past = diff < 0;
  const abs = Math.abs(diff);
  const SEC = 1000,
    MIN = 60 * SEC,
    HOUR = 60 * MIN,
    DAY = 24 * HOUR;
  const days = Math.floor(abs / DAY);
  const hours = Math.floor((abs % DAY) / HOUR);
  const mins = Math.floor((abs % HOUR) / MIN);
  const part = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  return past ? `Overdue ${part}` : `Due in ${part}`;
}

/** 鉴权下载（axios blob） */
const filenameFromDisposition = (disposition) => {
  if (!disposition) return null;
  const m1 = /filename\*\=UTF-8''([^;]+)/i.exec(disposition);
  if (m1) return decodeURIComponent(m1[1]);
  const m2 = /filename="?([^"]+)"?/i.exec(disposition);
  return m2 ? m2[1] : null;
};
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
    alert(`下载失败${status ? `（HTTP ${status}）` : ""}，请稍后再试`);
  }
}

/** ========= 组件 ========= */
function CourseDetail() {
  // 兼容两种路由参数：/course/:id 或 /course/:courseId 或直接用课程 code
  const { id: idParam, courseId: courseIdParam } = useParams();
  const rawParam = idParam ?? courseIdParam ?? null;
  const navigate = useNavigate();

  const [enrolled, setEnrolled] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [taskMaterials, setTaskMaterials] = useState([]); // 仅 assignment/quiz/lab
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
  

  /** 加载选课信息（后端优先，失败回退本地）+ 跨标签/事件同步 */
  useEffect(() => {
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
              meta: course?.description ? `· ${course.description}` : "",
              progress: course?.progress ?? null, // 若后端有进度则用它
              teacher: course?.teacher || course?.creator_name || "",
            };
          })
          .filter(Boolean);
        if (!cancelled) {
          setEnrolled(normalized);
          localStorage.setItem(getEnrollmentKey(uid), JSON.stringify(normalized));
        }
      } catch (err) {
        console.error("加载选课信息失败：", err);
        // 回退到本地已存
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

  /** 当前课程：优先匹配 id，其次 code；没有就兜底 */
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
  
  useEffect(() => {
    const onCourseProgressUpdated = (e) => {
      const { user_id, course_key, value } = e.detail || {};
      if (user_id !== uid) return;
      const myKey =
        currentCourse?.code ??
        (currentCourse?.id != null ? String(currentCourse.id) : "course");
      if (course_key !== myKey) return;
      setEnrolled((prev) => [...prev]); // 渲染重新计算 progressValue
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
  
  /** 规范路由：将参数重写为规范 id 或 code */
  useEffect(() => {
    if (!enrolled.length || !currentCourse) return;
    const desired = currentCourse.id != null ? String(currentCourse.id) : currentCourse.code;
    if (!rawParam || String(rawParam) !== String(desired)) {
      navigate(`/course/${encodeURIComponent(desired)}`, { replace: true });
    }
  }, [enrolled, currentCourse, rawParam, navigate]);

  /** 加载 materials（并筛出任务型 materials） */
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

        const params = cid && isNumericId(cid) ? { course_id: Number(cid) } : { course_code: String(ccode) };
        const { data } = await http.get("/materials", { params });
        if (!alive) return;

        const norm = normalizeMaterials(data);

        // 二次过滤确保只保留当前课程数据
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

  /** 老师端上传后刷新 */
  useEffect(() => {
    const onUpdated = (e) => {
      const { course_id, course_code } = e?.detail ?? {};
      const sameId = currentCourse?.id && course_id && String(course_id) === String(currentCourse.id);
      const sameCode =
        currentCourse?.code && course_code && String(course_code) === String(currentCourse.code);
      if (!sameId && !sameCode) return;

      const params = currentCourse?.id ? { course_id: currentCourse.id } : { course_code: currentCourse?.code };
      http
        .get("/materials", { params })
        .then(({ data }) => {
          const norm = normalizeMaterials(data);
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

  /** Assignments：从任务型 materials 构建；支持勾选持久化 */
  const [assignments, setAssignments] = useState([]);
  useEffect(() => {
    const status = loadAssignmentStatus(uid, currentCourse?.code);
    if (!taskMaterials || taskMaterials.length === 0) {
      // 无任务型 materials，清空
      setAssignments([]);
      return;
    }
    const mapped = taskMaterials.map((m) => {
      const when = m.assignment?.due_date || m.deadline || m.due_date || m.uploaded_at || "";
      const assignmentRecordId = m.assignment_id ?? m.assignment?.id ?? null;
      const parsedAssignmentId =
        assignmentRecordId != null && !Number.isNaN(Number(assignmentRecordId))
          ? Number(assignmentRecordId)
          : null;
      return {
        id: `m-${m.id}`,
        title: m.stored_name || m.original_name || "Untitled",
        percent: "", // 若后端提供占比可使用
        due: "",
        weight: 0, // 默认 0，走“数量制”兜底
        completed: Boolean(status[`m-${m.id}`]),
        dueAt: when,
        kind: m.file_type, // quiz / assignment / lab
        assignmentId: parsedAssignmentId, // 提交用 assignment_id
        sourceMaterialId: m.id,
        assignment: m.assignment ?? null,
      };
    });
    setAssignments(mapped);
  }, [taskMaterials, uid, currentCourse?.code]);

  /** 计算课程进度：优先用后端 progress；否则用完成权重/数量 */
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

  // 课程唯一键：优先 code，没 code 用 id
  const courseKey =
    currentCourse?.code ??
    (currentCourse?.id != null ? String(currentCourse.id) : "course");

  const savedOverall = loadCourseProgress(uid, courseKey);

  const progressValue =
    savedOverall != null
      ? savedOverall
      : (typeof currentCourse?.progress === "number" && currentCourse.progress >= 0
          ? currentCourse.progress
          : computedProgress);

  /** 勾选完成并持久化 */
  const toggleAssignment = (id) => {
    setAssignments((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a));
      const status = next.reduce((obj, a) => {
        obj[a.id] = a.completed;
        return obj;
      }, {});
      saveAssignmentStatus(uid, currentCourse?.code, status);
      return next;
    });
  };

  /** 提交作业（文件上传） */
  const handleSubmitAssignment = (a) => {
    const studentId = getCurrentUserId();
    const assignmentIdCandidate = a.assignmentId ?? a.assignment?.id ?? a.assignment_id ?? null;
    const assignmentId = assignmentIdCandidate != null ? Number(assignmentIdCandidate) : NaN;
    if (!studentId || Number.isNaN(assignmentId)) {
      alert("提交失败：学生标识或作业标识不完整");
      return;
    }
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
          alert("提交成功！");
        } else {
          alert("提交失败，请稍后再试");
        }
      } catch (err) {
        console.error("submit failed:", err);
        const status = err?.response?.status;
        alert(`提交失败${status ? `（HTTP ${status}）` : ""}`);
      }
    };
    input.click();
  };

  /** ========= UI ========= */
  const courseCode = currentCourse?.code || "No course selected";
  const courseName = currentCourse?.name || "";
  const courseMeta = currentCourse?.meta || "";
  const courseTeacher = currentCourse?.teacher || "";

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Sidebar />

      {/* 右侧主区域 */}
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

        {/* 右上角 Search + 全局通知 */}
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
            <StyledInputBase placeholder="Search" inputProps={{ "aria-label": "Search" }} />
          </Search>
          {/* ✅ 统一的通知铃铛（与 Dashboard 等页面共享数据和弹窗） */}
          <NotificationsBell />
        </Box>

        {/* 页面标题 */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1, mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Course
          </Typography>
          <CircleIcon sx={{ marginLeft: "15%", fontSize: 10, color: "#B3B3B3" }} />
          <Typography variant="h6" sx={{ color: "#7a7a7a" }}>
            Student
          </Typography>
        </Box>

        {/* 课程标题卡片 */}
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
        </Paper>

        {/* 三栏：Materials / Progress / Assignments */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(12, 1fr)" }, gap: 3 }}>
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

            {matLoading && <Typography variant="body2" color="text.secondary">Loading materials…</Typography>}
            {matError && <Typography variant="body2" color="error">{matError}</Typography>}
            {!matLoading && !matError && materials.length === 0 && (
              <Typography variant="body2" color="text.secondary">No materials yet.</Typography>
            )}

            {!matLoading && !matError && materials.map((m) => {
              const color = extColor[m.ext] || extColor.default;
              const sizeKB = m.file_size ? Math.round(m.file_size / 1024) : null;
              const dateStr = m.uploaded_at ? new Date(m.uploaded_at).toLocaleDateString() : "";
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
                  <Box sx={{ width: 4, height: 28, borderRadius: 2, bgcolor: color }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }} noWrap title={fileName}>
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
                    onClick={() => m.download_url && downloadWithAuth(m.download_url, fileName)}
                  >
                    Download
                  </Button>
                </Paper>
              );
            })}
          </Paper>

          {/* Course Progress */}
          <Paper
            elevation={1}
            sx={{
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

          {/* Assignments（仅任务型 materials） */}
          <Paper elevation={1} sx={{ gridColumn: "1 / -1", p: 2, borderRadius: 2, mt: 5 }}>
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
                    gridTemplateColumns: { xs: "1fr", md: "auto 2fr auto" }, // 类型 | 标题 | 提交/剩余
                    alignItems: "center",
                    columnGap: 2,
                    rowGap: 2,
                    py: 1.2,
                  }}
                >
                  <Chip label={prettyKind(kind)} size="small" variant="outlined" sx={kindChipSX(kind)} />

                  <Typography fontWeight={600} noWrap title={a.title}>
                    {a.title}
                  </Typography>

                  <Box sx={{ justifySelf: "end", display: "flex", gap: 1, alignItems: "center" }}>
                    {timeLeft && <Chip label={timeLeft} size="small" variant="outlined" sx={timeLeftChipSX} />}
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
