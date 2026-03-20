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
	"errors"
	"time"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

// Agent 代理商表
type Agent struct {
	Id              int     `json:"id"`
	Name            string  `json:"name" gorm:"type:varchar(100);not null"`         // 代理商名称
	IdentityLevelId int     `json:"identity_level_id" gorm:"not null;index"`        // 身份等级ID (2=区域代理, 3=城市运营中心)
	ProvinceId      int     `json:"province_id" gorm:"index"`                       // 省份ID
	CityId          int     `json:"city_id" gorm:"index"`                           // 城市ID
	DistrictId      int     `json:"district_id" gorm:"index"`                       // 区县ID（区域代理必填）
	UserId          int     `json:"user_id" gorm:"uniqueIndex;not null"`             // 绑定用户ID（一个用户只能绑定一个代理商）
	Status          int     `json:"status" gorm:"type:int;default:1;index"`         // 状态：1=启用 2=禁用
	UseDefaultRate  bool    `json:"use_default_rate" gorm:"default:true"`            // 是否使用默认佣金比例
	CustomRate      float64 `json:"custom_rate" gorm:"type:decimal(5,4);default:0"` // 自定义佣金比例 (0-1)
	CreateTime      int64   `json:"create_time"`
	UpdateTime      int64   `json:"update_time"`

	// 关联数据（不存数据库）
	Username          string  `json:"username" gorm:"-:all"`            // 用户账号
	AccountBalance    int     `json:"account_balance" gorm:"-:all"`     // 账户余额（分）
	TotalCommission   int64   `json:"total_commission" gorm:"-:all"`    // 累计收益（分）
	EffectiveRate     float64 `json:"effective_rate" gorm:"-:all"`      // 实际生效的佣金比例
	IdentityLevelName string  `json:"identity_level_name" gorm:"-:all"` // 身份等级名称
	ProvinceName      string  `json:"province_name" gorm:"-:all"`       // 省份名称
	CityName          string  `json:"city_name" gorm:"-:all"`           // 城市名称
	DistrictName      string  `json:"district_name" gorm:"-:all"`       // 区县名称
}

func (agent *Agent) Insert() error {
	agent.CreateTime = common.GetTimestamp()
	agent.UpdateTime = common.GetTimestamp()
	return DB.Create(agent).Error
}

func (agent *Agent) Update() error {
	agent.UpdateTime = common.GetTimestamp()
	return DB.Save(agent).Error
}

// GetAllAgents 获取所有代理商（管理员）
func GetAllAgents(keyword string, identityLevelId int, page, pageSize int) ([]*Agent, int64, error) {
	var agents []*Agent
	var total int64

	query := DB.Model(&Agent{})
	if keyword != "" {
		query = query.Where("name LIKE ?", "%"+keyword+"%")
	}
	if identityLevelId > 0 {
		query = query.Where("identity_level_id = ?", identityLevelId)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Order("id desc").Offset(offset).Limit(pageSize).Find(&agents).Error; err != nil {
		return nil, 0, err
	}

	// 填充关联数据
	for _, agent := range agents {
		fillAgentRelatedData(agent)
	}

	return agents, total, nil
}

// GetAgentByUserId 根据用户ID查询代理商
func GetAgentByUserId(userId int) (*Agent, error) {
	var agent Agent
	err := DB.Where("user_id = ?", userId).First(&agent).Error
	if err != nil {
		return nil, err
	}
	fillAgentRelatedData(&agent)
	return &agent, nil
}

// GetAgentById 根据代理商ID查询
func GetAgentById(id int) (*Agent, error) {
	var agent Agent
	err := DB.Where("id = ?", id).First(&agent).Error
	if err != nil {
		return nil, err
	}
	fillAgentRelatedData(&agent)
	return &agent, nil
}

// fillAgentRelatedData 填充代理商关联数据
func fillAgentRelatedData(agent *Agent) {
	// 填充用户名和余额
	var user User
	if err := DB.Select("username, quota").Where("id = ?", agent.UserId).First(&user).Error; err == nil {
		agent.Username = user.Username
		agent.AccountBalance = user.Quota
	}

	// 填充累计佣金
	var wallet CommissionWallet
	if err := DB.Select("total_commission").Where("user_id = ?", agent.UserId).First(&wallet).Error; err == nil {
		agent.TotalCommission = wallet.TotalCommission
	}

	// 填充身份等级名称和实际佣金比例
	var level IdentityLevel
	if err := DB.Select("name, commission_rate").Where("id = ?", agent.IdentityLevelId).First(&level).Error; err == nil {
		agent.IdentityLevelName = level.Name
		if agent.UseDefaultRate {
			agent.EffectiveRate = level.CommissionRate
		} else {
			agent.EffectiveRate = agent.CustomRate
		}
	}

	// 填充省市区名称
	if agent.ProvinceId > 0 {
		var province Province
		if err := DB.Select("name").Where("id = ?", agent.ProvinceId).First(&province).Error; err == nil {
			agent.ProvinceName = province.Name
		}
	}
	if agent.CityId > 0 {
		var city City
		if err := DB.Select("name").Where("id = ?", agent.CityId).First(&city).Error; err == nil {
			agent.CityName = city.Name
		}
	}
	if agent.DistrictId > 0 {
		var district District
		if err := DB.Select("name").Where("id = ?", agent.DistrictId).First(&district).Error; err == nil {
			agent.DistrictName = district.Name
		}
	}
}

// CreateAgent 创建代理商并绑定用户身份
func CreateAgent(agent *Agent) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		// 检查用户是否已是代理商
		var count int64
		if err := tx.Model(&Agent{}).Where("user_id = ?", agent.UserId).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return errors.New("该用户已绑定代理商")
		}

		// 检查用户是否存在
		var user User
		if err := tx.Where("id = ?", agent.UserId).First(&user).Error; err != nil {
			return errors.New("用户不存在")
		}

		// 校验身份等级：代理商只能是区域代理(2)或城市运营中心(3)
		if agent.IdentityLevelId != IdentityLevelRegion && agent.IdentityLevelId != IdentityLevelCity {
			return errors.New("代理商身份等级无效")
		}

		// 区域代理必须选到区县
		if agent.IdentityLevelId == IdentityLevelRegion && agent.DistrictId == 0 {
			return errors.New("区域代理必须选择区县")
		}

		// 城市运营中心只能选到市级
		if agent.IdentityLevelId == IdentityLevelCity && agent.CityId == 0 {
			return errors.New("城市运营中心必须选择城市")
		}

		now := time.Now().Unix()
		agent.CreateTime = now
		agent.UpdateTime = now

		// 创建代理商
		if err := tx.Create(agent).Error; err != nil {
			return err
		}

		// 更新用户的身份等级
		if err := tx.Model(&User{}).Where("id = ?", agent.UserId).
			Update("identity_level_id", agent.IdentityLevelId).Error; err != nil {
			return err
		}

		return nil
	})
}

