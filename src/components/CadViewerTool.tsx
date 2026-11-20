import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  AlertTriangle,
  Box,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  FileDown,
  FolderOpen,
  Grid3x3,
  Layers,
  Moon,
  RotateCcw,
  Sun,
  Upload,
} from 'lucide-react';
import type { Language, Translations } from '../i18n/translations';
import {
  createSampleDxfText,
  createSamplePltText,
  createSampleStepText,
  createSampleStlAscii,
  createSampleSvgText,
  detectCadFormat,
} from '../utils/cadParsers';
import {
  createSvgDataUrlPng,
  exportDataUrlToPdf,
  loadCadFile,
  type LoadedCadModel,
} from '../utils/cadClient';
import { triggerBytesDownload } from '../utils/pdfClient';
import { formatFileSize } from '../utils/pdfCore';

interface CadViewerToolProps {
  lang: Language;
  t: Translations;
}

type CameraPreset = 'iso' | 'top' | 'front' | 'right';

const ACCEPTED_EXTENSIONS =
  '.dwg,.dxf,.dwf,.dwfx,.stp,.step,.igs,.iges,.stl,.plt,.hpgl,.hgl,.svg';

function detectSoftwareWebGL(canvas: HTMLCanvasElement): boolean {
  try {
    const gl =
      canvas.getContext('webgl2', { preserveDrawingBuffer: true }) ||
      canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      const rendererName = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererName);
    }
    return false;
  } catch {
    return true;
  }
}

function afterDraw(gl: WebGLRenderingContext | WebGL2RenderingContext | null, done: () => void) {
  if (!gl) {
    requestAnimationFrame(done);
    return;
  }
  const gl2 = gl as WebGL2RenderingContext;
  if (typeof gl2.fenceSync === 'function' && typeof gl2.clientWaitSync === 'function') {
    const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl2.flush();
    if (sync) {
      const poll = () => {
        const res = gl2.clientWaitSync(sync, 0, 0);
        if (res === gl2.TIMEOUT_EXPIRED) {
          requestAnimationFrame(poll);
        } else {
          gl2.deleteSync(sync);
          done();
        }
      };
      requestAnimationFrame(poll);
      return;
    }
  }
  requestAnimationFrame(done);
}

