import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import DeleteIcon from '@mui/icons-material/Delete';
import { Button } from '@mui/material';
import { authFetch, API_BASE } from '../../../api/http';
const DEFAULT_GREETING = {
  role: 'model',
  content:
    "Hello! I'm your AI teaching assistant. I can help you answer course-related questions, assist in creating teaching plans, analyze student progress, and more. How can I help you today?",
};

export default function AiAssistance() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([DEFAULT_GREETING]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [conversationTitle, setConversationTitle] = useState('AI Teaching Assistant');

  const userInfo = useMemo(() => {
    try {
      const token =
        window.sessionStorage.getItem('token') || window.localStorage.getItem('token');
      if (!token) return null;
      return JSON.parse(token);
    } catch (err) {
      console.error('Error parsing user token', err);
      return null;
    }
  }, []);

  const userId = userInfo?.id;
  const displayName = userInfo?.first_name || userInfo?.username || 'Teacher';
  const conversationStorageKey = useMemo(
    () => (userId ? `ai_conversation_${userId}` : null),
    [userId]
  );

  const mapMessages = (history = []) => {
    if (!Array.isArray(history) || history.length === 0) {
      return [DEFAULT_GREETING];
    }
    return history.map((entry) => ({
      role: entry.role === 'user' ? 'user' : 'model',
      content: entry.content ?? '',
    }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initializeConversation = async () => {
      if (!userId) {
        setInitialLoading(false);
        return;
      }

      let resolvedConversationId = null;

      const loadHistory = async (id) => {
        const resp = await authFetch(
          `${API_BASE}/assistant/conversations/${id}?user_id=${userId}`
        );
        if (!resp.ok) {
          return null;
        }
        const data = await resp.json();
        return data;
      };

      if (conversationStorageKey) {
        const storedId = localStorage.getItem(conversationStorageKey);
        if (storedId) {
          const data = await loadHistory(storedId).catch(() => null);
          if (data) {
            resolvedConversationId = data.id;
            setMessages(mapMessages(data.messages));
            setConversationTitle(data.title || 'AI Teaching Assistant');
          } else {
            localStorage.removeItem(conversationStorageKey);
          }
        }
      }

      if (!resolvedConversationId) {
        const params = new URLSearchParams({
          user_id: String(userId),
          limit: '1',
          include_messages: 'true',
          message_limit: '200',
        });
        const resp = await authFetch(
          `${API_BASE}/assistant/conversations?${params.toString()}`
        ).catch(() => null);
        if (resp?.ok) {
          const data = await resp.json();
          if (Array.isArray(data) && data.length > 0) {
            const conversation = data[0];
            resolvedConversationId = conversation.id;
            setMessages(mapMessages(conversation.messages));
            setConversationTitle(conversation.title || 'AI Teaching Assistant');
            if (conversationStorageKey) {
              localStorage.setItem(conversationStorageKey, String(conversation.id));
            }
          }
        }
      }

      if (!resolvedConversationId) {
        setMessages([DEFAULT_GREETING]);
        setConversationTitle('AI Teaching Assistant');
      }

      setConversationId(resolvedConversationId);
      setInitialLoading(false);
    };

    initializeConversation();
  }, [userId, conversationStorageKey]);

  const handleSend = async () => {
    if (!inputValue.trim() || loading || initialLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);

    const optimistic = [...messages, { role: 'user', content: userMessage }];
    setMessages(optimistic);
    setLoading(true);

    try {
      const systemPrompt = `You are a professional AI teaching assistant, primarily helping teachers with:
1. Answering course content and teaching-related questions
2. Assisting in creating teaching plans and course schedules
3. Analyzing student progress and learning situations
4. Providing teaching suggestions and best practices
5. Assisting in managing course resources and assignments

Please answer teachers' questions in a professional, friendly, and clear manner.`;

      const payload = {
        conversation_id: conversationId,
        user_id: userId,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
        system_prompt: systemPrompt,
      };

      if (!conversationId) {
        const generatedTitle = userMessage.slice(0, 80);
        payload.conversation_title = generatedTitle;
        setConversationTitle(generatedTitle || 'AI Teaching Assistant');
      }

      const res = await authFetch(`${API_BASE}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          `HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ''}`
        );
      }

      const data = await res.json();
      const returnedId = data?.conversation_id;
      if (returnedId && returnedId !== conversationId) {
        setConversationId(returnedId);
        if (conversationStorageKey) {
          localStorage.setItem(conversationStorageKey, String(returnedId));
        }
      }

      const history = mapMessages(data?.messages);
      setMessages(history);
      if (data?.title) {
        setConversationTitle(data.title);
      }
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

  const handleClearChat = async () => {
    if (!window.confirm('Clear all chat history? This action cannot be undone.')) {
      return;
    }

    try {
      if (conversationId && userId) {
        await authFetch(
          `${API_BASE}/assistant/conversations/${conversationId}?user_id=${userId}`,
          { method: 'DELETE' }
        );
        if (conversationStorageKey) {
          localStorage.removeItem(conversationStorageKey);
        }
      }
      setConversationId(null);
      setMessages([DEFAULT_GREETING]);
      setConversationTitle('AI Teaching Assistant');
      setInputValue('');
      setError(null);
    } catch (err) {
      console.error('Failed to clear chat:', err);
      setError('Failed to clear chat history');
    }
  };

  const formatMessage = (content) => {
    const safe = typeof content === 'string' ? content : String(content ?? '');
    return safe
      .split('\n\n')
      .map((paragraph, idx) => (
        <Typography key={idx} sx={{ mb: idx === 0 ? 0 : 1.5, lineHeight: 1.6 }}>
          {paragraph}
        </Typography>
      ));
  };

  if (initialLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        minHeight: '100vh',
        bgcolor: '#f4f6f8',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: 'min(960px, 100%)',
          backgroundColor: '#fff',
          borderRadius: '16px',
          boxShadow: '0 12px 40px rgba(15, 30, 60, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(15,23,42,0.08)',
        }}
      >
        <Box
          sx={{
            p: 3,
            borderBottom: '1px solid rgba(15,23,42,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: 'linear-gradient(90deg, #1a237e 0%, #3949ab 100%)',
            color: '#fff',
          }}
        >
          <Avatar sx={{ bgcolor: '#ffffff22', width: 48, height: 48 }}>
            <SmartToyIcon sx={{ color: '#fff' }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              AI Teaching Assistant
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Providing teaching support and course management advice.
            </Typography>
            {conversationTitle && conversationTitle !== 'AI Teaching Assistant' && (
              <Typography variant="caption" sx={{ opacity: 0.75 }}>
                Current conversation:&nbsp;{conversationTitle}
              </Typography>
            )}
          </Box>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<DeleteIcon />}
            onClick={handleClearChat}
            disabled={!conversationId || loading}
            sx={{
              borderColor: 'rgba(255,255,255,0.3)',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.6)',
                bgcolor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            Clear Chat
          </Button>
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 3,
            background: 'linear-gradient(180deg, #fafafa 0%, #fff 100%)',
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {messages.map((message, index) => (
            <Box
              key={`${index}-${message.role}`}
              sx={{
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                gap: 2,
                mb: 2.5,
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
                    {message.role === 'user' ? displayName : 'AI Assistant'}
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
                  {formatMessage(message.content)}
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


