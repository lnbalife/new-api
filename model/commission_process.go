package model

import (
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

// ProcessCommission 处理佣金发放（新版本）
func ProcessCommission(tx *gorm.DB, topUp *TopUp, actualPayAmount float64) error {
	common.SysError("ProcessCommission: start")
	// 获取充值用户信息
	var user User
	err := tx.Where("id = ?", topUp.UserId).First(&user).Error
	if err != nil || user.InviterId == 0 {
		common.SysError("process commission failed: no invite user")
		return nil // 没有邀请人，不处理佣金
	}

	// 获取邀请人的身份等级
	identityLevel, err := GetUserIdentityLevel(user.InviterId)
	if err != nil || identityLevel.CommissionRate <= 0 {
		common.SysError("process commission failed: invite user commission rate=0")
		return nil // 没有身份等级或佣金比例为0
	}

	// 检查订单佣金记录是否存在
	commissionRecord, _ := GetCommissionRecord(topUp.Id)
	if commissionRecord != nil {
		common.SysError("process commission failed: commission record already exists")
		return nil // 佣金记录存在就不处理
	}

	// 计算佣金（按实际支付金额的分计算，避免浮点数精度问题）
	actualPayCents := int64(actualPayAmount * 100) // 转换为分
	commissionCents := int64(float64(actualPayCents) * identityLevel.CommissionRate)

	if commissionCents <= 0 {
		common.SysError("process commission failed: commissionCents <= 0")
		common.SysError(fmt.Sprintf("actualPayAmount=%.2f, actualPayCents=%d, commissionRate=%.2f, commissionCents=%d", actualPayAmount,actualPayCents, identityLevel.CommissionRate, commissionCents))
		return nil
	}

	// 获取或创建邀请人的佣金钱包
	_, err = GetOrCreateCommissionWallet(user.InviterId)
	if err != nil {
		common.SysError(fmt.Sprintf("process commission failed: get or create commission wallet error:%v", err))
		return err
	}

	// 更新钱包余额
	err = tx.Model(&CommissionWallet{}).
		Where("user_id = ?", user.InviterId).
		Updates(map[string]interface{}{
			"total_commission":     gorm.Expr("total_commission + ?", commissionCents),
			"available_commission": gorm.Expr("available_commission + ?", commissionCents),
			"update_time":          common.GetTimestamp(),
		}).Error
	if err != nil {
		common.SysError(fmt.Sprintf("process commission failed: update commission wallet error:%v", err))
		return err
	}

	// 记录佣金明细
	record := &CommissionRecord{
		UserId:           user.InviterId,
		InviteeId:        topUp.UserId,
		TopUpId:          topUp.Id,
		TradeNo:          topUp.TradeNo,
		PaymentMethod:    topUp.PaymentMethod,
		ActualAmount:     actualPayCents,
		CommissionAmount: commissionCents,
		CommissionRate:   identityLevel.CommissionRate,
		IdentityLevelId:  identityLevel.Id,
		IdentityName:     identityLevel.Name,
		Status:           1,
		CreateTime:       common.GetTimestamp(),
	}
	err = tx.Create(record).Error
	if err != nil {
		common.SysError(fmt.Sprintf("process commission failed: create commission record error:%v", err))
		return err
	}

	// 记录日志
	RecordLog(user.InviterId, LogTypeSystem,
		fmt.Sprintf("获得邀请充值佣金: ¥%.2f (被邀请人充值: ¥%.2f, 佣金比例: %.1f%%)",
			float64(commissionCents)/100,
			actualPayAmount,
			identityLevel.CommissionRate*100))

	return nil
}
