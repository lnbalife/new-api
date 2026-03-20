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
  Typography,
  Table,
  Button,
  Space,
  Tabs,
  TabPane,
  Spin,
  Tag,
  Empty,
  Descriptions,
} from '@douyinfe/semi-ui';
import { Wallet as WalletIcon, TrendingUp, DollarSign, Calendar, Download } from 'lucide-react';
import { API, showError, timestamp2string } from '../../helpers';
import { useTranslation } from 'react-i18next';
import WithdrawalModal from '../../components/wallet/WithdrawalModal';
import KYCModal from '../../components/wallet/KYCModal';

const { Title, Text } = Typography;

const Wallet = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const [identityLevel, setIdentityLevel] = useState(null);
  const [commissionRecords, setCommissionRecords] = useState([]);
  const [withdrawalRecords, setWithdrawalRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('commission');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    total: 0,
  });
  const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false);
  const [kycModalVisible, setKycModalVisible] = useState(false);
  const [kycStatus, setKycStatus] = useState(null);

  useEffect(() => {
    loadWalletData();
    loadKycStatus();
  }, []);

  useEffect(() => {
    if (activeTab === 'commission') {
      loadCommissionRecords(1);
    } else {
      loadWithdrawalRecords(1);
    }
  }, [activeTab]);

  const loadWalletData = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/user/wallet');
      const { success, data } = res.data;
      if (success) {
        setWallet(data.wallet);
        setIdentityLevel(data.identity_level);
      }
    } catch (error) {
      showError(t('加载钱包数据失败'));
    } finally {
      setLoading(false);
    }
  };

  const loadKycStatus = async () => {
    try {
      const res = await API.get('/api/user/kyc/status');
      const { success, data } = res.data;
      if (success) {
        setKycStatus(data);
      }
    } catch (error) {
      // KYC not submitted yet, ignore error
    }
  };

  const handleWithdrawalClick = () => {
    if (!kycStatus || kycStatus.status !== 1) {
      setKycModalVisible(true);
    } else {
      setWithdrawalModalVisible(true);
    }
  };

  const handleWithdrawalSuccess = () => {
    loadWalletData();
    loadWithdrawalRecords(1);
  };

  const handleKycSuccess = () => {
    loadKycStatus();
  };

  const loadCommissionRecords = async (page) => {
    setLoading(true);
    try {
      const res = await API.get(`/api/user/commission/records?p=${page - 1}`);
      const { success, data } = res.data;
      if (success) {
        setCommissionRecords(data.items || []);
        setPagination({
          currentPage: page,
          pageSize: data.page_size || 10,
          total: data.total || 0,
        });
      }
    } catch (error) {
      showError(t('加载佣金记录失败'));
    } finally {
      setLoading(false);
    }
  };

  const loadWithdrawalRecords = async (page) => {
    setLoading(true);
    try {
      const res = await API.get(`/api/user/withdrawal/records?p=${page - 1}`);
      const { success, data } = res.data;
      if (success) {
        setWithdrawalRecords(data.items || []);
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

  const handlePageChange = (page) => {
    if (activeTab === 'commission') {
      loadCommissionRecords(page);
    } else {
      loadWithdrawalRecords(page);
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

  const commissionColumns = [
    {
      title: t('被邀请人'),
      dataIndex: 'invitee_name',
      key: 'invitee_name',
      render: (text) => <Text>{text || '-'}</Text>,
    },
    {
      title: t('充值金额'),
      dataIndex: 'actual_amount',
      key: 'actual_amount',
      render: (amount) => <Text>{formatMoney(amount)}</Text>,
    },
    {
      title: t('佣金比例'),
      dataIndex: 'commission_rate',
      key: 'commission_rate',
      render: (rate) => <Tag color='blue'>{(rate * 100).toFixed(1)}%</Tag>,
    },
    {
      title: t('获得佣金'),
      dataIndex: 'commission_amount',
      key: 'commission_amount',
      render: (amount) => (
        <Text strong type='success'>
          {formatMoney(amount)}
        </Text>
      ),
    },
    {
      title: t('身份等级'),
      dataIndex: 'identity_name',
      key: 'identity_name',
      render: (text) => <Tag>{text}</Tag>,
    },
    {
      title: t('时间'),
      dataIndex: 'create_time',
      key: 'create_time',
      render: (time) => <Text type='tertiary'>{timestamp2string(time)}</Text>,
    },
  ];

  const withdrawalColumns = [
    {
      title: t('提现单号'),
      dataIndex: 'withdrawal_no',
      key: 'withdrawal_no',
      render: (text) => <Text>{text}</Text>,
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
  ];

  if (loading && !wallet) {
    return (
      <div className='mt-[60px] px-2 flex justify-center items-center h-96'>
        <Spin size='large' />
      </div>
    );
  }

  return (
    <div className='mt-[60px] px-2'>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title heading={3} style={{ margin: 0 }}>
          <Space>
            <WalletIcon size={24} />
            {t('我的钱包')}
          </Space>
        </Title>
        <Button
          theme='solid'
          type='primary'
          icon={<Download />}
          onClick={handleWithdrawalClick}
          disabled={!wallet || wallet.available_commission <= 0}
        >
          {t('申请提现')}
        </Button>
      </div>

      {/* 钱包统计卡片 */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
        <Card
          shadows='hover'
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <Space vertical align='start' style={{ width: '100%', color: 'white' }}>
            <Space>
              <Calendar size={20} />
              <Text style={{ color: 'white', opacity: 0.9 }}>{t('昨日佣金')}</Text>
            </Space>
            <Title heading={2} style={{ color: 'white', margin: 0 }}>
              {formatMoney(wallet?.yesterday_commission || 0)}
            </Title>
          </Space>
        </Card>

        <Card
          shadows='hover'
          style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}
        >
          <Space vertical align='start' style={{ width: '100%', color: 'white' }}>
            <Space>
              <TrendingUp size={20} />
              <Text style={{ color: 'white', opacity: 0.9 }}>{t('累计佣金')}</Text>
            </Space>
            <Title heading={2} style={{ color: 'white', margin: 0 }}>
              {formatMoney(wallet?.total_commission || 0)}
            </Title>
          </Space>
        </Card>

        <Card
          shadows='hover'
          style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}
        >
          <Space vertical align='start' style={{ width: '100%', color: 'white' }}>
            <Space>
              <DollarSign size={20} />
              <Text style={{ color: 'white', opacity: 0.9 }}>{t('可提现')}</Text>
            </Space>
            <Title heading={2} style={{ color: 'white', margin: 0 }}>
              {formatMoney(wallet?.available_commission || 0)}
            </Title>
          </Space>
        </Card>

        <Card
          shadows='hover'
          style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}
        >
          <Space vertical align='start' style={{ width: '100%', color: 'white' }}>
            <Space>
              <WalletIcon size={20} />
              <Text style={{ color: 'white', opacity: 0.9 }}>{t('已提现')}</Text>
            </Space>
            <Title heading={2} style={{ color: 'white', margin: 0 }}>
              {formatMoney(wallet?.withdrawn_commission || 0)}
            </Title>
          </Space>
        </Card>
      </div>

      {/* 身份等级信息 */}
      {identityLevel && (
        <Card title={t('身份等级')} style={{ marginBottom: 24 }}>
          <Descriptions row>
            <Descriptions.Item itemKey={t('等级名称')}>
              <Tag size='large' color='cyan'>
                {identityLevel.name}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item itemKey={t('佣金比例')}>
              <Text strong type='success'>
                {(identityLevel.commission_rate * 100).toFixed(1)}%
              </Text>
            </Descriptions.Item>
            <Descriptions.Item itemKey={t('等级说明')}>
              {identityLevel.description || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* 账单记录 */}
      <Card>
        <Tabs
          type='line'
          activeKey={activeTab}
          onChange={setActiveTab}
        >
          <TabPane tab={t('佣金明细')} itemKey='commission'>
            <Table
              columns={commissionColumns}
              dataSource={commissionRecords}
              pagination={{
                currentPage: pagination.currentPage,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onPageChange: handlePageChange,
              }}
              loading={loading}
              empty={<Empty description={t('暂无佣金记录')} />}
            />
          </TabPane>
          <TabPane tab={t('提现明细')} itemKey='withdrawal'>
            <Table
              columns={withdrawalColumns}
              dataSource={withdrawalRecords}
              pagination={{
                currentPage: pagination.currentPage,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onPageChange: handlePageChange,
              }}
              loading={loading}
              empty={<Empty description={t('暂无提现记录')} />}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Withdrawal Modal */}
      <WithdrawalModal
        visible={withdrawalModalVisible}
        onCancel={() => setWithdrawalModalVisible(false)}
        onSuccess={handleWithdrawalSuccess}
        availableAmount={wallet?.available_commission || 0}
      />

      {/* KYC Modal */}
      <KYCModal
        visible={kycModalVisible}
        onCancel={() => setKycModalVisible(false)}
        onSuccess={handleKycSuccess}
      />
    </div>
  );
};

export default Wallet;
