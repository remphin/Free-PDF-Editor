import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {
  convertDwgDatabaseToVector,
  createSampleDxfText,
  createSamplePltText,
  createSampleStepText,
  createSampleStlAscii,
  createSampleSvgText,
  detectCadFormat,
  parseDwfArchive,
  parseDxfText,
  parseHpglPlotter,
  parseSvgDocument,
  parseSvgPathData,
} from './cadParsers.ts';

describe('detectCadFormat', () => {
  it('recognizes all 8 supported CAD & vector formats', () => {
    assert.equal(detectCadFormat('building.dwg'), 'dwg');
    assert.equal(detectCadFormat('PLAN.DXF'), 'dxf');
    assert.equal(detectCadFormat('sheet.dwf'), 'dwf');
    assert.equal(detectCadFormat('sheet.dwfx'), 'dwf');
    assert.equal(detectCadFormat('bracket.step'), 'step');
    assert.equal(detectCadFormat('bracket.STP'), 'step');
    assert.equal(detectCadFormat('manifold.iges'), 'iges');
    assert.equal(detectCadFormat('manifold.igs'), 'iges');
    assert.equal(detectCadFormat('gear.stl'), 'stl');
    assert.equal(detectCadFormat('plotter.plt'), 'plt');
    assert.equal(detectCadFormat('diagram.svg'), 'svg');
    assert.equal(detectCadFormat('notes.txt'), null);
  });
});

describe('parseHpglPlotter', () => {
  it('parses built-in sample PLT with pens, polylines, and circles', () => {
    const parsed = parseHpglPlotter(createSamplePltText());
    assert.ok(parsed.polylines.length >= 10);
    assert.deepEqual(parsed.layers.sort(), ['PEN_1', 'PEN_2', 'PEN_3', 'PEN_4']);
    assert.ok(parsed.bounds.width >= 2400);
    assert.ok(parsed.bounds.height >= 1600);
    assert.ok((parsed.entityBreakdown.CIRCLE ?? 0) >= 6);
  });

  it('supports relative movements PR and arc AA commands', () => {
    const plt = 'IN;SP1;PA100,100;PD;PR50,0,0,50;PU;PA100,0;AA0,0,90;';
    const parsed = parseHpglPlotter(plt);
    assert.equal(parsed.polylines.length, 2);
    assert.equal(parsed.entityBreakdown.ARC, 1);
  });
});

describe('parseDxfText', () => {
  it('parses sample DXF layers, polylines, circles, lines, and arcs', () => {
    const parsed = parseDxfText(createSampleDxfText());
    assert.ok(parsed.polylines.length >= 10);
    assert.ok(parsed.layers.includes('WALLS'));
    assert.ok(parsed.layers.includes('DOORS'));
    assert.ok(parsed.layers.includes('MECHANICAL'));
    assert.ok(parsed.layers.includes('AXES'));
    assert.equal(parsed.bounds.width, 140);
    assert.equal(parsed.bounds.height, 90);
    assert.equal(parsed.entityBreakdown.ARC, 1);
    assert.equal(parsed.entityBreakdown.CIRCLE, 6);
  });

  it('expands INSERT blocks with translation and rotation', () => {
    const dxfWithBlock = [
      '0', 'SECTION', '2', 'BLOCKS',
      '0', 'BLOCK', '2', 'BOX1', '10', '0', '20', '0', '30', '0',
      '0', 'LINE', '8', '0', '10', '0', '20', '0', '11', '10', '21', '0',
      '0', 'ENDBLK',
      '0', 'ENDSEC',
      '0', 'SECTION', '2', 'ENTITIES',
      '0', 'INSERT', '2', 'BOX1', '8', 'PARTS', '10', '100', '20', '50', '50', '90',
      '0', 'ENDSEC',
      '0', 'EOF',
    ].join('\n');
    const parsed = parseDxfText(dxfWithBlock);
    assert.equal(parsed.polylines.length, 1);
    const pts = parsed.polylines[0].points;
    assert.ok(Math.abs(pts[0].x - 100) < 1e-5);
    assert.ok(Math.abs(pts[0].y - 50) < 1e-5);
    assert.ok(Math.abs(pts[1].x - 100) < 1e-5);
    assert.ok(Math.abs(pts[1].y - 60) < 1e-5);
  });
});

describe('convertDwgDatabaseToVector', () => {
  it('converts LibreDWG database entities cleanly into polylines and layers', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockDb: any = {
      tables: {
        LAYER: { entries: [{ name: 'STRUCT', colorIndex: 4 }] },
        BLOCK_RECORD: { entries: [] },
      },
      entities: [
        {
          type: 'LINE',
          layer: 'STRUCT',
          startPoint: { x: 0, y: 0, z: 0 },
          endPoint: { x: 50, y: 25, z: 0 },
        },
        {
          type: 'CIRCLE',
          layer: 'STRUCT',
          center: { x: 25, y: 12.5, z: 0 },
          radius: 10,
        },
      ],
    };
    const res = convertDwgDatabaseToVector(mockDb);
    assert.equal(res.polylines.length, 2);
    assert.deepEqual(res.layers, ['STRUCT']);
    assert.equal(res.bounds.width, 50);
  });
});

describe('parseDwfArchive', () => {
  it('extracts XPS FixedPage vector paths from a .dwfx ZIP container', async () => {
    const zip = new JSZip();
    zip.file(
      'Documents/1/Pages/1.fpage',
      `<FixedPage Width="400" Height="300">
         <Path Data="M 10 10 L 200 10 L 200 150 Z" Stroke="#FF38BDF8" />
         <Path Data="M 50 50 L 150 50" Stroke="#FFF59E0B" />
       </FixedPage>`
    );
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const parsed = await parseDwfArchive(bytes);
    assert.equal(parsed.polylines.length, 2);
    assert.deepEqual(parsed.sheetNames, ['1.fpage']);
    assert.equal(parsed.bounds.width, 190);
  });
});

describe('parseSvgDocument & samples', () => {
  it('sanitizes SVG scripts and extracts vector paths and dimensions', () => {
    const raw = createSampleSvgText().replace('</svg>', '<script>alert(1)</script></svg>');
    const parsed = parseSvgDocument(raw);
    assert.equal(parsed.sanitizedSvg.includes('<script'), false);
    assert.equal(parsed.width, 800);
    assert.equal(parsed.height, 500);
    assert.ok(parsed.elementCount >= 10);
    assert.ok(parsed.vectorDrawing.polylines.length >= 10);
  });

  it('parses relative and cubic SVG path commands', () => {
    const strokes = parseSvgPathData('M 0 0 h 20 v 10 C 20 20 10 20 0 10 z', false);
    assert.equal(strokes.length, 1);
    assert.ok(strokes[0].length > 10);
  });

  it('generates valid sample STL ASCII and valid ISO STEP AP214', async () => {
    const stl = createSampleStlAscii();
    assert.ok(stl.startsWith('solid pdf_labs_bracket'));
    assert.ok(stl.includes('endsolid pdf_labs_bracket'));

    const stepText = createSampleStepText();
    const { default: occtimportjs } = await import('occt-import-js');
    const occt = await occtimportjs();
    const res = occt.ReadStepFile(new TextEncoder().encode(stepText), null);
    assert.equal(res.success, true);
    assert.ok(res.meshes.length >= 1);
    assert.ok(res.meshes[0].attributes.position.array.length > 0);
  });
});
