import { Modal, Form, Input, message } from 'antd';
import { useEffect, useState } from 'react';
import { SettingsService } from '../services/SettingsService';
import { GlobalSettings } from '../../../shared/types';

interface InternalProps {
    open: boolean;
    onClose: () => void;
}

export default function GlobalSettingsModal({ open, onClose }: InternalProps) {
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
            form.setFieldsValue(s);
        } catch {
            message.error('Failed to load settings');
        }
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            await SettingsService.saveSettings(values);
            message.success('Settings saved');
            setLoading(false);
            onClose();
        } catch {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Global Settings"
            open={open}
            onOk={handleOk}
            onCancel={onClose}
            confirmLoading={loading}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="volcEngineApiKey"
                    label="VolcEngine API Key"
                    rules={[{ required: true, message: 'API Key is required' }]}
                >
                    <Input.Password placeholder="Enter your VolcEngine API Key" />
                </Form.Item>
                <Form.Item
                    name="volcEngineModel"
                    label="VolcEngine Model ID"
                    rules={[{ required: true, message: 'Model ID is required' }]}
                >
                    <Input placeholder="e.g. ep-2025..." />
                </Form.Item>
            </Form>
        </Modal>
    );
}
