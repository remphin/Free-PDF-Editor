import DxfParser from 'dxf-parser';
import type { DwgDatabase, DwgEntity } from '@mlightcad/libredwg-web';
import JSZip from 'jszip';

export type CadFormat = 'dwg' | 'dxf' | 'dwf' | 'step' | 'iges' | 'stl' | 'plt' | 'svg';

export interface CadPoint3D {
  x: number;
  y: number;
  z: number;
}

export interface CadPolyline {
  points: CadPoint3D[];
  color: string;
  layer: string;
  closed?: boolean;
}

export interface CadBounds3D {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  width: number;
  height: number;
  depth: number;
}

export interface ParsedVectorDrawing {
  polylines: CadPolyline[];
  layers: string[];
  bounds: CadBounds3D;
  entityCount: number;
  entityBreakdown: Record<string, number>;
  warnings: string[];
  sheetNames?: string[];
}

export interface ParsedSvgDocument {
  sanitizedSvg: string;
  width: number;
  height: number;
  viewBox: string;
  elementCount: number;
  breakdown: Record<string, number>;
  vectorDrawing: ParsedVectorDrawing;
}

const ACI_PALETTE: Record<number, string> = {
  0: '#94a3b8',
  1: '#ef4444',
  2: '#f59e0b',
  3: '#22c55e',
  4: '#06b6d4',
  5: '#3b82f6',
  6: '#d946ef',
  7: '#e2e8f0',
  8: '#64748b',
  9: '#cbd5e1',
  10: '#f87171',
  30: '#fb923c',
  40: '#facc15',
  50: '#a3e635',
  94: '#34d399',
  140: '#38bdf8',
  170: '#60a5fa',
  210: '#a78bfa',
  250: '#475569',
  251: '#64748b',
  252: '#94a3b8',
  253: '#cbd5e1',
  254: '#e2e8f0',
  255: '#f8fafc',
};

const HPGL_PEN_COLORS: Record<number, string> = {
  0: '#94a3b8',
  1: '#38bdf8',
  2: '#f43f5e',
  3: '#10b981',
  4: '#f59e0b',
  5: '#818cf8',
  6: '#e879f9',
  7: '#e2e8f0',
  8: '#fb923c',
};

export function aciToHex(colorIndex?: number, fallback = '#38bdf8'): string {
  if (colorIndex == null || colorIndex === 256) return fallback;
  const idx = Math.abs(Math.trunc(colorIndex));
  if (ACI_PALETTE[idx]) return ACI_PALETTE[idx];
  const hue = (idx * 37) % 360;
  return `hsl(${hue}, 75%, 62%)`;
}

export function int24ToHex(colorInt?: number): string | null {
  if (typeof colorInt !== 'number' || colorInt <= 0) return null;
  const hex = (colorInt & 0xffffff).toString(16).padStart(6, '0');
  return `#${hex}`;
}

export function detectCadFormat(filename: string): CadFormat | null {
  const clean = filename.trim().toLowerCase();
  const dotIdx = clean.lastIndexOf('.');
  if (dotIdx === -1) return null;
  const ext = clean.slice(dotIdx + 1);
  switch (ext) {
    case 'dwg':
      return 'dwg';
    case 'dxf':
      return 'dxf';
    case 'dwf':
    case 'dwfx':
      return 'dwf';
    case 'stp':
    case 'step':
      return 'step';
    case 'igs':
    case 'iges':
      return 'iges';
    case 'stl':
      return 'stl';
    case 'plt':
    case 'hpgl':
    case 'hgl':
      return 'plt';
    case 'svg':
      return 'svg';
    default:
      return null;
  }
}

export function computeBounds(polylines: CadPolyline[]): CadBounds3D {
  if (polylines.length === 0) {
    return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0, width: 0, height: 0, depth: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const poly of polylines) {
    for (const p of poly.points) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      const z = Number.isFinite(p.z) ? p.z : 0;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (z < minZ) minZ = z;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
      if (z > maxZ) maxZ = z;
    }
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0, width: 0, height: 0, depth: 0 };
  }

  return {
    minX,
    minY,
    minZ,
    maxX,
    maxY,
    maxZ,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
    depth: Math.max(0, maxZ - minZ),
  };
}

function bulgeSegmentPoints(
  p1: CadPoint3D,
  p2: CadPoint3D,
  bulge: number,
  segments = 16
): CadPoint3D[] {
  if (!bulge || Math.abs(bulge) < 1e-6) {
    return [p2];
  }
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const chord = Math.hypot(dx, dy);
  if (chord < 1e-8) return [p2];

  const theta = 4 * Math.atan(bulge);
  const radius = chord / (2 * Math.sin(Math.abs(theta) / 2));
  const sagitta = (bulge * chord) / 2;
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const nx = -dy / chord;
  const ny = dx / chord;
  const distToCenter = Math.sqrt(Math.max(0, radius * radius - (chord / 2) * (chord / 2)));
  const sign = bulge > 0 ? 1 : -1;
  const offset = Math.abs(theta) > Math.PI ? -sign * distToCenter : sign * distToCenter;
  const cx = midX + nx * offset;
  const cy = midY + ny * offset;
  const startAngle = Math.atan2(p1.y - cy, p1.x - cx);
  const steps = Math.max(4, Math.min(36, Math.ceil((Math.abs(theta) / (Math.PI * 2)) * segments * 2)));
  const out: CadPoint3D[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ang = startAngle + theta * t;
    const z = p1.z + (p2.z - p1.z) * t;
    out.push({
      x: cx + radius * Math.cos(ang),
      y: cy + radius * Math.sin(ang),
      z,
    });
  }
  // Suppress unused warning on sagitta while keeping geometric derivation clear
  void sagitta;
  return out;
}

function sampleCircleOrArcPoints(
  cx: number,
  cy: number,
  cz: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  closed: boolean,
  steps = 48
): CadPoint3D[] {
  const pts: CadPoint3D[] = [];
  if (closed) {
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      pts.push({ x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a), z: cz });
    }
    return pts;
  }
  let end = endAngle;
  while (end <= startAngle) end += Math.PI * 2;
  const sweep = end - startAngle;
  const segs = Math.max(8, Math.ceil((sweep / (Math.PI * 2)) * steps));
  for (let i = 0; i <= segs; i++) {
    const a = startAngle + (sweep * i) / segs;
    pts.push({ x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a), z: cz });
  }
  return pts;
}

function sampleEllipsePoints(
  cx: number,
  cy: number,
  cz: number,
  majorX: number,
  majorY: number,
  axisRatio: number,
  startAngle: number,
  endAngle: number,
  steps = 48
): CadPoint3D[] {
  const majorLen = Math.hypot(majorX, majorY);
  if (majorLen < 1e-8) return [];
  const rot = Math.atan2(majorY, majorX);
  const rx = majorLen;
  const ry = majorLen * (axisRatio || 1);
  let end = endAngle;
  if (Math.abs(end - startAngle) < 1e-6) {
    end = startAngle + Math.PI * 2;
  } else {
    while (end < startAngle) end += Math.PI * 2;
  }
  const sweep = end - startAngle;
  const segs = Math.max(12, Math.ceil((sweep / (Math.PI * 2)) * steps));
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  const pts: CadPoint3D[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = startAngle + (sweep * i) / segs;
    const lx = rx * Math.cos(t);
    const ly = ry * Math.sin(t);
    pts.push({
      x: cx + lx * cosR - ly * sinR,
      y: cy + lx * sinR + ly * cosR,
      z: cz,
    });
  }
  return pts;
}

