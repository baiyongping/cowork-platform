import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'
// 🎨 引入 TDesign 样式（全局生效）
import 'tdesign-react/es/style/index.css';
// 🎨 引入 TDesign 自定义样式（覆盖默认样式）
import './styles/tdesign-custom.css';
// 🔧 确保 CloudBase 初始化和匿名登录
import './lib/cloudbase'
// 🔧 引入数据库健康检查工具
import './lib/db-health'
import { TDesignProvider } from './lib/tdesign-config'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* 🎨 TDesign 全局配置 Provider */}
    <TDesignProvider>
      <App />
    </TDesignProvider>
  </React.StrictMode>,
)
