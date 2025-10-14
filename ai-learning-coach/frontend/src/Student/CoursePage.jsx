import React from "react";
import {
  Box, 
  Paper, 
  Typography, 
  Button, 
  IconButton, 
  Chip, 
  Divider
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import InputBase from "@mui/material/InputBase";
import SearchIcon from "@mui/icons-material/Search";
import CircleIcon from "@mui/icons-material/Circle";
import NotificationsIcon from "@mui/icons-material/Notifications";
import Sidebar from "../components/Sidebar.jsx";
import { CircularProgress, circularProgressClasses } from "@mui/material";

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

// Progress 
function ProgressCircular({ value = 70, size = 160, thickness = 7 }) {
  return (
    <Box 
      sx={{ 
        position: "relative", 
        display: "inline-flex" 
      }}
    >
      {/* Background circular */}
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
      {/* Progress bar */}
      <CircularProgress
        variant="determinate"
        value={value}
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
      {/* Percentage */}
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
        {value}%
      </Box>
    </Box>
  );
}

// Local data
const course = { code: "COMP9814", name: "Artificial Intelligence", progress: 70 };
const materials = [
  { title: "Lecture Slides", type: "PDF", color: "#1f2a44" },
  { title: "Assignment 2", type: "PDF", color: "#d7df23" },
  { title: "Lab Notebook", type: "Jupyter", color: "#2e7d32" },
];
const assignments = [
  { title: "Quiz 6",    time: "Oct 22 08:00am", percent: "5%",  due: "Due 2 days" },
  { title: "Lab 7",     time: "Oct 24 10:30am", percent: "3%",  due: "Due 4 days" },
  { title: "Assignment 2", time: "Oct 27 04:00pm", percent: "25%", due: "Due 9 days" },
];

function CourseDetail() {
    return (
      <Box sx={{ display: "flex", height: "100vh" }}>
        <Sidebar />
        <Box
          sx={{
            flex: 1,
            backgroundColor: "#f5f6fa",
            p: 3,
            overflowY: "auto",
            position: "relative",
          }}
        >
          {/* Top divider line */}
          <Box
            sx={{
              position: "absolute",
              top: "63px",
              left: 0,
              width: "100%",
              height: "2px",
              backgroundColor: "rgba(21,19,19,0.3)",
            }}
          />
          {/* Upper right corner: Search + Notifications */}
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
              <NotificationsIcon />
            </IconButton>
          </Box>
  
          {/* Page title */}
          <Box 
            sx={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 1, 
              mt: -1, 
              mb: 2 
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Course
            </Typography>
            <CircleIcon 
              sx={{ 
                marginLeft: "15%", 
                fontSize: 10, 
                color: "#B3B3B3" 
              }} 
            />
            <Typography variant="h6" sx={{ color: "#7a7a7a"}}>
              Student
            </Typography>
          </Box>
  
          {/* Course title */}
          <Paper 
            elevation={1}
            sx={{
              p: 2.5, 
              borderRadius: 2, 
              mb: 3, 
              mt: 4, 
              boxShadow: 5 
            }} 
          >
            <Typography variant="h5" sx={{ fontWeight: 700}}>
              {course.code} · {course.name}
            </Typography>
          </Paper>
  
          {/* Materials + Progress + Assignments */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { 
                xs: "1fr", 
                md: "repeat(12, 1fr)" 
              },
              gap: 3,
            }}
          >
            {/* Materials */}
            <Paper
              elevation={1}
              sx={{
                gridColumn: { 
                  xs: "1 / -1", 
                  md: "span 6" 
                },
                p: 2,
                borderRadius: 2,
                boxShadow: 2,
                height: '100%', 
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Materials
              </Typography>
  
              {materials.map((m, idx) => (
                <Paper
                  key={idx}
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
                      bgcolor: m.color, 
                      p: 1
                    }} 
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                      {m.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {m.type}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ textTransform: "none", borderRadius: 1.2 }}
                    onClick={() => console.log("Download", m.title)}
                  >
                    Download
                  </Button>
                </Paper>
              ))}
            </Paper>
  
            {/* Course Progress */}
            <Paper
              elevation={1}
              sx={{
                gridColumn: { 
                  xs: "1 / -1", 
                  md: "span 6" 
                },
                p: 2,
                borderRadius: 2,
                boxShadow: 2,
                display: "flex",
                flexDirection: "column",
                height: '100%', 
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Course Progress
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                <ProgressCircular value={course.progress} />
              </Box>
            </Paper>
  
            {/* Assignments */}
            <Paper
              elevation={1}
              sx={{
                gridColumn: "1 / -1",
                p: 2,
                borderRadius: 2,
                width: "97.5%",
                mt: 5
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
                  Assignments
                </Typography>
                <Button
                  variant="contained"
                  sx={{
                    textTransform: "none",
                    background: "#1f2a44",
                    "&:hover": { background: "#1a2438" },
                    borderRadius: 1.2,
                  }}
                  onClick={() => console.log("Generate study plan")}
                >
                  Generate Study Plan
                </Button>
              </Box>
  
              <Divider sx={{ mb: 1 }} />
  
              {assignments.map((a, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",                   
                        md: "370px 600px 90px 260px", 
                      },
                    alignItems: "center",
                    columnGap: 1,
                    rowGap: 3,
                    py: 1.2,
                  }}
                >
                  <Typography>{a.title}</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 30 }}>
                    <Chip label={a.time} size="small" variant="outlined" />
                    <Typography sx={{ fontWeight: 700 }}>{a.percent}</Typography>
                  </Box>
                  <Typography color="text.secondary">{a.due}</Typography>
                </Box>
              ))}
            </Paper>
          </Box>
        </Box>
      </Box>
    );
  }
  
  export default CourseDetail;  