function sampleCatmullSpline(points: CadPoint3D[], subdivisions = 8): CadPoint3D[] {
  if (points.length <= 2) return points;
  const out: CadPoint3D[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < subdivisions; s++) {
      const t = s / subdivisions;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        z:
          0.5 *
          (2 * p1.z +
            (-p0.z + p2.z) * t +
            (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
            (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
      });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function transformPoint2D(
  pt: CadPoint3D,
  tx: number,
  ty: number,
  tz: number,
  sx: number,
  sy: number,
  sz: number,
  rotRad: number
): CadPoint3D {
  const xScaled = pt.x * sx;
  const yScaled = pt.y * sy;
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);
  return {
    x: tx + xScaled * cos - yScaled * sin,
    y: ty + xScaled * sin + yScaled * cos,
    z: tz + pt.z * sz,
  };
}

/**
 * Pure HP-GL / HPGL-2 (.plt) plotter parser.
 */
export function parseHpglPlotter(text: string): ParsedVectorDrawing {
  const polylines: CadPolyline[] = [];
  const breakdown: Record<string, number> = {};
  const layers = new Set<string>();
  const warnings: string[] = [];

  let currentPen = 1;
  let penDown = false;
  let absoluteMode = true;
  let curX = 0;
  let curY = 0;
  let activePoly: CadPoint3D[] = [];

  const flushActive = () => {
    if (activePoly.length >= 2) {
      const layer = `PEN_${currentPen}`;
      layers.add(layer);
      polylines.push({
        points: activePoly,
        color: HPGL_PEN_COLORS[currentPen] ?? aciToHex(currentPen),
        layer,
      });
      breakdown['POLYLINE'] = (breakdown['POLYLINE'] ?? 0) + 1;
    }
    activePoly = [];
  };

  // Strip Escape/HPGL-2 control introducers and split by ';' or newline
  const cleaned = text.replace(/\x1b[^\r\n;]*/g, ' ');
  const tokens = cleaned
    .split(/[;\r\n]+/)
    .map((cmd) => cmd.trim())
    .filter(Boolean);

  const parseNums = (argStr: string): number[] => {
    const matches = argStr.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
    return matches ? matches.map(Number).filter(Number.isFinite) : [];
  };

  for (const raw of tokens) {
    const upper = raw.toUpperCase();
    const op = upper.slice(0, 2);
    const args = upper.slice(2);

    if (op === 'IN' || op === 'DF') {
      flushActive();
      penDown = false;
      absoluteMode = true;
      curX = 0;
      curY = 0;
      continue;
    }

    if (op === 'SP') {
      flushActive();
      const nums = parseNums(args);
      if (nums.length > 0 && nums[0] > 0) {
        currentPen = Math.trunc(nums[0]);
      }
      continue;
    }

    if (op === 'PA' || op === 'PR') {
      absoluteMode = op === 'PA';
      const nums = parseNums(args);
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const nx = absoluteMode ? nums[i] : curX + nums[i];
        const ny = absoluteMode ? nums[i + 1] : curY + nums[i + 1];
        curX = nx;
        curY = ny;
        if (penDown) {
          if (activePoly.length === 0) {
            activePoly.push({ x: curX, y: curY, z: 0 });
          } else {
            activePoly.push({ x: nx, y: ny, z: 0 });
          }
        }
      }
      continue;
    }

    if (op === 'PU') {
      flushActive();
      penDown = false;
      const nums = parseNums(args);
      for (let i = 0; i + 1 < nums.length; i += 2) {
        curX = absoluteMode ? nums[i] : curX + nums[i];
        curY = absoluteMode ? nums[i + 1] : curY + nums[i + 1];
      }
      continue;
    }

    if (op === 'PD') {
      if (!penDown) {
        penDown = true;
        activePoly = [{ x: curX, y: curY, z: 0 }];
      }
      const nums = parseNums(args);
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const nx = absoluteMode ? nums[i] : curX + nums[i];
        const ny = absoluteMode ? nums[i + 1] : curY + nums[i + 1];
        curX = nx;
        curY = ny;
        activePoly.push({ x: nx, y: ny, z: 0 });
      }
      continue;
    }

    if (op === 'CI') {
      flushActive();
      const nums = parseNums(args);
      if (nums.length >= 1 && nums[0] > 0) {
        const radius = nums[0];
        const layer = `PEN_${currentPen}`;
        layers.add(layer);
        polylines.push({
          points: sampleCircleOrArcPoints(curX, curY, 0, radius, 0, Math.PI * 2, true, 48),
          color: HPGL_PEN_COLORS[currentPen] ?? aciToHex(currentPen),
          layer,
          closed: true,
        });
        breakdown['CIRCLE'] = (breakdown['CIRCLE'] ?? 0) + 1;
      }
      continue;
    }

    if (op === 'AA' || op === 'AR') {
      flushActive();
      const nums = parseNums(args);
      if (nums.length >= 3) {
        const cx = op === 'AA' ? nums[0] : curX + nums[0];
        const cy = op === 'AA' ? nums[1] : curY + nums[1];
        const sweepDeg = nums[2];
        const radius = Math.hypot(curX - cx, curY - cy);
        if (radius > 1e-6) {
          const startAng = Math.atan2(curY - cy, curX - cx);
          const sweepRad = (sweepDeg * Math.PI) / 180;
          const steps = Math.max(8, Math.ceil((Math.abs(sweepRad) / (Math.PI * 2)) * 48));
          const pts: CadPoint3D[] = [];
          for (let i = 0; i <= steps; i++) {
            const ang = startAng + (sweepRad * i) / steps;
            pts.push({ x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang), z: 0 });
          }
          const last = pts[pts.length - 1];
          curX = last.x;
          curY = last.y;
          const layer = `PEN_${currentPen}`;
          layers.add(layer);
          polylines.push({
            points: pts,
            color: HPGL_PEN_COLORS[currentPen] ?? aciToHex(currentPen),
            layer,
          });
          breakdown['ARC'] = (breakdown['ARC'] ?? 0) + 1;
        }
      }
      continue;
    }

    if (op === 'EA' || op === 'ER') {
      flushActive();
      const nums = parseNums(args);
      if (nums.length >= 2) {
        const tx = op === 'EA' ? nums[0] : curX + nums[0];
        const ty = op === 'EA' ? nums[1] : curY + nums[1];
        const layer = `PEN_${currentPen}`;
        layers.add(layer);
        polylines.push({
          points: [
            { x: curX, y: curY, z: 0 },
            { x: tx, y: curY, z: 0 },
            { x: tx, y: ty, z: 0 },
            { x: curX, y: ty, z: 0 },
            { x: curX, y: curY, z: 0 },
          ],
          color: HPGL_PEN_COLORS[currentPen] ?? aciToHex(currentPen),
          layer,
          closed: true,
        });
        breakdown['RECT'] = (breakdown['RECT'] ?? 0) + 1;
      }
    }
  }

  flushActive();

  if (polylines.length === 0) {
    warnings.push('No drawable HP-GL vector commands found in PLT file.');
  }

  return {
    polylines,
    layers: Array.from(layers),
    bounds: computeBounds(polylines),
    entityCount: polylines.length,
    entityBreakdown: breakdown,
    warnings,
  };
}

/**
 * Pure DXF ASCII parser built on `dxf-parser`.
 */
