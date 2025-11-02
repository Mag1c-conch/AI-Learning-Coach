import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import InputBase from "@mui/material/InputBase";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CircleIcon from "@mui/icons-material/Circle";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Sidebar from "../components/Sidebar.jsx";
import { Badge, Calendar, Modal, Form, Input, Select, TimePicker, message } from "antd";
import dayjs from "dayjs";

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

const toKey = (value) => value.format("DD/MM/YYYY");

export default function TimeTable() {
  const [tasks, setTasks] = useState(() => {
    try {
      const raw = localStorage.getItem("calendar_tasks_v1");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // chose date
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  // store in localcategory
  useEffect(() => {
    localStorage.setItem("calendar_tasks_v1", JSON.stringify(tasks));
  }, [tasks]);

  // popup window for individual tasks
  const handleSelectDate = (value) => {
    setSelectedDate(value);
    setModalOpen(true);
    form.resetFields();
    form.setFieldsValue({ type: "success", time: dayjs("09:00", "HH:mm") });
  };

  // update new tasks
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
    } catch (e) {
    }
  };

  // delate task
  const handleDeleteTask = (key /* DateKey */, id /* task id */) => {
    setTasks((prev) => {
      const next = { ...prev };
      next[key] = (next[key] || []).filter((t) => t.id !== id);
      if (!next[key].length) delete next[key]; 
      return next;
    });
    message.success("Task deleted");
  };

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

  // day task
  const dateCellRender = (value /* dayjs */) => {
    const key = toKey(value);
    const list = tasks[key] || [];

    if (!list.length) return null;

    return (
      <ul
        className="events"
        style={{ textAlign: "left", paddingLeft: 0, margin: 0 }}
      >
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
              text={
                item.time ? `${item.time} · ${item.title}` : item.title
              }
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
            <StyledInputBase
              placeholder="Search"
              inputProps={{ "aria-label": "Search" }}
            />
          </Search>
          <IconButton>
            <NotificationsIcon />
          </IconButton>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1, mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Calendar
          </Typography>
          <CircleIcon sx={{ ml: "15%", fontSize: 10, color: "#B3B3B3" }} />
          <Typography variant="h6" sx={{ color: "#7a7a7a" }}>
            Student
          </Typography>
        </Box>
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
        <Modal
          title={`Add Task · ${toKey(selectedDate)}`}
          open={modalOpen}
          okText="Add"
          onOk={handleAddTask}
          onCancel={() => setModalOpen(false)}
          destroyOnClose
        >
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={{ type: "success" }}
          >
            <Form.Item
              label="Title"
              name="title"
              rules={[{ required: true, message: "Please enter a title" }]}
            >
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
