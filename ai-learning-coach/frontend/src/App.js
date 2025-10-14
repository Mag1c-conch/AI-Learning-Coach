import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Signin from './components/Signin';
import Signup from './Sign-up/App.jsx';
import AUTH from './Constant.js';
import Sidebar from './components/Sidebar.jsx';
import { dividerClasses } from '@mui/material';
import AdminLayout from './Admin/AdminLayout.jsx';
import AdminDashboard from './Admin/Pages/Admin/Dashboard.jsx';
import AiAssistance   from './Admin/Pages/Admin/AiAssistance.jsx';
import TimeTable      from './Admin/Pages/Admin/TimeTable.jsx';
import Course         from './Admin/Pages/Admin/Course.jsx';
import StudentDashboard from './Student/Dashboard.jsx';
import CoursesPage from './Student/CoursesPage.jsx';
import CoursePage from './Student/CoursePage.jsx';
import Registercourse from './Student/Registercourse.jsx';


function App() {
  const [token, setToken] = useState(localStorage.getItem(AUTH.TOKEN_KEY));

  return (
    <BrowserRouter>
      <div className="app-container">
        
        <div className="main-container">
          <Routes>
            <Route path="/" element={<Signin setToken={setToken} />} />
            <Route path="/signin" element={<Signin setToken={setToken} />} />
            <Route path="/signup" element={<Signup />} /> 
            <Route path="/sidebar" element={<Sidebar />} />
            
            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="assistant" element={<AiAssistance />} />
              <Route path="timetable" element={<TimeTable />} />
              <Route path="course/:courseId" element={<Course />} />
            </Route>
            
            {/* Student routes */}
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/course/:code" element={<CoursePage />} />
            <Route path="/registercourse" element={<Registercourse />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;