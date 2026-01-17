import { Modal, Card, Button, Typography, Row, Col } from 'antd';
import { useTranslation } from 'react-i18next';

const { Paragraph, Text } = Typography;

interface Candidate {
    outline: string;
    conflict: string;
}

interface SelectionModalProps {
    visible: boolean;
    candidates: Candidate[];
    onSelect: (candidate: Candidate) => void;
    onCancel: () => void;
}

export const SelectionModal = ({ visible, candidates, onSelect, onCancel }: SelectionModalProps) => {
    const { t } = useTranslation();

    return (
        <Modal
            title={t('scenes.selectOption', 'Select a Story Option')}
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={1000}
            centered
        >
            <Row gutter={[16, 16]}>
                {candidates.map((candidate, index) => (
                    <Col span={8} key={index}>
                        <Card
                            hoverable
                            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                            bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                            actions={[
                                <Button type="primary" onClick={() => onSelect(candidate)} block>
                                    {t('common.select', 'Select')} #{index + 1}
                                </Button>
                            ]}
                        >
                            <div style={{ marginBottom: 16 }}>
                                <Text strong type="secondary" style={{ fontSize: 12 }}>{t('scenes.outline', 'OUTLINE')}</Text>
                                <div style={{
                                    marginTop: 8,
                                    maxHeight: 300,
                                    overflowY: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    fontSize: 13
                                }}>
                                    {candidate.outline}
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto' }}>
                                <Text strong type="danger" style={{ fontSize: 12 }}>{t('scenes.conflict', 'CONFLICT')}</Text>
                                <Paragraph
                                    style={{
                                        marginTop: 8,
                                        marginBottom: 0,
                                        fontSize: 13,
                                        color: '#ff4d4f'
                                    }}
                                    ellipsis={{ rows: 3, expandable: true, symbol: 'more' }}
                                >
                                    {candidate.conflict}
                                </Paragraph>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>
        </Modal>
    );
};
