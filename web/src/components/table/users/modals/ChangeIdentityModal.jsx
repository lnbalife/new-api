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
import { Modal, Form, Button, Space } from '@douyinfe/semi-ui';
import { API, showError, showSuccess } from '../../../../helpers';
import { useTranslation } from 'react-i18next';

const ChangeIdentityModal = ({ visible, handleClose, user, refresh }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [identityLevels, setIdentityLevels] = useState([]);
  const formApi = React.useRef();

  useEffect(() => {
    if (visible) {
      loadIdentityLevels();
    }
  }, [visible]);

  const loadIdentityLevels = async () => {
    try {
      const res = await API.get('/api/commission/admin/identity_levels');
      const { success, data } = res.data;
      if (success) {
        setIdentityLevels(data || []);
      }
    } catch (error) {
      showError(t('加载身份等级失败'));
    }
  };

  const handleSubmit = async () => {
    const values = formApi.current.getValues();

    if (!values.identity_level_id) {
      showError(t('请选择身份等级'));
      return;
    }

    setLoading(true);
    try {
      const res = await API.put(`/api/commission/admin/users/${user.id}/identity`, {
        identity_level_id: values.identity_level_id,
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('修改成功'));
        handleClose();
        refresh();
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('修改失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onCancel={handleClose}
      title={t('修改用户身份等级')}
      footer={
        <Space>
          <Button onClick={handleClose}>{t('取消')}</Button>
          <Button
            theme='solid'
            type='primary'
            onClick={handleSubmit}
            loading={loading}
          >
            {t('确认')}
          </Button>
        </Space>
      }
    >
      {user && (
        <>
          <div style={{ marginBottom: 16 }}>
            <strong>{t('用户名')}:</strong> {user.username}
          </div>
          <Form
            getFormApi={(api) => (formApi.current = api)}
            labelPosition='left'
            labelWidth={120}
          >
            <Form.Select
              field='identity_level_id'
              label={t('身份等级')}
              placeholder={t('请选择身份等级')}
              optionList={identityLevels
                .filter(level => level.status === 1)
                .map(level => ({
                  label: `${level.name} (${(level.commission_rate * 100).toFixed(1)}%)`,
                  value: level.id,
                }))}
              rules={[{ required: true, message: t('请选择身份等级') }]}
            />
          </Form>
        </>
      )}
    </Modal>
  );
};

export default ChangeIdentityModal;
