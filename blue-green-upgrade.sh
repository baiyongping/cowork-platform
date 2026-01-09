#!/bin/bash
# 蓝绿部署自动化升级脚本
# 用于零停机升级际华协同办公平台

set -e

# 配置参数
PROJECT_PATH=/root/dist_$(date +%Y%m%d%H%M%S)
BLUE_PORT=3000
GREEN_PORT=3001
PUBLIC_PORT=3443
NGINX_CONF=/etc/nginx/conf.d/jihua-prod.conf

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== 际华协同办公平台 - 蓝绿部署升级 ===${NC}"
echo ""

# 1. 检查新版本文件
if [ ! -d "$PROJECT_PATH" ]; then
    echo -e "${RED}❌ 错误: 项目路径 $PROJECT_PATH 不存在${NC}"
    echo "请先使用 Lighthouse MCP 工具上传新版本文件"
    exit 1
fi

# 2. 构建新版本镜像
echo -e "${YELLOW}[1/6] 构建新版本镜像...${NC}"
cd $PROJECT_PATH

cat > Dockerfile << 'EOF'
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

docker build -t jihua-prod:latest .
echo -e "${GREEN}✅ 镜像构建完成${NC}"
echo ""

# 3. 启动绿环境
echo -e "${YELLOW}[2/6] 启动绿环境 (端口 $GREEN_PORT)...${NC}"
docker run -d \
  --name jihua-prod-green \
  --restart unless-stopped \
  -p $GREEN_PORT:80 \
  jihua-prod:latest
echo -e "${GREEN}✅ 绿环境启动成功${NC}"
echo ""

# 4. 健康检查
echo -e "${YELLOW}[3/6] 执行健康检查...${NC}"
sleep 3
RETRIES=5
for i in $(seq 1 $RETRIES); do
    if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$GREEN_PORT/ | grep -q "200"; then
        echo -e "${GREEN}✅ 健康检查通过 ($i/$RETRIES)${NC}"
        break
    else
        echo -e "${YELLOW}⏳ 健康检查中... ($i/$RETRIES)${NC}"
        sleep 2
    fi
    
    if [ $i -eq $RETRIES ]; then
        echo -e "${RED}❌ 健康检查失败，回滚部署${NC}"
        docker stop jihua-prod-green && docker rm jihua-prod-green
        exit 1
    fi
done
echo ""

# 5. 切换流量（修改 Nginx 配置）
echo -e "${YELLOW}[4/6] 切换流量到绿环境...${NC}"
sed -i "s/server 127.0.0.1:$BLUE_PORT;/server 127.0.0.1:$GREEN_PORT;/" $NGINX_CONF
nginx -t && nginx -s reload
echo -e "${GREEN}✅ 流量切换完成${NC}"
echo ""

# 6. 停止并清理蓝环境
echo -e "${YELLOW}[5/6] 清理旧蓝环境...${NC}"
if docker ps -a | grep -q jihua-prod-blue; then
    docker stop jihua-prod-blue && docker rm jihua-prod-blue
    echo -e "${GREEN}✅ 旧蓝环境已清理${NC}"
fi
echo ""

# 7. 重命名绿环境为蓝环境
echo -e "${YELLOW}[6/6] 重命名绿环境为蓝环境...${NC}"
docker stop jihua-prod-green && docker rm jihua-prod-green
docker run -d \
  --name jihua-prod-blue \
  --restart unless-stopped \
  -p $BLUE_PORT:80 \
  jihua-prod:latest

# 恢复 Nginx 配置指向蓝环境
sed -i "s/server 127.0.0.1:$GREEN_PORT;/server 127.0.0.1:$BLUE_PORT;/" $NGINX_CONF
nginx -s reload
echo -e "${GREEN}✅ 蓝环境重新激活${NC}"
echo ""

# 8. 清理旧镜像
echo -e "${YELLOW}清理未使用的镜像...${NC}"
docker image prune -f

# 9. 验证部署
echo -e "${GREEN}=== 部署完成 ===${NC}"
echo ""
echo "📊 部署信息:"
echo "  • 项目路径: $PROJECT_PATH"
echo "  • 蓝环境端口: $BLUE_PORT"
echo "  • 公网访问端口: $PUBLIC_PORT"
echo ""
echo "🔍 容器状态:"
docker ps | grep jihua-prod
echo ""
echo -e "${GREEN}✅ 访问地址: https://152.136.183.181:$PUBLIC_PORT${NC}"
echo ""
echo "💡 提示: 如需回滚，请运行: docker run ... (使用上一个版本镜像)"
