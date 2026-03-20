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

package controller

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

// GetAgents 获取代理商列表（管理员）
func GetAgents(c *gin.Context) {
	keyword := c.Query("keyword")
	identityLevelIdStr := c.Query("identity_level_id")
	pageStr := c.DefaultQuery("p", "1")
	pageSizeStr := c.DefaultQuery("page_size", "20")

	identityLevelId, _ := strconv.Atoi(identityLevelIdStr)
	page, _ := strconv.Atoi(pageStr)
	pageSize, _ := strconv.Atoi(pageSizeStr)
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	agents, total, err := model.GetAllAgents(keyword, identityLevelId, page, pageSize)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{
		"items":     agents,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// CreateAgent 新增代理商（管���员）
func CreateAgent(c *gin.Context) {
	var agent model.Agent
	if err := c.ShouldBindJSON(&agent); err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	// 校验必填字段
	if agent.Name == "" {
		common.ApiErrorMsg(c, "代理商名称不能为空")
		return
	}
	if agent.UserId <= 0 {
		common.ApiErrorMsg(c, "请选择用户账号")
		return
	}
	if agent.IdentityLevelId != model.IdentityLevelRegion && agent.IdentityLevelId != model.IdentityLevelCity {
		common.ApiErrorMsg(c, "代理商等级无效，只能选择区域代理或城市运营中心")
		return
	}
	if agent.ProvinceId <= 0 {
		common.ApiErrorMsg(c, "请选择省份")
		return
	}
	if agent.CityId <= 0 {
		common.ApiErrorMsg(c, "请选择城市")
		return
	}
	if agent.IdentityLevelId == model.IdentityLevelRegion && agent.DistrictId <= 0 {
		common.ApiErrorMsg(c, "区域代理必须选择区县")
		return
	}

	// 自定义比例范围校验
	if !agent.UseDefaultRate {
		if agent.CustomRate < 0 || agent.CustomRate > 1 {
			common.ApiErrorMsg(c, "自定义佣金比例必须在0-1之间")
			return
		}
	}

	if err := model.CreateAgent(&agent); err != nil {
		common.ApiError(c, err)
		return
	}

	// 重新查询填充关联数据
	result, _ := model.GetAgentById(agent.Id)
	if result != nil {
		common.ApiSuccess(c, result)
	} else {
		common.ApiSuccess(c, agent)
	}
}

// UpdateAgent 编辑代理商（管理员）
func UpdateAgent(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		common.ApiErrorMsg(c, "无效的代理商ID")
		return
	}

	// 查询原代理商
	existing, err := model.GetAgentById(id)
	if err != nil {
		common.ApiErrorMsg(c, "代理商不存在")
		return
	}

	var req model.Agent
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	// 校验必填字段
	if req.Name == "" {
		common.ApiErrorMsg(c, "代理商名称不能为空")
		return
	}
	if req.IdentityLevelId != model.IdentityLevelRegion && req.IdentityLevelId != model.IdentityLevelCity {
		common.ApiErrorMsg(c, "代理商等级无效，只能选择区域代理或城市运营中心")
		return
	}
	if req.ProvinceId <= 0 {
		common.ApiErrorMsg(c, "请选择省份")
		return
	}
	if req.CityId <= 0 {
		common.ApiErrorMsg(c, "请选择城市")
		return
	}
	if req.IdentityLevelId == model.IdentityLevelRegion && req.DistrictId <= 0 {
		common.ApiErrorMsg(c, "区域代理必须选择区县")
		return
	}

	// 自定义比例范围校验
	if !req.UseDefaultRate {
		if req.CustomRate < 0 || req.CustomRate > 1 {
			common.ApiErrorMsg(c, "自定义佣金比例必须在0-1之间")
			return
		}
	}

	req.Id = id
	req.UserId = existing.UserId // 用户账号不可修改

	if err := model.UpdateAgent(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	result, _ := model.GetAgentById(id)
	if result != nil {
		common.ApiSuccess(c, result)
	} else {
		common.ApiSuccess(c, req)
	}
}

// GetAgentDetail 获取单个代理商详情（管理员）
func GetAgentDetail(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		common.ApiErrorMsg(c, "无效的代理商ID")
		return
	}
	agent, err := model.GetAgentById(id)
	if err != nil {
		common.ApiErrorMsg(c, "代理商不存在")
		return
	}
	common.ApiSuccess(c, agent)
}

// ToggleAgentStatus 启用/禁用代理商（管理员）
func ToggleAgentStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		common.ApiErrorMsg(c, "无效的代理商ID")
		return
	}

	var req struct {
		Status int `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}
	if req.Status != common.UserStatusEnabled && req.Status != common.UserStatusDisabled {
		common.ApiErrorMsg(c, "无效的状态值，1=启用 2=禁用")
		return
	}

	if err := model.SetAgentStatus(id, req.Status); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

// DeleteAgent 删除代理商（管理员）
func DeleteAgent(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		common.ApiErrorMsg(c, "无效的代理商ID")
		return
	}

	if err := model.DeleteAgent(id); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}
