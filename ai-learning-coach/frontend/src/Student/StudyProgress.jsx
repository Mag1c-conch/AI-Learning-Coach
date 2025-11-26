import React, { useMemo, useState, useEffect, useCallback } from "react";
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
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import NotificationsBell from "../components/Notifications.jsx";
import CircleIcon from "@mui/icons-material/Circle";
import Sidebar from "../components/Sidebar.jsx";
import { useParams, useNavigate } from "react-router-dom";
import http from "../api/http";

// Get current student id from localStorage.
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

const enrollKey = (uid) => `enrolledCourses:${uid}`;
// Load enrolled courses for this user from localStorage.
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

// Call the backend API to generate and save the study plan.
async function apiCreatePlan(studentId) {
  const res = await http.post("/get_plan", { student_id: studentId });
  return res.data; // StudyPlan like { ..., plan: {...} }
}

// Obtain the learning progress of students in the selected courses from the back end.
async function apiGetStudyProgress(studentId, courseId) {
  if (!studentId || !courseId) return null;
  const res = await http.get(`/progress/study/${studentId}/${courseId}`);
  return res.data;
}

// Update the learning progress returned by the back end to the database.
async function apiUpsertStudyProgress(studentId, courseId, items = [], replace = false) {
  if (!studentId || !courseId || !Array.isArray(items) || items.length === 0) return null;
  const payload = { items };
  if (replace) payload.replace = true;
  const res = await http.put(`/progress/study/${studentId}/${courseId}`, payload);
  return res.data;
}

// Convert the task type string to a uniform display name.
const prettyType = (t) => {
  const s = String(t || "").toLowerCase();
  if (s === "assignment" || s === "assignments" || s === "ass") return "Assignments";
  if (s === "lab" || s === "labs") return "Labs";
  if (s === "quiz" || s === "quizzes") return "Quizzes";
  if (s === "materials" || s === "material") return "Materials";
  return "Others";
};

// Determine the task type from the materials (by checking the file_type and the keywords in the file name).
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

// Used for storing learning progress.
const progressKey = (uid, courseKey) => `sp:progress:${uid || "anon"}:${courseKey || "course"}`;
const courseProgressKey = (uid, courseKey) =>
  `courseProgress:${uid || "anon"}:${courseKey || "course"}`;

// Load the learning progress data of the student's specified course from localStorage.
function loadProgress(uid, courseKey) {
  try {
    return JSON.parse(localStorage.getItem(progressKey(uid, courseKey)) || "{}");
  } catch {
    return {};
  }
}

// Save the student's learning progress to localStorage.
function saveProgress(uid, courseKey, obj) {
  try {
    localStorage.setItem(progressKey(uid, courseKey), JSON.stringify(obj));
  } catch {}
}

// Display the percentage of course completion.
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

// Use the polling algorithm to evenly distribute the task items over the 7-day period.
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

// Display the generated study plan dialog box.
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

// Map server plan -> dialog data 
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

// The localStorage key name for generating the schedule.
const TT_KEY = (uid) => `timetableEvents:${uid || "anon"}`;

