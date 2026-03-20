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

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Tag,
  Typography,
  Input,
  Select,
  Radio,
  Switch,
  Popconfirm,
} from '@douyinfe/semi-ui';
import { Plus, Edit, Search, RefreshCw, Trash2 } from 'lucide-react';
import { API, showError, showSuccess } from '../../helpers';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

// 代理商等级选项
const AGENT_LEVEL_OPTIONS = [
  { label: '区域代理', value: 2 },
  { label: '城市运营中心', value: 3 },
];

const AgentManagement = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [filterLevel, setFilterLevel] = useState(0);

  // 行政区划数据
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // Modal 状态
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null); // null = 新增
  const [submitting, setSubmitting] = useState(false);
  const formApi = React.useRef();

  // 表单内部状态（联动控制用）
  const [selectedLevel, setSelectedLevel] = useState(2);
  const [selectedProvinceId, setSelectedProvinceId] = useState(0);
  const [selectedCityId, setSelectedCityId] = useState(0);
  const [useDefaultRate, setUseDefaultRate] = useState(true);

  // 加载代理商列表
  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('p', page);
      params.set('page_size', pageSize);
      if (keyword) params.set('keyword', keyword);
      if (filterLevel > 0) params.set('identity_level_id', filterLevel);

      const res = await API.get(`/api/agent/?${params.toString()}`);
      const { success, data } = res.data;
      if (success) {
        setAgents(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      showError(t('加载代理商列表失败'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, filterLevel, t]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // 加载省份列表
  const loadProvinces = async () => {
    setLoadingProvinces(true);
    try {
      const res = await API.get('/api/region/provinces');
      const { success, data } = res.data;
      if (success) {
        setProvinces(
          (data || []).map((p) => ({ label: p.name, value: p.id })),
        );
      }
    } catch (e) {
      showError(t('加载省份失败'));
    } finally {
      setLoadingProvinces(false);
    }
  };

  // 加载城市列表
  const loadCities = async (provinceId) => {
    if (!provinceId) {
      setCities([]);
      setDistricts([]);
      return;
    }
    setLoadingCities(true);
    setCities([]);
    setDistricts([]);
    try {
      const res = await API.get(`/api/region/cities/${provinceId}`);
      const { success, data } = res.data;
      if (success) {
        setCities(
          (data || []).map((c) => ({ label: c.name, value: c.id })),
        );
      }
    } catch (e) {
      showError(t('加载城市失败'));
    } finally {
      setLoadingCities(false);
    }
  };

  // 加载区县列表
  const loadDistricts = async (cityId) => {
    if (!cityId) {
      setDistricts([]);
      return;
    }
    setLoadingDistricts(true);
    setDistricts([]);
    try {
      const res = await API.get(`/api/region/districts/${cityId}`);
      const { success, data } = res.data;
      if (success) {
        setDistricts(
          (data || []).map((d) => ({ label: d.name, value: d.id })),
        );
      }
    } catch (e) {
      showError(t('加载区县失败'));
    } finally {
      setLoadingDistricts(false);
    }
  };

  const handleAdd = () => {
    setEditingAgent(null);
    setSelectedLevel(2);
    setSelectedProvinceId(0);
    setSelectedCityId(0);
    setUseDefaultRate(true);
    setCities([]);
    setDistricts([]);
    setModalVisible(true);
    loadProvinces();
  };

  const handleEdit = (agent) => {
    setEditingAgent(agent);
    setSelectedLevel(agent.identity_level_id);
    setSelectedProvinceId(agent.province_id || 0);
    setSelectedCityId(agent.city_id || 0);
    setUseDefaultRate(agent.use_default_rate);
    setCities([]);
    setDistricts([]);
    setModalVisible(true);
    loadProvinces();
    if (agent.province_id) {
      loadCities(agent.province_id);
    }
    if (agent.city_id && agent.identity_level_id === 2) {
      loadDistricts(agent.city_id);
    }
  };

  const handleProvinceChange = (id) => {
    setSelectedProvinceId(id || 0);
    setSelectedCityId(0);
    formApi.current?.setValue('city_id', undefined);
    formApi.current?.setValue('district_id', undefined);
    setCities([]);
    setDistricts([]);
    if (id) loadCities(id);
  };

  const handleCityChange = (id) => {
    setSelectedCityId(id || 0);
    formApi.current?.setValue('district_id', undefined);
    setDistricts([]);
    if (id && selectedLevel === 2) {
      loadDistricts(id);
    }
  };

  const handleLevelChange = (val) => {
    setSelectedLevel(val);
    formApi.current?.setValue('district_id', undefined);
    setDistricts([]);
    if (val === 2 && selectedCityId) {
      loadDistricts(selectedCityId);
    }
  };

  const handleToggleStatus = async (agent) => {
    const newStatus = agent.status === 1 ? 2 : 1;
    try {
      const res = await API.patch(`/api/agent/${agent.id}/status`, { status: newStatus });
      const { success, message } = res.data;
      if (success) {
        showSuccess(newStatus === 1 ? t('已启用') : t('已禁用'));
        setAgents((prev) =>
          prev.map((a) => (a.id === agent.id ? { ...a, status: newStatus } : a)),
        );
      } else {
        showError(message);
      }
    } catch {
      showError(t('操作失败'));
    }
  };

  const handleDelete = async (agent) => {
    try {
      const res = await API.delete(`/api/agent/${agent.id}`);
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('删除成功'));
        loadAgents();
      } else {
        showError(message);
      }
    } catch {
      showError(t('删除失败'));
    }
  };

  const handleSubmit = async () => {
    let values;
    try {
      values = await formApi.current.validate();
    } catch {
      return;
    }

    const useDefault = values.use_default_rate === true || values.use_default_rate === 'true';
    const payload = {
      name: values.name,
      identity_level_id: values.identity_level_id,
      province_id: values.province_id || 0,
      city_id: values.city_id || 0,
      district_id: values.identity_level_id === 2 ? (values.district_id || 0) : 0,
      use_default_rate: useDefault,
      custom_rate: useDefault
        ? 0
        : (values.custom_rate || 0) / 100,
    };

    if (!editingAgent) {
      payload.user_id = values.user_id;
    }

    setSubmitting(true);
    try {
      let res;
      if (editingAgent) {
        res = await API.put(`/api/agent/${editingAgent.id}`, payload);
      } else {
        res = await API.post('/api/agent/', payload);
      }

      const { success, message } = res.data;
      if (success) {
        showSuccess(editingAgent ? t('更新成功') : t('创建成功'));
        setModalVisible(false);
        loadAgents();
      } else {
        showError(message);
      }
    } catch (error) {
      showError(editingAgent ? t('更新失败') : t('创建失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const levelTag = (levelId, levelName) => {
    const colorMap = { 2: 'orange', 3: 'purple' };
    return (
      <Tag color={colorMap[levelId] || 'grey'} size='small'>
        {levelName || (levelId === 2 ? '区域代理' : '城市运营中心')}
      </Tag>
    );
  };

  const columns = [
    {
      title: t('代理商ID'),
      dataIndex: 'id',
      key: 'id',
      width: 90,
    },
    {
      title: t('代理商名称'),
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: t('代理商等级'),
      dataIndex: 'identity_level_id',
      key: 'identity_level_id',
      render: (levelId, record) => levelTag(levelId, record.identity_level_name),
    },
    {
      title: t('代理商区域'),
      key: 'region',
      render: (_, record) => {
        const parts = [record.province_name, record.city_name];
        if (record.identity_level_id === 2 && record.district_name) {
          parts.push(record.district_name);
        }
        return <Text type='tertiary'>{parts.filter(Boolean).join(' / ') || '-'}</Text>;
      },
    },
    {
      title: t('用户账号'),
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: t('账户余额'),
      dataIndex: 'account_balance',
      key: 'account_balance',
      render: (val) => (
        <Text>
          ¥{((val || 0) / 500000).toFixed(2)}
        </Text>
      ),
    },
    {
      title: t('分佣比例'),
      key: 'commission_rate',
      render: (_, record) => (
        <Space>
          <Tag color='green'>{((record.effective_rate || 0) * 100).toFixed(1)}%</Tag>
          {!record.use_default_rate && (
            <Tag color='amber' size='small'>
              {t('自定义')}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: t('累计收益'),
      dataIndex: 'total_commission',
      key: 'total_commission',
      render: (val) => (
        <Text>¥{((val || 0) / 100).toFixed(2)}</Text>
      ),
    },
    {
      title: t('创建时间'),
      dataIndex: 'create_time',
      key: 'create_time',
      render: (ts) =>
        ts ? new Date(ts * 1000).toLocaleDateString('zh-CN') : '-',
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status, record) => (
        <Switch
          checked={status === 1}
          onChange={() => handleToggleStatus(record)}
          checkedText={t('启用')}
          uncheckedText={t('禁用')}
          size='small'
        />
      ),
    },
    {
      title: t('操作'),
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button
            icon={<Edit size={16} />}
            size='small'
            onClick={() => handleEdit(record)}
          >
            {t('编辑')}
          </Button>
          <Popconfirm
            title={t('确认删除此代理商？删除后将还原用户身份为普通用户。')}
            okText={t('删除')}
            okType='danger'
            cancelText={t('取消')}
            onConfirm={() => handleDelete(record)}
            position='topRight'
          >
            <Button
              icon={<Trash2 size={16} />}
              size='small'
              type='danger'
            >
              {t('删除')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderForm = () => {
    const initValues = editingAgent
      ? {
          name: editingAgent.name,
          identity_level_id: editingAgent.identity_level_id,
          province_id: editingAgent.province_id || undefined,
          city_id: editingAgent.city_id || undefined,
          district_id: editingAgent.district_id || undefined,
          use_default_rate: editingAgent.use_default_rate,
          custom_rate: editingAgent.use_default_rate
            ? undefined
            : parseFloat(((editingAgent.custom_rate || 0) * 100).toFixed(2)),
        }
      : {
          identity_level_id: 2,
          use_default_rate: true,
        };

    return (
      <Form
        getFormApi={(api) => (formApi.current = api)}
        initValues={initValues}
        labelPosition='left'
        labelWidth={130}
      >
        <Form.Input
          field='name'
          label={t('代理商名称')}
          placeholder={t('请输入代理商名称')}
          rules={[{ required: true, message: t('请输入代理商名称') }]}
        />

        <Form.Select
          field='identity_level_id'
          label={t('代理商等级')}
          optionList={AGENT_LEVEL_OPTIONS}
          rules={[{ required: true, message: t('请选择代理商等级') }]}
          onChange={handleLevelChange}
        />

        {/* 省份选择 */}
        <Form.Select
          field='province_id'
          label={t('省份')}
          optionList={provinces}
          loading={loadingProvinces}
          placeholder={t('请选择省份')}
          rules={[{ required: true, message: t('请选择省份') }]}
          onChange={handleProvinceChange}
          showClear
          filter
        />

        {/* 城市选择 */}
        <Form.Select
          field='city_id'
          label={t('城市')}
          optionList={cities}
          loading={loadingCities}
          placeholder={selectedProvinceId ? t('请选择城市') : t('请先选择省份')}
          rules={[{ required: true, message: t('请选择城市') }]}
          onChange={handleCityChange}
          disabled={!selectedProvinceId}
          showClear
          filter
        />

        {/* 区县选择（仅区域代理需要） */}
        {selectedLevel === 2 && (
          <Form.Select
            field='district_id'
            label={t('区县')}
            optionList={districts}
            loading={loadingDistricts}
            placeholder={selectedCityId ? t('请选择区县') : t('请先选择城市')}
            rules={[{ required: true, message: t('区域代理必须选择区县') }]}
            disabled={!selectedCityId}
            showClear
            filter
          />
        )}

        {/* 用户ID（新增时显示） */}
        {!editingAgent && (
          <Form.InputNumber
            field='user_id'
            label={t('用户ID')}
            placeholder={t('请输入已注册用户ID')}
            rules={[{ required: true, message: t('请输入用户ID') }]}
            min={1}
            precision={0}
            extra={t('绑定已注册用户，该用户将获得对应代理商身份')}
          />
        )}

        {/* 用户账号只读显示（编辑时） */}
        {editingAgent && (
          <Form.Slot label={t('用户账号')}>
            <Text>{editingAgent.username}</Text>
            <Text type='tertiary' size='small' style={{ marginLeft: 8 }}>
              ({t('不可修改')})
            </Text>
          </Form.Slot>
        )}

        {/* 分佣比例 */}
        <Form.RadioGroup
          field='use_default_rate'
          label={t('分佣比例')}
          onChange={(val) => setUseDefaultRate(val === true || val === 'true')}
        >
          <Radio value={true}>{t('默认（使用身份等级默认比例）')}</Radio>
          <Radio value={false}>{t('自定义')}</Radio>
        </Form.RadioGroup>

        {!useDefaultRate && (
          <Form.InputNumber
            field='custom_rate'
            label={t('自定义比例')}
            placeholder={t('请输入自定义佣金比例')}
            min={0}
            max={100}
            step={0.1}
            precision={2}
            suffix='%'
            rules={[{ required: !useDefaultRate, message: t('请输入自定义佣金比例') }]}
          />
        )}
      </Form>
    );
  };

  return (
    <div className='mt-[60px] px-2'>
      <Card>
        {/* 顶部操作栏 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <Title heading={3} style={{ margin: 0 }}>
            {t('代理商管理')}
          </Title>
          <Button
            theme='solid'
            type='primary'
            icon={<Plus />}
            onClick={handleAdd}
          >
            {t('新增代理��')}
          </Button>
        </div>

        {/* 筛选栏 */}
        <Space style={{ marginBottom: 16 }}>
          <Input
            prefix={<Search size={16} />}
            placeholder={t('搜索代理商名称')}
            value={keyword}
            onChange={setKeyword}
            onEnterPress={() => { setPage(1); loadAgents(); }}
            style={{ width: 220 }}
          />
          <Select
            placeholder={t('全部等级')}
            value={filterLevel || undefined}
            onChange={(val) => { setFilterLevel(val || 0); setPage(1); }}
            optionList={[
              { label: t('全部等级'), value: 0 },
              ...AGENT_LEVEL_OPTIONS,
            ]}
            style={{ width: 160 }}
            showClear
          />
          <Button
            icon={<RefreshCw size={16} />}
            onClick={() => { setPage(1); loadAgents(); }}
          >
            {t('刷新')}
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={agents}
          loading={loading}
          pagination={{
            currentPage: page,
            pageSize,
            total,
            onChange: (p) => setPage(p),
            showTotal: true,
          }}
          rowKey='id'
        />
      </Card>

      {/* 新增/编辑代理商 Modal */}
      <Modal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        title={editingAgent ? t('编辑代理商') : t('新增代理商')}
        width={560}
        footer={
          <Space>
            <Button onClick={() => setModalVisible(false)}>{t('取消')}</Button>
            <Button
              theme='solid'
              type='primary'
              onClick={handleSubmit}
              loading={submitting}
            >
              {t('保存')}
            </Button>
          </Space>
        }
      >
        {renderForm()}
      </Modal>
    </div>
  );
};

export default AgentManagement;