export function CadViewerTool({ lang, t }: CadViewerToolProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);

  const [model, setModel] = useState<LoadedCadModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Viewport visual states
  const [wireframe, setWireframe] = useState(false);
  const [showEdges, setShowEdges] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [darkCanvas, setDarkCanvas] = useState(true);
  const [dockVisible, setDockVisible] = useState(true);
  const [svgSheetMode, setSvgSheetMode] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());

  // Mutable Three.js refs kept isolated from React re-renders
  const sceneCtxRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    grid: THREE.GridHelper;
    modelRoot: THREE.Group;
    requestRender: () => void;
    renderNow: () => void;
    setPreset: (preset: CameraPreset) => void;
  } | null>(null);

  const modelRef = useRef<LoadedCadModel | null>(null);
  modelRef.current = model;

  const disposeActiveModel = useCallback((current: LoadedCadModel | null) => {
    if (!current) return;
    if (sceneCtxRef.current) {
      sceneCtxRef.current.modelRoot.clear();
    }
    current.dispose();
  }, []);

  const handleOpenFile = useCallback(
    async (file: File) => {
      const fmt = detectCadFormat(file.name);
      if (!fmt) {
        setError(t.cad.unsupportedError);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const loaded = await loadCadFile(file);
        setModel((prev) => {
          disposeActiveModel(prev);
          return loaded;
        });
        setVisibleLayers(new Set(loaded.stats.layers));
        setWireframe(false);
        setShowEdges(true);
        setSvgSheetMode(loaded.format === 'svg');
      } catch (err) {
        console.error('CAD load failed:', err);
        setError(err instanceof Error ? err.message : t.common.errorGeneric);
      } finally {
        setLoading(false);
      }
    },
    [disposeActiveModel, t.cad.unsupportedError, t.common.errorGeneric]
  );

  const loadSample = useCallback(
    (kind: 'stl' | 'step' | 'dxf' | 'plt' | 'svg') => {
      let file: File;
      if (kind === 'stl') {
        file = new File([createSampleStlAscii()], 'sample_bracket.stl', {
          type: 'model/stl',
        });
      } else if (kind === 'step') {
        file = new File([createSampleStepText()], 'sample_housing.step', {
          type: 'application/step',
        });
      } else if (kind === 'dxf') {
        file = new File([createSampleDxfText()], 'sample_floorplan.dxf', {
          type: 'application/dxf',
        });
      } else if (kind === 'plt') {
        file = new File([createSamplePltText()], 'sample_plotter.plt', {
          type: 'application/vnd.hp-hpgl',
        });
      } else {
        file = new File([createSampleSvgText()], 'sample_flange.svg', {
          type: 'image/svg+xml',
        });
      }
      void handleOpenFile(file);
    },
    [handleOpenFile]
  );

  // Initialize Three.js WebGL stage whenever WebGL viewport container is active
  useEffect(() => {
    if (!model || svgSheetMode) return;
    const container = mountRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(canvas);

    const isSoftwareGl = detectSoftwareWebGL(canvas);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a');

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);
    renderer.setSize(width, height, false);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.05, 500);
    camera.position.set(9, 7.5, 9);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.autoRotate = false;
    controls.minDistance = 0.6;
    controls.maxDistance = 80;
    controls.target.set(0, 1.2, 0);

    // Warm key + cool sky hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e8, 2.1);
    keyLight.position.set(10, 16, 12);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 50;
      keyLight.shadow.camera.left = -10;
      keyLight.shadow.camera.right = 10;
      keyLight.shadow.camera.top = 10;
      keyLight.shadow.camera.bottom = -10;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.7);
    rimLight.position.set(-10, 6, -12);
    scene.add(rimLight);

    const grid = new THREE.GridHelper(18, 18, 0x334155, 0x1e293b);
    scene.add(grid);

    const modelRoot = new THREE.Group();
    scene.add(modelRoot);

    let disposed = false;
    let frameInFlight = false;
    let dirty = true;

    const glCtx = renderer.getContext();

    const renderNow = () => {
      if (disposed) return;
      controls.update();
      renderer.render(scene, camera);
    };

    const pump = () => {
      if (disposed || frameInFlight || !dirty) return;
      dirty = false;
      frameInFlight = true;
      renderNow();
      const finish = () => {
        frameInFlight = false;
        if (dirty && !disposed) {
          pump();
        }
      };
      if (isSoftwareGl) {
        afterDraw(glCtx, finish);
      } else {
        requestAnimationFrame(finish);
      }
    };

    const requestRender = () => {
      if (disposed) return;
      dirty = true;
      pump();
    };

    const setPreset = (preset: CameraPreset) => {
      const box = new THREE.Box3().setFromObject(modelRoot);
      const center = new THREE.Vector3(0, 1, 0);
      let radius = 5.5;
      if (!box.isEmpty()) {
        box.getCenter(center);
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        radius = Math.max(sphere.radius, 1.5);
      }

      const dist = radius * 2.25;
      controls.target.copy(center);

      if (preset === 'top') {
        camera.position.set(center.x, center.y + dist * 1.15, center.z + 0.001);
      } else if (preset === 'front') {
        camera.position.set(center.x, center.y + radius * 0.12, center.z + dist);
      } else if (preset === 'right') {
        camera.position.set(center.x + dist, center.y + radius * 0.12, center.z);
      } else {
        camera.position.set(
          center.x + dist * 0.72,
          center.y + dist * 0.62,
          center.z + dist * 0.72
        );
      }
      camera.lookAt(center);
      controls.update();
      requestRender();
    };

    controls.addEventListener('change', requestRender);

    const resizeObserver = new ResizeObserver((entries) => {
      if (disposed) return;
      for (const entry of entries) {
        const w = Math.max(Math.floor(entry.contentRect.width), 100);
        const h = Math.max(Math.floor(entry.contentRect.height), 100);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        requestRender();
      }
    });
    resizeObserver.observe(container);

    sceneCtxRef.current = {
      renderer,
      scene,
      camera,
      controls,
      grid,
      modelRoot,
      requestRender,
      renderNow,
      setPreset,
    };

    // Re-attach currently loaded model if mounted after load
    if (modelRef.current) {
      modelRoot.add(modelRef.current.group);
      setPreset(modelRef.current.is3D ? 'iso' : 'top');
    } else {
      requestRender();
    }

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      envTarget.dispose();
      renderer.dispose();
      sceneCtxRef.current = null;
    };
  }, [model !== null, svgSheetMode]);

  // Sync loaded model into scene root
  useEffect(() => {
    const ctx = sceneCtxRef.current;
    if (!ctx || !model) return;
    ctx.modelRoot.clear();
    ctx.modelRoot.add(model.group);
    ctx.setPreset(model.is3D ? 'iso' : 'top');
  }, [model]);

  // Sync display flags (wireframe, edges, grid, background, layer visibility)
  useEffect(() => {
    const ctx = sceneCtxRef.current;
    if (!ctx) return;

    ctx.scene.background = new THREE.Color(darkCanvas ? '#0f172a' : '#f1f5f9');
    ctx.grid.visible = showGrid;

    if (model) {
      for (const mesh of model.meshes) {
        const mat = mesh.material;
        if (!Array.isArray(mat) && 'wireframe' in mat) {
          (mat as THREE.MeshStandardMaterial).wireframe = wireframe;
        }
      }
      for (const edge of model.edgeOverlays) {
        edge.visible = showEdges && !wireframe;
      }
      model.group.traverse((obj) => {
        const layer = obj.userData?.cadLayer as string | undefined;
        if (layer !== undefined) {
          obj.visible = visibleLayers.has(layer);
        }
      });
    }

    ctx.requestRender();
  }, [model, wireframe, showEdges, showGrid, darkCanvas, visibleLayers]);

  // Cleanup active model on unmount
  useEffect(() => {
    return () => {
      if (modelRef.current) {
        modelRef.current.dispose();
      }
    };
  }, []);

  const toggleLayer = (layerName: string) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerName)) {
        next.delete(layerName);
      } else {
        next.add(layerName);
      }
      return next;
    });
  };

  const handleExportPng = async () => {
    if (!model) return;
    const baseName = model.filename.replace(/\.[^.]+$/, '');
    if (svgSheetMode && model.svgMarkup) {
      const pngUrl = await createSvgDataUrlPng(model.svgMarkup);
      const res = await fetch(pngUrl);
      const buf = new Uint8Array(await res.arrayBuffer());
      triggerBytesDownload(buf, `${baseName}_cad.png`, 'image/png');
      return;
    }
    const ctx = sceneCtxRef.current;
    if (!ctx) return;
    ctx.renderNow();
    const dataUrl = ctx.renderer.domElement.toDataURL('image/png');
    const res = await fetch(dataUrl);
    const buf = new Uint8Array(await res.arrayBuffer());
    triggerBytesDownload(buf, `${baseName}_cad.png`, 'image/png');
  };

  const handleExportPdf = async () => {
    if (!model) return;
    const baseName = model.filename.replace(/\.[^.]+$/, '');
    let dataUrl: string;
    if (svgSheetMode && model.svgMarkup) {
      dataUrl = await createSvgDataUrlPng(model.svgMarkup);
    } else {
      const ctx = sceneCtxRef.current;
      if (!ctx) return;
      ctx.renderNow();
      dataUrl = ctx.renderer.domElement.toDataURL('image/png');
    }
    const dims = model.stats.rawDimensions;
    const metaLine = `${model.format.toUpperCase()} | ${dims.width.toFixed(1)} × ${dims.height.toFixed(1)} × ${dims.depth.toFixed(1)}`;
    const pdfBytes = exportDataUrlToPdf(dataUrl, model.filename, model.filename, metaLine);
    triggerBytesDownload(pdfBytes, `${baseName}_cad.pdf`);
  };

  const dims = model?.stats.rawDimensions;

  return (
    <div className="space-y-5">
      {/* Top Upload / Sample Bar */}
      <section
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleOpenFile(f);
        }}
        className={`rounded-2xl border-2 border-dashed transition-colors bg-white ${
          model ? 'px-4 py-3' : 'px-5 py-5'
        } ${
          isDragging
            ? 'border-blue-600 bg-blue-50/40'
            : 'border-slate-300 hover:border-blue-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleOpenFile(f);
            e.target.value = '';
          }}
          className="hidden"
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0">
              <Box className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-sm sm:text-base font-semibold text-slate-900">
                {t.cad.dropTitle}
              </h2>
              {!model && (
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{t.cad.dropHint}</p>
              )}
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                {t.cad.supportedFormats}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>{t.cad.selectFile}</span>
            </button>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 mr-1">{t.cad.samplesLabel}</span>
          <button
            type="button"
            onClick={() => loadSample('stl')}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            {t.cad.sampleStl}
          </button>
          <button
            type="button"
            onClick={() => loadSample('step')}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            {t.cad.sampleStep}
          </button>
          <button
            type="button"
            onClick={() => loadSample('dxf')}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            {t.cad.sampleDxf}
          </button>
          <button
            type="button"
            onClick={() => loadSample('plt')}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            {t.cad.samplePlt}
          </button>
          <button
            type="button"
            onClick={() => loadSample('svg')}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            {t.cad.sampleSvg}
          </button>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-center gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {t.cad.loadingWasm}
        </div>
      )}

      {model ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_310px] gap-5 items-start">
          {/* Interactive CAD Canvas Stage */}
          <div className="relative rounded-2xl border border-slate-200 bg-slate-900 overflow-hidden shadow-xs h-[460px] sm:h-[510px]">
            {/* Top-left compact filename bar (solid, no backdrop-blur) */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-medium text-slate-100 flex items-center gap-2">
                <span className="font-mono uppercase text-sky-400">
                  {model.format.toUpperCase()}
                </span>
                <span className="text-slate-600">|</span>
                <span className="truncate max-w-[200px] sm:max-w-[280px]">{model.filename}</span>
              </div>

              {model.svgMarkup && (
                <button
                  type="button"
                  onClick={() => setSvgSheetMode((v) => !v)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-sky-300 cursor-pointer transition-colors"
                >
                  {svgSheetMode ? t.cad.controls.cadVectorMode : t.cad.controls.svgSheetMode}
                </button>
              )}
            </div>

            {/* WebGL Stage OR Crisp SVG Sheet View */}
            {svgSheetMode && model.svgMarkup ? (
              <div
                key="svg-sheet"
                className={`w-full h-full flex items-center justify-center p-6 pb-20 overflow-auto ${
                  darkCanvas ? 'bg-slate-900' : 'bg-slate-100'
                }`}
              >
                <div
                  className="max-w-full max-h-full [&>svg]:max-w-full [&>svg]:max-h-[380px] [&>svg]:w-auto [&>svg]:h-auto rounded-lg shadow-md"
                  // Sanitized in parseSvgDocument (scripts, handlers, foreignObject removed)
                  dangerouslySetInnerHTML={{ __html: model.svgMarkup }}
                />
              </div>
            ) : (
              <div key="webgl-stage" ref={mountRef} className="w-full h-full" />
            )}

            {/* Collapsible Bottom Control Dock (NO backdrop-blur over WebGL) */}
            <div className="absolute bottom-4 inset-x-3 z-10 flex flex-col items-center pointer-events-none">
              {dockVisible && (
                <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 shadow-lg mb-2 max-w-full">
                  {!svgSheetMode && (
                    <>
                      <button
                        type="button"
                        onClick={() => sceneCtxRef.current?.setPreset('iso')}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                      >
                        {t.cad.views.iso}
                      </button>
                      <button
                        type="button"
                        onClick={() => sceneCtxRef.current?.setPreset('top')}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                      >
                        {t.cad.views.top}
                      </button>
                      <button
                        type="button"
                        onClick={() => sceneCtxRef.current?.setPreset('front')}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                      >
                        {t.cad.views.front}
                      </button>
                      <button
                        type="button"
                        onClick={() => sceneCtxRef.current?.setPreset('right')}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                      >
                        {t.cad.views.right}
                      </button>
                      <button
                        type="button"
                        onClick={() => sceneCtxRef.current?.setPreset(model.is3D ? 'iso' : 'top')}
                        title={t.cad.views.reset}
                        className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>

                      <span className="w-px h-4 bg-slate-700 mx-0.5" aria-hidden="true" />

                      {model.meshes.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setWireframe((v) => !v)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                              wireframe
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            {t.cad.controls.wireframe}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowEdges((v) => !v)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                              showEdges && !wireframe
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            {t.cad.controls.edges}
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowGrid((v) => !v)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                          showGrid
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        <Grid3x3 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t.cad.controls.grid}</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setDarkCanvas((v) => !v)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition-colors"
                  >
                    {darkCanvas ? (
                      <Sun className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 text-sky-300" aria-hidden="true" />
                    )}
                    <span>{darkCanvas ? t.cad.controls.lightBg : t.cad.controls.darkBg}</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setDockVisible((v) => !v)}
                className="pointer-events-auto inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-medium text-slate-300 cursor-pointer"
              >
                {dockVisible ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.cad.controls.hideControls}</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.cad.controls.showControls}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right CAD Telemetry, Layers & Export Panel */}
          <aside className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <span className="font-display text-sm font-semibold text-slate-900">
                  {model.filename}
                </span>
                <span className="font-mono text-xs font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {model.format}
                </span>
              </div>

              <dl className="space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">{t.common.totalSize}</dt>
                  <dd className="font-mono font-medium text-slate-900">
                    {formatFileSize(model.fileSize)}
                  </dd>
                </div>
                {dims && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{t.cad.stats.dimensions}</dt>
                    <dd className="font-mono font-medium text-slate-900 text-right">
                      {dims.width.toFixed(1)} × {dims.height.toFixed(1)} × {dims.depth.toFixed(1)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">{t.cad.stats.entities}</dt>
                  <dd className="font-mono font-medium text-slate-900">
                    {model.stats.entityCount.toLocaleString()}
                  </dd>
                </div>
                {model.stats.triangleCount > 0 && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{t.cad.stats.triangles}</dt>
                    <dd className="font-mono font-medium text-slate-900">
                      {model.stats.triangleCount.toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>

              {model.stats.warnings.length > 0 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 space-y-1">
                  {model.stats.warnings.map((w, idx) => (
                    <p key={idx}>{w}</p>
                  ))}
                </div>
              )}

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => void handleExportPng()}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>{t.cad.stats.exportPng}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleExportPdf()}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                >
                  <FileDown className="w-4 h-4" aria-hidden="true" />
                  <span>{t.cad.stats.exportPdf}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.cad.stats.replaceFile}</span>
                </button>
              </div>
            </div>

            {/* Layers / Solid Parts Visibility List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-slate-900 font-display text-sm font-semibold">
                  <Layers className="w-4 h-4 text-blue-700" aria-hidden="true" />
                  <span>{t.cad.stats.layersTitle}</span>
                </div>
                {model.stats.layers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setVisibleLayers(new Set(model.stats.layers))}
                    className="text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer"
                  >
                    {t.cad.stats.allLayersOn}
                  </button>
                )}
              </div>

              {model.stats.layers.length === 0 ? (
                <p className="text-xs text-slate-500">{t.cad.stats.noLayers}</p>
              ) : (
                <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {model.stats.layers.map((layer) => {
                    const active = visibleLayers.has(layer);
                    return (
                      <li key={layer}>
                        <button
                          type="button"
                          onClick={() => toggleLayer(layer)}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            active
                              ? 'bg-slate-50 text-slate-800 hover:bg-slate-100'
                              : 'bg-slate-50/40 text-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate font-mono">{layer}</span>
                          {active ? (
                            <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Box className="w-6 h-6" aria-hidden="true" />
          </div>
          <h3 className="font-display text-base font-semibold text-slate-900">
            {lang === 'tr' ? 'Henüz CAD dosyası yüklenmedi' : 'No CAD file loaded yet'}
          </h3>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            {lang === 'tr'
              ? 'Yukarıdan kendi DWG, DXF, DWF, STEP, IGES, STL, PLT veya SVG dosyanızı seçin ya da tek tıkla örnek çizimlerden birini açın.'
              : 'Drop any DWG, DXF, DWF, STEP, IGES, STL, PLT, or SVG file above or open one of the built-in engineering samples in one click.'}
          </p>
        </div>
      )}
    </div>
  );
}
