import { Card, Typography } from "antd";
import { APP_FULL_NAME } from "../../constants/app";
import { getRoleLabel } from "../../constants/roles";

const { Title, Text } = Typography;

// Trang tạm sau đăng nhập; được thay bằng danh sách đợt kiểm tra (USER) / dashboard (ADMIN) theo docs/PLAN.md.
export const HomePage = ({ currentUser = null }) => (
  <Card>
    <Title level={4} style={{ marginTop: 0 }}>{APP_FULL_NAME}</Title>
    <Text type="secondary">
      Xin chào {currentUser?.fullName || currentUser?.username || ""} ({getRoleLabel(currentUser?.role)}).
    </Text>
  </Card>
);
