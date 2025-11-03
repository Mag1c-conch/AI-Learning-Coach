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
  CircularProgress,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CircleIcon from "@mui/icons-material/Circle";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import SmartToyIcon from "@mui/icons-material/SmartToy";

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
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [score, setScore] = useState("");
  const [comments, setComments] = useState("");
  const [feedbackType, setFeedbackType] = useState("hint");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [aiGrading, setAiGrading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // 获取当前用户信息
  const getCurrentUser = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        return JSON.parse(token);
      }
    } catch (error) {
      console.error('Error parsing user token:', error);
    }
    return null;
  };

  // 获取课程列表
  React.useEffect(() => {
    const fetchCourses = async () => {
      setCoursesLoading(true);
      try {
        const response = await fetch('http://localhost:5001/courses');
        if (response.ok) {
          const data = await response.json();
          setCourses(data);
        } else {
          console.error('Failed to fetch courses');
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // 模拟学生作业列表（按课程过滤）
  const getStudentAssignments = () => {
    if (!selectedCourse) return [];
    
    // 模拟数据，实际应该从后端获取
    const allAssignments = [
      { id: 1, courseId: 1, studentName: "Zhang Wei", assignmentTitle: "Calculus Assignment 1", submitted: true, submitDate: "2025-10-29 14:30" },
      { id: 2, courseId: 1, studentName: "Li Na", assignmentTitle: "Calculus Assignment 1", submitted: true, submitDate: "2025-10-29 15:20" },
      { id: 3, courseId: 1, studentName: "Wang Ming", assignmentTitle: "Calculus Assignment 2", submitted: true, submitDate: "2025-10-30 10:15" },
      { id: 4, courseId: 2, studentName: "Chen Jing", assignmentTitle: "Physics Lab 1", submitted: true, submitDate: "2025-10-28 16:45" },
      { id: 5, courseId: 2, studentName: "Liu Yang", assignmentTitle: "Physics Quiz 1", submitted: true, submitDate: "2025-10-29 09:30" },
    ];

    return allAssignments.filter(a => a.courseId === parseInt(selectedCourse));
  };

  const studentAssignments = getStudentAssignments();

  const handleCourseChange = (e) => {
    setSelectedCourse(e.target.value);
    setSelectedStudent(""); // 重置学生选择
    setScore("");
    setComments("");
  };

  const handleAiGrade = async () => {
    if (!selectedStudent) {
      alert("Please select a student submission first");
      return;
    }

    setAiGrading(true);
    try {
      // TODO: 调用 AI 批改 API
      // 模拟 AI 批改过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 模拟 AI 返回的评分和评语
      setScore("85");
      setComments("Good work overall! The derivatives are calculated correctly. However, there's a small error in Question 2 - you forgot to include the constant of integration 'C'. \n\nStrengths:\n- Correct application of power rule\n- Clear step-by-step solution\n\nAreas for improvement:\n- Remember to always add the constant 'C' when computing indefinite integrals\n- Consider showing more intermediate steps for complex problems");
      
      alert("AI grading completed!");
    } catch (error) {
      console.error("AI grading error:", error);
      alert("Failed to get AI grading. Please try again.");
    } finally {
      setAiGrading(false);
    }
  };

  const handleAiGenerateFeedback = async () => {
    if (!selectedStudent) {
      alert("Please select a student submission first");
      return;
    }

    setAiGenerating(true);
    try {
      // TODO: 调用 AI 生成反馈 API
      // 模拟 AI 生成过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 模拟 AI 生成的反馈内容
      const generatedFeedback = `Common Error Analysis:
The student forgot to include the constant of integration 'C' in the indefinite integral.

Learning Hint:
When computing indefinite integrals, always remember that there are infinitely many antiderivatives that differ by a constant. We represent this by adding '+ C' to our answer.

Similar Example:
Find ∫(3x² + 2x)dx

Solution:
Step 1: Apply the power rule to each term
∫3x²dx = x³
∫2xdx = x²

Step 2: Combine and add constant
Answer: x³ + x² + C

Practice Problem:
Try solving: ∫(4x³ - 6x + 5)dx
Expected answer: x⁴ - 3x² + 5x + C`;
      
      setFeedbackContent(generatedFeedback);
      alert("AI feedback generated successfully!");
    } catch (error) {
      console.error("AI feedback generation error:", error);
      alert("Failed to generate AI feedback. Please try again.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleGradeSubmit = () => {
    console.log("Submitting grade:", { selectedCourse, selectedStudent, score, comments });
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

          {/* 选择课程 */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Select Course</InputLabel>
            <Select
              value={selectedCourse}
              label="Select Course"
              onChange={handleCourseChange}
              disabled={coursesLoading}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {courses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 选择学生作业 */}
          <FormControl fullWidth sx={{ mb: 3 }} disabled={!selectedCourse}>
            <InputLabel>Select Student Submission</InputLabel>
            <Select
              value={selectedStudent}
              label="Select Student Submission"
              onChange={(e) => setSelectedStudent(e.target.value)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {studentAssignments.map((assignment) => (
                <MenuItem key={assignment.id} value={assignment.id}>
                  {assignment.studentName} - {assignment.assignmentTitle}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 作业内容显示区域 */}
          {selectedStudent && (() => {
            const selectedAssignment = studentAssignments.find(a => a.id === parseInt(selectedStudent));
            const selectedCourseInfo = courses.find(c => c.id === parseInt(selectedCourse));
            
            return (
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
                  <Typography variant="body2" sx={{ color: "#666", mb: 1 }}>
                    <strong>Course:</strong> {selectedCourseInfo?.name || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#666", mb: 1 }}>
                    <strong>Student:</strong> {selectedAssignment?.studentName || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#666", mb: 1 }}>
                    <strong>Assignment:</strong> {selectedAssignment?.assignmentTitle || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#666", mb: 2 }}>
                    <strong>Submitted:</strong> {selectedAssignment?.submitDate || 'N/A'}
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
            );
          })()}

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

          {/* AI 批改按钮 */}
          <Button
            variant="outlined"
            fullWidth
            startIcon={aiGrading ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
            onClick={handleAiGrade}
            disabled={!selectedStudent || aiGrading}
            sx={{
              mb: 2,
              borderColor: "#9c27b0",
              color: "#9c27b0",
              "&:hover": { 
                borderColor: "#7b1fa2",
                bgcolor: "rgba(156, 39, 176, 0.04)",
              },
              height: 45,
            }}
          >
            {aiGrading ? "AI is Grading..." : "AI Grade Assignment"}
          </Button>

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

          {/* AI 生成反馈按钮 */}
          <Button
            variant="outlined"
            fullWidth
            startIcon={aiGenerating ? <CircularProgress size={20} /> : <SmartToyIcon />}
            onClick={handleAiGenerateFeedback}
            disabled={!selectedStudent || aiGenerating}
            sx={{
              mb: 2,
              borderColor: "#ff6f00",
              color: "#ff6f00",
              "&:hover": { 
                borderColor: "#e65100",
                bgcolor: "rgba(255, 111, 0, 0.04)",
              },
              height: 45,
            }}
          >
            {aiGenerating ? "AI is Generating..." : "AI Generate Feedback"}
          </Button>

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
