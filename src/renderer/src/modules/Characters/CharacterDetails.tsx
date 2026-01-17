import { Form, Input, Button, Avatar, message, Upload, Image } from 'antd';
import { UploadOutlined, UserOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import { ProjectService } from '../../services/ProjectService';
import { Character, Project } from '../../../../shared/types';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { AIProgressToast } from '../../utils/AIUtils';

const { TextArea } = Input;

interface InternalProps {
    project: Project;
    character: Character | null;
    onUpdate: (id: string, updates: Partial<Character>) => void;
    onDelete: (id: string) => void;
}

export default function CharacterDetails({ project, character, onUpdate, onDelete }: InternalProps) {
    const { t } = useTranslation();
    const [form] = Form.useForm();

    useEffect(() => {
        if (character) {
            form.setFieldsValue(character);
        } else {
            form.resetFields();
        }
    }, [character, form]);

    // We don't return early here to keep the Form instance connected.
    // UI handling will be done inside the return.

    const handleValuesChange = (changedValues: any) => {
        if (character) onUpdate(character.id, changedValues);
    };

    const handleGenerateCharacterDesign = async (isChained = false) => {
        if (!character) return;
        let isCancelled = false;
        const handleStop = () => {
            isCancelled = true;
            message.destroy('design');
            message.info(t('scenes.cancelled', 'Generation cancelled'));
        };

        try {
            message.loading({
                content: <AIProgressToast text={t('characters.generatingCharacterDesign')} onStop={handleStop} />,
                key: 'design',
                duration: 0
            });
            const prompt = `Character ${character.name}: ${character.appearance}, ${character.personality}. Art Style: ${project.wordSettings.artStyle || 'Cinematic'}.`;
            const url = await window.api.generateCharacterDesign(prompt, project.id, character.id);

            if (isCancelled) return;

            onUpdate(character.id, { characterDesign: url });
            message.success({ content: t('characters.characterDesignGenerated'), key: 'design' });
            return url;
        } catch (e) {
            if (!isCancelled) {
                message.error({ content: t('characters.failed') + e, key: 'design' });
            }
        }
    };

    const handleGenerateAvatar = async () => {
        if (!character) return;
        let isCancelled = false;
        const handleStop = () => {
            isCancelled = true;
            message.destroy('avatar');
            message.info(t('scenes.cancelled', 'Generation cancelled'));
        };

        try {
            message.loading({
                content: <AIProgressToast text={t('characters.generatingAvatar')} onStop={handleStop} />,
                key: 'avatar',
                duration: 0
            });
            const prompt = `Character avatar for ${character.name}: ${character.appearance}, ${character.personality}. Art Style: ${project.wordSettings.artStyle || 'Cinematic'}.`;
            const url = await window.api.generateImage(prompt, project.id, character.id);

            if (isCancelled) return;

            onUpdate(character.id, { avatar: url });
            message.success({ content: t('characters.avatarGenerated'), key: 'avatar' });

            // Chain character design generation
            handleGenerateCharacterDesign(true);
        } catch (e) {
            if (!isCancelled) {
                message.error({ content: t('characters.failed') + e, key: 'avatar' });
            }
        }
    };

    const handleUpload = async (file: File) => {
        try {
            if (!character) return;
            // @ts-ignore - access path if available (Electron)
            const filePath = file.path;
            if (!filePath) {
                message.error('File path not available');
                return;
            }
            const relativePath = await ProjectService.uploadImage(project.id, filePath);
            onUpdate(character.id, { avatar: relativePath });
            message.success(t('common.success'));
        } catch (e) {
            message.error(t('characters.failed') + e);
        }
        return false; // Prevent default upload
    };



    const handleUploadCharacterDesign = async (file: File) => {
        try {
            if (!character) return;
            // @ts-ignore - access path if available (Electron)
            const filePath = file.path;
            if (!filePath) {
                message.error('File path not available');
                return;
            }
            const relativePath = await ProjectService.uploadImage(project.id, filePath);
            onUpdate(character.id, { characterDesign: relativePath });
            message.success(t('common.success'));
        } catch (e) {
            message.error(t('characters.failed') + e);
        }
        return false; // Prevent default upload
    };

    const getImageUrl = (url?: string) => {
        if (!url) return undefined;
        if (url.startsWith('http') || url.startsWith('story-asset://')) return url;
        return `story-asset://${url}`;
    };

    return (
        <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
            {!character ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>
                    {t('characters.emptySelection')}
                </div>
            ) : (
                <>
                    {/* Delete button at top-left */}
                    <div style={{ marginBottom: 16 }}>
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => character && onDelete(character.id)}
                        >
                            {t('characters.deleteCharacter')}
                        </Button>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <Avatar size={100} src={getImageUrl(character.avatar)} icon={<UserOutlined />} />
                        <div style={{ marginTop: 16 }}>
                            <Upload beforeUpload={handleUpload} showUploadList={false}>
                                <Button icon={<UploadOutlined />}>{t('characters.uploadAvatar')}</Button>
                            </Upload>
                            <Button icon={<UserOutlined />} style={{ marginLeft: 8 }} onClick={handleGenerateAvatar}>{t('characters.generateAvatar')}</Button>
                        </div>
                    </div>

                    <Form
                        form={form}
                        layout="vertical"
                        initialValues={character}
                        onValuesChange={handleValuesChange}
                    >
                        <Form.Item name="name" label={t('characters.name')}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="background" label={t('characters.background')}>
                            <TextArea rows={4} />
                        </Form.Item>
                        <Form.Item name="personality" label={t('characters.personality')}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item name="appearance" label={t('characters.appearance')}>
                            <TextArea rows={3} />
                        </Form.Item>
                    </Form>

                    {/* Character Design Section */}
                    <div style={{ marginTop: 24, borderTop: '1px solid #444', paddingTop: 24 }}>
                        <div style={{ marginBottom: 16, fontWeight: 'bold' }}>{t('characters.characterDesign')}</div>

                        {character.characterDesign && (
                            <div style={{ marginBottom: 16, textAlign: 'center' }}>
                                <Image
                                    src={getImageUrl(character.characterDesign)}
                                    style={{ maxWidth: '100%', borderRadius: 8 }}
                                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                            <Upload beforeUpload={handleUploadCharacterDesign} showUploadList={false}>
                                <Button icon={<UploadOutlined />}>{t('characters.uploadCharacterDesign')}</Button>
                            </Upload>
                            <Button icon={<PictureOutlined />} onClick={() => handleGenerateCharacterDesign()}>
                                {t('characters.generateCharacterDesign')}
                            </Button>
                        </div>
                    </div>
                </>
            )}
            {/* Hidden form to keep instance connected if no character */}
            {!character && <div style={{ display: 'none' }}><Form form={form} /></div>}
        </div>
    );
}
