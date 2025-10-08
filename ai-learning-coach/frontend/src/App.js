import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Signin from './components/Signin';
import AUTH from './Constant.js';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import { dividerClasses } from '@mui/material';


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
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;