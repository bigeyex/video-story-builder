import { Layout, Button, message } from 'antd';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProjectService } from '../../services/ProjectService';
import { Project, Character, Relationship } from '../../../../shared/types';
import CharacterGraph from './CharacterGraph';
import CharacterDetails from './CharacterDetails';
import CharacterGeneratorModal from './CharacterGeneratorModal';
import { PlusOutlined, RobotOutlined, PictureOutlined } from '@ant-design/icons';
import { AIProgressToast } from '../../utils/AIUtils';

const { Content, Sider } = Layout;

export default function CharactersPage() {
    const { t } = useTranslation();
    const { projectId } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
    const [genModalOpen, setGenModalOpen] = useState(false);
    const [batchLoading, setBatchLoading] = useState(false);

    // Debounced save ref
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
            message.error(t('characters.autoSaveFailed'));
        }
    };

    const updateProjectState = (updater: (prev: Project) => Partial<Project> | Project) => {
        setProject(prev => {
            if (!prev) return null;
            const updates = updater(prev);

            // Intelligent Merge:
            // If the updater returns a partial project, we merge it deeply for critical arrays
            const updated: Project = { ...prev, ...updates };

            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => saveProject(updated), 1000);

            return updated;
        });
    };

    const handleBatchGenerateAssets = async () => {
        if (!project) return;

        const charactersToFix = project.characters.filter(c => !c.avatar || !c.characterDesign);
        if (charactersToFix.length === 0) {
            message.info(t('storyboard.noShotsToGenerate', 'No missing assets to generate'));
            return;
        }

        setBatchLoading(true);
        let isCancelled = false;
        const handleStop = () => { isCancelled = true; };

        message.loading({
            content: <AIProgressToast text={t('characters.batchGeneratingAssets')} onStop={handleStop} />,
            key: 'batch-chars',
            duration: 0
        });

        try {
            for (const char of charactersToFix) {
                if (isCancelled) break;

                let updatedAvatar = char.avatar;
                let updatedDesign = char.characterDesign;

                // 1. Generate Avatar if missing
                if (!updatedAvatar) {
                    const prompt = `Character avatar for ${char.name}: ${char.appearance || ''}, ${char.personality || ''}. Art Style: ${project.wordSettings.artStyle || 'Cinematic'}.`;
                    try {
                        updatedAvatar = await window.api.generateImage(prompt, project.id, char.id);
                        handleUpdateCharacter(char.id, { avatar: updatedAvatar });
                    } catch (e) {
                        console.error(`Failed to generate avatar for ${char.name}`, e);
                    }
                }

                if (isCancelled) break;

                // 2. Generate Design if missing
                if (!updatedDesign) {
                    const prompt = `Character ${char.name}: ${char.appearance || ''}, ${char.personality || ''}. Art Style: ${project.wordSettings.artStyle || 'Cinematic'}.`;
                    try {
                        updatedDesign = await window.api.generateCharacterDesign(prompt, project.id, char.id);
                        handleUpdateCharacter(char.id, { characterDesign: updatedDesign });
                    } catch (e) {
                        console.error(`Failed to generate design for ${char.name}`, e);
                    }
                }
            }

            if (!isCancelled) {
                message.success({ content: t('characters.batchGenerateSuccess'), key: 'batch-chars' });
            } else {
                message.info({ content: t('scenes.cancelled'), key: 'batch-chars' });
            }
        } catch (e) {
            message.error({ content: t('characters.failed') + e, key: 'batch-chars' });
        } finally {
            setBatchLoading(false);
        }
    };

    const handleAddCharacter = () => {
        updateProjectState(prev => {
            const newChar: Character = {
                id: `char-${Date.now()}`,
                name: `${t('characters.title')} ${prev.characters.length + 1}`,
                background: '',
                personality: '',
                appearance: '',
                position: { x: 100, y: 100 }
            };
            setSelectedCharId(newChar.id);
            return { characters: [...prev.characters, newChar] };
        });
    };

    const handleUpdateCharacter = (id: string, updates: Partial<Character>) => {
        updateProjectState(prev => ({
            characters: prev.characters.map(c => c.id === id ? { ...c, ...updates } : c)
        }));
    };

    const handleGraphUpdate = (chars: Character[], rels: Relationship[]) => {
        updateProjectState(prev => {
            // Intelligent merging from graph:
            // Graph provides full list but might have stale metadata if it was rendered with old props.
            // We TRUST the graph for positions and relationship structure.
            // We PRESERVE existing metadata (avatar, design, etc.) from the latest state.
            const mergedChars = chars.map(gc => {
                const existing = prev.characters.find(c => c.id === gc.id);
                if (existing) {
                    return { ...existing, position: gc.position };
                }
                return gc;
            });

            return {
                characters: mergedChars,
                relationships: rels
            };
        });
    };

    const handleDeleteCharacter = (id: string) => {
        updateProjectState(prev => {
            if (selectedCharId === id) setSelectedCharId(null);
            return {
                ...prev,
                characters: prev.characters.filter(c => c.id !== id),
                relationships: prev.relationships.filter(r => r.source !== id && r.target !== id)
            };
        });
    };

    const handleSelectGenerated = (candidate: Partial<Character>) => {
        updateProjectState(prev => {
            const newChar: Character = {
                id: `char-${Date.now()}`,
                name: candidate.name || t('characters.aiCharacter'),
                background: candidate.background || '',
                personality: candidate.personality || '',
                appearance: candidate.appearance || '',
                position: { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 }
            };
            setSelectedCharId(newChar.id);
            message.success(t('characters.characterAdded'));
            return { ...prev, characters: [...prev.characters, newChar] };
        });
    };

    if (!project) return <div>Loading...</div>;

    const selectedChar = project.characters.find(c => c.id === selectedCharId) || null;

    return (
        <Layout style={{ height: '100%' }}>
            <Content style={{ position: 'relative', borderRight: '1px solid #333' }}>
                <CharacterGraph
                    characters={project.characters}
                    relationships={project.relationships}
                    onUpdate={handleGraphUpdate}
                    onSelect={setSelectedCharId}
                    selectedId={selectedCharId}
                />
                <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, display: 'flex', gap: 8 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCharacter}>{t('characters.addCharacter')}</Button>
                    <Button icon={<RobotOutlined />} onClick={() => setGenModalOpen(true)}>{t('characters.aiGenerate')}</Button>
                    <Button icon={<PictureOutlined />} loading={batchLoading} onClick={handleBatchGenerateAssets}>{t('characters.batchGenerateAssets')}</Button>
                </div>
            </Content>
            <Sider width={350} theme="dark" style={{ borderLeft: '1px solid #333' }}>
                <CharacterDetails
                    project={project}
                    character={selectedChar}
                    onUpdate={handleUpdateCharacter}
                    onDelete={handleDeleteCharacter}
                />
            </Sider>
            <CharacterGeneratorModal
                open={genModalOpen}
                onClose={() => setGenModalOpen(false)}
                onSelect={handleSelectGenerated}
                wordSettings={project.wordSettings}
            />
        </Layout>
    );
}
