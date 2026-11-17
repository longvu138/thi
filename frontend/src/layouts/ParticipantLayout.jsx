import { Suspense } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Button, Space } from 'antd';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { APP_NAME, APP_DESCRIPTION } from '../constants/app';
import { isTakingAttempt } from './participantLayoutRules';
import '../pages/auth/participant-entry.css';
import './participant-layout.css';
export const ParticipantLayout=({currentUser=null,onLogout,themeMode})=>{
 const {pathname}=useLocation();const taking=isTakingAttempt(pathname);
 const brand=<><span><strong>{APP_NAME}</strong><small>{APP_DESCRIPTION}</small></span></>;
 return <div className="participant-portal participant-session">
  <header className="participant-portal-header"><div className="participant-portal-header-inner">
   {taking?<div className="participant-brand">{brand}</div>:<Link to="/exam-rounds" className="participant-brand" aria-label={`${APP_NAME} - Trang chủ`}>{brand}</Link>}
   <div className="participant-session-account"><UserOutlined/><span>{currentUser?.fullName||'Người dự thi'}</span>{!taking&&<Button type="text" icon={<LogoutOutlined/>} onClick={onLogout} aria-label="Đổi người dự thi">Đổi người dự thi</Button>}</div>
  </div></header>
  {!taking&&<nav className="participant-session-nav" aria-label="Cổng dự thi"><NavLink to="/exam-rounds">Đợt kiểm tra</NavLink><NavLink to="/my-results">Kết quả của tôi</NavLink></nav>}
  <main className={`participant-session-main${taking?' is-taking':''}`}><Suspense fallback={<div className="page-loading-fallback">Đang tải…</div>}><Outlet context={{currentUser,themeMode}}/></Suspense></main>
  <footer className="participant-portal-footer"><Space wrap><strong>{APP_NAME}</strong><span>{APP_DESCRIPTION}</span></Space></footer>
 </div>;
};
