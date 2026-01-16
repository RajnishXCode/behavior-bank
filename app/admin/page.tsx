"use client";

import React, { useEffect, useState } from "react";
import {
  Layout,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Radio, // For selecting + / -
  message,
  Typography,
  Tag,
  Space,
} from "antd";
import {
  LogoutOutlined,
  UserAddOutlined, // Maybe for later
  BankOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
  ThunderboltOutlined, // For "Miracle" +50
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionType, setActionType] = useState<"EARN" | "SPEND" | "BONUS">(
    "EARN"
  );

  const [form] = Form.useForm();
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      // Admin check
      if (res.status === 401 || res.status === 403) {
        router.push("/");
        return;
      }
      const data = await res.json();
      if (data.users) {
        setUsers(data.users.filter((u: any) => u.role === "CHILD"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "DELETE" });
    router.push("/");
  };

  const openLogModal = (user: any) => {
    setSelectedUser(user);
    setModalVisible(true);
    form.resetFields();
    setActionType("EARN"); // Default
  };

  const handleTransaction = async (values: any) => {
    // amount is string from input, convert to number
    const amount = Number(values.amount);

    // Logic:
    // If type is "Good Day" -> Call POST with amount=1, desc="Good Behavior"
    // If type is "Bad Day" -> Call DELETE with amount=1, desc="Bad Behavior"
    // If type is "Bonus" -> Call POST with amount=50, desc="Miracle Bonus"

    // Actually, I'll let the user type custom amount OR select preset.
    // For now, I will follow the "todo.md" rules: +1, -1, +50.

    // But API expects `amount` and `description`.
    // I will construct the payload based on the form values.

    const isDeduct = values.action === "DEDUCT";
    const method = isDeduct ? "DELETE" : "POST";
    const endpoint = "/api/points";

    const payload = {
      userId: selectedUser._id,
      amount: Math.abs(amount), // API expects positive amount
      description: values.description,
      type: isDeduct ? "SPEND" : amount === 50 ? "BONUS" : "EARN",
    };

    try {
      const res = await fetch(endpoint, {
        method: method, // DELETE for deduct, POST for award
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        messageApi.success("Behavior logged successfully");
        setModalVisible(false);
        fetchUsers(); // Refresh list to see updated points (if we showed them)
        // Wait, standard Users API might not show points.
        // But we can update the table if we fetched points separately.
        // For now, simple success message.
      } else {
        messageApi.error(data.error || "Failed");
      }
    } catch (e) {
      messageApi.error("Network Error");
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "status",
      render: (active: boolean) =>
        active ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>,
    },
    {
      title: "Actions",
      key: "action",
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<PlusCircleOutlined />}
            onClick={() => {
              form.setFieldsValue({
                action: "AWARD",
                amount: 1,
                description: "Daily Good Behavior",
              });
              openLogModal(record);
            }}
          >
            Log Behavior
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Layout className="min-h-screen bg-gray-50">
      {contextHolder}
      <Header className="bg-white border-b px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg flex items-center justify-center">
            <BankOutlined className="text-xl text-white" />
          </div>
          <Title level={4} className="!mb-0">
            Behavior Bank Admin
          </Title>
        </div>
        <div className="flex items-center gap-4">
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </Header>

      <Content className="p-6 max-w-7xl mx-auto w-full">
        <div className="mb-6 flex justify-between items-center">
          <Title level={3}>Managed Accounts</Title>
          {/* Future: Add Child Button */}
        </div>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="_id"
          loading={loading}
          className="bg-white rounded-lg shadow-sm"
        />

        <Modal
          title={`Log Behavior for ${selectedUser?.name}`}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
        >
          <Form form={form} layout="vertical" onFinish={handleTransaction}>
            <Form.Item name="action" label="Type" initialValue="AWARD">
              <Radio.Group>
                <Radio.Button value="AWARD">Good (+)</Radio.Button>
                <Radio.Button value="DEDUCT">Bad (-)</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="amount"
              label="Points Value"
              initialValue={1}
              rules={[{ required: true }]}
            >
              <Radio.Group>
                <Radio value={1}>Daily (+1/-1)</Radio>
                <Radio value={50}>Miracle/Penalty (+50/-50)</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="description"
              label="Note"
              rules={[{ required: true }]}
            >
              <Input placeholder="e.g. Completed Chores, Missed Homework" />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              className="w-full bg-blue-600"
            >
              Save Record
            </Button>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
}
