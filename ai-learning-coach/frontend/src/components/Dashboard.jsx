import React from "react";
import "../App.css";
import { Box, Typography, IconButton, InputBase } from "@mui/material";
import Sidebar from "./Sidebar.jsx";
import { styled, alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CircleIcon from "@mui/icons-material/Circle";

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.black, 0.05),
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.black, 0.1),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: "200px",
  display: "flex",
  alignItems: "center",
  paddingLeft: theme.spacing(1),
  [theme.breakpoints.up("sm")]: {
    width: "250px",
  },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 1),
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
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

const Dashboard = () => {
  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Sidebar />

      {/* sidebae */}
      <Box
        className="main-content"
        sx={{
          flex: 1,
          backgroundColor: "#f5f6fa",
          padding: 3,
          overflowY: "auto",
          position: "relative",
        }}
      >
        {/* split line */}
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
          {/* search bar */}
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase placeholder="" inputProps={{ "aria-label": "" }} />
          </Search>

          <IconButton>
            <NotificationsIcon />
          </IconButton>
        </Box>

        {/* {/page name, search bar/} */}
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1, mb: 2 }}
        >
          <Typography variant="h4">Dashboard</Typography>
          <CircleIcon sx={{ marginLeft: '15%', fontSize: 10, color: "#B3B3B3" }} />
          <Typography variant="subtitle1" sx={{ color: "#7a7a7a" }}>
            Student
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
