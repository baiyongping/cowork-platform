#!/bin/bash

# 际华协同办公管理平台 - 一键部署脚本 (Linux/Mac)
# 使用方法: chmod +x 快速部署.sh && ./快速部署.sh

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}==================================${NC}"
echo -e "${CYAN}  际华协同办公管理平台 - 一键部署  ${NC}"
echo -e "${CYAN}==================================${NC}"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未安装 Node.js${NC}"
    echo "请访问 https://nodejs.org 下载安装"
    exit 1
fi

# 第一步：清理旧构建
echo -e "${YELLOW}[1/6] 清理旧构建...${NC}"
if [ -d "dist" ]; then
    rm -rf dist
    echo -e "  ${GREEN}✅ 已清理旧构建${NC}"
else
    echo -e "  ⚠️  无旧构建文件"
fi

# 第二步：安装依赖
echo -e "${YELLOW}[2/6] 安装依赖...${NC}"
npm install
echo -e "  ${GREEN}✅ 依赖安装完成${NC}"

# 第三步：构建前端
echo -e "${YELLOW}[3/6] 构建前端...${NC}"
npm run build
echo -e "  ${GREEN}✅ 前端构建完成${NC}"

# 第四步：构建后端
echo -e "${YELLOW}[4/6] 构建后端...${NC}"
cd server
npm install
npm run build
cd ..
echo -e "  ${GREEN}✅ 后端构建完成${NC}"

# 第五步：上传前端到服务器
echo -e "${YELLOW}[5/6] 上传前端到服务器...${NC}"
echo "  正在连接服务器..."
scp -r dist/* root@152.136.183.181:/var/www/jihua/
echo -e "  ${GREEN}✅ 前端上传成功${NC}"

# 第六步：上传并重启后端服务
echo -e "${YELLOW}[6/6] 上传并重启后端服务...${NC}"
scp -r server/dist/* root@152.136.183.181:/root/jihua-backend/
ssh root@152.136.183.181 "pm2 restart jihua-api || pm2 start /root/jihua-backend/index.js --name jihua-api"
echo -e "  ${GREEN}✅ 后端部署成功${NC}"

echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}  🎉 部署完成！${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo -e "${CYAN}访问地址:${NC}"
echo -e "  HTTP:  http://152.136.183.181"
echo -e "  HTTPS: https://152.136.183.181"
echo ""
echo -e "${YELLOW}提示: HTTPS 首次访问需要点击 '高级' -> '继续前往'${NC}"
echo ""
echo -e "${YELLOW}建议: 使用 Ctrl+F5 (或 Cmd+Shift+R) 强制刷新浏览器缓存${NC}"
echo ""
