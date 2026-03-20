package controller

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

// ===== 身份等级管理 =====

// GetIdentityLevels 获取所有身份等级
func GetIdentityLevels(c *gin.Context) {
	levels, err := model.GetAllIdentityLevels()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, levels)
}

// CreateIdentityLevel 创建身份等级
func CreateIdentityLevel(c *gin.Context) {
	var level model.IdentityLevel
	if err := c.ShouldBindJSON(&level); err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	if level.Name == "" {
		common.ApiErrorMsg(c, "身份名称不能为空")
		return
	}

	if level.CommissionRate < 0 || level.CommissionRate > 1 {
		common.ApiErrorMsg(c, "佣金比例必须在0-1之间")
		return
	}

	// 强制设置 is_default 为 false，默认身份由程序初始化时创建
	level.IsDefault = false

	if err := level.Insert(); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, level)
}

// UpdateIdentityLevel 更新身份等级
func UpdateIdentityLevel(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var level model.IdentityLevel
	if err := c.ShouldBindJSON(&level); err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	level.Id = id
	if err := level.Update(); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, level)
}

// DeleteIdentityLevel 删除身份等级
func DeleteIdentityLevel(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	// 检查是否是默认身份
	var level model.IdentityLevel
	if err := model.DB.Where("id = ?", id).First(&level).Error; err != nil {
		common.ApiError(c, err)
		return
	}

	if level.IsDefault {
		common.ApiErrorMsg(c, "不能删除默认身份")
		return
	}

	// 检查是否有用户正在使用此身份
	var count int64
	if err := model.DB.Model(&model.User{}).Where("identity_level_id = ?", id).Count(&count).Error; err != nil {
		common.ApiError(c, err)
		return
	}

	if count > 0 {
		common.ApiErrorMsg(c, "该身份等级正在被用户使用，无法删除")
		return
	}

	if err := model.DB.Delete(&model.IdentityLevel{}, id).Error; err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, nil)
}

// SetUserIdentity 设置用户身份等级
func SetUserIdentity(c *gin.Context) {
	userId, _ := strconv.Atoi(c.Param("userId"))
	var req struct {
		IdentityLevelId int `json:"identity_level_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	// 检查身份等级是否存在
	var level model.IdentityLevel
	if err := model.DB.Where("id = ?", req.IdentityLevelId).First(&level).Error; err != nil {
		common.ApiErrorMsg(c, "身份等级不存在")
		return
	}

	// 直接更新用户表的 identity_level_id 字段
	if err := model.DB.Model(&model.User{}).Where("id = ?", userId).Update("identity_level_id", req.IdentityLevelId).Error; err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{
		"user_id":           userId,
		"identity_level_id": req.IdentityLevelId,
	})
}

// ===== 佣金钱包管理 =====

// GetCommissionWallet 获取用户佣金钱包
func GetCommissionWallet(c *gin.Context) {
	userId := c.GetInt("id")

	wallet, err := model.GetOrCreateCommissionWallet(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	// 获取用户身份等级
	identityLevel, _ := model.GetUserIdentityLevel(userId)

	data := gin.H{
		"wallet":         wallet,
		"identity_level": identityLevel,
	}

	common.ApiSuccess(c, data)
}

// GetCommissionRecords 获取佣金记录
func GetCommissionRecords(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)

	records, total, err := model.GetCommissionRecords(userId, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(records)
	common.ApiSuccess(c, pageInfo)
}

// GetWithdrawalRecords 获取提现记录
func GetWithdrawalRecords(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)

	records, total, err := model.GetWithdrawalRecords(userId, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(records)
	common.ApiSuccess(c, pageInfo)
}

// ===== 提现管理 =====

// CreateWithdrawal 创建提现申请
func CreateWithdrawal(c *gin.Context) {
	userId := c.GetInt("id")
	var req struct {
		Amount int64 `json:"amount"` // 单位：分
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	if req.Amount <= 0 {
		common.ApiErrorMsg(c, "提现金额必须大于0")
		return
	}

	withdrawal, err := model.CreateWithdrawal(userId, req.Amount)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, withdrawal)
}

// GetWithdrawalSetting 获取提现设置
func GetWithdrawalSetting(c *gin.Context) {
	setting, err := model.GetWithdrawalSetting()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, setting)
}

// UpdateWithdrawalSetting 更新提现设置（管理员）
func UpdateWithdrawalSetting(c *gin.Context) {
	var setting model.WithdrawalSetting
	if err := c.ShouldBindJSON(&setting); err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	if err := model.DB.Save(&setting).Error; err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, setting)
}

// ===== 实名认证 =====

// SubmitKYC 提交实名认证
func SubmitKYC(c *gin.Context) {
	userId := c.GetInt("id")
	var kyc model.UserKYC
	if err := c.ShouldBindJSON(&kyc); err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	kyc.UserId = userId
	kyc.Status = 0 // 待审核

	// 检查是否已提交
	var existingKYC model.UserKYC
	err := model.DB.Where("user_id = ?", userId).First(&existingKYC).Error
	if err == nil {
		// 已存在，更新
		kyc.Id = existingKYC.Id
		if err := kyc.Update(); err != nil {
			common.ApiError(c, err)
			return
		}
	} else {
		// 新建
		if err := kyc.Insert(); err != nil {
			common.ApiError(c, err)
			return
		}
	}

	common.ApiSuccess(c, kyc)
}

// GetKYCStatus 获取实名认证状态
func GetKYCStatus(c *gin.Context) {
	userId := c.GetInt("id")
	kyc, err := model.GetUserKYC(userId)
	if err != nil {
		common.ApiSuccess(c, gin.H{"status": -1}) // 未提交
		return
	}
	common.ApiSuccess(c, kyc)
}

// ===== 管理员审核 =====

// GetAllWithdrawals 获取所有提现申请（管理员）
func GetAllWithdrawals(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	statusStr := c.Query("status")

	var status *int
	if statusStr != "" {
		s, _ := strconv.Atoi(statusStr)
		status = &s
	}

	records, total, err := model.GetAllWithdrawalRecords(status, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(records)
	common.ApiSuccess(c, pageInfo)
}

// AuditWithdrawal 审核提现申请（管理员）
func AuditWithdrawal(c *gin.Context) {
	auditorId := c.GetInt("id")
	withdrawalId, _ := strconv.Atoi(c.Param("id"))

	var req struct {
		Approved     bool   `json:"approved"`
		RejectReason string `json:"reject_reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	if !req.Approved && req.RejectReason == "" {
		common.ApiErrorMsg(c, "驳回必须填写原因")
		return
	}

	err := model.AuditWithdrawal(withdrawalId, auditorId, req.Approved, req.RejectReason)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, nil)
}
