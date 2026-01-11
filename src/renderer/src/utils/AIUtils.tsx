import { Button } from 'antd';
import { PauseCircleOutlined } from '@ant-design/icons';

interface AIProgressToastProps {
    text: React.ReactNode;
    onStop: () => void;
}

export const AIProgressToast = ({ text, onStop }: AIProgressToastProps) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                {text}
            </div>
            <Button
                type="text"
                danger
                icon={<PauseCircleOutlined />}
                onClick={(e) => {
                    e.stopPropagation();
                    onStop();
                }}
                size="small"
                style={{ marginLeft: 8 }}
            >
                Stop
            </Button>
        </div>
    );
};
