import { Modal } from 'antd';

// Giữ header/footer trong viewport; chỉ phần nội dung cuộn trên màn hình thấp.
export const FormModal = ({ open = false, busy = false, width = 960, onCancel, children, ...props }) => (
 <Modal {...props} open={open} width={width} centered forceRender className="app-form-modal"
  style={{ maxWidth: 'calc(100vw - 24px)' }}
  styles={{ container: { display: 'flex', flexDirection: 'column', maxHeight: 'calc(100dvh - 32px)' }, header: { flexShrink: 0 }, body: { overflowY: 'auto', minHeight: 0, paddingRight: 4 }, footer: { flexShrink: 0 } }}
  closable={!busy} keyboard={!busy} maskClosable={!busy} onCancel={() => !busy && onCancel?.()}>
  {children}
 </Modal>
);
