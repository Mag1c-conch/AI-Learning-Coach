// src/Admin/Pages/Admin/CalendarPanel.jsx
import React from 'react';
import { Calendar, theme, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
dayjs.locale('en');

export default function CalendarPanel({ onChange }) {
  const { token } = theme.useToken();
  const wrapperStyle = {
    width: 360,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: '#fff',
    padding: 8,
  };

  return (
    <ConfigProvider locale={enUS}>
      <div style={wrapperStyle}>
        <Calendar
          fullscreen={false}
          onPanelChange={(value, mode) => {
            onChange?.(value, mode);
          }}
        />
      </div>
    </ConfigProvider>
  );
}
