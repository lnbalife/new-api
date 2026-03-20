# 已删除的旧版佣金功能

本文档记录了已删除的早期"充值佣金"功能，该功能已被新的"多级身份佣金系统"完全替代。

## 删除时间
2026-03-13

## 删除原因
早期的简单佣金功能已被更完善的多级身份佣金系统替代，新系统包含：
- 多级身份等级管理
- 基于实际支付金额的佣金计算
- 完整的钱包管理系统
- KYC实名认证
- 提现申请和审核流程

## 已删除的文件

### 后端文件
- `controller/commission.go` - 旧的佣金控制器
- `model/commission.go` - 旧的佣金数据模型

### 前端文件
- `web/src/components/topup/CommissionCard.jsx` - 旧的佣金卡片组件

### 文档和测试文件
- `COMMISSION_SETUP.md` - 旧的佣金设置文档
- `test_commission_browser.js` - 旧的佣金测试脚本

## 已删除的代码片段

### common/constants.go
```go
var CommissionEnabled = false      // 是否启用充值佣金
var CommissionPercentage = 0.0     // 佣金比例（0-1之间，例如0.1表示10%）
```

### model/option.go
- 删除了 CommissionEnabled 和 CommissionPercentage 的配置初始化和更新逻辑

### model/main.go
- 从数据库迁移中删除了 `&Commission{}` 表

### router/api-router.go
- 删除了以下旧路由：
  - `GET /api/user/commission/stats`
  - `GET /api/user/commission/list`
  - `GET /api/user/invitees`

### web/src/pages/Setting/Operation/SettingsCreditLimit.jsx
- 删除了"启用充值佣金"开关
- 删除了"佣金比例"输入框

### web/src/components/settings/OperationSetting.jsx
- 删除了 CommissionEnabled 和 CommissionPercentage 配置项

### web/src/components/topup/index.jsx
- 删除了 CommissionCard 组件的导入和渲染

## 新系统文件（保留）

### 后端
- `controller/commission_v2.go` - 新的佣金控制器
- `model/commission_v2.go` - 新的数据模型（8个表）
- `model/commission_process.go` - 佣金处理逻辑
- `model/commission_query.go` - 查询和提现功能
- `model/commission_init.go` - 初始化逻辑

### 前端
- `web/src/pages/Wallet/index.jsx` - 用户钱包页面
- `web/src/pages/IdentityLevel/index.jsx` - 身份等级管理
- `web/src/pages/WithdrawalAudit/index.jsx` - 提现审核
- `web/src/components/wallet/WithdrawalModal.jsx` - 提现申请弹窗
- `web/src/components/wallet/KYCModal.jsx` - 实名认证弹窗

## 数据库变更

### 删除的表
- `commissions` - 旧的佣金记录表

### 保留的新表
- `identity_levels` - 身份等级表
- `commission_wallets` - 佣金钱包表
- `commission_records` - 佣金记录表
- `withdrawal_records` - 提现记录表
- `user_identities` - 用户身份关联表
- `user_kycs` - 用户实名认证表
- `withdrawal_settings` - 提现设置表

## 注意事项

1. 旧的 `commissions` 表数据不会自动迁移到新系统
2. 如需保留历史数据，请在删除表之前手动备份
3. 新系统使用完全不同的数据结构和业务逻辑
4. 充值流程中的 `ProcessCommission` 函数已更新为新版本

## 迁移建议

如果需要查看历史佣金数据：
1. 在删除旧表之前，导出 `commissions` 表数据
2. 可以创建一个只读视图用于历史数据查询
3. 新系统从部署时间开始记录新的佣金数据
