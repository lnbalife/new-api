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
  Popconfirm,
} from '@douyinfe/semi-ui';
import { Plus, Edit, Trash2, Star } from 'lucide-react';
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

  const handleAdd = () => {
    setEditingLevel(null);
    setModalVisible(true);
  };

  const handleEdit = (level) => {
    // 将小数转换为百分比显示
    const levelForEdit = {
      ...level,
      commission_rate: level.commission_rate * 100,
    };
    setEditingLevel(levelForEdit);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const res = await API.delete(`/api/commission/admin/identity_levels/${id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('删除成功'));
        loadLevels();
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error.response?.data?.message || t('删除失败'));
    }
  };

  const handleSubmit = async () => {
    const values = formApi.current.getValues();

    if (!values.name || values.commission_rate === undefined) {
      showError(t('请填写完整信息'));
      return;
    }

    if (values.commission_rate < 0 || values.commission_rate > 100) {
      showError(t('佣金比例必须在0-100之间'));
      return;
    }

    // 将百分比转换为小数
    const submitData = {
      ...values,
      commission_rate: values.commission_rate / 100,
    };

    try {
      let res;
      if (editingLevel) {
        res = await API.put(`/api/commission/admin/identity_levels/${editingLevel.id}`, submitData);
      } else {
        res = await API.post('/api/commission/admin/identity_levels', submitData);
      }

      const { success, message } = res.data;
      if (success) {
        showSuccess(editingLevel ? t('更新成功') : t('创建成功'));
        setModalVisible(false);
        loadLevels();
      } else {
        showError(message);
      }
    } catch (error) {
      showError(editingLevel ? t('更新失败') : t('创建失败'));
    }
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
          <Text strong>{text}</Text>
          {record.is_default && <Tag color='gold' icon={<Star size={12} />}>{t('默认')}</Tag>}
        </Space>
      ),
    },
    {
      title: t('佣金比例'),
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
        <Space>
          <Button
            icon={<Edit size={16} />}
            size='small'
            onClick={() => handleEdit(record)}
          >
            {t('编辑')}
          </Button>
          {!record.is_default && (
            <Popconfirm
              title={t('确认删除')}
              content={t('删除后无法恢复，确认删除吗？')}
              onConfirm={() => handleDelete(record.id)}
            >
              <Button
                icon={<Trash2 size={16} />}
                size='small'
                type='danger'
              >
                {t('删除')}
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className='mt-[60px] px-2'>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title heading={3} style={{ margin: 0 }}>
            {t('身份等级管理')}
          </Title>
          <Button
            theme='solid'
            type='primary'
            icon={<Plus />}
            onClick={handleAdd}
          >
            {t('新增等级')}
          </Button>
        </div>

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
        title={editingLevel ? t('编辑身份等级') : t('新增身份等级')}
        footer={
          <Space>
            <Button onClick={() => setModalVisible(false)}>{t('取消')}</Button>
            <Button theme='solid' type='primary' onClick={handleSubmit}>
              {t('保存')}
            </Button>
          </Space>
        }
      >
        <Form
          getFormApi={(api) => (formApi.current = api)}
          initValues={editingLevel || { status: 1, is_default: false }}
          labelPosition='left'
          labelWidth={120}
        >
          <Form.Input
            field='name'
            label={t('等级名称')}
            placeholder={t('请输入等级名称')}
            rules={[{ required: true, message: t('请输入等级名称') }]}
          />
          <Form.InputNumber
            field='commission_rate'
            label={t('佣金比例')}
            placeholder={t('请输入佣金比例')}
            min={0}
            max={100}
            step={0.1}
            precision={1}
            suffix='%'
            rules={[{ required: true, message: t('请输入佣金比例') }]}
            extra={t('范围：0-100，例如5表示5%')}
          />
          <Form.TextArea
            field='description'
            label={t('等级说明')}
            placeholder={t('请输入等级说明')}
            maxCount={255}
          />
          <Form.Select
            field='status'
            label={t('状态')}
            optionList={[
              { label: t('启用'), value: 1 },
              { label: t('禁用'), value: 0 },
            ]}
          />
        </Form>
      </Modal>
    </div>
  );
};

export default IdentityLevelManagement;
