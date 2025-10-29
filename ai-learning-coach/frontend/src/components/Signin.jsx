// src/components/Signin.jsx
import React, { useState } from 'react';
import {
  Box, Button, TextField, Typography, Radio, RadioGroup,
  FormControlLabel, Link, Paper, Alert, CircularProgress,
} from "@mui/material";
import { useNavigate } from 'react-router-dom';
import signinImage from "./signin.jpg";

const Signin = ({ setToken }) => {
  const [userType, setUserType] = useState('student'); // User Identity
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5001/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email,
          password: password,
          role: userType
        }),
      });

      const data = await response.json();

      if (response.ok && !data.error) {
        // 登录成功
        const token = JSON.stringify({
          id: data.id,
          username: data.username,
          role: data.role,
          first_name: data.first_name,
          last_name: data.last_name
        });
        
        localStorage.setItem('token', token);
        setToken(token);
        
        // 根据角色跳转到不同页面
        if (userType === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        // 登录失败
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please check if the backend server is running.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" minHeight="100vh" justifyContent="center" alignItems="center" bgcolor="#f5f5f5">
      <Paper elevation={3} sx={{ display: "flex", width: 800, borderRadius: 2 }}>
        <Box flex={1} p={4}>
          <Typography variant="h4" mb={3}>Sign In</Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="subtitle1">User</Typography>
          <RadioGroup row value={userType} onChange={(e) => setUserType(e.target.value)}>
            <FormControlLabel
              value="student"
              control={<Radio color="#142E4F" />}
              label="Student"
            />
            <FormControlLabel
              value="admin"
              control={<Radio color="#142E4F" />}
              label="Admin"
            />
          </RadioGroup>

          <TextField
            label="User Name"
            placeholder="example@ad.unsw.edu.au"
            variant="outlined"
            margin="normal"
            fullWidth
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextField
            label="Password"
            type="password"
            variant="outlined"
            margin="normal"
            fullWidth
            onChange={(e) => setPassword(e.target.value)}
          />

          <Box textAlign="left" mb={2}>
            <Link href="#" underline="always" sx={{ color: "#6F6C6C" }}>
              Forgot password?
            </Link>
          </Box>

          <Button
            variant="contained"
            fullWidth
            sx={{ backgroundColor: "#142E4F" }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                Signing In...
              </Box>
            ) : (
              'Sign In'
            )}
          </Button>

          <Typography variant="body2" mt={2}>
            Don't have an account?{" "}
            <Link 
              component="button" 
              variant="body2" 
              onClick={() => navigate('/signup')}
              underline="always" 
              sx={{ color: "#6F6C6C" }}
            >
              Sign Up
            </Link>
          </Typography>
        </Box>

        <Box flex={1}>
          <img
            src={signinImage}
            alt="picture"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default Signin;
