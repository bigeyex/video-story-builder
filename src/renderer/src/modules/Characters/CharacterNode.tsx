import { Handle, Position } from 'reactflow';
import { Avatar, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function CharacterNode({ data }: { data: { label: string; avatar?: string; selected?: boolean } }) {
    return (
        <div style={{
            padding: 10,
            borderRadius: 8,
            background: 'rgba(30,30,30,0.9)',
            border: `2px solid ${data.selected ? '#1677ff' : '#555'}`,
            textAlign: 'center',
            minWidth: 100
        }}>
            <Handle type="target" position={Position.Top} />
            <Avatar
                size={64}
                src={data.avatar}
                icon={<UserOutlined />}
                style={{ marginBottom: 8, border: '2px solid #fff' }}
            />
            <div>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>{data.label}</Text>
            </div>
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
}
