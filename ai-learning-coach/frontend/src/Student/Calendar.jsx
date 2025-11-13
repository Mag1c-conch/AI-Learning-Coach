import React, { useState, useEffect } from "react";
import { Box, Typography, IconButton, Button } from "@mui/material";
import NotificationsBell from "../components/Notifications.jsx";
import CircleIcon from "@mui/icons-material/Circle";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Sidebar from "../components/Sidebar.jsx";
import { Badge, Calendar, Modal, Form, Input, Select, TimePicker, message } from "antd";
import dayjs from "dayjs";

// change to string
const toKey = (value) => {
  return value.format("DD/MM/YYYY");
}

function getCurrentUserId() {
  try {
    const token =
      window.sessionStorage.getItem("token") || window.localStorage.getItem("token");
    if (!token) return null; // null means not logged in or no user
    const user = JSON.parse(token);
    return user?.id || user?.user_id || null;
  } catch {
    return null; //any error, return null
  }
}

// fetch timetable events from lovalStorage
const TT_KEY = (uid) => `timetableEvents:${uid || "anon"}`;

function ttGetEvents(uid) {
  try {
    const raw = localStorage.getItem(TT_KEY(uid));
    const arr = raw ? JSON.parse(raw) : []; // not valid JSONm return []
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// date parsing safe
function safeParseISO(iso) {
  const d = dayjs(iso);
  return d.isValid() ? d : null;
}

// converts raw AI plan events to calendar's internal
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
      type: "success", 
      time,
      desc: e.meta && e.meta.source === "ai-plan" ? "AI Plan" : undefined,
    });
  }
  return delta;
}

// merges new calendar tasks into the eisting tasks
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

  // store calendar state to browser(localStorage)
  useEffect(() => {
    localStorage.setItem("calendar_tasks_v1", JSON.stringify(tasks));
  }, [tasks]);

  // inital load AI plan events
  useEffect(() => {
    const events = ttGetEvents(uid);
    if (events.length) {
      const delta = aiEventsToCalendarDelta(events);
      setTasks((prev) => mergeCalendarTasks(prev, delta));
    }
  }, [uid]);

  // listen to timetable update events
  useEffect(() => {
    const onUpdated = () => {
      const events = ttGetEvents(uid); // read raw events for this user from localstorage
      const delta = aiEventsToCalendarDelta(events); // normalize & group by day
      setTasks((prev) => mergeCalendarTasks(prev, delta)); // merge into state (dedupe by id)
      message.success("Imported study plan to calendar");
    };
    window.addEventListener("timetable:updated", onUpdated); // subscribe
    return () => window.removeEventListener("timetable:updated", onUpdated); // unsubscribe
  }, [uid]);

  // manual impot Ai plan
  const handleManualImport = () => {
    const events = ttGetEvents(uid); // read raw events for this user
    const delta = aiEventsToCalendarDelta(events); // normalize & group by day
    if (!Object.keys(delta).length) {
      message.info("No AI plan events to import");
      return;
    }
    setTasks((prev) => mergeCalendarTasks(prev, delta));
    message.success("Imported study plan to calendar");
  };

  // when click date in calendar
  const handleSelectDate = (value) => {
    setSelectedDate(value); // remember which day user clicked
    setModalOpen(true); // open modal
    form.resetFields(); // clear old inputs
    form.setFieldsValue({ 
      type: "success", 
      // use hour/minute to avoid needing customParseFormat plugin
      time: dayjs().hour(9).minute(0).second(0).millisecond(0) 
    });
  };

  // creates a new task for the selected date
  const handleAddTask = async () => {
    try {
      const values = await form.validateFields();
      const key = toKey(selectedDate); // compute day bucket key
      const newTask = { // build new task object
        id: `${key}:${Date.now()}`,
        title: values.title.trim(),
        type: values.type // "success" | "warning" | "error"
        ,
        time: values.time ? values.time.format("HH:mm") : undefined,
        desc: values.desc?.trim() || undefined,
      };
      setTasks((prev) => {
        const prevList = prev[key] || [];
        return { ...prev, [key]: [...prevList, newTask] };
      });
      setModalOpen(false); // close modal + toast
      message.success("Task added");
    } catch {
      /* ignore */
    }
  };

  // deletes task by id from a date bucket
  const handleDeleteTask = (key, id) => {
    setTasks((prev) => {
      const next = { ...prev };
      next[key] = (next[key] || []).filter((t) => t.id !== id);
      if (!next[key].length) delete next[key];
      return next;
    });
    message.success("Task deleted");
  };

  // month cells are drawn here
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

  // single day cell
  const dateCellRender = (value) => {
    const key = toKey(value); // compute the day key
    const list = tasks[key] || []; // tasks for that day
    if (!list.length) return null; // no tasks, keep default cell

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
      {/* Scrollable main area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          backgroundColor: "#f5f6fa",
          overflowY: "auto",
          position: "relative",
        }}
      >
        {/* header is in fixed position */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            pb: 1,
            mb: 2,
            bgcolor: "#f5f6fa",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            {/* left side: title cluster */}
            <Box sx={{ ml: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Calendar
              </Typography>
              <CircleIcon sx={{ fontSize: 10, color: "#B3B3B3" }} />
              <Typography variant="h6" sx={{ color: "#7a7a7a" }}>
                Student
              </Typography>
            </Box>
            {/* right side: actions */}
            <Box sx={{ mr: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <IconButton>
                <NotificationsBell />
              </IconButton>
              <Button variant="outlined" size="small" onClick={handleManualImport}>
                Import AI Plan
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              width: "100%",
              height: 2,
              backgroundColor: "rgba(21,19,19,0.3)",
            }}
          />
        </Box>

        {/* calendar */}
        <Box
          sx={{
            ml: 2, 
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
        {/* add task model */}
        <Modal
          title={`Add Task · ${toKey(selectedDate)}`} // shows the selected day as text
          open={modalOpen} // controls visibility
          okText="Add" // ok button text
          onOk={handleAddTask} // click ok to add task
          onCancel={() => setModalOpen(false)} // close without saving
          destroyOnClose
        >
          <Form
            form={form}
            layout="vertical" // labels om top of fields
            requiredMark={false} // don't show red star
            initialValues={{ type: "success" }} // default value
          >
            {/* title */}
            <Form.Item
              label="Title"
              name="title"
              rules={[{ required: true, message: "Please enter a title" }]}
            >
              <Input placeholder="e.g., Lab 7, Quiz, Meeting..." />
            </Form.Item>
            {/* type */}
            <Form.Item label="Type" name="type">
              <Select
                options={[
                  { value: "success", label: "Success (green)" },
                  { value: "warning", label: "Warning (yellow)" },
                  { value: "error", label: "Error (red)" },
                ]}
              />
            </Form.Item>
            {/* time */}
            <Form.Item label="Time" name="time">
              <TimePicker format="HH:mm" minuteStep={5} />
            </Form.Item>
            {/* description */}
            <Form.Item label="Description" name="desc">
              <Input.TextArea
                placeholder="Optional notes..."
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            </Form.Item>
          </Form>
        </Modal>
      </Box>
    </Box>
  );
}
