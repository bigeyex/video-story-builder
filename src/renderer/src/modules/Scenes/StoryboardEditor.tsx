import { Button, Input, message, Dropdown, Checkbox, MenuProps, Space, Radio, Tooltip, Upload } from 'antd';
import {
    PlusOutlined, VideoCameraOutlined, MoreOutlined, RobotOutlined,
    ScissorOutlined, CopyOutlined, SnippetsOutlined,
    ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined,
    UploadOutlined
} from '@ant-design/icons';
import { ProjectService } from '../../services/ProjectService';
import { AIProgressToast } from '../../utils/AIUtils';
import { Scene, StoryboardShot, Project } from '../../../../shared/types';
import { v4 as uuidv4 } from 'uuid';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const { TextArea } = Input;

interface InternalProps {
    project: Project;
    scene: Scene | null;
    onUpdate: (updates: Partial<Scene>) => void;
}

export default function StoryboardEditor({ project, scene, onUpdate }: InternalProps) {
    const { t } = useTranslation();
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const [clipboard, setClipboard] = useState<StoryboardShot[]>([]);

    if (!scene) return <div>{t('common.selectScene', 'Select a scene')}</div>;

    const shots = scene.storyboard || [];

    const updateShots = (newShots: StoryboardShot[]) => {
        onUpdate({ storyboard: newShots });
    };

    // --- Selection Logic ---
    const handleShotClick = (id: string, event: React.MouseEvent | React.ChangeEvent) => {
        const isShift = (event as React.MouseEvent).shiftKey;
        const isMeta = (event as React.MouseEvent).metaKey || (event as React.MouseEvent).ctrlKey;

        setSelectedIds(prev => {
            const newSet = new Set(prev);

            if (isShift && lastSelectedId) {
                const currentIndex = shots.findIndex(s => s.id === id);
                const lastIndex = shots.findIndex(s => s.id === lastSelectedId);
                const start = Math.min(currentIndex, lastIndex);
                const end = Math.max(currentIndex, lastIndex);

                // When shift clicking, we usually ADD the range to selection
                for (let i = start; i <= end; i++) {
                    newSet.add(shots[i].id);
                }
            } else if (isMeta) {
                if (newSet.has(id)) newSet.delete(id);
                else newSet.add(id);
            } else {
                // Normal click or checkbox toggle
                // If it's a checkbox ChangeEvent, 'checked' is handled by toggleSelection
                // But here we unify click behavior
                if (newSet.has(id) && newSet.size === 1) newSet.delete(id);
                else {
                    newSet.clear();
                    newSet.add(id);
                }
            }
            return newSet;
        });
        setLastSelectedId(id);
    };

    const toggleSelection = (id: string, checked: boolean, event?: React.MouseEvent) => {
        if (event?.shiftKey && lastSelectedId) {
            handleShotClick(id, event);
            return;
        }

        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
        if (checked) setLastSelectedId(id);
    };

    const selectAll = () => {
        if (selectedIds.size > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(shots.map(s => s.id)));
        }
    };

    // --- Action Logic ---
    const handleAddShot = (index?: number) => {
        const newShot: StoryboardShot = {
            id: uuidv4(),
            description: '',
            dialogue: '',
            duration: 2,
            camera: '',
            sound: ''
        };
        const newShots = [...shots];
        if (index !== undefined) {
            newShots.splice(index, 0, newShot);
        } else {
            newShots.push(newShot);
        }
        updateShots(newShots);
    };

    const handleDelete = (ids: string[]) => {
        const idSet = new Set(ids);
        // Use functional usage for setSelectedIds to ensure we don't have race conditions
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            ids.forEach(id => newSet.delete(id));
            return newSet;
        });
        updateShots(shots.filter(s => !idSet.has(s.id)));
    };

    const handleCopy = (ids: string[]) => {
        const shotsToCopy = shots.filter(s => ids.includes(s.id));
        setClipboard(shotsToCopy.map(s => ({ ...s, id: uuidv4() }))); // New IDs on copy
        message.success(`${t('storyboard.copy')} ${shotsToCopy.length}`);
    };

    const handleCut = (ids: string[]) => {
        handleCopy(ids);
        handleDelete(ids);
    };

    const handlePaste = (index: number) => {
        if (clipboard.length === 0) return;
        // Regenerate IDs for pasted items to avoid duplicates if pasted multiple times
        const toPaste = clipboard.map(s => ({ ...s, id: uuidv4() }));
        const newShots = [...shots];
        newShots.splice(index, 0, ...toPaste);
        updateShots(newShots);
        message.success(`${t('storyboard.pasteUp')} ${toPaste.length}`);
    };

    const maskJson = (text: string) => {
        return text.replace(/[{}["\]:,\n]/g, ' ').replace(/\s+/g, ' ').trim();
    };

    const handlePerShotAI = async (shot: StoryboardShot) => {
        try {
            const settings = await window.api.getSettings();
            if (!settings.volcEngineApiKey) {
                message.error(t('common.error', 'No API Key'));
                return;
            }

            if (!shot.description.trim()) {
                const requestId = uuidv4();
                const handleStop = () => {
                    window.api.cancelAI(requestId);
                    message.destroy('shot-ai');
                    message.info(t('scenes.cancelled', 'Generation cancelled'));
                };

                message.loading({
                    content: <AIProgressToast text={t('storyboard.generatingDescription')} onStop={handleStop} />,
                    key: 'shot-ai',
                    duration: 0
                });

                let fullContent = '';
                const removeChunkListener = window.api.onAIStreamChunk((chunk) => {
                    fullContent += chunk;
                    message.loading({
                        content: <AIProgressToast
                            text={`${t('storyboard.generatingDescription')}... ${maskJson(fullContent).slice(-50)}`}
                            onStop={handleStop}
                        />,
                        key: 'shot-ai',
                        duration: 0
                    });
                });

                const removeEndListener = window.api.onAIStreamEnd((finalContent) => {
                    removeChunkListener();
                    removeEndListener();

                    let content = finalContent.replace(/```json/g, '').replace(/```/g, '').trim();
                    try {
                        const result = JSON.parse(content);
                        if (result && result.description) {
                            handleFieldChange(shot.id, 'description', result.description);
                            if (result.dialogue) handleFieldChange(shot.id, 'dialogue', result.dialogue);
                            message.success({ content: t('storyboard.descriptionGenerated'), key: 'shot-ai' });
                        } else {
                            message.error({ content: t('common.failed'), key: 'shot-ai' });
                        }
                    } catch (e) {
                        message.error({ content: t('common.failed') + ' (Invalid JSON)', key: 'shot-ai' });
                    }
                });

                window.api.generateAIStream('shot-description', {
                    sceneTitle: scene.title,
                    sceneOutline: scene.outline,
                    shotIndex: shots.findIndex(s => s.id === shot.id) + 1,
                    previousShot: shots[shots.findIndex(s => s.id === shot.id) - 1]?.description || 'None',
                    requestId
                });
                return;
            }

            // Generate Image
            message.loading({ content: t('storyboard.generatingImage'), key: 'shot-ai', duration: 0 });
            const prompt = `Art Style: ${project.wordSettings.artStyle}. Scene: ${scene.title}. Shot Description: ${shot.description}. Camera: ${shot.camera}.`;
            // Note: generateImage is not streaming yet based on the plan, but we can make it persistent
            const url = await window.api.generateImage(prompt, project.id, 'shot-' + shot.id);
            handleFieldChange(shot.id, 'image', url);
            message.success({ content: t('storyboard.imageGenerated'), key: 'shot-ai' });
        } catch (e) {
            message.error({ content: t('common.failed') + ': ' + e, key: 'shot-ai' });
        }
    };

    const handleFieldChange = (id: string, field: keyof StoryboardShot, value: any) => {
        updateShots(shots.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    // --- Lazy Loading ---
    useEffect(() => {
        if (scene.id && project.id) {
            ProjectService.loadSceneStoryboard(project.id, scene.id).then(res => {
                if (Array.isArray(res)) {
                    // Update only if local shots are empty or we want to force refresh?
                    // The main ScenesPage handles project state. 
                    // To avoid infinite loops or overwriting, we should be careful.
                    // But here onUpdate({ storyboard: res }) would trigger parent update.
                    onUpdate({ storyboard: res });
                }
            });
        }
    }, [scene.id, project.id]);

    const getImageUrl = (url?: string): string | undefined => {
        if (!url) return undefined;
        if (url.startsWith('http') || url.startsWith('story-asset://')) return url;
        return `story-asset://${url}`;
    };

    const handleAutoGenerate = async () => {
        try {
            const settings = await window.api.getSettings();
            if (!settings.volcEngineApiKey) {
                message.error(t('common.error', 'No API Key'));
                return;
            }

            const requestId = uuidv4();
            const handleStop = () => {
                window.api.cancelAI(requestId);
                message.destroy('gen');
                message.info(t('scenes.cancelled', 'Generation cancelled'));
            };

            message.loading({
                content: <AIProgressToast text={t('storyboard.generatingShots')} onStop={handleStop} />,
                key: 'gen',
                duration: 0
            });

            const streamData = { thinking: '', content: '' };

            const updateToast = () => {
                const displayText = streamData.thinking
                    ? <>{t('storyboard.generatingShots')}<br /><br />Thinking process:<br /><i style={{ color: '#ccc' }}>{streamData.thinking.slice(-150)}</i></>
                    : <>{t('storyboard.generatingShots')}<br /><br />Thinking process:<br /><i style={{ color: '#ccc' }}>{maskJson(streamData.content).slice(-100)}</i></>;

                message.loading({
                    content: <AIProgressToast
                        text={displayText}
                        onStop={handleStop}
                    />,
                    key: 'gen',
                    duration: 0
                });
            };

            const removeThinkingListener = window.api.onAIStreamThinking((chunk) => {
                streamData.thinking += chunk;
                updateToast();
            });

            const removeChunkListener = window.api.onAIStreamChunk((chunk) => {
                streamData.content += chunk;
                updateToast();
            });

            const removeEndListener = window.api.onAIStreamEnd((finalContent) => {
                removeThinkingListener();
                removeChunkListener();
                removeEndListener();

                let content = finalContent.replace(/```json/g, '').replace(/```/g, '').trim();
                try {
                    // Handle potential wrapped JSON or markdown noise
                    const firstBracket = content.indexOf('[');
                    const firstBrace = content.indexOf('{');

                    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
                        // It's likely an array
                        content = content.substring(firstBracket, content.lastIndexOf(']') + 1);
                    } else if (firstBrace !== -1) {
                        // It's likely an object
                        content = content.substring(firstBrace, content.lastIndexOf('}') + 1);
                    }

                    let result = JSON.parse(content);

                    // Unpack if wrapped in a key like "shots" or "storyboard"
                    if (!Array.isArray(result) && typeof result === 'object') {
                        const values = Object.values(result);
                        const arrayVal = values.find(v => Array.isArray(v));
                        if (arrayVal) {
                            result = arrayVal;
                        }
                    }

                    if (Array.isArray(result) && result.length > 0) {
                        const generatedShots: StoryboardShot[] = result.map((r: any) => ({
                            id: uuidv4(),
                            description: r.description || '',
                            dialogue: r.dialogue || '',
                            duration: r.duration || 2,
                            camera: r.camera || '',
                            sound: r.sound || '',
                            image: r.image || undefined
                        }));
                        updateShots([...shots, ...generatedShots]);
                        message.success({ content: t('storyboard.generated'), key: 'gen' });
                    } else {
                        console.warn('AI Output not an array:', result);
                        message.warning({ content: t('storyboard.aiNoShots'), key: 'gen' });
                    }
                } catch (e) {
                    console.error('Failed to parse AI response:', e, content);
                    message.error({ content: t('common.failed') + ' (Invalid JSON)', key: 'gen' });
                }
            });

            window.api.generateAIStream('scene-storyboard', {
                title: scene.title,
                outline: scene.outline,
                conflict: scene.conflict,
                artStyle: project.wordSettings.artStyle,
                characters: project.characters.map(c => `${c.name}: ${c.appearance}`).join('\n'),
                requestId
            });

        } catch (e) {
            message.error({ content: t('common.failed') + ': ' + e, key: 'gen' });
        }
    };

    // --- Layout Constants ---
    const IMG_WIDTH = 200;
    const IMG_HEIGHT = aspectRatio === '16:9' ? (IMG_WIDTH * 9 / 16) : (IMG_WIDTH * 16 / 9);

    const getMenu = (index: number, shot: StoryboardShot): MenuProps => {
        const isTargetSelected = selectedIds.has(shot.id);
        const targetIds = isTargetSelected ? Array.from(selectedIds) : [shot.id];

        // Helper to check if move is possible for the whole selection
        // For simplicity, we enable move if at least one selected item can move or if the block can move.
        // Actually, let's just use the target shot index as a reference? 
        // No, let's check the extremes of the selection.
        const selectedIndices = shots.map((s, i) => selectedIds.has(s.id) ? i : -1).filter(i => i !== -1);
        const minIdx = Math.min(...selectedIndices);
        const maxIdx = Math.max(...selectedIndices);

        return {
            items: [
                { key: 'insert-up', label: t('storyboard.insertUp'), icon: <ArrowUpOutlined />, disabled: isTargetSelected && selectedIds.size > 1, onClick: () => handleAddShot(index) },
                { key: 'insert-down', label: t('storyboard.insertDown'), icon: <ArrowDownOutlined />, disabled: isTargetSelected && selectedIds.size > 1, onClick: () => handleAddShot(index + 1) },
                { type: 'divider' },
                { key: 'cut', label: t('storyboard.cut'), icon: <ScissorOutlined />, onClick: () => handleCut(targetIds) },
                { key: 'copy', label: t('storyboard.copy'), icon: <CopyOutlined />, onClick: () => handleCopy(targetIds) },
                { key: 'paste-up', label: t('storyboard.pasteUp'), icon: <SnippetsOutlined />, disabled: clipboard.length === 0, onClick: () => handlePaste(index) },
                { key: 'paste-down', label: t('storyboard.pasteDown'), icon: <SnippetsOutlined />, disabled: clipboard.length === 0, onClick: () => handlePaste(index + 1) },
                { type: 'divider' },
                {
                    key: 'move-up', label: t('storyboard.moveUp'), icon: <ArrowUpOutlined />,
                    disabled: isTargetSelected ? minIdx === 0 : index === 0,
                    onClick: () => {
                        if (isTargetSelected) {
                            handleMove('up');
                        } else {
                            const newShots = [...shots];
                            [newShots[index], newShots[index - 1]] = [newShots[index - 1], newShots[index]];
                            updateShots(newShots);
                        }
                    }
                },
                {
                    key: 'move-down', label: t('storyboard.moveDown'), icon: <ArrowDownOutlined />,
                    disabled: isTargetSelected ? maxIdx === shots.length - 1 : index === shots.length - 1,
                    onClick: () => {
                        if (isTargetSelected) {
                            handleMove('down');
                        } else {
                            const newShots = [...shots];
                            [newShots[index], newShots[index + 1]] = [newShots[index + 1], newShots[index]];
                            updateShots(newShots);
                        }
                    }
                },
                { type: 'divider' },
                { key: 'delete', label: t('storyboard.delete'), icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(targetIds) },
            ]
        };
    };

    // Robust move selection
    const handleMove = (direction: 'up' | 'down') => {
        if (selectedIds.size === 0) return;
        const selectedIndices = shots.map((s, i) => selectedIds.has(s.id) ? i : -1).filter(i => i !== -1).sort((a, b) => a - b);
        const minIdx = selectedIndices[0];
        const maxIdx = selectedIndices[selectedIndices.length - 1];

        const selectedShots = shots.filter(s => selectedIds.has(s.id));
        const unselectedShots = shots.filter(s => !selectedIds.has(s.id));

        if (direction === 'up') {
            if (minIdx === 0) return;
            const targetShot = shots[minIdx - 1];
            const insertBeforeIdx = unselectedShots.indexOf(targetShot);
            unselectedShots.splice(insertBeforeIdx, 0, ...selectedShots);
            updateShots(unselectedShots);
        } else {
            if (maxIdx === shots.length - 1) return;
            const targetShot = shots[maxIdx + 1];
            const insertAfterIdx = unselectedShots.indexOf(targetShot);
            unselectedShots.splice(insertAfterIdx + 1, 0, ...selectedShots);
            updateShots(unselectedShots);
        }
    };

    return (
        <div style={{ padding: '12px 24px', height: '100%', display: 'flex', flexDirection: 'column', background: '#141414' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddShot()}>{t('storyboard.addShot')}</Button>
                    <Button icon={<VideoCameraOutlined />} onClick={handleAutoGenerate}>{t('storyboard.autoGenerate')}</Button>
                    <Button onClick={selectAll}>
                        {selectedIds.size > 0 ? t('common.deselectAll', 'Deselect All') : t('common.selectAll', 'Select All')}
                    </Button>
                </Space>
                <Space>
                    <span>{t('storyboard.screenFormat')}:</span>
                    <Radio.Group value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} buttonStyle="solid">
                        <Radio.Button value="16:9">{t('storyboard.desktop')}</Radio.Button>
                        <Radio.Button value="9:16">{t('storyboard.mobile')}</Radio.Button>
                    </Radio.Group>
                </Space>
            </div>

            {/* Table Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid #333', paddingBottom: 8, marginBottom: 8, color: '#888', fontWeight: 'bold', fontSize: 12 }}>
                <div style={{ width: 60, textAlign: 'center' }}>
                    <Checkbox
                        checked={shots.length > 0 && selectedIds.size === shots.length}
                        indeterminate={selectedIds.size > 0 && selectedIds.size < shots.length}
                        onChange={selectAll}
                    />
                </div>
                <div style={{ width: IMG_WIDTH + 16 }}>{t('storyboard.visual')}</div>
                <div style={{ flex: 1, minWidth: 600, display: 'flex', gap: 16 }}>
                    <div style={{ flex: 2 }}>{t('storyboard.description')}</div>
                    <div style={{ flex: 2 }}>{t('storyboard.dialogue')}</div>
                    <div style={{ width: 80 }}>{t('storyboard.duration')}</div>
                    <div style={{ flex: 1 }}>{t('storyboard.camera')}</div>
                    <div style={{ flex: 1 }}>{t('storyboard.sound')}</div>
                </div>
            </div>

            {/* Scrollable List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {shots.map((shot, index) => (
                        <div
                            key={shot.id}
                            onClick={(e) => handleShotClick(shot.id, e)}
                            style={{
                                display: 'flex',
                                background: selectedIds.has(shot.id) ? '#1f2a3a' : '#1f1f1f',
                                border: selectedIds.has(shot.id) ? '1px solid #1677ff' : '1px solid #333',
                                borderRadius: 4,
                                padding: 8,
                                cursor: 'pointer'
                            }}
                        >
                            {/* Left Controls */}
                            <div style={{ width: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, borderRight: '1px solid #333', marginRight: 12, paddingTop: 4 }}>
                                <span style={{ color: '#666', fontWeight: 'bold' }}>#{index + 1}</span>
                                <Tooltip title={t('scenes.aiAssistance', 'AI Assistance')}>
                                    <Button type="text" size="small" icon={<RobotOutlined style={{ color: '#1677ff' }} />} onClick={(e) => { e.stopPropagation(); handlePerShotAI(shot); }} />
                                </Tooltip>
                                <Dropdown menu={getMenu(index, shot)} trigger={['click']}>
                                    <Button type="text" size="small" icon={<MoreOutlined style={{ color: '#fff', fontSize: 16 }} />} onClick={e => e.stopPropagation()} />
                                </Dropdown>
                                <Checkbox
                                    checked={selectedIds.has(shot.id)}
                                    onChange={e => toggleSelection(shot.id, e.target.checked, e.nativeEvent as any)}
                                    onClick={e => e.stopPropagation()}
                                />
                            </div>

                            {/* Image */}
                            <Upload
                                showUploadList={false}
                                beforeUpload={async (file) => {
                                    try {
                                        // @ts-ignore
                                        const filePath = file.path;
                                        if (filePath) {
                                            const res = await ProjectService.uploadImage(project.id, filePath);
                                            handleFieldChange(shot.id, 'image', res);
                                        }
                                    } catch (e) {
                                        message.error(t('characters.failed') + e);
                                    }
                                    return false;
                                }}
                            >
                                <div style={{
                                    width: IMG_WIDTH,
                                    height: IMG_HEIGHT,
                                    marginRight: 16,
                                    background: '#000',
                                    border: '1px dashed #444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    cursor: 'pointer'
                                }}>
                                    {shot.image ? (
                                        <img src={getImageUrl(shot.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ textAlign: 'center', color: '#555', fontSize: 12 }}>
                                            <UploadOutlined style={{ fontSize: 20, marginBottom: 4 }} /><br />{t('common.upload')}
                                        </div>
                                    )}
                                </div>
                            </Upload>

                            {/* Fields Container (Horizontal Scroll) */}
                            <div style={{ flex: 1, overflowX: 'auto' }}>
                                <div style={{ display: 'flex', gap: 16, minWidth: 600, height: '100%' }}>
                                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                                        <TextArea
                                            value={shot.description}
                                            onChange={e => handleFieldChange(shot.id, 'description', e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                            style={{ height: '100%', resize: 'none', background: '#141414', border: '1px solid #333', color: '#ddd' }}
                                            placeholder={t('storyboard.description')}
                                        />
                                    </div>
                                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                                        <TextArea
                                            value={shot.dialogue}
                                            onChange={e => handleFieldChange(shot.id, 'dialogue', e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                            style={{ height: '100%', resize: 'none', background: '#141414', border: '1px solid #333', color: '#ddd' }}
                                            placeholder={t('storyboard.dialogue')}
                                        />
                                    </div>
                                    <div style={{ width: 80 }}>
                                        <Input
                                            type="number"
                                            value={shot.duration}
                                            onChange={e => handleFieldChange(shot.id, 'duration', parseFloat(e.target.value))}
                                            onClick={e => e.stopPropagation()}
                                            style={{ background: '#141414', border: '1px solid #333', color: '#ddd' }}
                                            suffix="s"
                                        />
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <TextArea
                                            value={shot.camera}
                                            onChange={e => handleFieldChange(shot.id, 'camera', e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                            style={{ height: '100%', resize: 'none', background: '#141414', border: '1px solid #333', color: '#ddd' }}
                                            placeholder={t('storyboard.camera')}
                                        />
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <TextArea
                                            value={shot.sound}
                                            onChange={e => handleFieldChange(shot.id, 'sound', e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                            style={{ height: '100%', resize: 'none', background: '#141414', border: '1px solid #333', color: '#ddd' }}
                                            placeholder={t('storyboard.sound')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {shots.length === 0 && (
                        <div style={{ padding: 40, textAlign: 'center', color: '#666', border: '1px dashed #333', borderRadius: 8 }}>
                            {t('storyboard.noShots')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}