// Convert the learning plan object returned from the back end to calendar event array format for synchronization to Timetable.
function serverPlanToEvents(planObj) {
  if (!planObj || !Array.isArray(planObj.days)) return [];
  const out = [];
  for (const d of planObj.days) {
    const dateStr = d.date; // YYYY-MM-DD
    for (const t of d.tasks || []) {
      if (!t.start_time || !t.end_time) continue;
      const startISO = new Date(`${dateStr}T${t.start_time}:00`).toISOString();
      const endISO = new Date(`${dateStr}T${t.end_time}:00`).toISOString();
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

// Merge new events into timetable and notify listeners.
function ttUpsertEvents(uid, newEvents = []) {
  try {
    const raw = localStorage.getItem(TT_KEY(uid));
    const old = raw ? JSON.parse(raw) : [];
    const keyOf = (e) =>
      `${e.start}|${e.end}|${e.title}|${e.courseId ?? ""}|${e.materialId ?? ""}`;
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
    window.dispatchEvent(
      new CustomEvent("timetable:updated", { detail: { count: merged.length } })
    );
  } catch {}
}

// The clickable progress percentage, which alternates between 0/25/50/75/100% when clicked.
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
        sx={{ minWidth: 84, borderRadius: 1.2, fontWeight: 700 }}
      >
        {value}%
      </Button>
    </Tooltip>
  );
}

// Study progress: Display course task lists, task progress statistics, and study plan generation functions.
function StudyProgress() {
  const { code: codeParam, id: idParam } = useParams();
  const rawParam = codeParam ?? idParam ?? null;
  const navigate = useNavigate();
  const uid = getCurrentUserId();

  // enrollments & current course
  const [enrolled, setEnrolled] = useState(() => loadEnrollments(uid));
  useEffect(() => setEnrolled(loadEnrollments(uid)), [uid]);

  // Find the current course from the course list (match the id or code based on the routing parameter).
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
    currentCourse?.code ??
    (currentCourse?.id != null ? String(currentCourse.id) : "course");

  // fetch tasks
  const [tasks, setTasks] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // Obtain the assignments and materials of the course from the back end and merge the progress data.
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
        const progressPromise =
          uid && cid
            ? apiGetStudyProgress(uid, cid).catch((error) => {
                const status = error?.response?.status;
                if (status === 403 || status === 404) return null;
                throw error;
              })
            : Promise.resolve(null);

        const [assRes, matRes, progressData] = await Promise.all([
          http.get("/assignments", { params: { course_id: cid } }).catch(() => ({ data: [] })),
          http
            .get("/materials", { params: { course_id: cid, include_submissions: false } })
            .catch(() => ({ data: [] })),
          progressPromise,
        ]);

        const localSaved = loadProgress(uid, courseKey);
        const mergedSaved = { ...localSaved };
        if (progressData && Array.isArray(progressData.items)) {
          for (const item of progressData.items) {
            mergedSaved[item.item_key] = Number(item.percent) || 0;
          }
          saveProgress(uid, courseKey, mergedSaved);
        }

        // materials
        const matsRaw = Array.isArray(matRes.data) ? matRes.data : [];
        // Convert the materials into task items and determine the task type based on the material type.
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
              percent: Number(mergedSaved?.[id]) || 0,
            };
          });

        // avoid duplicate assignments
        const coveredAssignmentIds = new Set(
          materialItems.map((m) => m.assignmentId).filter(Boolean)
        );

        const assRaw = Array.isArray(assRes.data) ? assRes.data : [];
        // Convert the independent assignments into task items.
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
              percent: Number(mergedSaved?.[id]) || 0,
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
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // update progress
  // overall
  const overall = useMemo(() => {
    if (!tasks.length) return 0;
    const sum = tasks.reduce((s, t) => s + (Number(t.percent) || 0), 0);
    return Math.round(sum / tasks.length);
  }, [tasks]);

  // Pull the progress response data from the back end to update the local and task lists.
  const applyProgressResponse = useCallback(
    (data) => {
      if (!data || !Array.isArray(data.items)) return;
      const cached = loadProgress(uid, courseKey);
      const updated = { ...cached };
      for (const item of data.items) {
        updated[item.item_key] = Number(item.percent) || 0;
      }
      saveProgress(uid, courseKey, updated);
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          percent: Number(updated?.[t.id]) || 0,
        }))
      );
    },
    [courseKey, uid]
  );

  // When the overall progress changes, save to localStorage and broadcast event notifications.
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
  const [snackSev, setSnackSev] = useState("success"); 

  // Update the progress percentage of the tasks selected by the students, save it locally and synchronize it to the back end.
  const setTaskPercent = (id, percent) => {
    let payloadItem = null;
    setTasks((prev) => {
      const next = prev.map((t) => {
        if (t.id === id) {
          payloadItem = { ...t, percent };
          return { ...t, percent };
        }
        return t;
      });
      const saved = loadProgress(uid, courseKey);
      saved[id] = percent;
      saveProgress(uid, courseKey, saved);
      return next;
    });

    if (uid && currentCourse?.id && payloadItem) {
      const metadata = {};
      if (payloadItem.assignmentId != null) {
        metadata.assignment_id = payloadItem.assignmentId;
      }
      if (payloadItem.dueAt) {
        metadata.due_at = payloadItem.dueAt;
      }
      const itemPayload = {
        item_key: id,
        percent,
        item_type: prettyType(payloadItem.type),
        title: payloadItem.title,
      };
      if (Object.keys(metadata).length) {
        itemPayload.metadata = metadata;
      }
      apiUpsertStudyProgress(uid, currentCourse.id, [itemPayload])
        .then((res) => {
          if (res) applyProgressResponse(res);
        })
        .catch((error) => {
          console.error("Failed to sync progress", error);
          setSnackMsg("Failed to sync progress to server");
          setSnackSev("error");
          setSnackOpen(true);
        });
    }
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
      const created = await apiCreatePlan(studentId); // Generate and save
      // Compatible with two types of returns: {plan: {... }} or {... }
      const planDict = created?.plan ?? created;
      // Save to a global variable.
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

  // Sync to Timetable.
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
            Study Progress
          </Typography>
          <CircleIcon sx={{ ml: "15%", fontSize: 10, color: "#B3B3B3", marginLeft: "80px" }} />
          <Typography variant="h6" sx={{ color: "#7a7a7a" }}>
            Student
          </Typography>
        </Box>

        {/* course title card */}
        <Paper sx={{ ml: 2, mr: 2, p: 2, borderRadius: 2, mb: 3, boxShadow: 5 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {courseLabel} · Progress
          </Typography>
        </Paper>

        {/* Study Plan + Donut */}
        <Box
          sx={{
            ml: 2, 
            mr: 2, 
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 3,
          }}
        >
          {/* Study Plan */}
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 2, height: { md: 350 } }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
                Study Plan
              </Typography>

              {/* backend AI plan */}
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

              {/* sync to Timetable */}
              <Button
                variant="outlined"
                onClick={handleSyncToTimetable}
                sx={{
                  textTransform: "none",
                  borderRadius: "12px",
                  color: "#142E4F",
                  borderColor: "#142E4F",
                  px: 1.5,
                  py: 1,
                }}
              >
                Sync to Timetable
              </Button>
            </Box>

            {serverPlanErr && (
              <Typography
                color="error"
                variant="caption"
                sx={{ ml: 0.5 }}
              >
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
                "&::-webkit-scrollbar-track": {
                  backgroundColor: "transparent",
                },
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
                        <Chip
                          size="small"
                          label={prettyType(it.type)}
                          variant="outlined"
                        />
                        <Typography
                          sx={{ fontWeight: 600 }}
                          noWrap
                          title={it.title}
                        >
                          {it.title}
                        </Typography>

                        <PercentChip
                          value={Number(it.percent) || 0}
                          onChange={(v) => setTaskPercent(it.id, v)}
                        />
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
        <Paper sx={{ ml: 2, mr: 2,  mt: 3, p: 2.5, borderRadius: 2, boxShadow: 2 }}>
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
                  backgroundColor: "rgba(136, 188, 239, 0.25)",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 999,
                    backgroundColor: "#142E4F",
                  },
                }}
              />
            </Box>
          ))}

          <Divider sx={{ mt: 1.5 }} />
          <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
            <Button 
              variant="outlined" 
              onClick={() => navigate("/courses")}
              sx={{ color: "#142E4F", borderColor: "#142E4F" }}
            >
              Back to Courses
            </Button>
            <Button
              variant="contained"
              sx={{ background: "#1f2a44", "&:hover": { background: "#1a2438" } }}
              onClick={() =>
                navigate(`/course/${encodeURIComponent(courseKey)}`)
              }
            >
              Go to {courseKey}
            </Button>
          </Box>
        </Paper>

        {/* Study plan dialog */}
        <StudyPlanDialog
          open={planOpen}
          onClose={() => setPlanOpen(false)}
          plan={planData}
          startLabel="Today"
        />

        {/* Snackbar */}
        <Snackbar
          open={snackOpen}
          autoHideDuration={3000}
          onClose={() => setSnackOpen(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSnackOpen(false)}
            severity={snackSev}
            variant="filled"
            sx={{ boxShadow: 2 }}
          >
            {snackMsg}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}

export default StudyProgress;
