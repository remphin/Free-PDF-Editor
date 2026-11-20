import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { jsPDF } from 'jspdf';
import {
  type CadBounds3D,
  type CadFormat,
  type CadPolyline,
  type ParsedVectorDrawing,
  computeBounds,
  convertDwgDatabaseToVector,
  detectCadFormat,
  parseDwfArchive,
  parseDxfText,
  parseHpglPlotter,
  parseSvgDocument,
} from './cadParsers';

export interface CadModelStats {
  rawDimensions: { width: number; height: number; depth: number };
  meshCount: number;
  triangleCount: number;
  vertexCount: number;
  entityCount: number;
  layers: string[];
  entityBreakdown: Record<string, number>;
  warnings: string[];
  sheetNames?: string[];
}

export interface LoadedCadModel {
  format: CadFormat;
  filename: string;
  fileSize: number;
  is3D: boolean;
  group: THREE.Group;
  edgeOverlays: THREE.LineSegments[];
  meshes: THREE.Mesh[];
  svgMarkup?: string;
  stats: CadModelStats;
  dispose: () => void;
}

// Singleton lazy WASM loaders so 7MB binaries initialize once per session
let occtPromise: Promise<import('occt-import-js').OcctImportInstance> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let libreDwgPromise: Promise<any> | null = null;

async function getOcctInstance() {
  if (!occtPromise) {
    occtPromise = (async () => {
      const mod = await import('occt-import-js');
      // Handle both ESM default export and CJS module wrapper
      const initFn =
        typeof mod.default === 'function'
          ? mod.default
          : typeof (mod as unknown as { occtimportjs?: unknown }).occtimportjs === 'function'
            ? (mod as unknown as { occtimportjs: typeof mod.default }).occtimportjs
            : (mod as unknown as typeof mod.default);
      return initFn({
        locateFile: (file: string) => (file.endsWith('.wasm') ? '/wasm/occt-import-js.wasm' : file),
      });
    })().catch((err) => {
      occtPromise = null;
      throw err;
    });
  }
  return occtPromise;
}

async function getLibreDwgInstance() {
  if (!libreDwgPromise) {
    libreDwgPromise = (async () => {
      const { LibreDwg } = await import('@mlightcad/libredwg-web');
      return LibreDwg.create('/wasm');
    })().catch((err) => {
      libreDwgPromise = null;
      throw err;
    });
  }
  return libreDwgPromise;
}

