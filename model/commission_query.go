package model

import (
	"errors"
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

// GetCommissionRecords 获取用户佣金记录
func GetCommissionRecords(userId int, pageInfo *common.PageInfo) (records []*CommissionRecord, total int64, err error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	err = tx.Model(&CommissionRecord{}).Where("user_id = ? AND status = ?", userId, 1).Count(&total).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	err = tx.Where("user_id = ? AND status = ?", userId, 1).
		Order("id desc").
		Limit(pageInfo.GetPageSize()).
		Offset(pageInfo.GetStartIdx()).
		Find(&records).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}

	// 填充被邀请人用户名
	for _, record := range records {
		username, _ := GetUsernameById(record.InviteeId, false)
		record.InviteeName = username
	}

	return records, total, nil
}

// GetWithdrawalRecords 获取用户提现记录
func GetWithdrawalRecords(userId int, pageInfo *common.PageInfo) (records []*WithdrawalRecord, total int64, err error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	err = tx.Model(&WithdrawalRecord{}).Where("user_id = ?", userId).Count(&total).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	err = tx.Where("user_id = ?", userId).
		Order("id desc").
		Limit(pageInfo.GetPageSize()).
		Offset(pageInfo.GetStartIdx()).
		Find(&records).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}

	return records, total, nil
}

// GetAllWithdrawalRecords 管理员获取所有提现记录
func GetAllWithdrawalRecords(status *int, pageInfo *common.PageInfo) (records []*WithdrawalRecord, total int64, err error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	query := tx.Model(&WithdrawalRecord{})
	if status != nil {
		query = query.Where("status = ?", *status)
	}

	err = query.Count(&total).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	err = query.Order("id desc").
		Limit(pageInfo.GetPageSize()).
		Offset(pageInfo.GetStartIdx()).
		Find(&records).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}

	// 填充用户名
	for _, record := range records {
		username, _ := GetUsernameById(record.UserId, false)
		record.Username = username
	}

	return records, total, nil
}

// CreateWithdrawal 创建提现申请
func CreateWithdrawal(userId int, amount int64) (*WithdrawalRecord, error) {
	// 检查用户KYC状态
	kyc, err := GetUserKYC(userId)
	if err != nil || kyc.Status != 1 {
		return nil, errors.New("请先完成实名认证")
	}

	// 获取提现设置
	setting, err := GetWithdrawalSetting()
	if err != nil || !setting.Enabled {
		return nil, errors.New("提现功能暂未开放")
	}

	// 检查最小提现金额
	if amount < setting.MinAmount {
		return nil, fmt.Errorf("提现金额不能小于 %.2f 元", float64(setting.MinAmount)/100)
	}

	// 计算手续费
	fee := int64(float64(amount) * setting.Fee)
	if setting.FixedFee > 0 {
		fee += setting.FixedFee
	}
	actualAmount := amount - fee

	var withdrawal *WithdrawalRecord

	err = DB.Transaction(func(tx *gorm.DB) error {
		// 获取用户钱包
		wallet, err := GetOrCreateCommissionWallet(userId)
		if err != nil {
			return err
		}

		// 检查可用余额
		if wallet.AvailableCommission < amount {
			return errors.New("可提现余额不足")
		}

		// 冻结金额
		err = tx.Model(&CommissionWallet{}).
			Where("user_id = ? AND available_commission >= ?", userId, amount).
			Updates(map[string]interface{}{
				"available_commission": gorm.Expr("available_commission - ?", amount),
				"frozen_commission":    gorm.Expr("frozen_commission + ?", amount),
				"update_time":          common.GetTimestamp(),
			}).Error
		if err != nil {
			return err
		}

		// 生成提现单号
		withdrawalNo := fmt.Sprintf("WD%d%d", common.GetTimestamp(), userId)

		// 创建提现记录
		withdrawal = &WithdrawalRecord{
			UserId:       userId,
			WithdrawalNo: withdrawalNo,
			Amount:       amount,
			Fee:          fee,
			ActualAmount: actualAmount,
			BankName:     kyc.BankName,
			BankAccount:  kyc.BankAccount,
			AccountName:  kyc.RealName,
			Status:       0, // 待审核
			CreateTime:   common.GetTimestamp(),
			UpdateTime:   common.GetTimestamp(),
		}

		return tx.Create(withdrawal).Error
	})

	return withdrawal, err
}

// AuditWithdrawal 审核提现申请
func AuditWithdrawal(withdrawalId int, auditorId int, approved bool, rejectReason string) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		var withdrawal WithdrawalRecord
		err := tx.Where("id = ?", withdrawalId).First(&withdrawal).Error
		if err != nil {
			return err
		}

		if withdrawal.Status != 0 {
			return errors.New("该提现申请已处理")
		}

		if approved {
			// 通过审核
			withdrawal.Status = 1
			withdrawal.AuditorId = auditorId
			withdrawal.AuditTime = common.GetTimestamp()
			withdrawal.UpdateTime = common.GetTimestamp()

			// 更新钱包：冻结金额转为已提现
			err = tx.Model(&CommissionWallet{}).
				Where("user_id = ?", withdrawal.UserId).
				Updates(map[string]interface{}{
					"frozen_commission":    gorm.Expr("frozen_commission - ?", withdrawal.Amount),
					"withdrawn_commission": gorm.Expr("withdrawn_commission + ?", withdrawal.Amount),
					"update_time":          common.GetTimestamp(),
				}).Error
			if err != nil {
				return err
			}
		} else {
			// 驳回审核
			withdrawal.Status = 2
			withdrawal.AuditorId = auditorId
			withdrawal.AuditTime = common.GetTimestamp()
			withdrawal.RejectReason = rejectReason
			withdrawal.UpdateTime = common.GetTimestamp()

			// 解冻金额
			err = tx.Model(&CommissionWallet{}).
				Where("user_id = ?", withdrawal.UserId).
				Updates(map[string]interface{}{
					"available_commission": gorm.Expr("available_commission + ?", withdrawal.Amount),
					"frozen_commission":    gorm.Expr("frozen_commission - ?", withdrawal.Amount),
					"update_time":          common.GetTimestamp(),
				}).Error
			if err != nil {
				return err
			}
		}

		return tx.Save(&withdrawal).Error
	})
}

// CalculateYesterdayCommission 计算昨日佣金（定时任务调用）
func CalculateYesterdayCommission() error {
	// 获取昨天的时间范围
	now := common.GetTimestamp()
	yesterdayStart := now - 86400
	yesterdayEnd := now

	// 查询所有有佣金记录的用户
	var userIds []int
	err := DB.Model(&CommissionRecord{}).
		Where("create_time >= ? AND create_time < ? AND status = ?", yesterdayStart, yesterdayEnd, 1).
		Distinct("user_id").
		Pluck("user_id", &userIds).Error
	if err != nil {
		return err
	}

	// 更新每个用户的昨日佣金
	for _, userId := range userIds {
		var yesterdayTotal int64
		err = DB.Model(&CommissionRecord{}).
			Where("user_id = ? AND create_time >= ? AND create_time < ? AND status = ?", userId, yesterdayStart, yesterdayEnd, 1).
			Select("COALESCE(SUM(commission_amount), 0)").
			Scan(&yesterdayTotal).Error
		if err != nil {
			continue
		}

		DB.Model(&CommissionWallet{}).
			Where("user_id = ?", userId).
			Updates(map[string]interface{}{
				"yesterday_commission":  yesterdayTotal,
				"last_calculate_time":   now,
				"update_time":           now,
			})
	}

	return nil
}
