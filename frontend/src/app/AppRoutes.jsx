import { lazy } from "react";
import { Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import {participantReturnPath,loginRedirectFor} from "../utils/authRouting";
import { getDefaultAuthenticatedPath } from "./navigation";

// Layout cũng tải lười để trang đăng nhập không phải tải sidebar và các component AntD của khung ứng dụng.
const AppLayout = lazy(() => import("../layouts/AppLayout").then((module) => ({ default: module.AppLayout })));
const AdminLoginPage = lazy(() => import("../pages/auth/AdminLoginPage").then(module => ({default:module.AdminLoginPage})));
const LoginPage = lazy(() => import("../pages/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const RoundReportPage = lazy(() => import("../pages/reports/RoundReportPage").then(module => ({default:module.RoundReportPage})));
const MyResultsPage = lazy(() => import("../pages/results/MyResultsPage").then(module => ({default:module.MyResultsPage})));
const AttemptResultPage = lazy(() => import("../pages/results/AttemptResultPage").then(module => ({default:module.AttemptResultPage})));
const AttemptPage = lazy(() => import("../pages/attempts/AttemptPage").then(module => ({default:module.AttemptPage})));
const ExamRoundsPage = lazy(() => import("../pages/exam-rounds/ExamRoundsPage").then(module => ({default:module.ExamRoundsPage})));
const ExamRoundDetailPage = lazy(() => import("../pages/exam-rounds/ExamRoundDetailPage").then(module => ({default:module.ExamRoundDetailPage})));
const UsersPage = lazy(() => import("../pages/users/UsersPage").then(module => ({default:module.UsersPage})));
const ReceiptPage = lazy(() => import("../pages/receipts/ReceiptPage").then(module=>({default:module.ReceiptPage})));
const GuidePage = lazy(() => import("../pages/guide/GuidePage").then(module=>({default:module.GuidePage})));
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
      <Route path="/guide" element={<GuidePage/>}/>
      <Route path="/receipts" element={<ReceiptPage/>}/>
      <Route path="/admin/login" element={currentUser ? <Navigate to={getDefaultAuthenticatedPath(currentUser)} replace/> : <AdminLoginPage onAuthenticated={handleAuthenticated}/>}/>
      <Route
        path="/login"
        element={currentUser
          ? <Navigate to={(currentUser?.role === "USER" && participantReturnPath(location.search)) || getDefaultAuthenticatedPath(currentUser)} replace />
          : <LoginPage onAuthenticated={handleAuthenticated} />}
      />
      <Route
        element={!currentUser
          ? <Navigate to={loginRedirectFor(location.pathname)} replace />
          : (
            <AppLayout
              currentUser={currentUser}
              onLogin={() => navigate("/login")}
              onLogout={handleLogout}
              themeMode={themeMode}
              onToggleTheme={() => setThemeMode((current) => current === "dark" ? "light" : "dark")}
            />
          )}
      >
        <Route path="admin/exam-rounds/:id/reports" element={currentUser?.role === "ADMIN" ? <RoundReportPage/> : <Navigate to="/exam-rounds" replace/>}/>
        <Route path="admin/exam-rounds" element={currentUser?.role === "ADMIN" ? <ExamRoundsPage admin/> : <Navigate to="/home" replace/>}/>
        <Route path="admin/exam-rounds/:id" element={currentUser?.role === "ADMIN" ? <ExamRoundDetailPage admin/> : <Navigate to="/home" replace/>}/>
        <Route path="my-results" element={currentUser?.role === "USER" ? <MyResultsPage/> : <Navigate to="/home" replace/>}/>
        <Route path="attempts/:id/receipt" element={currentUser?.role === "USER" ? <ReceiptPage/> : <Navigate to="/home" replace/>}/>
        <Route path="attempts/:id/result" element={currentUser?.role === "USER" ? <AttemptResultPage/> : <Navigate to="/home" replace/>}/>
        <Route path="attempts/:id" element={currentUser?.role === "USER" ? <AttemptPage/> : <Navigate to="/home" replace/>}/>
        <Route path="exam-rounds" element={<ExamRoundsPage/>}/>
        <Route path="exam-rounds/:id" element={<ExamRoundDetailPage/>}/>
        <Route path="admin/guide" element={currentUser?.role === "ADMIN" ? <GuidePage admin/> : <Navigate to="/guide" replace/>}/>
        <Route path="admin/users" element={currentUser?.role === "ADMIN" ? <UsersPage currentUser={currentUser}/> : <Navigate to="/home" replace/>}/>
        <Route path="home" element={currentUser?.role === "ADMIN" ? <Navigate to="/admin/exam-rounds" replace/> : <HomePage currentUser={currentUser} />} />
        <Route path="*" element={<Navigate to={getDefaultAuthenticatedPath(currentUser)} replace />} />
      </Route>
    </Routes>
  );
};
