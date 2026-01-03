import React, { useEffect, useState } from 'react';
import { Button, Card, Typography, Space, Layout, Modal, Input, message } from 'antd';
import { PlusOutlined, FolderOpenOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProjectMetadata } from '../../../shared/types';
import { ProjectService } from '../services/ProjectService';

const { Title, Text } = Typography;
const { Content } = Layout;

export default function ProjectList() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [projects, setProjects] = useState<ProjectMetadata[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');

    const loadProjects = async () => {
        setLoading(true);
        try {
            const list = await ProjectService.getProjects();
            setProjects(list);
        } catch (error) {
            console.error(error);
            message.error(t('common.error', 'Failed to load projects'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, []);

    const handleCreate = async () => {
        if (!newProjectName.trim()) return;
        try {
            const p = await ProjectService.createProject(newProjectName);
            message.success(t('projects.createSuccess', 'Project created'));
            setIsModalOpen(false);
            setNewProjectName('');
            // loadProjects();
            // Optional: open immediately
            navigate(`/workspace/${p.id}/settings`);
        } catch (error) {
            message.error(t('common.error', 'Failed to create project'));
        }
    };

    const handleOpen = (id: string) => {
        navigate(`/workspace/${id}/settings`);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        Modal.confirm({
            title: t('common.confirmDelete'),
            icon: <ExclamationCircleOutlined />,
            content: t('projects.deleteConfirm', 'This will permanently delete the project.'),
            okText: t('common.yes'),
            cancelText: t('common.no'),
            onOk: async () => {
                try {
                    await ProjectService.deleteProject(id);
                    message.success(t('common.deleteSuccess', 'Project deleted'));
                    loadProjects();
                } catch {
                    message.error(t('common.error', 'Failed to delete project'));
                }
            }
        });
    };

    return (
        <Layout style={{ height: '100vh', padding: '24px' }}>
            <Content style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={2} style={{ margin: 0 }}>{t('projects.title')}</Title>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Button icon={<FolderOpenOutlined />} onClick={() => ProjectService.openProjectsFolder()}>
                                {t('projects.openFolder')}
                            </Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                                {t('projects.newProject')}
                            </Button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                        {projects.map(p => (
                            <Card
                                key={p.id}
                                hoverable
                                onClick={() => handleOpen(p.id)}
                                actions={[
                                    <FolderOpenOutlined key="open" onClick={() => handleOpen(p.id)} />,
                                    <DeleteOutlined key="delete" onClick={(e) => handleDelete(p.id, e)} style={{ color: 'red' }} />
                                ]}
                            >
                                <Card.Meta
                                    title={p.name}
                                    description={`${t('projects.lastModified')}${new Date(p.lastModified).toLocaleString()}`}
                                />
                            </Card>
                        ))}
                        {projects.length === 0 && !loading && (
                            <Text type="secondary">{t('projects.noProjects', 'No projects yet. Create one to get started.')}</Text>
                        )}
                    </div>
                </Space>
            </Content>

            <Modal
                title={t('projects.createTitle')}
                open={isModalOpen}
                onOk={handleCreate}
                onCancel={() => setIsModalOpen(false)}
                okText={t('common.add')}
                cancelText={t('common.cancel')}
            >
                <Input
                    placeholder={t('projects.namePlaceholder')}
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    onPressEnter={handleCreate}
                    autoFocus
                />
            </Modal>
        </Layout>
    );
}
