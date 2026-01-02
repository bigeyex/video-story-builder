import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    NodeChange,
    EdgeChange,
    applyNodeChanges,
    applyEdgeChanges
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Character, Relationship } from '../../../../shared/types';
import CharacterNode from './CharacterNode';

interface InternalProps {
    characters: Character[];
    relationships: Relationship[];
    onUpdate: (chars: Character[], rels: Relationship[]) => void;
    onSelect: (id: string | null) => void;
    selectedId: string | null;
}

const nodeTypes = { character: CharacterNode };

export default function CharacterGraph({ characters, relationships, onUpdate, onSelect, selectedId }: InternalProps) {
    // Map props to nodes/edges
    // Note: We use local state for immediate interaction, and sync back on changes.
    // However, lifting state up is better if we want full control.
    // For simplicity, we'll derive initial, and report changes.

    const initialNodes = useMemo(() => characters.map(c => ({
        id: c.id,
        type: 'character',
        position: c.position || { x: 0, y: 0 },
        data: { label: c.name, avatar: c.avatar, selected: c.id === selectedId }
    })), []); // Only initial? If props change, we might need to update.

    const initialEdges = useMemo(() => relationships.map(r => ({
        id: r.id,
        source: r.source,
        target: r.target,
        label: r.label,
        type: 'smoothstep'
    })), []);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Sync props to state (unidirectional or bidirectional?)
    // If parent updates chars (e.g. edit name), we want to reflect it.
    useEffect(() => {
        setNodes(nds => nds.map(n => {
            const c = characters.find(ch => ch.id === n.id);
            if (c) {
                return { ...n, data: { ...n.data, label: c.name, avatar: c.avatar, selected: c.id === selectedId } };
            }
            return n;
        }));
        // Check for new nodes?
        const existingIds = new Set(nodes.map(n => n.id));
        const newNodes = characters.filter(c => !existingIds.has(c.id)).map(c => ({
            id: c.id,
            type: 'character',
            position: c.position || { x: 0, y: 0 },
            data: { label: c.name, avatar: c.avatar, selected: c.id === selectedId }
        }));
        if (newNodes.length > 0) {
            setNodes(nds => [...nds, ...newNodes]);
        }
    }, [characters, selectedId, setNodes]); // Avoid deep dependency issue

    // Sync edges
    useEffect(() => {
        // similar logic for edges if needed
        setEdges(eds => {
            // Simplified sync
            const mapped = relationships.map(r => ({
                id: r.id,
                source: r.source,
                target: r.target,
                label: r.label,
                type: 'smoothstep'
            }));
            // Merge with existing selection state or other props if any?
            // For now just replace if different count? 
            // Edge editing (dragging) relies on local state.
            // We should generally trust local state for dragging, and props for structure.
            return mapped;
        });
    }, [relationships, setEdges]);

    // Handle movements
    const handleNodesChange = useCallback((changes: NodeChange[]) => {
        onNodesChange(changes);
        // Determine if we need to upstream changes (e.g. position)
        // We should debounce this or only do it on drag end.
        // Changes includes 'position', 'select', etc.
        // For simplicity, we could upstream everything but that might cause loops.
        // Let's upstream "position" changes only when drag ends? 
        // reactflow doesn't have easy "onDragEnd" for batch. 
        // We can use onNodeDragStop.
    }, [onNodesChange]);

    const onNodeDragStop = useCallback((event, node) => {
        // Upstream position update
        const updatedChars = characters.map(c => {
            if (c.id === node.id) return { ...c, position: node.position };
            return c;
        });
        onUpdate(updatedChars, relationships);
    }, [characters, relationships, onUpdate]);

    const onConnect = useCallback((params: Connection) => {
        // Add new relationship
        if (!params.source || !params.target) return;
        const newRel: Relationship = {
            id: `rel-${Date.now()}`,
            source: params.source,
            target: params.target,
            label: 'relates to'
        };
        onUpdate(characters, [...relationships, newRel]);
    }, [characters, relationships, onUpdate]);

    const onNodeClick = useCallback((_, node: Node) => {
        onSelect(node.id);
    }, [onSelect]);

    const onPaneClick = useCallback(() => {
        onSelect(null);
    }, [onSelect]);

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes}
                fitView
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}