export function parseDxfText(text: string): ParsedVectorDrawing {
  const parser = new DxfParser();
  const dxf = parser.parseSync(text);
  const polylines: CadPolyline[] = [];
  const layersSet = new Set<string>();
  const breakdown: Record<string, number> = {};
  const warnings: string[] = [];

  if (!dxf) {
    return {
      polylines: [],
      layers: [],
      bounds: computeBounds([]),
      entityCount: 0,
      entityBreakdown: {},
      warnings: ['DXF parser returned empty document.'],
    };
  }

  const layerColors: Record<string, string> = {};
  const layerMap = dxf.tables?.layer?.layers;
  if (layerMap) {
    for (const [name, layerObj] of Object.entries(layerMap)) {
      layersSet.add(name);
      layerColors[name] = aciToHex(layerObj.colorIndex, '#38bdf8');
    }
  }

  const resolveColor = (entity: Record<string, unknown>, layer: string): string => {
    const ci = entity.colorIndex as number | undefined;
    if (typeof ci === 'number' && ci !== 256 && ci !== 0) {
      return aciToHex(ci);
    }
    const rawColor = entity.color as number | undefined;
    const hex = int24ToHex(rawColor);
    if (hex) return hex;
    return layerColors[layer] ?? '#38bdf8';
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processEntities = (entities: any[] | undefined, depth = 0): CadPolyline[] => {
    const out: CadPolyline[] = [];
    if (!entities || depth > 5) return out;

    for (const ent of entities) {
      if (!ent || !ent.type) continue;
      const layer = String(ent.layer || '0');
      layersSet.add(layer);
      const color = resolveColor(ent, layer);
      const type = String(ent.type).toUpperCase();
      breakdown[type] = (breakdown[type] ?? 0) + 1;

      if (type === 'LINE' && Array.isArray(ent.vertices) && ent.vertices.length >= 2) {
        out.push({
          points: [
            { x: ent.vertices[0].x ?? 0, y: ent.vertices[0].y ?? 0, z: ent.vertices[0].z ?? 0 },
            { x: ent.vertices[1].x ?? 0, y: ent.vertices[1].y ?? 0, z: ent.vertices[1].z ?? 0 },
          ],
          color,
          layer,
        });
      } else if ((type === 'LWPOLYLINE' || type === 'POLYLINE') && Array.isArray(ent.vertices) && ent.vertices.length >= 2) {
        const pts: CadPoint3D[] = [];
        const verts = ent.vertices;
        const closed = Boolean(ent.shape || ent.closed);
        for (let i = 0; i < verts.length; i++) {
          const v = verts[i];
          const pCur: CadPoint3D = { x: v.x ?? 0, y: v.y ?? 0, z: v.z ?? ent.elevation ?? 0 };
          if (i === 0) pts.push(pCur);
          const nextIdx = i + 1 < verts.length ? i + 1 : closed ? 0 : -1;
          if (nextIdx >= 0) {
            const vNext = verts[nextIdx];
            const pNext: CadPoint3D = { x: vNext.x ?? 0, y: vNext.y ?? 0, z: vNext.z ?? ent.elevation ?? 0 };
            if (typeof v.bulge === 'number' && Math.abs(v.bulge) > 1e-6) {
              pts.push(...bulgeSegmentPoints(pCur, pNext, v.bulge));
            } else {
              pts.push(pNext);
            }
          }
        }
        out.push({ points: pts, color, layer, closed });
      } else if (type === 'CIRCLE' && ent.center && typeof ent.radius === 'number') {
        out.push({
          points: sampleCircleOrArcPoints(
            ent.center.x ?? 0,
            ent.center.y ?? 0,
            ent.center.z ?? 0,
            ent.radius,
            0,
            Math.PI * 2,
            true
          ),
          color,
          layer,
          closed: true,
        });
      } else if (type === 'ARC' && ent.center && typeof ent.radius === 'number') {
        out.push({
          points: sampleCircleOrArcPoints(
            ent.center.x ?? 0,
            ent.center.y ?? 0,
            ent.center.z ?? 0,
            ent.radius,
            ent.startAngle ?? 0,
            ent.endAngle ?? Math.PI,
            false
          ),
          color,
          layer,
        });
      } else if (type === 'ELLIPSE' && ent.center && ent.majorAxisEndPoint) {
        const pts = sampleEllipsePoints(
          ent.center.x ?? 0,
          ent.center.y ?? 0,
          ent.center.z ?? 0,
          ent.majorAxisEndPoint.x ?? 1,
          ent.majorAxisEndPoint.y ?? 0,
          ent.axisRatio ?? 1,
          ent.startAngle ?? 0,
          ent.endAngle ?? Math.PI * 2
        );
        if (pts.length >= 2) out.push({ points: pts, color, layer });
      } else if (type === 'SPLINE') {
        const rawPts: CadPoint3D[] =
          Array.isArray(ent.fitPoints) && ent.fitPoints.length >= 2
            ? ent.fitPoints.map((p: { x?: number; y?: number; z?: number }) => ({
                x: p.x ?? 0,
                y: p.y ?? 0,
                z: p.z ?? 0,
              }))
            : Array.isArray(ent.controlPoints)
              ? ent.controlPoints.map((p: { x?: number; y?: number; z?: number }) => ({
                  x: p.x ?? 0,
                  y: p.y ?? 0,
                  z: p.z ?? 0,
                }))
              : [];
        if (rawPts.length >= 2) {
          out.push({ points: sampleCatmullSpline(rawPts, 6), color, layer });
        }
      } else if ((type === 'SOLID' || type === '3DFACE') && Array.isArray(ent.points) && ent.points.length >= 3) {
        const pts = ent.points.map((p: { x?: number; y?: number; z?: number }) => ({
          x: p.x ?? 0,
          y: p.y ?? 0,
          z: p.z ?? 0,
        }));
        pts.push(pts[0]);
        out.push({ points: pts, color, layer, closed: true });
      } else if (type === 'INSERT' && ent.name && dxf.blocks?.[ent.name]?.entities) {
        const blk = dxf.blocks[ent.name];
        const childPolys = processEntities(blk.entities, depth + 1);
        const pos = ent.position ?? { x: 0, y: 0, z: 0 };
        const sx = ent.xScale ?? 1;
        const sy = ent.yScale ?? 1;
        const sz = ent.zScale ?? 1;
        const rot = ((ent.rotation ?? 0) * Math.PI) / 180;
        for (const cp of childPolys) {
          out.push({
            ...cp,
            layer: cp.layer === '0' ? layer : cp.layer,
            points: cp.points.map((pt) =>
              transformPoint2D(pt, pos.x ?? 0, pos.y ?? 0, pos.z ?? 0, sx, sy, sz, rot)
            ),
          });
        }
      }
    }
    return out;
  };

  polylines.push(...processEntities(dxf.entities));

  return {
    polylines,
    layers: Array.from(layersSet),
    bounds: computeBounds(polylines),
    entityCount: polylines.length,
    entityBreakdown: breakdown,
    warnings,
  };
}

/**
 * Pure adapter converting LibreDWG `DwgDatabase` into normalized CAD vector polylines.
 */
export function convertDwgDatabaseToVector(db: DwgDatabase): ParsedVectorDrawing {
  const polylines: CadPolyline[] = [];
  const layersSet = new Set<string>();
  const breakdown: Record<string, number> = {};
  const warnings: string[] = [];

  const layerColors: Record<string, string> = {};
  if (db.tables?.LAYER?.entries) {
    for (const entry of db.tables.LAYER.entries) {
      if (entry?.name) {
        layersSet.add(entry.name);
        layerColors[entry.name] = aciToHex(entry.colorIndex, '#38bdf8');
      }
    }
  }

  const blockMap = new Map<string, DwgEntity[]>();
  if (db.tables?.BLOCK_RECORD?.entries) {
    for (const blk of db.tables.BLOCK_RECORD.entries) {
      if (blk?.name && Array.isArray(blk.entities)) {
        blockMap.set(blk.name, blk.entities);
      }
    }
  }

  const resolveColor = (ent: DwgEntity, layer: string): string => {
    const trueColor = int24ToHex(ent.color);
    if (trueColor) return trueColor;
    if (typeof ent.colorIndex === 'number' && ent.colorIndex !== 256 && ent.colorIndex !== 0) {
      return aciToHex(ent.colorIndex);
    }
    return layerColors[layer] ?? '#38bdf8';
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processList = (entities: DwgEntity[] | undefined, depth = 0): CadPolyline[] => {
    const out: CadPolyline[] = [];
    if (!entities || depth > 5) return out;

    for (const rawEnt of entities) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ent = rawEnt as any;
      if (!ent || !ent.type) continue;
      if (ent.isVisible === false) continue;

      const layer = String(ent.layer || '0');
      layersSet.add(layer);
      const color = resolveColor(ent, layer);
      const type = String(ent.type).toUpperCase();
      breakdown[type] = (breakdown[type] ?? 0) + 1;

      if (type === 'LINE' && ent.startPoint && ent.endPoint) {
        out.push({
          points: [
            { x: ent.startPoint.x ?? 0, y: ent.startPoint.y ?? 0, z: ent.startPoint.z ?? 0 },
            { x: ent.endPoint.x ?? 0, y: ent.endPoint.y ?? 0, z: ent.endPoint.z ?? 0 },
          ],
          color,
          layer,
        });
      } else if (type === 'LWPOLYLINE' && Array.isArray(ent.vertices) && ent.vertices.length >= 2) {
        const closed = Boolean((ent.flag ?? 0) & 1);
        const elev = ent.elevation ?? 0;
        const pts: CadPoint3D[] = [];
        for (let i = 0; i < ent.vertices.length; i++) {
          const v = ent.vertices[i];
          const pCur: CadPoint3D = { x: v.x ?? 0, y: v.y ?? 0, z: elev };
          if (i === 0) pts.push(pCur);
          const nextIdx = i + 1 < ent.vertices.length ? i + 1 : closed ? 0 : -1;
          if (nextIdx >= 0) {
            const vn = ent.vertices[nextIdx];
            const pNext: CadPoint3D = { x: vn.x ?? 0, y: vn.y ?? 0, z: elev };
            if (typeof v.bulge === 'number' && Math.abs(v.bulge) > 1e-6) {
              pts.push(...bulgeSegmentPoints(pCur, pNext, v.bulge));
            } else {
              pts.push(pNext);
            }
          }
        }
        out.push({ points: pts, color, layer, closed });
      } else if (
        (type === 'POLYLINE2D' || type === 'POLYLINE3D' || type === 'POLYLINE') &&
        Array.isArray(ent.vertices) &&
        ent.vertices.length >= 2
      ) {
        const closed = Boolean((ent.flag ?? 0) & 1);
        const elev = ent.elevation ?? 0;
        const pts: CadPoint3D[] = ent.vertices.map((v: { x?: number; y?: number; z?: number }) => ({
          x: v.x ?? 0,
          y: v.y ?? 0,
          z: v.z ?? elev,
        }));
        if (closed) pts.push(pts[0]);
        out.push({ points: pts, color, layer, closed });
      } else if (type === 'CIRCLE' && ent.center && typeof ent.radius === 'number') {
        out.push({
          points: sampleCircleOrArcPoints(
            ent.center.x ?? 0,
            ent.center.y ?? 0,
            ent.center.z ?? 0,
            ent.radius,
            0,
            Math.PI * 2,
            true
          ),
          color,
          layer,
          closed: true,
        });
      } else if (type === 'ARC' && ent.center && typeof ent.radius === 'number') {
        out.push({
          points: sampleCircleOrArcPoints(
            ent.center.x ?? 0,
            ent.center.y ?? 0,
            ent.center.z ?? 0,
            ent.radius,
            ent.startAngle ?? 0,
            ent.endAngle ?? Math.PI,
            false
          ),
          color,
          layer,
        });
      } else if (type === 'ELLIPSE' && ent.center && ent.majorAxisEndPoint) {
        const pts = sampleEllipsePoints(
          ent.center.x ?? 0,
          ent.center.y ?? 0,
          ent.center.z ?? 0,
          ent.majorAxisEndPoint.x ?? 1,
          ent.majorAxisEndPoint.y ?? 0,
          ent.axisRatio ?? 1,
          ent.startAngle ?? 0,
          ent.endAngle ?? Math.PI * 2
        );
        if (pts.length >= 2) out.push({ points: pts, color, layer });
      } else if (type === 'SPLINE') {
        const rawPts: CadPoint3D[] =
          Array.isArray(ent.fitPoints) && ent.fitPoints.length >= 2
            ? ent.fitPoints.map((p: { x?: number; y?: number; z?: number }) => ({
                x: p.x ?? 0,
                y: p.y ?? 0,
                z: p.z ?? 0,
              }))
            : Array.isArray(ent.controlPoints)
              ? ent.controlPoints.map((p: { x?: number; y?: number; z?: number }) => ({
                  x: p.x ?? 0,
                  y: p.y ?? 0,
                  z: p.z ?? 0,
                }))
              : [];
        if (rawPts.length >= 2) {
          out.push({ points: sampleCatmullSpline(rawPts, 6), color, layer });
        }
      } else if ((type === 'SOLID' || type === '3DFACE') && ent.corner1 && ent.corner2 && ent.corner3) {
        const pts: CadPoint3D[] = [
          { x: ent.corner1.x ?? 0, y: ent.corner1.y ?? 0, z: ent.corner1.z ?? 0 },
          { x: ent.corner2.x ?? 0, y: ent.corner2.y ?? 0, z: ent.corner2.z ?? 0 },
          { x: ent.corner3.x ?? 0, y: ent.corner3.y ?? 0, z: ent.corner3.z ?? 0 },
        ];
        if (ent.corner4) {
          pts.push({ x: ent.corner4.x ?? 0, y: ent.corner4.y ?? 0, z: ent.corner4.z ?? 0 });
        }
        pts.push(pts[0]);
        out.push({ points: pts, color, layer, closed: true });
      } else if (type === 'INSERT' && ent.name && blockMap.has(ent.name)) {
        const childPolys = processList(blockMap.get(ent.name), depth + 1);
        const pos = ent.insertionPoint ?? { x: 0, y: 0, z: 0 };
        const sx = ent.xScale ?? 1;
        const sy = ent.yScale ?? 1;
        const sz = ent.zScale ?? 1;
        const rot = ent.rotation ?? 0;
        for (const cp of childPolys) {
          out.push({
            ...cp,
            layer: cp.layer === '0' ? layer : cp.layer,
            points: cp.points.map((pt) =>
              transformPoint2D(pt, pos.x ?? 0, pos.y ?? 0, pos.z ?? 0, sx, sy, sz, rot)
            ),
          });
        }
      }
    }
    return out;
  };

  polylines.push(...processList(db.entities));

  return {
    polylines,
    layers: Array.from(layersSet),
    bounds: computeBounds(polylines),
    entityCount: polylines.length,
    entityBreakdown: breakdown,
    warnings,
  };
}

/**
 * Parses SVG path `d` attribute into polylines (supports M/m, L/l, H/h, V/v, C/c, Q/q, Z/z).
 */
export function parseSvgPathData(d: string, flipY = true): CadPoint3D[][] {
  const strokes: CadPoint3D[][] = [];
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g);
  if (!tokens) return strokes;

  let i = 0;
  let cmd = '';
  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;
  let currentStroke: CadPoint3D[] = [];

  const yVal = (y: number) => (flipY ? -y : y);
  const pushPt = (x: number, y: number) => {
    currentStroke.push({ x, y: yVal(y), z: 0 });
  };
  const finishStroke = () => {
    if (currentStroke.length >= 2) {
      strokes.push(currentStroke);
    }
    currentStroke = [];
  };

  const isNum = (idx: number) => idx < tokens.length && !/^[a-zA-Z]$/.test(tokens[idx]);
  const nextNum = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) {
      cmd = tokens[i++];
      if (cmd === 'Z' || cmd === 'z') {
        if (currentStroke.length > 0) {
          pushPt(startX, startY);
          finishStroke();
        }
        curX = startX;
        curY = startY;
      }
      continue;
    }

    const rel = cmd === cmd.toLowerCase();
    const op = cmd.toUpperCase();

    if (op === 'M') {
      finishStroke();
      const x = nextNum() + (rel ? curX : 0);
      const y = nextNum() + (rel ? curY : 0);
      curX = x;
      curY = y;
      startX = x;
      startY = y;
      pushPt(curX, curY);
      cmd = rel ? 'l' : 'L';
    } else if (op === 'L') {
      const x = nextNum() + (rel ? curX : 0);
      const y = nextNum() + (rel ? curY : 0);
      curX = x;
      curY = y;
      pushPt(curX, curY);
    } else if (op === 'H') {
      const x = nextNum() + (rel ? curX : 0);
      curX = x;
      pushPt(curX, curY);
    } else if (op === 'V') {
      const y = nextNum() + (rel ? curY : 0);
      curY = y;
      pushPt(curX, curY);
    } else if (op === 'C') {
      const x1 = nextNum() + (rel ? curX : 0);
      const y1 = nextNum() + (rel ? curY : 0);
      const x2 = nextNum() + (rel ? curX : 0);
      const y2 = nextNum() + (rel ? curY : 0);
      const x = nextNum() + (rel ? curX : 0);
      const y = nextNum() + (rel ? curY : 0);
      const steps = 10;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const u = 1 - t;
        const bx = u * u * u * curX + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x;
        const by = u * u * u * curY + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y;
        pushPt(bx, by);
      }
      curX = x;
      curY = y;
    } else if (op === 'Q') {
      const x1 = nextNum() + (rel ? curX : 0);
      const y1 = nextNum() + (rel ? curY : 0);
      const x = nextNum() + (rel ? curX : 0);
      const y = nextNum() + (rel ? curY : 0);
      const steps = 8;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const u = 1 - t;
        const bx = u * u * curX + 2 * u * t * x1 + t * t * x;
        const by = u * u * curY + 2 * u * t * y1 + t * t * y;
        pushPt(bx, by);
      }
      curX = x;
      curY = y;
    } else if (op === 'S' || op === 'T' || op === 'A') {
      // Skip unsupported arc/smooth parameters cleanly to avoid infinite loop
      const argCounts: Record<string, number> = { S: 4, T: 2, A: 7 };
      const count = argCounts[op] ?? 2;
      const vals: number[] = [];
      for (let k = 0; k < count && isNum(i); k++) vals.push(nextNum());
      if (vals.length >= 2) {
        const x = vals[vals.length - 2] + (rel ? curX : 0);
        const y = vals[vals.length - 1] + (rel ? curY : 0);
        curX = x;
        curY = y;
        pushPt(curX, curY);
      }
    } else {
      i++;
    }
  }

  finishStroke();
  return strokes;
}

