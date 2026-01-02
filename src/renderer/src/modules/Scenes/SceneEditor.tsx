import { Input, Typography, Form, Button, message } from 'antd';
import { Scene } from '../../../../shared/types';
import { useEffect } from 'react';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface InternalProps {
    scene: Scene | null;
    onUpdate: (updates: Partial<Scene>) => void;
}

export default function SceneEditor({ scene, onUpdate }: InternalProps) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (scene) {
            form.setFieldsValue(scene);
        }
    }, [scene, form]);

    const handleValuesChange = (changedValues: any) => {
        onUpdate(changedValues);
    };

    if (!scene) {
        return (
            <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>
                Select a scene to edit
            </div>
        );
    }

    const handleGenerateOutline = async () => {
        try {
            const settings = await window.api.getSettings();
            if (!settings.volcEngineApiKey) {
                return message.error('Please configure API Key first');
            }
            message.loading({ content: 'Generating...', key: 'gen' });
            const result = await window.api.generateAI('scene-outline', {
                title: scene?.title || '',
                summary: 'Context from project settings...',
                characters: 'Main characters'
            });
            onUpdate({ outline: result.outline || result });
            message.success({ content: 'Generated!', key: 'gen' });
        } catch (e) {
            message.error({ content: 'Failed: ' + e, key: 'gen' });
        }
    };

    return (
        <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
            <Form
                form={form}
                layout="vertical"
                initialValues={scene}
                onValuesChange={handleValuesChange}
            >
                <Form.Item name="title" label="Scene Title">
                    <Input size="large" />
                </Form.Item>
                <Form.Item name="outline" label="Story Outline">
                    <TextArea rows={6} placeholder="Describe the sequence of events..." />
                </Form.Item>
                <Form.Item name="conflict" label="Conflict / Tension">
                    <TextArea rows={4} placeholder="What is the central conflict or tension?" />
                </Form.Item>
            </Form>
            <div style={{ marginTop: 20 }}>
                <Title level={5}>AI Assistance</Title>
                <div style={{ display: 'flex', gap: 10 }}>
                    <Button onClick={handleGenerateOutline}>Generate Outline</Button>
                    <Button>Enhance Conflict</Button>
                </div>
            </div>
        </div>
    );
}

