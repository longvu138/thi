import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { formatDocumentTitle, getRouteTitle } from "../../app/navigation";

/** Đặt document.title theo route hiện tại, ví dụ "Trang chủ · Kiểm tra nhận thức". */
export const RouteDocumentTitle = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = formatDocumentTitle(getRouteTitle(pathname));
  }, [pathname]);
  return null;
};