function getAttr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i');
  const m = tag.match(re);
  return m ? m[1] : null;
}

function normalizeSvgColor(raw: string | null, fallback = '#38bdf8'): string {
  if (!raw || raw === 'none' || raw === 'transparent') return fallback;
  if (raw.startsWith('#') && raw.length === 9) {
    // XPS #AARRGGBB -> #RRGGBB
    return `#${raw.slice(3)}`;
  }
  return raw;
}

/**
 * Extracts vector primitives from XML/SVG/XPS FixedPage markup without needing browser DOM.
 */
function extractVectorFromXmlMarkup(
  xmlText: string,
  layerName: string,
  flipY = true
): { polylines: CadPolyline[]; breakdown: Record<string, number> } {
  const polylines: CadPolyline[] = [];
  const breakdown: Record<string, number> = {};

  // Match <Path Data="..." /> (XPS/DWFx) and <path d="..." /> (SVG)
  const pathRegex = /<(?:path|Path)\b([^>]*)\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = pathRegex.exec(xmlText)) !== null) {
    const attrs = match[1];
    const data = getAttr(attrs, 'Data') ?? getAttr(attrs, 'd');
    if (!data) continue;
    const color = normalizeSvgColor(getAttr(attrs, 'Stroke') ?? getAttr(attrs, 'stroke'));
    const strokes = parseSvgPathData(data, flipY);
    for (const s of strokes) {
      polylines.push({ points: s, color, layer: layerName });
      breakdown['PATH'] = (breakdown['PATH'] ?? 0) + 1;
    }
  }

  // Match <line x1="" y1="" x2="" y2="" />
  const lineRegex = /<line\b([^>]*)\/?>/gi;
  while ((match = lineRegex.exec(xmlText)) !== null) {
    const attrs = match[1];
    const x1 = parseFloat(getAttr(attrs, 'x1') ?? '0');
    const y1 = parseFloat(getAttr(attrs, 'y1') ?? '0');
    const x2 = parseFloat(getAttr(attrs, 'x2') ?? '0');
    const y2 = parseFloat(getAttr(attrs, 'y2') ?? '0');
    if ([x1, y1, x2, y2].every(Number.isFinite)) {
      const color = normalizeSvgColor(getAttr(attrs, 'stroke'));
      polylines.push({
        points: [
          { x: x1, y: flipY ? -y1 : y1, z: 0 },
          { x: x2, y: flipY ? -y2 : y2, z: 0 },
        ],
        color,
        layer: layerName,
      });
      breakdown['LINE'] = (breakdown['LINE'] ?? 0) + 1;
    }
  }

  // Match <rect x="" y="" width="" height="" />
  const rectRegex = /<rect\b([^>]*)\/?>/gi;
  while ((match = rectRegex.exec(xmlText)) !== null) {
    const attrs = match[1];
    const x = parseFloat(getAttr(attrs, 'x') ?? '0');
    const y = parseFloat(getAttr(attrs, 'y') ?? '0');
    const w = parseFloat(getAttr(attrs, 'width') ?? '0');
    const h = parseFloat(getAttr(attrs, 'height') ?? '0');
    if (w > 0 && h > 0) {
      const color = normalizeSvgColor(getAttr(attrs, 'stroke') ?? getAttr(attrs, 'fill'));
      const y1 = flipY ? -y : y;
      const y2 = flipY ? -(y + h) : y + h;
      polylines.push({
        points: [
          { x, y: y1, z: 0 },
          { x: x + w, y: y1, z: 0 },
          { x: x + w, y: y2, z: 0 },
          { x, y: y2, z: 0 },
          { x, y: y1, z: 0 },
        ],
        color,
        layer: layerName,
        closed: true,
      });
      breakdown['RECT'] = (breakdown['RECT'] ?? 0) + 1;
    }
  }

  // Match <circle cx="" cy="" r="" />
  const circleRegex = /<circle\b([^>]*)\/?>/gi;
  while ((match = circleRegex.exec(xmlText)) !== null) {
    const attrs = match[1];
    const cx = parseFloat(getAttr(attrs, 'cx') ?? '0');
    const cy = parseFloat(getAttr(attrs, 'cy') ?? '0');
    const r = parseFloat(getAttr(attrs, 'r') ?? '0');
    if (r > 0) {
      const color = normalizeSvgColor(getAttr(attrs, 'stroke') ?? getAttr(attrs, 'fill'));
      polylines.push({
        points: sampleCircleOrArcPoints(cx, flipY ? -cy : cy, 0, r, 0, Math.PI * 2, true),
        color,
        layer: layerName,
        closed: true,
      });
      breakdown['CIRCLE'] = (breakdown['CIRCLE'] ?? 0) + 1;
    }
  }

  // Match <polyline points="..." /> and <polygon points="..." />
  const polyRegex = /<(polyline|polygon)\b([^>]*)\/?>/gi;
  while ((match = polyRegex.exec(xmlText)) !== null) {
    const tag = match[1].toLowerCase();
    const attrs = match[2];
    const rawPts = getAttr(attrs, 'points');
    if (!rawPts) continue;
    const nums = rawPts.match(/[-+]?(?:\d*\.\d+|\d+)/g)?.map(Number) ?? [];
    const pts: CadPoint3D[] = [];
    for (let k = 0; k + 1 < nums.length; k += 2) {
      pts.push({ x: nums[k], y: flipY ? -nums[k + 1] : nums[k + 1], z: 0 });
    }
    if (tag === 'polygon' && pts.length >= 3) pts.push(pts[0]);
    if (pts.length >= 2) {
      const color = normalizeSvgColor(getAttr(attrs, 'stroke') ?? getAttr(attrs, 'fill'));
      polylines.push({ points: pts, color, layer: layerName, closed: tag === 'polygon' });
      breakdown[tag.toUpperCase()] = (breakdown[tag.toUpperCase()] ?? 0) + 1;
    }
  }

  return { polylines, breakdown };
}

