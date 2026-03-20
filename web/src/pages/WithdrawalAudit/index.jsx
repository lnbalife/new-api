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
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Tag,
  Typography,
  Tabs,
  TabPane,
  Descriptions,
} from '@douyinfe/semi-ui';
import { CheckCircle, XCircle } from 'lucide-react';
import { API, showError, showSuccess, timestamp2string } from '../../helpers';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const WithdrawalAudit = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [activeTab, setActiveTab] = useState('0'); // 0=pending, 1=approved, 2=rejected
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    total: 0,
  });
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [auditAction, setAuditAction] = useState(null); // 'approve' or 'reject'
  const formApi = React.useRef();

  useEffect(() => {
    loadWithdrawals(1);
  }, [activeTab]);

  const loadWithdrawals = async (page) => {
    setLoading(true);
    try {
      const status = activeTab === 'all' ? '' : activeTab;
      const res = await API.get(`/api/commission/admin/withdrawals?p=${page - 1}&status=${status}`);
      const { success, data } = res.data;
      if (success) {
        setWithdrawals(data.items || []);
        setPagination({
          currentPage: page,
          pageSize: data.page_size || 10,
          total: data.total || 0,
        });
      }
    } catch (error) {
      showError(t('加载提现记录失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (record) => {
    setSelectedWithdrawal(record);
    setAuditAction('approve');
    setAuditModalVisible(true);
  };

  const handleReject = (record) => {
    setSelectedWithdrawal(record);
    setAuditAction('reject');
    setAuditModalVisible(true);
  };

  const handleAuditSubmit = async () => {
    const values = formApi.current.getValues();

    if (auditAction === 'reject' && !values.reject_reason) {
      showError(t('请填写驳回原因'));
      return;
    }

    try {
      const res = await API.post(`/api/commission/admin/withdrawals/${selectedWithdrawal.id}/audit`, {
        approved: auditAction === 'approve',
        reject_reason: values.reject_reason || '',
      });

      const { success, message } = res.data;
      if (success) {
        showSuccess(auditAction === 'approve' ? t('审核通过') : t('已驳回'));
        setAuditModalVisible(false);
        loadWithdrawals(pagination.currentPage);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('审核失败'));
    }
  };

  const formatMoney = (cents) => {
    return `¥${(cents / 100).toFixed(2)}`;
  };

  const getStatusTag = (status) => {
    const statusMap = {
      0: { text: t('待审核'), color: 'orange' },
      1: { text: t('已通过'), color: 'green' },
      2: { text: t('已驳回'), color: 'red' },
    };
    const statusInfo = statusMap[status] || { text: t('未知'), color: 'grey' };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  const columns = [
    {
      title: t('提现单号'),
      dataIndex: 'withdrawal_no',
      key: 'withdrawal_no',
      width: 200,
    },
    {
      title: t('用户'),
      dataIndex: 'username',
      key: 'username',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: t('提现金额'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => <Text strong>{formatMoney(amount)}</Text>,
    },
    {
      title: t('手续费'),
      dataIndex: 'fee',
      key: 'fee',
      render: (fee) => <Text type='tertiary'>{formatMoney(fee)}</Text>,
    },
    {
      title: t('实际到账'),
      dataIndex: 'actual_amount',
      key: 'actual_amount',
      render: (amount) => (
        <Text strong type='success'>
          {formatMoney(amount)}
        </Text>
      ),
    },
    {
      title: t('银行信息'),
      key: 'bank_info',
      render: (_, record) => (
        <div>
          <div>{record.bank_name}</div>
          <Text type='tertiary' size='small'>{record.bank_account}</Text>
        </div>
      ),
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: t('申请时间'),
      dataIndex: 'create_time',
      key: 'create_time',
      render: (time) => <Text type='tertiary'>{timestamp2string(time)}</Text>,
    },
    {
      title: t('操作'),
      key: 'action',
      render: (_, record) => {
        if (record.status !== 0) {
          return <Text type='tertiary'>-</Text>;
        }
        return (
          <Space>
            <Button
              icon={<CheckCircle size={16} />}
              size='small'
              type='primary'
              onClick={() => handleApprove(record)}
            >
              {t('通过')}
            </Button>
            <Button
              icon={<XCircle size={16} />}
              size='small'
              type='danger'
              onClick={() => handleReject(record)}
            >
              {t('驳回')}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div className='mt-[60px] px-2'>
      <Card>
        <Title heading={3} style={{ marginBottom: 24 }}>
          {t('提现审核')}
        </Title>

        <Tabs
          type='line'
          activeKey={activeTab}
          onChange={setActiveTab}
        >
          <TabPane tab={t('待审核')} itemKey='0'>
            <Table
              columns={columns}
              dataSource={withdrawals}
              pagination={{
                currentPage: pagination.currentPage,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onPageChange: loadWithdrawals,
              }}
              loading={loading}
            />
          </TabPane>
          <TabPane tab={t('已通过')} itemKey='1'>
            <Table
              columns={columns}
              dataSource={withdrawals}
              pagination={{
                currentPage: pagination.currentPage,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onPageChange: loadWithdrawals,
              }}
              loading={loading}
            />
          </TabPane>
          <TabPane tab={t('已驳回')} itemKey='2'>
            <Table
              columns={columns}
              dataSource={withdrawals}
              pagination={{
                currentPage: pagination.currentPage,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onPageChange: loadWithdrawals,
              }}
              loading={loading}
            />
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        visible={auditModalVisible}
        onCancel={() => setAuditModalVisible(false)}
        title={auditAction === 'approve' ? t('审核通过') : t('驳回申请')}
        footer={
          <Space>
            <Button onClick={() => setAuditModalVisible(false)}>{t('取消')}</Button>
            <Button
              theme='solid'
              type={auditAction === 'approve' ? 'primary' : 'danger'}
              onClick={handleAuditSubmit}
            >
              {t('确认')}
            </Button>
          </Space>
        }
      >
        {selectedWithdrawal && (
          <>
            <Descriptions row style={{ marginBottom: 16 }}>
              <Descriptions.Item itemKey={t('提现单号')}>
                {selectedWithdrawal.withdrawal_no}
              </Descriptions.Item>
              <Descriptions.Item itemKey={t('用户')}>
                {selectedWithdrawal.username}
              </Descriptions.Item>
              <Descriptions.Item itemKey={t('提现金额')}>
                {formatMoney(selectedWithdrawal.amount)}
              </Descriptions.Item>
              <Descriptions.Item itemKey={t('手续费')}>
                {formatMoney(selectedWithdrawal.fee)}
              </Descriptions.Item>
              <Descriptions.Item itemKey={t('实际到账')}>
                {formatMoney(selectedWithdrawal.actual_amount)}
              </Descriptions.Item>
              <Descriptions.Item itemKey={t('银行名称')}>
                {selectedWithdrawal.bank_name}
              </Descriptions.Item>
              <Descriptions.Item itemKey={t('银行账号')}>
                {selectedWithdrawal.bank_account}
              </Descriptions.Item>
              <Descriptions.Item itemKey={t('账户名')}>
                {selectedWithdrawal.account_name}
              </Descriptions.Item>
            </Descriptions>

            {auditAction === 'reject' && (
              <Form getFormApi={(api) => (formApi.current = api)}>
                <Form.TextArea
                  field='reject_reason'
                  label={t('驳回原因')}
                  placeholder={t('请输入驳回原因')}
                  rules={[{ required: true, message: t('请输入驳回原因') }]}
                  maxCount={500}
                />
              </Form>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default WithdrawalAudit;
