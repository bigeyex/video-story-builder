import { Typography, Button, Input, message, Dropdown, Checkbox, MenuProps, Space, Radio, Tooltip } from 'antd';
import {
    PlusOutlined, VideoCameraOutlined, MoreOutlined, RobotOutlined,
    ScissorOutlined, CopyOutlined, SnippetsOutlined,
    ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined,
    UploadOutlined
} from '@ant-design/icons';
import { Scene, StoryboardShot } from '../../../../shared/types';
import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';

const { TextArea } = Input;

interface InternalProps {
    scene: Scene | null;
    onUpdate: (updates: Partial<Scene>) => void;
}

export default function StoryboardEditor({ scene, onUpdate }: InternalProps) {
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [clipboard, setClipboard] = useState<StoryboardShot[]>([]);

    if (!scene) return <div>Select a scene</div>;

    const shots = scene.storyboard || [];

    const updateShots = (newShots: StoryboardShot[]) => {
        onUpdate({ storyboard: newShots });
    };

    // --- Selection Logic ---
    const toggleSelection = (id: string, checked: boolean) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };

    const selectAll = (checked: boolean) => {
        if (checked) setSelectedIds(new Set(shots.map(s => s.id)));
        else setSelectedIds(new Set());
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
        message.success(`Copied ${shotsToCopy.length} shots`);
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
        message.success(`Pasted ${toPaste.length} shots`);
    };

    const handleFieldChange = (id: string, field: keyof StoryboardShot, value: any) => {
        updateShots(shots.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleAutoGenerate = async () => {
        try {
            const settings = await window.api.getSettings();
            if (!settings.volcEngineApiKey) return message.error('No API Key');

            message.loading({ content: 'Generating shots...', key: 'gen' });
            const result = await window.api.generateAI('scene-storyboard', {
                title: scene.title,
                outline: scene.outline,
                conflict: scene.conflict,
            });

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
                // IMPORTANT: Use callback or fresh props here if possible, but for now we use 'shots' from closure.
                // Ideally we'd sync this better, but let's stick to the current pattern.
                updateShots([...shots, ...generatedShots]);
                message.success({ content: 'Generated!', key: 'gen' });
            } else {
                message.warning({ content: 'AI returned no shots', key: 'gen' });
            }
        } catch (e) {
            message.error({ content: 'Failed: ' + e, key: 'gen' });
        }
    };

    // --- Layout Constants ---
    const IMG_WIDTH = 200;
    const IMG_HEIGHT = aspectRatio === '16:9' ? (IMG_WIDTH * 9 / 16) : (IMG_WIDTH * 16 / 9);

    const getMenu = (index: number, shot: StoryboardShot): MenuProps => ({
        items: [
            { key: 'insert-up', label: 'Insert Up', icon: <ArrowUpOutlined />, onClick: () => handleAddShot(index) },
            { key: 'insert-down', label: 'Insert Down', icon: <ArrowDownOutlined />, onClick: () => handleAddShot(index + 1) },
            { type: 'divider' },
            { key: 'cut', label: 'Cut', icon: <ScissorOutlined />, onClick: () => handleCut([shot.id]) },
            { key: 'copy', label: 'Copy', icon: <CopyOutlined />, onClick: () => handleCopy([shot.id]) },
            { key: 'paste-up', label: 'Paste Up', icon: <SnippetsOutlined />, disabled: clipboard.length === 0, onClick: () => handlePaste(index) },
            { key: 'paste-down', label: 'Paste Down', icon: <SnippetsOutlined />, disabled: clipboard.length === 0, onClick: () => handlePaste(index + 1) },
            { type: 'divider' },
            {
                key: 'move-up', label: 'Move Up', icon: <ArrowUpOutlined />, disabled: index === 0, onClick: () => {
                    // simple single move
                    const newShots = [...shots];
                    [newShots[index], newShots[index - 1]] = [newShots[index - 1], newShots[index]];
                    updateShots(newShots);
                }
            },
            {
                key: 'move-down', label: 'Move Down', icon: <ArrowDownOutlined />, disabled: index === shots.length - 1, onClick: () => {
                    const newShots = [...shots];
                    [newShots[index], newShots[index + 1]] = [newShots[index + 1], newShots[index]];
                    updateShots(newShots);
                }
            },
            { type: 'divider' },
            { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete([shot.id]) },
        ]
    });

    const getGlobalMenu = (): MenuProps => ({
        items: [
            { key: 'cut-sel', label: `Cut Selected (${selectedIds.size})`, disabled: selectedIds.size === 0, onClick: () => handleCut(Array.from(selectedIds)) },
            { key: 'copy-sel', label: `Copy Selected (${selectedIds.size})`, disabled: selectedIds.size === 0, onClick: () => handleCopy(Array.from(selectedIds)) },
        ]
    });

    return (
        <div style={{ padding: '12px 24px', height: '100%', display: 'flex', flexDirection: 'column', background: '#141414' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddShot()}>Add Shot</Button>
                    <Button icon={<VideoCameraOutlined />} onClick={handleAutoGenerate}>Auto-Generate</Button>
                    {selectedIds.size > 0 && (
                        <Dropdown menu={getGlobalMenu()}>
                            <Button>Selection Actions ({selectedIds.size})</Button>
                        </Dropdown>
                    )}
                </Space>
                <Space>
                    <span>Screen Format:</span>
                    <Radio.Group value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} buttonStyle="solid">
                        <Radio.Button value="16:9">Desktop (16:9)</Radio.Button>
                        <Radio.Button value="9:16">Mobile (9:16)</Radio.Button>
                    </Radio.Group>
                </Space>
            </div>

            {/* Table Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid #333', paddingBottom: 8, marginBottom: 8, color: '#888', fontWeight: 'bold', fontSize: 12 }}>
                <div style={{ width: 60, textAlign: 'center' }}>
                    <Checkbox
                        checked={shots.length > 0 && selectedIds.size === shots.length}
                        indeterminate={selectedIds.size > 0 && selectedIds.size < shots.length}
                        onChange={e => selectAll(e.target.checked)}
                    />
                </div>
                <div style={{ width: IMG_WIDTH + 16 }}>VISUAL</div>
                <div style={{ flex: 1, minWidth: 600, display: 'flex', gap: 16 }}>
                    <div style={{ flex: 2 }}>DESCRIPTION</div>
                    <div style={{ flex: 2 }}>DIALOGUE</div>
                    <div style={{ width: 80 }}>DURATION</div>
                    <div style={{ flex: 1 }}>CAMERA</div>
                    <div style={{ flex: 1 }}>SOUND</div>
                </div>
            </div>

            {/* Scrollable List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {shots.map((shot, index) => (
                        <div key={shot.id} style={{
                            display: 'flex',
                            background: selectedIds.has(shot.id) ? '#1f2a3a' : '#1f1f1f',
                            border: selectedIds.has(shot.id) ? '1px solid #1677ff' : '1px solid #333',
                            borderRadius: 4,
                            padding: 8
                        }}>
                            {/* Left Controls */}
                            <div style={{ width: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, borderRight: '1px solid #333', marginRight: 12, paddingTop: 4 }}>
                                <span style={{ color: '#666', fontWeight: 'bold' }}>#{index + 1}</span>
                                <Tooltip title="AI Generation (Future)">
                                    <Button type="text" size="small" icon={<RobotOutlined style={{ color: '#1677ff' }} />} />
                                </Tooltip>
                                <Dropdown menu={getMenu(index, shot)} trigger={['click']}>
                                    <Button type="text" size="small" icon={<MoreOutlined style={{ color: '#fff', fontSize: 16 }} />} />
                                </Dropdown>
                                <Checkbox
                                    checked={selectedIds.has(shot.id)}
                                    onChange={e => toggleSelection(shot.id, e.target.checked)}
                                />
                            </div>

                            {/* Image */}
                            <div style={{
                                width: IMG_WIDTH,
                                height: IMG_HEIGHT,
                                marginRight: 16,
                                background: '#000',
                                border: '1px dashed #444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {shot.image ? (
                                    <img src={shot.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#555', fontSize: 12 }}>
                                        <UploadOutlined style={{ fontSize: 20, marginBottom: 4 }} /><br />Upload
                                    </div>
                                )}
                            </div>

                            {/* Fields Container (Horizontal Scroll) */}
                            <div style={{ flex: 1, overflowX: 'auto' }}>
                                <div style={{ display: 'flex', gap: 16, minWidth: 600, height: '100%' }}>
                                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                                        <TextArea
                                            value={shot.description}
                                            onChange={e => handleFieldChange(shot.id, 'description', e.target.value)}
                                            style={{ height: '100%', resize: 'none', background: '#141414', border: '1px solid #333', color: '#ddd' }}
                                            placeholder="Shot description..."
                                        />
                                    </div>
                                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                                        <TextArea
                                            value={shot.dialogue}
                                            onChange={e => handleFieldChange(shot.id, 'dialogue', e.target.value)}
                                            style={{ height: '100%', resize: 'none', background: '#141414', border: '1px solid #333', color: '#ddd' }}
                                            placeholder="Dialogue..."
                                        />
                                    </div>
                                    <div style={{ width: 80 }}>
                                        <Input
                                            type="number"
                                            value={shot.duration}
                                            onChange={e => handleFieldChange(shot.id, 'duration', parseFloat(e.target.value))}
                                            style={{ background: '#141414', border: '1px solid #333', color: '#ddd' }}
                                            suffix="s"
                                        />
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <TextArea
                                            value={shot.camera}
                                            onChange={e => handleFieldChange(shot.id, 'camera', e.target.value)}
                                            style={{ height: '100%', resize: 'none', background: '#141414', border: '1px solid #333', color: '#ddd' }}
                                            placeholder="Camera moves..."
                                        />
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <TextArea
                                            value={shot.sound}
                                            onChange={e => handleFieldChange(shot.id, 'sound', e.target.value)}
                                            style={{ height: '100%', resize: 'none', background: '#141414', border: '1px solid #333', color: '#ddd' }}
                                            placeholder="Music/Sound..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {shots.length === 0 && (
                        <div style={{ padding: 40, textAlign: 'center', color: '#666', border: '1px dashed #333', borderRadius: 8 }}>
                            No shots. Add or Generate.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}