// UpdateAgent 更新代理商信息
func UpdateAgent(agent *Agent) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		// 校验身份等级
		if agent.IdentityLevelId != IdentityLevelRegion && agent.IdentityLevelId != IdentityLevelCity {
			return errors.New("代理商身份等级无效")
		}

		// 区域代理必须选到区县
		if agent.IdentityLevelId == IdentityLevelRegion && agent.DistrictId == 0 {
			return errors.New("区域代理必须选择区县")
		}

		// 城市运营中心只能选到市级
		if agent.IdentityLevelId == IdentityLevelCity && agent.CityId == 0 {
			return errors.New("城市运营中心必须选择城市")
		}

		agent.UpdateTime = time.Now().Unix()

		// 更新代理商记录（不包含 user_id）
		if err := tx.Model(&Agent{}).Where("id = ?", agent.Id).Updates(map[string]interface{}{
			"name":              agent.Name,
			"identity_level_id": agent.IdentityLevelId,
			"province_id":       agent.ProvinceId,
			"city_id":           agent.CityId,
			"district_id":       agent.DistrictId,
			"use_default_rate":  agent.UseDefaultRate,
			"custom_rate":       agent.CustomRate,
			"update_time":       agent.UpdateTime,
		}).Error; err != nil {
			return err
		}

		// 同步更新用户的身份等级
		if err := tx.Model(&User{}).Where("id = ?", agent.UserId).
			Update("identity_level_id", agent.IdentityLevelId).Error; err != nil {
			return err
		}

		return nil
	})
}

// GetAgentEffectiveRate 获取代理商实际生效的佣金比例
func GetAgentEffectiveRate(agent *Agent) (float64, error) {
	if !agent.UseDefaultRate {
		return agent.CustomRate, nil
	}
	var level IdentityLevel
	if err := DB.Where("id = ?", agent.IdentityLevelId).First(&level).Error; err != nil {
		return 0, err
	}
	return level.CommissionRate, nil
}

// SetAgentStatus 设置代理商状态（1=启用, 2=禁用）
func SetAgentStatus(id int, status int) error {
	if status != common.UserStatusEnabled && status != common.UserStatusDisabled {
		return errors.New("无效的状态值")
	}
	return DB.Model(&Agent{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":      status,
		"update_time": time.Now().Unix(),
	}).Error
}

// DeleteAgent 删除代理商并还原用户身份等级为普通用户
func DeleteAgent(id int) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		var agent Agent
		if err := tx.Where("id = ?", id).First(&agent).Error; err != nil {
			return errors.New("代理商不存在")
		}

		// 还原用户身份等级为普通用户（1）
		if err := tx.Model(&User{}).Where("id = ?", agent.UserId).
			Update("identity_level_id", IdentityLevelNormal).Error; err != nil {
			return err
		}

		// 删除代理商记录
		if err := tx.Delete(&Agent{}, id).Error; err != nil {
			return err
		}

		return nil
	})
}
