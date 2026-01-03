import { Modal, List, Button, Spin, Typography, message } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Character, Project } from '../../../../shared/types';

interface InternalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (character: Partial<Character>) => void;
    wordSettings: Project['wordSettings'];
}

export default function CharacterGeneratorModal({ open, onClose, onSelect, wordSettings }: InternalProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [candidates, setCandidates] = useState<Partial<Character>[]>([]);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const settings = await window.api.getSettings();
            if (!settings.volcEngineApiKey) {
                message.error(t('characters.generator.noApiKey'));
                setLoading(false);
                return;
            }

            const generatedCharacters = await window.api.generateAI('character-gen', { count: 5, ...wordSettings });
            setCandidates(generatedCharacters);
            message.success(t('characters.generator.success'));

        } catch (e: any) {
            message.error(t('characters.failed') + (e.message || e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={t('characters.generator.title')}
            open={open}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>{t('characters.generator.close')}</Button>,
                <Button key="gen" type="primary" onClick={handleGenerate} loading={loading}>{t('characters.generator.generateCount', { count: 5 })}</Button>
            ]}
        >
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {loading && <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>}
                <List
                    dataSource={candidates}
                    renderItem={item => (
                        <List.Item
                            actions={[<Button onClick={() => onSelect(item)}>{t('characters.generator.select')}</Button>]}
                        >
                            <List.Item.Meta
                                title={item.name}
                                description={item.background}
                            />
                        </List.Item>
                    )}
                />
                {!loading && candidates.length === 0 && <Typography.Text>{t('characters.generator.clickToStart')}</Typography.Text>}
            </div>
        </Modal>
    );
}
