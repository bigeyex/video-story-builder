import { useCallback, useState, useRef, useEffect } from 'react';
import { useStore, getBezierPath, EdgeProps, EdgeLabelRenderer, BaseEdge } from 'reactflow';
import { getEdgeParams, getBiDirectionalPath } from '../../utils/floatingEdgeUtils';
import { Input } from 'antd';

export default function FloatingEdge({ id, source, target, markerEnd, style, label, data }: EdgeProps) {
    const sourceNode = useStore(useCallback((store) => store.nodeInternals.get(source), [source]));
    const targetNode = useStore(useCallback((store) => store.nodeInternals.get(target), [target]));

    const [isEditing, setIsEditing] = useState(false);
    const [localLabel, setLocalLabel] = useState(label as string);
    const inputRef = useRef<any>(null);

    useEffect(() => {
        setLocalLabel(label as string);
    }, [label]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const onSave = () => {
        setIsEditing(false);
        if (localLabel !== label && data?.onLabelChange) {
            data.onLabelChange(id, localLabel);
        }
    };

    if (!sourceNode || !targetNode) {
        return null;
    }

    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);

    let edgePath, labelX, labelY;

    if (data?.isBidirectional) {
        [edgePath, labelX, labelY] = getBiDirectionalPath({
            sourceX: sx,
            sourceY: sy,
            targetX: tx,
            targetY: ty,
            offset: 40 // Adjust for curvature
        });
    } else {
        [edgePath, labelX, labelY] = getBezierPath({
            sourceX: sx,
            sourceY: sy,
            sourcePosition: sourcePos,
            targetPosition: targetPos,
            targetX: tx,
            targetY: ty,
        });
    }

    return (
        <>
            {/* Transparent interaction path for easier selection */}
            <path
                d={edgePath}
                fill="none"
                strokeOpacity={0}
                strokeWidth={20}
                className="react-flow__edge-path"
                style={{ cursor: 'pointer' }}
            />
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        background: '#222',
                        padding: isEditing ? 0 : '4px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#eee',
                        pointerEvents: 'all',
                        cursor: 'pointer',
                        minWidth: 50,
                        textAlign: 'center',
                        border: isEditing ? 'none' : '1px solid transparent',
                        zIndex: 10
                    }}
                    className="nodrag nopan"
                    data-edge-id={id}
                    onDoubleClick={() => setIsEditing(true)}
                >
                    {isEditing ? (
                        <Input
                            ref={inputRef}
                            size="small"
                            value={localLabel}
                            onChange={e => setLocalLabel(e.target.value)}
                            onBlur={onSave}
                            onPressEnter={onSave}
                            style={{ fontSize: 12, padding: '0 4px', textAlign: 'center', background: '#333', color: 'white', border: '1px solid #1677ff' }}
                        />
                    ) : (
                        label || 'New Relation'
                    )}
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