function normalizeVectorGroup(
  drawing: ParsedVectorDrawing,
  targetExtent = 10
): { group: THREE.Group; bounds: CadBounds3D; is3D: boolean } {
  const group = new THREE.Group();
  const bounds = drawing.bounds;
  const maxDim = Math.max(bounds.width, bounds.height, bounds.depth, 1e-6);
  const scale = targetExtent / maxDim;

  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const is3D = bounds.depth > Math.max(bounds.width, bounds.height) * 0.01;

  // Group polylines by (layer + color) for optimal draw calls while keeping layer visibility toggles fast
  const buckets = new Map<string, { layer: string; color: string; segments: number[] }>();

  for (const poly of drawing.polylines) {
    if (poly.points.length < 2) continue;
    const key = `${poly.layer}:::${poly.color}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { layer: poly.layer, color: poly.color, segments: [] };
      buckets.set(key, bucket);
    }

    for (let i = 0; i < poly.points.length - 1; i++) {
      const a = poly.points[i];
      const b = poly.points[i + 1];
      if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(b.x) || !Number.isFinite(b.y)) {
        continue;
      }
      // Map CAD (X, Y, Z) -> Three.js (X, Z, -Y) so 2D plans sit on XZ floor and read upright from Top view
      const ax = (a.x - cx) * scale;
      const ay = ((a.z ?? 0) - cz) * scale;
      const az = -((a.y - cy) * scale);

      const bx = (b.x - cx) * scale;
      const by = ((b.z ?? 0) - cz) * scale;
      const bz = -((b.y - cy) * scale);

      bucket.segments.push(ax, ay, az, bx, by, bz);
    }
  }

  for (const bucket of buckets.values()) {
    if (bucket.segments.length === 0) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(bucket.segments, 3));
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(bucket.color),
      transparent: true,
      opacity: 0.95,
    });
    const lines = new THREE.LineSegments(geo, mat);
    lines.userData.cadLayer = bucket.layer;
    lines.userData.originalColor = bucket.color;
    group.add(lines);
  }

  // Lift bottom of drawing slightly above grid Y=0
  const box = new THREE.Box3().setFromObject(group);
  if (!box.isEmpty()) {
    group.position.y = -box.min.y + 0.02;
  }

  return { group, bounds, is3D };
}

function normalizeMeshGroup(
  meshes: Array<{ geometry: THREE.BufferGeometry; color: THREE.Color; name?: string }>,
  zUpToYUp: boolean,
  targetExtent = 8
): {
  group: THREE.Group;
  edgeOverlays: THREE.LineSegments[];
  meshObjects: THREE.Mesh[];
  rawBounds: { width: number; height: number; depth: number };
  triangleCount: number;
  vertexCount: number;
} {
  const group = new THREE.Group();
  const edgeOverlays: THREE.LineSegments[] = [];
  const meshObjects: THREE.Mesh[] = [];

  let totalVertices = 0;
  let totalTriangles = 0;

  const rawBox = new THREE.Box3();
  for (const item of meshes) {
    if (zUpToYUp) {
      item.geometry.rotateX(-Math.PI / 2);
    }
    item.geometry.computeBoundingBox();
    if (item.geometry.boundingBox) {
      rawBox.union(item.geometry.boundingBox);
    }
  }

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  rawBox.getSize(size);
  rawBox.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
  const scale = targetExtent / maxDim;

  for (let i = 0; i < meshes.length; i++) {
    const item = meshes[i];
    const geo = item.geometry;
    geo.translate(-center.x, -rawBox.min.y, -center.z);
    geo.scale(scale, scale, scale);
    if (!geo.attributes.normal) {
      geo.computeVertexNormals();
    }
    geo.computeBoundingSphere();

    const posAttr = geo.attributes.position;
    if (posAttr) {
      totalVertices += posAttr.count;
      totalTriangles += geo.index ? Math.floor(geo.index.count / 3) : Math.floor(posAttr.count / 3);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: item.color,
      metalness: 0.25,
      roughness: 0.42,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = item.name || `Part_${i + 1}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.cadLayer = mesh.name;
    group.add(mesh);
    meshObjects.push(mesh);

    // Subtle crisp B-Rep / edge crease lines
    if ((posAttr?.count ?? 0) < 150000) {
      const edgesGeo = new THREE.EdgesGeometry(geo, 28);
      const edgesMat = new THREE.LineBasicMaterial({
        color: 0x0f172a,
        transparent: true,
        opacity: 0.22,
      });
      const edges = new THREE.LineSegments(edgesGeo, edgesMat);
      edges.userData.cadLayer = mesh.name;
      mesh.add(edges);
      edgeOverlays.push(edges);
    }
  }

  return {
    group,
    edgeOverlays,
    meshObjects,
    rawBounds: {
      width: size.x,
      height: size.y,
      depth: size.z,
    },
    triangleCount: totalTriangles,
    vertexCount: totalVertices,
  };
}

function disposeGroup(group: THREE.Group) {
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).geometry) {
      (obj as THREE.Mesh).geometry.dispose();
    }
    const mat = (obj as THREE.Mesh).material;
    if (Array.isArray(mat)) {
      mat.forEach((m) => m.dispose());
    } else if (mat) {
      mat.dispose();
    }
  });
}

