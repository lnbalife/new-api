package model

import (
	"github.com/QuantumNous/new-api/common"
)

// IdentityLevel 身份等级表
type IdentityLevel struct {
	Id                 int     `json:"id"`
	Name               string  `json:"name" gorm:"type:varchar(50);not null"`                // 身份名称
	CommissionRate     float64 `json:"commission_rate" gorm:"type:decimal(5,4);default:0"`   // 佣金比例 (0-1)
	Description        string  `json:"description" gorm:"type:varchar(255)"`                 // 描述
	IsDefault          bool    `json:"is_default" gorm:"default:false"`                      // 是否默认身份
	Status             int     `json:"status" gorm:"type:int;default:1"`                     // 状态：1启用 0禁用
	CreateTime         int64   `json:"create_time"`
	UpdateTime         int64   `json:"update_time"`
}

// CommissionWallet 佣金钱包表
type CommissionWallet struct {
	Id                    int   `json:"id"`
	UserId                int   `json:"user_id" gorm:"uniqueIndex;not null"`           // 用户ID
	TotalCommission       int64 `json:"total_commission" gorm:"default:0"`             // 累计佣金（单位：分）
	AvailableCommission   int64 `json:"available_commission" gorm:"default:0"`         // 可提现佣金
	WithdrawnCommission   int64 `json:"withdrawn_commission" gorm:"default:0"`         // 已提现佣金
	FrozenCommission      int64 `json:"frozen_commission" gorm:"default:0"`            // 冻结佣金（提现审核中）
	YesterdayCommission   int64 `json:"yesterday_commission" gorm:"default:0"`         // 昨日佣金
	LastCalculateTime     int64 `json:"last_calculate_time"`                           // 上次计算昨日佣金时间
	CreateTime            int64 `json:"create_time"`
	UpdateTime            int64 `json:"update_time"`
}

// CommissionRecord 佣金记录表
type CommissionRecord struct {
	Id              int     `json:"id"`
	UserId          int     `json:"user_id" gorm:"index;not null"`                    // 获得佣金的用户ID
	InviteeId       int     `json:"invitee_id" gorm:"index"`                          // 被邀请人ID
	InviteeName     string  `json:"invitee_name" gorm:"-:all"`                        // 被邀请人用户名（不存数据库）
	TopUpId         int     `json:"topup_id" gorm:"index"`                            // 充值订单ID
	TradeNo         string  `json:"trade_no" gorm:"type:varchar(255);index"`          // 订单号
	PaymentMethod   string  `json:"payment_method" gorm:"type:varchar(50)"`           // 支付方式
	ActualAmount    int64   `json:"actual_amount"`                                    // 实际支付金额（分）
	CommissionAmount int64  `json:"commission_amount"`                                // 获得佣金（分）
	CommissionRate  float64 `json:"commission_rate" gorm:"type:decimal(5,4)"`         // 佣金比例
	IdentityLevelId int     `json:"identity_level_id" gorm:"index"`                   // 身份等级ID
	IdentityName    string  `json:"identity_name" gorm:"type:varchar(50)"`            // 身份名称（冗余）
	Status          int     `json:"status" gorm:"type:int;default:1"`                 // 状态：1正常 0已撤销
	CreateTime      int64   `json:"create_time"`
}

// WithdrawalRecord 提现记录表
type WithdrawalRecord struct {
	Id              int    `json:"id"`
	UserId          int    `json:"user_id" gorm:"index;not null"`                    // 用户ID
	Username        string `json:"username" gorm:"-:all"`                            // 用户名（不存数据库）
	WithdrawalNo    string `json:"withdrawal_no" gorm:"type:varchar(64);uniqueIndex"` // 提现单号
	Amount          int64  `json:"amount"`                                           // 提现金额（分）
	Fee             int64  `json:"fee"`                                              // 手续费（分）
	ActualAmount    int64  `json:"actual_amount"`                                    // 实际到账金额（分）
	BankName        string `json:"bank_name" gorm:"type:varchar(100)"`               // 银行名称
	BankAccount     string `json:"bank_account" gorm:"type:varchar(100)"`            // 银行账号
	AccountName     string `json:"account_name" gorm:"type:varchar(100)"`            // 账户名
	Status          int    `json:"status" gorm:"type:int;default:0;index"`           // 状态：0待审核 1已通过 2已驳回
	RejectReason    string `json:"reject_reason" gorm:"type:text"`                   // 驳回原因
	AuditorId       int    `json:"auditor_id"`                                       // 审核人ID
	AuditTime       int64  `json:"audit_time"`                                       // 审核时间
	CreateTime      int64  `json:"create_time"`
	UpdateTime      int64  `json:"update_time"`
}

// UserKYC 用户实名认证表
type UserKYC struct {
	Id              int    `json:"id"`
	UserId          int    `json:"user_id" gorm:"uniqueIndex;not null"`              // 用户ID
	RealName        string `json:"real_name" gorm:"type:varchar(100);not null"`      // 真实姓名
	IdCardNo        string `json:"id_card_no" gorm:"type:varchar(50);not null"`      // 身份证号
	BankName        string `json:"bank_name" gorm:"type:varchar(100)"`               // 银行名称
	BankAccount     string `json:"bank_account" gorm:"type:varchar(100)"`            // 银行账号
	BankBranch      string `json:"bank_branch" gorm:"type:varchar(200)"`             // 开户行
	Status          int    `json:"status" gorm:"type:int;default:0"`                 // 状态：0待审核 1已通过 2已驳回
	VerifyMethod    string `json:"verify_method" gorm:"type:varchar(50)"`            // 认证方式
	VerifyData      string `json:"verify_data" gorm:"type:text"`                     // 认证数据（JSON）
	CreateTime      int64  `json:"create_time"`
	UpdateTime      int64  `json:"update_time"`
}

