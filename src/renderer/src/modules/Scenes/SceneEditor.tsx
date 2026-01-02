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
        <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Form
                form={form}
                layout="vertical"
                initialValues={scene}
                onValuesChange={handleValuesChange}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
                {/* Header: Title and Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ flex: 1, marginRight: 24 }}>
                        <Form.Item name="title" label="Scene Title" style={{ marginBottom: 0 }}>
                            <Input size="large" style={{ fontWeight: 'bold' }} />
                        </Form.Item>
                    </div>
                    <div style={{ paddingTop: 30 }}> {/* Align with Input box approx */}
                        <Button type="primary" onClick={handleGenerateOutline} style={{ marginRight: 10 }}>
                            Generate Outline
                        </Button>
                        <Button>Enhance Conflict</Button>
                    </div>
                </div>

                {/* Content: Two Columns */}
                <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Form.Item name="outline" label="Story Outline" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
                            <TextArea
                                style={{ flex: 1, resize: 'none' }}
                                placeholder="Describe the sequence of events..."
                            />
                        </Form.Item>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Form.Item name="conflict" label="Conflict / Tension" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
                            <TextArea
                                style={{ flex: 1, resize: 'none' }}
                                placeholder="What is the central conflict or tension?"
                            />
                        </Form.Item>
                    </div>
                </div>
            </Form>
        </div>
    );
}

