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

    const handleDeleteScene = (chapId: string, sceneId: string) => {
        if (!project) return;
        const newChapters = project.chapters.map(c => {
            if (c.id === chapId) {
                return { ...c, scenes: c.scenes.filter(s => s.id !== sceneId) };
            }
            return c;
        });
        updateChapters(newChapters);
        if (selectedSceneId === sceneId) setSelectedSceneId(null);
    };

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
                    onDeleteScene={handleDeleteScene}
                />
            </Sider>
            <Content style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                {activeScene ? (
                    <>
                        {/* Top Section: Scene Details (Outline & Conflict) */}
                        <div style={{ height: '50%', borderBottom: '1px solid #333', overflowY: 'auto' }}>
                            <SceneEditor scene={activeScene} onUpdate={handleUpdateScene} />
                        </div>

                        {/* Bottom Section: Storyboard */}
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <StoryboardEditor scene={activeScene} onUpdate={handleUpdateScene} />
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                        Select or create a scene to start editing.
                    </div>
                )}
            </Content>
        </Layout>
    );
}
