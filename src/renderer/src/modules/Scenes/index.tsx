import { Layout, message } from 'antd';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { ProjectService } from '../../services/ProjectService';
import { Project, Chapter, Scene } from '../../../../shared/types';
import ChapterList from './ChapterList';
import SceneEditor from './SceneEditor';
import StoryboardEditor from './StoryboardEditor';

const { Content } = Layout;
const MIN_SIDER_WIDTH = 200;
const MAX_SIDER_WIDTH = 600;

export default function ScenesPage() {
    const { projectId } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
    const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

    // Sidebar State
    const [siderWidth, setSiderWidth] = useState(300);
    const [collapsed, setCollapsed] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

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

    // Resizing Logic
    const startResizing = useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((mouseMoveEvent: MouseEvent) => {
        if (isResizing && sidebarRef.current) {
            // Let's assume standard layout.
            // Actually, simplified: just use mouseMoveEvent.clientX - 60 (approx main sidebar width if collapsed).
            // To be robust, let's just track delta from start. But we didn't store start X.
            // Let's use `getBoundingClientRect` of the container?
            // Let's try simple APPROACH: Width = mouseMoveEvent.clientX - (Offset of this component).
            // We can get offset from sidebarRef.
            const offsetLeft = sidebarRef.current.getBoundingClientRect().left;
            const width = mouseMoveEvent.clientX - offsetLeft;
            if (width >= MIN_SIDER_WIDTH && width <= MAX_SIDER_WIDTH) {
                setSiderWidth(width);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    if (!project) return <div>Loading...</div>;

    const activeChapter = project.chapters.find(c => c.id === selectedChapterId);
    const activeScene = activeChapter?.scenes.find(s => s.id === selectedSceneId) || null;

    return (
        <Layout style={{ height: '100%', flexDirection: 'row' }}>
            {/* Resizable Sidebar */}
            <div
                ref={sidebarRef}
                style={{
                    width: collapsed ? 32 : siderWidth,
                    minWidth: collapsed ? 32 : MIN_SIDER_WIDTH,
                    maxWidth: collapsed ? 32 : MAX_SIDER_WIDTH,
                    transition: isResizing ? 'none' : 'width 0.2s',
                    background: '#1f1f1f',
                    borderRight: '1px solid #333',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div style={{ flex: 1, overflow: 'hidden', display: collapsed ? 'none' : 'block' }}>
                    <ChapterList
                        chapters={project.chapters}
                        selectedChapterId={selectedChapterId}
                        selectedSceneId={selectedSceneId}
                        onSelectChapter={setSelectedChapterId}
                        onSelectScene={handleSelectScene}
                        onUpdateChapters={updateChapters}
                        onDeleteScene={handleDeleteScene}
                    />
                </div>

                {/* Spacer to keep trigger at bottom when collapsed */}
                {collapsed && <div style={{ flex: 1 }} />}

                {/* Collapse Trigger at bottom */}
                <div style={{
                    height: 32,
                    background: '#141414',
                    borderTop: '1px solid #333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 20,
                    flexShrink: 0,
                    marginTop: 'auto' // Robust bottom alignment
                }}
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                </div>

                {/* Drag Handle */}
                {!collapsed && (
                    <div
                        onMouseDown={startResizing}
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            width: 5,
                            height: '100%',
                            cursor: 'col-resize',
                            zIndex: 10,
                            background: 'transparent',
                        }}
                    />
                )}
            </div>

            <Content style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', flex: 1 }}>
                {activeScene ? (
                    <>
                        {/* Top Section: Scene Details */}
                        <div style={{ flexShrink: 0, borderBottom: '1px solid #333', overflowY: 'auto', maxHeight: '50%' }}>
                            <SceneEditor project={project} scene={activeScene} onUpdate={handleUpdateScene} />
                        </div>

                        {/* Bottom Section: Storyboard */}
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <StoryboardEditor project={project} scene={activeScene} onUpdate={handleUpdateScene} />
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
