import { useMemo, useState } from "react";
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
import signinImage from "../components/signin.jpg";

export default function App() {
  const [form] = Form.useForm();
  const { Title, Text } = Typography;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

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
    { required: true, message: "Please enter your email" },
    { type: "email", message: "Please enter a valid email address" },
  ];

  const passwordRules = [
    { required: true, message: "Please enter your password" },
    {
      pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/,
      message: "Password must be at least 8 characters with letters and numbers",
    },
  ];

  const onFinish = async (values) => {
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5001/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.email,
          password: values.password,
          role: values.role,
          first_name: values.firstName,
          last_name: values.lastName,
        }),
      });

      const data = await response.json();

      if (response.ok && !data.error) {
        message.success('Registration successful! Redirecting...');
        
        // Store user data
        localStorage.setItem('token', JSON.stringify(data));
        
        // Redirect based on role
        setTimeout(() => {
          if (values.role === 'admin') {
            navigate('/admin/dashboard');
          } else {
            navigate('/dashboard');
          }
        }, 1000);
      } else {
        message.error(data.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      message.error('Network error. Please check if the backend server is running.');
    } finally {
      setLoading(false);
    }
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
            <Form 
              form={form} 
              layout="vertical" 
              onFinish={onFinish} 
              onFinishFailed={() => {
                message.error('Please fill in all required fields correctly.');
              }}
              requiredMark={false}
            >
              <Form.Item name="role" initialValue="student" style={{ marginBottom: 8 }}>
                <Radio.Group aria-label="User role">
                  <Radio value="student">Student</Radio>
                  <Radio value="admin">Admin</Radio>
                </Radio.Group>
              </Form.Item>

              <Text strong className="section-label">First Name</Text>
              <Form.Item 
                name="firstName" 
                rules={[{ required: true, message: "Please enter your first name" }]}
                style={{ marginTop: 8 }}
              >
                <Input
                  autoComplete="given-name"
                />
              </Form.Item>

              <Text strong className="section-label">Last Name</Text>
              <Form.Item 
                name="lastName" 
                rules={[{ required: true, message: "Please enter your last name" }]}
              >
                <Input
                  autoComplete="family-name"
                />
              </Form.Item>

              <Text strong className="section-label">Email</Text>
              <Form.Item name="email" rules={emailRules}>
                <Input
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
                  { required: true, message: "Please confirm your password" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("Passwords do not match"));
                    },
                  }),
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>

              <Form.Item style={{ marginTop: 8 }}>
                <Button htmlType="submit" type="primary" block loading={loading}>
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

          {/* 右侧图片 */}
          <aside className="illustration" aria-hidden="true">
            <img 
              src={signinImage} 
              alt="Learning illustration" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                borderRadius: '14px'
              }} 
            />
          </aside>
        </div>
      </main>
    </ConfigProvider>
  );
}
