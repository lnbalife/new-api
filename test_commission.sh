#!/bin/bash

# 佣金功能测试脚本
# 使用方法: ./test_commission.sh <your_token>

TOKEN="$1"
BASE_URL="http://localhost:3000"

if [ -z "$TOKEN" ]; then
    echo "请提供访问令牌"
    echo "使用方法: $0 <your_token>"
    exit 1
fi

echo "=== 测试佣金功能 ==="
echo ""

# 1. 测试佣金统计API
echo "1. 测试佣金统计API: GET /api/user/commission/stats"
curl -s -H "Authorization: Bearer $TOKEN" \
     "$BASE_URL/api/user/commission/stats" | jq '.'
echo ""

# 2. 测试佣金记录列表API
echo "2. 测试佣金记录列表API: GET /api/user/commission/list?p=0"
curl -s -H "Authorization: Bearer $TOKEN" \
     "$BASE_URL/api/user/commission/list?p=0" | jq '.'
echo ""

# 3. 测试邀请用户列表API
echo "3. 测试邀请用户列表API: GET /api/user/invitees?p=0"
curl -s -H "Authorization: Bearer $TOKEN" \
     "$BASE_URL/api/user/invitees?p=0" | jq '.'
echo ""

# 4. 检查系统配置
echo "4. 检查系统配置: GET /api/option/"
curl -s -H "Authorization: Bearer $TOKEN" \
     "$BASE_URL/api/option/" | jq '.data[] | select(.key | contains("Commission"))'
echo ""

echo "=== 测试完成 ==="
