import { Modal, Form, Input, message, Select, Button, Space } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsService } from '../services/SettingsService';
import { GlobalSettings } from '../../../shared/types';
import { DEFAULT_MODELS, OLD_DEFAULT_MODELS } from '../../../shared/constants';
import { FolderOpenOutlined } from '@ant-design/icons';

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
            // Provide defaults for new fields if missing, and upgrade old defaults
            const textModelId = s.textModelId || DEFAULT_MODELS.text;
            const imageModelId = s.imageModelId || DEFAULT_MODELS.image;
            const videoModelId = s.videoModelId || DEFAULT_MODELS.video;

            const defaults: GlobalSettings = {
                provider: s.provider || 'VolcEngine',
                volcEngineApiKey: s.volcEngineApiKey || '',
                textModelId: OLD_DEFAULT_MODELS.includes(textModelId) ? DEFAULT_MODELS.text : textModelId,
                imageModelId: OLD_DEFAULT_MODELS.includes(imageModelId) ? DEFAULT_MODELS.image : imageModelId,
                videoModelId: OLD_DEFAULT_MODELS.includes(videoModelId) ? DEFAULT_MODELS.video : videoModelId,
                language: s.language || i18n.language,
                projectsPath: s.projectsPath || ''
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

    const handleBrowseFolder = async () => {
        try {
            const folder = await window.api.selectFolder();
            if (folder) {
                form.setFieldValue('projectsPath', folder);
            }
        } catch (e) {
            console.error('Failed to select folder:', e);
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
                            { label: '中文', value: 'zh' },
                            { label: '中文 (zh-CN)', value: 'zh-CN' }
                        ]}
                    />
                </Form.Item>
                <Form.Item
                    name="projectsPath"
                    label={t('settings.projectsPath')}
                    rules={[{ required: true }]}
                >
                    <Space.Compact style={{ width: '100%' }}>
                        <Input
                            placeholder={t('settings.projectsPathPlaceholder')}
                            readOnly
                        />
                        <Button
                            icon={<FolderOpenOutlined />}
                            onClick={handleBrowseFolder}
                        >
                            {t('settings.browse')}
                        </Button>
                    </Space.Compact>
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
                    <Input placeholder={DEFAULT_MODELS.text} />
                </Form.Item>
                <Form.Item
                    name="imageModelId"
                    label={t('settings.imageModelId')}
                    rules={[{ required: true }]}
                >
                    <Input placeholder={DEFAULT_MODELS.image} />
                </Form.Item>
                <Form.Item
                    name="videoModelId"
                    label={t('settings.videoModelId')}
                    rules={[{ required: true }]}
                >
                    <Input placeholder={DEFAULT_MODELS.video} />
                </Form.Item>
            </Form>
        </Modal>
    );
}
