import { Typography, Row, Col, Input, Card, List, message } from 'antd';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProjectService } from '../../services/ProjectService';
import { Project } from '../../../../shared/types';

const { Title } = Typography;
const { TextArea } = Input;

type FieldType = 'targetAudience' | 'artStyle' | 'summary';

export default function WordSettingsPage() {
    const { t } = useTranslation();
    const { projectId } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [activeField, setActiveField] = useState<FieldType>('summary');

    // Fetch examples from i18n
    const EXAMPLES = t('worldSettings.examples', { returnObjects: true }) as Record<FieldType, string[]>;

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
        } catch {
            message.error(t('common.autoSaveFailed'));
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

    if (!project) return <div>{t('common.loading')}</div>;

    const getFieldLabel = (field: FieldType) => {
        switch (field) {
            case 'targetAudience': return t('worldSettings.targetAudience');
            case 'artStyle': return t('worldSettings.artStyle');
            case 'summary': return t('worldSettings.summary');
            default: return '';
        }
    };

    return (
        <div style={{ padding: 24, height: '100%', overflow: 'hidden' }}>
            <Row gutter={24} style={{ height: '100%' }}>
                <Col span={16} style={{ height: '100%', overflowY: 'auto' }}>
                    <Title level={3}>{t('worldSettings.title')}</Title>
                    <div style={{ marginBottom: 24 }}>
                        <Title level={5}>{t('worldSettings.targetAudience')}</Title>
                        <TextArea
                            rows={4}
                            value={project.wordSettings.targetAudience}
                            onFocus={() => setActiveField('targetAudience')}
                            onChange={e => handleChange('targetAudience', e.target.value)}
                            placeholder={t('worldSettings.targetAudiencePlaceholder')}
                        />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                        <Title level={5}>{t('worldSettings.artStyle')}</Title>
                        <TextArea
                            rows={4}
                            value={project.wordSettings.artStyle}
                            onFocus={() => setActiveField('artStyle')}
                            onChange={e => handleChange('artStyle', e.target.value)}
                            placeholder={t('worldSettings.artStylePlaceholder')}
                        />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                        <Title level={5}>{t('worldSettings.summary')}</Title>
                        <TextArea
                            rows={8}
                            value={project.wordSettings.summary}
                            onFocus={() => setActiveField('summary')}
                            onChange={e => handleChange('summary', e.target.value)}
                            placeholder={t('worldSettings.summaryPlaceholder')}
                        />
                    </div>
                </Col>
                <Col span={8} style={{ height: '100%' }}>
                    <Card
                        title={`${t('worldSettings.examplesTitle')} ${getFieldLabel(activeField)}`}
                        style={{ height: 'calc(100% - 20px)', overflowY: 'auto' }}
                        styles={{ body: { padding: 0 } }}
                    >
                        <List
                            dataSource={EXAMPLES[activeField] || []}
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
