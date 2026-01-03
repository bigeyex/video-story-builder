import { Modal, Button, message, List, Avatar, Space } from 'antd';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RobotOutlined, CheckOutlined } from '@ant-design/icons';

interface InternalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (character: any) => void;
    wordSettings: any;
}

export default function CharacterGeneratorModal({ open, onClose, onSelect, wordSettings }: InternalProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [streamedText, setStreamedText] = useState('');
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!open) {
            setStreamedText('');
        }
    }, [open]);

    const maskJson = (text: string) => {
        // Hide characters like {, }, [, ], ", :, , for a cleaner view
        return text.replace(/[{}[\]":,]/g, ' ').replace(/\s+/g, ' ').trim();
    };

    const handleGenerate = async () => {
        setLoading(true);
        setCandidates([]);
        setStreamedText('');
        setAddedIds(new Set());

        try {
            const settings = await window.api.getSettings();
            if (!settings.volcEngineApiKey) {
                message.error(t('characters.generator.noApiKey'));
                setLoading(false);
                return;
            }

            const removeChunkListener = window.api.onAIStreamChunk((chunk) => {
                setStreamedText(prev => prev + chunk);
            });

            const removeEndListener = window.api.onAIStreamEnd((fullContent) => {
                removeChunkListener();
                removeEndListener();

                let content = fullContent.replace(/```json/g, '').replace(/```/g, '').trim();
                try {
                    const generatedCharacters = JSON.parse(content);
                    // Add IDs for tracking if they don't have them
                    const withIds = generatedCharacters.map((c: any, index: number) => ({
                        ...c,
                        id: c.id || `gen-${Date.now()}-${index}`
                    }));
                    setCandidates(withIds);
                    message.success(t('characters.generator.success'));
                } catch (e) {
                    message.error(t('characters.failed') + ' (Invalid JSON)');
                }
                setLoading(false);
            });

            window.api.generateAIStream('character-gen', { count: 5, ...wordSettings });

        } catch (e: any) {
            message.error(t('characters.failed') + (e.message || e));
            setLoading(false);
        }
    };

    const handleAdd = (item: any) => {
        onSelect(item);
        setAddedIds(prev => new Set([...prev, item.id]));
    };

    const lastLinePreview = streamedText.split('\n').filter(l => l.trim()).pop() || '';

    return (
        <Modal
            title={t('characters.generator.title')}
            open={open}
            onCancel={onClose}
            width={800}
            footer={[
                <Button key="close" onClick={onClose}>{t('characters.generator.close')}</Button>,
                <Button key="gen" type="primary" loading={loading} onClick={handleGenerate}>
                    {t('characters.aiGenerate')}
                </Button>
            ]}
        >
            <div style={{ minHeight: '300px' }}>
                {candidates.length > 0 && (
                    <div style={{ marginBottom: 16, color: '#888' }}>
                        {t('characters.generator.prompt')}
                    </div>
                )}

                <List
                    dataSource={candidates}
                    renderItem={(item) => (
                        <List.Item
                            actions={[
                                <Button
                                    type="link"
                                    disabled={addedIds.has(item.id)}
                                    icon={addedIds.has(item.id) ? <CheckOutlined /> : null}
                                    onClick={() => handleAdd(item)}
                                >
                                    {addedIds.has(item.id) ? '' : t('characters.generator.select')}
                                </Button>
                            ]}
                        >
                            <List.Item.Meta
                                avatar={<Avatar size={64} shape="square" icon={<RobotOutlined />} />}
                                title={item.name}
                                description={
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div><strong>{t('characters.background')}:</strong> {item.background}</div>
                                        <div><strong>{t('characters.personality')}:</strong> {item.personality}</div>
                                        <div><strong>{t('characters.appearance')}:</strong> {item.appearance}</div>
                                    </Space>
                                }
                            />
                        </List.Item>
                    )}
                />

                {loading && (
                    <div style={{
                        marginTop: 20,
                        padding: '8px 12px',
                        background: '#1a1a1a',
                        borderRadius: 4,
                        border: '1px solid #333',
                        color: '#666',
                        fontSize: '13px',
                        fontStyle: 'italic',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis'
                    }}>
                        {maskJson(lastLinePreview) || '...'}
                    </div>
                )}
            </div>
        </Modal>
    );
}
