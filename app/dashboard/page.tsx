"use client";

import React, { useEffect, useState } from "react";
import {
  Layout,
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Typography,
  Spin,
  Button,
} from "antd";
import {
  DollarOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface DashboardData {
  user: { name: string; id: string };
  account: { balance: number; vestingStart: string; status: string };
  stats: {
    currentPoints: number;
    estimatedValue: number;
    interestRate: number;
    isPenalty: boolean;
  };
  recentActivity: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const jsonData = await res.json();
      setData(jsonData);
    } catch (error) {
      console.error("Failed to fetch dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "DELETE" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spin size="large" tip="Loading your Bank..." />
      </div>
    );
  }

  if (!data) return null;

  const columns = [
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "date",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type: string) => {
        let color = "blue";
        if (type === "EARN" || type === "BONUS") color = "green";
        if (type === "SPEND" || type === "PENALTY") color = "red";
        return <Tag color={color}>{type}</Tag>;
      },
    },
    {
      title: "Points",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number, record: any) => (
        <span
          className={
            record.type === "EARN" || record.type === "BONUS"
              ? "text-green-600 font-bold"
              : "text-red-500 font-bold"
          }
        >
          {amount > 0 ? `+${amount}` : amount}
        </span>
      ),
    },
  ];

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Header className="bg-white border-b px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <SafetyCertificateOutlined className="text-xl text-green-600" />
          </div>
          <Title level={4} className="!mb-0">
            Behavior Bank
          </Title>
        </div>
        <div className="flex items-center gap-4">
          <Text strong className="hidden sm:block">
            Welcome, {data.user.name}
          </Text>
          <Button icon={<LogoutOutlined />} onClick={handleLogout} danger>
            Logout
          </Button>
        </div>
      </Header>

      <Content className="p-6 max-w-7xl mx-auto w-full">
        {/* Stats Row */}
        <Row gutter={[16, 16]} className="mb-8">
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              className="h-full shadow-sm hover:shadow-md transition-shadow"
            >
              <Statistic
                title="Account Balance"
                value={data.account.balance}
                precision={2}
                prefix="₹"
                valueStyle={{ color: "#3f8600" }}
                prefixCls="text-2xl"
              />
              <div className="mt-2 text-gray-500 text-xs">Original Deposit</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              className="h-full shadow-sm hover:shadow-md transition-shadow"
            >
              <Statistic
                title="Current Behavior Points"
                value={data.stats.currentPoints}
                prefix={<TrophyOutlined />}
                valueStyle={{
                  color: data.stats.currentPoints >= 0 ? "#1890ff" : "#cf1322",
                }}
              />
              <div className="mt-2 text-gray-500 text-xs">
                Total Accumulated
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              className="h-full shadow-sm hover:shadow-md transition-shadow"
            >
              <Statistic
                title="Interest Rate"
                value={data.stats.interestRate}
                suffix="%"
                prefix={<ClockCircleOutlined />}
              />
              <div className="mt-2 text-gray-500 text-xs">
                Based on vesting time
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              className="h-full shadow-sm hover:shadow-md transition-shadow bg-green-50 border-green-100"
            >
              <Statistic
                title="Estimated Value"
                value={data.stats.estimatedValue}
                precision={0}
                prefix="₹"
                valueStyle={{ color: "#00b96b", fontWeight: "bold" }}
              />
              <div className="mt-2 text-green-700 text-xs">
                {data.stats.isPenalty
                  ? "Penalty Applied (Negative Points)"
                  : "Includes Interest"}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Activity Table */}
        <Card
          title="Recent Activity"
          className="shadow-sm rounded-lg"
          bordered={false}
        >
          <Table
            dataSource={data.recentActivity}
            columns={columns}
            rowKey="_id"
            pagination={false}
            locale={{ emptyText: "No behavior logs yet" }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
