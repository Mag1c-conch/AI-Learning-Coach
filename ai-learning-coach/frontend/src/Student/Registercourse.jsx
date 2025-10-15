import React, { useMemo, useState, useEffect } from "react";
import "../App.css";
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import Sidebar from "../components/Sidebar.jsx";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CircleIcon from "@mui/icons-material/Circle";
import { DataGrid } from "@mui/x-data-grid";
import http from "../api/http";

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.black, 0.05),
  "&:hover": { backgroundColor: alpha(theme.palette.common.black, 0.1) },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: "200px",
  display: "flex",
  alignItems: "center",
  paddingLeft: theme.spacing(1),
  [theme.breakpoints.up("sm")]: { width: "250px" },
}));
const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 1),
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(0,0,0,0.5)",
}));
const SearchInput = styled("input")({
  border: "none",
  outline: "none",
  background: "transparent",
  width: "100%",
  height: 36,
  fontSize: 14,
});

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

// persist enrolled course to localstorage
function saveEnrolledCourse(course) {
  try {
    const uid = getCurrentUserId();
    if (!uid) return;
    const key = `enrolledCourses:${uid}`; 
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    const next = [...list.filter((c) => c.code !== course.code), course];
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("enrollment:updated", { detail: { course, user_id: uid } }));
  } catch (e) {
    console.error("保存选课失败", e);
  }
}
const Registercourse = () => {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);

  // fetch courses from backend
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const res = await http.get("/courses");
        const raw = Array.isArray(res.data) ? res.data : [];
        // clean & normalize data
        const normalized = raw
          .map((r) => ({
            id: r?.id,                 
            code: r?.code || "",
            name: r?.name || "",       
            teacher: r?.teacher || "",
            email: r?.email || "",
            description: r?.description || "",
          }))
          .filter((r) => Number.isInteger(r.id)); 
        setRows(normalized);
      } catch (e) {
        alert(`加载课程失败：${e?.response?.data?.description || e.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.code, r.name, r.teacher, r.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, query]);

  const handleSubmit = async () => {
    if (!selected) return;
    const uid = getCurrentUserId();
    if (!uid) return alert("未登录或缺少用户信息");

    try {
      // call backend api to entoll
      await http.post(`/courses/${selected.id}/enroll`, { student_id: uid });

      // persist to localstorage
      saveEnrolledCourse({
        code: selected.code,
        name: selected.name || "",
        dueText: "Enrolled",
        meta: selected.description ? `· ${selected.description}` : "",
      });

      setOpen(false);
      alert("Entollment successful");
    } catch (e) {
      alert(e?.response?.data?.description || "Enrollment failed");
    }
  };

  const columns = [
    { field: "code", headerName: "Code", width: 110 },
    { field: "name", headerName: "Course Name", flex: 1, minWidth: 180 },
    { field: "teacher", headerName: "Teacher", width: 160 },
    {
      field: "email",
      headerName: "Email",
      width: 220,
      renderCell: (p) => (p?.value ? <Link href={`mailto:${p.value}`}>{p.value}</Link> : "-"),
    },
    {
      field: "action",
      headerName: "",
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="text"
          onClick={() => {
            setSelected(params.row);
            setOpen(true);
          }}
        >
          Submit
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <Box sx={{ flex: 1, backgroundColor: "#f5f6fa", p: 3, overflowY: "auto", position: "relative" }}>
        <Box sx={{ position: "absolute", top: 63, left: 0, width: "100%", height: 2, backgroundColor: "rgba(21,19,19,0.3)" }} />
        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1, position: "absolute", top: 10, right: 20 }}>
          <Search>
            <SearchIconWrapper><SearchIcon /></SearchIconWrapper>
            <SearchInput placeholder="course code / teacher" value={query} onChange={(e) => setQuery(e.target.value)} />
          </Search>
          <IconButton><NotificationsIcon /></IconButton>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1, mb: 2 }}>
          <Typography variant="h4">Register Course</Typography>
          <CircleIcon sx={{ ml: "10%", fontSize: 10, color: "#B3B3B3" }} />
          <Typography variant="subtitle1" sx={{ color: "#7a7a7a" }}>Student</Typography>
        </Box>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Box sx={{ height: 560 }}>
            <DataGrid
              rows={filteredRows}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              pagination
              pageSizeOptions={[10, 25, 50, 100]}
              // use id as row identifier
              getRowId={(row) => row.id}
            />
          </Box>
        </Paper>

        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Kind reminder</DialogTitle>
          <DialogContent>
            {selected
              ? `Are you sure you want to register ${selected.name} (${selected.code})?`
              : "Are you sure that you want to register this course?"}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit}>Submit</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default Registercourse;
