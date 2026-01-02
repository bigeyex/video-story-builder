import { Position, Node, HandleElement } from 'reactflow';

// Get the intersection point between the center of the node and the target position
function getNodeIntersection(intersectionNode: Node, targetNode: Node) {
  // https://math.stackexchange.com/questions/228841/how-do-i-calculate-the-intersection-point-of-the-boundary-of-a-rectangle-and-a
  const {
    width: intersectionNodeWidth,
    height: intersectionNodeHeight,
    position: intersectionNodePosition,
  } = intersectionNode;
  const targetPosition = targetNode.position;

  const w = (intersectionNodeWidth || 0) / 2;
  const h = (intersectionNodeHeight || 0) / 2;

  const x2 = intersectionNodePosition.x + w;
  const y2 = intersectionNodePosition.y + h;
  const x1 = targetPosition.x + (targetNode.width || 0) / 2;
  const y1 = targetPosition.y + (targetNode.height || 0) / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;

  return { x, y };
}

// Get the position of the handle based on the intersection point
function getEdgePosition(node: Node, intersectionPoint: { x: number; y: number }) {
  const n = { ...node.position, ...node };
  const nx = Math.round(n.x);
  const ny = Math.round(n.y);
  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);

  if (px <= nx + 1) {
    return Position.Left;
  }
  if (px >= nx + (n.width || 0) - 1) {
    return Position.Right;
  }
  if (py <= ny + 1) {
    return Position.Top;
  }
  if (py >= ny + (n.height || 0) - 1) {
    return Position.Bottom;
  }

  return Position.Top;
}

// returns the parameters (sx, sy, tx, ty, sourcePos, targetPos) you need to create an edge
export function getEdgeParams(source: Node, target: Node) {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);

  const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
  const targetPos = getEdgePosition(target, targetIntersectionPoint);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
}

export function getBiDirectionalPath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  offset = 50, // Increased offset for better visibility
}: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  offset?: number;
}) {
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;

  // Calculate vector from source to target
  let vx = targetX - sourceX;
  let vy = targetY - sourceY;
  const len = Math.sqrt(vx * vx + vy * vy);
  
  if (len === 0) return [`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`, centerX, centerY];

  // Normal vector (rotated 90 degrees)
  // (-y, x) or (y, -x)
  const nx = -vy / len;
  const ny = vx / len;

  // Control point is shifted along the normal
  const cx = centerX + nx * offset;
  const cy = centerY + ny * offset;

  // Quadratic Bezier: M start Q control end
  const path = `M ${sourceX} ${sourceY} Q ${cx} ${cy} ${targetX} ${targetY}`;
  
  // Label position is closer to the control point
  // For Quadratic Bezier, point at t=0.5 is (1-t)^2*P0 + 2*(1-t)*t*P1 + t^2*P2
  // t=0.5 -> 0.25*P0 + 0.5*P1 + 0.25*P2
  const labelX = 0.25 * sourceX + 0.5 * cx + 0.25 * targetX;
  const labelY = 0.25 * sourceY + 0.5 * cy + 0.25 * targetY;

  return [path, labelX, labelY];
}
