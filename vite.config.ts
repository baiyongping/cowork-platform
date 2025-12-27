import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
})
