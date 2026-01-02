import { List, Button, Input, Modal, message, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { Chapter, Scene } from '../../../../shared/types';

interface InternalProps {
    chapters: Chapter[];
    selectedChapterId: string | null;
    selectedSceneId: string | null;
    onSelectChapter: (id: string) => void;
    onSelectScene: (chapterId: string, sceneId: string) => void;
    onUpdateChapters: (chapters: Chapter[]) => void;
}

export default function ChapterList({
    chapters,
    selectedChapterId,
    selectedSceneId,
    onSelectChapter,
    onSelectScene,
    onUpdateChapters
}: InternalProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    const handleAddChapter = () => {
        const newChapter: Chapter = {
            id: `chap-${Date.now()}`,
            title: 'New Chapter',
            scenes: []
        };
        onUpdateChapters([...chapters, newChapter]);
        onSelectChapter(newChapter.id);
    };

    const handleDeleteChapter = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        Modal.confirm({
            title: 'Delete Chapter?',
            content: 'This will delete all scenes in this chapter.',
            onOk: () => {
                const updated = chapters.filter(c => c.id !== id);
                onUpdateChapters(updated);
                if (selectedChapterId === id) onSelectChapter('');
            }
        });
    };

    const handleAddScene = (chapterId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const chapterIndex = chapters.findIndex(c => c.id === chapterId);
        if (chapterIndex === -1) return;

        const newScene: Scene = {
            id: `scene-${Date.now()}`,
            title: 'New Scene',
            outline: '',
            conflict: ''
        };

        const updatedChapters = [...chapters];
        updatedChapters[chapterIndex] = {
            ...updatedChapters[chapterIndex],
            scenes: [...updatedChapters[chapterIndex].scenes, newScene]
        };
        onUpdateChapters(updatedChapters);
        onSelectScene(chapterId, newScene.id);
    };

    const startEdit = (id: string, title: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(id);
        setEditTitle(title);
    };

    const saveEdit = () => {
        if (!editingId) return;
        const updated = chapters.map(c => {
            if (c.id === editingId) return { ...c, title: editTitle };
            // Also check scenes if we want to rename scenes here, but simpler not to for now.
            return {
                ...c,
                scenes: c.scenes.map(s => s.id === editingId ? { ...s, title: editTitle } : s)
            };
        });
        onUpdateChapters(updated);
        setEditingId(null);
    };

    return (
        <div style={{ padding: 10, height: '100%', overflowY: 'auto', background: '#1f1f1f' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Typography.Text strong style={{ color: 'white' }}>Chapters</Typography.Text>
                <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddChapter} />
            </div>

            <List
                dataSource={chapters}
                renderItem={chapter => (
                    <div key={chapter.id} style={{ marginBottom: 8 }}>
                        <div
                            style={{
                                padding: '4px 8px',
                                background: selectedChapterId === chapter.id ? '#1677ff' : '#2a2a2a',
                                cursor: 'pointer',
                                borderRadius: 4,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                            onClick={() => onSelectChapter(chapter.id)}
                        >
                            {editingId === chapter.id ? (
                                <Input
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    onBlur={saveEdit}
                                    onPressEnter={saveEdit}
                                    autoFocus
                                    size="small"
                                    onClick={e => e.stopPropagation()}
                                />
                            ) : (
                                <span style={{ color: 'white', fontWeight: 'bold' }}>{chapter.title}</span>
                            )}
                            <div>
                                <Button type="text" size="small" icon={<PlusOutlined style={{ color: 'white' }} />} onClick={(e) => handleAddScene(chapter.id, e)} />
                                <Button type="text" size="small" icon={<EditOutlined style={{ color: 'white' }} />} onClick={(e) => startEdit(chapter.id, chapter.title, e)} />
                                <Button type="text" size="small" icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />} onClick={(e) => handleDeleteChapter(chapter.id, e)} />
                            </div>
                        </div>

                        {/* Scenes List */}
                        <div style={{ paddingLeft: 16 }}>
                            {chapter.scenes.map(scene => (
                                <div
                                    key={scene.id}
                                    style={{
                                        padding: '2px 8px',
                                        cursor: 'pointer',
                                        color: selectedSceneId === scene.id ? '#1677ff' : '#ccc',
                                        background: selectedSceneId === scene.id ? 'rgba(22, 119, 255, 0.1)' : 'transparent',
                                        borderLeft: selectedSceneId === scene.id ? '2px solid #1677ff' : 'none'
                                    }}
                                    onClick={(e) => { e.stopPropagation(); onSelectScene(chapter.id, scene.id); }}
                                >
                                    {editingId === scene.id ? (
                                        <Input
                                            value={editTitle}
                                            onChange={e => setEditTitle(e.target.value)}
                                            onBlur={saveEdit}
                                            onPressEnter={saveEdit}
                                            autoFocus
                                            size="small"
                                        />
                                    ) : (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{scene.title}</span>
                                            {selectedSceneId === scene.id && (
                                                <EditOutlined onClick={(e) => startEdit(scene.id, scene.title, e)} />
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            />
        </div>
    );
}