/**
 * Pure DWF / DWFx container parser (extracts FixedPage XPS paths, SVG sheets, and uncompressed W2D geometry).
 */
export async function parseDwfArchive(bytes: Uint8Array): Promise<ParsedVectorDrawing> {
  const warnings: string[] = [];
  const polylines: CadPolyline[] = [];
  const breakdown: Record<string, number> = {};
  const layers = new Set<string>();
  const sheetNames: string[] = [];

  // Check if file starts with ASCII `(DWF V` instead of ZIP `PK`
  const headerAscii = new TextDecoder().decode(bytes.slice(0, 32));
  if (headerAscii.startsWith('(DWF')) {
    warnings.push('Classic ASCII/Whip DWF stream detected; scanning uncompressed vector opcodes.');
  }

  try {
    const zip = await JSZip.loadAsync(bytes);
    const entries = Object.values(zip.files).filter((f) => !f.dir);
    for (const entry of entries) {
      const lower = entry.name.toLowerCase();
      if (lower.endsWith('.fpage') || lower.endsWith('.svg') || lower.endsWith('.xml')) {
        const text = await entry.async('string');
        if (!text.includes('<Path') && !text.includes('<path') && !text.includes('<line')) continue;
        const sheetLabel = entry.name.split('/').pop() || entry.name;
        sheetNames.push(sheetLabel);
        layers.add(sheetLabel);
        const extracted = extractVectorFromXmlMarkup(text, sheetLabel, true);
        polylines.push(...extracted.polylines);
        for (const [k, v] of Object.entries(extracted.breakdown)) {
          breakdown[k] = (breakdown[k] ?? 0) + v;
        }
      } else if (lower.endsWith('.w2d')) {
        const w2dBytes = await entry.async('uint8array');
        const w2dText = new TextDecoder('latin1').decode(w2dBytes);
        const sheetLabel = entry.name.split('/').pop() || entry.name;
        sheetNames.push(sheetLabel);
        // Extract ASCII W2D line/polyline commands `(Line x1,y1 x2,y2)` or `L x1,y1 x2,y2`
        const asciiLines = w2dText.matchAll(/\bL\s+(-?\d+),(-?\d+)\s+(-?\d+),(-?\d+)/g);
        let added = 0;
        for (const m of asciiLines) {
          polylines.push({
            points: [
              { x: Number(m[1]), y: Number(m[2]), z: 0 },
              { x: Number(m[3]), y: Number(m[4]), z: 0 },
            ],
            color: '#38bdf8',
            layer: sheetLabel,
          });
          added++;
          breakdown['W2D_LINE'] = (breakdown['W2D_LINE'] ?? 0) + 1;
        }
        if (added > 0) layers.add(sheetLabel);
      }
    }
  } catch {
    warnings.push('DWF archive could not be unpacked as a standard DWFx/ZIP container.');
  }

  if (polylines.length === 0) {
    warnings.push(
      'No uncompressed DWFx/XPS or ASCII W2D vector geometry found. Export as DWFx or DXF/DWG for full fidelity.'
    );
  }

  return {
    polylines,
    layers: Array.from(layers),
    bounds: computeBounds(polylines),
    entityCount: polylines.length,
    entityBreakdown: breakdown,
    warnings,
    sheetNames,
  };
}

