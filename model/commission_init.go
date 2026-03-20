/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

package model

import (
	"github.com/QuantumNous/new-api/common"
)

// 固定身份等级常量
const (
	IdentityLevelNormal = 1 // 普通用户
	IdentityLevelRegion = 2 // 区域代理
	IdentityLevelCity   = 3 // 城市运营中心
)

// InitDefaultIdentityLevel 初始化固定三个身份等级
// 普通用户（默认）、区域代理、城市运营中心
func InitDefaultIdentityLevel() error {
	now := common.GetTimestamp()

	levels := []IdentityLevel{
		{
			Id:             IdentityLevelNormal,
			Name:           "普通用户",
			CommissionRate: 0.05,
			Description:    "普通注册用户，系统默认身份",
			IsDefault:      true,
			Status:         1,
			CreateTime:     now,
			UpdateTime:     now,
		},
		{
			Id:             IdentityLevelRegion,
			Name:           "区域代理",
			CommissionRate: 0.10,
			Description:    "区域代理，覆盖特定区县范围",
			IsDefault:      false,
			Status:         1,
			CreateTime:     now,
			UpdateTime:     now,
		},
		{
			Id:             IdentityLevelCity,
			Name:           "城市运营中心",
			CommissionRate: 0.15,
			Description:    "城市运营中心，覆盖特定城市范围",
			IsDefault:      false,
			Status:         1,
			CreateTime:     now,
			UpdateTime:     now,
		},
	}

	for _, level := range levels {
		var count int64
		err := DB.Model(&IdentityLevel{}).Where("id = ?", level.Id).Count(&count).Error
		if err != nil {
			return err
		}
		if count == 0 {
			// 使用指定ID插入
			if err := DB.Create(&level).Error; err != nil {
				return err
			}
		} else {
			// 已存在则只更新名称和描述，保留用户自定义佣金比例
			if err := DB.Model(&IdentityLevel{}).Where("id = ?", level.Id).
				Updates(map[string]interface{}{
					"name":        level.Name,
					"is_default":  level.IsDefault,
					"description": level.Description,
					"status":      level.Status,
					"update_time": now,
				}).Error; err != nil {
				return err
			}
		}
	}
	return nil
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
