// src/Student/StudyProgress.jsx
import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  circularProgressClasses,
  InputBase,
  IconButton,
  Checkbox,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsBell from "../components/Notifications.jsx";
import CircleIcon from "@mui/icons-material/Circle";
import Sidebar from "../components/Sidebar.jsx";
import { useParams, useNavigate } from "react-router-dom";
import http from "../api/http";

/* ===================== Search box ===================== */
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

/* ===================== Helpers (auth & enrollments) ===================== */
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
const enrollKey = (uid) => `enrolledCourses:${uid}`;
const loadEnrollments = (uid) => {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(enrollKey(uid));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

/* ===================== API to backend study plan ===================== */
/** 生成并保存下周学习计划（后端会优先调 Gemini，失败自动 fallback） */
async function apiCreatePlan(studentId) {
  const res = await http.post("/get_plan", { student_id: studentId });
  return res.data; // StudyPlan 对象（通常形如 { ..., plan: {...} }）
}
/** 读取学习计划（可选 week_start=YYYY-MM-DD，不传取最近一条） */
async function apiGetPlan(studentId, weekStart) {
  const qs = weekStart ? `?week_start=${encodeURIComponent(weekStart)}` : "";
  const res = await http.get(`/assistant/study_plan/${studentId}${qs}`);
  return res.data;
}

/* ===================== Type helpers ===================== */
const prettyType = (t) => {
  const s = String(t || "").toLowerCase();
  if (s === "assignment" || s === "assignments" || s === "ass") return "Assignments";
  if (s === "lab" || s === "labs") return "Labs";
  if (s === "quiz" || s === "quizzes") return "Quizzes";
  if (s === "materials" || s === "material") return "Materials";
  return "Others";
};
function typeFromMaterial(m) {
  const t = String(m.file_type || "").toLowerCase();
  const name = String(m.stored_name || m.original_name || "").toLowerCase();

  if (t.includes("assignment") || name.includes("assignment") || /\b(a|assn|hw)\d+\b/.test(name)) {
    return "Assignments";
  }
  if (t.includes("quiz") || name.includes("quiz")) return "Quizzes";
  if (t.includes("lab") || name.includes("lab")) return "Labs";
  return "Materials";
}

/* ===================== Local progress storage ===================== */
const progressKey = (uid, courseKey) => `sp:progress:${uid || "anon"}:${courseKey || "course"}`;
const courseProgressKey = (uid, courseKey) =>
  `courseProgress:${uid || "anon"}:${courseKey || "course"}`;
function loadProgress(uid, courseKey) {
  try {
    return JSON.parse(localStorage.getItem(progressKey(uid, courseKey)) || "{}");
  } catch {
    return {};
  }
}
function saveProgress(uid, courseKey, obj) {
  try {
    localStorage.setItem(progressKey(uid, courseKey), JSON.stringify(obj));
  } catch {}
}

/* ===================== Donut ===================== */
function ProgressDonut({ value = 0, size = 160, thickness = 7 }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
      <CircularProgress
        variant="determinate"
        value={100}
        size={size}
        thickness={thickness}
        sx={{
          color: "#f0e5ff",
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

/* ===================== Local quick plan (round-robin) ===================== */
function roundRobinDistribute(items, days = 7, perDayCap = Infinity) {
  const buckets = Array.from({ length: days }, () => []);
  if (!Array.isArray(items) || !items.length) return buckets;
  let i = 0;
  for (const it of items) {
    let tries = 0;
    while (tries < days && buckets[i % days].length >= perDayCap) {
      i++;
      tries++;
    }
    buckets[i % days].push(it);
    i++;
  }
  return buckets;
}
function expandByRemainder(t, percent = 0, step = 25) {
  const left = Math.max(0, 100 - (Number(percent) || 0));
  const n = Math.max(1, Math.ceil(left / step));
  if (n === 1) return [{ title: t.title, type: t.type, part: null }];

  const arr = [];
  for (let i = 1; i <= n; i++) {
    arr.push({
      title: `${t.title} (${i}/${n})`,
      type: t.type,
      part: `${i}/${n}`,
    });
  }
  return arr;
}

/* ===================== Study plan dialog ===================== */
function StudyPlanDialog({ open, onClose, plan, startLabel = "Today" }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Generated Study Plan (Local / AI)</DialogTitle>
      <DialogContent dividers>
        {plan.map((p) => (
          <Box key={p.day} sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Day {p.day} ({startLabel}+{p.day - 1})
            </Typography>
            {p.items.length === 0 ? (
              <Typography color="text.secondary">No tasks.</Typography>
            ) : (
              p.items.map((it, idx) => (
                <Typography key={idx} sx={{ pl: 1 }}>
                  • {it.title}
                </Typography>
              ))
            )}
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ===================== Map server plan -> dialog data ===================== */
function mapServerPlanToDialog(planObj, courses = []) {
  if (!planObj || !Array.isArray(planObj.days)) return [];
  const { days } = planObj;

  const courseMap = new Map();
  for (const c of Array.isArray(courses) ? courses : []) {
    courseMap.set(c.id, c.code || c.name || String(c.id));
  }

  const sorted = [...days].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return sorted.map((d, idx) => {
    const items = (Array.isArray(d.tasks) ? d.tasks : []).map((t) => {
      const code = t.course_id != null ? courseMap.get(t.course_id) : null;
      const time =
        t.start_time && t.end_time ? ` (${t.start_time}–${t.end_time})` : "";
      const label = [
        t.title || "Study Session",
        code ? ` · ${code}` : "",
        time,
      ].join("");
      return { title: label, type: "Server" };
    });
    return { day: idx + 1, items };
  });
}

/* ===================== Timetable 同步工具 ===================== */
const TT_KEY = (uid) => `timetableEvents:${uid || "anon"}`;

// 后端 plan_payload -> 日历事件数组
function serverPlanToEvents(planObj) {
  if (!planObj || !Array.isArray(planObj.days)) return [];
  const out = [];
  for (const d of planObj.days) {
    const dateStr = d.date; // YYYY-MM-DD
    for (const t of d.tasks || []) {
      if (!t.start_time || !t.end_time) continue;
      const startISO = new Date(`${dateStr}T${t.start_time}:00`).toISOString();
      const endISO   = new Date(`${dateStr}T${t.end_time}:00`).toISOString();
      out.push({
        title: t.title || "Study Session",
        start: startISO,
        end: endISO,
        courseId: t.course_id ?? null,
        materialId: t.material_id ?? null,
        meta: { source: "ai-plan" },
      });
    }
  }
  return out;
}

// 写入/合并本地事件并广播
function ttUpsertEvents(uid, newEvents = []) {
  try {
    const raw = localStorage.getItem(TT_KEY(uid));
    const old = raw ? JSON.parse(raw) : [];
    const keyOf = (e) => `${e.start}|${e.end}|${e.title}|${e.courseId ?? ""}|${e.materialId ?? ""}`;
    const seen = new Set(old.map(keyOf));
    const merged = [...old];
    for (const ev of newEvents) {
      const k = keyOf(ev);
      if (!seen.has(k)) {
        merged.push(ev);
        seen.add(k);
      }
    }
    localStorage.setItem(TT_KEY(uid), JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("timetable:updated", { detail: { count: merged.length } }));
  } catch {}
}

/* ===================== Keys for storing plan (today) ===================== */
const planStorageKey = (uid, courseKey, dateStr) =>
  `studyPlan:${uid || "anon"}:${courseKey || "course"}:${dateStr}`;
const todayStr = () => new Date().toISOString().slice(0, 10);
const courseKeyFromCourse = (c) => c?.code ?? (c?.id != null ? String(c.id) : "course");
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

/* ===================== Progress chip ===================== */
function PercentChip({ value = 0, onChange }) {
  const next = () => {
    const steps = [0, 25, 50, 75, 100];
    const idx = steps.findIndex((s) => s === value);
    const v = steps[(idx + 1) % steps.length];
    onChange?.(v);
  };
  return (
    <Tooltip title="Click to mark progress (0/25/50/75/100%)">
      <Button
        variant="outlined"
        size="small"
        onClick={next}
        sx={{
          minWidth: 84,
          borderRadius: 1.2,
          fontWeight: 700,
        }}
      >
        {value}%
      </Button>
    </Tooltip>
  );
}

/* ===================== Main component ===================== */
function StudyProgress() {
  const { code: codeParam, id: idParam } = useParams();
  const rawParam = codeParam ?? idParam ?? null;
  const navigate = useNavigate();
  const uid = getCurrentUserId();

  // enrollments & current course
  const [enrolled, setEnrolled] = useState(() => loadEnrollments(uid));
  useEffect(() => setEnrolled(loadEnrollments(uid)), [uid]);

  const currentCourse = useMemo(() => {
    const list = Array.isArray(enrolled) ? enrolled : [];
    if (!list.length) return { id: undefined, code: String(rawParam || ""), name: "" };
    if (rawParam) {
      const byId = list.find((c) => String(c.id) === String(rawParam));
      const byCode = list.find((c) => String(c.code) === String(rawParam));
      return byId || byCode || list[0];
    }
    return list[0];
  }, [enrolled, rawParam]);

  const courseKey =
    currentCourse?.code ?? (currentCourse?.id != null ? String(currentCourse.id) : "course");

  // fetch tasks
  const [tasks, setTasks] = useState([]); // {id,title,type,percent}
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    async function fetchAll() {
      const cid = currentCourse?.id;
      if (!cid) {
        setTasks([]);
        return;
      }
      setLoading(true);
      setErr(null);
      try {
        const [assRes, matRes] = await Promise.all([
          http.get("/assignments", { params: { course_id: cid } }).catch(() => ({ data: [] })),
          http
            .get("/materials", { params: { course_id: cid, include_submissions: false } })
            .catch(() => ({ data: [] })),
        ]);

        const saved = loadProgress(uid, courseKey);

        // materials
        const matsRaw = Array.isArray(matRes.data) ? matRes.data : [];
        const materialItems = matsRaw
          .filter((m) => m.file_type !== "assignment_submission")
          .map((m) => {
            const id = `mat-${m.id}`;
            return {
              id,
              title: m.stored_name || m.original_name || "Untitled",
              type: typeFromMaterial(m),
              dueAt: m.assignment?.due_date || m.due_date || m.deadline || null,
              assignmentId: m.assignment_id ?? m.assignment?.id ?? null,
              percent: Number(saved?.[id]) || 0,
            };
          });

        // avoid duplicate assignments
        const coveredAssignmentIds = new Set(
          materialItems.map((m) => m.assignmentId).filter(Boolean)
        );

        // assignments
        const assRaw = Array.isArray(assRes.data) ? assRes.data : [];
        const assignmentItems = assRaw
          .filter((a) => !coveredAssignmentIds.has(a.id))
          .map((a) => {
            const id = `ass-${a.id}`;
            return {
              id,
              title: a.title || "Untitled",
              type: "Assignments",
              dueAt: a.due_date || null,
              assignmentId: a.id,
              percent: Number(saved?.[id]) || 0,
            };
          });

        const merged = [...materialItems, ...assignmentItems];
        if (alive) setTasks(merged);
      } catch (e) {
        if (alive) {
          setErr("Failed to load data");
          setTasks([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    fetchAll();
    return () => {
      alive = false;
    };
  }, [currentCourse?.id, courseKey, uid]);

  // selected
  const [selected, setSelected] = useState([]);
  useEffect(() => setSelected(tasks.map((t) => t.id)), [tasks]);
  const toggleSelect = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // update progress
  const setTaskPercent = (id, percent) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, percent } : t));
      const saved = loadProgress(uid, courseKey);
      saved[id] = percent;
      saveProgress(uid, courseKey, saved);
      return next;
    });
  };

  // overall
  const overall = useMemo(() => {
    if (!tasks.length) return 0;
    const sum = tasks.reduce((s, t) => s + (Number(t.percent) || 0), 0);
    return Math.round(sum / tasks.length);
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(courseProgressKey(uid, courseKey), String(overall));
    window.dispatchEvent(
      new CustomEvent("courseProgress:updated", {
        detail: { user_id: uid, course_key: courseKey, value: overall },
      })
    );
  }, [overall, uid, courseKey]);

  // type summary
  const typeSummary = useMemo(() => {
    const wanted = new Set(["Assignments", "Labs", "Quizzes", "Materials"]);
    const groups = new Map(); // type => { total, sum }
    for (const t of tasks) {
      const type = prettyType(t.type);
      if (!wanted.has(type)) continue;
      const g = groups.get(type) || { total: 0, sum: 0 };
      g.total += 1;
      g.sum += Number(t.percent) || 0;
      groups.set(type, g);
    }
    const order = { Assignments: 1, Labs: 2, Quizzes: 3, Materials: 4 };
    return Array.from(groups.entries())
      .map(([type, g]) => ({
        type,
        items: g.total,
        percent: g.total ? Math.round(g.sum / g.total) : 0,
      }))
      .sort((a, b) => (order[a.type] || 9) - (order[b.type] || 9));
  }, [tasks]);

  // study plan dialog + snack
  const [planOpen, setPlanOpen] = useState(false);
  const [planData, setPlanData] = useState([]);
  const [serverPlanLoading, setServerPlanLoading] = useState(false);
  const [serverPlanErr, setServerPlanErr] = useState(null);

  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");
  const [snackSev, setSnackSev] = useState("success"); // success | info | warning | error

  // Quick Plan (local)
  const generatePlan = () => {
    const DAYS = 7;
    const STEP = 25;
    const perDayCapCore = Infinity;
    const perDayCapMat = Infinity;

    const saved = loadProgress(uid, courseKey);
    const pick = tasks
      .filter((t) => selected.includes(t.id))
      .map((t) => ({ ...t, type: prettyType(t.type) }));

    const coreTypes = new Set(["Assignments", "Labs", "Quizzes"]);
    const coreList = pick.filter((t) => coreTypes.has(t.type));
    const matList = pick.filter((t) => t.type === "Materials");

    const byDue = (a, b) => new Date(a.dueAt || 0) - new Date(b.dueAt || 0);
    coreList.sort(byDue);
    matList.sort(byDue);

    const coreSessions = coreList.flatMap((t) => {
      const p = Number(saved?.[t.id]) || 0;
      return expandByRemainder(t, p, STEP);
    });
    const matSessions = matList.flatMap((t) => {
      const p = Number(saved?.[t.id]) || 0;
      return expandByRemainder(t, p, STEP);
    });

    const coreBuckets = roundRobinDistribute(coreSessions, DAYS, perDayCapCore);
    const matBuckets = roundRobinDistribute(matSessions, DAYS, perDayCapMat);

    const plan = Array.from({ length: DAYS }, (_, i) => {
      const items = [...coreBuckets[i], ...matBuckets[i]].map((it) => ({
        title: it.title,
        type: it.type,
      }));
      return { day: i + 1, items };
    });

    setPlanData(plan);
    setPlanOpen(true);
    setSnackMsg("Quick plan generated");
    setSnackSev("success");
    setSnackOpen(true);
  };

  // AI Plan (server)
  const generatePlanFromServer = async () => {
    const studentId = uid;
    if (!studentId) {
      const msg = "未登录或无法识别学生ID";
      alert(msg);
      setSnackMsg(msg);
      setSnackSev("error");
      setSnackOpen(true);
      return;
    }
    setServerPlanLoading(true);
    setServerPlanErr(null);
    try {
      const created = await apiCreatePlan(studentId); // 生成并保存
      // 兼容两种返回：{ plan: {...} } 或直接 {...}
      const planDict = created?.plan ?? created;
      // 保存一份用于“同步到日历”
      if (typeof window !== "undefined") {
        window.lastServerPlan = planDict;
      }

      const planForDialog = mapServerPlanToDialog(planDict, enrolled);
      setPlanData(planForDialog);
      setPlanOpen(true);

      const source = planDict?.metadata?.source;
      setSnackMsg(source === "fallback" ? "Plan generated (fallback)" : "AI plan generated");
      setSnackSev("success");
      setSnackOpen(true);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.error || "Failed to generate study plan";
      setServerPlanErr(msg);
      alert(msg);
      setSnackMsg(msg);
      setSnackSev("error");
      setSnackOpen(true);
    } finally {
      setServerPlanLoading(false);
    }
  };

  // 一键同步到 Timetable（日历）
  const handleSyncToTimetable = () => {
    const lastPlan =
      (typeof window !== "undefined" && window.lastServerPlan) || null;
    if (!uid || !lastPlan) {
      setSnackMsg("No AI study plans available to sync or not logged in");
      setSnackSev("error");
      setSnackOpen(true);
      return;
    }
    const events = serverPlanToEvents(lastPlan);
    ttUpsertEvents(uid, events);
    setSnackMsg(`Successfully synced ${events.length} tasks to the Timetable`);
    setSnackSev("success");
    setSnackOpen(true);
  };

  const courseLabel = currentCourse?.code || "Course";

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Sidebar />

      <Box
        className="main-content"
        sx={{ flex: 1, backgroundColor: "#f5f6fa", p: 3, overflowY: "auto", position: "relative" }}
      >
        {/* divide line */}
        <Box
          sx={{
            position: "absolute",
            top: "63px",
            left: 0,
            width: "100%",
            height: "2px",
            backgroundColor: "rgba(21,19,19,.3)",
          }}
        />

        {/* search & notification */}
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
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase placeholder="Search" inputProps={{ "aria-label": "Search" }} />
          </Search>
          <IconButton>
            <NotificationsBell />
          </IconButton>
        </Box>

        {/* title */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1, mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Study Progress
          </Typography>
          <CircleIcon sx={{ ml: "15%", fontSize: 10, color: "#B3B3B3" }} />
          <Typography variant="h6" sx={{ color: "#7a7a7a" }}>
            Student
          </Typography>
        </Box>

        {/* course title card */}
        <Paper sx={{ p: 2, borderRadius: 2, mb: 3, boxShadow: 5 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {courseLabel} · Progress
          </Typography>
        </Paper>

        {/* Study Plan + Donut */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          {/* Study Plan */}
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 2, height: { md: 350 } }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
                Study Plan
              </Typography>

              {/* 后端 AI 计划 */}
              <Button
                variant="contained"
                onClick={generatePlanFromServer}
                sx={{
                  textTransform: "none",
                  backgroundColor: "#1f2a44",
                  color: "#fff",
                  fontWeight: 700,
                  borderRadius: "12px",
                  px: 1.5,
                  py: 1,
                  boxShadow: 3,
                  "&:hover": { backgroundColor: "#1a2438", boxShadow: 6 },
                }}
                disabled={serverPlanLoading}
              >
                {serverPlanLoading ? "Generating..." : "AI Plan (Next 7d)"}
              </Button>

              {/* 同步到 Timetable */}
              <Button
                variant="outlined"
                onClick={handleSyncToTimetable}
                sx={{ textTransform: "none", borderRadius: "12px", px: 1.5, py: 1 }}
              >
                Sync to Timetable
              </Button>
            </Box>

            {serverPlanErr && (
              <Typography color="error" variant="caption" sx={{ ml: 0.5 }}>
                {serverPlanErr}
              </Typography>
            )}

            {/* task list */}
            <Box
              sx={{
                pr: 1,
                maxHeight: { xs: 360, md: 280 },
                overflowY: "auto",
                "&::-webkit-scrollbar": { width: 8 },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "rgba(0,0,0,0.25)",
                  borderRadius: 6,
                },
                "&::-webkit-scrollbar-track": { backgroundColor: "transparent" },
              }}
            >
              {loading && (
                <Typography color="text.secondary" sx={{ py: 1 }}>
                  Loading…
                </Typography>
              )}
              {err && (
                <Typography color="error" sx={{ py: 1 }}>
                  {err}
                </Typography>
              )}
              {!loading && !err && tasks.length === 0 && (
                <Typography color="text.secondary" sx={{ py: 1 }}>
                  No tasks yet.
                </Typography>
              )}

              {!loading &&
                !err &&
                tasks.map((it) => {
                  const checked = selected.includes(it.id);
                  return (
                    <Box key={it.id} sx={{ mb: 1.5 }}>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr auto auto",
                          alignItems: "center",
                          columnGap: 1,
                        }}
                      >
                        <Chip size="small" label={prettyType(it.type)} variant="outlined" />
                        <Typography sx={{ fontWeight: 600 }} noWrap title={it.title}>
                          {it.title}
                        </Typography>

                        <PercentChip
                          value={Number(it.percent) || 0}
                          onChange={(v) => setTaskPercent(it.id, v)}
                        />

                        <Checkbox checked={checked} onChange={() => toggleSelect(it.id)} sx={{ ml: 1 }} />
                      </Box>
                    </Box>
                  );
                })}
            </Box>
          </Paper>

          {/* Donut */}
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 2, height: { md: 350 } }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Overall Progress
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <ProgressDonut value={overall} size={240} thickness={8} />
            </Box>
          </Paper>
        </Box>

        {/* Assignments/Labs/Quizzes */}
        <Paper sx={{ mt: 3, p: 2.5, borderRadius: 2, boxShadow: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
            Assignments by Type
          </Typography>

          {typeSummary.map((row) => (
            <Box key={row.type} sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "auto auto 1fr auto",
                  alignItems: "center",
                  columnGap: 1,
                }}
              >
                <Chip size="small" label={row.type} variant="outlined" />
                <Typography variant="body1" sx={{ ml: 1.5 }}>
                  {row.items} items
                </Typography>
                <span />
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  {row.percent}%
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={row.percent}
                sx={{
                  mt: 1.2,
                  height: 12,
                  borderRadius: 999,
                  backgroundColor: "rgba(25,118,210,0.25)",
                  "& .MuiLinearProgress-bar": { borderRadius: 999 },
                }}
              />
            </Box>
          ))}

          <Divider sx={{ mt: 1.5 }} />
          <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
            <Button variant="outlined" onClick={() => navigate("/courses")}>
              Back to Courses
            </Button>
            <Button
              variant="contained"
              sx={{ background: "#1f2a44", "&:hover": { background: "#1a2438" } }}
              onClick={() => navigate(`/course/${encodeURIComponent(courseKey)}`)}
            >
              Go to {courseKey}
            </Button>
          </Box>
        </Paper>

        {/* Study plan dialog */}
        <StudyPlanDialog open={planOpen} onClose={() => setPlanOpen(false)} plan={planData} startLabel="Today" />

        {/* Snackbar 提示 */}
        <Snackbar
          open={snackOpen}
          autoHideDuration={3000}
          onClose={() => setSnackOpen(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert onClose={() => setSnackOpen(false)} severity={snackSev} variant="filled" sx={{ boxShadow: 2 }}>
            {snackMsg}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}

export default StudyProgress;
