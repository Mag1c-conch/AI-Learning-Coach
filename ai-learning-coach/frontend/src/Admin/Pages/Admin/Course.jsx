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
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs from "dayjs";
import "dayjs/locale/en";
import CircleIcon from "@mui/icons-material/Circle";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { authFetch, API_BASE } from "../../../api/http";
import CourseStudentProgress from "./CourseStudentProgress";


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

// Student data will be fetched from API


// image for course
const defaultCourseImages = [
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=800&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800&auto=format&fit=crop", 
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
  
  // get course id from URL
  const { courseId } = useParams();
  
  // state management
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  
  // fetch course information from backend
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const response = await authFetch(`${API_BASE}/courses`);
        if (response.ok) {
          const data = await response.json();
          // find the corresponding course based on courseId (course.code)
          const foundCourse = data.find(c => c.code === courseId);
          if (foundCourse) {
            // convert to frontend format, keep the id field from backend for API call
            setCourse({
              id: foundCourse.id, // use the database ID from backend for API call
              code: foundCourse.code, // keep the course code for display
              title: `${foundCourse.code} - ${foundCourse.name}`,
              org: foundCourse.description || "COMPSC - School of CSE",
              image: foundCourse.image_url || defaultCourseImages[0],
              studentCount: foundCourse.student_count || 0,
              ...foundCourse // keep the original data from backend
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
  const [deadline, setDeadline] = useState(null); // Change to dayjs object or null
  const [additionalNotes, setAdditionalNotes] = useState("");
  
  // File management state
  const [files, setFiles] = useState({});
  const [materials, setMaterials] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState(new Set(["Week 1", "Week 2"]));
  
  // get current user information from localStorage
  const getCurrentUser = () => {
    try {
      const token =
        window.sessionStorage.getItem('token') || window.localStorage.getItem('token');
      if (token) {
        return JSON.parse(token);
      }
    } catch (e) {
      console.error('Error parsing token:', e);
    }
    return null;
  };

  // fetch the registered students list from backend
  const fetchStudents = async () => {
    if (!course || !course.id) return;
    
    setStudentsLoading(true);
    try {
      const response = await authFetch(`${API_BASE}/courses/${course.id}/students`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched students:', data);
        
        // convert to the format needed for the table
        const formattedStudents = data.map(student => ({
          id: student.id,
          name: `${student.first_name} ${student.last_name}`,
          studentId: student.username,
          course: course.code,
          enrolled_at: student.enrolled_at,
          reward: Number(student.reward) || 0,
        }));
        
        setStudents(formattedStudents);
      } else {
        console.error('Failed to fetch students');
        setStudents([]);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  // when the course is loaded, fetch the students list
  useEffect(() => {
    if (course && course.id) {
      fetchStudents();
    }
  }, [course?.id]);

  const handleGiveReward = async (studentUserId, pointsToAdd) => {
    if (!course || !course.id) {
      throw new Error("Course information is not ready yet.");
    }

    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
      throw new Error("Only administrators can give rewards.");
    }

    const response = await authFetch(`${API_BASE}/courses/${course.id}/extra`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        student_id: studentUserId,
        points_to_add: pointsToAdd,
      }),
    });

    if (!response.ok) {
      let message = response.statusText;
      try {
        const data = await response.json();
        message = data?.description || data?.error || message;
      } catch {
        try {
          const text = await response.text();
          if (text) {
            message = text;
          }
        } catch {
          // ignore text errors
        }
      }
      throw new Error(message || "Failed to give reward.");
    }

    await fetchStudents();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("enrollment:updated", { detail: { user_id: studentUserId } }));
    }
  };

  // format file size to readable format
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // fetch the file list from backend
  const fetchMaterials = async () => {
    if (!course || !course.id) return;
    
    setFilesLoading(true);
    try {
      const response = await authFetch(`${API_BASE}/materials?course_id=${course.id}`);
      if (response.ok) {
        const data = await response.json();
        setMaterials(data);
        
        // group the materials by week: use the user-selected week (localStorage persistence) if available, otherwise fallback to estimate by upload date
        const grouped = {};
        let weekMap = {};
        try {
          const raw = localStorage.getItem('materialWeekMap');
          if (raw) weekMap = JSON.parse(raw) || {};
        } catch (e) {
          console.warn('Failed to parse materialWeekMap:', e);
        }
        // read the local materialId -> type mapping
        let typeMap = {};
        try {
          const raw = localStorage.getItem('materialTypeMap');
          if (raw) typeMap = JSON.parse(raw) || {};
        } catch (e) {
          console.warn('Failed to parse materialTypeMap:', e);
        }
        
        if (data.length > 0) {
          // find the earliest upload date as the baseline
          const dates = data
            .map(m => m.uploaded_at ? new Date(m.uploaded_at) : null)
            .filter(d => d !== null)
            .sort((a, b) => a - b);
          
          const earliestDate = dates[0];
          
          data.forEach((material) => {
            // use the backend week_number first, then use the local selection
            const chosenWeek = (material.week_number && Number(material.week_number) > 0)
              ? Number(material.week_number)
              : weekMap[String(material.id)];
            let weekKey;
            if (chosenWeek && Number(chosenWeek) > 0) {
              weekKey = `Week ${chosenWeek}`;
            } else if (material.uploaded_at) {
              const uploadDate = new Date(material.uploaded_at);
              const diffTime = earliestDate ? (uploadDate - earliestDate) : 0;
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              const weekIndex = Math.max(1, Math.floor(diffDays / 7) + 1);
              weekKey = `Week ${weekIndex}`;
            } else {
              weekKey = "Other";
            }
            
            if (!grouped[weekKey]) {
              grouped[weekKey] = [];
            }
            grouped[weekKey].push({
              id: material.id,
              name: material.stored_name || material.original_name,
              type: material.file_type || typeMap[String(material.id)] || 'learning_material',
              uploadDate: material.uploaded_at ? formatDate(material.uploaded_at) : '',
              size: formatFileSize(material.file_size),
              material: material
            });
          });
          
          Object.keys(grouped).forEach(weekKey => {
            grouped[weekKey].sort((a, b) => {
              const dateA = a.material.uploaded_at ? new Date(a.material.uploaded_at) : new Date(0);
              const dateB = b.material.uploaded_at ? new Date(b.material.uploaded_at) : new Date(0);
              return dateA - dateB; // ascending order
            });
          });
          
          // sort by week number Week 1, Week 2, ... 
          const sortedGrouped = {};
          const weekKeys = Object.keys(grouped).sort((a, b) => {
            if (a === "Other") return 1;
            if (b === "Other") return -1;
            const numA = parseInt(a.replace("Week ", ""));
            const numB = parseInt(b.replace("Week ", ""));
            return numA - numB;
          });
          weekKeys.forEach(key => {
            sortedGrouped[key] = grouped[key];
          });
          
          Object.assign(grouped, sortedGrouped);
        }
        
        // if no files, keep the default structure
        if (Object.keys(grouped).length === 0) {
          setFiles({});
        } else {
          setFiles(grouped);
          //first week
          if (Object.keys(grouped).length > 0) {
            setExpandedWeeks(new Set([Object.keys(grouped)[0]]));
          }
        }
      } else {
        console.error('Failed to fetch materials');
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
    } finally {
      setFilesLoading(false);
    }
  };

  // when the course information loaded, fetch file list
  useEffect(() => {
    if (course && course.id) {
      fetchMaterials();
    }
  }, [course?.id]);

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
  
  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;
    
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
      alert('Only administrators can delete files');
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete the selected ${selectedFiles.size} files?`);
    if (!confirmDelete) return;

    try {
      const deletePromises = Array.from(selectedFiles).map(async (fileId) => {
        const response = await authFetch(`${API_BASE}/materials/${fileId}?deleted_by=${user.id}`, {
          method: 'DELETE'
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.description || 'Failed to delete');
        }
        return response.json();
      });

      await Promise.all(deletePromises);
      
      // refresh the file list      
      await fetchMaterials();
      setSelectedFiles(new Set());
      alert('Files deleted successfully');
    } catch (err) {
      console.error('Error deleting materials:', err);
      alert('Error deleting files: ' + err.message);
    }
  };

  // handle file download
  const handleDownload = (materialId, fileName) => {
    window.open(`${API_BASE}/materials/${materialId}/download`, '_blank');
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
      <Box
        sx={{
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: -1 }}>
          <Typography variant="h4">Course</Typography>
          <CircleIcon sx={{ ml: "15%", fontSize: 10, color: "#B3B3B3" }} />
          <Typography variant="subtitle1" sx={{ color: "#7a7a7a" }}>
            Admin
          </Typography>
        </Box>

        {/* notification icon */}
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

      {/* separator line  */}
      <Box
        sx={{
          height: 2,
          bgcolor: "rgba(21,19,19,0.45)",
          mb: 2,
          ml: "calc(-24px - 240px)",
          mr: -3,
        }}
      />

      {/* course content area */}
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
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              {course.title}
            </Typography>
            
            {/* Main content area - Left and Right sections */}
            <Box sx={{ display: "flex", gap: 3, height: "calc(100% - 100px)", p: 3 }}>
              <Box sx={{ flex: "1 1 60%", display: "flex", flexDirection: "column" }}>
                <Box
                  sx={{
                    p: 3,
                    bgcolor: "#f5f5f5",
                    borderRadius: 2,
                    mb: 2,
                  }}
                >
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Course ID:</strong> {course.code || course.id}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Student Count:</strong> {course.studentCount} 
                  </Typography>
                </Box>
                
                {/* Student Reward */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    🏆 Student Reward
                  </Typography>
                  {studentsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : students.length === 0 ? (
                    <Box sx={{ 
                      p: 3, 
                      textAlign: 'center', 
                      bgcolor: '#f5f5f5', 
                      borderRadius: 2,
                      border: '1px solid rgba(0,0,0,0.1)'
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        No students enrolled in this course yet.
                      </Typography>
                    </Box>
                  ) : (
                    <CourseStudentProgress rows={students} onGiveReward={handleGiveReward} />
                  )}
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
                  {filesLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4 }}>
                      <CircularProgress size={40} />
                    </Box>
                  ) : Object.keys(files).length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                      <Typography variant="body2">No files yet</Typography>
                    </Box>
                  ) : (
                    Object.keys(files).map((week) => (
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
                                  cursor: "pointer"
                                }}
                                onClick={() => handleDownload(file.id, file.name)}
                              >
                                <Checkbox
                                  checked={selectedFiles.has(file.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleFileSelect(file.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
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
                                          label={file.type ? file.type.replace('_', ' ') : 'File'}
                                          size="small"
                                          variant="outlined"
                                          sx={{ fontSize: "0.7rem", height: 20 }}
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                          {file.size}
                                        </Typography>
                                        {file.uploadDate && (
                                          <Typography variant="caption" color="text.secondary">
                                            {file.uploadDate}
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
                    ))
                  )}
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
        lang="en"
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

            {/* Deadline for assignment, quiz, lab */}
            {(fileType === 'assignment' || fileType === 'quiz' || fileType === 'lab') && (
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en">
                <DateTimePicker
                  label="Deadline"
                  value={deadline}
                  onChange={(newValue) => setDeadline(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      sx: { mb: 2 }
                    }
                  }}
                />
              </LocalizationProvider>
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
            onClick={async () => {
              // validate the form
              if (!selectedFile) {
                alert('Please select the file to upload');
                return;
              }

              if (!course || !course.id) {
                alert('Course information is incomplete');
                return;
              }

              const user = getCurrentUser();
              if (!user || user.role !== 'admin') {
                alert('Only administrators can upload files');
                return;
              }

                          try {
                // create FormData object
                const formData = new FormData();
                const trimmedName = fileName?.trim();
                const isTaskType = fileType === 'assignment' || fileType === 'quiz' || fileType === 'lab';
                const titleBase = trimmedName || selectedFile?.name || 'Untitled';

                formData.append('file', selectedFile);
                formData.append('course_id', course.id);
                formData.append('uploaded_by', user.id);
                if (fileType) formData.append('file_type', String(fileType));
                if (weekNumber) formData.append('week_number', Number(weekNumber));
                if (trimmedName) {
                  formData.append('custom_name', trimmedName);
                }
                if (isTaskType) {
                  const titlePrefix =
                    fileType === 'assignment' ? 'Assignment' : fileType === 'quiz' ? 'Quiz' : 'Lab';
                  const assignmentTitle = `${titlePrefix}: ${titleBase}`;
                  const notes = additionalNotes?.trim();
                  const isoDeadline = deadline && typeof deadline?.toISOString === 'function'
                    ? deadline.toISOString()
                    : deadline
                      ? String(deadline)
                      : '';

                  formData.append('assignment_title', assignmentTitle);
                  if (notes) {
                    formData.append('assignment_description', notes);
                  }
                  if (isoDeadline) {
                    formData.append('assignment_due_date', isoDeadline);
                  }
                }

                const response = await authFetch(`${API_BASE}/materials`, {
                  method: 'POST',
                  body: formData
                });

                if (response.ok) {
                  const data = await response.json();
                  console.log('File uploaded successfully:', data);
await fetchMaterials();
                  
                  // Close dialog and reset form
                  setOpenAddFile(false);
                  setFileName("");
                  setFileDescription("");
                  setSelectedFile(null);
                  setFileType("");
                  setWeekNumber("");
                  setDeadline(null);
                  setAdditionalNotes("");
                } else {
                  const error = await response.json();
                  alert('Upload failed: ' + (error.description || 'Unknown error'));
                }
              } catch (err) {
                console.error('Error uploading file:', err);
                alert('Error uploading file: ' + err.message);
              }
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

