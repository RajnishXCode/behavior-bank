"use client";

import React, { useState } from "react";
import { Form, Input, Button, Card, message, Typography } from "antd";
import { UserOutlined, LockOutlined, BankOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        messageApi.success("Login successful!");
        // Redirect based on role
        if (data.user.role === "ADMIN") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      } else {
        messageApi.error(data.error || "Login failed");
      }
    } catch (err) {
      messageApi.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      {contextHolder}
      <Card className="w-full max-w-md shadow-lg rounded-xl border-t-4 border-green-500">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center">
              <BankOutlined className="text-3xl text-green-500" />
            </div>
          </div>
          <Title level={2} className="!mb-1 text-gray-800">
            Behavior Bank
          </Title>
          <Text type="secondary">Secure Savings & Behavior Tracking</Text>
        </div>

        <Form
          name="login"
          onFinish={handleLogin}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="identifier"
            rules={[{ required: true, message: "Please user ID or name!" }]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="Username or ID"
            />
          </Form.Item>

          <Form.Item
            name="pin"
            rules={[{ required: true, message: "Please enter your PIN!" }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="Secure PIN"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full bg-green-500 hover:!bg-green-600"
              loading={loading}
            >
              Access Account
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
