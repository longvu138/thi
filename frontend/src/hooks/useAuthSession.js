import {clearAttemptDrafts} from '../utils/attemptStorage';
import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import {participantReturnPath} from "../utils/authRouting";
import { authApi } from "../api/authApi";
import { getDefaultAuthenticatedPath } from "../app/navigation";

// StrictMode chạy effect hai lần ở dev: dùng chung một request /auth/me đang chờ để không gọi (và log 401) hai lần.
let pendingSessionRequest = null;
const loadSession = () => {
  if (!pendingSessionRequest) {
    pendingSessionRequest = authApi.me().finally(() => {
      pendingSessionRequest = null;
    });
  }
  return pendingSessionRequest;
};

/**
 * Phiên đăng nhập của ứng dụng: khởi tạo từ /auth/me, đăng nhập/đăng xuất và xóa cache React Query
 * mỗi khi người dùng thay đổi để không lộ dữ liệu của tài khoản trước.
 */
export const useAuthSession = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadSession()
      .then((response) => {
        if (!active || !response?.user) return;
        setCurrentUser(response.user);
      })
      .catch(() => {
        // httpClient dùng chung đã xử lý điều hướng và thông báo cho 401/403.
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });

    const clearSession = () => {
      clearAttemptDrafts();
      queryClient.clear();
      setCurrentUser(null);
    };
    window.addEventListener("auth-session-cleared", clearSession);
    return () => {
      active = false;
      window.removeEventListener("auth-session-cleared", clearSession);
    };
  }, [queryClient]);

  const refreshCurrentUser = useCallback(async () => {
    const response = await authApi.me();
    if (!response?.user) return null;
    setCurrentUser(response.user);
    return response.user;
  }, []);

  const handleAuthenticated = useCallback((response) => {
    const nextUser = response?.user || null;
    // Xóa toàn bộ cache trước khi gán người dùng mới: không hiển thị dữ liệu của phiên trước dù chỉ một khung hình.
    queryClient.clear();
    if (nextUser) setCurrentUser(nextUser);
    navigate((nextUser?.role === "USER" && participantReturnPath(location.search)) || getDefaultAuthenticatedPath(nextUser));
  }, [navigate, queryClient, location.search]);

  const handleLogout = useCallback(async () => {
    clearAttemptDrafts();
    await authApi.logout().catch(() => {});
    clearAttemptDrafts();
    setCurrentUser(null);
    queryClient.clear();
    navigate(currentUser?.role === "ADMIN" ? "/admin/login" : "/login");
  }, [navigate, queryClient, currentUser?.role]);

  return {
    authReady,
    currentUser,
    refreshCurrentUser,
    handleAuthenticated,
    handleLogout,
  };
};
