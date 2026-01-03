import { Form, Input, Button, Avatar, message } from 'antd';
import { UploadOutlined, UserOutlined } from '@ant-design/icons';
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

    if (!character) {
        return (
            <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>
                {t('characters.emptySelection')}
            </div>
        );
    }

    const handleValuesChange = (changedValues: any) => {
        onUpdate(character.id, changedValues);
    };

    const handleGenerateAvatar = async () => {
        try {
            message.loading({ content: t('characters.generatingAvatar'), key: 'avatar' });
            const prompt = `Character avatar for ${character.name}: ${character.appearance}, ${character.personality}. Art Style: ${project.wordSettings.artStyle || 'Cinematic'}.`;
            const url = await window.api.generateImage(prompt);
            onUpdate(character.id, { avatar: url });
            message.success({ content: t('characters.avatarGenerated'), key: 'avatar' });
        } catch (e) {
            message.error({ content: t('characters.failed') + e, key: 'avatar' });
        }
    };

    return (
        <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Avatar size={100} src={character.avatar} icon={<UserOutlined />} />
                <div style={{ marginTop: 16 }}>
                    <Button icon={<UploadOutlined />}>{t('characters.uploadAvatar')}</Button>
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
                <Button danger block onClick={() => onDelete(character.id)}>{t('characters.deleteCharacter')}</Button>
            </div>
        </div>
    );
}
