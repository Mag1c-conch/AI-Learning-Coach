// src/Admin/Pages/Admin/TimeTable.jsx
import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  InputBase,
  Paper,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Chip,
  Card,
  CardContent,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CircleIcon from "@mui/icons-material/Circle";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

/* ---------- 搜索栏样式 ---------- */
const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.black, 0.05),
  "&:hover": { backgroundColor: alpha(theme.palette.common.black, 0.1) },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: 300,
  display: "flex",
  alignItems: "center",
  paddingLeft: theme.spacing(1),
  [theme.breakpoints.up("sm")]: { width: 360 },
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

/* ---------- 名字从 localStorage 读取 ---------- */
function useDisplayName() {
  return useMemo(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const userData = JSON.parse(token);
        return userData.first_name || "Admin";
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }

    const fromStorage =
      localStorage.getItem("displayName") ||
      localStorage.getItem("username") ||
      "";
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();

    const email =
      localStorage.getItem("userEmail") ||
      localStorage.getItem("email") ||
      "";
    if (email.includes("@")) {
      const head = email.split("@")[0];
      return head ? head.charAt(0).toUpperCase() + head.slice(1) : "Admin";
    }
    return "Admin";
  }, []);
}

export default function TimeTable() {
  const name = useDisplayName();
  const [selectedStudent, setSelectedStudent] = useState("");
  const [score, setScore] = useState("");
  const [comments, setComments] = useState("");
  const [feedbackType, setFeedbackType] = useState("hint");
  const [feedbackContent, setFeedbackContent] = useState("");

  // 模拟学生列表
  const students = [
    { id: 1, name: "Zhang Wei", assignment: "Calculus Assignment 1", submitted: true },
    { id: 2, name: "Li Na", assignment: "Calculus Assignment 1", submitted: true },
    { id: 3, name: "Wang Ming", assignment: "Calculus Assignment 1", submitted: true },
  ];

  const handleGradeSubmit = () => {
    console.log("Submitting grade:", { selectedStudent, score, comments });
    // TODO: 提交评分到后端
  };

  const handleFeedbackSend = () => {
    console.log("Sending feedback:", { feedbackType, feedbackContent });
    // TODO: 发送反馈到后端或AI助手
  };

  return (
    <Box sx={{ p: 3, position: "relative" }}>
      {/* ======= 页头 ======= */}
      <Box
        sx={{
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        {/* 左：标题组 */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1 }}>
          <Typography variant="h6">Grading</Typography>
          <CircleIcon sx={{ ml: "15%", fontSize: 10, color: "#B3B3B3" }} />
          <Typography variant="subtitle1" sx={{ color: "#7a7a7a" }}>
            Admin
          </Typography>
        </Box>

        {/* 右：搜索 + 铃铛 */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 1,
            position: "absolute",
            top: 15,
            right: 20,
          }}
        >
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
      </Box>

      {/* ======= 分割线 ======= */}
      <Box
        sx={{
          height: 2,
          bgcolor: "rgba(21,19,19,0.45)",
          mb: 2,
          ml: "calc(-24px - 240px)",
          mr: -3,
        }}
      />

      {/* ======= 主内容区域：左右布局 ======= */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          height: "calc(100vh - 155px)",
        }}
      >
        {/* ======= 左侧：批改作业 ======= */}
        <Paper
          elevation={2}
          sx={{
            flex: 1,
            p: 3,
            overflowY: "auto",
            bgcolor: "#fafafa",
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
            Grade Student Assignment
          </Typography>

          {/* 选择学生 */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Select Student</InputLabel>
            <Select
              value={selectedStudent}
              label="Select Student"
              onChange={(e) => setSelectedStudent(e.target.value)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {students.map((student) => (
                <MenuItem key={student.id} value={student.id}>
                  {student.name} - {student.assignment}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 作业内容显示区域 */}
          {selectedStudent && (
            <Card sx={{ mb: 3, bgcolor: "white" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Student Submission
                  </Typography>
                  <Chip
                    label="Submitted"
                    color="success"
                    size="small"
                    sx={{ ml: 2 }}
                    icon={<CheckCircleIcon />}
                  />
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" sx={{ color: "#666", mb: 2 }}>
                  Assignment: Calculus Assignment 1
                </Typography>
                <Typography variant="body2" sx={{ color: "#666", mb: 2 }}>
                  Submitted: 2025-10-29 14:30
                </Typography>
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: "#f5f5f5",
                    borderRadius: 1,
                    minHeight: 150,
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    Student's answer will be displayed here...
                    {"\n\n"}
                    Question 1: Calculate the derivative of f(x) = x³ + 2x² - 5x + 1
                    {"\n"}
                    Answer: f'(x) = 3x² + 4x - 5
                    {"\n\n"}
                    Question 2: Find the integral of ∫(2x + 3)dx
                    {"\n"}
                    Answer: x² + 3x + C
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* 评分输入 */}
          <TextField
            fullWidth
            label="Score (0-100)"
            type="number"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            sx={{ mb: 3 }}
            InputProps={{ inputProps: { min: 0, max: 100 } }}
          />

          {/* 评语输入 */}
          <TextField
            fullWidth
            label="Comments"
            multiline
            rows={4}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Enter your feedback and comments for the student..."
            sx={{ mb: 3 }}
          />

          {/* 提交按钮 */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleGradeSubmit}
            disabled={!selectedStudent || !score}
            sx={{
              bgcolor: "#1976d2",
              "&:hover": { bgcolor: "#1565c0" },
              height: 45,
            }}
          >
            Submit Grade
          </Button>
        </Paper>

        {/* ======= 右侧：反馈与辅导 ======= */}
        <Paper
          elevation={2}
          sx={{
            flex: 1,
            p: 3,
            overflowY: "auto",
            bgcolor: "#fafafa",
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
            Student Feedback & Guidance
          </Typography>

          {/* 反馈类型选择 */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Feedback Type</InputLabel>
            <Select
              value={feedbackType}
              label="Feedback Type"
              onChange={(e) => setFeedbackType(e.target.value)}
            >
              <MenuItem value="hint">Problem-Solving Hint</MenuItem>
              <MenuItem value="example">Similar Example</MenuItem>
              <MenuItem value="explanation">Concept Explanation</MenuItem>
              <MenuItem value="correction">Error Correction</MenuItem>
            </Select>
          </FormControl>

          {/* 反馈内容区域 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, color: "#666" }}>
              Guidance Content:
            </Typography>
            <Card sx={{ bgcolor: "white", mb: 2 }}>
              <CardContent>
                {feedbackType === "hint" && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 2, fontWeight: 600, color: "#1976d2" }}>
                      💡 Problem-Solving Hint:
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#666" }}>
                      For derivative problems, remember to apply the power rule: d/dx(xⁿ) = n·xⁿ⁻¹
                      {"\n\n"}
                      Break down complex expressions into simpler terms and differentiate each term separately.
                    </Typography>
                  </Box>
                )}
                {feedbackType === "example" && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 2, fontWeight: 600, color: "#2e7d32" }}>
                      📝 Similar Example:
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#666" }}>
                      Example: Find the derivative of g(x) = 2x⁴ - 3x² + 7
                      {"\n\n"}
                      Solution:
                      {"\n"}
                      g'(x) = 8x³ - 6x
                      {"\n\n"}
                      Step 1: Apply power rule to each term
                      {"\n"}
                      Step 2: The constant term (7) becomes 0
                    </Typography>
                  </Box>
                )}
                {feedbackType === "explanation" && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 2, fontWeight: 600, color: "#ed6c02" }}>
                      📖 Concept Explanation:
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#666" }}>
                      The derivative represents the rate of change of a function. It tells us how the function's output changes as the input changes.
                      {"\n\n"}
                      Key concepts:
                      {"\n"}
                      • Power Rule: d/dx(xⁿ) = n·xⁿ⁻¹
                      {"\n"}
                      • Constant Rule: d/dx(c) = 0
                      {"\n"}
                      • Sum Rule: d/dx(f + g) = f' + g'
                    </Typography>
                  </Box>
                )}
                {feedbackType === "correction" && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 2, fontWeight: 600, color: "#d32f2f" }}>
                      ⚠️ Error Correction:
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#666" }}>
                      Common mistake: Forgetting to reduce the exponent when applying the power rule.
                      {"\n\n"}
                      ❌ Incorrect: d/dx(x³) = 3x³
                      {"\n"}
                      ✅ Correct: d/dx(x³) = 3x²
                      {"\n\n"}
                      Remember: Multiply by the exponent AND reduce the exponent by 1.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* 自定义反馈输入 */}
          <TextField
            fullWidth
            label="Custom Feedback"
            multiline
            rows={6}
            value={feedbackContent}
            onChange={(e) => setFeedbackContent(e.target.value)}
            placeholder="Enter custom feedback or guidance for the student..."
            sx={{ mb: 3 }}
          />

          {/* 发送反馈按钮 */}
          <Button
            variant="contained"
            fullWidth
            endIcon={<SendIcon />}
            onClick={handleFeedbackSend}
            sx={{
              bgcolor: "#2e7d32",
              "&:hover": { bgcolor: "#1b5e20" },
              height: 45,
            }}
          >
            Send Feedback to Student
          </Button>

          {/* AI助手建议 */}
          <Divider sx={{ my: 3 }} />
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, color: "#666" }}>
              💬 AI Assistant Suggestions:
            </Typography>
            <Card sx={{ bgcolor: "#e3f2fd" }}>
              <CardContent>
                <Typography variant="body2" sx={{ color: "#0d47a1" }}>
                  Based on the student's submission, you might want to:
                  {"\n"}
                  • Provide more examples on the power rule
                  {"\n"}
                  • Emphasize the importance of checking work
                  {"\n"}
                  • Recommend additional practice problems
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
