import { Modal, List, Button, Spin, Typography, message } from 'antd';
import { useState } from 'react';
import { Character } from '../../../../shared/types';
// import { AIService } from '../../services/AIService'; // To be implemented

interface InternalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (character: Partial<Character>) => void;
}

export default function CharacterGeneratorModal({ open, onClose, onSelect }: InternalProps) {
    const [loading, setLoading] = useState(false);
    const [candidates, setCandidates] = useState<Partial<Character>[]>([]);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const settings = await window.api.getSettings();
            if (!settings.volcEngineApiKey) {
                message.error('Please configure API Key in settings first');
                setLoading(false);
                return;
            }

            // We need project World Settings. Currently not passed to this component directly?
            // We can pass them as props or fetch project again (redundant).
            // Let's assume parent passes wordSettings or we fetch project context.
            // For now, I'll update props to include 'wordSettings' or 'projectId' to fetch?
            // Actually, parent 'CharactersPage' has 'project'. It should pass 'wordSettings' to modal.
            // But for now, let's use placeholders or update parent.
            const wordSettings = { /* Placeholder for actual World Settings, e.g., from project context */ };

            const generatedCharacters = await window.api.generateAI('character-gen', { count: 5, ...wordSettings });
            setCandidates(generatedCharacters);
            message.success('Characters generated successfully!');

        } catch (e: any) {
            message.error('Generation failed: ' + (e.message || e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Generate Characters"
            open={open}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>Close</Button>,
                <Button key="gen" type="primary" onClick={handleGenerate} loading={loading}>Generate 5 Candidates</Button>
            ]}
        >
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {loading && <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>}
                <List
                    dataSource={candidates}
                    renderItem={item => (
                        <List.Item
                            actions={[<Button onClick={() => onSelect(item)}>Select</Button>]}
                        >
                            <List.Item.Meta
                                title={item.name}
                                description={item.background}
                            />
                        </List.Item>
                    )}
                />
                {!loading && candidates.length === 0 && <Typography.Text>Click Generate to start.</Typography.Text>}
            </div>
        </Modal>
    );
}
