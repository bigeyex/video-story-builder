import { Input, Form, Button, message } from 'antd';
import { Scene } from '../../../../shared/types';
import { useEffect } from 'react';

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
        <div style={{ padding: '12px 24px', display: 'flex', flexDirection: 'column' }}>
            <Form
                form={form}
                layout="vertical"
                initialValues={scene}
                onValuesChange={handleValuesChange}
                style={{ display: 'flex', flexDirection: 'column' }}
            >
                {/* Header: Title and Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ flex: 1, marginRight: 24 }}>
                        <Form.Item name="title" style={{ marginBottom: 0 }}>
                            <Input
                                placeholder="Scene Title"
                                bordered={false}
                                style={{ fontSize: '20px', fontWeight: 'bold', padding: 0 }}
                            />
                        </Form.Item>
                    </div>
                    <div>
                        <Button type="primary" onClick={handleGenerateOutline} size="small" style={{ marginRight: 10 }}>
                            Generate Outline
                        </Button>
                        <Button size="small">Enhance Conflict</Button>
                    </div>
                </div>

                {/* Content: Two Columns */}
                <div style={{ display: 'flex', gap: 24 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ color: '#888', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>STORY OUTLINE</div>
                        <Form.Item name="outline" style={{ marginBottom: 0 }}>
                            <TextArea
                                autoSize={{ minRows: 4, maxRows: 12 }}
                                placeholder="Describe the sequence of events..."
                                style={{ resize: 'none', background: '#222', border: '1px solid #444', color: '#eee' }}
                            />
                        </Form.Item>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ color: '#888', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>CONFLICT / TENSION</div>
                        <Form.Item name="conflict" style={{ marginBottom: 0 }}>
                            <TextArea
                                autoSize={{ minRows: 4, maxRows: 12 }}
                                placeholder="What is the central conflict or tension?"
                                style={{ resize: 'none', background: '#222', border: '1px solid #444', color: '#eee' }}
                            />
                        </Form.Item>
                    </div>
                </div>
            </Form>
        </div>
    );
}

