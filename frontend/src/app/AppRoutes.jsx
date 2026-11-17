import { lazy } from "react";
import { Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import {loginRedirectFor} from "../utils/authRouting";
import { getDefaultAuthenticatedPath } from "./navigation";

// Layout cũng tải lười để trang đăng nhập không phải tải sidebar và các component AntD của khung ứng dụng.
const AppLayout = lazy(() => import("../layouts/AppLayout").then((module) => ({ default: module.AppLayout })));
const AdminLoginPage = lazy(() => import("../pages/auth/AdminLoginPage").then(module => ({default:module.AdminLoginPage})));
const LoginPage = lazy(() => import("../pages/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const AdminRoundsWorkspace=lazy(()=>import("../pages/exam-rounds/AdminRoundsWorkspace").then(module=>({default:module.AdminRoundsWorkspace})));
const LegacyAdminRedirect=lazy(()=>import("../pages/exam-rounds/AdminRoundsWorkspace").then(module=>({default:module.LegacyAdminRedirect})));
const MyResultsPage = lazy(() => import("../pages/results/MyResultsPage").then(module => ({default:module.MyResultsPage})));
const AttemptResultPage = lazy(() => import("../pages/results/AttemptResultPage").then(module => ({default:module.AttemptResultPage})));
const AttemptPage = lazy(() => import("../pages/attempts/AttemptPage").then(module => ({default:module.AttemptPage})));
const ExamRoundsPage = lazy(() => import("../pages/exam-rounds/ExamRoundsPage").then(module => ({default:module.ExamRoundsPage})));
const ExamRoundDetailPage = lazy(() => import("../pages/exam-rounds/ExamRoundDetailPage").then(module => ({default:module.ExamRoundDetailPage})));
const UsersPage = lazy(() => import("../pages/users/UsersPage").then(module => ({default:module.UsersPage})));
const LegacyReceiptRedirect=lazy(()=>import("../pages/receipts/ReceiptPage").then(module=>({default:module.LegacyReceiptRedirect})));
const ReceiptPage = lazy(() => import("../pages/receipts/ReceiptPage").then(module=>({default:module.ReceiptPage})));
const HomePage = lazy(() => import("../pages/home/HomePage").then((module) => ({ default: module.HomePage })));

export const AppRoutes = ({
  currentUser,
  handleAuthenticated,
  handleLogout,
  themeMode,
  setThemeMode,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <Routes>
      <Route path="/receipts" element={<ReceiptPage/>}/>
      <Route path="/admin/login" element={currentUser ? <Navigate to={getDefaultAuthenticatedPath(currentUser)} replace/> : <AdminLoginPage onAuthenticated={handleAuthenticated}/>}/>
      <Route
        path="/"
        element={currentUser?.role === "ADMIN"
          ? <Navigate to={getDefaultAuthenticatedPath(currentUser)} replace />
          : <LoginPage onAuthenticated={handleAuthenticated} />}
      />
      <Route
        element={!currentUser
          ? <Navigate to={loginRedirectFor(location.pathname)} replace />
          : (
            <AppLayout
              currentUser={currentUser}
              onLogin={() => navigate("/")}
              onLogout={handleLogout}
              themeMode={themeMode}
              onToggleTheme={() => setThemeMode((current) => current === "dark" ? "light" : "dark")}
            />
          )}
      >
        <Route path="admin/exam-rounds/:id/reports" element={currentUser?.role === "ADMIN" ? <LegacyAdminRedirect kind="reports"/> : <Navigate to="/exam-rounds" replace/>}/>
        <Route path="admin/exam-rounds/:id?" element={currentUser?.role === "ADMIN" ? <AdminRoundsWorkspace/> : <Navigate to="/home" replace/>}/>
        <Route path="my-results" element={currentUser?.role === "USER" ? <MyResultsPage/> : <Navigate to="/home" replace/>}/>
        <Route path="attempts/:id/receipt" element={currentUser?.role === "USER" ? <LegacyReceiptRedirect/> : <Navigate to="/home" replace/>}/>
        <Route path="attempts/:id/result" element={currentUser?.role === "USER" ? <AttemptResultPage/> : <Navigate to="/home" replace/>}/>
        <Route path="attempts/:id" element={currentUser?.role === "USER" ? <AttemptPage/> : <Navigate to="/home" replace/>}/>
        <Route path="exam-rounds" element={<ExamRoundsPage/>}/>
        <Route path="exam-rounds/:id" element={<ExamRoundDetailPage/>}/>
        <Route path="admin/receipts" element={currentUser?.role === "ADMIN" ? <LegacyAdminRedirect kind="receipts"/> : <Navigate to="/" replace/>}/>
        <Route path="admin/receipts/:id" element={currentUser?.role === "ADMIN" ? <LegacyAdminRedirect kind="receipt"/> : <Navigate to="/" replace/>}/>
        <Route path="admin/users" element={currentUser?.role === "ADMIN" ? <UsersPage currentUser={currentUser}/> : <Navigate to="/home" replace/>}/>
        <Route path="home" element={currentUser?.role === "ADMIN" ? <Navigate to="/admin/exam-rounds" replace/> : <HomePage currentUser={currentUser} />} />
        <Route path="*" element={<Navigate to={getDefaultAuthenticatedPath(currentUser)} replace />} />
      </Route>
    </Routes>
  );
};