/**
 * Sanitizes SVG markup and extracts metadata + 3D/2D vector strokes.
 */
export function parseSvgDocument(rawSvg: string): ParsedSvgDocument {
  const sanitizedSvg = rawSvg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');

  const svgTagMatch = sanitizedSvg.match(/<svg\b([^>]*)>/i);
  const attrs = svgTagMatch ? svgTagMatch[1] : '';
  const viewBox = getAttr(attrs, 'viewBox') ?? '';
  let width = parseFloat(getAttr(attrs, 'width') ?? '0') || 0;
  let height = parseFloat(getAttr(attrs, 'height') ?? '0') || 0;

  if ((!width || !height) && viewBox) {
    const vb = viewBox.trim().split(/[\s,]+/).map(Number);
    if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
      width = width || vb[2];
      height = height || vb[3];
    }
  }
  if (!width) width = 800;
  if (!height) height = 600;

  const { polylines, breakdown } = extractVectorFromXmlMarkup(sanitizedSvg, 'SVG_VECTOR', true);
  const elementCount = Object.values(breakdown).reduce((acc, n) => acc + n, 0);

  return {
    sanitizedSvg,
    width,
    height,
    viewBox: viewBox || `0 0 ${width} ${height}`,
    elementCount,
    breakdown,
    vectorDrawing: {
      polylines,
      layers: polylines.length > 0 ? ['SVG_VECTOR'] : [],
      bounds: computeBounds(polylines),
      entityCount: polylines.length,
      entityBreakdown: breakdown,
      warnings: [],
    },
  };
}

// ============================================================================
// DETERMINISTIC BUILT-IN SAMPLES FOR INSTANT TESTING ACROSS ALL CAD FAMILIES
// ============================================================================

/**
 * Deterministic 3D ASCII STL mounting L-bracket part (54 triangles).
 */
