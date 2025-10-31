import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Avatar,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';

export default function AiAssistance() {
  const [messages, setMessages] = useState([
    {
      role: 'model',
      content:
        "Hello! I'm your AI teaching assistant. I can help you answer course-related questions, assist in creating teaching plans, analyze student progress, and more. How can I help you today?",
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getDisplayName = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const userData = JSON.parse(token);
        return userData.first_name || userData.username || 'Teacher';
      }
    } catch (err) {
      console.error('Error parsing user data:', err);
    }
    return 'Teacher';
  };

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);

    const draft = [
      ...messages,
      { role: 'user', content: userMessage },
    ];
    setMessages(draft);
    setLoading(true);

    try {
      const formattedMessages = draft.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content,
      }));

      const systemPrompt = `You are a professional AI teaching assistant, primarily helping teachers with:
1. Answering course content and teaching-related questions
2. Assisting in creating teaching plans and course schedules
3. Analyzing student progress and learning situations
4. Providing teaching suggestions and best practices
5. Assisting in managing course resources and assignments

Please answer teachers' questions in a professional, friendly, and clear manner.`;

      const res = await fetch('http://localhost:5001/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: formattedMessages,
          system_prompt: systemPrompt,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ''}`);
      }

      const data = await res.json();
      const replyText =
        typeof data?.text === 'string'
          ? data.text
          : typeof data?.reply === 'string'
          ? data.reply
          : null;

      if (!replyText) {
        throw new Error('Invalid response from server');
      }

      setMessages((prev) => [
        ...prev,
        { role: 'model', content: replyText },
      ]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Error sending message');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessage = (content) => {
    const safe = typeof content === 'string' ? content : String(content ?? '');
    const lines = safe.split('\n');
    return lines.map((line, idx) => (
      <React.Fragment key={idx}>
        {line}
        {idx < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        bgcolor: '#f5f6fa',
        p: 3,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          bgcolor: '#fff',
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            bgcolor: '#fff',
            borderBottom: '1px solid rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Avatar sx={{ bgcolor: '#1976d2' }}>
            <SmartToyIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              AI Teaching Assistant
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Providing teaching support and course management advice
            </Typography>
          </Box>
        </Box>

        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Box>
        )}

        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                gap: 2,
              }}
            >
              {message.role === 'model' && (
                <Avatar sx={{ bgcolor: '#1976d2', width: 40, height: 40 }}>
                  <SmartToyIcon />
                </Avatar>
              )}
              <Box sx={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {message.role === 'user' ? getDisplayName() : 'AI Assistant'}
                  </Typography>
                  <Chip
                    label={message.role === 'user' ? 'Teacher' : 'AI'}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '0.65rem',
                      bgcolor: message.role === 'user' ? '#e3f2fd' : '#f3e5f5',
                      color: message.role === 'user' ? '#1976d2' : '#7b1fa2',
                    }}
                  />
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: message.role === 'user' ? '#1976d2' : '#fff',
                    color: message.role === 'user' ? '#fff' : '#000',
                    borderRadius: 2,
                    border: message.role === 'model' ? '1px solid rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}
                  >
                    {formatMessage(message.content ?? '')}
                  </Typography>
                </Paper>
              </Box>
              {message.role === 'user' && (
                <Avatar sx={{ bgcolor: '#f44336', width: 40, height: 40 }}>
                  <PersonIcon />
                </Avatar>
              )}
            </Box>
          ))}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#1976d2', width: 40, height: 40 }}>
                <SmartToyIcon />
              </Avatar>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: '#fff',
                  borderRadius: 2,
                  border: '1px solid rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  AI is thinking...
                </Typography>
              </Paper>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        <Box sx={{ p: 2, bgcolor: '#fff', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            <TextField
              ref={inputRef}
              fullWidth
              multiline
              maxRows={4}
              variant="outlined"
              placeholder="Type your question..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}  
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: '#f5f5f5',
                  '&:hover': { bgcolor: '#eeeeee' },
                  '&.Mui-focused': { bgcolor: '#fff' },
                },
              }}
            />
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={!inputValue.trim() || loading}
              sx={{
                bgcolor: '#1976d2',
                color: '#fff',
                width: 48,
                height: 48,
                '&:hover': { bgcolor: '#1565c0' },
                '&:disabled': { bgcolor: '#e0e0e0', color: '#9e9e9e' },
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Press Enter to send, Shift + Enter for new line
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
