import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ConfigProvider,
  Form,
  Input,
  Radio,
  Button,
  Typography,
  message,
} from "antd";
import "./App.css";

export default function App() {
  const [form] = Form.useForm();
  const { Title, Text } = Typography;
  const navigate = useNavigate();

  const themeTokens = useMemo(
    () => ({
      token: {
        colorPrimary: "#193359",
        borderRadius: 10,
      },
      components: {
        Button: { controlHeight: 48, fontWeight: 600 },
        Input: { controlHeight: 44 },
        Radio: { colorPrimary: "#0f172a" },
      },
    }),
    []
  );

  const emailRules = [
    { required: true, message: "请输入邮箱" },
    { type: "email", message: "邮箱格式不正确" },
    {
      validator: (_, value) =>
        !value || value.endsWith("@ad.unsw.edu.au")
          ? Promise.resolve()
          : Promise.reject(new Error("请使用 ad.unsw.edu.au 邮箱")),
    },
  ];

  const passwordRules = [
    { required: true, message: "请输入密码" },
    {
      pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/,
      message: "至少 8 位且含字母和数字",
    },
  ];

  const onFinish = (values) => {
    if (values.role === "admin") {
      message.warning("管理员注册需走单独流程。本示例不创建管理员账号。");
      return;
    }
    // 前端模拟成功
    message.success("注册成功！（前端模拟）即将跳转 /dashboard");
    setTimeout(() => {
      navigate('/dashboard'); // 使用 React Router 导航
    }, 900);
  };

  return (
    <ConfigProvider theme={themeTokens}>
      <main className="container">
        <div className="card" role="region" aria-labelledby="signup-title">
          <section>
            <Title id="signup-title" level={1} style={{ margin: "6px 0 18px" }}>
              Sign Up
            </Title>

            <Text strong className="section-label">User</Text>
            <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
              <Form.Item name="role" initialValue="student" style={{ marginBottom: 8 }}>
                <Radio.Group aria-label="User role">
                  <Radio value="student">Student</Radio>
                  <Radio value="admin">Admin</Radio>
                </Radio.Group>
              </Form.Item>

              <Text strong className="section-label">User Name</Text>
              <Form.Item name="email" rules={emailRules} style={{ marginTop: 8 }}>
                <Input
                  placeholder="example@ad.unsw.edu.au"
                  inputMode="email"
                  autoComplete="email"
                />
              </Form.Item>

              <Text strong className="section-label">Password</Text>
              <Form.Item name="password" rules={passwordRules}>
                <Input.Password autoComplete="new-password" />
              </Form.Item>

              <Text strong className="section-label">Confirm Password</Text>
              <Form.Item
                name="confirm"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "请再次输入密码" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("两次密码不一致"));
                    },
                  }),
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>

              <Form.Item style={{ marginTop: 8 }}>
                <Button htmlType="submit" type="primary" block>
                  Sign Up
                </Button>
              </Form.Item>
            </Form>
            
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Text>
                Already have an account?{" "}
                <Button 
                  type="link" 
                  onClick={() => navigate('/signin')}
                  style={{ padding: 0, height: 'auto', color: '#193359' }}
                >
                  Sign In
                </Button>
              </Text>
            </div>
          </section>

          {/* 右侧背景色块 */}
          <aside className="illustration" aria-hidden="true" />
        </div>
      </main>
    </ConfigProvider>
  );
}
