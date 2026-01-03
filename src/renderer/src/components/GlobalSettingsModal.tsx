import { Modal, Form, Input, message, Select } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsService } from '../services/SettingsService';
import { GlobalSettings } from '../../../shared/types';

interface InternalProps {
    open: boolean;
    onClose: () => void;
}

export default function GlobalSettingsModal({ open, onClose }: InternalProps) {
    const { t, i18n } = useTranslation();
    const [form] = Form.useForm<GlobalSettings>();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            loadSettings();
        }
    }, [open]);

    const loadSettings = async () => {
        try {
            const s = await SettingsService.getSettings();
            // Provide defaults for new fields if missing
            const defaults: GlobalSettings = {
                provider: s.provider || 'VolcEngine',
                volcEngineApiKey: s.volcEngineApiKey || '',
                textModelId: s.textModelId || 'doubao-seed-1-6-251015',
                imageModelId: s.imageModelId || 'doubao-seedream-4-5-251128',
                videoModelId: s.videoModelId || 'doubao-seedance-1-5-pro-251215',
                language: s.language || i18n.language
            };
            form.setFieldsValue(defaults);
            // Sync i18n with loaded settings if present
            if (defaults.language && defaults.language !== i18n.language) {
                i18n.changeLanguage(defaults.language);
            }
        } catch {
            message.error(t('common.error', 'Failed to load settings'));
        }
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            await SettingsService.saveSettings(values);
            // Update language immediately upon save
            if (values.language) {
                i18n.changeLanguage(values.language);
            }
            message.success(t('settings.saveSuccess'));
            setLoading(false);
            onClose();
        } catch {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={t('settings.title')}
            open={open}
            onOk={handleOk}
            onCancel={onClose}
            confirmLoading={loading}
            okText={t('common.save')}
            cancelText={t('common.cancel')}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="language"
                    label={t('settings.language')}
                >
                    <Select
                        options={[
                            { label: 'English', value: 'en' },
                            { label: '中文', value: 'zh' }
                        ]}
                    />
                </Form.Item>
                <Form.Item
                    name="provider"
                    label={t('settings.provider')}
                    rules={[{ required: true }]}
                >
                    <Select
                        options={[
                            { label: 'VolcEngine / 火山引擎', value: 'VolcEngine' }
                        ]}
                    />
                </Form.Item>
                <Form.Item
                    name="volcEngineApiKey"
                    label={t('settings.apiKey')}
                    rules={[{ required: true, message: t('settings.apiKeyRequired') }]}
                >
                    <Input.Password placeholder={t('settings.apiKeyPlaceholder')} />
                </Form.Item>
                <Form.Item
                    name="textModelId"
                    label={t('settings.textModelId')}
                    rules={[{ required: true }]}
                >
                    <Input placeholder="doubao-seed-1-6-251015" />
                </Form.Item>
                <Form.Item
                    name="imageModelId"
                    label={t('settings.imageModelId')}
                    rules={[{ required: true }]}
                >
                    <Input placeholder="doubao-seedream-4-5-251128" />
                </Form.Item>
                <Form.Item
                    name="videoModelId"
                    label={t('settings.videoModelId')}
                    rules={[{ required: true }]}
                >
                    <Input placeholder="doubao-seedance-1-5-pro-251215" />
                </Form.Item>
            </Form>
        </Modal>
    );
}