// WithdrawalSetting 提现设置表
type WithdrawalSetting struct {
	Id                  int     `json:"id"`
	MinAmount           int64   `json:"min_amount" gorm:"default:10000"`              // 最小提现金额（分）
	Fee                 float64 `json:"fee" gorm:"type:decimal(5,4);default:0"`       // 手续费比例
	FixedFee            int64   `json:"fixed_fee" gorm:"default:0"`                   // 固定手续费（分）
	WithdrawalDays      string  `json:"withdrawal_days" gorm:"type:varchar(100)"`     // 可提现日期（如：1,15 表示每月1号和15号）
	WithdrawalType      int     `json:"withdrawal_type" gorm:"default:1"`             // 1:每月固定日期 2:每周固定日期
	Enabled             bool    `json:"enabled" gorm:"default:true"`                  // 是否启用提现
	CreateTime          int64   `json:"create_time"`
	UpdateTime          int64   `json:"update_time"`
}

func (identityLevel *IdentityLevel) Insert() error {
	identityLevel.CreateTime = common.GetTimestamp()
	identityLevel.UpdateTime = common.GetTimestamp()
	return DB.Create(identityLevel).Error
}

func (identityLevel *IdentityLevel) Update() error {
	identityLevel.UpdateTime = common.GetTimestamp()
	return DB.Save(identityLevel).Error
}

func (wallet *CommissionWallet) Insert() error {
	wallet.CreateTime = common.GetTimestamp()
	wallet.UpdateTime = common.GetTimestamp()
	return DB.Create(wallet).Error
}

func (wallet *CommissionWallet) Update() error {
	wallet.UpdateTime = common.GetTimestamp()
	return DB.Save(wallet).Error
}

func (record *CommissionRecord) Insert() error {
	record.CreateTime = common.GetTimestamp()
	return DB.Create(record).Error
}

func (withdrawal *WithdrawalRecord) Insert() error {
	withdrawal.CreateTime = common.GetTimestamp()
	withdrawal.UpdateTime = common.GetTimestamp()
	return DB.Create(withdrawal).Error
}

func (withdrawal *WithdrawalRecord) Update() error {
	withdrawal.UpdateTime = common.GetTimestamp()
	return DB.Save(withdrawal).Error
}

func (kyc *UserKYC) Insert() error {
	kyc.CreateTime = common.GetTimestamp()
	kyc.UpdateTime = common.GetTimestamp()
	return DB.Create(kyc).Error
}

func (kyc *UserKYC) Update() error {
	kyc.UpdateTime = common.GetTimestamp()
	return DB.Save(kyc).Error
}

// GetCommissionRecord 获取订单佣金记录
func GetCommissionRecord(topUpId int) (*CommissionRecord, error) {
	var record CommissionRecord
	err := DB.Where("top_up_id = ?", topUpId).First(&record).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

// GetOrCreateCommissionWallet 获取或创建用户佣金钱包
func GetOrCreateCommissionWallet(userId int) (*CommissionWallet, error) {
	var wallet CommissionWallet
	err := DB.Where("user_id = ?", userId).First(&wallet).Error
	if err != nil {
		if err.Error() == "record not found" {
			wallet = CommissionWallet{
				UserId:     userId,
				CreateTime: common.GetTimestamp(),
				UpdateTime: common.GetTimestamp(),
			}
			err = DB.Create(&wallet).Error
			if err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}
	return &wallet, nil
}

// GetUserIdentityLevel 获取用户身份等级
func GetUserIdentityLevel(userId int) (*IdentityLevel, error) {
	var user User
	err := DB.Where("id = ?", userId).First(&user).Error
	if err != nil {
		return nil, err
	}

	// 如果用户没有设置身份等级，返回默认身份
	if user.IdentityLevelId == 0 {
		var defaultLevel IdentityLevel
		err = DB.Where("is_default = ?", true).First(&defaultLevel).Error
		if err != nil {
			return nil, err
		}
		return &defaultLevel, nil
	}

	var level IdentityLevel
	err = DB.Where("id = ?", user.IdentityLevelId).First(&level).Error
	return &level, err
}

// GetAllIdentityLevels 获取所有身份等级
func GetAllIdentityLevels() ([]*IdentityLevel, error) {
	var levels []*IdentityLevel
	err := DB.Order("commission_rate desc").Find(&levels).Error
	return levels, err
}

// GetUserKYC 获取用户实名认证信息
func GetUserKYC(userId int) (*UserKYC, error) {
	var kyc UserKYC
	err := DB.Where("user_id = ?", userId).First(&kyc).Error
	return &kyc, err
}

// GetWithdrawalSetting 获取提现设置
func GetWithdrawalSetting() (*WithdrawalSetting, error) {
	var setting WithdrawalSetting
	err := DB.First(&setting).Error
	if err != nil {
		// 如果没有设置，返回默认值
		setting = WithdrawalSetting{
			MinAmount:      10000, // 100元
			Fee:            0.01,  // 1%
			FixedFee:       0,
			WithdrawalDays: "1,15",
			WithdrawalType: 1,
			Enabled:        true,
		}
	}
	return &setting, nil
}