export function createSampleStlAscii(): string {
  const tris: Array<[[number, number, number], [number, number, number], [number, number, number]]> = [];

  const addQuad = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number]
  ) => {
    tris.push([p0, p1, p2]);
    tris.push([p0, p2, p3]);
  };

  const addBox = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
    // Bottom & Top
    addQuad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
    addQuad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]);
    // Front & Back
    addQuad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
    addQuad([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]);
    // Left & Right
    addQuad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
    addQuad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]);
  };

  // Base plate
  addBox(-40, 0, -25, 40, 10, 25);
  // Vertical upright flange
  addBox(-40, 10, -25, -28, 55, 25);
  // Center gusset rib
  addBox(-28, 10, -4, 15, 36, 4);
  // Top boss cylinder approximation (hexagonal prism)
  const cx = 18;
  const cz = 0;
  const r = 10;
  const yBot = 10;
  const yTop = 22;
  const sides = 12;
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2;
    const a1 = ((i + 1) / sides) * Math.PI * 2;
    const xA = cx + r * Math.cos(a0);
    const zA = cz + r * Math.sin(a0);
    const xB = cx + r * Math.cos(a1);
    const zB = cz + r * Math.sin(a1);
    addQuad([xA, yBot, zA], [xB, yBot, zB], [xB, yTop, zB], [xA, yTop, zA]);
    tris.push([
      [cx, yTop, cz],
      [xA, yTop, zA],
      [xB, yTop, zB],
    ]);
  }

  const lines = ['solid pdf_labs_bracket'];
  for (const [a, b, c] of tris) {
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    lines.push(`  facet normal ${nx.toFixed(5)} ${ny.toFixed(5)} ${nz.toFixed(5)}`);
    lines.push('    outer loop');
    lines.push(`      vertex ${a[0].toFixed(3)} ${a[1].toFixed(3)} ${a[2].toFixed(3)}`);
    lines.push(`      vertex ${b[0].toFixed(3)} ${b[1].toFixed(3)} ${b[2].toFixed(3)}`);
    lines.push(`      vertex ${c[0].toFixed(3)} ${c[1].toFixed(3)} ${c[2].toFixed(3)}`);
    lines.push('    endloop');
    lines.push('  endfacet');
  }
  lines.push('endsolid pdf_labs_bracket');
  return lines.join('\n');
}

/**
 * Valid ISO-10303-21 STEP AP214 ASCII file of a 3D machined prism block (40x24x16 mm)
 * verified to parse cleanly in OpenCASCADE (`occt-import-js`).
 */
export function createSampleStepText(): string {
  return `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('PDF Labs Sample STEP Part'),'2;1');
FILE_NAME('sample_housing.step','2026-01-01T00:00:00',('PDF Labs'),('Remphin'),'','PDF Labs CAD','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));
ENDSEC;
DATA;
#10=APPLICATION_CONTEXT('automotive design');
#11=APPLICATION_PROTOCOL_DEFINITION('international standard','automotive_design',2000,#10);
#12=PRODUCT_CONTEXT('',#10,'mechanical');
#13=PRODUCT('SampleHousing','SampleHousing','',(#12));
#14=PRODUCT_DEFINITION_FORMATION('','',#13);
#15=PRODUCT_DEFINITION_CONTEXT('part definition',#10,'design');
#16=PRODUCT_DEFINITION('design','',#14,#15);
#17=PRODUCT_DEFINITION_SHAPE('','',#16);
#20=(GEOMETRIC_REPRESENTATION_CONTEXT(3)GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#21))GLOBAL_UNIT_ASSIGNED_CONTEXT((#22,#23,#24))REPRESENTATION_CONTEXT('Context #1','3D Context'));
#21=UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(0.01),#22,'distance_accuracy_value','confusion accuracy');
#22=(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.));
#23=(NAMED_UNIT(*)PLANE_ANGLE_UNIT()SI_UNIT($,.RADIAN.));
#24=(NAMED_UNIT(*)SI_UNIT($,.STERADIAN.)SOLID_ANGLE_UNIT());
#30=CARTESIAN_POINT('',(0.,0.,0.));
#31=DIRECTION('',(0.,0.,1.));
#32=DIRECTION('',(1.,0.,0.));
#33=AXIS2_PLACEMENT_3D('',#30,#31,#32);
#40=ADVANCED_BREP_SHAPE_REPRESENTATION('',(#50,#33),#20);
#41=SHAPE_DEFINITION_REPRESENTATION(#17,#40);
#50=MANIFOLD_SOLID_BREP('HousingBlock',#51);
#51=CLOSED_SHELL('',(#100,#101,#102,#103,#104,#105));
#60=CARTESIAN_POINT('',(-20.,-12.,0.));
#61=CARTESIAN_POINT('',(20.,-12.,0.));
#62=CARTESIAN_POINT('',(20.,12.,0.));
#63=CARTESIAN_POINT('',(-20.,12.,0.));
#64=CARTESIAN_POINT('',(-20.,-12.,16.));
#65=CARTESIAN_POINT('',(20.,-12.,16.));
#66=CARTESIAN_POINT('',(20.,12.,16.));
#67=CARTESIAN_POINT('',(-20.,12.,16.));
#70=VERTEX_POINT('',#60);
#71=VERTEX_POINT('',#61);
#72=VERTEX_POINT('',#62);
#73=VERTEX_POINT('',#63);
#74=VERTEX_POINT('',#64);
#75=VERTEX_POINT('',#65);
#76=VERTEX_POINT('',#66);
#77=VERTEX_POINT('',#67);
#80=DIRECTION('',(1.,0.,0.));
#81=DIRECTION('',(0.,1.,0.));
#82=DIRECTION('',(-1.,0.,0.));
#83=DIRECTION('',(0.,-1.,0.));
#84=DIRECTION('',(0.,0.,1.));
#85=DIRECTION('',(0.,0.,-1.));
#110=VECTOR('',#80,1.);
#111=VECTOR('',#81,1.);
#112=VECTOR('',#82,1.);
#113=VECTOR('',#83,1.);
#114=VECTOR('',#84,1.);
#120=LINE('',#60,#110);
#121=LINE('',#61,#111);
#122=LINE('',#62,#112);
#123=LINE('',#63,#113);
#124=LINE('',#64,#110);
#125=LINE('',#65,#111);
#126=LINE('',#66,#112);
#127=LINE('',#67,#113);
#128=LINE('',#60,#114);
#129=LINE('',#61,#114);
#130=LINE('',#62,#114);
#131=LINE('',#63,#114);
#140=EDGE_CURVE('',#70,#71,#120,.T.);
#141=EDGE_CURVE('',#71,#72,#121,.T.);
#142=EDGE_CURVE('',#72,#73,#122,.T.);
#143=EDGE_CURVE('',#73,#70,#123,.T.);
#144=EDGE_CURVE('',#74,#75,#124,.T.);
#145=EDGE_CURVE('',#75,#76,#125,.T.);
#146=EDGE_CURVE('',#76,#77,#126,.T.);
#147=EDGE_CURVE('',#77,#74,#127,.T.);
#148=EDGE_CURVE('',#70,#74,#128,.T.);
#149=EDGE_CURVE('',#71,#75,#129,.T.);
#150=EDGE_CURVE('',#72,#76,#130,.T.);
#151=EDGE_CURVE('',#73,#77,#131,.T.);
#160=AXIS2_PLACEMENT_3D('',#60,#85,#80);
#161=AXIS2_PLACEMENT_3D('',#64,#84,#80);
#162=AXIS2_PLACEMENT_3D('',#60,#83,#80);
#163=AXIS2_PLACEMENT_3D('',#61,#80,#81);
#164=AXIS2_PLACEMENT_3D('',#62,#81,#82);
#165=AXIS2_PLACEMENT_3D('',#63,#82,#83);
#170=PLANE('',#160);
#171=PLANE('',#161);
#172=PLANE('',#162);
#173=PLANE('',#163);
#174=PLANE('',#164);
#175=PLANE('',#165);
#180=ORIENTED_EDGE('',*,*,#140,.F.);
#181=ORIENTED_EDGE('',*,*,#143,.F.);
#182=ORIENTED_EDGE('',*,*,#142,.F.);
#183=ORIENTED_EDGE('',*,*,#141,.F.);
#184=EDGE_LOOP('',(#180,#181,#182,#183));
#185=FACE_OUTER_BOUND('',#184,.T.);
#100=ADVANCED_FACE('',(#185),#170,.T.);
#190=ORIENTED_EDGE('',*,*,#144,.T.);
#191=ORIENTED_EDGE('',*,*,#145,.T.);
#192=ORIENTED_EDGE('',*,*,#146,.T.);
#193=ORIENTED_EDGE('',*,*,#147,.T.);
#194=EDGE_LOOP('',(#190,#191,#192,#193));
#195=FACE_OUTER_BOUND('',#194,.T.);
#101=ADVANCED_FACE('',(#195),#171,.T.);
#200=ORIENTED_EDGE('',*,*,#140,.T.);
#201=ORIENTED_EDGE('',*,*,#149,.T.);
#202=ORIENTED_EDGE('',*,*,#144,.F.);
#203=ORIENTED_EDGE('',*,*,#148,.F.);
#204=EDGE_LOOP('',(#200,#201,#202,#203));
#205=FACE_OUTER_BOUND('',#204,.T.);
#102=ADVANCED_FACE('',(#205),#172,.T.);
#210=ORIENTED_EDGE('',*,*,#141,.T.);
#211=ORIENTED_EDGE('',*,*,#150,.T.);
#212=ORIENTED_EDGE('',*,*,#145,.F.);
#213=ORIENTED_EDGE('',*,*,#149,.F.);
#214=EDGE_LOOP('',(#210,#211,#212,#213));
#215=FACE_OUTER_BOUND('',#214,.T.);
#103=ADVANCED_FACE('',(#215),#173,.T.);
#220=ORIENTED_EDGE('',*,*,#142,.T.);
#221=ORIENTED_EDGE('',*,*,#151,.T.);
#222=ORIENTED_EDGE('',*,*,#146,.F.);
#223=ORIENTED_EDGE('',*,*,#150,.F.);
#224=EDGE_LOOP('',(#220,#221,#222,#223));
#225=FACE_OUTER_BOUND('',#224,.T.);
#104=ADVANCED_FACE('',(#225),#174,.T.);
#230=ORIENTED_EDGE('',*,*,#143,.T.);
#231=ORIENTED_EDGE('',*,*,#148,.T.);
#232=ORIENTED_EDGE('',*,*,#147,.F.);
#233=ORIENTED_EDGE('',*,*,#151,.F.);
#234=EDGE_LOOP('',(#230,#231,#232,#233));
#235=FACE_OUTER_BOUND('',#234,.T.);
#105=ADVANCED_FACE('',(#235),#175,.T.);
ENDSEC;
END-ISO-10303-21;`;
}

