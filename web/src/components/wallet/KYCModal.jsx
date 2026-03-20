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

import React, { useState } from 'react';
import {
  Modal,
  Form,
  Button,
  Space,
  Banner,
} from '@douyinfe/semi-ui';
import { API, showError, showSuccess } from '../../helpers';
import { useTranslation } from 'react-i18next';

const KYCModal = ({ visible, onCancel, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const formApi = React.useRef();

  const handleSubmit = async () => {
    const values = formApi.current.getValues();

    if (!values.real_name || !values.id_card_no || !values.bank_name || !values.bank_account) {
      showError(t('请填写完整信息'));
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/api/user/kyc/submit', values);
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('实名认证已提交，请等待审核'));
        onSuccess();
        onCancel();
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('提交失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      title={t('实名认证')}
      footer={
        <Space>
          <Button onClick={onCancel}>{t('取消')}</Button>
          <Button
            theme='solid'
            type='primary'
            onClick={handleSubmit}
            loading={loading}
          >
            {t('提交认证')}
          </Button>
        </Space>
      }
    >
      <Banner
        type='info'
        description={t('为保障资金安全，提现前需要完成实名认证')}
        style={{ marginBottom: 16 }}
      />

      <Form
        getFormApi={(api) => (formApi.current = api)}
        labelPosition='left'
        labelWidth={120}
      >
        <Form.Input
          field='real_name'
          label={t('真实姓名')}
          placeholder={t('请输入真实姓名')}
          rules={[{ required: true, message: t('请输入真实姓名') }]}
        />
        <Form.Input
          field='id_card_no'
          label={t('身份证号')}
          placeholder={t('请输入身份证号')}
          rules={[
            { required: true, message: t('请输入身份证号') },
            {
              pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
              message: t('请输入正确的身份证号')
            }
          ]}
        />
        <Form.Input
          field='bank_name'
          label={t('银行名称')}
          placeholder={t('请输入银行名称')}
          rules={[{ required: true, message: t('请输入银行名称') }]}
        />
        <Form.Input
          field='bank_account'
          label={t('银行账号')}
          placeholder={t('请输入银行账号')}
          rules={[
            { required: true, message: t('请输入银行账号') },
            {
              pattern: /^\d{16,19}$/,
              message: t('请输入正确的银行账号')
            }
          ]}
        />
        <Form.Input
          field='bank_branch'
          label={t('开户行')}
          placeholder={t('请输入开户行（选填）')}
        />
      </Form>
    </Modal>
  );
};

export default KYCModal;
