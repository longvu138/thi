import { ParticipantLayout } from "./ParticipantLayout";
import { usesParticipantLayout } from "./participantLayoutRules";
import { useIsMobile } from "../hooks/useMediaQuery";
import { DesktopAppLayout } from "./DesktopAppLayout";
import { MobileAppLayout } from "./MobileAppLayout";

export const AppLayout = ({
  currentUser,
  onLogin,
  onLogout,
  themeMode,
  onToggleTheme,
}) => {
  // Đọc matchMedia đồng bộ ngay lần render đầu để không mount cây mobile rồi lại đổi sang desktop.
  const isMobile = useIsMobile();
  const layoutProps = { currentUser, onLogin, onLogout, themeMode, onToggleTheme };

  if (usesParticipantLayout(currentUser)) return <ParticipantLayout {...layoutProps} />;

  if (isMobile) {
    return <MobileAppLayout {...layoutProps} />;
  }

  return <DesktopAppLayout {...layoutProps} />;
};
