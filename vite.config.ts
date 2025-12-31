import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// 生成带时间戳的版本号用于缓存破坏
const buildVersion = new Date().getTime();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    port: 5173,
    open: true,
    host: true,
    // 🔧 开发环境HTTPS配置（CloudBase需要）
    https: false,  // 使用HTTP避免证书问题
    // 🔧 禁用缓存，确保总是加载最新代码
    headers: {
      'Cache-Control': 'no-store',
    },
    proxy: {
      // 如果需要代理CloudBase API请求（可选）
      '/cloudbase-api': {
        target: 'https://jihua-oa-dev-3goht9irae4d949f.ap-shanghai.tcb-api.tencentcloudapi.com',
        changeOrigin: true,
        secure: false,  // 忽略SSL证书验证
        rewrite: (path) => path.replace(/^\/cloudbase-api/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    // ⚠️ 构建前强制清空输出目录 (防止旧文件残留)
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // 🔧 文件名添加hash和时间戳 (强制缓存失效)
        entryFileNames: `assets/[name]-[hash]-${buildVersion}.js`,
        chunkFileNames: `assets/[name]-[hash]-${buildVersion}.js`,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return `assets/[name]-[hash]-${buildVersion}[extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
    // 🔧 chunk大小警告阈值
    chunkSizeWarningLimit: 1000,
  },
})
