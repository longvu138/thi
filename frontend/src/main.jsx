import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './app/App.jsx'
import { AppErrorBoundary } from './components/common/AppErrorBoundary.jsx'

// Ứng dụng không dùng service worker/PWA. Gỡ service worker và cache cũ còn sót lại trên cùng origin
// (bản trước từng đăng ký /sw.js) để trình duyệt không phục vụ app shell cũ.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch(() => {})
}
if ('caches' in window) {
  caches.keys()
    .then((names) => Promise.all(names.map((name) => caches.delete(name))))
    .catch(() => {})
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})

// Data router hỗ trợ chặn cả Link và Back khi đang làm bài.
const router = createBrowserRouter([{ path: '*', element: <App /> }])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Error Boundary ngoài cùng: lỗi ở provider/router/khởi tạo phiên vẫn có màn hình lỗi thay vì trắng trang. */}
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
