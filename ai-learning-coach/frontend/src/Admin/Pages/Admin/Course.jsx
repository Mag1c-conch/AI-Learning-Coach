import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Input,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  CircularProgress,
} from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CourseStudentProgress from "./CourseStudentProgress";


// 课程数据（与Dashboard保持一致）
const courses = [
  {
    id: "5259_01567",
    title: "COMP4336/COMP9336 - Mobile Data Networking - 2025 T3",
    org: "COMPSC - School of CSE",
    image:
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=800&auto=format&fit=crop",
    studentCount: 45,
  },
  {
    id: "5259_00428",
    title: "COMP4418 - Knowledge Representation - 2025 T3",
    org: "COMPSC - School of CSE",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop",
    studentCount: 38,
  },
  {
    id: "5253_00881",
    title: "GSOE9011 Eng PGCW Research Skills - 2025 T1",
    org: "ENG - Faculty of Engineering",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800&auto=format&fit=crop",
    studentCount: 52,
  },
  {
    id: "5253_00002",
    title: "COMP9024 - Data Structures & Algorithms",
    org: "CSE",
    image:
      "https://images.unsplash.com/photo-1518085250887-2f903c200fee?q=80&w=800&auto=format&fit=crop",
    studentCount: 29,
  },
  {
    id: "5253_00003",
    title: "COMP9311 - Database Systems",
    org: "CSE",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800&auto=format&fit=crop",
    studentCount: 41,
  },
];

// Student data (example)
const studentData = [
  { name: 'Jack', studentId: 'zXXXXXXXX', course: 'Math101', percent: 30 },
  { name: 'Suzuki', studentId: 'zXXXXXXXX', course: 'Math108', percent: 55 },
  { name: 'Tom', studentId: 'zXXXXXXXX', course: 'Math108', percent: 70 },
  { name: 'Jerry', studentId: 'zXXXXXXXX', course: 'Math101', percent: 85 },
  { name: 'Alice', studentId: 'zXXXXXXXX', course: 'Math108', percent: 45 },
  { name: 'Bob', studentId: 'zXXXXXXXX', course: 'Math101', percent: 90 },
  { name: 'Charlie', studentId: 'zXXXXXXXX', course: 'Math108', percent: 60 },
  { name: 'Diana', studentId: 'zXXXXXXXX', course: 'Math101', percent: 75 },
];

// File management data (example)
const fileData = {
  "Week 1": [
    { id: 1, name: "Lecture 1 - Introduction.pdf", type: "lecture_slide", uploadDate: "2024-01-15", size: "2.3 MB" },
    { id: 2, name: "Assignment 1 - Basic Concepts.docx", type: "assignment", uploadDate: "2024-01-16", size: "1.1 MB", deadline: "2024-01-30" },
  ],
  "Week 2": [
    { id: 3, name: "Lecture 2 - Advanced Topics.pdf", type: "lecture_slide", uploadDate: "2024-01-22", size: "3.1 MB" },
    { id: 4, name: "Quiz 1 - Chapter 1-2.pdf", type: "quiz", uploadDate: "2024-01-23", size: "0.8 MB", deadline: "2024-01-25" },
    { id: 5, name: "Lab Exercise 1.pdf", type: "lab", uploadDate: "2024-01-24", size: "1.5 MB", deadline: "2024-01-28" },
  ],
  "Week 3": [
    { id: 6, name: "Reading Material - Chapter 3.pdf", type: "learning_material", uploadDate: "2024-01-29", size: "4.2 MB" },
    { id: 7, name: "Practice Problems Set 1.pdf", type: "practice", uploadDate: "2024-01-30", size: "1.8 MB" },
  ],
  "Week 4": [
    { id: 8, name: "Lecture 3 - Case Studies.pdf", type: "lecture_slide", uploadDate: "2024-02-05", size: "2.7 MB" },
    { id: 9, name: "Assignment 2 - Implementation.docx", type: "assignment", uploadDate: "2024-02-06", size: "1.9 MB", deadline: "2024-02-20" },
  ],
};

