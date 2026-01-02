import React from 'react';
import { ConnectionLineComponentProps, getBezierPath } from 'reactflow';

export default function FloatingConnectionLine({
    fromX,
    fromY,
    fromPosition,
    toX,
    toY,
    toPosition,
}: ConnectionLineComponentProps) {
    const [edgePath] = getBezierPath({
        sourceX: fromX,
        sourceY: fromY,
        sourcePosition: fromPosition,
        targetX: toX,
        targetY: toY,
        targetPosition: toPosition,
    });

    return (
        <g>
            <path fill="none" stroke="#bbb" strokeWidth={1.5} className="animated" d={edgePath} />
            <circle cx={toX} cy={toY} fill="#fff" r={3} stroke="#222" strokeWidth={1.5} />
        </g>
    );
}
