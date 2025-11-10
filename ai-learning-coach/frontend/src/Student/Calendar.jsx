// src/Student/TimeTable.jsx
import React, { useState, useEffect } from "react";
import { Box, Typography, IconButton, Button } from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import InputBase from "@mui/material/InputBase";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsBell from "../components/Notifications.jsx";
import CircleIcon from "@mui/icons-material/Circle";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Sidebar from "../components/Sidebar.jsx";
import { Badge, Calendar, Modal, Form, Input, Select, TimePicker, message } from "antd";
import dayjs from "dayjs";

/* ================= Search box ================= */
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

/* ============== Date key（要在前面，后面函数会用到） ============== */
const toKey = (value) => value.format("DD/MM/YYYY");

/* ============== Shared helpers（与 StudyProgress 对齐） ============== */
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

// StudyProgress 写入 AI 计划事件用的 Key
const TT_KEY = (uid) => `timetableEvents:${uid || "anon"}`;

// 读取 AI 计划事件（StudyProgress 那边写入的）
function ttGetEvents(uid) {
  try {
    const raw = localStorage.getItem(TT_KEY(uid));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** ISO -> Day.js；容错非法值 */
function safeParseISO(iso) {
  const d = dayjs(iso);
  return d.isValid() ? d : null;
}

/** 把 AI 计划事件数组 -> 当前日历本地结构的差量 { "DD/MM/YYYY": [task...] } */
function aiEventsToCalendarDelta(events) {
  const delta = {};
  for (const e of Array.isArray(events) ? events : []) {
    // e: { title, start(ISO), end(ISO), courseId?, materialId?, meta? }
    const start = safeParseISO(e.start);
    if (!start) continue;

    const key = toKey(start);
    const time = start.format("HH:mm");
    const title = e.title || "Study Session";
    const id =
      e.id ||
      `${e.start}|${e.end}|${title}|${e.courseId ?? ""}|${e.materialId ?? ""}`;

    if (!delta[key]) delta[key] = [];
    delta[key].push({
      id,
      title,
      type: "success", // AntD 绿色点
      time,
      desc: (e.meta && e.meta.source === "ai-plan") ? "AI Plan" : undefined,
    });
  }
  return delta;
}

/** 合并差量到现有 tasks（按 id 去重） */
function mergeCalendarTasks(oldTasks, delta) {
  const next = { ...oldTasks };
  for (const [key, arr] of Object.entries(delta)) {
    const prev = next[key] || [];
    const seen = new Set(prev.map((t) => t.id));
    const merged = [...prev];
    for (const t of arr) {
      if (!seen.has(t.id)) {
        merged.push(t);
        seen.add(t.id);
      }
    }
    if (merged.length) next[key] = merged;
  }
  return next;
}

export default function TimeTable() {
  const uid = getCurrentUserId();

  const [tasks, setTasks] = useState(() => {
    try {
      const raw = localStorage.getItem("calendar_tasks_v1");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // chosen date
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  /* ====== 本地持久化 ====== */
  useEffect(() => {
    localStorage.setItem("calendar_tasks_v1", JSON.stringify(tasks));
  }, [tasks]);

  /* ====== 首次加载：导入已存在的 AI 计划事件 ====== */
  useEffect(() => {
    const events = ttGetEvents(uid);
    if (events.length) {
      const delta = aiEventsToCalendarDelta(events);
      setTasks((prev) => mergeCalendarTasks(prev, delta));
    }
  }, [uid]);

  /* ====== 监听 StudyProgress 的广播：有新“同步到 Timetable”时导入 ====== */
  useEffect(() => {
    const onUpdated = () => {
      const events = ttGetEvents(uid);
      const delta = aiEventsToCalendarDelta(events);
      setTasks((prev) => mergeCalendarTasks(prev, delta));
      message.success("Imported study plan to calendar");
    };
    window.addEventListener("timetable:updated", onUpdated);
    return () => window.removeEventListener("timetable:updated", onUpdated);
  }, [uid]);

  /* ====== 手动导入按钮（可选） ====== */
  const handleManualImport = () => {
    const events = ttGetEvents(uid);
    const delta = aiEventsToCalendarDelta(events);
    if (!Object.keys(delta).length) {
      message.info("No AI plan events to import");
      return;
    }
    setTasks((prev) => mergeCalendarTasks(prev, delta));
    message.success("Imported study plan to calendar");
  };

  /* ====== 选择日期 → 打开新增任务弹窗 ====== */
  const handleSelectDate = (value) => {
    setSelectedDate(value);
    setModalOpen(true);
    form.resetFields();
    form.setFieldsValue({ type: "success", time: dayjs("09:00", "HH:mm") });
  };

  /* ====== 新增任务（手动添加） ====== */
  const handleAddTask = async () => {
    try {
      const values = await form.validateFields();
      const key = toKey(selectedDate);
      const newTask = {
        id: `${key}:${Date.now()}`,
        title: values.title.trim(),
        type: values.type, // "success" | "warning" | "error"
        time: values.time ? values.time.format("HH:mm") : undefined,
        desc: values.desc?.trim() || undefined,
      };
      setTasks((prev) => {
        const prevList = prev[key] || [];
        return { ...prev, [key]: [...prevList, newTask] };
      });
      setModalOpen(false);
      message.success("Task added");
    } catch {
      /* ignore */
    }
  };

  /* ====== 删除任务 ====== */
  const handleDeleteTask = (key, id) => {
    setTasks((prev) => {
      const next = { ...prev };
      next[key] = (next[key] || []).filter((t) => t.id !== id);
      if (!next[key].length) delete next[key];
      return next;
    });
    message.success("Task deleted");
  };

  /* ====== 月单元格（可自定义展示统计） ====== */
  const monthCellRender = (value) => {
    if (value.month() === 8) {
      return (
        <div className="notes-month">
          <section>1394</section>
          <span>Backlog number</span>
        </div>
      );
    }
    return null;
  };

  /* ====== 日期单元格：渲染任务列表 ====== */
  const dateCellRender = (value) => {
    const key = toKey(value);
    const list = tasks[key] || [];
    if (!list.length) return null;

    return (
      <ul className="events" style={{ textAlign: "left", paddingLeft: 0, margin: 0 }}>
        {list.map((item) => (
          <li
            key={item.id}
            style={{
              listStyle: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
            title={item.desc || item.title}
          >
            <Badge
              status={item.type} // "success"|"warning"|"error"
              text={item.time ? `${item.time} · ${item.title}` : item.title}
            />
            <IconButton
              aria-label="delete task"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTask(key, item.id);
              }}
            >
              <DeleteOutlineIcon fontSize="inherit" />
            </IconButton>
          </li>
        ))}
      </ul>
    );
  };

  const cellRender = (current, info) => {
    if (info.type === "date") return dateCellRender(current);
    if (info.type === "month") return monthCellRender(current);
    return info.originNode;
  };

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flex: 1,
          backgroundColor: "#f5f6fa",
          p: 3,
          overflowY: "auto",
          position: "relative",
        }}
      >
        {/* 顶部分割线 */}
        <Box
          sx={{
            position: "absolute",
            top: 63,
            left: 0,
            width: "100%",
            height: 2,
            backgroundColor: "rgba(21,19,19,0.3)",
          }}
        />

        {/* 右上角工具区 */}
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
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase placeholder="Search" inputProps={{ "aria-label": "Search" }} />
          </Search>
          <IconButton>
            <NotificationsBell />
          </IconButton>
          <Button variant="outlined" size="small" onClick={handleManualImport}>
            Import AI Plan
          </Button>
        </Box>

        {/* 标题 */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1, mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Calendar
          </Typography>
          <CircleIcon sx={{ ml: "15%", fontSize: 10, color: "#B3B3B3" }} />
          <Typography variant="h6" sx={{ color: "#7a7a7a" }}>
            Student
          </Typography>
        </Box>

        {/* 日历 */}
        <Box
          sx={{
            width: "100%",
            maxWidth: 1000,
            marginInline: "auto",
            paddingBottom: 4,
            background: "#fff",
            borderRadius: 2,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            padding: 2,
          }}
        >
          <Calendar
            cellRender={cellRender}
            onSelect={handleSelectDate}
            style={{
              width: "100%",
              fontSize: 16,
              textAlign: "left",
              background: "transparent",
            }}
          />
        </Box>

        {/* 新增任务弹窗 */}
        <Modal
          title={`Add Task · ${toKey(selectedDate)}`}
          open={modalOpen}
          okText="Add"
          onOk={handleAddTask}
          onCancel={() => setModalOpen(false)}
          destroyOnClose
        >
          <Form form={form} layout="vertical" requiredMark={false} initialValues={{ type: "success" }}>
            <Form.Item label="Title" name="title" rules={[{ required: true, message: "Please enter a title" }]}>
              <Input placeholder="e.g., Lab 7, Quiz, Meeting..." />
            </Form.Item>

            <Form.Item label="Type" name="type">
              <Select
                options={[
                  { value: "success", label: "Success (green)" },
                  { value: "warning", label: "Warning (yellow)" },
                  { value: "error", label: "Error (red)" },
                ]}
              />
            </Form.Item>

            <Form.Item label="Time" name="time">
              <TimePicker format="HH:mm" minuteStep={5} />
            </Form.Item>

            <Form.Item label="Description" name="desc">
              <Input.TextArea placeholder="Optional notes..." autoSize={{ minRows: 2, maxRows: 4 }} />
            </Form.Item>
          </Form>
        </Modal>
      </Box>
    </Box>
  );
}
