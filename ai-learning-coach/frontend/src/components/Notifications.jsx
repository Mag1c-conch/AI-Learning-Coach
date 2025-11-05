// src/components/NotificationsBell.jsx
import React, { useEffect } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import SchoolIcon from "@mui/icons-material/School";
import { useSyncExternalStore } from "react";
import http from "../api/http";

// ========== 小工具 ==========
function getCurrentUserId() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const u = JSON.parse(token);
    return u?.id || u?.user_id || null;
  } catch {
    return null;
  }
}

// ========== 极简全局 Store（单例） ==========
// 使用 useSyncExternalStore 让多个组件共享 & 同步刷新（无需 Provider）
const createStore = () => {
  let state = {
    uid: getCurrentUserId(),
    open: false,
    list: [],
    loading: false,
    pollMs: 60000,
  };
  const subs = new Set();

  const getSnapshot = () => state;
  const subscribe = (cb) => {
    subs.add(cb);
    return () => subs.delete(cb);
  };
  const setState = (patch) => {
    state = { ...state, ...patch };
    subs.forEach((cb) => cb());
  };

  const setOpen = (open) => setState({ open });

  const unreadCount = () => state.list.filter((n) => !n.is_read).length;

  const fetchNotifications = async () => {
    const uid = state.uid;
    if (!uid) {
      setState({ list: [] });
      return;
    }
    setState({ loading: true });
    try {
      const params = new URLSearchParams({
        student_id: String(uid),
        include_related: "true",
      });
      const { data } = await http.get(`/feedback?${params.toString()}`);
      setState({ list: Array.isArray(data) ? data : [] });
      // 可选广播
      window.dispatchEvent(new CustomEvent("feedback:updated", { detail: { notifications: data || [] } }));
    } catch (e) {
      console.error("Failed to load notifications", e?.response?.data || e.message);
    } finally {
      setState({ loading: false });
    }
  };

  const markNotificationRead = async (id) => {
    const uid = state.uid;
    if (!uid) return;
    try {
      await http.patch(`/feedback/${id}/read`, { student_id: uid, is_read: true });
      setState({
        list: state.list.map((n) =>
          n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        ),
      });
    } catch (e) {
      console.error("Failed to mark read", e?.response?.data || e.message);
    }
  };

  const markAllRead = async () => {
    const uid = state.uid;
    if (!uid) return;
    const pending = state.list.filter((n) => !n.is_read);
    for (const n of pending) {
      try {
        await http.patch(`/feedback/${n.id}/read`, { student_id: uid, is_read: true });
      } catch (e) {
        console.error("Failed to mark one read", e?.response?.data || e.message);
      }
    }
    setState({
      list: state.list.map((n) => ({
        ...n,
        is_read: true,
        read_at: n.read_at ?? new Date().toISOString(),
      })),
    });
  };

  // 公开 API
  return {
    subscribe,
    getSnapshot,
    setOpen,
    fetchNotifications,
    markNotificationRead,
    markAllRead,
    unreadCount,
    // 供外界在登录/登出时更新 uid
    setUid: (uid) => setState({ uid }),
    // 允许调整轮询间隔（可选）
    setPollMs: (ms) => setState({ pollMs: ms }),
  };
};

const store = createStore();

// 监听登录事件或 storage 变化，自动更新 uid & 刷新
(function initGlobalListeners() {
  const updateUid = () => store.setUid(getCurrentUserId());
  window.addEventListener("login:success", updateUid);
  window.addEventListener("storage", (e) => {
    if (e.key === "token") updateUid();
  });
})();

// ========== 组件：任何页面直接用就能同步 ==========
export default function NotificationsBell() {
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const { open, list, loading, pollMs } = snap;

  // 初次拉取 + 轮询
  useEffect(() => {
    store.fetchNotifications();
    const id = window.setInterval(store.fetchNotifications, pollMs);
    return () => window.clearInterval(id);
  }, [pollMs]);

  const unread = store.unreadCount();

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={() => store.setOpen(true)}>
          <Badge badgeContent={unread} color="error" overlap="circular">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={() => store.setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Feedback Notifications</DialogTitle>
        <DialogContent dividers>
          {loading ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 1 }}>Loading…</Typography>
            </Box>
          ) : !list.length ? (
            <Typography variant="body2">No notifications.</Typography>
          ) : (
            <List dense>
              {list.map((n) => {
                const courseLabel =
                  n.course?.code || n.course?.name || (n.course_id ? `Course #${n.course_id}` : "Course");
                const isUnread = !n.is_read;
                return (
                  <ListItemButton
                    key={n.id}
                    alignItems="flex-start"
                    onClick={() => {
                      if (isUnread) store.markNotificationRead(n.id);
                    }}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      bgcolor: isUnread ? "action.hover" : "transparent",
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar>
                        {n.assignment_id ? <AssignmentTurnedInIcon /> : <SchoolIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {n.title || "New feedback"}
                          </Typography>
                          {isUnread && <Chip size="small" color="error" label="NEW" />}
                          {courseLabel && <Chip size="small" variant="outlined" label={courseLabel} sx={{ ml: 0.5 }} />}
                          {n.assignment?.title && <Chip size="small" variant="outlined" label={n.assignment.title} />}
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                            {n.content}
                          </Typography>
                          {n.created_at && (
                            <Typography variant="caption" color="text.secondary">
                              {new Date(n.created_at).toLocaleString()}
                            </Typography>
                          )}
                        </>
                      }
                    />
                    {!n.is_read && (
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          store.markNotificationRead(n.id);
                        }}
                      >
                        Mark read
                      </Button>
                    )}
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => store.markAllRead()} disabled={!unread}>
            Mark all as read
          </Button>
          <Button variant="contained" onClick={() => store.setOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
