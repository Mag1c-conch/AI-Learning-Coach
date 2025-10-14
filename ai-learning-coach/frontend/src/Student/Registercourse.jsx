import React, { useMemo, useState } from "react";
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

const studentCourses = [
  {
    id: 1,
    code: "CS101",
    title: "Python",
    teacher: "Alice Wang",
    email: "alice@univ.edu",
  },
  {
    id: 2,
    code: "DS210",
    title: "Big Data",
    teacher: "Bob Li",
    email: "bob@univ.edu",
  },
  {
    id: 3,
    code: "ML330",
    title: "Machine Learning",
    teacher: "Jack Chen",
    email: "jackc@univ.edu",
  },
];

const Registercourse = () => {
  const [query, setQuery] = useState(""); // searching words
  const [rows] = useState(studentCourses); // courses data
  const [selected, setSelected] = useState(null); // selected course
  const [open, setOpen] = useState(false); // popup window

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.code, r.title, r.teacher, r.email].some((v) =>
        String(v).toLowerCase().includes(q)
      )
    );
  }, [rows, query]);

  const columns = [
    { field: "code", headerName: "Code", width: 110 },
    { field: "title", headerName: "Course Name", flex: 1, minWidth: 180 },
    { field: "teacher", headerName: "Teacher", width: 160 },
    {
      field: "email",
      headerName: "Email",
      width: 220,
      renderCell: (p) => <Link href={`mailto:${p.value}`}>{p.value}</Link>,
    },

    {
      field: "action",
      headerName: "",
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        // open popup window
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
            top: 63,
            left: 0,
            width: "100%",
            height: 2,
            backgroundColor: "rgba(21,19,19,0.3)",
          }}
        />

        {/* search + notification */}
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
            <SearchInput
              placeholder="course code/ teacher"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Search>
          <IconButton>
            <NotificationsIcon />
          </IconButton>
        </Box>

        {/* Page Title */}
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1, mb: 2 }}
        >
          <Typography variant="h4">Register Course</Typography>
          <CircleIcon sx={{ ml: "10%", fontSize: 10, color: "#B3B3B3" }} />
          <Typography variant="subtitle1" sx={{ color: "#7a7a7a" }}>
            Student
          </Typography>
        </Box>

        {/* course table */}
        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Box sx={{ height: 560 }}>
            <DataGrid
              rows={filteredRows}
              columns={columns}
              disableRowSelectionOnClick
              pagination
            //   pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
              }}
            />
          </Box>
        </Paper>

        {/* popup window */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>kind reminder</DialogTitle>
          <DialogContent>Are you sure that you want to register this course?</DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            
            <Button
              variant="contained"
              onClick={() => alert("TODO: Submit")}
            >
              Submit
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default Registercourse;