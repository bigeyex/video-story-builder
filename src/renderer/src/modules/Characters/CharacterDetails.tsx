import { Form, Input, Card, Upload, Button, Avatar, Typography, message } from 'antd';
import { UploadOutlined, UserOutlined } from '@ant-design/icons';
import { Character } from '../../../../shared/types';
import { useEffect } from 'react';

const { TextArea } = Input;
const { Title } = Typography;

interface InternalProps {
    character: Character | null;
    onUpdate: (id: string, updates: Partial<Character>) => void;
    onDelete: (id: string) => void;
}

export default function CharacterDetails({ character, onUpdate, onDelete }: InternalProps) {
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
                Select a character to edit details
            </div>
        );
    }

    const handleValuesChange = (changedValues: any, allValues: any) => {
        onUpdate(character.id, changedValues);
    };

    const handleGenerateAvatar = async () => {
        try {
            message.loading({ content: 'Generating Avatar...', key: 'avatar' });
            const prompt = `Character avatar for ${character.name}: ${character.appearance}, ${character.personality}. Art Style: Cinematic.`;
            const url = await window.api.generateImage(prompt);
            onUpdate(character.id, { avatar: url });
            message.success({ content: 'Avatar Generated!', key: 'avatar' });
        } catch (e) {
            message.error({ content: 'Failed: ' + e, key: 'avatar' });
        }
    };

    return (
        <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Avatar size={100} src={character.avatar} icon={<UserOutlined />} />
                <div style={{ marginTop: 16 }}>
                    <Button icon={<UploadOutlined />}>Upload Avatar</Button>
                    <Button icon={<UserOutlined />} style={{ marginLeft: 8 }} onClick={handleGenerateAvatar}>Generate</Button>
                </div>
            </div>

            <Form
                form={form}
                layout="vertical"
                initialValues={character}
                onValuesChange={handleValuesChange}
            >
                <Form.Item name="name" label="Name">
                    <Input />
                </Form.Item>
                <Form.Item name="background" label="Background">
                    <TextArea rows={4} />
                </Form.Item>
                <Form.Item name="personality" label="Personality">
                    <TextArea rows={3} />
                </Form.Item>
                <Form.Item name="appearance" label="Appearance">
                    <TextArea rows={3} />
                </Form.Item>
            </Form>

            <div style={{ marginTop: 24, borderTop: '1px solid #444', paddingTop: 24 }}>
                <Button danger block onClick={() => onDelete(character.id)}>Delete Character</Button>
            </div>
        </div>
    );
}
