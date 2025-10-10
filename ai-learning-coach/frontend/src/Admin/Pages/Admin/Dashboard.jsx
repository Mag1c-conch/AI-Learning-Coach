// src/pages/admin/Dashboard.jsx
import React, { useState } from 'react';
import { Button, Modal, Progress, Flex, Space } from 'antd';


export default function Dashboard() {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState(null); // 'add' | 'del'

  const showModal = (type) => {
    setAction(type);
    setOpen(true);
  };

  const handleOk = () => {
    // TODO: 
    setOpen(false);
  };

  const handleCancel = () => setOpen(false);

  return (
    <div>
      <h2>Admin Dashboard</h2>

      <Space size="middle" style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => showModal('add')}>
          Add Course
        </Button>
        <Button danger onClick={() => showModal('del')}>
          Del
        </Button>
      </Space>

      <Modal
        open={open}
        title={action === 'add' ? 'Add Course' : 'Delete Course'}
        onOk={handleOk}
        onCancel={handleCancel}
        okText={action === 'add' ? 'Add' : 'Delete'}
        okButtonProps={{ danger: action === 'del' }}
      >
        {action === 'add' ? (
          <p>确认要新增一门课程吗？</p>
        ) : (
          <p>确认要删除选中的课程吗？该操作不可撤回。</p>
        )}
      </Modal>

      <div style={{ marginTop: 24 }}>
        <Flex gap="small" wrap>
          <Progress type="circle" percent={75} />
          <Progress type="circle" percent={70} status="exception" />
          <Progress type="circle" percent={100} />
        </Flex>
      </div>
    </div>
  );
}
