import { Form, Input, Button, Avatar, message, Upload } from 'antd';
import { UploadOutlined, UserOutlined } from '@ant-design/icons';
import { ProjectService } from '../../services/ProjectService';
import { Character, Project } from '../../../../shared/types';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

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

    const handleGenerateAvatar = async () => {
        if (!character) return;
        try {
            message.loading({ content: t('characters.generatingAvatar'), key: 'avatar', duration: 0 });
            const prompt = `Character avatar for ${character.name}: ${character.appearance}, ${character.personality}. Art Style: ${project.wordSettings.artStyle || 'Cinematic'}.`;
            const url = await window.api.generateImage(prompt, project.id, character.id);
            // Result is already relative or story-asset:// from main process
            onUpdate(character.id, { avatar: url });
            message.success({ content: t('characters.avatarGenerated'), key: 'avatar' });
        } catch (e) {
            message.error({ content: t('characters.failed') + e, key: 'avatar' });
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

                    <div style={{ marginTop: 24, borderTop: '1px solid #444', paddingTop: 24 }}>
                        <Button danger block onClick={() => character && onDelete(character.id)}>{t('characters.deleteCharacter')}</Button>
                    </div>
                </>
            )}
            {/* Hidden form to keep instance connected if no character */}
            {!character && <div style={{ display: 'none' }}><Form form={form} /></div>}
        </div>
    );
}
