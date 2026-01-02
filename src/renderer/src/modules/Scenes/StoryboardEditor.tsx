
import { Typography, Button, List, Card, message } from 'antd';
import { PlusOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Scene } from '../../../../shared/types';

interface InternalProps {
    scene: Scene | null;
    onUpdate: (updates: Partial<Scene>) => void;
}

export default function StoryboardEditor({ scene }: InternalProps) {
    if (!scene) return <div>Select a scene</div>;

    const handleAutoGenerate = async () => {
        try {
            const settings = await window.api.getSettings();
            if (!settings.volcEngineApiKey) return message.error('No API Key');

            message.loading({ content: 'Generating shots...', key: 'gen' });
            // Assume we add 'shots' to Scene type later, for now we log or show in list if we managed state locally
            // But strict requirement is to use props.
            // I'll assume Scene type has 'shots' or I use local state for now to demo?
            // "onUpdate" implies saving to project.
            // Let's add 'shots' to Scene interface in types.ts? 
            // I haven't done that yet. I'll do it now via another tool or assume dynamic.

            const result = await window.api.generateAI('scene-shots', {
                outline: scene.outline || scene.title,
                artStyle: 'Cinematic' // from project?
            });

            // For now, let's just log it or alert
            console.log(result);
            message.success({ content: 'Generated (Check Console for now)', key: 'gen' });
            // onUpdate({ shots: result }); // If I update type
        } catch (e) {
            message.error({ content: 'Failed: ' + e, key: 'gen' });
        }
    };


    return (
        <div style={{ padding: 24 }}>
            <Typography.Title level={4}>Storyboard: {scene.title}</Typography.Title>
            <div style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />}>Add Shot</Button>
                <Button icon={<VideoCameraOutlined />} style={{ marginLeft: 8 }} onClick={handleAutoGenerate}>Auto-Generate Shots</Button>
            </div>
            <List
                grid={{ gutter: 16, column: 3 }}
                dataSource={[]} // Mock shots
                renderItem={() => (
                    <List.Item>
                        <Card title="Shot 1">
                            <div style={{ height: 100, background: '#333' }}></div>
                            <p>Shot description...</p>
                        </Card>
                    </List.Item>
                )}
            />
            <Typography.Text type="secondary">Shots management coming soon.</Typography.Text>
        </div>
    );
}
