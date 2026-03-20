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
  Banner,
} from '@douyinfe/semi-ui';
import { Edit, Star, Info } from 'lucide-react';
import { API, showError, showSuccess } from '../../helpers';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const IdentityLevelManagement = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [levels, setLevels] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const formApi = React.useRef();

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/commission/admin/identity_levels');
      const { success, data } = res.data;
      if (success) {
        setLevels(data || []);
      }
    } catch (error) {
      showError(t('加载身份等级失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (level) => {
    // 将小数转换为百分比显示
    const levelForEdit = {
      ...level,
      commission_rate: parseFloat((level.commission_rate * 100).toFixed(2)),
    };
    setEditingLevel(levelForEdit);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const values = formApi.current.getValues();

    if (values.commission_rate === undefined || values.commission_rate === null) {
      showError(t('请输入佣金比例'));
      return;
    }

    if (values.commission_rate < 0 || values.commission_rate > 100) {
      showError(t('佣金比例必须在0-100之间'));
      return;
    }

    // 将百分比转换为小数
    const submitData = {
      ...editingLevel,
      commission_rate: values.commission_rate / 100,
      description: values.description,
    };

    try {
      const res = await API.put(
        `/api/commission/admin/identity_levels/${editingLevel.id}`,
        submitData,
      );
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('更新成功'));
        setModalVisible(false);
        loadLevels();
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('更新失败'));
    }
  };

  const levelTagColor = (id) => {
    if (id === 1) return 'blue';
    if (id === 2) return 'orange';
    if (id === 3) return 'purple';
    return 'grey';
  };

  const columns = [
    {
      title: t('ID'),
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: t('等级名称'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Tag color={levelTagColor(record.id)} size='large'>
            {text}
          </Tag>
          {record.is_default && (
            <Tag color='gold' icon={<Star size={12} />}>
              {t('默认')}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: t('默认分佣比例'),
      dataIndex: 'commission_rate',
      key: 'commission_rate',
      render: (rate) => (
        <Tag color='green' size='large'>
          {(rate * 100).toFixed(1)}%
        </Tag>
      ),
    },
    {
      title: t('等级说明'),
      dataIndex: 'description',
      key: 'description',
      render: (text) => <Text type='tertiary'>{text || '-'}</Text>,
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? t('启用') : t('禁用')}
        </Tag>
      ),
    },
    {
      title: t('操作'),
      key: 'action',
      render: (_, record) => (
        <Button
          icon={<Edit size={16} />}
          size='small'
          onClick={() => handleEdit(record)}
        >
          {t('编辑比例')}
        </Button>
      ),
    },
  ];

  return (
    <div className='mt-[60px] px-2'>
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Title heading={3} style={{ margin: 0 }}>
            {t('身份等级管理')}
          </Title>
        </div>

        <Banner
          type='info'
          icon={<Info size={16} />}
          description={t(
            '身份等级固定为三级：普通用户、区域代理、城市运营中心。此处只允许调整各等级的默认分佣比例。代理商的创建和身份绑定请前往"代理商管理"操作。',
          )}
          style={{ marginBottom: 20 }}
        />

        <Table
          columns={columns}
          dataSource={levels}
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        title={t('编辑身份等级')}
        footer={
          <Space>
            <Button onClick={() => setModalVisible(false)}>{t('取消')}</Button>
            <Button theme='solid' type='primary' onClick={handleSubmit}>
              {t('保存')}
            </Button>
          </Space>
        }
      >
        {editingLevel && (
          <Form
            getFormApi={(api) => (formApi.current = api)}
            initValues={{
              commission_rate: editingLevel.commission_rate,
              description: editingLevel.description,
            }}
            labelPosition='left'
            labelWidth={130}
          >
            <Form.Slot label={t('等级名称')}>
              <Tag color={levelTagColor(editingLevel.id)} size='large'>
                {editingLevel.name}
              </Tag>
            </Form.Slot>
            <Form.InputNumber
              field='commission_rate'
              label={t('默认分佣比例')}
              placeholder={t('请输入佣金比例')}
              min={0}
              max={100}
              step={0.1}
              precision={2}
              suffix='%'
              rules={[{ required: true, message: t('请输入佣金比例') }]}
              extra={t('此为该身份等级的默认分佣比例，代理商也可单独设置自定义比例')}
            />
            <Form.TextArea
              field='description'
              label={t('等级说明')}
              placeholder={t('请输入等级说明')}
              maxCount={255}
            />
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default IdentityLevelManagement;
