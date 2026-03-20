package model

import (
	"github.com/QuantumNous/new-api/common"
)

// InitDefaultIdentityLevel 初始化默认身份等级
func InitDefaultIdentityLevel() error {
	// 检查是否已有默认身份
	var count int64
	err := DB.Model(&IdentityLevel{}).Where("is_default = ?", true).Count(&count).Error
	if err != nil {
		return err
	}

	if count > 0 {
		return nil // 已存在默认身份
	}

	// 创建默认身份
	defaultLevel := &IdentityLevel{
		Name:           "普通用户",
		CommissionRate: 0.05, // 默认5%佣金
		Description:    "系统默认身份等级",
		IsDefault:      true,
		Status:         1,
		CreateTime:     common.GetTimestamp(),
		UpdateTime:     common.GetTimestamp(),
	}

	return DB.Create(defaultLevel).Error
}

// InitDefaultWithdrawalSetting 初始化默认提现设置
func InitDefaultWithdrawalSetting() error {
	// 检查是否已有设置
	var count int64
	err := DB.Model(&WithdrawalSetting{}).Count(&count).Error
	if err != nil {
		return err
	}

	if count > 0 {
		return nil // 已存在设置
	}

	// 创建默认设置
	defaultSetting := &WithdrawalSetting{
		MinAmount:      10000, // 100元
		Fee:            0.01,  // 1%
		FixedFee:       0,
		WithdrawalDays: "1,15", // 每月1号和15号
		WithdrawalType: 1,      // 每月固定日期
		Enabled:        true,
		CreateTime:     common.GetTimestamp(),
		UpdateTime:     common.GetTimestamp(),
	}

	return DB.Create(defaultSetting).Error
}
