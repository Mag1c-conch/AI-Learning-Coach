import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Signin from './components/Signin';
import AUTH from './Constant.js';
import { dividerClasses } from '@mui/material';


function App() {
  const [token, setToken] = useState(localStorage.getItem(AUTH.TOKEN_KEY));

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Signin setToken={setToken} />} />
        <Route path="/signin" element={<Signin setToken={setToken} />} />
        {/* <Route path="/dashboard" element={<Dashboard />}/> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;