export async function loadCadFile(file: File): Promise<LoadedCadModel> {
  const format = detectCadFormat(file.name);
  if (!format) {
    throw new Error(`Unsupported CAD format: ${file.name}`);
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (format === 'stl') {
    const loader = new STLLoader();
    const geometry = loader.parse(buffer);
    const { group, edgeOverlays, meshObjects, rawBounds, triangleCount, vertexCount } =
      normalizeMeshGroup(
        [{ geometry, color: new THREE.Color('#60a5fa'), name: file.name.replace(/\.[^.]+$/, '') }],
        false
      );

    return {
      format,
      filename: file.name,
      fileSize: file.size,
      is3D: true,
      group,
      edgeOverlays,
      meshes: meshObjects,
      stats: {
        rawDimensions: rawBounds,
        meshCount: meshObjects.length,
        triangleCount,
        vertexCount,
        entityCount: triangleCount,
        layers: meshObjects.map((m) => m.name),
        entityBreakdown: { TRIANGLES: triangleCount },
        warnings: [],
      },
      dispose: () => disposeGroup(group),
    };
  }

  if (format === 'step' || format === 'iges') {
    const occt = await getOcctInstance();
    const res = format === 'step' ? occt.ReadStepFile(bytes, null) : occt.ReadIgesFile(bytes, null);
    if (!res || !res.success || !res.meshes || res.meshes.length === 0) {
      throw new Error(`Failed to tessellate ${format.toUpperCase()} geometry.`);
    }

    const builtMeshes: Array<{ geometry: THREE.BufferGeometry; color: THREE.Color; name?: string }> = [];
    for (let i = 0; i < res.meshes.length; i++) {
      const m = res.meshes[i];
      const posArr = m.attributes?.position?.array;
      if (!posArr || posArr.length === 0) continue;

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
      if (m.attributes?.normal?.array?.length) {
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(m.attributes.normal.array, 3));
      }
      if (m.index?.array?.length) {
        geo.setIndex(Array.from(m.index.array));
      }
      const c = m.color;
      const color =
        Array.isArray(c) && c.length >= 3
          ? new THREE.Color(c[0], c[1], c[2])
          : new THREE.Color(i % 2 === 0 ? '#64b5f6' : '#90a4ae');

      builtMeshes.push({
        geometry: geo,
        color,
        name: m.name || `Solid_${i + 1}`,
      });
    }

    if (builtMeshes.length === 0) {
      throw new Error(`No solid meshes found inside ${format.toUpperCase()} file.`);
    }

    const { group, edgeOverlays, meshObjects, rawBounds, triangleCount, vertexCount } =
      normalizeMeshGroup(builtMeshes, true);

    return {
      format,
      filename: file.name,
      fileSize: file.size,
      is3D: true,
      group,
      edgeOverlays,
      meshes: meshObjects,
      stats: {
        rawDimensions: rawBounds,
        meshCount: meshObjects.length,
        triangleCount,
        vertexCount,
        entityCount: meshObjects.length,
        layers: meshObjects.map((m) => m.name),
        entityBreakdown: { SOLIDS: meshObjects.length, TRIANGLES: triangleCount },
        warnings: [],
      },
      dispose: () => disposeGroup(group),
    };
  }

  if (format === 'dwg') {
    const { Dwg_File_Type } = await import('@mlightcad/libredwg-web');
    const dwg = await getLibreDwgInstance();
    const ptr = dwg.dwg_read_data(buffer, Dwg_File_Type.DWG);
    if (ptr == null) {
      throw new Error('Could not parse binary DWG file.');
    }
    let vectorDrawing: ParsedVectorDrawing;
    let svgFallback: string | undefined;
    try {
      const db = dwg.convert(ptr);
      vectorDrawing = convertDwgDatabaseToVector(db);
      if (vectorDrawing.polylines.length === 0 && typeof dwg.dwg_to_svg === 'function') {
        const rawSvg = dwg.dwg_to_svg(db);
        if (rawSvg && rawSvg.includes('<svg')) {
          const parsedSvg = parseSvgDocument(rawSvg);
          svgFallback = parsedSvg.sanitizedSvg;
          vectorDrawing = parsedSvg.vectorDrawing;
        }
      }
    } finally {
      dwg.dwg_free(ptr);
    }

    const { group, bounds, is3D } = normalizeVectorGroup(vectorDrawing);
    return {
      format,
      filename: file.name,
      fileSize: file.size,
      is3D,
      group,
      edgeOverlays: [],
      meshes: [],
      svgMarkup: vectorDrawing.polylines.length === 0 ? svgFallback : undefined,
      stats: {
        rawDimensions: { width: bounds.width, height: bounds.height, depth: bounds.depth },
        meshCount: 0,
        triangleCount: 0,
        vertexCount: 0,
        entityCount: vectorDrawing.entityCount,
        layers: vectorDrawing.layers,
        entityBreakdown: vectorDrawing.entityBreakdown,
        warnings: vectorDrawing.warnings,
      },
      dispose: () => disposeGroup(group),
    };
  }

  if (format === 'dxf') {
    const text = new TextDecoder('utf-8').decode(bytes);
    let vectorDrawing: ParsedVectorDrawing;
    try {
      vectorDrawing = parseDxfText(text);
    } catch {
      // Fallback to LibreDWG for binary DXF or unusual encodings
      const { Dwg_File_Type } = await import('@mlightcad/libredwg-web');
      const dwg = await getLibreDwgInstance();
      const ptr = dwg.dwg_read_data(buffer, Dwg_File_Type.DXF);
      if (ptr == null) {
        throw new Error('Could not parse DXF file.');
      }
      try {
        const db = dwg.convert(ptr);
        vectorDrawing = convertDwgDatabaseToVector(db);
      } finally {
        dwg.dwg_free(ptr);
      }
    }

    const { group, bounds, is3D } = normalizeVectorGroup(vectorDrawing);
    return {
      format,
      filename: file.name,
      fileSize: file.size,
      is3D,
      group,
      edgeOverlays: [],
      meshes: [],
      stats: {
        rawDimensions: { width: bounds.width, height: bounds.height, depth: bounds.depth },
        meshCount: 0,
        triangleCount: 0,
        vertexCount: 0,
        entityCount: vectorDrawing.entityCount,
        layers: vectorDrawing.layers,
        entityBreakdown: vectorDrawing.entityBreakdown,
        warnings: vectorDrawing.warnings,
      },
      dispose: () => disposeGroup(group),
    };
  }

  if (format === 'plt') {
    const text = new TextDecoder('latin1').decode(bytes);
    const vectorDrawing = parseHpglPlotter(text);
    const { group, bounds } = normalizeVectorGroup(vectorDrawing);
    return {
      format,
      filename: file.name,
      fileSize: file.size,
      is3D: false,
      group,
      edgeOverlays: [],
      meshes: [],
      stats: {
        rawDimensions: { width: bounds.width, height: bounds.height, depth: 0 },
        meshCount: 0,
        triangleCount: 0,
        vertexCount: 0,
        entityCount: vectorDrawing.entityCount,
        layers: vectorDrawing.layers,
        entityBreakdown: vectorDrawing.entityBreakdown,
        warnings: vectorDrawing.warnings,
      },
      dispose: () => disposeGroup(group),
    };
  }

  if (format === 'dwf') {
    const vectorDrawing = await parseDwfArchive(bytes);
    const { group, bounds } = normalizeVectorGroup(vectorDrawing);
    return {
      format,
      filename: file.name,
      fileSize: file.size,
      is3D: false,
      group,
      edgeOverlays: [],
      meshes: [],
      stats: {
        rawDimensions: { width: bounds.width, height: bounds.height, depth: 0 },
        meshCount: 0,
        triangleCount: 0,
        vertexCount: 0,
        entityCount: vectorDrawing.entityCount,
        layers: vectorDrawing.layers,
        entityBreakdown: vectorDrawing.entityBreakdown,
        warnings: vectorDrawing.warnings,
        sheetNames: vectorDrawing.sheetNames,
      },
      dispose: () => disposeGroup(group),
    };
  }

  // SVG
  const text = new TextDecoder('utf-8').decode(bytes);
  const parsedSvg = parseSvgDocument(text);
  const { group } = normalizeVectorGroup(parsedSvg.vectorDrawing);

  return {
    format: 'svg',
    filename: file.name,
    fileSize: file.size,
    is3D: false,
    group,
    edgeOverlays: [],
    meshes: [],
    svgMarkup: parsedSvg.sanitizedSvg,
    stats: {
      rawDimensions: { width: parsedSvg.width, height: parsedSvg.height, depth: 0 },
      meshCount: 0,
      triangleCount: 0,
      vertexCount: 0,
      entityCount: parsedSvg.elementCount,
      layers: parsedSvg.vectorDrawing.layers,
      entityBreakdown: parsedSvg.breakdown,
      warnings: [],
    },
    dispose: () => disposeGroup(group),
  };
}

export async function createSvgDataUrlPng(svgMarkup: string, width = 1600, height = 1000): Promise<string> {
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('SVG rasterization failed'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      const scale = Math.min(width / (img.width || width), height / (img.height || height));
      const dw = (img.width || width) * scale;
      const dh = (img.height || height) * scale;
      ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
    }
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function exportDataUrlToPdf(
  dataUrl: string,
  filename: string,
  title: string,
  metaLine: string
): Uint8Array {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 46, 'F');
  doc.setTextColor(248, 250, 252);
  doc.setFontSize(13);
  doc.text(`PDF Labs CAD // ${title}`, 24, 28);
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(metaLine, pageW - 24, 28, { align: 'right' });

  const margin = 20;
  const availW = pageW - margin * 2;
  const availH = pageH - 46 - margin * 2;
  doc.addImage(dataUrl, 'PNG', margin, 46 + margin, availW, availH, undefined, 'FAST');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(filename, margin, pageH - 8);

  return new Uint8Array(doc.output('arraybuffer'));
}
