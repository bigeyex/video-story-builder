import { Typography, Row, Col, Input, Card, List, Button, message } from 'antd';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ProjectService } from '../../services/ProjectService';
import { Project } from '../../../../shared/types';

const { Title } = Typography;
const { TextArea } = Input;

type FieldType = 'targetAudience' | 'artStyle' | 'summary';

const EXAMPLES: Record<FieldType, string[]> = {
    targetAudience: [
        "Young Adults (18-25)",
        "Children (5-10)",
        "Sci-Fi Enthusiasts",
        "General Audience",
        "Romance Fans"
    ],
    artStyle: [
        "Cyberpunk",
        "Watercolor",
        "Pixar Style 3D",
        "Anime (Studio Ghibli style)",
        "Hyper-realistic"
    ],
    summary: [
        "A lone warrior travels across a dystopian wasteland to find a lost city.",
        "Two high school students discover a portal to a magical world in their attic.",
        "A detective solves crimes in a city inhabited by robots.",
        "An epic fantasy about a dragon and a knight who become friends.",
        "A slice-of-life story about a cat running a coffee shop."
    ]
};

export default function WordSettingsPage() {
    const { projectId } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [activeField, setActiveField] = useState<FieldType>('summary');

    // Ref for debounced save
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (projectId) {
            ProjectService.loadProject(projectId).then(setProject);
        }
    }, [projectId]);

    const saveProject = async (p: Project) => {
        try {
            await ProjectService.saveProject(p);
            // message.success('Saved'); // Too noisy for auto-save
        } catch {
            message.error('Auto-save failed');
        }
    };

    const handleChange = (field: FieldType, value: string) => {
        if (!project) return;
        const updated = {
            ...project,
            wordSettings: {
                ...project.wordSettings,
                [field]: value
            }
        };
        setProject(updated);

        // Debounce save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            saveProject(updated);
        }, 1000);
    };

    const handleExampleClick = (text: string) => {
        if (!project) return;
        const currentVal = project.wordSettings[activeField];
        const newVal = currentVal ? `${currentVal}\n${text}` : text;
        handleChange(activeField, newVal);
    };

    if (!project) return <div>Loading...</div>;

    return (
        <div style={{ padding: 24, height: '100%', overflow: 'hidden' }}>
            <Row gutter={24} style={{ height: '100%' }}>
                <Col span={16} style={{ height: '100%', overflowY: 'auto' }}>
                    <Title level={3}>World Settings</Title>
                    <div style={{ marginBottom: 24 }}>
                        <Title level={5}>Target Audience</Title>
                        <TextArea
                            rows={4}
                            value={project.wordSettings.targetAudience}
                            onFocus={() => setActiveField('targetAudience')}
                            onChange={e => handleChange('targetAudience', e.target.value)}
                            placeholder="Who is this story for?"
                        />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                        <Title level={5}>Art Style</Title>
                        <TextArea
                            rows={4}
                            value={project.wordSettings.artStyle}
                            onFocus={() => setActiveField('artStyle')}
                            onChange={e => handleChange('artStyle', e.target.value)}
                            placeholder="Visual style description..."
                        />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                        <Title level={5}>Story Summary</Title>
                        <TextArea
                            rows={8}
                            value={project.wordSettings.summary}
                            onFocus={() => setActiveField('summary')}
                            onChange={e => handleChange('summary', e.target.value)}
                            placeholder="Genre, time period, and brief synopsis..."
                        />
                    </div>
                </Col>
                <Col span={8} style={{ height: '100%' }}>
                    <Card
                        title={`Examples: ${activeField.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`}
                        style={{ height: 'calc(100% - 20px)', overflowY: 'auto' }}
                        bodyStyle={{ padding: 0 }}
                    >
                        <List
                            dataSource={EXAMPLES[activeField]}
                            renderItem={item => (
                                <List.Item style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={() => handleExampleClick(item)}>
                                    <div style={{ width: '100%' }}>{item}</div>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
