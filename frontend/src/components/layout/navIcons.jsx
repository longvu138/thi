import { HomeOutlined, TeamOutlined, CalendarOutlined, SolutionOutlined } from "@ant-design/icons";

// Biểu tượng theo key trong NAV_ITEMS (app/navigation.js); dùng chung cho sidebar và bottom nav.
const NAV_ICONS = Object.freeze({
  home: HomeOutlined,
  "admin-rounds": CalendarOutlined,
  "exam-rounds": CalendarOutlined,
  users: TeamOutlined,
  results: SolutionOutlined,
  "admin-receipts": SolutionOutlined,
});

export const NavIcon = ({ navKey, className }) => {
  const Icon = NAV_ICONS[navKey];
  return Icon ? <Icon className={className} /> : null;
};
