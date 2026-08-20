import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { TPointerEvent, TPointerEventInfo } from 'fabric';
import { Canvas, Circle, FabricImage, FabricText, Group, IText, Polyline, Rect } from 'fabric';
import type { FabricObject } from 'fabric';
import {
  Droplets,
  MapPin,
  MousePointer2,
  Redo2,
  Save,
  Square,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import { useSpaces } from '../../hooks/useSpaces';
import {
  GROUND_COVER_META,
  GROUND_COVER_OPTIONS,
  WATER_NEED_META,
  WATER_NEED_OPTIONS,
  isOutdoorSpaceType,
} from '../../lib/spaceMeta';
import { getTemplate, svgToDataUri } from '../../lib/spaceTemplates';
import type { TemplateId } from '../../lib/spaceTemplates';
import PlantPinPopup from './PlantPinPopup';
import PinInfoCard from './PinInfoCard';
import type { GardenSpace, GroundCoverType, Plant, WaterNeedLevel } from '../../types';

type ToolMode = 'select' | 'pin' | 'zone' | 'text' | 'irrigation';

type ObjectData =
  | { kind: 'plant-pin'; plantId: string; plantName: string }
  | { kind: 'zone'; groundCover: GroundCoverType }
  | { kind: 'text-label' }
  | { kind: 'sprinkler'; waterNeed: WaterNeedLevel }
  | { kind: 'drip-line'; waterNeed: WaterNeedLevel };

interface CanvasBackground {
  type: 'template' | 'photo' | 'blank';
  templateId?: TemplateId;
  url?: string;
}

interface CanvasData {
  version: 1;
  background: CanvasBackground;
  irrigationVisible: boolean;
  fabric: Record<string, unknown> | null;
}

const DRAG_THRESHOLD = 8;
const SAVE_DEBOUNCE_MS = 2000;

function getObjectData(obj: FabricObject): ObjectData | undefined {
  return obj.get('data') as ObjectData | undefined;
}

function createPinObject(x: number, y: number): Group {
  const circle = new Circle({
    radius: 18,
    fill: '#16a34a',
    stroke: '#ffffff',
    strokeWidth: 2,
    originX: 'center',
    originY: 'center',
  });
  const emoji = new FabricText('🌿', {
    fontSize: 18,
    originX: 'center',
    originY: 'center',
  });
  const group = new Group([circle, emoji], {
    left: x,
    top: y,
    originX: 'center',
    originY: 'center',
    selectable: false,
    hasControls: false,
    hasBorders: false,
  });
  group.set('data', { kind: 'plant-pin', plantId: '', plantName: '' } satisfies ObjectData);
  return group;
}

function createSprinklerObject(x: number, y: number, level: WaterNeedLevel): Group {
  const circle = new Circle({
    radius: 11,
    fill: WATER_NEED_META[level].color,
    stroke: '#ffffff',
    strokeWidth: 2,
    originX: 'center',
    originY: 'center',
  });
  const emoji = new FabricText('💧', {
    fontSize: 12,
    originX: 'center',
    originY: 'center',
    fill: '#ffffff',
  });
  const group = new Group([circle, emoji], {
    left: x,
    top: y,
    originX: 'center',
    originY: 'center',
    hasControls: false,
  });
  group.set('data', { kind: 'sprinkler', waterNeed: level } satisfies ObjectData);
  return group;
}

async function applyBackground(
  canvas: Canvas,
  background: CanvasBackground,
  width: number,
  height: number,
) {
  let url: string | null = null;
  if (background.type === 'template' && background.templateId) {
    const template = getTemplate(background.templateId);
    if (template) url = svgToDataUri(template.svg);
  } else if (background.type === 'photo' && background.url) {
    url = background.url;
  }
  if (!url) return;

  const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
  img.set({
    left: 0,
    top: 0,
    originX: 'left',
    originY: 'top',
    scaleX: width / (img.width || width),
    scaleY: height / (img.height || height),
    selectable: false,
    evented: false,
  });
  canvas.backgroundImage = img;
  canvas.requestRenderAll();
}

function applyIrrigationVisibility(canvas: Canvas, visible: boolean) {
  canvas.getObjects().forEach((obj) => {
    const data = getObjectData(obj);
    if (data?.kind === 'sprinkler' || data?.kind === 'drip-line') {
      obj.set('visible', visible);
    }
  });
  canvas.requestRenderAll();
}

interface GardenCanvasProps {
  space: GardenSpace;
}

function GardenCanvas({ space }: GardenCanvasProps) {
  const { updateSpace } = useSpaces();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);

  const [tool, setTool] = useState<ToolMode>('select');
  const [groundCover, setGroundCover] = useState<GroundCoverType>('grass');
  const [waterNeed, setWaterNeed] = useState<WaterNeedLevel>('medium');
  const [irrigationVisible, setIrrigationVisible] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [isPinPopupOpen, setIsPinPopupOpen] = useState(false);
  const [activePinInfo, setActivePinInfo] = useState<{ plantId: string; plantName: string } | null>(
    null,
  );
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const toolRef = useRef(tool);
  const groundCoverRef = useRef(groundCover);
  const waterNeedRef = useRef(waterNeed);
  const pendingPinRef = useRef<Group | null>(null);
  const drawingRef = useRef<{ startX: number; startY: number; obj: FabricObject | null } | null>(
    null,
  );
  const historyRef = useRef<{ stack: string[]; index: number; suppress: boolean }>({
    stack: [],
    index: -1,
    suppress: true,
  });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundRef = useRef<CanvasBackground>({ type: 'blank' });

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    groundCoverRef.current = groundCover;
  }, [groundCover]);
  useEffect(() => {
    waterNeedRef.current = waterNeed;
  }, [waterNeed]);

  function pushHistory(canvas: Canvas) {
    const history = historyRef.current;
    if (history.suppress) return;
    const json = JSON.stringify(canvas.toObject(['data']));
    history.stack = history.stack.slice(0, history.index + 1);
    history.stack.push(json);
    history.index = history.stack.length - 1;
    setCanUndo(history.index > 0);
    setCanRedo(false);
  }

  function performSave(canvas: Canvas) {
    setSaveStatus('saving');
    const data: CanvasData = {
      version: 1,
      background: backgroundRef.current,
      irrigationVisible,
      fabric: canvas.toObject(['data']),
    };
    updateSpace(space.id, { canvas_json: data as unknown as Record<string, unknown> }).then(
      (result) => {
        setSaveStatus(result ? 'saved' : 'error');
      },
    );
  }

  function scheduleSave(canvas: Canvas) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => performSave(canvas), SAVE_DEBOUNCE_MS);
  }

  function handleChanged(canvas: Canvas) {
    if (historyRef.current.suppress) return;
    pushHistory(canvas);
    scheduleSave(canvas);
  }

  function handleManualSave() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    performSave(canvas);
  }

  function handleUndo() {
    const canvas = fabricCanvasRef.current;
    const history = historyRef.current;
    if (!canvas || history.index <= 0) return;
    history.index -= 1;
    history.suppress = true;
    canvas.loadFromJSON(JSON.parse(history.stack[history.index])).then(() => {
      canvas.requestRenderAll();
      applyIrrigationVisibility(canvas, irrigationVisible);
      history.suppress = false;
      setCanUndo(history.index > 0);
      setCanRedo(history.index < history.stack.length - 1);
      scheduleSave(canvas);
    });
  }

  function handleRedo() {
    const canvas = fabricCanvasRef.current;
    const history = historyRef.current;
    if (!canvas || history.index >= history.stack.length - 1) return;
    history.index += 1;
    history.suppress = true;
    canvas.loadFromJSON(JSON.parse(history.stack[history.index])).then(() => {
      canvas.requestRenderAll();
      applyIrrigationVisibility(canvas, irrigationVisible);
      history.suppress = false;
      setCanUndo(history.index > 0);
      setCanRedo(history.index < history.stack.length - 1);
      scheduleSave(canvas);
    });
  }

  function handleDeleteSelection() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }

  function handleSelectPlant(plant: Plant) {
    const canvas = fabricCanvasRef.current;
    const pin = pendingPinRef.current;
    if (canvas && pin) {
      pin.set('data', {
        kind: 'plant-pin',
        plantId: plant.id,
        plantName: plant.nickname || plant.common_name,
      } satisfies ObjectData);
      canvas.requestRenderAll();
      handleChanged(canvas);
    }
    pendingPinRef.current = null;
    setIsPinPopupOpen(false);
  }

  function handleClosePinPopup() {
    const canvas = fabricCanvasRef.current;
    const pin = pendingPinRef.current;
    if (canvas && pin) {
      canvas.remove(pin);
      canvas.requestRenderAll();
    }
    pendingPinRef.current = null;
    setIsPinPopupOpen(false);
  }

  // Initialise / tear down the Fabric canvas whenever the selected space changes.
  useEffect(() => {
    const canvasEl = canvasElRef.current;
    const container = containerRef.current;
    if (!canvasEl || !container) return;

    const width = container.clientWidth;
    const height = Math.round(width * 0.75);

    const canvas = new Canvas(canvasEl, {
      width,
      height,
      backgroundColor: '#f5f5f5',
      selection: true,
    });
    fabricCanvasRef.current = canvas;
    historyRef.current = { stack: [], index: -1, suppress: true };
    setCanUndo(false);
    setCanRedo(false);
    setHasSelection(false);
    setTool('select');

    const existingData = space.canvas_json as CanvasData | null;
    backgroundRef.current = existingData?.background ?? { type: 'blank' };
    const startIrrigationVisible = existingData?.irrigationVisible ?? false;
    setIrrigationVisible(startIrrigationVisible);

    async function init() {
      if (existingData?.fabric) {
        await canvas.loadFromJSON(existingData.fabric);
        canvas.requestRenderAll();
      } else if (existingData?.background) {
        await applyBackground(canvas, existingData.background, width, height);
      }
      applyIrrigationVisibility(canvas, startIrrigationVisible);
      historyRef.current.suppress = false;
      pushHistory(canvas);
    }

    function onMouseDown(opt: TPointerEventInfo<TPointerEvent>) {
      const target = opt.target;
      const targetData = target ? getObjectData(target) : undefined;

      if (targetData?.kind === 'plant-pin') {
        if (targetData.plantId) {
          setActivePinInfo({ plantId: targetData.plantId, plantName: targetData.plantName });
        }
        return;
      }

      const currentTool = toolRef.current;
      if (currentTool === 'select') return;

      const point = opt.scenePoint;

      if (currentTool === 'pin') {
        const pin = createPinObject(point.x, point.y);
        canvas.add(pin);
        canvas.requestRenderAll();
        pendingPinRef.current = pin;
        setIsPinPopupOpen(true);
        return;
      }

      if (currentTool === 'text') {
        const text = new IText('Label', {
          left: point.x,
          top: point.y,
          fontSize: 20,
          fill: '#111827',
        });
        text.set('data', { kind: 'text-label' } satisfies ObjectData);
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        canvas.requestRenderAll();
        return;
      }

      if (currentTool === 'zone' || currentTool === 'irrigation') {
        drawingRef.current = { startX: point.x, startY: point.y, obj: null };
      }
    }

    function onMouseMove(opt: TPointerEventInfo<TPointerEvent>) {
      const drawing = drawingRef.current;
      if (!drawing) return;
      const currentTool = toolRef.current;
      const point = opt.scenePoint;

      if (currentTool === 'zone') {
        if (!drawing.obj) {
          const rect = new Rect({
            left: drawing.startX,
            top: drawing.startY,
            width: 1,
            height: 1,
            fill: GROUND_COVER_META[groundCoverRef.current].color,
            opacity: 0.55,
            stroke: GROUND_COVER_META[groundCoverRef.current].color,
            strokeWidth: 2,
            selectable: false,
            evented: false,
          });
          rect.set('data', { kind: 'zone', groundCover: groundCoverRef.current } satisfies ObjectData);
          canvas.add(rect);
          drawing.obj = rect;
        }
        drawing.obj.set({
          left: Math.min(point.x, drawing.startX),
          top: Math.min(point.y, drawing.startY),
          width: Math.abs(point.x - drawing.startX),
          height: Math.abs(point.y - drawing.startY),
        });
        canvas.requestRenderAll();
      }

      if (currentTool === 'irrigation') {
        const dist = Math.hypot(point.x - drawing.startX, point.y - drawing.startY);
        if (dist < DRAG_THRESHOLD) return;
        if (drawing.obj) canvas.remove(drawing.obj);
        const line = new Polyline(
          [
            { x: drawing.startX, y: drawing.startY },
            { x: point.x, y: point.y },
          ],
          {
            stroke: WATER_NEED_META[waterNeedRef.current].color,
            strokeWidth: 4,
            fill: '',
            selectable: false,
            evented: false,
          },
        );
        line.set('data', { kind: 'drip-line', waterNeed: waterNeedRef.current } satisfies ObjectData);
        canvas.add(line);
        drawing.obj = line;
        canvas.requestRenderAll();
      }
    }

    function onMouseUp(opt: TPointerEventInfo<TPointerEvent>) {
      const drawing = drawingRef.current;
      if (!drawing) return;
      const currentTool = toolRef.current;

      if (currentTool === 'zone' && drawing.obj) {
        drawing.obj.set({ selectable: true, evented: true });
        canvas.requestRenderAll();
        handleChanged(canvas);
      }

      if (currentTool === 'irrigation') {
        const point = opt.scenePoint;
        const dist = Math.hypot(point.x - drawing.startX, point.y - drawing.startY);
        if (dist < DRAG_THRESHOLD) {
          const sprinkler = createSprinklerObject(drawing.startX, drawing.startY, waterNeedRef.current);
          canvas.add(sprinkler);
        } else if (drawing.obj) {
          drawing.obj.set({ selectable: true, evented: true });
        }
        canvas.requestRenderAll();
        handleChanged(canvas);
      }

      drawingRef.current = null;
    }

    function onObjectAdded(opt: { target: FabricObject }) {
      // Zone/drip-line drawing adds (and, for drip-lines, repeatedly
      // re-adds) an object mid-drag; that's finalised with one explicit
      // handleChanged() call in onMouseUp, so intermediate adds/removes
      // during an active drag must not each become their own history step.
      if (drawingRef.current) return;
      if (getObjectData(opt.target)?.kind === 'plant-pin') return; // pins are saved once a plant is assigned
      handleChanged(canvas);
    }
    function onObjectRemoved() {
      if (drawingRef.current) return;
      handleChanged(canvas);
    }
    function onObjectModified() {
      handleChanged(canvas);
    }
    function onSelectionCreated() {
      setHasSelection(true);
    }
    function onSelectionUpdated() {
      setHasSelection(true);
    }
    function onSelectionCleared() {
      setHasSelection(false);
    }

    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);
    canvas.on('object:added', onObjectAdded);
    canvas.on('object:removed', onObjectRemoved);
    canvas.on('object:modified', onObjectModified);
    canvas.on('selection:created', onSelectionCreated);
    canvas.on('selection:updated', onSelectionUpdated);
    canvas.on('selection:cleared', onSelectionCleared);

    init();

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
    // Intentionally keyed only on space.id, not exhaustive:
    // - tool/groundCover/waterNeed are read via refs, so listeners don't
    //   need to be re-registered on every state change.
    // - space.canvas_json is deliberately read only at setup time; it's
    //   rewritten by our own autosave, so depending on it would re-init
    //   (and wipe undo history) after every save.
    // - handleChanged is a plain function recreated each render; depending
    //   on it would defeat the point of this running once per space.
  }, [space.id]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.selection = tool === 'select';
    canvas.defaultCursor = tool === 'select' ? 'default' : 'crosshair';
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, [tool]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    applyIrrigationVisibility(canvas, irrigationVisible);
  }, [irrigationVisible]);

  function toggleIrrigation() {
    setIrrigationVisible((prev) => {
      const next = !prev;
      setTool(next ? 'irrigation' : 'select');
      return next;
    });
  }

  const outdoor = isOutdoorSpaceType(space.type);

  return (
    <div className="px-4 pb-4">
      <div className="mb-2 flex items-center gap-1 overflow-x-auto pb-1">
        <ToolButton
          active={tool === 'select'}
          onClick={() => setTool('select')}
          label="Select"
          icon={<MousePointer2 className="h-4 w-4" />}
        />
        <ToolButton
          active={tool === 'pin'}
          onClick={() => setTool('pin')}
          label="Plant Pin"
          icon={<MapPin className="h-4 w-4" />}
        />
        <ToolButton
          active={tool === 'zone'}
          onClick={() => setTool('zone')}
          label="Zone"
          icon={<Square className="h-4 w-4" />}
        />
        <ToolButton
          active={tool === 'text'}
          onClick={() => setTool('text')}
          label="Text"
          icon={<Type className="h-4 w-4" />}
        />
        {outdoor && (
          <ToolButton
            active={irrigationVisible}
            onClick={toggleIrrigation}
            label="Irrigation"
            icon={<Droplets className="h-4 w-4" />}
          />
        )}
        {hasSelection && (
          <ToolButton
            active={false}
            onClick={handleDeleteSelection}
            label="Delete"
            icon={<Trash2 className="h-4 w-4" />}
            danger
          />
        )}
        <div className="ml-auto flex items-center gap-1">
          <ToolButton
            active={false}
            disabled={!canUndo}
            onClick={handleUndo}
            label="Undo"
            icon={<Undo2 className="h-4 w-4" />}
          />
          <ToolButton
            active={false}
            disabled={!canRedo}
            onClick={handleRedo}
            label="Redo"
            icon={<Redo2 className="h-4 w-4" />}
          />
          <ToolButton
            active={false}
            onClick={handleManualSave}
            label={saveStatus === 'saving' ? 'Saving…' : 'Save'}
            icon={<Save className="h-4 w-4" />}
          />
        </div>
      </div>

      {tool === 'zone' && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {GROUND_COVER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setGroundCover(option.value)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                groundCover === option.value
                  ? 'border-neutral-900 dark:border-white'
                  : 'border-neutral-200 dark:border-neutral-800'
              }`}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: option.color }}
              />
              {option.label}
            </button>
          ))}
        </div>
      )}

      {tool === 'irrigation' && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {WATER_NEED_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setWaterNeed(option.value)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                waterNeed === option.value
                  ? 'border-neutral-900 dark:border-white'
                  : 'border-neutral-200 dark:border-neutral-800'
              }`}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: option.color }}
              />
              {option.label} water need
            </button>
          ))}
        </div>
      )}

      <div ref={containerRef} className="relative w-full overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] dark:border-neutral-800 dark:bg-neutral-900">
        <canvas ref={canvasElRef} />
        {irrigationVisible && (
          <div className="pointer-events-none absolute inset-0 bg-blue-500/10" />
        )}
      </div>

      <p className="mt-2 text-center text-xs text-neutral-400">
        {saveStatus === 'saving'
          ? 'Saving…'
          : saveStatus === 'saved'
            ? 'All changes saved'
            : saveStatus === 'error'
              ? 'Could not save changes'
              : ' '}
      </p>

      <PlantPinPopup
        open={isPinPopupOpen}
        onClose={handleClosePinPopup}
        onSelectPlant={handleSelectPlant}
      />

      {activePinInfo && (
        <PinInfoCard
          plantId={activePinInfo.plantId}
          plantName={activePinInfo.plantName}
          onClose={() => setActivePinInfo(null)}
        />
      )}
    </div>
  );
}

function ToolButton({
  active,
  disabled,
  danger,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium disabled:opacity-40 ${
        active
          ? 'border-green-600 bg-green-600 text-white'
          : danger
            ? 'border-red-200 text-red-600 dark:border-red-900'
            : 'border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default GardenCanvas;