// 默认学习相关图片（与Dashboard保持一致）
const defaultCourseImages = [
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop", // 书本和笔记本
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop", // 课堂学习
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop", // 大学生活
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=800&auto=format&fit=crop", // 图书馆
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800&auto=format&fit=crop", // 笔记本电脑学习
];

// Hook to get user display name (consistent with Dashboard)
function useDisplayName() {
  const [name, setName] = useState("Admin");
  useEffect(() => {
    const stored = localStorage.getItem("userDisplayName");
    if (stored) setName(stored);
    return () => {};
  }, []);
  return name;
}

export default function Course() {
  const name = useDisplayName();
  
  // 从URL参数获取课程ID
  const { courseId } = useParams();
  
  // 状态管理
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 从后端获取课程信息
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5001/courses');
        if (response.ok) {
          const data = await response.json();
          // 根据courseId（course.code）找到对应的课程
          const foundCourse = data.find(c => c.code === courseId);
          if (foundCourse) {
            // 转换为前端格式
            setCourse({
              id: foundCourse.code,
              title: `${foundCourse.code} - ${foundCourse.name}`,
              org: foundCourse.description || "COMPSC - School of CSE",
              image: foundCourse.image_url || defaultCourseImages[0],
              studentCount: 0, // TODO: 从enrollments计算
              ...foundCourse // 保留后端原始数据
            });
          } else {
            setError(`Course with code "${courseId}" not found`);
          }
        } else {
          setError('Failed to fetch course data');
        }
      } catch (err) {
        console.error('Error fetching course:', err);
        setError('Network error. Please check if the backend server is running.');
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);
  
  // Modal state management
  const [openAddFile, setOpenAddFile] = useState(false);
  
  // File form state
  const [fileName, setFileName] = useState("");
  const [fileDescription, setFileDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Detailed file description state
  const [fileType, setFileType] = useState("");
  const [weekNumber, setWeekNumber] = useState("");
  const [deadline, setDeadline] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  
  // File management state
  const [files, setFiles] = useState(fileData);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState(new Set(["Week 1", "Week 2"]));
  
  // File management functions
  const handleWeekToggle = (week) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(week)) {
      newExpanded.delete(week);
    } else {
      newExpanded.add(week);
    }
    setExpandedWeeks(newExpanded);
  };
  
  const handleFileSelect = (fileId) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };
  
  const handleDeleteSelected = () => {
    if (selectedFiles.size === 0) return;
    
    const newFiles = { ...files };
    Object.keys(newFiles).forEach(week => {
      newFiles[week] = newFiles[week].filter(file => !selectedFiles.has(file.id));
    });
    setFiles(newFiles);
    setSelectedFiles(new Set());
  };
  
  // Keyboard event handler for delete key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Delete' && selectedFiles.size > 0) {
        handleDeleteSelected();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedFiles]);

  return (
    <Box sx={{ p: 3, position: "relative" }}>
      {/* ======= 标题栏 ======= */}
      <Box
        sx={{
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        {/* 标题组 */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1 }}>
          <Typography variant="h4">Course</Typography>
          <CircleIcon sx={{ ml: "15%", fontSize: 10, color: "#B3B3B3" }} />
          <Typography variant="subtitle1" sx={{ color: "#7a7a7a" }}>
            Admin
          </Typography>
        </Box>

        {/* 通知图标 */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            position: "absolute",
            top: -10,
            right: 20,
          }}
        >
          <IconButton>
            <NotificationsIcon />
          </IconButton>
        </Box>
      </Box>

      {/* ======= 分割线（与Dashboard保持一致） ======= */}
      <Box
        sx={{
          height: 2,
          bgcolor: "rgba(21,19,19,0.45)",
          mb: 2,
          ml: "calc(-24px - 240px)",
          mr: -3,
        }}
      />

      {/* ======= 课程内容区域 ======= */}
      <Box sx={{ height: "100%", overflowY: "hidden" }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "400px",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <CircularProgress />
            <Typography variant="body1" color="text.secondary">
              Loading course information...
            </Typography>
          </Box>
        ) : error ? (
          <Box
            sx={{
              p: 3,
              bgcolor: "#ffebee",
              borderRadius: 2,
              textAlign: "center",
              color: "error.main",
            }}
          >
            <Typography variant="body1">
              {error}
            </Typography>
          </Box>
        ) : course ? (
          <>
            {/* Course title */}
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              {course.title}
            </Typography>
            
            {/* Main content area - Left and Right sections */}
            <Box sx={{ display: "flex", gap: 3, height: "calc(100% - 100px)", p: 3 }}>
              {/* Left side - Course info and Student Progress */}
              <Box sx={{ flex: "1 1 60%", display: "flex", flexDirection: "column" }}>
                {/* Course basic information */}
                <Box
                  sx={{
                    p: 3,
                    bgcolor: "#f5f5f5",
                    borderRadius: 2,
                    mb: 2,
                  }}
                >
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Course ID:</strong> {course.id}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Facility:</strong> {course.org}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Student Count:</strong> {course.studentCount} 
                  </Typography>
                </Box>
                
                {/* Student Progress */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Student Progress
                  </Typography>
                  <CourseStudentProgress rows={studentData} />
                </Box>
              </Box>
              
              {/* Right side - File Management */}
              <Box sx={{ flex: "1 1 40%", minWidth: 400, display: "flex", flexDirection: "column" }}>
                {/* File Management header with buttons */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    File Management
                  </Typography>
                  
                  {/* File management buttons */}
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setOpenAddFile(true)}
                      size="small"
                      sx={{ 
                        bgcolor: "#142E4F", 
                        "&:hover": { bgcolor: "#0f223b" },
                        px: 2
                      }}
                    >
                      Add File
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={handleDeleteSelected}
                      size="small"
                      sx={{ px: 2 }}
                      disabled={selectedFiles.size === 0}
                    >
                      Delete File {selectedFiles.size > 0 && `(${selectedFiles.size})`}
                    </Button>
                  </Box>
                </Box>
                
                {/* File Management Form */}
                <Box
                  sx={{
                    flex: 1,
                    border: "1px solid rgba(0,0,0,0.2)",
                    borderRadius: 2,
                    bgcolor: "#fff",
                    overflowY: "auto",
                    p: 2,
                  }}
                >
                  {Object.keys(files).map((week) => (
                    <Accordion
                      key={week}
                      expanded={expandedWeeks.has(week)}
                      onChange={() => handleWeekToggle(week)}
                      sx={{ mb: 1, boxShadow: 1 }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          bgcolor: "#f5f5f5",
                          "&:hover": { bgcolor: "#e0e0e0" },
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {week} ({files[week].length} files)
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0 }}>
                        <List dense>
                          {files[week].map((file) => (
                            <ListItem
                              key={file.id}
                              sx={{
                                borderBottom: "1px solid rgba(0,0,0,0.1)",
                                "&:hover": { bgcolor: "#f9f9f9" },
                              }}
                            >
                              <Checkbox
                                checked={selectedFiles.has(file.id)}
                                onChange={() => handleFileSelect(file.id)}
                                size="small"
                              />
                              <InsertDriveFileIcon sx={{ mr: 1, color: "#666" }} />
                              <ListItemText
                                primary={
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {file.name}
                                    </Typography>
                                    <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                                      <Chip
                                        label={file.type.replace('_', ' ')}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: "0.7rem", height: 20 }}
                                      />
                                      <Typography variant="caption" color="text.secondary">
                                        {file.size}
                                      </Typography>
                                      {file.deadline && (
                                        <Typography variant="caption" color="error">
                                          Due: {file.deadline}
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              </Box>
            </Box>
          </>
        ) : (
          <Box
            sx={{
              p: 3,
              bgcolor: "#f5f5f5",
              borderRadius: 2,
              textAlign: "center",
              color: "text.secondary",
            }}
          >
            <Typography variant="body1">
              Course not found (ID: {courseId})
            </Typography>
          </Box>
        )}
      </Box>

      {/* Add File Modal */}
      <Dialog 
        open={openAddFile} 
        onClose={() => setOpenAddFile(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            border: "1px solid #000",
          }
        }}
      >
        <DialogTitle sx={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          fontWeight: "bold",
          fontSize: "1.2rem"
        }}>
          Add File
          <IconButton 
            onClick={() => setOpenAddFile(false)}
            sx={{ 
              color: "red",
              bgcolor: "red",
              color: "white",
              "&:hover": { bgcolor: "darkred" },
              width: 24,
              height: 24,
              borderRadius: "50%"
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {/* File Name */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
              File Name
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter file name"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1,
                }
              }}
            />
          </Box>

          {/* File Selection */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
              File
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Button
                variant="outlined"
                component="label"
                sx={{
                  bgcolor: "#f5f5f5",
                  borderColor: "#ccc",
                  color: "#000",
                  textTransform: "none",
                  "&:hover": {
                    bgcolor: "#e0e0e0",
                    borderColor: "#999",
                  }
                }}
              >
                Choose File
                <Input
                  type="file"
                  hidden
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                />
              </Button>
              <Typography variant="body2" sx={{ color: "#000" }}>
                {selectedFile ? selectedFile.name : "No file chosen"}
              </Typography>
            </Box>
          </Box>

          {/* File Description */}
          <Box>
            <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
              File Description
            </Typography>
            
            {/* File Type Selection */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>File Type</InputLabel>
              <Select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                label="File Type"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1,
                  }
                }}
              >
                <MenuItem value="assignment">Assignment</MenuItem>
                <MenuItem value="quiz">Quiz</MenuItem>
                <MenuItem value="lab">Lab</MenuItem>
                <MenuItem value="lecture_slide">Lecture Slide</MenuItem>
                <MenuItem value="learning_material">Learning Material</MenuItem>
                <MenuItem value="practice">Practice</MenuItem>
              </Select>
            </FormControl>

            {/* Week Number */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Week Number</InputLabel>
              <Select
                value={weekNumber}
                onChange={(e) => setWeekNumber(e.target.value)}
                label="Week Number"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1,
                  }
                }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    Week {i + 1}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Deadline (only for assignment, quiz, lab) */}
            {(fileType === 'assignment' || fileType === 'quiz' || fileType === 'lab') && (
              <TextField
                fullWidth
                type="datetime-local"
                label="Deadline"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  style: { 
                    colorScheme: 'light' // Ensure date picker uses English
                  }
                }}
                sx={{ mb: 2 }}
              />
            )}

            {/* Additional Notes */}
            <TextField
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Additional notes..."
              label="Additional Notes"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1,
                }
              }}
            />
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, justifyContent: "center" }}>
          <Button
            variant="contained"
            onClick={() => {
              // Here you can add the logic to save the file
              console.log("Saving file:", { 
                fileName, 
                fileDescription, 
                selectedFile,
                fileType,
                weekNumber,
                deadline,
                additionalNotes
              });
              setOpenAddFile(false);
              // Reset all form states
              setFileName("");
              setFileDescription("");
              setSelectedFile(null);
              setFileType("");
              setWeekNumber("");
              setDeadline("");
              setAdditionalNotes("");
            }}
            sx={{
              bgcolor: "#1976d2",
              color: "white",
              px: 4,
              py: 1,
              "&:hover": {
                bgcolor: "#1565c0",
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
