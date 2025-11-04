// src/Admin/Pages/Admin/Grading.jsx
import React, { useState, useMemo, useEffect } from "react";
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
  Alert,
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
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DownloadIcon from "@mui/icons-material/Download";
import http from "../../../api/http";

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

export default function Grading() {
  const name = useDisplayName();
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState("");
  const [score, setScore] = useState("");
  const [comments, setComments] = useState("");
  const [feedbackType, setFeedbackType] = useState("hint");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [aiGrading, setAiGrading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [gradingResult, setGradingResult] = useState(null);
  const [error, setError] = useState(null);

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

  // 获取教师创建的课程列表
  useEffect(() => {
    const fetchCourses = async () => {
      setCoursesLoading(true);
      const user = getCurrentUser();
      if (!user || !user.id) {
        setCoursesLoading(false);
        return;
      }
      try {
        const { data } = await http.get(`/courses?created_by=${user.id}`);
        setCourses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses');
      } finally {
        setCoursesLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // 当选择课程时，获取该课程的作业列表
  useEffect(() => {
    const fetchAssignments = async () => {
      if (!selectedCourse) {
        setAssignments([]);
        return;
      }
      setAssignmentsLoading(true);
      try {
        const { data } = await http.get(`/assignments?course_id=${selectedCourse}`);
        setAssignments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching assignments:', err);
        setError('Failed to load assignments');
      } finally {
        setAssignmentsLoading(false);
      }
    };
    fetchAssignments();
  }, [selectedCourse]);

  // 当选择作业时，获取学生提交列表
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!selectedAssignment) {
        setSubmissions([]);
        return;
      }
      const user = getCurrentUser();
      if (!user || !user.id) return;
      
      setSubmissionsLoading(true);
      try {
        const { data } = await http.get(
          `/materials/assignments/${selectedAssignment}/submissions?viewer_id=${user.id}`
        );
        setSubmissions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching submissions:', err);
        setError('Failed to load submissions');
      } finally {
        setSubmissionsLoading(false);
      }
    };
    fetchSubmissions();
  }, [selectedAssignment]);

  const handleCourseChange = (e) => {
    setSelectedCourse(e.target.value);
    setSelectedAssignment("");
    setSelectedSubmission("");
    setScore("");
    setComments("");
    setGradingResult(null);
    setError(null);
  };

  const handleAssignmentChange = (e) => {
    setSelectedAssignment(e.target.value);
    setSelectedSubmission("");
    setScore("");
    setComments("");
    setGradingResult(null);
    setError(null);
  };

  const handleSubmissionChange = (e) => {
    setSelectedSubmission(e.target.value);
    setScore("");
    setComments("");
    setGradingResult(null);
    setError(null);
  };

  const handleAiGrade = async () => {
    if (!selectedSubmission) {
      alert("Please select a student submission first");
      return;
    }

    const user = getCurrentUser();
    if (!user || !user.id) {
      alert("User not logged in");
      return;
    }

    setAiGrading(true);
    setError(null);
    
    try {
      const { data } = await http.post('/assistant/grade_submission', {
        material_id: selectedSubmission,
        teacher_id: user.id,
        max_score: 100,
        rubric: "Please grade the assignment based on its content and provide detailed strengths and improvement suggestions."
      });

      if (data.grading) {
        setGradingResult(data.grading);
        // Extract score and comments
        if (data.grading.score) {
          setScore(String(data.grading.score.value || ""));
          setComments(data.grading.score.explanation || "");
        }
        alert("AI grading completed!");
      } else if (data.parse_error) {
        setError("AI response format error: " + data.parse_error);
      }
    } catch (error) {
      console.error("AI grading error:", error);
      const errorMsg = error?.response?.data?.error || error.message || "AI grading failed";
      setError(errorMsg);
      alert("AI grading failed: " + errorMsg);
    } finally {
      setAiGrading(false);
    }
  };

  const handleAiGenerateFeedback = async () => {
    if (!gradingResult) {
      alert("Please run AI grading first to generate feedback");
      return;
    }

    setAiGenerating(true);
    setError(null);

    try {
      // 构建基于批改结果的反馈内容
      let feedbackParts = [];

      // 添加总体评价
      if (gradingResult.score) {
        feedbackParts.push(`📊 Grade: ${gradingResult.score.value}/${gradingResult.score.max}`);
        if (gradingResult.score.explanation) {
          feedbackParts.push(`\n${gradingResult.score.explanation}\n`);
        }
      }

      // 添加优点
      if (gradingResult.strengths && gradingResult.strengths.length > 0) {
        feedbackParts.push(`\n✅ Strengths:`);
        gradingResult.strengths.forEach((strength, idx) => {
          feedbackParts.push(`${idx + 1}. ${strength}`);
        });
      }

      // 添加错误提示和相似例题
      if (gradingResult.mistakes && gradingResult.mistakes.length > 0) {
        feedbackParts.push(`\n\n⚠️ Areas for Improvement:\n`);
        
        gradingResult.mistakes.forEach((mistake, idx) => {
          feedbackParts.push(`\n${idx + 1}. Issue: ${mistake.issue}`);
          
          if (mistake.hint) {
            feedbackParts.push(`   💡 Hint: ${mistake.hint}`);
          }
          
          if (mistake.follow_up_question) {
            feedbackParts.push(`\n   📝 Practice Question:`);
            feedbackParts.push(`   ${mistake.follow_up_question.question}`);
            if (mistake.follow_up_question.answer) {
              feedbackParts.push(`   \n   ✓ Answer: ${mistake.follow_up_question.answer}`);
            }
          }
        });
      }

      // 添加下一步建议
      if (gradingResult.next_steps) {
        feedbackParts.push(`\n\n📚 Next Steps:\n${gradingResult.next_steps}`);
      }

      const generatedFeedback = feedbackParts.join('\n');
      setFeedbackContent(generatedFeedback);
      alert("Feedback generated successfully!");
    } catch (error) {
      console.error("Generate feedback error:", error);
      setError("Failed to generate feedback");
      alert("Failed to generate feedback");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleFeedbackSend = () => {
    if (!feedbackContent.trim()) {
      alert("Please enter or generate feedback content first");
      return;
    }
    
    console.log("Sending feedback:", { 
      submission: selectedSubmission,
      content: feedbackContent 
    });
    // TODO: Implement sending feedback to student (e.g., via email or notification)
    alert("Feedback sent to student (feature to be implemented)");
  };

  const handleGradeSubmit = () => {
    console.log("Submitting grade:", { 
      course: selectedCourse, 
      assignment: selectedAssignment,
      submission: selectedSubmission, 
      score, 
      comments 
    });
    // TODO: Implement saving grade to backend
    alert("Grade recorded (feature to be implemented)");
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

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Select Course */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Select Course</InputLabel>
            <Select
              value={selectedCourse}
              label="Select Course"
              onChange={handleCourseChange}
              disabled={coursesLoading}
            >
              <MenuItem value="">
                <em>Please Select</em>
              </MenuItem>
              {courses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Select Assignment */}
          <FormControl fullWidth sx={{ mb: 3 }} disabled={!selectedCourse || assignmentsLoading}>
            <InputLabel>Select Assignment</InputLabel>
            <Select
              value={selectedAssignment}
              label="Select Assignment"
              onChange={handleAssignmentChange}
            >
              <MenuItem value="">
                <em>Please Select</em>
              </MenuItem>
              {assignments.map((assignment) => (
                <MenuItem key={assignment.id} value={assignment.id}>
                  {assignment.title}
                  {assignment.due_date && ` (Due: ${new Date(assignment.due_date).toLocaleDateString()})`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Select Student Submission */}
          <FormControl fullWidth sx={{ mb: 3 }} disabled={!selectedAssignment || submissionsLoading}>
            <InputLabel>Select Student Submission</InputLabel>
            <Select
              value={selectedSubmission}
              label="Select Student Submission"
              onChange={handleSubmissionChange}
            >
              <MenuItem value="">
                <em>Please Select</em>
              </MenuItem>
              {submissions.map((submission) => (
                <MenuItem key={submission.id} value={submission.id}>
                  {submission.student ? 
                    `${submission.student.first_name} ${submission.student.last_name} - ${submission.original_name}` :
                    `Student ID ${submission.uploaded_by} - ${submission.original_name}`
                  }
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* PDF Preview and Download */}
          {selectedSubmission && (() => {
            const submission = submissions.find(s => s.id === parseInt(selectedSubmission));
            const assignment = assignments.find(a => a.id === parseInt(selectedAssignment));
            const course = courses.find(c => c.id === parseInt(selectedCourse));
            
            if (!submission) return null;

            const isPDF = submission.original_name?.toLowerCase().endsWith('.pdf');
            const downloadUrl = `http://localhost:5001/materials/${submission.id}/download`;
            
            return (
              <Card sx={{ mb: 3, bgcolor: "white" }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2, justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
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
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DownloadIcon />}
                      href={downloadUrl}
                      target="_blank"
                    >
                      Download File
                    </Button>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" sx={{ color: "#666", mb: 1 }}>
                    <strong>Course:</strong> {course?.name || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#666", mb: 1 }}>
                    <strong>Student:</strong> {submission.student ? 
                      `${submission.student.first_name} ${submission.student.last_name}` :
                      `Student ID ${submission.uploaded_by}`
                    }
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#666", mb: 1 }}>
                    <strong>Assignment:</strong> {assignment?.title || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#666", mb: 1 }}>
                    <strong>File Name:</strong> {submission.original_name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#666", mb: 2 }}>
                    <strong>Submitted At:</strong> {submission.uploaded_at ? 
                      new Date(submission.uploaded_at).toLocaleString() : 
                      'N/A'
                    }
                  </Typography>

                  {/* PDF Preview */}
                  {isPDF && (
                    <Box
                      sx={{
                        mt: 2,
                        border: "2px solid #e0e0e0",
                        borderRadius: 1,
                        height: 400,
                        position: "relative",
                        bgcolor: "#f5f5f5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Box sx={{ textAlign: "center" }}>
                        <PictureAsPdfIcon sx={{ fontSize: 64, color: "#d32f2f", mb: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                          PDF File: {submission.original_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                          Click "Download File" button above to view full content
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Non-PDF File Notice */}
                  {!isPDF && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 3,
                        bgcolor: "#f5f5f5",
                        borderRadius: 1,
                        textAlign: "center",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        This file is not in PDF format. Please download to view.
                      </Typography>
                    </Box>
                  )}
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

          {/* AI Grading Results */}
          {gradingResult && (
            <Card sx={{ mb: 3, bgcolor: "#f0f7ff", border: "1px solid #90caf9" }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: "#1976d2" }}>
                  🤖 AI Grading Results
                </Typography>
                
                {gradingResult.score && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#1976d2" }}>
                      Score: {gradingResult.score.value} / {gradingResult.score.max}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {gradingResult.score.explanation}
                    </Typography>
                  </Box>
                )}

                {gradingResult.strengths && gradingResult.strengths.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#2e7d32", mb: 1 }}>
                      ✅ Strengths:
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                      {gradingResult.strengths.map((strength, idx) => (
                        <Typography component="li" key={idx} variant="body2" sx={{ mb: 0.5 }}>
                          {strength}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}

                {gradingResult.mistakes && gradingResult.mistakes.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#d32f2f", mb: 1 }}>
                      ⚠️ Areas for Improvement:
                    </Typography>
                    {gradingResult.mistakes.map((mistake, idx) => (
                      <Box key={idx} sx={{ mb: 1.5, pl: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {idx + 1}. {mistake.issue}
                        </Typography>
                        {mistake.hint && (
                          <Typography variant="body2" sx={{ mt: 0.5, color: "#666" }}>
                            💡 Hint: {mistake.hint}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}

                {gradingResult.next_steps && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      📚 Next Steps:
                    </Typography>
                    <Typography variant="body2">
                      {gradingResult.next_steps}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Grading Button */}
          <Button
            variant="outlined"
            fullWidth
            startIcon={aiGrading ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
            onClick={handleAiGrade}
            disabled={!selectedSubmission || aiGrading}
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
            {aiGrading ? "AI Grading..." : "🤖 AI Auto-Grade"}
          </Button>

          {/* Submit Grade Button */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleGradeSubmit}
            disabled={!selectedSubmission || !score}
            sx={{
              bgcolor: "#1976d2",
              "&:hover": { bgcolor: "#1565c0" },
              height: 45,
            }}
          >
            Submit Grade
          </Button>
        </Paper>

        {/* ======= Right Panel: Student Feedback & Guidance ======= */}
        <Paper
          elevation={2}
          sx={{
            flex: 1,
            p: 3,
            overflowY: "auto",
            bgcolor: "#fafafa",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
            💬 Student Feedback & Guidance
          </Typography>

          {/* Guidance Message Input */}
          <TextField
            fullWidth
            label="Feedback Message to Student"
            multiline
            rows={12}
            value={feedbackContent}
            onChange={(e) => setFeedbackContent(e.target.value)}
            placeholder="Enter feedback message for the student. Click 'AI Generate' to automatically create error hints and similar examples based on the grading results..."
            sx={{ mb: 3, flex: 1 }}
          />

          {/* AI Generate Feedback Button */}
          <Button
            variant="outlined"
            fullWidth
            startIcon={aiGenerating ? <CircularProgress size={20} /> : <SmartToyIcon />}
            onClick={handleAiGenerateFeedback}
            disabled={!gradingResult || aiGenerating}
            sx={{
              mb: 2,
              borderColor: "#ff6f00",
              color: "#ff6f00",
              "&:hover": { 
                borderColor: "#e65100",
                bgcolor: "rgba(255, 111, 0, 0.04)",
              },
              height: 48,
            }}
          >
            {aiGenerating ? "AI Generating..." : "🤖 AI Generate Feedback"}
          </Button>

          {/* Send Feedback Button */}
          <Button
            variant="contained"
            fullWidth
            endIcon={<SendIcon />}
            onClick={handleFeedbackSend}
            disabled={!feedbackContent.trim()}
            sx={{
              bgcolor: "#2e7d32",
              "&:hover": { bgcolor: "#1b5e20" },
              height: 48,
            }}
          >
            Send to Student
          </Button>

          {/* Info Card */}
          <Card sx={{ mt: 3, bgcolor: "#e3f2fd" }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "#1976d2" }}>
                💡 Tip:
              </Typography>
              <Typography variant="body2" sx={{ color: "#0d47a1" }}>
                Click "AI Generate Feedback" to automatically create detailed error hints and similar practice examples based on the AI grading results.
              </Typography>
            </CardContent>
          </Card>
        </Paper>
      </Box>
    </Box>
  );
}
