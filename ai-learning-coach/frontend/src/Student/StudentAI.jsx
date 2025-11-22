import React, { useEffect, useMemo, useRef, useState } from "react";
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
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import Sidebar from "../components/Sidebar.jsx";
import CircleIcon from "@mui/icons-material/Circle";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { authFetch, API_BASE } from "../api/http";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button } from "@mui/material";

const DEFAULT_GREETING = {
  role: "model",
  content:
    "Hello! I'm your AI teaching assistant. I can help you answer course-related questions, assist in Course-related Q&A and Practice-question generation, and more. How can I help you today?",
};

// guards non-string input
function autoFormatQA(raw) {
  if (typeof raw !== "string") return raw;
  let t = raw;
  // Puts question numbers like 1. at the start of a new paragraph
  t = t.replace(/\s*(\d+)\.\s+/g, "\n\n$1. ");
  // Forces choices A)onto their own lines as markdown list items
  t = t.replace(/\s([A-D])\)\s+/g, "\n- $1) ");
  // Moves Answer: to a new line and bolds the label
  t = t.replace(/\s*Answer:\s*/gi, "\n**Answer:** ");

  return t.trim();
}

export default function AiAssistance() {
  const [conversationId, setConversationId] = useState(null); // current chat
  const [messages, setMessages] = useState([DEFAULT_GREETING]); // chat history
  const [inputValue, setInputValue] = useState(""); // current input
  const [loading, setLoading] = useState(false); // waiting for response
  const [initialLoading, setInitialLoading] = useState(true); // loading history
  const [error, setError] = useState(null); // error message
  const messagesEndRef = useRef(null); // for scrolling
  const inputRef = useRef(null); // input field ref
  const [conversationTitle, setConversationTitle] = useState(
    "AI Teaching Assistant"
  );

  const userInfo = useMemo(() => {
    try {
      const token =
        window.sessionStorage.getItem("token") ||
        window.localStorage.getItem("token");
      if (!token) return null;
      return JSON.parse(token);
    } catch (err) {
      console.error("Error parsing user token", err);
      return null;
    }
  }, []);

  const userId = userInfo?.id;
  const displayName = userInfo?.first_name || userInfo?.username || "Student";
  const conversationStorageKey = useMemo(
    () => (userId ? `ai_conversation_${userId}` : null),
    [userId]
  );

  const mapMessages = (history = []) => {
    if (!Array.isArray(history) || history.length === 0) {
      return [DEFAULT_GREETING];
    }
    return history.map((entry) => ({
      role: entry.role === "user" ? "user" : "model",
      content: entry.content ?? "",
    }));
  };

  const handleClearChat = async () => {
    if (!window.confirm("Are you sure you want to clear all history?")) {
      return;
    }

    try {
      if (conversationId && userId) {
        await authFetch(
          `${API_BASE}/assistant/conversations/${conversationId}?user_id=${userId}`,
          { method: "DELETE" }
        );
        if (conversationStorageKey) {
          localStorage.removeItem(conversationStorageKey);
        }
      }
      setConversationId(null);
      setMessages([DEFAULT_GREETING]);
      setConversationTitle("AI Teaching Assistant");
      setInputValue("");
      setError(null);
    } catch (err) {
      console.error("Failed to clear chat:", err);
      setError("Failed to clear chat history");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]); // auto-scroll to the latest one

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
        if (!resp.ok) return null;
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
            setConversationTitle(data.title || "AI Teaching Assistant");
          } else {
            localStorage.removeItem(conversationStorageKey);
          }
        }
      }

      if (!resolvedConversationId) {
        const params = new URLSearchParams({
          // build query params
          user_id: String(userId),
          limit: "1",
          include_messages: "true",
          message_limit: "200",
        });
        const resp = await authFetch(
          // fetch user conversations
          `${API_BASE}/assistant/conversations?${params.toString()}`
        ).catch(() => null);
        if (resp?.ok) {
          // if request ok, parse Json
          const data = await resp.json();
          if (Array.isArray(data) && data.length > 0) {
            const conversation = data[0]; // take the first one
            resolvedConversationId = conversation.id; // Save its id as the resolvedConversationId
            setMessages(mapMessages(conversation.messages)); // Put its messages into state (mapping them to your UI schema)
            setConversationTitle(conversation.title || "AI Teaching Assistant"); // Set the title
            if (conversationStorageKey) {
              // Persist id to localStorage if you have a key defined
              localStorage.setItem(
                conversationStorageKey,
                String(conversation.id)
              );
            }
          }
        }
      }

      if (!resolvedConversationId) {
        setMessages([DEFAULT_GREETING]);
        setConversationTitle("AI Teaching Assistant");
      }

      setConversationId(resolvedConversationId);
      setInitialLoading(false);
    };

    initializeConversation();
  }, [userId, conversationStorageKey]);

  const handleSend = async () => {
    if (!inputValue.trim() || loading || initialLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setError(null);

    const optimistic = [...messages, { role: "user", content: userMessage }];
    setMessages(optimistic);
    setLoading(true);

    try {
      const systemPrompt = `You are a professional AI teaching assistant.

Always answer in **GitHub Flavored Markdown (GFM)** with clear line breaks:
- Start with a short heading when helpful.
- Use numbered lists for questions (each question on its own line).
- For options, put each on a new line with "- A) ...", "- B) ...", etc.
- Put the final answer on a separate line as **Answer:** <letter>.
- Use fenced code blocks for code (e.g., \`\`\`python ... \`\`\`).
- Keep explanations concise and well-structured.
`;

      const payload = {
        conversation_id: conversationId,
        user_id: userId,
        messages: [{ role: "user", content: userMessage }],
        system_prompt: systemPrompt, // send to backend
      };

      if (!conversationId) {
        const generatedTitle = userMessage.slice(0, 80); // take first 80 chars
        payload.conversation_title = generatedTitle; // send to backend to save
        setConversationTitle(generatedTitle || "AI Teaching Assistant"); // optimistic title
      }

      const res = await authFetch(`${API_BASE}/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`
        );
      }

      const data = await res.json(); // parses the server response
      const returnedId = data?.conversation_id;
      if (returnedId && returnedId !== conversationId) {
        setConversationId(returnedId);
        if (conversationStorageKey) {
          localStorage.setItem(conversationStorageKey, String(returnedId));
        }
      }

      const history = mapMessages(data?.messages);
      setMessages(history);
      if (data?.title) setConversationTitle(data.title);
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Error sending message");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // stop newline
      handleSend(); // send message
    }
  };

  const formatMessage = (content) => {
    const raw =
      typeof content === "string"
        ? content
        : "```json\n" + JSON.stringify(content ?? "", null, 2) + "\n```";

    const text = autoFormatQA(raw);

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]} // support GFM syntax
        rehypePlugins={[rehypeHighlight]} // syntax highlighting
        components={{
          p: ({ node, ...props }) => (
            <Typography
              sx={{ lineHeight: 1.8, mb: 1.2, whiteSpace: "pre-wrap" }}
              {...props}
            />
          ),
          li: ({ node, ...props }) => (
            <li style={{ marginBottom: 6 }} {...props} />
          ),
          code: ({ inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code
                  style={{
                    background: "rgba(2,122,255,.08)",
                    padding: "2px 6px",
                    borderRadius: 6,
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre
                style={{
                  padding: 12,
                  borderRadius: 10,
                  overflowX: "auto",
                  border: "1px solid rgba(0,0,0,0.06)",
                  background: "#fafafa",
                  margin: 0,
                }}
              >
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          h1: ({ node, ...props }) => (
            <Typography variant="h5" sx={{ mt: 2, mb: 1 }} {...props} />
          ),
          h2: ({ node, ...props }) => (
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }} {...props} />
          ),
          table: ({ node, ...props }) => (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{ borderCollapse: "collapse", width: "100%" }}
                {...props}
              />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th
              style={{
                borderBottom: "1px solid #e0e0e0",
                textAlign: "left",
                padding: 8,
              }}
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}
              {...props}
            />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };

  if (initialLoading) {
    return (
      <Box sx={{ display: "flex", height: "100vh" }}>
        <Sidebar />
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <Box
        sx={{
          flex: 1,
          bgcolor: "#f5f6fa",
          p: 3,
          overflowY: "auto",
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 63,
            left: 0,
            width: "100%",
            height: 2,
            backgroundColor: "rgba(21,19,19,0.3)",
          }}
        />

        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mt: -2,
              mb: 1,
              justifyContent: "space-between",
            }}
          >
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, whiteSpace: "nowrap" }}
            >
              AI Assistant
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircleIcon sx={{ fontSize: 10, ml: "35%", color: "#B3B3B3" }} />
              <Typography variant="h6" sx={{ color: "#7a7a7a" }}>
                Student
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            minHeight: "calc(100vh - 120px)",
          }}
        >
          <Box
            sx={{
              width: "min(960px, 100%)",
              backgroundColor: "#fff",
              borderRadius: "16px",
              boxShadow: "0 12px 40px rgba(15, 30, 60, 0.12)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            {/* Header */}
            <Box
              sx={{
                p: 3,
                borderBottom: "1px solid rgba(15,23,42,0.08)",
                display: "flex",
                alignItems: "center",
                gap: 2,
                background: "linear-gradient(90deg, #1a237e 0%, #3949ab 100%)",
                color: "#fff",
              }}
            >
              <Avatar sx={{ bgcolor: "#ffffff22", width: 48, height: 48 }}>
                <SmartToyIcon sx={{ color: "#fff" }} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  AI Teaching Assistant
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Providing Course-related Q&A and Practice-question generation.
                </Typography>
                {conversationTitle &&
                  conversationTitle !== "AI Teaching Assistant" && (
                    <Typography variant="caption" sx={{ opacity: 0.75 }}>
                      Current conversation:&nbsp;{conversationTitle}
                    </Typography>
                  )}
              </Box>
              <Button
                variant="outlined" color="inherit" startIcon={<DeleteIcon />}
                onClick={handleClearChat}
                disabled={!conversationId || loading}
                sx=
                {{
                  marginLeft: "auto",
                  borderColor: "rgba(255,255,255,0.3)",
                  "&:hover": {
                    borderColor: "rgba(255,255,255,0.6)",
                    bgcolor: "rgba(255,255,255,0.1)",
                  },
                }}
                > Clear Chat
              </Button>
            </Box>

            {/* Messages */}
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                p: 3,
                background: "linear-gradient(180deg, #fafafa 0%, #fff 100%)",
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
                    display: "flex",
                    justifyContent:
                      message.role === "user" ? "flex-end" : "flex-start",
                    gap: 2,
                    mb: 2.5,
                  }}
                >
                  {message.role === "model" && (
                    <Avatar sx={{ bgcolor: "#1976d2", width: 40, height: 40 }}>
                      <SmartToyIcon />
                    </Avatar>
                  )}
                  <Box
                    sx={{
                      maxWidth: "70%",
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {message.role === "user" ? displayName : "AI Assistant"}
                      </Typography>
                      <Chip
                        label={message.role === "user" ? "Student" : "AI"}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: "0.65rem",
                          bgcolor:
                            message.role === "user" ? "#e3f2fd" : "#f3e5f5",
                          color:
                            message.role === "user" ? "#1976d2" : "#7b1fa2",
                        }}
                      />
                    </Box>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        bgcolor: message.role === "user" ? "#1976d2" : "#fff",
                        color: message.role === "user" ? "#fff" : "#000",
                        borderRadius: 2,
                        border:
                          message.role === "model"
                            ? "1px solid rgba(0,0,0,0.1)"
                            : "none",
                      }}
                    >
                      {formatMessage(message.content)}
                    </Paper>
                  </Box>
                  {message.role === "user" && (
                    <Avatar sx={{ bgcolor: "#f44336", width: 40, height: 40 }}>
                      <PersonIcon />
                    </Avatar>
                  )}
                </Box>
              ))}

              {loading && (
                <Box
                  sx={{ display: "flex", justifyContent: "flex-start", gap: 2 }}
                >
                  <Avatar sx={{ bgcolor: "#1976d2", width: 40, height: 40 }}>
                    <SmartToyIcon />
                  </Avatar>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: "#fff",
                      borderRadius: 2,
                      border: "1px solid rgba(0,0,0,0.1)",
                      display: "flex",
                      alignItems: "center",
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

            {/* Input */}
            <Box
              sx={{
                p: 2,
                bgcolor: "#fff",
                borderTop: "1px solid rgba(0,0,0,0.1)",
              }}
            >
              <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
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
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: "#f5f5f5",
                      "&:hover": { bgcolor: "#eeeeee" },
                      "&.Mui-focused": { bgcolor: "#fff" },
                    },
                  }}
                />
                <IconButton
                  color="primary"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || loading}
                  sx={{
                    bgcolor: "#1976d2",
                    color: "#fff",
                    width: 48,
                    height: 48,
                    "&:hover": { bgcolor: "#1565c0" },
                    "&:disabled": { bgcolor: "#e0e0e0", color: "#9e9e9e" },
                  }}
                >
                  <SendIcon />
                </IconButton>
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                Press Enter to send, Shift + Enter for new line
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
