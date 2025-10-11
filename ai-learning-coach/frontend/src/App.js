import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Signin from './components/Signin';
import AUTH from './Constant.js';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import { dividerClasses } from '@mui/material';
import AdminLayout from './Admin/AdminLayout.jsx';
import AdminDashboard from './Admin/Pages/Admin/Dashboard.jsx';
import AiAssistance   from './Admin/Pages/Admin/AiAssistance.jsx';
import TimeTable      from './Admin/Pages/Admin/TimeTable.jsx';
import Course         from './Admin/Pages/Admin/Course.jsx';


function App() {
  const [token, setToken] = useState(localStorage.getItem(AUTH.TOKEN_KEY));

  return (
    <BrowserRouter>
      <div className="app-container">
        
        <div className="main-container">
          <Routes>
            <Route path="/" element={<Signin setToken={setToken} />} />
            <Route path="/signin" element={<Signin setToken={setToken} />} />
            <Route path="/sidebar" element={<Sidebar />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="assistant" element={<AiAssistance />} />
            <Route path="timetable" element={<TimeTable />} />
            <Route path="course/:courseId" element={<Course />} />
          </Route>
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;