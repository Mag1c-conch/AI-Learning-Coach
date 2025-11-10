import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Signin from './components/Signin';
import Signup from './Sign-up/App.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './Student/Dashboard.jsx';
import CoursesPage from "./Student/CoursesPage";
import CoursePage from "./Student/CoursePage";
import StudyProgress from "./Student/StudyProgress.jsx";
import { dividerClasses } from '@mui/material';
import AdminLayout from './Admin/AdminLayout.jsx';
import AdminDashboard from './Admin/Pages/Admin/Dashboard.jsx';
import AdminCourse from './Admin/Pages/Admin/Course.jsx';
import AiAssistance from './Admin/Pages/Admin/AiAssistance.jsx';
import Grading from './Admin/Pages/Admin/Grading.jsx';
import Registercourse from './Student/Registercourse.jsx';
// import { Calendar } from 'antd';
import Calendar from './Student/Calendar.jsx';
import StudentAI from './Student/StudentAI.jsx';
import { getStoredAuthPayload } from './api/authStorage';


function App() {
  const [token, setToken] = useState(() => {
    const stored = getStoredAuthPayload();
    return stored ? JSON.stringify(stored) : null;
  });

  return (
    <BrowserRouter>
      <div className="app-container">
        
        <div className="main-container">
          <Routes>
            <Route path="/" element={<Signin setToken={setToken} />} />
            <Route path="/signin" element={<Signin setToken={setToken} />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/sidebar" element={<Sidebar />} />
            <Route path="/studentai" element={<StudentAI />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/course/:id" element={<CoursePage />} />
            <Route path="/progress" element={<StudyProgress />} />
            <Route path="/progress/:code" element={<StudyProgress />} />
            <Route path="/progress/id/:id" element={<StudyProgress />} />
            <Route path="/registercourse" element={<Registercourse />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="course/:courseId" element={<AdminCourse />} />
            <Route path="assistant" element={<AiAssistance />} />
            <Route path="grading" element={<Grading />} />
          </Route>
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
