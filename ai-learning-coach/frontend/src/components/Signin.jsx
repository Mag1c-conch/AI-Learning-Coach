import React, { useState } from 'react';
import {
  Box, Button, TextField, Typography, Radio, RadioGroup,
  FormControlLabel, Link, Paper,
} from "@mui/material";
import signinImage from "./signin.jpg";
// store user input in real time
const Signin = ({ setToken }) => {
  const [userType, setUserType] = useState('student') // User Identity 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Box display="flex" minHeight="100vh" justifyContent="center" alignItems="center" bgcolor="#f5f5f5">
      <Paper elevation={3} sx={{ display: "flex", width: 800, borderRadius: 2 }}>
        <Box flex={1} p={4}>
          <Typography variant="h4" mb={3} >Sign In</Typography>
          <Typography variant="subtitle1">User</Typography>
          <RadioGroup row value={userType} onChange={(e) => setUserType(e.target.value)}>
            <FormControlLabel 
              value="student" 
              control={<Radio color="#142E4F"/>} 
              label="Student" />
            <FormControlLabel 
              value="admin" 
              control={<Radio color="#142E4F"/>} 
              label="Admin" />
          </RadioGroup>
          <TextField 
            label="User Name" 
            placeholder="example@ad.unsw.edu.au" 
            variant="outlined" margin="normal" 
            fullWidth 
            onChange={(e) => {
              setEmail(e.target.value);
              // console.log('Email:', email);
            }}
            />
          <TextField 
            label="Password" 
            type="password" 
            variant="outlined" 
            margin="normal" 
            fullWidth 
            onChange={(e) => setPassword(e.target.value)}
            />
          <Box 
            textAlign="left" 
            mb={2}>
            <Link href="#" underline="always" sx={{color: "#6F6C6C"}}>Forgot password?</Link>
            </Box>
          <Button variant="contained" fullWidth sx={{backgroundColor:"#142E4F"}}><Link href="/Dashboard" sx={{color: "#ffffffff"}}>Sign In</Link></Button>
          <Typography variant="body2" mt={2}>Don’t have an account? <Link href="#" underline="always" sx={{color: "#6F6C6C"}}>Sign Up</Link></Typography>
        </Box>
        <Box flex={1}>
          <img src={signinImage} alt="picture" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Box>
      </Paper>
    </Box>
  );
};

export default Signin;
