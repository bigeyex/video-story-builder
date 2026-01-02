import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Connection,
    NodeChange,
    EdgeChange,
    ConnectionMode,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Character, Relationship } from '../../../../shared/types';
import CharacterNode from './CharacterNode';
import FloatingEdge from './FloatingEdge';
import FloatingConnectionLine from './FloatingConnectionLine';

interface InternalProps {
    characters: Character[];
    relationships: Relationship[];
    onUpdate: (chars: Character[], rels: Relationship[]) => void;
    onSelect: (id: string | null) => void;
    selectedId: string | null;
}

const nodeTypes = { character: CharacterNode };
const edgeTypes = { floating: FloatingEdge };

export default function CharacterGraph({ characters, relationships, onUpdate, onSelect, selectedId }: InternalProps) {

    // Helper to check bidirectionality
    const getBidirectionalMap = (rels: Relationship[]) => {
        const map = new Set<string>();
        rels.forEach(r => map.add(`${r.source}|${r.target}`));
        return map;
    };

    const isBidirectional = (r: Relationship, map: Set<string>) => {
        return map.has(`${r.target}|${r.source}`);
    };

    // Helper for updating edge label
    const onEdgeLabelChange = useCallback((edgeId: string, newLabel: string) => {
        const newRels = relationships.map(r => r.id === edgeId ? { ...r, label: newLabel } : r);
        onUpdate(characters, newRels);
    }, [relationships, characters, onUpdate]);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Sync Nodes
    useEffect(() => {
        setNodes(nds => {
            // ... existing node sync logic ...
            // We need to re-implement it fully since we are replacing the block
            // But to save tokens I will try to be concise if possible, but replace_file_content replaces the chunk.
            // I'll reuse the logic from previous step but update it relative to 'nodes' dependency.
            // Actually, simplest is to reconstruction the node list from characters and merge with local state handling? 
            // Just copy the logic from previous step.

            const currentIds = new Set(nds.map(n => n.id));

            // Update existing
            const updated = nds.map(n => {
                const c = characters.find(ch => ch.id === n.id);
                if (c) {
                    return {
                        ...n,
                        dragHandle: '.node-drag-target',
                        data: { ...n.data, label: c.name, avatar: c.avatar, selected: c.id === selectedId }
                    };
                }
                return n;
            });

            // Add new
            const newNodes = characters.filter(c => !currentIds.has(c.id)).map(c => ({
                id: c.id,
                type: 'character',
                position: c.position || { x: 0, y: 0 },
                dragHandle: '.node-drag-target',
                data: { label: c.name, avatar: c.avatar, selected: c.id === selectedId }
            }));

            // Remove deleted? (Previous logic didn't explicitly remove, but newNodes handles adding)
            // If characters are removed, they won't be in updated? No, map iterates over nds.
            // We should filter out nds not in characters.
            const validIds = new Set(characters.map(c => c.id));
            const filtered = updated.filter(n => validIds.has(n.id));

            return [...filtered, ...newNodes];
        });
    }, [characters, selectedId, setNodes]);

    // Sync Edges
    useEffect(() => {
        const map = getBidirectionalMap(relationships);
        setEdges(eds => {
            const mapped = relationships.map(r => ({
                id: r.id,
                source: r.source,
                target: r.target,
                label: r.label,
                type: 'floating',
                markerEnd: { type: MarkerType.ArrowClosed },
                data: {
                    onLabelChange: onEdgeLabelChange,
                    isBidirectional: isBidirectional(r, map)
                }
            }));
            return mapped;
        });
    }, [relationships, setEdges, onEdgeLabelChange]);

    // ... Handlers ...

    const onEdgesDelete = useCallback((edgesToDelete: Edge[]) => {
        const idsToDelete = new Set(edgesToDelete.map(e => e.id));
        const newRels = relationships.filter(r => !idsToDelete.has(r.id));
        onUpdate(characters, newRels);
    }, [relationships, characters, onUpdate]);

    const handleNodesChange = useCallback((changes: NodeChange[]) => {
        onNodesChange(changes);
    }, [onNodesChange]);

    const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
        onEdgesChange(changes);
    }, [onEdgesChange]);

    const onNodeDragStop = useCallback((event, node) => {
        const updatedChars = characters.map(c => {
            if (c.id === node.id) return { ...c, position: node.position };
            return c;
        });
        onUpdate(updatedChars, relationships);
    }, [characters, relationships, onUpdate]);

    const onConnect = useCallback((params: Connection) => {
        if (!params.source || !params.target) return;
        if (params.source === params.target) return; // Prevent self-loops if desired?

        // Check for existing
        const exists = relationships.some(r => r.source === params.source && r.target === params.target);
        if (exists) return;

        const newRel: Relationship = {
            id: `rel-${Date.now()}`,
            source: params.source,
            target: params.target,
            label: 'New Relation'
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
                onEdgesChange={handleEdgesChange}
                onEdgesDelete={onEdgesDelete}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionLineComponent={FloatingConnectionLine}
                connectionMode={ConnectionMode.Loose}
                fitView
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}
