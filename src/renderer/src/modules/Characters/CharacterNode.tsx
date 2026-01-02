import { Handle, Position } from 'reactflow';
import { Avatar, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useState } from 'react';

const { Text } = Typography;

export default function CharacterNode({ data }: { data: { label: string; avatar?: string; selected?: boolean } }) {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                position: 'relative',
                borderRadius: 8,
                background: 'rgba(30,30,30,0.9)',
                border: `2px solid ${data.selected ? '#1677ff' : '#555'} `,
                minWidth: 150,
                display: 'flex',
                alignItems: 'center',
                padding: 10,
                boxShadow: data.selected ? '0 0 10px rgba(22,119,255,0.5)' : 'none',
                // Ensure draggable. Default ReactFlow behavior works on this div.
            }}
        >
            {/* Target Handle - Covers the whole node for easy dropping. 
                We move it to the back? No, it must capture mouse events for "drop".
                But dragging the node requires clicking on something NOT a handle?
                However, we set 'dragHandle' prop on the Node to '.node-drag-target'.
                React Flow listens to mousedown on that selector to initiate Drag.
            */}
            <Handle
                type="target"
                position={Position.Top}
                id="target-center"
                style={{
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    zIndex: 0 // Base layer
                }}
            />

            {/* Source Handles - High Z-Index to ensure they are clickable over the Target Handle */}

            {/* Top Source */}
            <Handle type="source" position={Position.Top} id="s-top" style={{
                top: -10, left: '50%', transform: 'translateX(-50%)', width: '100%', height: 20,
                background: hovered ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none', borderRadius: 4, zIndex: 10
            }} />

            {/* Right Source */}
            <Handle type="source" position={Position.Right} id="s-right" style={{
                top: '50%', transform: 'translateY(-50%)', right: -10, width: 20, height: '100%',
                background: hovered ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none', borderRadius: 4, zIndex: 10
            }} />

            {/* Bottom Source */}
            <Handle type="source" position={Position.Bottom} id="s-bottom" style={{
                bottom: -10, left: '50%', transform: 'translateX(-50%)', width: '100%', height: 20,
                background: hovered ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none', borderRadius: 4, zIndex: 10
            }} />

            {/* Left Source */}
            <Handle type="source" position={Position.Left} id="s-left" style={{
                top: '50%', transform: 'translateY(-50%)', left: -10, width: 20, height: '100%',
                background: hovered ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none', borderRadius: 4, zIndex: 10
            }} />

            {/* Content - Has .node-drag-target class to enable dragging */}
            <div className="node-drag-target" style={{ display: 'flex', alignItems: 'center', pointerEvents: 'all', width: '100%', zIndex: 5, position: 'relative' }}>
                <Avatar
                    size={48}
                    src={data.avatar}
                    icon={<UserOutlined />}
                    style={{ marginRight: 10, border: '1px solid #fff', flexShrink: 0 }}
                />
                <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                    <Text style={{
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: '1.2'
                    }}>
                        {data.label}
                    </Text>
                </div>
            </div>
        </div>
    );
}