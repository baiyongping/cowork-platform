import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'
// 🔧 确保 CloudBase 初始化和匿名登录
import './lib/cloudbase'
// 🔧 引入数据库健康检查工具
import './lib/db-health'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
