import { Layout, message, Radio } from 'antd';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ProjectService } from '../../services/ProjectService';
import { Project, Chapter, Scene } from '../../../../shared/types';
import ChapterList from './ChapterList';
import SceneEditor from './SceneEditor';
import StoryboardEditor from './StoryboardEditor';

const { Content, Sider } = Layout;

export default function ScenesPage() {
    const { projectId } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
    const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

    // Debounce save
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (projectId) {
            ProjectService.loadProject(projectId).then(p => {
                setProject(p);
                // Auto select first chapter/scene if avail
                if (p && p.chapters.length > 0) {
                    setSelectedChapterId(p.chapters[0].id);
                }
            });
        }
    }, [projectId]);

    const saveProject = async (p: Project) => {
        try {
            await ProjectService.saveProject(p);
        } catch {
            message.error('Auto-save failed');
        }
    };

    const updateChapters = (newChapters: Chapter[]) => {
        if (!project) return;
        const updated = { ...project, chapters: newChapters };
        setProject(updated);

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => saveProject(updated), 1000);
    };

    const handleUpdateScene = (updates: Partial<Scene>) => {
        if (!project || !selectedChapterId || !selectedSceneId) return;

        const newChapters = project.chapters.map(c => {
            if (c.id === selectedChapterId) {
                return {
                    ...c,
                    scenes: c.scenes.map(s => s.id === selectedSceneId ? { ...s, ...updates } : s)
                };
            }
            return c;
        });
        updateChapters(newChapters);
    };

    const handleSelectScene = (chapId: string, sceneId: string) => {
        setSelectedChapterId(chapId);
        setSelectedSceneId(sceneId);
    };

    const [activeTab, setActiveTab] = useState<'outline' | 'storyboard'>('outline');

    if (!project) return <div>Loading...</div>;

    const activeChapter = project.chapters.find(c => c.id === selectedChapterId);
    const activeScene = activeChapter?.scenes.find(s => s.id === selectedSceneId) || null;

    return (
        <Layout style={{ height: '100%' }}>
            <Sider width={300} theme="dark" style={{ borderRight: '1px solid #333' }}>
                <ChapterList
                    chapters={project.chapters}
                    selectedChapterId={selectedChapterId}
                    selectedSceneId={selectedSceneId}
                    onSelectChapter={setSelectedChapterId}
                    onSelectScene={handleSelectScene}
                    onUpdateChapters={updateChapters}
                />
            </Sider>
            <Content style={{ display: 'flex', flexDirection: 'column' }}>
                {activeScene && (
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid #333', background: '#1c1c1c' }}>
                        <Radio.Group value={activeTab} onChange={e => setActiveTab(e.target.value as 'outline' | 'storyboard')} buttonStyle="solid">
                            <Radio.Button value="outline">Outline & Conflict</Radio.Button>
                            <Radio.Button value="storyboard">Storyboard</Radio.Button>
                        </Radio.Group>
                    </div>
                )}
                <div style={{ flex: 1, overflow: 'auto' }}>
                    {activeTab === 'outline' ? (
                        <SceneEditor scene={activeScene} onUpdate={handleUpdateScene} />
                    ) : (
                        <StoryboardEditor scene={activeScene} onUpdate={handleUpdateScene} />
                    )}
                </div>
            </Content>
        </Layout>
    );
}
