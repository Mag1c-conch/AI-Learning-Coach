import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  Link,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import InputBase from "@mui/material/InputBase";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CircleIcon from "@mui/icons-material/Circle";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import Sidebar from "../components/Sidebar.jsx";

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

const PageNumber = 6; // Six per page (2 rows * 3 columns)

const Courses = () => {
  const navigate = useNavigate(); 
  // Local data
  const courses = [
    { code: "COMP9814", name: "Artificial Intelligence", badges: 1 },
    { code: "COMP9820", name: "Project Management", badges: 0 },
    { code: "COMP9517", name: "Computer Vision", badges: 3 },
    { code: "COMP9021", name: "Principles of Programming", badges: 2 },
    { code: "COMP9311", name: "Database Systems", badges: 1 },
    { code: "COMP9511", name: "Human Computer Interaction", badges: 0 },
    { code: "COMP9417", name: "Machine Learning", badges: 4 },
    { code: "COMP9321", name: "Data Service Engineering", badges: 2 },
    { code: "COMP6448", name: "Web Application Development", badges: 0 },
  ];

  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(courses.length / PageNumber);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PageNumber;
    return courses.slice(start, start + PageNumber);
  }, [courses, page]);

  return (
    <Box 
      sx={{ 
        display: "flex", 
        height: "100vh" 
      }}
    >
      <Sidebar />

      {/* Right content */}
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
        {/* Top divider line */}
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

        {/* Upper right corner: Search + Notifications */}
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
            <StyledInputBase placeholder="Search" inputProps={{ "aria-label": "Serach" }} />
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
            Courses
          </Typography>
          <CircleIcon 
            sx={{ 
              marginLeft: "15%", 
              fontSize: 10, 
              color: "#B3B3B3" 
            }} 
          />
          <Typography variant="h6" sx={{ color: "#7a7a7a" }}>
            Student
          </Typography>
        </Box>

        {/* My Courses + Register button */}
        <Box sx={{ px: 1, mt: 3}}>
          <Box 
            sx={{ 
              display: "flex", 
              alignItems: "center", 
              mb: 3 
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              My Courses
            </Typography>

            <Button
              variant="contained"
              sx={{
                ml: "auto",
                px: 2.5,
                py: 1,
                mt: 3,
                borderRadius: 1.5,
                background: "#1f2a44",
                "&:hover": { background: "#1a2438" },
                textTransform: "none",
              }}
              onClick={() => console.log("Register Courses")}
            >
            <Link href="/registercourse" sx={{ color: '#fff', textDecoration: 'none' }}> Register Courses</Link>
            </Button>
          </Box>

          {/* Page design(3 columns * 2 rows) */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)", // 3 columns
              },
              gap: 4,
            }}
          >
            {pageItems.map((course) => (
              <Paper
                key={course.code}
                elevation={1}
                onClick={() => navigate(`/course/${course.code}`)}
                onKeyDown={(e) => { 
                  if (e.key === "Enter") {
                    navigate(`/course/${course.code}`); 
                  }
                }}
                role="button"
                tabIndex={0}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  bgcolor: "#eef0fa",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 3,
                  textAlign: "center",
                  height: 200,
                  cursor: "pointer", 
                  "&:hover": { transform: "translateY(-1px)", boxShadow: 3 },
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {course.code}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  {course.name}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mt: 1,
                    gap: 1.5,
                  }}
                >
                  <EmojiEventsOutlinedIcon sx={{ fontSize: 36 }} />
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {course.badges}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>

          {/* Paging design */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mt: 3,
              gap: 1,
            }}
          >
            <IconButton
              size="small"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>

            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNumber = i + 1;
              let buttonDesign = {};
              if (page === pageNumber) {
                buttonDesign = { 
                  background: "#1f2a44", 
                  color: "#fff",
                  fontWeight: 700 
                };
              } else {
                buttonDesign = { fontWeight: 500 };
              }
              return (
                <Button
                  key={pageNumber}
                  size="small"
                  onClick={() => setPage(pageNumber)}
                  variant={page === pageNumber ? "contained" : "text"}
                  sx={{
                    minWidth: 32,
                    fontWeight: page === pageNumber ? 700 : 500,
                    ...(page === pageNumber && { background: "#1f2a44", color: "#fff" }),
                  }}
                >
                  {pageNumber}
                </Button>
              );
            })}

            <IconButton
              size="small"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Courses;
