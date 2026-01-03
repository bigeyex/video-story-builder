import { Layout, Button, message } from 'antd';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProjectService } from '../../services/ProjectService';
import { Project, Character, Relationship } from '../../../../shared/types';
import CharacterGraph from './CharacterGraph';
import CharacterDetails from './CharacterDetails';
import CharacterGeneratorModal from './CharacterGeneratorModal';
import { PlusOutlined, RobotOutlined } from '@ant-design/icons';

const { Content, Sider } = Layout;

export default function CharactersPage() {
    const { t } = useTranslation();
    const { projectId } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
    const [genModalOpen, setGenModalOpen] = useState(false);

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

    const updateProject = (chars: Character[], rels: Relationship[]) => {
        if (!project) return;
        const updated = { ...project, characters: chars, relationships: rels };
        setProject(updated);

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => saveProject(updated), 1000);
    };

    const handleAddCharacter = () => {
        if (!project) return;
        const newChar: Character = {
            id: `char-${Date.now()}`,
            name: `${t('characters.title')} ${project.characters.length + 1}`,
            background: '',
            personality: '',
            appearance: '',
            position: { x: 100, y: 100 }
        };
        updateProject([...project.characters, newChar], project.relationships);
        setSelectedCharId(newChar.id);
    };

    const handleUpdateCharacter = (id: string, updates: Partial<Character>) => {
        if (!project) return;
        const updatedChars = project.characters.map(c => c.id === id ? { ...c, ...updates } : c);
        updateProject(updatedChars, project.relationships);
    };

    const handleDeleteCharacter = (id: string) => {
        if (!project) return;
        const updatedChars = project.characters.filter(c => c.id !== id);
        const updatedRels = project.relationships.filter(r => r.source !== id && r.target !== id);
        updateProject(updatedChars, updatedRels);
        if (selectedCharId === id) setSelectedCharId(null);
    };

    const handleSelectGenerated = (candidate: Partial<Character>) => {
        if (!project) return;
        const newChar: Character = {
            id: `char-${Date.now()}`,
            name: candidate.name || t('characters.aiCharacter'),
            background: candidate.background || '',
            personality: candidate.personality || '',
            appearance: candidate.appearance || '',
            position: { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 }
        };
        updateProject([...project.characters, newChar], project.relationships);
        setGenModalOpen(false);
        setSelectedCharId(newChar.id);
        message.success(t('characters.characterAdded'));
    };

    if (!project) return <div>Loading...</div>;

    const selectedChar = project.characters.find(c => c.id === selectedCharId) || null;

    return (
        <Layout style={{ height: '100%' }}>
            <Content style={{ position: 'relative', borderRight: '1px solid #333' }}>
                <CharacterGraph
                    characters={project.characters}
                    relationships={project.relationships}
                    onUpdate={updateProject}
                    onSelect={setSelectedCharId}
                    selectedId={selectedCharId}
                />
                <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCharacter}>{t('characters.addCharacter')}</Button>
                </div>
            </Content>
            <Sider width={350} theme="dark" style={{ borderLeft: '1px solid #333' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px' }}>
                    <Button icon={<RobotOutlined />} onClick={() => setGenModalOpen(true)}>{t('characters.aiGenerate')}</Button>
                </div>
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