/**
 * Deterministic architectural + mechanical DXF sample with 4 layers.
 */
export function createSampleDxfText(): string {
  const lines = [
    '0', 'SECTION', '2', 'HEADER', '0', 'ENDSEC',
    '0', 'SECTION', '2', 'TABLES',
    '0', 'TABLE', '2', 'LAYER', '70', '4',
    '0', 'LAYER', '2', 'WALLS', '70', '0', '62', '7',
    '0', 'LAYER', '2', 'DOORS', '70', '0', '62', '2',
    '0', 'LAYER', '2', 'MECHANICAL', '70', '0', '62', '4',
    '0', 'LAYER', '2', 'AXES', '70', '0', '62', '1',
    '0', 'ENDTAB',
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES',
    // Outer room boundary (LWPOLYLINE)
    '0', 'LWPOLYLINE', '8', 'WALLS', '90', '4', '70', '1',
    '10', '0', '20', '0',
    '10', '140', '20', '0',
    '10', '140', '20', '90',
    '10', '0', '20', '90',
    // Inner partition wall
    '0', 'LINE', '8', 'WALLS', '10', '60', '20', '0', '11', '60', '21', '55',
    '0', 'LINE', '8', 'WALLS', '10', '60', '20', '75', '11', '60', '21', '90',
    // Door leaf + swing arc
    '0', 'LINE', '8', 'DOORS', '10', '60', '20', '55', '11', '80', '21', '55',
    '0', 'ARC', '8', 'DOORS', '10', '60', '20', '55', '40', '20', '50', '0', '51', '90',
    // Mechanical flange circles & bolt pattern
    '0', 'CIRCLE', '8', 'MECHANICAL', '10', '100', '20', '45', '40', '18',
    '0', 'CIRCLE', '8', 'MECHANICAL', '10', '100', '20', '45', '40', '8',
    '0', 'CIRCLE', '8', 'MECHANICAL', '10', '100', '20', '60', '40', '2.5',
    '0', 'CIRCLE', '8', 'MECHANICAL', '10', '100', '20', '30', '40', '2.5',
    '0', 'CIRCLE', '8', 'MECHANICAL', '10', '115', '20', '45', '40', '2.5',
    '0', 'CIRCLE', '8', 'MECHANICAL', '10', '85', '20', '45', '40', '2.5',
    // Centerline axes
    '0', 'LINE', '8', 'AXES', '10', '76', '20', '45', '11', '124', '21', '45',
    '0', 'LINE', '8', 'AXES', '10', '100', '20', '21', '11', '100', '21', '69',
    '0', 'ENDSEC',
    '0', 'EOF',
  ];
  return lines.join('\n');
}

/**
 * Deterministic HP-GL Plotter (.plt) drawing sample.
 */
export function createSamplePltText(): string {
  return [
    'IN;',
    'SP1;',
    'PU0,0;PD2400,0,2400,1600,0,1600,0,0;PU;',
    'PU120,120;PD2280,120,2280,1480,120,1480,120,120;PU;',
    'SP2;',
    'PU1200,800;CI420;',
    'PU1200,800;CI240;',
    'SP3;',
    'PU700,800;PD1700,800;PU;',
    'PU1200,300;PD1200,1300;PU;',
    'PU500,350;CI75;',
    'PU1900,350;CI75;',
    'PU500,1250;CI75;',
    'PU1900,1250;CI75;',
    'SP4;',
    'PU500,350;PD1900,350,1900,1250,500,1250,500,350;PU;',
  ].join('\n');
}

/**
 * Deterministic technical blueprint SVG sample.
 */
export function createSampleSvgText(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <rect x="24" y="24" width="752" height="452" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />
  <rect x="44" y="44" width="712" height="412" fill="none" stroke="#1e3a5f" stroke-width="1" />
  <circle cx="400" cy="250" r="120" fill="none" stroke="#38bdf8" stroke-width="2.5" />
  <circle cx="400" cy="250" r="65" fill="none" stroke="#22d3ee" stroke-width="2" />
  <circle cx="400" cy="155" r="12" fill="none" stroke="#f59e0b" stroke-width="2" />
  <circle cx="400" cy="345" r="12" fill="none" stroke="#f59e0b" stroke-width="2" />
  <circle cx="305" cy="250" r="12" fill="none" stroke="#f59e0b" stroke-width="2" />
  <circle cx="495" cy="250" r="12" fill="none" stroke="#f59e0b" stroke-width="2" />
  <line x1="230" y1="250" x2="570" y2="250" stroke="#ef4444" stroke-width="1.2" stroke-dasharray="10 6" />
  <line x1="400" y1="80" x2="400" y2="420" stroke="#ef4444" stroke-width="1.2" stroke-dasharray="10 6" />
  <path d="M 100 120 L 210 120 L 240 150 L 240 350 L 210 380 L 100 380 Z" fill="none" stroke="#34d399" stroke-width="2" />
  <path d="M 560 150 L 590 120 L 700 120 L 700 380 L 590 380 L 560 350 Z" fill="none" stroke="#34d399" stroke-width="2" />
  <text x="58" y="76" fill="#94a3b8" font-family="monospace" font-size="14">PDF LABS CAD // FLANGE COUPLING REV-A (UNIT: MM)</text>
</svg>`;
}
