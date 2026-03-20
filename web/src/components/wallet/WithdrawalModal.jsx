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

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Button,
  Space,
  Typography,
  Descriptions,
  Banner,
  Spin,
} from '@douyinfe/semi-ui';
import { API, showError, showSuccess } from '../../helpers';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const WithdrawalModal = ({ visible, onCancel, onSuccess, availableAmount }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState(null);
  const [withdrawalSetting, setWithdrawalSetting] = useState(null);
  const [amount, setAmount] = useState(0);
  const [calculatedFee, setCalculatedFee] = useState(0);
  const [actualAmount, setActualAmount] = useState(0);

  useEffect(() => {
    if (visible) {
      loadKycStatus();
      loadWithdrawalSetting();
    }
  }, [visible]);

  useEffect(() => {
    if (withdrawalSetting && amount > 0) {
      const amountInCents = amount * 100;
      const fee = Math.floor(amountInCents * withdrawalSetting.fee) + withdrawalSetting.fixed_fee;
      const actual = amountInCents - fee;
      setCalculatedFee(fee);
      setActualAmount(actual);
    } else {
      setCalculatedFee(0);
      setActualAmount(0);
    }
  }, [amount, withdrawalSetting]);

  const loadKycStatus = async () => {
    try {
      const res = await API.get('/api/user/kyc/status');
      const { success, data } = res.data;
      if (success) {
        setKycStatus(data);
      }
    } catch (error) {
      showError(t('加载实名认证状态失败'));
    }
  };

  const loadWithdrawalSetting = async () => {
    try {
      const res = await API.get('/api/user/withdrawal/setting');
      const { success, data } = res.data;
      if (success) {
        setWithdrawalSetting(data);
      }
    } catch (error) {
      showError(t('加载提现设置失败'));
    }
  };

  const handleSubmit = async () => {
    if (!kycStatus || kycStatus.status !== 1) {
      showError(t('请先完成实名认证'));
      return;
    }

    if (!amount || amount <= 0) {
      showError(t('请输入提现金额'));
      return;
    }

    const amountInCents = amount * 100;
    const minAmount = withdrawalSetting?.min_amount || 10000;

    if (amountInCents < minAmount) {
      showError(t('提现金额不能小于') + ` ¥${(minAmount / 100).toFixed(2)}`);
      return;
    }

    if (amountInCents > availableAmount) {
      showError(t('提现金额不能大于可用余额'));
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/api/user/withdrawal', {
        amount: amountInCents,
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('提现申请已提交'));
        onSuccess();
        onCancel();
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('提现申请失败'));
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (cents) => {
    return `¥${(cents / 100).toFixed(2)}`;
  };

  if (!kycStatus || !withdrawalSetting) {
    return (
      <Modal
        visible={visible}
        onCancel={onCancel}
        title={t('申请提现')}
        footer={null}
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size='large' />
        </div>
      </Modal>
    );
  }

  const isKycVerified = kycStatus.status === 1;

  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      title={t('申请提现')}
      footer={
        <Space>
          <Button onClick={onCancel}>{t('取消')}</Button>
          <Button
            theme='solid'
            type='primary'
            onClick={handleSubmit}
            loading={loading}
            disabled={!isKycVerified || !withdrawalSetting.enabled}
          >
            {t('提交申请')}
          </Button>
        </Space>
      }
    >
      {!withdrawalSetting.enabled && (
        <Banner
          type='warning'
          description={t('提现功能暂未开放')}
          style={{ marginBottom: 16 }}
        />
      )}

      {!isKycVerified && (
        <Banner
          type='warning'
          description={t('请先完成实名认证才能提现')}
          style={{ marginBottom: 16 }}
        />
      )}

      {isKycVerified && (
        <Descriptions
          row
          style={{ marginBottom: 24 }}
        >
          <Descriptions.Item itemKey={t('真实姓名')}>
            {kycStatus.real_name}
          </Descriptions.Item>
          <Descriptions.Item itemKey={t('银行名称')}>
            {kycStatus.bank_name}
          </Descriptions.Item>
          <Descriptions.Item itemKey={t('银行账号')}>
            {kycStatus.bank_account}
          </Descriptions.Item>
        </Descriptions>
      )}

      <Form labelPosition='left' labelWidth={120}>
        <Form.Input
          field='available'
          label={t('可提现余额')}
          disabled
          value={formatMoney(availableAmount)}
        />
        <Form.Input
          field='min_amount'
          label={t('最小提现金额')}
          disabled
          value={formatMoney(withdrawalSetting.min_amount)}
        />
        <Form.InputNumber
          field='amount'
          label={t('提现金额')}
          placeholder={t('请输入提现金额（元）')}
          value={amount}
          onChange={setAmount}
          min={0}
          max={availableAmount / 100}
          step={1}
          precision={2}
          prefix='¥'
          disabled={!isKycVerified}
        />
        <Form.Input
          field='fee'
          label={t('手续费')}
          disabled
          value={formatMoney(calculatedFee)}
          extra={
            <Text type='tertiary'>
              {t('手续费比例')}: {(withdrawalSetting.fee * 100).toFixed(2)}%
              {withdrawalSetting.fixed_fee > 0 &&
                ` + ${formatMoney(withdrawalSetting.fixed_fee)}`}
            </Text>
          }
        />
        <Form.Input
          field='actual_amount'
          label={t('实际到账')}
          disabled
          value={formatMoney(actualAmount)}
        />
      </Form>

      {withdrawalSetting.withdrawal_days && (
        <Banner
          type='info'
          description={
            withdrawalSetting.withdrawal_type === 1
              ? t('每月') + ` ${withdrawalSetting.withdrawal_days} ` + t('号可提现')
              : t('每周') + ` ${withdrawalSetting.withdrawal_days} ` + t('可提现')
          }
          style={{ marginTop: 16 }}
        />
      )}
    </Modal>
  );
};

export default WithdrawalModal;
