import { Input, Form, Button, message } from 'antd';
import { Scene, Project } from '../../../../shared/types';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { AIProgressToast } from '../../utils/AIUtils';

const { TextArea } = Input;

interface InternalProps {
    project: Project;
    scene: Scene | null;
    onUpdate: (updates: Partial<Scene>) => void;
}

export default function SceneEditor({ project, scene, onUpdate }: InternalProps) {
    const { t } = useTranslation();
    const [form] = Form.useForm();

    useEffect(() => {
        if (scene) {
            form.setFieldsValue(scene);
        }
    }, [scene, form]);

    const handleValuesChange = (changedValues: any) => {
        onUpdate(changedValues);
    };

    // If no scene, we still want to render the Form component (hidden or empty) to avoid useForm warning,
    // or just handle the UI inside the Form.
    // However, the cleanest is to always render the Form if the component is mounted.

    const maskJson = (text: string) => {
        return text.replace(/[{}["\]:,\n]/g, ' ').replace(/\s+/g, ' ').trim();
    };

    const handleGenerateOutline = async () => {
        try {
            const settings = await window.api.getSettings();
            if (!settings.volcEngineApiKey) {
                message.error(t('common.error', 'Please configure API Key first'));
                return;
            }
            const requestId = uuidv4();
            const handleStop = () => {
                window.api.cancelAI(requestId);
                message.destroy('gen');
                message.info(t('scenes.cancelled', 'Generation cancelled'));
            };

            message.loading({
                content: <AIProgressToast
                    text={t('scenes.generating')}
                    onStop={handleStop}
                />,
                key: 'gen',
                duration: 0
            });

            let streamData = { thinking: '', content: '' };

            const updateToast = () => {
                const displayText = streamData.thinking
                    ? <>{t('scenes.generating')}<br /><br />Thinking process:<br /><i style={{ color: '#ccc' }}>{streamData.thinking.slice(-150)}</i></>
                    : <>{t('scenes.generating')}<br /><br />Thinking process:<br /><i style={{ color: '#ccc' }}>{maskJson(streamData.content).slice(-100)}</i></>;

                message.loading({
                    content: <AIProgressToast
                        text={displayText}
                        onStop={handleStop}
                    />,
                    key: 'gen',
                    duration: 0
                });
            };

            const removeThinkingListener = window.api.onAIStreamThinking((chunk) => {
                streamData.thinking += chunk;
                updateToast();
            });

            const removeChunkListener = window.api.onAIStreamChunk((chunk) => {
                streamData.content += chunk;
                updateToast();
            });

            const removeEndListener = window.api.onAIStreamEnd((finalContent) => {
                removeThinkingListener();
                removeChunkListener();
                removeEndListener();

                let content = finalContent.replace(/```json/g, '').replace(/```/g, '').trim();
                try {
                    const result = JSON.parse(content);
                    onUpdate({
                        outline: result.outline || '',
                        conflict: result.conflict || ''
                    });
                    message.success({ content: t('scenes.generated'), key: 'gen' });
                } catch (e) {
                    onUpdate({ outline: content });
                    message.success({ content: t('scenes.generated'), key: 'gen' });
                }
            });

            const charactersStr = project.characters.map(c => `${c.name}: ${c.personality}`).join('\n');
            window.api.generateAIStream('scene-outline', {
                title: scene?.title || '',
                targetAudience: project.wordSettings.targetAudience,
                artStyle: project.wordSettings.artStyle,
                summary: project.wordSettings.summary,
                characters: charactersStr,
                requestId
            });

        } catch (e: any) {
            message.error({ content: t('characters.failed') + (e.message || e), key: 'gen' });
        }
    };

    return (
        <div style={{ padding: '12px 24px', display: 'flex', flexDirection: 'column' }}>
            <Form
                form={form}
                layout="vertical"
                initialValues={scene || {}}
                onValuesChange={handleValuesChange}
                style={{ display: 'flex', flexDirection: 'column' }}
            >
                {!scene ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>
                        {t('scenes.noSceneSelected')}
                    </div>
                ) : (
                    <>
                        {/* Header: Title and Toolbar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ flex: 1, marginRight: 24 }}>
                                <Form.Item name="title" style={{ marginBottom: 0 }}>
                                    <Input
                                        placeholder={t('scenes.newScene')}
                                        bordered={false}
                                        style={{ fontSize: '20px', fontWeight: 'bold', padding: 0 }}
                                    />
                                </Form.Item>
                            </div>
                            <div>
                                <Button type="primary" onClick={handleGenerateOutline} size="small">
                                    {t('scenes.generateOutline')}
                                </Button>
                            </div>
                        </div>

                        {/* Content: Two Columns */}
                        <div style={{ display: 'flex', gap: 24 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#888', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>{t('scenes.outline').toUpperCase()}</div>
                                <Form.Item name="outline" style={{ marginBottom: 0 }}>
                                    <TextArea
                                        autoSize={{ minRows: 4, maxRows: 4 }}
                                        placeholder={t('scenes.outlinePlaceholder')}
                                        style={{ resize: 'none', background: '#222', border: '1px solid #444', color: '#eee' }}
                                    />
                                </Form.Item>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#888', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>{t('scenes.conflict').toUpperCase()}</div>
                                <Form.Item name="conflict" style={{ marginBottom: 0 }}>
                                    <TextArea
                                        autoSize={{ minRows: 4, maxRows: 4 }}
                                        placeholder={t('scenes.conflictPlaceholder')}
                                        style={{ resize: 'none', background: '#222', border: '1px solid #444', color: '#eee' }}
                                    />
                                </Form.Item>
                            </div>
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}

