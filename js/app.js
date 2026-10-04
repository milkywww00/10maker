import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  DEFAULT_STATE,
  EAR_TYPES,
  TAIL_TYPES,
  WING_TYPES,
  EYE_TYPES,
  EYE_HIGHLIGHT_TYPES,
  EYELASH_TYPES,
  MOUTH_TYPES,
  EYEBROW_TYPES,
  FACE_DECO_TYPES,
  BLUSH_TYPES,
  PATTERN_TYPES,
  RIBBON_TYPES,
  EXTRA_ACC_TYPES,
  DANCE_MODES,
  COLOR_PALETTES,
} from './config.js?v=74';
import { TextureGenerator } from './textureGenerator.js?v=74';
import { CharacterBuilder } from './characterBuilder.js?v=74';
import { CharacterAnimator } from './animator.js?v=74';
import {
  exportMmdZip,
  exportGlbFile,
  exportCharacterJson,
  importCharacterFile,
  encodeGif89a,
  triggerDownload,
  shareFile,
} from './exporter.js?v=74';
import {
  initI18n,
  setLanguage,
  getLanguage,
  t,
  getPartName,
  onLanguageChange,
} from './i18n.js?v=74';

// 불러온 캐릭터 상태 객체 정규화 및 기본값 보완
function sanitizeCharacterState(raw) {
  const clean = structuredClone(DEFAULT_STATE);
  if (!raw || typeof raw !== 'object') return clean;

  for (const key of Object.keys(clean)) {
    if (raw[key] !== undefined) {
      clean[key] = structuredClone(raw[key]);
    }
  }
  clean.characterName = typeof raw.characterName === 'string' ? raw.characterName : '';
  clean.wingType = typeof raw.wingType === 'string' ? raw.wingType : 'none';
  clean.eyeHighlight = raw.eyeHighlight !== undefined ? Boolean(raw.eyeHighlight) : true;
  clean.eyeHighlightType = typeof raw.eyeHighlightType === 'string' ? raw.eyeHighlightType : 'double';
  clean.eyeHighlightSize = typeof raw.eyeHighlightSize === 'number' ? raw.eyeHighlightSize : 1.0;
  clean.eyebrowType = typeof raw.eyebrowType === 'string'
    ? raw.eyebrowType
    : (Array.isArray(raw.eyebrows) && raw.eyebrows[0]) || 'none';
  if (!Array.isArray(clean.faceDecos)) {
    clean.faceDecos = [];
  }
  if (!clean.faceDecoSettings || typeof clean.faceDecoSettings !== 'object') {
    clean.faceDecoSettings = {};
  }
  const decoKeys = ['beard', 'shadow', 'sweat', 'wrinkle', 'shock', 'anger'];
  for (const k of decoKeys) {
    if (!clean.faceDecoSettings[k] || typeof clean.faceDecoSettings[k] !== 'object') {
      clean.faceDecoSettings[k] = {
        scale: typeof raw.faceDecoScale === 'number' ? raw.faceDecoScale : 1.0,
        x: typeof raw.faceDecoX === 'number' ? raw.faceDecoX : 0.0,
        y: typeof raw.faceDecoY === 'number' ? raw.faceDecoY : 0.0,
      };
    } else {
      if (typeof clean.faceDecoSettings[k].scale !== 'number') clean.faceDecoSettings[k].scale = 1.0;
      if (typeof clean.faceDecoSettings[k].x !== 'number') clean.faceDecoSettings[k].x = 0.0;
      if (typeof clean.faceDecoSettings[k].y !== 'number') clean.faceDecoSettings[k].y = 0.0;
    }
  }
  if (!Array.isArray(clean.ribbons)) {
    clean.ribbons = raw.ribbonType && raw.ribbonType !== 'none' ? [raw.ribbonType] : [];
  }
  if (!Array.isArray(clean.extraAccessories)) {
    clean.extraAccessories = raw.extraAccessory && raw.extraAccessory !== 'none' ? [raw.extraAccessory] : [];
  }
  if (!Array.isArray(clean.moles)) {
    clean.moles = [];
  }
  if (!Array.isArray(clean.patterns)) {
    clean.patterns = raw.patternType && raw.patternType !== 'none' ? [raw.patternType] : [];
  }
  clean.patternType = clean.patterns[0] || 'none';
  clean.oddEye = Boolean(raw.oddEye);
  if (!clean.eyeColorLeft) clean.eyeColorLeft = raw.eyeColorLeft || clean.eyeColor || '#18181b';
  if (!clean.eyeColorRight) clean.eyeColorRight = raw.eyeColorRight || '#3b82f6';
  clean.earColorCustom = Boolean(raw.earColorCustom);
  if (!clean.earColor) clean.earColor = raw.earColor || clean.bodyColor || '#ffffff';
  clean.armColorCustom = Boolean(raw.armColorCustom);
  if (!clean.armColor) clean.armColor = raw.armColor || clean.bodyColor || '#ffffff';
  return clean;
}

const STORAGE_KEY = '10studio_character_state_v1';
const RECORD_STORAGE_KEY = '10studio_record_config_v1';

const state = structuredClone(DEFAULT_STATE);

// 실행 취소(Undo) / 다시 실행(Redo) 히스토리 관리
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 60;
let isHistoryApplying = false;

function pushHistory() {
  if (isHistoryApplying) return;
  const snap = JSON.stringify(state);
  if (undoStack.length > 0 && undoStack[undoStack.length - 1] === snap) {
    return;
  }
  undoStack.push(snap);
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  redoStack.length = 0;
  updateUndoRedoUI();
}

function updateUndoRedoUI() {
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  if (btnUndo) btnUndo.disabled = undoStack.length <= 1;
  if (btnRedo) btnRedo.disabled = redoStack.length === 0;
}

function undo() {
  if (undoStack.length <= 1) return;
  const current = undoStack.pop();
  redoStack.push(current);
  const prev = undoStack[undoStack.length - 1];
  applyHistorySnapshot(prev);
  updateUndoRedoUI();
}

function redo() {
  if (redoStack.length === 0) return;
  const next = redoStack.pop();
  undoStack.push(next);
  applyHistorySnapshot(next);
  updateUndoRedoUI();
}

function applyHistorySnapshot(snapStr) {
  isHistoryApplying = true;
  try {
    const raw = JSON.parse(snapStr);
    const clean = sanitizeCharacterState(raw);
    const needsGeom =
      clean.earType !== state.earType ||
      clean.tailType !== state.tailType ||
      clean.lowPolyFlat !== state.lowPolyFlat ||
      clean.polyDetail !== state.polyDetail ||
      clean.outlineEnabled !== state.outlineEnabled ||
      clean.headScale !== state.headScale ||
      clean.bodyChubby !== state.bodyChubby ||
      clean.legLength !== state.legLength ||
      clean.ribbonScale !== state.ribbonScale ||
      clean.outlineThickness !== state.outlineThickness ||
      clean.bellyPatch !== state.bellyPatch ||
      clean.tailTipEnabled !== state.tailTipEnabled ||
      JSON.stringify(clean.ribbons) !== JSON.stringify(state.ribbons) ||
      JSON.stringify(clean.extraAccessories) !== JSON.stringify(state.extraAccessories) ||
      JSON.stringify(clean.patterns) !== JSON.stringify(state.patterns);

    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, clean);

    syncUIFromState();
    if (needsGeom) {
      rebuildCharacterMesh(false);
    } else {
      refreshTextureOnly();
    }
    schedulePersistState();
  } finally {
    isHistoryApplying = false;
  }
}

// 녹화 및 배경 설정 상태
const recordConfig = {
  format: 'gif', // 'gif' | 'webm'
  duration: 4.0, // 1.0 ~ 15.0초
  bgMode: 'solid', // 'solid' | 'transparent' | 'grid'
  bgColor: '#f4f4f5',
  showFloor: true,
};

// 새로고침 시 이전에 편집하던 캐릭터 상태 및 녹화 설정 자동 복원
function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const clean = sanitizeCharacterState(parsed);
      Object.assign(state, clean);
    }
  } catch (e) {
    console.warn('저장된 캐릭터 상태 복원 실패:', e);
  }

  try {
    const rawRec = localStorage.getItem(RECORD_STORAGE_KEY);
    if (rawRec) {
      const parsedRec = JSON.parse(rawRec);
      if (parsedRec && typeof parsedRec === 'object') {
        if (parsedRec.format) recordConfig.format = parsedRec.format;
        if (parsedRec.duration) recordConfig.duration = parsedRec.duration;
        if (parsedRec.bgMode) recordConfig.bgMode = parsedRec.bgMode;
        if (parsedRec.bgColor) recordConfig.bgColor = parsedRec.bgColor;
        if (parsedRec.showFloor !== undefined) recordConfig.showFloor = parsedRec.showFloor;
      }
    }
  } catch (_) {}
}

let persistTimer = null;
function persistStateNow() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(RECORD_STORAGE_KEY, JSON.stringify(recordConfig));
  } catch (_) {}
}

function schedulePersistState() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persistStateNow, 220);
}

loadPersistedState();

const BG_SWATCH_COLORS = [
  '#ffffff',
  '#f4f4f5',
  '#fff9db',
  '#ffe3e3',
  '#dbe4ff',
  '#c3fae8',
  '#e5dbff',
  '#212529',
  '#00ff00',
];

// 외부 공통 모션(.vmd / .fbx) 버퍼 캐시
let loadedCustomMotion = null; // { type: 'vmd' | 'fbx', buffer: ArrayBuffer, fileName: string }

// 스튜디오 모드 상태 및 다중 캐릭터(Actor) 배열
let isStudioMode = false;
let studioActors = [];
let activeStudioActorIndex = 0;

const texGen = new TextureGenerator();
const textureCanvas = texGen.update(state);
const characterTexture = new THREE.CanvasTexture(textureCanvas);
characterTexture.colorSpace = THREE.SRGBColorSpace;
characterTexture.needsUpdate = true;

const builder = new CharacterBuilder(characterTexture);
const animator = new CharacterAnimator();

// Three.js 씬 초기화
const canvas = document.getElementById('stageCanvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
camera.position.set(0, 1.32, 5.15);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.15, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2.0;
controls.maxDistance = 14.0;
controls.maxPolarAngle = Math.PI * 0.58;
controls.update();

// 입체감과 로우폴리곤 음영이 선명하게 살아나는 스튜디오 조명
const ambientLight = new THREE.AmbientLight(0xffffff, 1.05);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.95);
dirLight.position.set(2.4, 5.2, 4.2);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 18;
const d = 2.2;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.bias = -0.001;
scene.add(dirLight);

// 심플한 모노톤 바닥 그림자 디스크 (내보내기 제외)
const floorGeo = new THREE.CircleGeometry(1.05, 48);
floorGeo.rotateX(-Math.PI * 0.5);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0xe9ecef,
  roughness: 1.0,
  metalness: 0.0,
});
const floorMesh = new THREE.Mesh(floorGeo, floorMat);
floorMesh.position.y = -0.002;
floorMesh.receiveShadow = true;
scene.add(floorMesh);

// 스튜디오 모드 전용 무대 컨테이너 그룹
const studioGroup = new THREE.Group();
studioGroup.visible = false;
scene.add(studioGroup);

let currentCharacter = null;

function getEarNameLabel(earId) {
  const found = EAR_TYPES.find((e) => e.id === earId);
  return found ? found.name : '커스텀';
}

function getExportFilePrefix(targetState = state) {
  const rawName = (targetState?.characterName || '').trim();
  const safeName = rawName.replace(/[\\/:*?"<>|]+/g, '_').trim();
  if (safeName) return safeName;
  return `10studio_${targetState?.earType || 'char'}`;
}

function applyBackgroundMode() {
  const frame = document.getElementById('canvasFrame');
  const colorRow = document.getElementById('bgColorPickerRow');

  if (recordConfig.bgMode === 'solid') {
    scene.background = new THREE.Color(recordConfig.bgColor);
    floorMat.color.set(recordConfig.bgColor); // 바닥 디스크 색상을 단색 배경과 동일하게 일치시켜 경계선 잘림 방지
    if (frame) {
      frame.classList.remove('bg-transparent');
      frame.classList.add('bg-solid');
      frame.style.backgroundColor = recordConfig.bgColor;
    }
    if (colorRow) colorRow.style.display = '';
  } else if (recordConfig.bgMode === 'transparent') {
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
    if (frame) {
      frame.classList.add('bg-transparent');
      frame.classList.remove('bg-solid');
      frame.style.backgroundColor = '';
    }
    if (colorRow) colorRow.style.display = 'none';
  } else {
    // 'grid'
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
    floorMat.color.set(0xe9ecef);
    if (frame) {
      frame.classList.remove('bg-transparent', 'bg-solid');
      frame.style.backgroundColor = '';
    }
    if (colorRow) colorRow.style.display = 'none';
  }

  floorMesh.visible = recordConfig.bgMode === 'transparent' ? false : Boolean(recordConfig.showFloor);
}

function updateRecordButtonLabels() {
  const fmtUpper = recordConfig.format.toUpperCase();
  const ext = `.${recordConfig.format}`;
  const durStr = Number(recordConfig.duration).toFixed(1);
  const lang = getLanguage();
  let bgDesc = '단색 배경';
  if (recordConfig.bgMode === 'transparent') {
    bgDesc = lang === 'en' ? 'Transparent' : lang === 'ja' ? '透明背景' : lang === 'zh' ? '透明背景' : '투명 배경';
  } else if (recordConfig.bgMode === 'solid') {
    bgDesc = lang === 'en' ? 'Solid Color' : lang === 'ja' ? '単色背景' : lang === 'zh' ? '单色背景' : '단색 배경';
  } else {
    bgDesc = lang === 'en' ? 'Grid' : lang === 'ja' ? 'グリッド' : lang === 'zh' ? '网格' : '기본 배경';
  }

  const lbl1 = document.getElementById('recordBtnLabel');
  if (lbl1) {
    if (lang === 'en') {
      lbl1.textContent = `Record ${durStr}s ${fmtUpper} (${ext} · ${bgDesc})`;
    } else if (lang === 'ja') {
      lbl1.textContent = `${durStr}秒 ${fmtUpper} 録画 (${ext} · ${bgDesc})`;
    } else if (lang === 'zh') {
      lbl1.textContent = `录制 ${durStr}秒 ${fmtUpper} (${ext} · ${bgDesc})`;
    } else {
      lbl1.textContent = `${durStr}초 ${fmtUpper} 녹화 (${ext} · ${bgDesc})`;
    }
  }
  const lbl2 = document.getElementById('studioRecordBtnLabel');
  if (lbl2) {
    if (lang === 'en') {
      lbl2.textContent = `Record Studio Stage ${durStr}s ${fmtUpper} (${ext})`;
    } else if (lang === 'ja') {
      lbl2.textContent = `現在のステージ ${durStr}秒 ${fmtUpper} 録画 (${ext})`;
    } else if (lang === 'zh') {
      lbl2.textContent = `录制当前舞台 ${durStr}秒 ${fmtUpper} (${ext})`;
    } else {
      lbl2.textContent = `현재 스튜디오 무대 ${durStr}초 ${fmtUpper} 녹화 (${ext})`;
    }
  }

  document.querySelectorAll('#recordFormatGrid .chip-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.format === recordConfig.format);
  });
  document.querySelectorAll('#bgModeGrid .chip-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.bg === recordConfig.bgMode);
  });

  const slider = document.getElementById('sliderRecordDuration');
  const numInput = document.getElementById('inputRecordDuration');
  if (slider && parseFloat(slider.value) !== recordConfig.duration) {
    slider.value = recordConfig.duration;
  }
  if (numInput && parseFloat(numInput.value) !== recordConfig.duration) {
    numInput.value = recordConfig.duration;
  }

  const chkFloor = document.getElementById('chkShowFloor');
  if (chkFloor) chkFloor.checked = Boolean(recordConfig.showFloor);

  const pickerBg = document.getElementById('pickerRecordBgColor');
  if (pickerBg) pickerBg.value = recordConfig.bgColor;

  schedulePersistState();
}

function refreshTextureOnly() {
  texGen.update(state);
  characterTexture.needsUpdate = true;

  // 스튜디오 모드에서 현재 편집 대상으로 선택된 캐릭터가 있으면 함께 즉시 반영
  if (isStudioMode && studioActors[activeStudioActorIndex]) {
    const actor = studioActors[activeStudioActorIndex];
    if (actor.state && actor.texGen && actor.texture) {
      const prevMotion = actor.state.danceMode;
      actor.state = sanitizeCharacterState(state);
      actor.state.danceMode = prevMotion;
      actor.texGen.update(actor.state);
      actor.texture.needsUpdate = true;
      renderStudioActorList();
    }
  }

  schedulePersistState();
}

function rebuildCharacterMesh(triggerPokeEffect = false) {
  texGen.update(state);
  characterTexture.needsUpdate = true;

  if (currentCharacter && currentCharacter.rootGroup) {
    scene.remove(currentCharacter.rootGroup);
    currentCharacter.skinnedMesh.geometry.dispose();
    if (currentCharacter.outlineMesh) {
      currentCharacter.outlineMesh.geometry.dispose();
    }
  }

  currentCharacter = builder.build(state);
  currentCharacter.rootGroup.visible = !isStudioMode;
  scene.add(currentCharacter.rootGroup);
  animator.bindCharacter(currentCharacter.bones, currentCharacter.rootGroup);

  if (triggerPokeEffect) {
    animator.triggerPoke();
  }

  // 스튜디오 모드 활성 시 선택된 액터도 실시간 재빌드
  if (isStudioMode && studioActors[activeStudioActorIndex]) {
    const actor = studioActors[activeStudioActorIndex];
    if (actor.state && actor.builder) {
      actor.state = sanitizeCharacterState(state);
      rebuildSingleStudioActor(actor, triggerPokeEffect);
      renderStudioActorList();
    }
  }

  schedulePersistState();
}

// ============================================================================
// 스튜디오 모드 (다중 캐릭터 배치 및 개별·합동 모션 촬영)
// ============================================================================
function restoreActorCustomMotion(actor) {
  const motionSrc =
    actor.motionOverride === 'actor_custom' && actor.customMotion
      ? actor.customMotion
      : loadedCustomMotion;

  if (motionSrc) {
    try {
      if (motionSrc.type === 'fbx') {
        actor.animator.parseFbxBuffer(motionSrc.buffer);
      } else if (motionSrc.type === 'vmd') {
        actor.animator.parseVmdBuffer(motionSrc.buffer);
      }
    } catch (_) {
      // ignore
    }
  }
}

function rebuildSingleStudioActor(actor, triggerPoke = false) {
  if (!actor.state || !actor.builder || !actor.texGen) return;

  actor.texGen.update(actor.state);
  actor.texture.needsUpdate = true;

  if (actor.charData && actor.charData.rootGroup) {
    actor.stageAnchor.remove(actor.charData.rootGroup);
    actor.charData.skinnedMesh?.geometry?.dispose();
    if (actor.charData.outlineMesh) {
      actor.charData.outlineMesh.geometry?.dispose();
    }
  }

  actor.charData = actor.builder.build(actor.state);
  actor.stageAnchor.add(actor.charData.rootGroup);
  actor.animator.bindCharacter(actor.charData.bones, actor.charData.rootGroup);

  restoreActorCustomMotion(actor);

  if (triggerPoke) {
    actor.animator.triggerPoke();
  }
}

function getSmartSpawnOffset(index, totalAfterAdd) {
  if (totalAfterAdd <= 1) return { x: 0, z: 0 };
  const spacing = 1.15;
  const side = index % 2 === 1 ? 1 : -1;
  const tier = Math.ceil(index / 2);
  return {
    x: +(side * tier * spacing * 0.65).toFixed(2),
    z: +(-tier * 0.18).toFixed(2),
  };
}

function createStudioActorFromState(charState, customLabel = null) {
  const cleanState = sanitizeCharacterState(charState);
  const actorTexGen = new TextureGenerator();
  const actorCanvas = actorTexGen.update(cleanState);
  const actorTexture = new THREE.CanvasTexture(actorCanvas);
  actorTexture.colorSpace = THREE.SRGBColorSpace;
  actorTexture.needsUpdate = true;

  const actorBuilder = new CharacterBuilder(actorTexture);
  const charData = actorBuilder.build(cleanState);

  const stageAnchor = new THREE.Group();
  stageAnchor.add(charData.rootGroup);
  studioGroup.add(stageAnchor);

  const actorAnimator = new CharacterAnimator();
  actorAnimator.bindCharacter(charData.bones, charData.rootGroup);

  if (loadedCustomMotion) {
    try {
      if (loadedCustomMotion.type === 'fbx') {
        actorAnimator.parseFbxBuffer(loadedCustomMotion.buffer);
      } else if (loadedCustomMotion.type === 'vmd') {
        actorAnimator.parseVmdBuffer(loadedCustomMotion.buffer);
      }
    } catch (_) {
      // ignore
    }
  }

  // 기존에 1명만 (0,0)에 있었는데 2번째 캐릭터가 추가되는 경우 자동으로 좌우 나란히 배치
  if (studioActors.length === 1 && Math.abs(studioActors[0].x) < 0.05 && Math.abs(studioActors[0].z) < 0.05) {
    studioActors[0].x = -0.62;
    applyActorTransform(studioActors[0]);
  }

  const nextIdx = studioActors.length;
  const pos =
    studioActors.length === 1 && Math.abs(studioActors[0].x + 0.62) < 0.05
      ? { x: 0.62, z: 0 }
      : getSmartSpawnOffset(nextIdx, nextIdx + 1);

  const resolvedLabel =
    (cleanState.characterName || '').trim() || customLabel || `캐릭터 #${nextIdx + 1}`;
  cleanState.characterName = resolvedLabel;

  const actor = {
    id: `actor_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    label: resolvedLabel,
    state: cleanState,
    texGen: actorTexGen,
    texture: actorTexture,
    builder: actorBuilder,
    charData,
    stageAnchor,
    animator: actorAnimator,
    x: pos.x,
    z: pos.z,
    rotY: 0,
    scale: 1.0,
    motionOverride: 'follow', // 'follow' | 내장 모션 ID | 'actor_custom'
    customMotion: null, // { type: 'vmd' | 'fbx', buffer: ArrayBuffer, fileName: string }
  };

  applyActorTransform(actor);
  actorAnimator.triggerPoke();
  studioActors.push(actor);
  activeStudioActorIndex = studioActors.length - 1;
  syncStudioStatusUI();
  renderStudioActorList();
  return actor;
}

function createStudioActorFromGlbMesh(glbData, fileName = 'GLB 캐릭터') {
  const stageAnchor = new THREE.Group();
  stageAnchor.add(glbData.rootGroup);
  studioGroup.add(stageAnchor);

  const actorAnimator = new CharacterAnimator();
  actorAnimator.bindCharacter(glbData.bones, glbData.rootGroup);

  if (loadedCustomMotion) {
    try {
      if (loadedCustomMotion.type === 'fbx') {
        actorAnimator.parseFbxBuffer(loadedCustomMotion.buffer);
      } else if (loadedCustomMotion.type === 'vmd') {
        actorAnimator.parseVmdBuffer(loadedCustomMotion.buffer);
      }
    } catch (_) {
      // ignore
    }
  }

  if (studioActors.length === 1 && Math.abs(studioActors[0].x) < 0.05 && Math.abs(studioActors[0].z) < 0.05) {
    studioActors[0].x = -0.62;
    applyActorTransform(studioActors[0]);
  }

  const nextIdx = studioActors.length;
  const pos =
    studioActors.length === 1 && Math.abs(studioActors[0].x + 0.62) < 0.05
      ? { x: 0.62, z: 0 }
      : getSmartSpawnOffset(nextIdx, nextIdx + 1);

  const actor = {
    id: `actor_glb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    label: fileName.replace(/\.[^.]+$/, ''),
    state: null,
    texGen: null,
    texture: null,
    builder: null,
    charData: glbData,
    stageAnchor,
    animator: actorAnimator,
    x: pos.x,
    z: pos.z,
    rotY: 0,
    scale: 1.0,
    motionOverride: 'follow',
    customMotion: null,
  };

  applyActorTransform(actor);
  actorAnimator.triggerPoke();
  studioActors.push(actor);
  activeStudioActorIndex = studioActors.length - 1;
  syncStudioStatusUI();
  renderStudioActorList();
  return actor;
}

function applyActorTransform(actor) {
  if (!actor || !actor.stageAnchor) return;
  actor.stageAnchor.position.set(actor.x, 0, actor.z);
  actor.stageAnchor.rotation.y = (actor.rotY * Math.PI) / 180;
  actor.stageAnchor.scale.setScalar(actor.scale);
}

function disposeStudioActor(actor) {
  if (!actor) return;
  studioGroup.remove(actor.stageAnchor);
  actor.charData?.skinnedMesh?.geometry?.dispose();
  if (actor.charData?.outlineMesh) {
    actor.charData.outlineMesh.geometry?.dispose();
  }
  if (actor.texture) {
    actor.texture.dispose();
  }
}

function setStudioMode(enabled, switchToStudioTab = false) {
  isStudioMode = Boolean(enabled);

  if (isStudioMode && studioActors.length === 0) {
    const firstLabel = (state.characterName || '').trim() || '캐릭터 #1';
    createStudioActorFromState(state, firstLabel);
  }

  if (currentCharacter && currentCharacter.rootGroup) {
    currentCharacter.rootGroup.visible = !isStudioMode;
  }
  studioGroup.visible = isStudioMode;

  const floorScale = isStudioMode ? 2.5 : 1.0;
  floorMesh.scale.set(floorScale, 1, floorScale);

  const shadowD = isStudioMode ? 4.4 : 2.2;
  dirLight.shadow.camera.left = -shadowD;
  dirLight.shadow.camera.right = shadowD;
  dirLight.shadow.camera.top = shadowD;
  dirLight.shadow.camera.bottom = -shadowD;
  dirLight.shadow.camera.updateProjectionMatrix();

  if (isStudioMode && studioActors.length >= 2) {
    camera.position.set(0, 1.45, 5.85);
    controls.target.set(0, 1.08, 0);
    controls.update();
  }

  if (switchToStudioTab) {
    activateTab('tab-studio');
  }

  syncStudioStatusUI();
  renderStudioActorList();
}

function syncStudioStatusUI() {
  const count = studioActors.length;
  const lang = getLanguage();
  const studioLabel = t('btn_studio') || '스튜디오 모드';
  const unit = t('unit_actors') || (lang === 'en' ? ' actors' : '명');

  const headerBtn = document.getElementById('btnToggleStudio');
  if (headerBtn) {
    headerBtn.classList.toggle('active', isStudioMode);
    const labelSpan = headerBtn.querySelector('.label-full') || headerBtn.querySelector('span');
    if (labelSpan) {
      if (lang === 'en') {
        labelSpan.textContent = isStudioMode ? `${studioLabel} (${count})` : studioLabel;
      } else if (lang === 'ko') {
        labelSpan.textContent = isStudioMode ? `스튜디오 모드 (${count}명)` : '스튜디오 모드';
      } else {
        labelSpan.textContent = isStudioMode ? `${studioLabel} (${count}${unit})` : studioLabel;
      }
    }
  }

  const badge = document.getElementById('studioStageBadge');
  const badgeText = document.getElementById('studioStageCountText');
  if (badge) badge.hidden = !isStudioMode;
  if (badgeText) {
    if (lang === 'en') {
      badgeText.textContent = `Studio Mode (${count} actor${count === 1 ? '' : 's'})`;
    } else if (lang === 'ja') {
      badgeText.textContent = `スタジオモード (${count}人配置)`;
    } else if (lang === 'zh') {
      badgeText.textContent = `摄影棚模式 (${count}人已就位)`;
    } else {
      badgeText.textContent = `스튜디오 모드 (${count}명 배치됨)`;
    }
  }

  const countTag = document.getElementById('studioCountTag');
  if (countTag) {
    countTag.textContent = lang === 'en' ? `${count} actor${count === 1 ? '' : 's'}` : `${count}${unit}`;
  }

  const chkStudio = document.getElementById('chkStudioActive');
  if (chkStudio) chkStudio.checked = isStudioMode;

  const inactiveNotice = document.getElementById('studioInactiveNotice');
  if (inactiveNotice) inactiveNotice.hidden = isStudioMode;

  // 스튜디오 모드가 아닐 때는 스튜디오 전용 버튼/슬라이더 영역을 잠금 처리
  const lockWrapIds = ['studioTopControlsWrap', 'studioActorSectionWrap', 'studioRecordSectionWrap'];
  lockWrapIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.toggle('studio-locked', !isStudioMode);
    }
  });

  const studioBtnIds = [
    'btnStudioAddCurrent',
    'btnStudioAddFile',
    'btnStudioLine',
    'btnStudioVForm',
    'btnStudioCircle',
    'btnStudioSyncTime',
    'btnStudioQuickRecord',
    'btnStudioGoMotionTab',
  ];
  studioBtnIds.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !isStudioMode;
  });
}

function arrangeStudioFormation(formationType) {
  if (!isStudioMode) return;
  const n = studioActors.length;
  if (n === 0) return;

  if (n === 1) {
    studioActors[0].x = 0;
    studioActors[0].z = 0;
    studioActors[0].rotY = 0;
    applyActorTransform(studioActors[0]);
    renderStudioActorList();
    return;
  }

  const spacing = n <= 3 ? 1.22 : Math.max(0.85, 3.6 / (n - 1));

  studioActors.forEach((actor, i) => {
    const centeredIdx = i - (n - 1) * 0.5;
    if (formationType === 'line') {
      actor.x = +(centeredIdx * spacing).toFixed(2);
      actor.z = 0;
      actor.rotY = 0;
    } else if (formationType === 'vform') {
      actor.x = +(centeredIdx * spacing * 0.92).toFixed(2);
      actor.z = +(-Math.abs(centeredIdx) * 0.55 + 0.25).toFixed(2);
      actor.rotY = Math.round(-centeredIdx * 8);
    } else if (formationType === 'circle') {
      const radius = Math.max(1.0, n * 0.34);
      const angle = (i / n) * Math.PI * 2;
      actor.x = +(Math.sin(angle) * radius).toFixed(2);
      actor.z = +(Math.cos(angle) * radius - radius * 0.35).toFixed(2);
      actor.rotY = Math.round((-angle * 180) / Math.PI * 0.25);
    }
    applyActorTransform(actor);
  });

  renderStudioActorList();
}

function syncAllStudioAnimatorsTime() {
  if (!isStudioMode) return;
  animator.time = 0;
  studioActors.forEach((actor) => {
    actor.animator.time = 0;
    actor.animator.triggerPoke();
  });
}

function renderStudioActorList() {
  const container = document.getElementById('studioActorList');
  if (!container) return;
  container.innerHTML = '';

  const locked = !isStudioMode;

  if (studioActors.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'mole-empty-msg';
    empty.textContent = locked
      ? '스튜디오 모드가 비활성화되어 있습니다. 상단의 스튜디오 모드 활성을 켜면 무대에 캐릭터를 배치하고 위치를 조정할 수 있습니다.'
      : '무대에 배치된 캐릭터가 없습니다. 상단 버튼으로 현재 캐릭터나 저장된 파일을 추가하세요.';
    container.appendChild(empty);
    return;
  }

  studioActors.forEach((actor, idx) => {
    const card = document.createElement('div');
    const isEditing = isStudioMode && idx === activeStudioActorIndex && Boolean(actor.state);
    card.className = `studio-actor-card${isEditing ? ' editing-target' : ''}${locked ? ' studio-disabled' : ''}`;

    const head = document.createElement('div');
    head.className = 'studio-actor-head';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'studio-actor-title';

    const dot = document.createElement('span');
    dot.className = 'actor-color-dot';
    dot.style.backgroundColor = actor.state ? actor.state.bodyColor : '#adb5bd';

    const idxSpan = document.createElement('span');
    idxSpan.textContent = `${idx + 1}.`;

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'actor-name-input';
    nameInput.value = actor.label || `캐릭터 #${idx + 1}`;
    nameInput.maxLength = 36;
    nameInput.placeholder = '캐릭터 이름';
    nameInput.title = '캐릭터 이름 변경';
    nameInput.disabled = locked;
    nameInput.addEventListener('input', (e) => {
      if (!isStudioMode) return;
      const newName = e.target.value;
      actor.label = newName.trim() || `캐릭터 #${idx + 1}`;
      if (actor.state) {
        actor.state.characterName = newName;
      }
      if (idx === activeStudioActorIndex) {
        state.characterName = newName;
        const mainNameInput = document.getElementById('inputCharacterName');
        if (mainNameInput && mainNameInput.value !== newName) {
          mainNameInput.value = newName;
        }
      }
    });

    const earSpan = document.createElement('span');
    const earLabel = actor.state ? getEarNameLabel(actor.state.earType) : '3D GLB';
    earSpan.textContent = `(${earLabel})`;
    earSpan.style.fontSize = '0.78rem';
    earSpan.style.color = 'var(--text-secondary)';

    titleWrap.append(dot, idxSpan, nameInput, earSpan);

    if (isEditing) {
      const badge = document.createElement('span');
      badge.className = 'actor-badge';
      badge.textContent = '편집 대상';
      titleWrap.appendChild(badge);
    }

    const btnWrap = document.createElement('div');
    btnWrap.className = 'studio-actor-btns';

    if (actor.state) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'actor-mini-btn';
      editBtn.textContent = isEditing ? '파츠 편집 중' : '에디터로 선택';
      editBtn.disabled = locked;
      editBtn.addEventListener('click', () => {
        if (!isStudioMode) return;
        activeStudioActorIndex = idx;
        const keepDance = state.danceMode;
        Object.assign(state, sanitizeCharacterState(actor.state));
        state.danceMode = keepDance;
        if (!state.characterName) {
          state.characterName = actor.label;
        }
        syncUIFromState();
        rebuildCharacterMesh(true);
        renderStudioActorList();
      });
      btnWrap.appendChild(editBtn);

      const dupBtn = document.createElement('button');
      dupBtn.type = 'button';
      dupBtn.className = 'actor-mini-btn';
      dupBtn.textContent = '복제';
      dupBtn.disabled = locked;
      dupBtn.addEventListener('click', () => {
        if (!isStudioMode) return;
        const dupState = sanitizeCharacterState(actor.state);
        dupState.characterName = `${actor.label} 복제`;
        const cloned = createStudioActorFromState(dupState, `${actor.label} 복제`);
        if (actor.customMotion) {
          cloned.customMotion = actor.customMotion;
          cloned.motionOverride = actor.motionOverride;
          restoreActorCustomMotion(cloned);
          renderStudioActorList();
        }
      });
      btnWrap.appendChild(dupBtn);
    }

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'actor-mini-btn danger';
    delBtn.textContent = '삭제';
    delBtn.disabled = locked;
    delBtn.addEventListener('click', () => {
      if (!isStudioMode) return;
      disposeStudioActor(actor);
      studioActors.splice(idx, 1);
      if (activeStudioActorIndex >= studioActors.length) {
        activeStudioActorIndex = Math.max(0, studioActors.length - 1);
      }
      syncStudioStatusUI();
      renderStudioActorList();
    });
    btnWrap.appendChild(delBtn);

    head.append(titleWrap, btnWrap);
    card.appendChild(head);

    // 캐릭터별 개별 모션 선택 (내장 모션 + 캐릭터 전용 .vmd / .fbx 파일 업로드 지원!)
    const motionRow = document.createElement('div');
    motionRow.className = 'actor-motion-row';
    const motionLbl = document.createElement('span');
    motionLbl.textContent = '적용 모션';

    const motionRightWrap = document.createElement('div');
    motionRightWrap.style.display = 'flex';
    motionRightWrap.style.alignItems = 'center';
    motionRightWrap.style.gap = '6px';
    motionRightWrap.style.flex = '1';
    motionRightWrap.style.justifyContent = 'flex-end';

    const motionSelect = document.createElement('select');
    motionSelect.className = 'actor-motion-select';
    motionSelect.disabled = locked;

    const followOpt = document.createElement('option');
    followOpt.value = 'follow';
    followOpt.textContent = '전체 공통 모션 따르기';
    motionSelect.appendChild(followOpt);

    if (actor.customMotion) {
      const customOpt = document.createElement('option');
      customOpt.value = 'actor_custom';
      customOpt.textContent = `개별 파일: ${actor.customMotion.fileName}`;
      motionSelect.appendChild(customOpt);
    }

    DANCE_MODES.forEach((dm) => {
      const opt = document.createElement('option');
      opt.value = dm.id;
      opt.textContent = `개별 내장: ${dm.name}`;
      motionSelect.appendChild(opt);
    });

    motionSelect.value = actor.motionOverride || 'follow';
    motionSelect.addEventListener('change', (e) => {
      if (!isStudioMode) return;
      actor.motionOverride = e.target.value;
      restoreActorCustomMotion(actor);
    });

    // 캐릭터별 전용 VMD/FBX 파일 불러오기 버튼
    const actorMotionInput = document.createElement('input');
    actorMotionInput.type = 'file';
    actorMotionInput.accept = '.vmd,.fbx';
    actorMotionInput.hidden = true;
    actorMotionInput.disabled = locked;

    const actorMotionBtn = document.createElement('button');
    actorMotionBtn.type = 'button';
    actorMotionBtn.className = 'actor-mini-btn';
    actorMotionBtn.textContent = '개별 VMD/FBX';
    actorMotionBtn.title = '이 캐릭터에만 별도의 .vmd 또는 .fbx 모션 파일을 적용합니다';
    actorMotionBtn.disabled = locked;
    actorMotionBtn.addEventListener('click', () => {
      if (!isStudioMode) return;
      actorMotionInput.value = '';
      actorMotionInput.click();
    });

    actorMotionInput.addEventListener('change', async (e) => {
      if (!isStudioMode) return;
      const file = e.target.files?.[0];
      if (!file) return;
      const ext = file.name.toLowerCase().split('.').pop();
      showBusy(`${actor.label}에 ${ext.toUpperCase()} 모션 적용 중…`);
      try {
        const buf = await file.arrayBuffer();
        if (ext === 'fbx') {
          actor.animator.parseFbxBuffer(buf);
          actor.customMotion = { type: 'fbx', buffer: buf, fileName: file.name };
          actor.motionOverride = 'actor_custom';
        } else if (ext === 'vmd') {
          actor.animator.parseVmdBuffer(buf);
          actor.customMotion = { type: 'vmd', buffer: buf, fileName: file.name };
          actor.motionOverride = 'actor_custom';
        } else {
          throw new Error('.vmd 또는 .fbx 파일만 지원합니다.');
        }
        renderStudioActorList();
      } catch (err) {
        alert(err.message || '개별 모션 파일 로드에 실패했습니다.');
      } finally {
        hideBusy();
      }
    });

    motionRightWrap.append(motionSelect, actorMotionInput, actorMotionBtn);
    motionRow.append(motionLbl, motionRightWrap);
    card.appendChild(motionRow);

    // 위치(X, Z), 회전(Y), 크기 슬라이더 (스튜디오 모드가 아닐 때는 disabled 처리)
    const makeActorSlider = (labelTxt, min, max, step, val, formatFn, onChange) => {
      const row = document.createElement('div');
      row.className = 'slider-item';
      const lbl = document.createElement('label');
      lbl.textContent = labelTxt;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = min;
      input.max = max;
      input.step = step;
      input.value = val;
      input.disabled = locked;
      const span = document.createElement('span');
      span.textContent = formatFn(Number(val));
      input.addEventListener('input', (e) => {
        if (!isStudioMode) return;
        const v = parseFloat(e.target.value);
        span.textContent = formatFn(v);
        onChange(v);
        applyActorTransform(actor);
      });
      row.append(lbl, input, span);
      return row;
    };

    card.appendChild(
      makeActorSlider('가로 위치 (X)', -2.6, 2.6, 0.05, actor.x, (v) => v.toFixed(2), (v) => {
        actor.x = v;
      })
    );
    card.appendChild(
      makeActorSlider('앞뒤 위치 (Z)', -2.2, 2.2, 0.05, actor.z, (v) => v.toFixed(2), (v) => {
        actor.z = v;
      })
    );
    card.appendChild(
      makeActorSlider('바라보는 각도', -180, 180, 5, actor.rotY, (v) => `${Math.round(v)}°`, (v) => {
        actor.rotY = v;
      })
    );
    card.appendChild(
      makeActorSlider('캐릭터 크기', 0.6, 1.4, 0.05, actor.scale, (v) => `${v.toFixed(2)}x`, (v) => {
        actor.scale = v;
      })
    );

    container.appendChild(card);
  });
}

// 파일(.json, .zip, .glb) 불러오기 처리
async function handleCharacterFilesImport(fileList, forceAddStudio = false) {
  if (!fileList || fileList.length === 0) return;
  const files = Array.from(fileList);

  showBusy('캐릭터 파일을 불러오는 중…');
  try {
    const useStudio = forceAddStudio || isStudioMode || files.length > 1;
    if (useStudio && !isStudioMode) {
      setStudioMode(true, true);
    }

    for (const file of files) {
      const result = await importCharacterFile(file);
      const baseLabel = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/_(project|mmd)$/i, '');

      if (result.type === 'state') {
        const clean = sanitizeCharacterState(result.state);
        if (!clean.characterName || !clean.characterName.trim()) {
          clean.characterName = baseLabel;
        }
        if (useStudio) {
          createStudioActorFromState(clean, clean.characterName);
        } else {
          const keepDance = state.danceMode;
          Object.assign(state, clean);
          if (keepDance === 'custom_fbx' || keepDance === 'custom_vmd') {
            state.danceMode = keepDance;
          }
          syncUIFromState();
          rebuildCharacterMesh(true);
          pushHistory();
        }
      } else if (result.type === 'glb_mesh' || result.type === 'glb_scene') {
        if (!isStudioMode) {
          setStudioMode(true, true);
        }
        createStudioActorFromGlbMesh(result, baseLabel);
      }
    }
  } catch (err) {
    alert(err.message || '캐릭터 파일을 불러오지 못했습니다.');
  } finally {
    hideBusy();
  }
}

function handleResize() {
  const frame = document.getElementById('canvasFrame');
  const w = frame.clientWidth || 440;
  const h = frame.clientHeight || 440;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', handleResize);

let pointerDownPos = { x: 0, y: 0 };
canvas.addEventListener('pointerdown', (e) => {
  pointerDownPos = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointerup', (e) => {
  const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
  if (dist < 6) {
    if (isStudioMode) {
      studioActors.forEach((a) => a.animator.triggerPoke());
    } else {
      animator.triggerPoke();
    }
  }
});

// 뷰포트에 캐릭터 파일(.json, .zip, .glb) 드래그 앤 드롭 지원
const canvasFrame = document.getElementById('canvasFrame');
if (canvasFrame) {
  canvasFrame.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  canvasFrame.addEventListener('drop', (e) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer?.files;
    if (!droppedFiles || droppedFiles.length === 0) return;
    const firstExt = droppedFiles[0].name.toLowerCase().split('.').pop();
    if (['json', 'zip', 'glb'].includes(firstExt)) {
      handleCharacterFilesImport(droppedFiles, isStudioMode);
    }
  });
}

// ============================================================================
// 벡터 캔버스 썸네일 드로잉 (이모티콘 없이 순수 벡터 선화로 표현)
// ============================================================================
function drawEarThumb(canvasEl, earId) {
  const ctx = canvasEl.getContext('2d');
  const w = canvasEl.width;
  const h = canvasEl.height;
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w * 0.5, h * 0.62);
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#ffffff';

  [-1, 1].forEach((dir) => {
    ctx.save();
    if (earId === 'cat') {
      ctx.beginPath();
      ctx.moveTo(dir * 7, -12);
      ctx.quadraticCurveTo(dir * 16, -26, dir * 19, -24);
      ctx.quadraticCurveTo(dir * 25, -12, dir * 22, -1);
      ctx.fill();
      ctx.stroke();
    } else if (earId === 'fox') {
      ctx.beginPath();
      ctx.moveTo(dir * 6, -12);
      ctx.quadraticCurveTo(dir * 18, -30, dir * 22, -28);
      ctx.quadraticCurveTo(dir * 28, -12, dir * 22, 0);
      ctx.fill();
      ctx.stroke();
    } else if (earId === 'wolf') {
      ctx.beginPath();
      ctx.moveTo(dir * 7, -13);
      ctx.lineTo(dir * 17, -29);
      ctx.lineTo(dir * 22, -2);
      ctx.fill();
      ctx.stroke();
    } else if (earId === 'bear') {
      ctx.beginPath();
      ctx.arc(dir * 18, -14, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (earId === 'mouse') {
      ctx.beginPath();
      ctx.arc(dir * 19, -15, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (earId === 'hamster') {
      ctx.beginPath();
      ctx.ellipse(dir * 20, -13, 8.5, 6.5, dir * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (earId === 'deer1' || earId === 'deer2') {
      ctx.beginPath();
      ctx.moveTo(dir * 16, -10);
      ctx.quadraticCurveTo(dir * 29, -21, dir * 32, -14);
      ctx.quadraticCurveTo(dir * 26, -4, dir * 19, -4);
      ctx.fill();
      ctx.stroke();
      if (earId === 'deer2') {
        ctx.beginPath();
        ctx.moveTo(dir * 7, -14);
        ctx.lineTo(dir * 11, -28);
        ctx.moveTo(dir * 9, -21);
        ctx.lineTo(dir * 4, -25);
        ctx.stroke();
      }
    } else if (earId === 'rabbit') {
      ctx.beginPath();
      ctx.ellipse(dir * 10, -21, 5.5, 13.5, dir * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (earId === 'lop_rabbit') {
      ctx.beginPath();
      ctx.moveTo(dir * 18, -7);
      ctx.quadraticCurveTo(dir * 32, 4, dir * 28, 13);
      ctx.quadraticCurveTo(dir * 20, 15, dir * 18, 5);
      ctx.fill();
      ctx.stroke();
    } else if (earId === 'axolotl') {
      [-0.4, 0, 0.4].forEach((a) => {
        ctx.beginPath();
        ctx.ellipse(dir * 25, -4 + a * 16, 7.5, 3, dir * a, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    } else if (earId === 'raccoon') {
      ctx.beginPath();
      ctx.arc(dir * 17, -13, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (earId === 'otter') {
      ctx.beginPath();
      ctx.arc(dir * 21, -8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  });

  if (earId === 'lion') {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const mx = Math.cos(angle) * 23;
      const my = Math.sin(angle) * 16.5;
      ctx.beginPath();
      ctx.arc(mx, my, 5.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // 호빵형 머리 윤곽
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 15.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (earId === 'lion') {
    [-1, 1].forEach((dir) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(dir * 16, -11.5, 6.0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(dir * 16, -11.5, 3.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  if (earId === 'dog') {
    [-1, 1].forEach((dir) => {
      ctx.beginPath();
      ctx.moveTo(dir * 14, -13);
      ctx.lineTo(dir * 27, -4);
      ctx.quadraticCurveTo(dir * 22, 3, dir * 17, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }

  // 눈 & 입
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.ellipse(-9, 2, 2.0, 2.8, 0, 0, Math.PI * 2);
  ctx.ellipse(9, 2, 2.0, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-3, 6);
  ctx.quadraticCurveTo(-1.5, 8, 0, 5.5);
  ctx.quadraticCurveTo(1.5, 8, 3, 6);
  ctx.stroke();

  ctx.restore();
}

function drawTailThumb(canvasEl, tailId) {
  const ctx = canvasEl.getContext('2d');
  const w = canvasEl.width;
  const h = canvasEl.height;
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w * 0.5, h * 0.55);
  ctx.strokeStyle = '#18181b';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tailId === 'round') {
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (tailId === 'long') {
    ctx.beginPath();
    ctx.moveTo(-16, 12);
    ctx.bezierCurveTo(-4, 12, 0, -14, 16, -12);
    ctx.lineWidth = 6;
    ctx.stroke();
  } else if (tailId === 'stubby') {
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 9, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (tailId === 'fluffy') {
    ctx.beginPath();
    ctx.moveTo(-18, 10);
    ctx.quadraticCurveTo(-4, -18, 18, -10);
    ctx.quadraticCurveTo(6, 16, -18, 10);
    ctx.fill();
    ctx.stroke();
  } else if (tailId === 'hamster') {
    // 햄스터: 짧고 앙증맞은 동그란 꼬투리
    ctx.beginPath();
    ctx.arc(0, 3, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (tailId === 'mouse') {
    // 쥐: 가늘고 길게 휘어지는 와이어 꼬리
    ctx.beginPath();
    ctx.moveTo(-18, 14);
    ctx.bezierCurveTo(-6, 14, 2, -14, 17, -14);
    ctx.lineWidth = 2.4;
    ctx.stroke();
  } else if (tailId === 'lion') {
    // 사자: 가느다란 줄기 + 끝부분 털술
    ctx.beginPath();
    ctx.moveTo(-16, 12);
    ctx.bezierCurveTo(-6, 12, -2, -2, 6, -4);
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5, -4);
    ctx.quadraticCurveTo(11, -15, 18, -13);
    ctx.quadraticCurveTo(20, -3, 11, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (tailId === 'raccoon') {
    // 너구리: 몸통 쪽(아래)이 좁고 뾰족하며 위로 갈수록 도톰하고 둥근 형태 + 가로 줄무늬
    ctx.beginPath();
    ctx.moveTo(-3, 17);
    ctx.quadraticCurveTo(-16, 5, -14, -8);
    ctx.quadraticCurveTo(-11, -21, 0, -21);
    ctx.quadraticCurveTo(11, -21, 14, -8);
    ctx.quadraticCurveTo(16, 5, 3, 17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-11, 2);
    ctx.lineTo(11, 2);
    ctx.moveTo(-13, -7);
    ctx.lineTo(13, -7);
    ctx.stroke();
  } else if (tailId === 'mermaid') {
    // 인어: 우아하고 대칭적인 고래/인어 플루크 지느러미
    ctx.beginPath();
    ctx.moveTo(-4, 16);
    ctx.quadraticCurveTo(-3, 6, -10, 0);
    ctx.quadraticCurveTo(-18, -4, -22, -14);
    ctx.quadraticCurveTo(-12, -11, 0, -4);
    ctx.quadraticCurveTo(12, -11, 22, -14);
    ctx.quadraticCurveTo(18, -4, 10, 0);
    ctx.quadraticCurveTo(3, 6, 4, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 중앙 줄기 라인
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(0, 3);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#adb5bd';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.moveTo(-7, 7);
    ctx.lineTo(7, -7);
    ctx.stroke();
  }

  ctx.restore();
}

function drawWingThumb(canvasEl, wingId) {
  const ctx = canvasEl.getContext('2d');
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  const w = canvasEl.width;
  const h = canvasEl.height;

  if (wingId === 'none') {
    ctx.strokeStyle = '#a1a1aa';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w / 2 - 10, h / 2 - 10);
    ctx.lineTo(w / 2 + 10, h / 2 + 10);
    ctx.stroke();
    return;
  }

  if (wingId === 'angel') {
    [-1, 1].forEach((dir) => {
      ctx.save();
      ctx.translate(w / 2 + dir * 6, h / 2 + 6);
      ctx.scale(dir * 0.72, 0.72);

      ctx.beginPath();
      ctx.moveTo(2, 4);
      ctx.bezierCurveTo(6, -14, 16, -26, 32, -32);
      ctx.bezierCurveTo(28, -22, 23, -16, 26, -14);
      ctx.bezierCurveTo(23, -8, 18, -3, 21, 0);
      ctx.bezierCurveTo(18, 4, 14, 8, 8, 8);
      ctx.bezierCurveTo(3, 8, 1, 4, 2, 1);
      ctx.bezierCurveTo(3, -2, 7, -1, 7, 1);
      ctx.bezierCurveTo(7, 3, 5, 4, 3, 3);
      ctx.closePath();

      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 2.6;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(10, -6);
      ctx.bezierCurveTo(16, -12, 22, -18, 26, -22);
      ctx.strokeStyle = 'rgba(39, 39, 42, 0.35)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.restore();
    });
    return;
  }

  if (wingId === 'devil') {
    [-1, 1].forEach((dir) => {
      ctx.save();
      ctx.translate(w / 2 + dir * 6, h / 2 + 6);
      ctx.scale(dir * 0.72, 0.72);

      ctx.beginPath();
      ctx.moveTo(2, 2);
      ctx.lineTo(10, -20);
      ctx.bezierCurveTo(20, -22, 32, -18, 42, -10);
      ctx.bezierCurveTo(38, -3, 34, 3, 30, 8);
      ctx.bezierCurveTo(25, 12, 20, 16, 14, 20);
      ctx.bezierCurveTo(10, 12, 6, 6, 2, 2);
      ctx.closePath();

      ctx.fillStyle = '#c51b29';
      ctx.fill();

      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 3.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(2, 2);
      ctx.lineTo(10, -20);
      ctx.bezierCurveTo(20, -22, 32, -18, 42, -10);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(10, -20);
      ctx.lineTo(9, -29);
      ctx.stroke();

      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(10, -20);
      ctx.lineTo(30, 8);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(10, -20);
      ctx.lineTo(14, 20);
      ctx.stroke();

      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(42, -10);
      ctx.bezierCurveTo(38, -3, 34, 3, 30, 8);
      ctx.bezierCurveTo(25, 12, 20, 16, 14, 20);
      ctx.bezierCurveTo(10, 12, 6, 6, 2, 2);
      ctx.stroke();

      ctx.restore();
    });
    return;
  }
}

function drawEyeThumb(canvasEl, eyeId) {
  const ctx = canvasEl.getContext('2d');
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  texGen.drawSingleEye(ctx, 25, 28, -1, eyeId, 'none', '#18181b', 0.36);
  texGen.drawSingleEye(ctx, 65, 28, 1, eyeId, 'none', '#18181b', 0.36);
}

function drawMouthThumb(canvasEl, mouthId) {
  const ctx = canvasEl.getContext('2d');
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  texGen.drawNoseMouthShape(ctx, 45, 20, mouthId, '#18181b', 0.65);
}

function activateTab(tabId) {
  const tabBtns = document.querySelectorAll('#categoryTabs .nav-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');
  tabBtns.forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
  tabPanes.forEach((p) => p.classList.toggle('active', p.id === tabId));
}

// ============================================================================
// UI 초기화 및 이벤트 바인딩
// ============================================================================
function initUI() {
  // 캐릭터 이름 입력 바 바인딩
  const inputCharName = document.getElementById('inputCharacterName');
  inputCharName?.addEventListener('input', (e) => {
    const val = e.target.value;
    state.characterName = val;
    if (isStudioMode && studioActors[activeStudioActorIndex]) {
      const actor = studioActors[activeStudioActorIndex];
      actor.label = val.trim() || `캐릭터 #${activeStudioActorIndex + 1}`;
      if (actor.state) {
        actor.state.characterName = val;
      }
      const actorInputs = document.querySelectorAll('#studioActorList .actor-name-input');
      if (actorInputs[activeStudioActorIndex]) {
        actorInputs[activeStudioActorIndex].value = actor.label;
      }
    }
    schedulePersistState();
  });

  // 카테고리 탭 전환 (단순 탭 이동 시에는 스튜디오 모드를 자동 활성화하지 않음)
  const tabBtns = document.querySelectorAll('#categoryTabs .nav-tab');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      activateTab(targetTab);
      if (targetTab === 'tab-studio') {
        syncStudioStatusUI();
        renderStudioActorList();
      }
    });
  });

  // 귀 15종 그리드
  const earGrid = document.getElementById('earGrid');
  EAR_TYPES.forEach((item) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'part-card';
    card.dataset.id = item.id;

    const c = document.createElement('canvas');
    c.width = 90;
    c.height = 60;
    c.className = 'thumb-canvas';
    drawEarThumb(c, item.id);

    const label = document.createElement('span');
    label.className = 'part-title';
    label.textContent = item.name;

    card.append(c, label);
    card.addEventListener('click', () => {
      state.earType = item.id;
      syncUIFromState();
      rebuildCharacterMesh(true);
      pushHistory();
    });
    earGrid.appendChild(card);
  });

  // 꼬리 5종 그리드 (벡터 캔버스 썸네일 사용)
  const tailGrid = document.getElementById('tailGrid');
  TAIL_TYPES.forEach((item) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'part-card';
    card.dataset.id = item.id;

    const c = document.createElement('canvas');
    c.width = 90;
    c.height = 56;
    c.className = 'thumb-canvas';
    drawTailThumb(c, item.id);

    const label = document.createElement('span');
    label.className = 'part-title';
    label.textContent = item.name;

    card.append(c, label);
    card.addEventListener('click', () => {
      state.tailType = item.id;
      syncUIFromState();
      rebuildCharacterMesh(true);
      pushHistory();
    });
    tailGrid.appendChild(card);
  });

  // 날개 3종 그리드 (천사 날개, 악마 날개)
  const wingGrid = document.getElementById('wingGrid');
  if (wingGrid) {
    WING_TYPES.forEach((item) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'part-card';
      card.dataset.id = item.id;

      const c = document.createElement('canvas');
      c.width = 90;
      c.height = 56;
      c.className = 'thumb-canvas';
      drawWingThumb(c, item.id);

      const label = document.createElement('span');
      label.className = 'part-title';
      label.textContent = item.name;

      card.append(c, label);
      card.addEventListener('click', () => {
        state.wingType = item.id;
        syncUIFromState();
        rebuildCharacterMesh(true);
        pushHistory();
      });
      wingGrid.appendChild(card);
    });
  }

  // 눈 9종 그리드
  const eyeGrid = document.getElementById('eyeGrid');
  EYE_TYPES.forEach((item) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'part-card';
    card.dataset.id = item.id;

    const c = document.createElement('canvas');
    c.width = 90;
    c.height = 56;
    c.className = 'thumb-canvas';
    drawEyeThumb(c, item.id);

    const label = document.createElement('span');
    label.className = 'part-title';
    label.textContent = item.name;

    card.append(c, label);
    card.addEventListener('click', () => {
      state.eyeType = item.id;
      syncUIFromState();
      refreshTextureOnly();
      animator.triggerPoke();
      pushHistory();
    });
    eyeGrid.appendChild(card);
  });

  // 안광 (눈 하이라이트) 옵션
  buildChipGroup('eyeHighlightGrid', EYE_HIGHLIGHT_TYPES, 'eyeHighlightType', false);
  bindCheckbox('chkEyeHighlight', 'eyeHighlight', false);
  bindSlider('sliderEyeHighlightSize', 'eyeHighlightSize', 'valEyeHighlightSize', (v) => v.toFixed(2), false);

  // 속눈썹 옵션
  buildChipGroup('eyelashGrid', EYELASH_TYPES, 'eyelashType', false);

  // 눈썹 5종 (단일 선택)
  buildChipGroup('eyebrowGrid', EYEBROW_TYPES, 'eyebrowType', false);

  // 입 6종 그리드
  const mouthGrid = document.getElementById('mouthGrid');
  MOUTH_TYPES.forEach((item) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'part-card';
    card.dataset.id = item.id;

    const c = document.createElement('canvas');
    c.width = 90;
    c.height = 56;
    c.className = 'thumb-canvas';
    drawMouthThumb(c, item.id);

    const label = document.createElement('span');
    label.className = 'part-title';
    label.textContent = item.name;

    card.append(c, label);
    card.addEventListener('click', () => {
      const prevMouth = state.mouthType;
      state.mouthType = item.id;
      syncUIFromState();
      if (prevMouth === 'beak' || item.id === 'beak') {
        rebuildCharacterMesh(false);
      } else {
        refreshTextureOnly();
      }
      animator.triggerPoke();
      pushHistory();
    });
    mouthGrid.appendChild(card);
  });

  // 무늬(다중), 얼굴 꾸밈(다중), 홍조, 리본(다중), 추가 소품(다중), 모션 칩 그룹
  buildMultiChipGroup('patternGrid', PATTERN_TYPES, 'patterns', false);
  buildMultiChipGroup('faceDecoGrid', FACE_DECO_TYPES, 'faceDecos', false);
  buildChipGroup('blushGrid', BLUSH_TYPES, 'blushType', false);
  buildMultiChipGroup('ribbonGrid', RIBBON_TYPES, 'ribbons', true);
  buildMultiChipGroup('extraAccGrid', EXTRA_ACC_TYPES, 'extraAccessories', true);
  buildChipGroup('danceModeGrid', DANCE_MODES, 'danceMode', false, false);

  // 다중 점 & 다중 흉터 & 머리카락 더듬이 추가/삭제 버튼 바인딩
  initMoleControls();
  initScarControls();
  initAhogeControls();

  // 오드아이 타겟 관리 (왼쪽 눈 / 오른쪽 눈)
  let oddEyeTarget = 'left';
  const setOddEyeTarget = (target) => {
    oddEyeTarget = target;
    document.getElementById('btnOddLeft')?.classList.toggle('active', target === 'left');
    document.getElementById('btnOddRight')?.classList.toggle('active', target === 'right');
  };

  document.getElementById('btnOddLeft')?.addEventListener('click', () => {
    setOddEyeTarget('left');
  });

  document.getElementById('btnOddRight')?.addEventListener('click', () => {
    setOddEyeTarget('right');
  });

  document.getElementById('chkOddEye')?.addEventListener('change', (e) => {
    state.oddEye = e.target.checked;
    if (state.oddEye) {
      if (!state.eyeColorLeft) state.eyeColorLeft = state.eyeColor || '#18181b';
      if (!state.eyeColorRight) state.eyeColorRight = '#3b82f6';
    }
    syncUIFromState();
    refreshTextureOnly();
    pushHistory();
  });

  document.getElementById('chkEarColorCustom')?.addEventListener('change', (e) => {
    state.earColorCustom = e.target.checked;
    if (state.earColorCustom && !state.earColor) {
      state.earColor = state.bodyColor || '#ffffff';
    }
    syncUIFromState();
    refreshTextureOnly();
    pushHistory();
  });

  document.getElementById('chkArmColorCustom')?.addEventListener('change', (e) => {
    state.armColorCustom = e.target.checked;
    if (state.armColorCustom && !state.armColor) {
      state.armColor = state.bodyColor || '#ffffff';
    }
    syncUIFromState();
    refreshTextureOnly();
    pushHistory();
  });

  // 컬러 팔레트
  const updateOutlineColor = (col) => {
    state.outlineColor = col;
    if (currentCharacter?.outlineMesh) {
      currentCharacter.outlineMesh.material.color.set(col);
    }
    syncUIFromState();
    refreshTextureOnly();
  };

  buildColorPalette('paletteBody', COLOR_PALETTES.body, 'bodyColor');
  buildColorPalette('paletteInnerEar', COLOR_PALETTES.innerEar, 'innerEarColor');
  buildColorPalette('paletteEar', COLOR_PALETTES.body, 'earColor');
  buildColorPalette('paletteArm', COLOR_PALETTES.body, 'armColor');
  buildColorPalette('paletteEye', COLOR_PALETTES.eye, 'eyeColor', (hex) => {
    if (state.oddEye) {
      if (oddEyeTarget === 'right') {
        state.eyeColorRight = hex;
      } else {
        state.eyeColorLeft = hex;
      }
    }
    syncUIFromState();
    refreshTextureOnly();
    pushHistory();
  });
  buildColorPalette('paletteOutline', COLOR_PALETTES.outline, 'outlineColor', updateOutlineColor);
  buildColorPalette('paletteAccessory', COLOR_PALETTES.accent, 'accessoryColor');

  bindColorInput('pickerBodyColor', 'bodyColor');
  bindColorInput('pickerInnerEarColor', 'innerEarColor');
  bindColorInput('pickerEarColor', 'earColor');
  bindColorInput('pickerArmColor', 'armColor');
  bindColorInput('pickerEyeColor', 'eyeColor');
  bindColorInput('pickerEyeColorLeft', 'eyeColorLeft');
  bindColorInput('pickerEyeColorRight', 'eyeColorRight');
  bindColorInput('pickerNoseColor', 'noseMouthColor');
  bindColorInput('pickerOutlineColor', 'outlineColor', updateOutlineColor);
  bindColorInput('pickerPatternColor', 'patternColor');
  bindColorInput('pickerBellyColor', 'bellyColor');
  bindColorInput('pickerAntlerColor', 'antlerColor');
  bindColorInput('pickerBlushColor', 'blushColor');
  bindColorInput('pickerScarColor', 'scarColor');
  bindColorInput('pickerAccessoryColor', 'accessoryColor');
  bindColorInput('colorTailTip', 'tailTipColor');
  bindColorInput('pickerManeColor', 'maneColor');
  bindColorInput('pickerEyebrowColor', 'eyebrowColor');
  bindColorInput('pickerBeretColor', 'beretColor');
  bindColorInput('pickerStarPinColor', 'starPinColor');
  bindColorInput('pickerGlassesColor', 'glassesColor');
  bindColorInput('pickerSquareGlassesColor', 'squareGlassesColor');
  bindColorInput('pickerCrownColor', 'crownColor');
  bindColorInput('pickerDevilHornsColor', 'devilHornsColor');
  bindColorInput('pickerMonocleColor', 'monocleColor');

  // 새 부리 크기 / 상하 위치 (3D 메쉬 재생성)
  bindSlider('sliderBeakSize', 'beakSize', 'valBeakSize', (v) => v.toFixed(2), true);
  bindSlider('sliderBeakY', 'beakY', 'valBeakY', (v) => v.toFixed(2), true);

  const handleBeakColorInput = (hex) => {
    state.beakColor = hex;
    const el = document.getElementById('pickerBeakColor');
    if (el && el.value !== hex) el.value = hex;
    refreshTextureOnly();
  };

  const pickerBeakColorEl = document.getElementById('pickerBeakColor');
  pickerBeakColorEl?.addEventListener('input', (e) => handleBeakColorInput(e.target.value));
  pickerBeakColorEl?.addEventListener('change', () => pushHistory());

  const handleBeakFollowBody = (checked) => {
    state.beakFollowBody = checked;
    syncUIFromState();
    refreshTextureOnly();
    pushHistory();
  };

  document.getElementById('chkBeakFollowBody')?.addEventListener('change', (e) => handleBeakFollowBody(e.target.checked));

  bindCheckbox('chkTailTip', 'tailTipEnabled', true);
  bindCheckbox('chkBellyPatch', 'bellyPatch', true);
  bindCheckbox('chkLowPolyFlat', 'lowPolyFlat', true);
  bindCheckbox('chkOutline', 'outlineEnabled', true);

  bindSlider('sliderEyebrowScale', 'eyebrowScale', 'valEyebrowScale', (v) => v.toFixed(2), false);
  bindSlider('sliderEyebrowY', 'eyebrowY', 'valEyebrowY', (v) => v.toFixed(2), false);
  bindSlider('sliderEyebrowSpacing', 'eyebrowSpacing', 'valEyebrowSpacing', (v) => v.toFixed(2), false);
  bindSlider('sliderBlushScale', 'blushScale', 'valBlushScale', (v) => v.toFixed(2), false);
  bindSlider('sliderBlushOpacity', 'blushOpacity', 'valBlushOpacity', (v) => `${Math.round(v * 100)}%`, false);
  bindSlider('sliderRibbonScale', 'ribbonScale', 'valRibbonScale', (v) => v.toFixed(2), true);
  bindSlider('sliderOutline', 'outlineThickness', 'valOutline', (v) => v.toFixed(3), true);
  bindSlider('sliderHeadScale', 'headScale', 'valHeadScale', (v) => v.toFixed(2), true);
  bindSlider('sliderBodyChubby', 'bodyChubby', 'valBodyChubby', (v) => v.toFixed(2), true);
  bindSlider('sliderLegLength', 'legLength', 'valLegLength', (v) => v.toFixed(2), true);
  bindSlider('sliderDanceSpeed', 'danceSpeed', 'valDanceSpeed', (v) => `${v.toFixed(1)}x`, false);

  document.querySelectorAll('#polyDetailGrid .chip-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.polyDetail = btn.dataset.poly;
      syncUIFromState();
      rebuildCharacterMesh(false);
      pushHistory();
    });
  });

  // 헤더 파일 불러오기 / 프로젝트 저장(.json) / 스튜디오 모드 토글
  const inputCharFile = document.getElementById('inputCharacterFile');
  document.getElementById('btnImportCharacter')?.addEventListener('click', () => {
    if (inputCharFile) {
      inputCharFile.value = '';
      inputCharFile.click();
    }
  });
  inputCharFile?.addEventListener('change', (e) => {
    handleCharacterFilesImport(e.target.files, false);
  });

  document.getElementById('btnExportJson')?.addEventListener('click', () => {
    exportCharacterJson(state, `${getExportFilePrefix()}_project.json`);
  });

  document.getElementById('btnUndo')?.addEventListener('click', undo);
  document.getElementById('btnRedo')?.addEventListener('click', redo);

  document.getElementById('btnToggleStudio')?.addEventListener('click', () => {
    if (!isStudioMode) {
      setStudioMode(true, true);
    } else {
      setStudioMode(false, false);
    }
  });

  document.getElementById('btnExitStudioBadge')?.addEventListener('click', () => {
    setStudioMode(false, false);
  });

  // 스튜디오 탭 내부 컨트롤 바인딩
  initStudioControls();

  // 배경 & 맞춤 녹화 컨트롤 바인딩
  initRecordAndBgControls();

  document.getElementById('btnRandom').addEventListener('click', () => {
    randomizeCharacter();
    pushHistory();
  });
  document.getElementById('btnResetCharacter').addEventListener('click', () => {
    if (confirm('캐릭터를 처음 기본 상태로 초기화할까요?')) {
      Object.assign(state, structuredClone(DEFAULT_STATE));
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (_) {}
      syncUIFromState();
      rebuildCharacterMesh(true);
      persistStateNow();
      pushHistory();
    }
  });

  document.getElementById('btnCamReset').addEventListener('click', () => {
    if (isStudioMode && studioActors.length >= 2) {
      camera.position.set(0, 1.42, 5.65);
      controls.target.set(0, 1.05, 0);
    } else {
      camera.position.set(0, 1.18, 3.85);
      controls.target.set(0, 1.02, 0);
    }
    controls.update();
  });

  document.getElementById('btnQuickDance').addEventListener('click', () => {
    const order = ['idle', 'happy_dance', 'bounce', 'tail_wag', 'jump_spin', 'step_dance'];
    const nextIdx = (order.indexOf(state.danceMode) + 1) % order.length;
    state.danceMode = order[nextIdx];
    syncUIFromState();
  });

  document.getElementById('btnSnapPng').addEventListener('click', captureSnapshotPng);

  // VMD & FBX 통합 모션 드롭존
  initMotionDropzone();

  document.getElementById('btnExportPmx').addEventListener('click', async () => {
    if (!currentCharacter) return;
    showBusy('MMD 모델(.pmx + 텍스처 + 프로젝트 데이터) 생성 중…');
    animator.resetPose();
    try {
      await exportMmdZip(
        currentCharacter.skinnedMesh,
        currentCharacter.boneWorldPositions,
        textureCanvas,
        `${getExportFilePrefix()}_mmd.zip`,
        state
      );
    } catch (err) {
      console.error('MMD 내보내기 실패:', err);
      alert('MMD 모델 내보내기 중 오류가 발생했습니다: ' + (err.message || ''));
    } finally {
      hideBusy();
    }
  });

  document.getElementById('btnExportGlb').addEventListener('click', () => {
    if (!currentCharacter) return;
    showBusy('GLB 3D 모델 파일 생성 중…');
    animator.resetPose();
    try {
      exportGlbFile(currentCharacter.rootGroup, `${getExportFilePrefix()}.glb`, state);
    } catch (err) {
      console.error('GLB 내보내기 실패:', err);
      alert('GLB 모델 내보내기 중 오류가 발생했습니다: ' + (err.message || ''));
    } finally {
      setTimeout(hideBusy, 400);
    }
  });

  document.getElementById('btnRecordVideo').addEventListener('click', startCustomRecording);

  applyBackgroundMode();
  updateRecordButtonLabels();
  syncStudioStatusUI();
  renderStudioActorList();
  syncUIFromState();
  initMediaModal();

  // 다국어(i18n) 설정 및 변경 이벤트 리스너 바인딩
  document.getElementById('selectLanguage')?.addEventListener('change', (e) => {
    setLanguage(e.target.value);
  });

  onLanguageChange(() => {
    // 1) 카테고리 탭 텍스트 갱신
    const tabMap = {
      'tab-ears-tail': 'tab_ears_tail',
      'tab-face': 'tab_features',
      'tab-colors': 'tab_colors',
      'tab-deco': 'tab_accessories',
      'tab-style': 'tab_body',
      'tab-dance': 'tab_motion_export',
      'tab-studio': 'tab_studio',
    };
    document.querySelectorAll('#categoryTabs .nav-tab').forEach((tab) => {
      const key = tabMap[tab.dataset.tab];
      if (key) tab.textContent = t(key);
    });

    // 2) 썸네일 카드 라벨 갱신
    document.querySelectorAll('#earGrid .part-card').forEach((c) => {
      const title = c.querySelector('.part-title');
      if (title) title.textContent = getPartName('ear', c.dataset.id);
    });
    document.querySelectorAll('#tailGrid .part-card').forEach((c) => {
      const title = c.querySelector('.part-title');
      if (title) title.textContent = getPartName('tail', c.dataset.id);
    });
    document.querySelectorAll('#wingGrid .part-card').forEach((c) => {
      const title = c.querySelector('.part-title');
      if (title) title.textContent = getPartName('wing', c.dataset.id);
    });
    document.querySelectorAll('#eyeGrid .part-card').forEach((c) => {
      const title = c.querySelector('.part-title');
      if (title) title.textContent = getPartName('eye', c.dataset.id);
    });
    document.querySelectorAll('#mouthGrid .part-card').forEach((c) => {
      const title = c.querySelector('.part-title');
      if (title) title.textContent = getPartName('mouth', c.dataset.id);
    });

    // 3) 칩 버튼 라벨 갱신
    const updateChips = (gridId, prefix) => {
      document.querySelectorAll(`#${gridId} .chip-btn`).forEach((b) => {
        const id = b.dataset.id || b.dataset.poly;
        if (id) b.textContent = getPartName(prefix, id);
      });
    };
    updateChips('eyeHighlightGrid', 'hl');
    updateChips('eyelashGrid', 'eyelash');
    updateChips('eyebrowGrid', 'eyebrow');
    updateChips('patternGrid', 'pattern');
    updateChips('faceDecoGrid', 'face');
    updateChips('blushGrid', 'blush');
    updateChips('ribbonGrid', 'ribbon');
    updateChips('extraAccGrid', 'acc');
    updateChips('danceModeGrid', 'dance');
    updateChips('polyDetailGrid', 'poly');

    // 4) 점 & 흉터 버튼 라벨 갱신
    const btnAddMole = document.getElementById('btnAddMole');
    if (btnAddMole) btnAddMole.textContent = t('btn_add_mole');
    const btnAddTear = document.getElementById('btnAddTearMole');
    if (btnAddTear) btnAddTear.textContent = t('btn_tear_mole');
    const btnAddMouth = document.getElementById('btnAddMouthMole');
    if (btnAddMouth) btnAddMouth.textContent = t('btn_mouth_mole');
    const btnClearMoles = document.getElementById('btnClearMoles');
    if (btnClearMoles) btnClearMoles.textContent = t('btn_clear_all');

    const btnAddSlash = document.getElementById('btnAddSlashScar');
    if (btnAddSlash) btnAddSlash.textContent = getPartName('scar', 'slash');
    const btnAddStitch = document.getElementById('btnAddStitchScar');
    if (btnAddStitch) btnAddStitch.textContent = getPartName('scar', 'stitch');
    const btnAddCross = document.getElementById('btnAddCrossScar');
    if (btnAddCross) btnAddCross.textContent = getPartName('scar', 'cross');
    const btnAddDouble = document.getElementById('btnAddDoubleScar');
    if (btnAddDouble) btnAddDouble.textContent = getPartName('scar', 'double_slash');
    const btnAddBurn = document.getElementById('btnAddBurnScar');
    if (btnAddBurn) btnAddBurn.textContent = getPartName('scar', 'burn');
    const btnClearScars = document.getElementById('btnClearScars');
    if (btnClearScars) btnClearScars.textContent = t('btn_clear_all');

    // 5) 동적 카드 및 라벨 재렌더링
    renderMoleList();
    renderScarList();
    renderAhogeList();
    renderFaceDecoControls();
    renderStudioActorList();
    updateRecordButtonLabels();
    syncStudioStatusUI();
    syncUIFromState();
  });

  initI18n();

  // 실행 취소(되돌리기) / 다시 실행 버튼 및 단축키 바인딩
  document.getElementById('btnUndo')?.addEventListener('click', undo);
  document.getElementById('btnRedo')?.addEventListener('click', redo);

  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isInputText =
      activeEl &&
      (activeEl.tagName === 'TEXTAREA' ||
        (activeEl.tagName === 'INPUT' && (activeEl.type === 'text' || activeEl.type === 'search')));
    if (isInputText) return;

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      undo();
    } else if (
      (e.ctrlKey || e.metaKey) &&
      ((e.key === 'y' || e.key === 'Y') || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))
    ) {
      e.preventDefault();
      redo();
    }
  });

  pushHistory();
}

function initStudioControls() {
  document.getElementById('chkStudioActive')?.addEventListener('change', (e) => {
    setStudioMode(e.target.checked, false);
  });

  document.getElementById('btnStudioAddCurrent')?.addEventListener('click', () => {
    if (!isStudioMode) return;
    const customLabel = (state.characterName || '').trim() || `캐릭터 #${studioActors.length + 1}`;
    createStudioActorFromState(state, customLabel);
  });

  const inputStudioFiles = document.getElementById('inputStudioFiles');
  document.getElementById('btnStudioAddFile')?.addEventListener('click', () => {
    if (inputStudioFiles) {
      inputStudioFiles.value = '';
      inputStudioFiles.click();
    }
  });
  inputStudioFiles?.addEventListener('change', (e) => {
    handleCharacterFilesImport(e.target.files, true);
  });

  document.getElementById('btnStudioLine')?.addEventListener('click', () => arrangeStudioFormation('line'));
  document.getElementById('btnStudioVForm')?.addEventListener('click', () => arrangeStudioFormation('vform'));
  document.getElementById('btnStudioCircle')?.addEventListener('click', () => arrangeStudioFormation('circle'));
  document.getElementById('btnStudioSyncTime')?.addEventListener('click', syncAllStudioAnimatorsTime);

  document.getElementById('btnStudioQuickRecord')?.addEventListener('click', startCustomRecording);
  document.getElementById('btnStudioGoMotionTab')?.addEventListener('click', () => {
    activateTab('tab-dance');
  });
}

function initRecordAndBgControls() {
  // 포맷 선택 (GIF / WebM)
  document.querySelectorAll('#recordFormatGrid .chip-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      recordConfig.format = btn.dataset.format;
      updateRecordButtonLabels();
    });
  });

  // 녹화 시간 슬라이더 & 숫자 입력 연동
  const sliderDur = document.getElementById('sliderRecordDuration');
  const inputDur = document.getElementById('inputRecordDuration');
  const setDuration = (val) => {
    const clamped = Math.max(1.0, Math.min(15.0, Math.round(val * 2) / 2));
    recordConfig.duration = clamped;
    updateRecordButtonLabels();
  };
  sliderDur?.addEventListener('input', (e) => setDuration(parseFloat(e.target.value) || 4.0));
  inputDur?.addEventListener('change', (e) => setDuration(parseFloat(e.target.value) || 4.0));

  // 배경 모드 선택 (단색 / 투명 / 그리드)
  document.querySelectorAll('#bgModeGrid .chip-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextMode = btn.dataset.bg;
      recordConfig.bgMode = nextMode;
      if (nextMode === 'transparent') {
        recordConfig.showFloor = false;
      } else if (nextMode === 'solid' || nextMode === 'grid') {
        recordConfig.showFloor = true;
      }
      applyBackgroundMode();
      updateRecordButtonLabels();
    });
  });

  // 배경 단색 컬러 피커 및 스와치
  const pickerBg = document.getElementById('pickerRecordBgColor');
  pickerBg?.addEventListener('input', (e) => {
    recordConfig.bgColor = e.target.value;
    if (recordConfig.bgMode !== 'solid') {
      recordConfig.bgMode = 'solid';
    }
    applyBackgroundMode();
    updateRecordButtonLabels();
  });

  const bgPaletteContainer = document.getElementById('paletteRecordBg');
  if (bgPaletteContainer) {
    BG_SWATCH_COLORS.forEach((hex) => {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'color-swatch';
      sw.style.backgroundColor = hex;
      sw.title = `배경색 ${hex}`;
      sw.addEventListener('click', () => {
        recordConfig.bgColor = hex;
        recordConfig.bgMode = 'solid';
        applyBackgroundMode();
        updateRecordButtonLabels();
      });
      bgPaletteContainer.appendChild(sw);
    });
  }

  // 바닥 그림자 원판 표시 여부
  const chkFloor = document.getElementById('chkShowFloor');
  chkFloor?.addEventListener('change', (e) => {
    recordConfig.showFloor = e.target.checked;
    applyBackgroundMode();
    updateRecordButtonLabels();
  });
}

function buildChipGroup(containerId, items, stateKey, needsGeometryRebuild, triggerPoke = true) {
  const container = document.getElementById(containerId);
  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip-btn';
    btn.dataset.id = item.id;
    btn.textContent = item.name;
    btn.addEventListener('click', () => {
      state[stateKey] = item.id;
      syncUIFromState();
      if (needsGeometryRebuild) {
        rebuildCharacterMesh(triggerPoke);
      } else {
        refreshTextureOnly();
        if (triggerPoke) animator.triggerPoke();
      }
      pushHistory();
    });
    container.appendChild(btn);
  });
}

// 다중 선택을 지원하는 칩 그룹 (리본 장식, 추가 소품 등 여러 개 동시 착용 가능)
function buildMultiChipGroup(containerId, items, stateArrayKey, needsGeometryRebuild) {
  const container = document.getElementById(containerId);
  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip-btn';
    btn.dataset.id = item.id;
    btn.textContent = item.name;
    btn.addEventListener('click', () => {
      const hadTwoTone = stateArrayKey === 'patterns' && Boolean(state.patterns?.includes('two_tone'));
      if (!Array.isArray(state[stateArrayKey])) {
        state[stateArrayKey] = [];
      }
      if (item.id === 'none') {
        state[stateArrayKey] = [];
      } else {
        const idx = state[stateArrayKey].indexOf(item.id);
        if (idx >= 0) {
          state[stateArrayKey].splice(idx, 1);
        } else {
          state[stateArrayKey].push(item.id);
        }
      }
      if (stateArrayKey === 'patterns') {
        state.patternType = state.patterns[0] || 'none';
      }
      syncUIFromState();
      const hasTwoTone = stateArrayKey === 'patterns' && Boolean(state.patterns?.includes('two_tone'));
      if (needsGeometryRebuild || (stateArrayKey === 'patterns' && hadTwoTone !== hasTwoTone)) {
        rebuildCharacterMesh(true);
      } else {
        refreshTextureOnly();
      }
      pushHistory();
    });
    container.appendChild(btn);
  });
}

// 다중 점 추가/삭제 및 개별 점 컨트롤 렌더링
function initMoleControls() {
  const addMole = (preset) => {
    if (!Array.isArray(state.moles)) state.moles = [];
    state.moles.push({
      id: `mole_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: preset.x,
      y: preset.y,
      size: preset.size ?? 1.0,
      mirror: Boolean(preset.mirror),
    });
    renderMoleList();
    refreshTextureOnly();
    pushHistory();
  };

  document.getElementById('btnAddMole')?.addEventListener('click', () => {
    const count = (state.moles || []).length;
    const offset = (count % 4) * 0.08;
    addMole({ x: +(0.30 - offset).toFixed(2), y: +(-0.16 - offset * 0.5).toFixed(2), size: 1.0, mirror: false });
  });

  document.getElementById('btnAddTearMole')?.addEventListener('click', () => {
    addMole({ x: 0.42, y: -0.18, size: 0.9, mirror: false });
  });

  document.getElementById('btnAddMouthMole')?.addEventListener('click', () => {
    addMole({ x: 0.16, y: -0.22, size: 0.85, mirror: false });
  });

  document.getElementById('btnClearMoles')?.addEventListener('click', () => {
    state.moles = [];
    renderMoleList();
    refreshTextureOnly();
    pushHistory();
  });
}

function renderMoleList() {
  const container = document.getElementById('moleListContainer');
  if (!container) return;
  container.innerHTML = '';

  const moles = Array.isArray(state.moles) ? state.moles : [];
  const lang = getLanguage();
  if (moles.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'mole-empty-msg';
    empty.textContent = lang === 'ko'
      ? '현재 추가된 점이 없습니다. 상단 점 추가 버튼을 눌러 원하는 개수만큼 추가하세요.'
      : t('empty_moles');
    container.appendChild(empty);
    return;
  }

  moles.forEach((mole, idx) => {
    const card = document.createElement('div');
    card.className = 'mole-item-card';

    const head = document.createElement('div');
    head.className = 'mole-item-head';
    const title = document.createElement('span');
    title.textContent = lang === 'ko' ? `점 #${idx + 1}` : `${t('sec_mole')} #${idx + 1}`;

    const rightControls = document.createElement('div');
    rightControls.style.display = 'flex';
    rightControls.style.alignItems = 'center';
    rightControls.style.gap = '10px';

    const mirrorLabel = document.createElement('label');
    mirrorLabel.className = 'check-label';
    mirrorLabel.style.fontSize = '0.76rem';
    const mirrorChk = document.createElement('input');
    mirrorChk.type = 'checkbox';
    mirrorChk.checked = Boolean(mole.mirror);
    mirrorChk.addEventListener('change', (e) => {
      mole.mirror = e.target.checked;
      refreshTextureOnly();
      pushHistory();
    });
    const mirrorSpan = document.createElement('span');
    mirrorSpan.textContent = lang === 'ko' ? '좌우 대칭' : t('label_mirror');
    mirrorLabel.append(mirrorChk, mirrorSpan);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'mole-remove-btn';
    removeBtn.textContent = lang === 'ko' ? '삭제' : t('btn_delete');
    removeBtn.addEventListener('click', () => {
      state.moles.splice(idx, 1);
      renderMoleList();
      refreshTextureOnly();
      pushHistory();
    });

    rightControls.append(mirrorLabel, removeBtn);
    head.append(title, rightControls);
    card.appendChild(head);

    const makeRow = (labelText, min, max, step, val, onChange) => {
      const row = document.createElement('div');
      row.className = 'slider-item';
      const lbl = document.createElement('label');
      lbl.textContent = labelText;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = min;
      input.max = max;
      input.step = step;
      input.value = val;
      const valSpan = document.createElement('span');
      valSpan.textContent = Number(val).toFixed(2);
      input.addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        valSpan.textContent = num.toFixed(2);
        onChange(num);
        refreshTextureOnly();
      });
      input.addEventListener('change', () => {
        pushHistory();
      });
      row.append(lbl, input, valSpan);
      return row;
    };

    card.appendChild(makeRow(lang === 'ko' ? '가로 위치 (X)' : t('label_pos_x'), -0.85, 0.85, 0.02, mole.x ?? 0.32, (v) => { mole.x = v; }));
    card.appendChild(makeRow(lang === 'ko' ? '세로 위치 (Y)' : t('label_pos_y'), -0.65, 0.65, 0.02, mole.y ?? -0.18, (v) => { mole.y = v; }));
    card.appendChild(makeRow(lang === 'ko' ? '점 크기' : t('label_mole_size'), 0.4, 2.2, 0.1, mole.size ?? 1.0, (v) => { mole.size = v; }));

    container.appendChild(card);
  });
}

// 다중 흉터 추가/삭제 및 개별 흉터 컨트롤 렌더링
function initScarControls() {
  const addScar = (preset) => {
    if (!Array.isArray(state.scars)) state.scars = [];
    state.scars.push({
      id: `scar_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: preset.type || 'slash',
      x: preset.x ?? -0.40,
      y: preset.y ?? -0.04,
      size: preset.size ?? 1.0,
      angle: preset.angle ?? -12,
      mirror: Boolean(preset.mirror),
    });
    renderScarList();
    refreshTextureOnly();
    pushHistory();
  };

  document.getElementById('btnAddSlashScar')?.addEventListener('click', () => {
    const count = (state.scars || []).length;
    const offset = (count % 3) * 0.12;
    addScar({ type: 'slash', x: +(-0.42 + offset).toFixed(2), y: +(-0.02 - offset * 0.5).toFixed(2), size: 1.0, angle: -12 });
  });

  document.getElementById('btnAddStitchScar')?.addEventListener('click', () => {
    addScar({ type: 'stitch', x: 0.36, y: -0.22, size: 1.0, angle: 35 });
  });

  document.getElementById('btnAddCrossScar')?.addEventListener('click', () => {
    addScar({ type: 'cross', x: -0.36, y: -0.22, size: 0.95, angle: 0 });
  });

  document.getElementById('btnAddDoubleScar')?.addEventListener('click', () => {
    addScar({ type: 'double_slash', x: 0.40, y: -0.18, size: 0.95, angle: -20 });
  });

  document.getElementById('btnAddBurnScar')?.addEventListener('click', () => {
    addScar({ type: 'burn', x: -0.38, y: 0.02, size: 1.15, angle: 0 });
  });

  document.getElementById('btnClearScars')?.addEventListener('click', () => {
    state.scars = [];
    renderScarList();
    refreshTextureOnly();
    pushHistory();
  });
}

function renderScarList() {
  const container = document.getElementById('scarListContainer');
  if (!container) return;
  container.innerHTML = '';

  const scars = Array.isArray(state.scars) ? state.scars : [];
  const lang = getLanguage();
  if (scars.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'mole-empty-msg';
    empty.textContent = lang === 'ko'
      ? '현재 추가된 흉터가 없습니다. 상단 흉터 버튼을 눌러 원하는 위치와 모양으로 추가하세요.'
      : t('empty_scars');
    container.appendChild(empty);
    return;
  }

  const scarTypeLabels = {
    slash: '일자 흉터',
    stitch: '바늘땀 흉터',
    cross: '십자 흉터',
    double_slash: '두 줄 흉터',
    burn: '화상 흉터',
  };

  scars.forEach((scar, idx) => {
    const card = document.createElement('div');
    card.className = 'mole-item-card';

    const head = document.createElement('div');
    head.className = 'mole-item-head';
    const title = document.createElement('span');
    const scarLabel = lang === 'ko'
      ? (scarTypeLabels[scar.type] || '일자 흉터')
      : getPartName('scar', scar.type, scarTypeLabels[scar.type] || '일자 흉터');
    title.textContent = lang === 'ko'
      ? `흉터 #${idx + 1} (${scarLabel})`
      : `${t('sec_scar')} #${idx + 1} (${scarLabel})`;

    const rightControls = document.createElement('div');
    rightControls.style.display = 'flex';
    rightControls.style.alignItems = 'center';
    rightControls.style.gap = '10px';

    const mirrorLabel = document.createElement('label');
    mirrorLabel.className = 'check-label';
    mirrorLabel.style.fontSize = '0.76rem';
    const mirrorChk = document.createElement('input');
    mirrorChk.type = 'checkbox';
    mirrorChk.checked = Boolean(scar.mirror);
    mirrorChk.addEventListener('change', (e) => {
      scar.mirror = e.target.checked;
      refreshTextureOnly();
      pushHistory();
    });
    const mirrorSpan = document.createElement('span');
    mirrorSpan.textContent = lang === 'ko' ? '좌우 대칭' : t('label_mirror');
    mirrorLabel.append(mirrorChk, mirrorSpan);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'mole-remove-btn';
    removeBtn.textContent = lang === 'ko' ? '삭제' : t('btn_delete');
    removeBtn.addEventListener('click', () => {
      state.scars.splice(idx, 1);
      renderScarList();
      refreshTextureOnly();
      pushHistory();
    });

    rightControls.append(mirrorLabel, removeBtn);
    head.append(title, rightControls);
    card.appendChild(head);

    const makeRow = (labelText, min, max, step, val, fmtFn, onChange) => {
      const row = document.createElement('div');
      row.className = 'slider-item';
      const lbl = document.createElement('label');
      lbl.textContent = labelText;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = min;
      input.max = max;
      input.step = step;
      input.value = val;
      const valSpan = document.createElement('span');
      valSpan.textContent = fmtFn(Number(val));
      input.addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        valSpan.textContent = fmtFn(num);
        onChange(num);
        refreshTextureOnly();
      });
      input.addEventListener('change', () => {
        pushHistory();
      });
      row.append(lbl, input, valSpan);
      return row;
    };

    card.appendChild(
      makeRow(lang === 'ko' ? '가로 위치 (X)' : t('label_pos_x'), -1.2, 1.2, 0.02, scar.x ?? -0.40, (v) => v.toFixed(2), (v) => {
        scar.x = v;
      })
    );
    card.appendChild(
      makeRow(lang === 'ko' ? '세로 위치 (Y)' : t('label_pos_y'), -0.65, 0.65, 0.02, scar.y ?? -0.04, (v) => v.toFixed(2), (v) => {
        scar.y = v;
      })
    );
    card.appendChild(
      makeRow(lang === 'ko' ? '흉터 크기' : t('label_scar_size'), 0.4, 2.2, 0.1, scar.size ?? 1.0, (v) => v.toFixed(2), (v) => {
        scar.size = v;
      })
    );
    card.appendChild(
      makeRow(lang === 'ko' ? '기울기 각도' : t('label_angle'), -90, 90, 5, scar.angle ?? -12, (v) => `${Math.round(v)}°`, (v) => {
        scar.angle = v;
      })
    );

    container.appendChild(card);
  });
}

// 머리카락 더듬이 (바보털) 추가/삭제 및 개별 더듬이 컨트롤 렌더링
function initAhogeControls() {
  const addAhoge = (preset) => {
    if (!Array.isArray(state.ahoges)) state.ahoges = [];
    state.ahoges.push({
      id: `ahoge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: preset.x ?? 0.0,
      z: preset.z ?? 0.05,
      size: preset.size ?? 1.0,
      thickness: preset.thickness ?? 1.0,
      angle: preset.angle ?? 10,
      rotation: preset.rotation ?? 0,
      curve: preset.curve ?? 0.65,
      mirror: Boolean(preset.mirror),
    });
    renderAhogeList();
    rebuildCharacterMesh(false);
    pushHistory();
  };

  document.getElementById('btnAddAhoge')?.addEventListener('click', () => {
    const count = (state.ahoges || []).length;
    const offset = (count % 3) * 0.03;
    addAhoge({ x: +(0.0 + offset).toFixed(2), z: 0.05, size: 1.0, thickness: 1.0, angle: 10, rotation: 0, curve: 0.65, mirror: false });
  });

  document.getElementById('btnAddAhogeTwin')?.addEventListener('click', () => {
    addAhoge({ x: 0.04, z: 0.05, size: 0.9, thickness: 0.95, angle: 18, rotation: 0, curve: 0.60, mirror: true });
  });

  document.getElementById('btnAddAhogeThin')?.addEventListener('click', () => {
    addAhoge({ x: 0.0, z: 0.05, size: 1.0, thickness: 0.6, angle: 10, rotation: 0, curve: 0.70, mirror: false });
  });

  document.getElementById('btnClearAhoges')?.addEventListener('click', () => {
    state.ahoges = [];
    renderAhogeList();
    rebuildCharacterMesh(false);
    pushHistory();
  });

  const pickerAhogeColor = document.getElementById('pickerAhogeColor');
  pickerAhogeColor?.addEventListener('input', (e) => {
    state.ahogeColor = e.target.value;
    refreshTextureOnly();
  });
  pickerAhogeColor?.addEventListener('change', () => {
    pushHistory();
  });

  const chkAhogeFollowBody = document.getElementById('chkAhogeFollowBody');
  chkAhogeFollowBody?.addEventListener('change', (e) => {
    state.ahogeFollowBody = e.target.checked;
    if (pickerAhogeColor) {
      pickerAhogeColor.disabled = state.ahogeFollowBody;
    }
    refreshTextureOnly();
    pushHistory();
  });
}

function renderAhogeList() {
  const container = document.getElementById('ahogeListContainer');
  if (!container) return;
  container.innerHTML = '';

  const ahoges = Array.isArray(state.ahoges) ? state.ahoges : [];
  const lang = getLanguage();
  if (ahoges.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'mole-empty-msg';
    empty.textContent = lang === 'ko'
      ? '현재 추가된 더듬이가 없습니다. 상단 더듬이 추가 버튼을 눌러 원하는 모양으로 추가하세요.'
      : t('empty_ahoges');
    container.appendChild(empty);
    return;
  }

  ahoges.forEach((ahoge, idx) => {
    const card = document.createElement('div');
    card.className = 'mole-item-card';

    const head = document.createElement('div');
    head.className = 'mole-item-head';
    const title = document.createElement('span');
    title.textContent = lang === 'ko'
      ? `더듬이 #${idx + 1}`
      : `${t('sec_ahoge')} #${idx + 1}`;

    const rightControls = document.createElement('div');
    rightControls.style.display = 'flex';
    rightControls.style.alignItems = 'center';
    rightControls.style.gap = '10px';

    const mirrorLabel = document.createElement('label');
    mirrorLabel.className = 'check-label';
    mirrorLabel.style.fontSize = '0.76rem';
    const mirrorChk = document.createElement('input');
    mirrorChk.type = 'checkbox';
    mirrorChk.checked = Boolean(ahoge.mirror);
    mirrorChk.addEventListener('change', (e) => {
      ahoge.mirror = e.target.checked;
      rebuildCharacterMesh(false);
      pushHistory();
    });
    const mirrorSpan = document.createElement('span');
    mirrorSpan.textContent = lang === 'ko' ? '좌우 대칭' : t('label_mirror');
    mirrorLabel.append(mirrorChk, mirrorSpan);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'mole-remove-btn';
    removeBtn.textContent = lang === 'ko' ? '삭제' : t('btn_delete');
    removeBtn.addEventListener('click', () => {
      state.ahoges.splice(idx, 1);
      renderAhogeList();
      rebuildCharacterMesh(false);
      pushHistory();
    });

    rightControls.append(mirrorLabel, removeBtn);
    head.append(title, rightControls);
    card.appendChild(head);

    const makeRow = (labelText, min, max, step, val, fmtFn, onChange) => {
      const row = document.createElement('div');
      row.className = 'slider-item';
      const lbl = document.createElement('label');
      lbl.textContent = labelText;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = min;
      input.max = max;
      input.step = step;
      input.value = val;
      const valSpan = document.createElement('span');
      valSpan.textContent = fmtFn(Number(val));
      input.addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        valSpan.textContent = fmtFn(num);
        onChange(num);
        rebuildCharacterMesh(false);
      });
      input.addEventListener('change', () => {
        pushHistory();
      });
      row.append(lbl, input, valSpan);
      return row;
    };

    // 1. 가로 위치 (X)
    card.appendChild(
      makeRow(lang === 'ko' ? '가로 위치 (X)' : t('label_pos_x'), -0.35, 0.35, 0.02, ahoge.x ?? 0.0, (v) => v.toFixed(2), (v) => {
        ahoge.x = v;
      })
    );
    // 2. 앞뒤 위치 (Z)
    card.appendChild(
      makeRow(lang === 'ko' ? '앞뒤 위치 (Z)' : t('label_pos_z'), -0.25, 0.25, 0.02, ahoge.z ?? 0.05, (v) => v.toFixed(2), (v) => {
        ahoge.z = v;
      })
    );
    // 3. 더듬이 크기
    card.appendChild(
      makeRow(lang === 'ko' ? '더듬이 크기' : t('label_ahoge_size'), 0.4, 2.2, 0.05, ahoge.size ?? 1.0, (v) => v.toFixed(2), (v) => {
        ahoge.size = v;
      })
    );
    // 4. 더듬이 두께
    card.appendChild(
      makeRow(lang === 'ko' ? '더듬이 두께' : t('label_ahoge_thickness'), 0.2, 6.0, 0.05, ahoge.thickness ?? 1.0, (v) => v.toFixed(2), (v) => {
        ahoge.thickness = v;
      })
    );
    // 5. 기울기 각도
    card.appendChild(
      makeRow(lang === 'ko' ? '기울기 각도' : t('label_angle'), -80, 80, 5, ahoge.angle ?? 10, (v) => `${Math.round(v)}°`, (v) => {
        ahoge.angle = v;
      })
    );
    // 6. 회전 각도 (수평 360도 회전)
    card.appendChild(
      makeRow(lang === 'ko' ? '회전 각도' : t('label_rotation'), -180, 180, 5, ahoge.rotation ?? 0, (v) => `${Math.round(v)}°`, (v) => {
        ahoge.rotation = v;
      })
    );
    // 7. 휘어짐 정도
    card.appendChild(
      makeRow(lang === 'ko' ? '휘어짐 정도' : t('label_ahoge_curve'), -1.0, 1.0, 0.05, ahoge.curve ?? 0.65, (v) => v.toFixed(2), (v) => {
        ahoge.curve = v;
      })
    );

    container.appendChild(card);
  });
}

function renderFaceDecoControls() {
  const container = document.getElementById('faceDecoControlsContainer');
  if (!container) return;
  container.innerHTML = '';

  const decos = Array.isArray(state.faceDecos) ? state.faceDecos.filter((d) => d && d !== 'none') : [];
  if (decos.length === 0) {
    return;
  }

  if (!state.faceDecoSettings || typeof state.faceDecoSettings !== 'object') {
    state.faceDecoSettings = {};
  }

  const decoNames = {
    whiskers: '수염',
    shadow: '그림자',
    sweat: '삐질',
    wrinkle: '주름',
    shock: '놀람',
    anger: '화남',
  };

  const lang = getLanguage();

  decos.forEach((type) => {
    if (!state.faceDecoSettings[type]) {
      state.faceDecoSettings[type] = { scale: 1.0, x: 0.0, y: 0.0 };
    }
    const cfg = state.faceDecoSettings[type];
    const name = lang === 'ko'
      ? (decoNames[type] || type)
      : getPartName('face', type, decoNames[type] || type);

    const card = document.createElement('div');
    card.className = 'mole-item-card';

    const head = document.createElement('div');
    head.className = 'mole-item-head';
    const title = document.createElement('span');
    title.textContent = lang === 'ko'
      ? `${name} 조절`
      : `${name} (${t('label_control')})`;

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'mole-remove-btn';
    resetBtn.textContent = lang === 'ko' ? '초기화' : t('btn_reset');
    resetBtn.addEventListener('click', () => {
      cfg.scale = 1.0;
      cfg.x = 0.0;
      cfg.y = 0.0;
      renderFaceDecoControls();
      refreshTextureOnly();
      pushHistory();
    });

    head.append(title, resetBtn);
    card.appendChild(head);

    if (type === 'shock') {
      const info = document.createElement('div');
      info.className = 'mole-empty-msg';
      info.style.padding = '8px 4px';
      info.style.textAlign = 'left';
      info.textContent = lang === 'ko'
        ? '눈 모양에 맞춰 자동으로 눈동자 안쪽에 흰색 영역이 생성됩니다.'
        : t('shock_desc');
      card.appendChild(info);
    } else {
      const makeRow = (labelText, min, max, step, val, onChange) => {
        const row = document.createElement('div');
        row.className = 'slider-item';
        const lbl = document.createElement('label');
        lbl.textContent = labelText;
        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = val;
        const valSpan = document.createElement('span');
        valSpan.textContent = Number(val).toFixed(2);
        input.addEventListener('input', (e) => {
          const num = parseFloat(e.target.value);
          valSpan.textContent = num.toFixed(2);
          onChange(num);
          refreshTextureOnly();
        });
        input.addEventListener('change', () => {
          pushHistory();
        });
        row.append(lbl, input, valSpan);
        return row;
      };

      card.appendChild(
        makeRow(lang === 'ko' ? '크기' : t('label_face_deco_scale'), 0.4, 2.5, 0.05, cfg.scale ?? 1.0, (v) => {
          cfg.scale = v;
        })
      );
      card.appendChild(
        makeRow(lang === 'ko' ? '좌우 위치' : t('label_face_deco_x'), -1.2, 1.2, 0.02, cfg.x ?? 0.0, (v) => {
          cfg.x = v;
        })
      );
      card.appendChild(
        makeRow(lang === 'ko' ? '상하 위치' : t('label_face_deco_y'), -1.2, 1.2, 0.02, cfg.y ?? 0.0, (v) => {
          cfg.y = v;
        })
      );
    }

    container.appendChild(card);
  });
}

function buildColorPalette(containerId, colors, stateKey, onCustomChange) {
  const container = document.getElementById(containerId);
  if (!container || !Array.isArray(colors)) return;
  container.innerHTML = '';
  colors.forEach((hex) => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'color-swatch';
    sw.style.backgroundColor = hex;
    sw.dataset.color = hex.toLowerCase();
    sw.addEventListener('click', () => {
      state[stateKey] = hex;
      syncUIFromState();
      if (onCustomChange) {
        onCustomChange(hex);
      } else {
        refreshTextureOnly();
      }
      pushHistory();
    });
    container.appendChild(sw);
  });
}

function bindColorInput(inputId, stateKey, onCustomChange) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.addEventListener('input', (e) => {
    state[stateKey] = e.target.value;
    syncUIFromState();
    if (onCustomChange) {
      onCustomChange(e.target.value);
    } else {
      refreshTextureOnly();
    }
  });
  el.addEventListener('change', () => {
    pushHistory();
  });
}

function bindCheckbox(chkId, stateKey, needsRebuild) {
  const el = document.getElementById(chkId);
  if (!el) return;
  el.addEventListener('change', (e) => {
    state[stateKey] = e.target.checked;
    syncUIFromState();
    if (needsRebuild) {
      rebuildCharacterMesh(false);
    } else {
      refreshTextureOnly();
    }
    pushHistory();
  });
}

function bindSlider(sliderId, stateKey, valId, formatFn, needsRebuild) {
  const el = document.getElementById(sliderId);
  const valEl = document.getElementById(valId);
  if (!el) return;
  el.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    state[stateKey] = v;
    if (valEl) valEl.textContent = formatFn(v);
    if (needsRebuild) {
      rebuildCharacterMesh(false);
    } else {
      refreshTextureOnly();
    }
  });
  el.addEventListener('change', () => {
    pushHistory();
  });
}

function syncUIFromState() {
  const markActive = (selector, currentVal, attr = 'id') => {
    document.querySelectorAll(selector).forEach((el) => {
      el.classList.toggle('active', el.dataset[attr] === currentVal);
    });
  };

  const markMultiActive = (selector, currentArr) => {
    const arr = Array.isArray(currentArr) ? currentArr : [];
    document.querySelectorAll(selector).forEach((el) => {
      const id = el.dataset.id;
      if (id === 'none') {
        el.classList.toggle('active', arr.length === 0);
      } else {
        el.classList.toggle('active', arr.includes(id));
      }
    });
  };

  markActive('#earGrid .part-card', state.earType);
  markActive('#tailGrid .part-card', state.tailType);
  markActive('#wingGrid .part-card', state.wingType || 'none');
  markActive('#eyeGrid .part-card', state.eyeType);
  markActive('#eyeHighlightGrid .chip-btn', state.eyeHighlightType || 'double');
  markActive('#eyelashGrid .chip-btn', state.eyelashType);
  markActive('#eyebrowGrid .chip-btn', state.eyebrowType);
  markActive('#mouthGrid .part-card', state.mouthType);
  markMultiActive('#patternGrid .chip-btn', state.patterns);
  markMultiActive('#faceDecoGrid .chip-btn', state.faceDecos);
  markActive('#blushGrid .chip-btn', state.blushType);
  markMultiActive('#ribbonGrid .chip-btn', state.ribbons);
  markMultiActive('#extraAccGrid .chip-btn', state.extraAccessories);
  markActive('#danceModeGrid .chip-btn', state.danceMode);
  markActive('#polyDetailGrid .chip-btn', state.polyDetail, 'poly');

  renderMoleList();
  renderScarList();
  renderAhogeList();
  renderFaceDecoControls();

  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (el && el.value !== v) el.value = v ?? '';
  };
  setVal('inputCharacterName', state.characterName || '');
  setVal('pickerBodyColor', state.bodyColor);
  setVal('pickerInnerEarColor', state.innerEarColor);
  setVal('pickerEarColor', state.earColor || state.bodyColor);
  setVal('pickerArmColor', state.armColor || state.bodyColor);
  setVal('pickerEyeColor', state.eyeColor);
  setVal('pickerEyeColorLeft', state.eyeColorLeft || state.eyeColor);
  setVal('pickerEyeColorRight', state.eyeColorRight || '#3b82f6');
  setVal('pickerNoseColor', state.noseMouthColor);
  setVal('pickerPatternColor', state.patternColor);
  setVal('pickerBellyColor', state.bellyColor);
  setVal('pickerAntlerColor', state.antlerColor);
  setVal('pickerBlushColor', state.blushColor);
  setVal('pickerScarColor', state.scarColor || '#b55d60');
  setVal('pickerAhogeColor', state.ahogeColor || '#ffffff');
  setVal('pickerAccessoryColor', state.accessoryColor);
  setVal('colorTailTip', state.tailTipColor);
  setVal('pickerEyebrowColor', state.eyebrowColor || '#18181b');
  setVal('pickerOutlineColor', state.outlineColor || '#18181b');
  setVal('pickerBeakColor', state.beakColor || '#fbbf24');
  setVal('pickerBeakColorTabColors', state.beakColor || '#fbbf24');
  setVal('pickerManeColor', state.maneColor || '#f97316');
  const rowMane = document.getElementById('rowLionManeColor');
  if (rowMane) rowMane.style.display = state.earType === 'lion' ? 'flex' : 'none';
  const rowAntler = document.getElementById('rowAntlerColor');
  if (rowAntler) rowAntler.style.display = state.earType === 'deer2' ? 'flex' : 'none';

  // 개별 소품별 커스텀 색상 행 표시 및 동기화
  const extras = Array.isArray(state.extraAccessories) ? state.extraAccessories : [];
  const setAccColorRow = (rowId, pickerId, colorVal, accId) => {
    const row = document.getElementById(rowId);
    if (row) row.style.display = extras.includes(accId) ? 'flex' : 'none';
    setVal(pickerId, colorVal);
  };
  setAccColorRow('rowBeretColor', 'pickerBeretColor', state.beretColor || '#ef476f', 'beret');
  setAccColorRow('rowStarPinColor', 'pickerStarPinColor', state.starPinColor || '#ffd166', 'star_pin');
  setAccColorRow('rowGlassesColor', 'pickerGlassesColor', state.glassesColor || '#18181b', 'glasses');
  setAccColorRow('rowSquareGlassesColor', 'pickerSquareGlassesColor', state.squareGlassesColor || '#18181b', 'square_glasses');
  setAccColorRow('rowCrownColor', 'pickerCrownColor', state.crownColor || '#ffd166', 'crown');
  setAccColorRow('rowDevilHornsColor', 'pickerDevilHornsColor', state.devilHornsColor || '#18181b', 'devil_horns');
  setAccColorRow('rowMonocleColor', 'pickerMonocleColor', state.monocleColor || '#ffd166', 'monocle');

  const chkAhogeFollowBody = document.getElementById('chkAhogeFollowBody');
  if (chkAhogeFollowBody) chkAhogeFollowBody.checked = state.ahogeFollowBody !== false;
  const pickerAhogeColor = document.getElementById('pickerAhogeColor');
  if (pickerAhogeColor) pickerAhogeColor.disabled = state.ahogeFollowBody !== false;

  const isBeak = state.mouthType === 'beak';
  const beakOptionsCard = document.getElementById('beakOptionsCard');
  if (beakOptionsCard) beakOptionsCard.style.display = isBeak ? 'block' : 'none';
  const sBeakSize = document.getElementById('sliderBeakSize');
  if (sBeakSize) sBeakSize.value = state.beakSize ?? 1.0;
  const vBeakSize = document.getElementById('valBeakSize');
  if (vBeakSize) vBeakSize.textContent = Number(state.beakSize ?? 1.0).toFixed(2);
  const sBeakY = document.getElementById('sliderBeakY');
  if (sBeakY) sBeakY.value = state.beakY ?? 0.0;
  const vBeakY = document.getElementById('valBeakY');
  if (vBeakY) vBeakY.textContent = Number(state.beakY ?? 0.0).toFixed(2);

  const chkBeakFollowBody = document.getElementById('chkBeakFollowBody');
  if (chkBeakFollowBody) chkBeakFollowBody.checked = Boolean(state.beakFollowBody);

  const pickerBeakColor = document.getElementById('pickerBeakColor');
  if (pickerBeakColor) pickerBeakColor.disabled = Boolean(state.beakFollowBody);

  // 오드아이 체크박스 및 피커 가시성
  const chkOddEye = document.getElementById('chkOddEye');
  if (chkOddEye) chkOddEye.checked = Boolean(state.oddEye);
  const oddEyeBox = document.getElementById('oddEyePickers');
  if (oddEyeBox) oddEyeBox.style.display = state.oddEye ? 'inline-flex' : 'none';

  // 귀 바탕 커스텀 색상
  const chkEarColorCustom = document.getElementById('chkEarColorCustom');
  if (chkEarColorCustom) chkEarColorCustom.checked = Boolean(state.earColorCustom);
  const lblEarColor = document.getElementById('lblEarColor');
  if (lblEarColor) lblEarColor.style.display = state.earColorCustom ? 'inline-flex' : 'none';
  const paletteEar = document.getElementById('paletteEar');
  if (paletteEar) paletteEar.style.display = state.earColorCustom ? 'flex' : 'none';

  // 팔 커스텀 색상
  const chkArmColorCustom = document.getElementById('chkArmColorCustom');
  if (chkArmColorCustom) chkArmColorCustom.checked = Boolean(state.armColorCustom);
  const lblArmColor = document.getElementById('lblArmColor');
  if (lblArmColor) lblArmColor.style.display = state.armColorCustom ? 'inline-flex' : 'none';
  const paletteArm = document.getElementById('paletteArm');
  if (paletteArm) paletteArm.style.display = state.armColorCustom ? 'flex' : 'none';

  const setSlider = (sliderId, valId, v, fmt) => {
    const s = document.getElementById(sliderId);
    const sp = document.getElementById(valId);
    if (s && v !== undefined) s.value = v;
    if (sp && v !== undefined) sp.textContent = fmt(Number(v));
  };
  setSlider('sliderEyebrowScale', 'valEyebrowScale', state.eyebrowScale, (v) => v.toFixed(2));
  setSlider('sliderEyebrowY', 'valEyebrowY', state.eyebrowY, (v) => v.toFixed(2));
  setSlider('sliderEyebrowSpacing', 'valEyebrowSpacing', state.eyebrowSpacing, (v) => v.toFixed(2));
  setSlider('sliderBlushScale', 'valBlushScale', state.blushScale, (v) => v.toFixed(2));
  setSlider('sliderBlushOpacity', 'valBlushOpacity', state.blushOpacity, (v) => `${Math.round(v * 100)}%`);
  setSlider('sliderRibbonScale', 'valRibbonScale', state.ribbonScale, (v) => v.toFixed(2));
  setSlider('sliderEyeHighlightSize', 'valEyeHighlightSize', state.eyeHighlightSize ?? 1.0, (v) => v.toFixed(2));
  setSlider('sliderOutline', 'valOutline', state.outlineThickness, (v) => v.toFixed(3));
  setSlider('sliderHeadScale', 'valHeadScale', state.headScale, (v) => v.toFixed(2));
  setSlider('sliderBodyChubby', 'valBodyChubby', state.bodyChubby, (v) => v.toFixed(2), true);
  setSlider('sliderLegLength', 'valLegLength', state.legLength, (v) => v.toFixed(2));
  setSlider('sliderDanceSpeed', 'valDanceSpeed', state.danceSpeed, (v) => `${v.toFixed(1)}x`);

  const setChk = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.checked = !!v;
  };
  setChk('chkEyeHighlight', !!state.eyeHighlight);
  const hlOptions = document.getElementById('eyeHighlightOptions');
  if (hlOptions) hlOptions.style.display = state.eyeHighlight ? 'block' : 'none';
  setChk('chkTailTip', state.tailTipEnabled);
  setChk('chkBellyPatch', state.bellyPatch);
  setChk('chkLowPolyFlat', state.lowPolyFlat);
  setChk('chkOutline', state.outlineEnabled);

  const quickDanceBtn = document.getElementById('btnQuickDance');
  if (quickDanceBtn) {
    if (state.danceMode === 'idle') {
      const label = t('vp_motion_toggle') || '모션 전환';
      quickDanceBtn.textContent = label;
      quickDanceBtn.title = label;
    } else {
      const modeObj = DANCE_MODES.find((d) => d.id === state.danceMode);
      const label = getPartName('dance', state.danceMode, modeObj ? modeObj.name : 'Dance');
      quickDanceBtn.textContent = label;
      quickDanceBtn.title = label;
    }
    quickDanceBtn.classList.toggle('active-dance', state.danceMode !== 'idle');
  }
}

function randomizeCharacter() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.earType = pick(EAR_TYPES).id;
  state.tailType = pick(TAIL_TYPES).id;
  state.wingType = Math.random() < 0.28 ? pick(WING_TYPES.filter((w) => w.id !== 'none')).id : 'none';
  state.eyeType = pick(EYE_TYPES).id;
  state.eyelashType = pick(EYELASH_TYPES).id;
  state.mouthType = pick(MOUTH_TYPES).id;
  state.bodyColor = pick(COLOR_PALETTES.body);
  state.innerEarColor = pick(COLOR_PALETTES.innerEar);
  state.eyeColor = pick(COLOR_PALETTES.eye);

  // 오드아이 랜덤
  const isOddEye = Math.random() < 0.22;
  state.oddEye = isOddEye;
  state.eyeColorLeft = state.eyeColor;
  state.eyeColorRight = isOddEye ? pick(COLOR_PALETTES.eye) : state.eyeColor;

  // 귀 / 팔 커스텀 색상 랜덤
  state.earColorCustom = Math.random() < 0.25;
  state.earColor = pick(COLOR_PALETTES.body);
  state.armColorCustom = Math.random() < 0.25;
  state.armColor = pick(COLOR_PALETTES.body);

  // 얼굴 무늬 다중 랜덤
  const patternChoices = PATTERN_TYPES.filter((p) => p.id !== 'none');
  if (Math.random() < 0.45) {
    state.patterns = [];
    state.patternType = 'none';
  } else {
    const p1 = pick(patternChoices).id;
    if (Math.random() < 0.35) {
      const p2 = pick(patternChoices.filter((p) => p.id !== p1)).id;
      state.patterns = [p1, p2];
    } else {
      state.patterns = [p1];
    }
    state.patternType = state.patterns[0];
  }
  state.patternColor = pick(COLOR_PALETTES.body);
  state.blushType = pick(BLUSH_TYPES).id;

  const ribbonChoices = RIBBON_TYPES.filter((r) => r.id !== 'none');
  state.ribbons = Math.random() < 0.4 ? [] : [pick(ribbonChoices).id];

  const accChoices = EXTRA_ACC_TYPES.filter((a) => a.id !== 'none');
  state.extraAccessories = Math.random() < 0.45 ? [] : [pick(accChoices).id];

  state.accessoryColor = pick(COLOR_PALETTES.accent);
  state.tailTipEnabled = Math.random() < 0.5;
  state.tailTipColor = pick(COLOR_PALETTES.body);

  // 눈썹 & 얼굴 꾸밈 랜덤
  state.eyebrowType = pick(EYEBROW_TYPES).id;
  state.eyebrowColor = pick(COLOR_PALETTES.eye);
  const decoChoices = FACE_DECO_TYPES.filter((d) => d.id !== 'none');
  state.faceDecos = Math.random() < 0.35 ? [pick(decoChoices).id] : [];
  state.faceDecoSettings = {
    beard: { scale: 1.0, x: 0.0, y: 0.0 },
    shadow: { scale: 1.0, x: 0.0, y: 0.0 },
    sweat: { scale: 1.0, x: 0.0, y: 0.0 },
    wrinkle: { scale: 1.0, x: 0.0, y: 0.0 },
    shock: { scale: 1.0, x: 0.0, y: 0.0 },
    anger: { scale: 1.0, x: 0.0, y: 0.0 },
  };

  state.moles = [];
  if (Math.random() < 0.45) {
    const moleCount = Math.random() < 0.4 ? 2 : 1;
    for (let i = 0; i < moleCount; i++) {
      state.moles.push({
        id: `mole_${Date.now()}_${i}`,
        x: +(0.18 + Math.random() * 0.28).toFixed(2) * (Math.random() < 0.5 ? 1 : -1),
        y: +(-0.08 - Math.random() * 0.22).toFixed(2),
        size: +(0.8 + Math.random() * 0.5).toFixed(1),
        mirror: false,
      });
    }
  }

  state.scars = [];
  if (Math.random() < 0.25) {
    const scarTypes = ['slash', 'stitch', 'cross', 'double_slash', 'burn'];
    state.scars.push({
      id: `scar_${Date.now()}`,
      type: pick(scarTypes),
      x: +((Math.random() < 0.5 ? -1 : 1) * (0.34 + Math.random() * 0.1)).toFixed(2),
      y: +(-0.02 - Math.random() * 0.22).toFixed(2),
      size: 1.0,
      angle: Math.round((Math.random() - 0.5) * 40),
      mirror: false,
    });
  }

  state.ahoges = [];
  if (Math.random() < 0.35) {
    const isTwin = Math.random() < 0.3;
    state.ahoges.push({
      id: `ahoge_${Date.now()}`,
      x: isTwin ? 0.05 : +(Math.random() * 0.1 - 0.05).toFixed(2),
      z: 0.05,
      size: +(0.85 + Math.random() * 0.4).toFixed(2),
      thickness: +(0.4 + Math.random() * 1.0).toFixed(2),
      angle: isTwin ? 22 : Math.round((Math.random() - 0.5) * 40),
      curve: +(0.3 + Math.random() * 0.4).toFixed(2),
      mirror: isTwin,
    });
  }

  syncUIFromState();
  rebuildCharacterMesh(true);
}

// VMD 및 FBX 모션 파일 통합 드롭존 (단일 캐릭터 및 스튜디오 공통 모션에 적용)
function initMotionDropzone() {
  const dropzone = document.getElementById('motionDropzone');
  const fileInput = document.getElementById('inputMotionFile');
  const statusText = document.getElementById('motionStatusText');

  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop();
    showBusy(`${ext.toUpperCase()} 모션 파일 분석 중…`);
    try {
      const buf = await file.arrayBuffer();
      if (ext === 'fbx') {
        const info = animator.parseFbxBuffer(buf);
        loadedCustomMotion = { type: 'fbx', buffer: buf, fileName: file.name };
        studioActors.forEach((actor) => {
          if (actor.motionOverride !== 'actor_custom') {
            try {
              actor.animator.parseFbxBuffer(buf);
            } catch (_) {
              // ignore
            }
          }
        });
        state.danceMode = 'custom_fbx';
        statusText.textContent = `FBX 적용 완료: ${file.name} (${info.duration.toFixed(1)}초, 매핑된 본 ${info.quatTracks.size}개)`;
      } else if (ext === 'vmd') {
        const info = animator.parseVmdBuffer(buf);
        loadedCustomMotion = { type: 'vmd', buffer: buf, fileName: file.name };
        studioActors.forEach((actor) => {
          if (actor.motionOverride !== 'actor_custom') {
            try {
              actor.animator.parseVmdBuffer(buf);
            } catch (_) {
              // ignore
            }
          }
        });
        state.danceMode = 'custom_vmd';
        statusText.textContent = `VMD 적용 완료: ${file.name} (${info.duration.toFixed(1)}초, 본 트랙 ${info.tracks.size}개)`;
      } else {
        throw new Error('.vmd 또는 .fbx 파일만 지원합니다.');
      }
      syncUIFromState();
    } catch (err) {
      alert(err.message || '모션 파일 로드에 실패했습니다.');
    } finally {
      hideBusy();
    }
  };

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
  });
}

let currentModalBlob = null;
let currentModalFilename = '';
let currentModalObjectUrl = null;

function showMediaResultModal(blob, filename, mimeType) {
  const modal = document.getElementById('mediaResultModal');
  const img = document.getElementById('mediaResultImg');
  const title = document.getElementById('mediaResultTitle');
  if (!modal || !img) return;

  if (currentModalObjectUrl) {
    URL.revokeObjectURL(currentModalObjectUrl);
    currentModalObjectUrl = null;
  }

  currentModalBlob = blob;
  currentModalFilename = filename;
  currentModalObjectUrl = URL.createObjectURL(blob);

  img.src = currentModalObjectUrl;
  if (title) {
    title.textContent = mimeType.includes('gif') ? '움짤(GIF) 완성' : '스냅샷(PNG) 완성';
  }
  modal.hidden = false;
}

function hideMediaResultModal() {
  const modal = document.getElementById('mediaResultModal');
  if (modal) modal.hidden = true;
  if (currentModalObjectUrl) {
    URL.revokeObjectURL(currentModalObjectUrl);
    currentModalObjectUrl = null;
  }
  currentModalBlob = null;
  currentModalFilename = '';
}

function initMediaModal() {
  const modal = document.getElementById('mediaResultModal');
  const closeBtn = document.getElementById('btnCloseMediaModal');
  const shareBtn = document.getElementById('btnMediaModalShare');
  const downloadBtn = document.getElementById('btnMediaModalDownload');

  if (closeBtn) {
    closeBtn.addEventListener('click', hideMediaResultModal);
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideMediaResultModal();
    });
  }
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      if (!currentModalBlob || !currentModalFilename) return;
      const shared = await shareFile(currentModalBlob, currentModalFilename);
      if (!shared) {
        triggerDownload(currentModalBlob, currentModalFilename);
      }
    });
  }
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (!currentModalBlob || !currentModalFilename) return;
      triggerDownload(currentModalBlob, currentModalFilename);
    });
  }
}

function captureSnapshotPng() {
  renderer.render(scene, camera);
  canvas.toBlob(async (blob) => {
    if (blob) {
      const filename = `${getExportFilePrefix()}_snapshot_${Date.now()}.png`;
      await triggerDownload(blob, filename);
      showMediaResultModal(blob, filename, 'image/png');
    }
  }, 'image/png');
}

// ============================================================================
// 맞춤 시간 · 포맷(GIF / WebM) · 배경(단색 / 투명) 녹화 실행
// ============================================================================
let isRecordingNow = false;

async function startCustomRecording() {
  if (isRecordingNow) return;

  if (state.danceMode === 'idle') {
    const anyCustomActorMotion =
      isStudioMode && studioActors.some((a) => a.motionOverride && a.motionOverride !== 'follow' && a.motionOverride !== 'idle');
    if (!anyCustomActorMotion) {
      state.danceMode = 'happy_dance';
      syncUIFromState();
    }
  }

  const durationSec = Math.max(1.0, Math.min(15.0, Number(recordConfig.duration) || 4.0));
  const isTransparent = recordConfig.bgMode === 'transparent';
  const fillBgColor = recordConfig.bgMode === 'solid' ? recordConfig.bgColor : '#f8f9fa';

  const prevSceneBg = scene.background;
  if (isTransparent) {
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
  } else {
    scene.background = new THREE.Color(fillBgColor);
  }

  isRecordingNow = true;
  try {
    if (recordConfig.format === 'gif') {
      await recordCustomGif(durationSec, isTransparent, fillBgColor);
    } else {
      await recordCustomWebm(durationSec);
    }
  } catch (err) {
    alert(err.message || '녹화 중 오류가 발생했습니다.');
  } finally {
    isRecordingNow = false;
    scene.background = prevSceneBg;
    applyBackgroundMode();
    hideBusy();
  }
}

let isGifRecordingNow = false;

async function recordCustomGif(durationSec, isTransparent, fillBgColor) {
  const fps = 20;
  const delayCs = Math.round(100 / fps);
  const totalFrames = Math.max(10, Math.round(durationSec * fps));
  const stepDt = 1.0 / fps;
  const gw = 480;
  const gh = 480;
  const renderW = 960;
  const renderH = 960;

  isGifRecordingNow = true;

  // 1:1 정사각형 GIF 비율에 맞춘 임시 렌더러/카메라 보정
  const prevAspect = camera.aspect;
  const prevSize = new THREE.Vector2();
  renderer.getSize(prevSize);
  const prevPixelRatio = renderer.getPixelRatio();

  const offCanvas = document.createElement('canvas');
  offCanvas.width = gw;
  offCanvas.height = gh;
  const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
  offCtx.imageSmoothingEnabled = true;
  offCtx.imageSmoothingQuality = 'high';

  const framesRgba = [];

  try {
    renderer.setPixelRatio(1);
    renderer.setSize(renderW, renderH, false);
    camera.aspect = 1.0;
    camera.updateProjectionMatrix();

    for (let i = 0; i < totalFrames; i++) {
      const elapsed = ((i + 1) / fps).toFixed(1);
      showBusy(`GIF 고화질 프레임 캡처 중… (${elapsed}초 / ${durationSec.toFixed(1)}초)`);

      // 첫 프레임 이후 프레임마다 정해진 델타 타임(1/fps)만큼 정확히 모션 진행
      if (i > 0) {
        updateSceneAnimation(stepDt);
      }

      renderer.render(scene, camera);

      if (isTransparent) {
        offCtx.clearRect(0, 0, gw, gh);
      } else {
        offCtx.fillStyle = fillBgColor;
        offCtx.fillRect(0, 0, gw, gh);
      }
      offCtx.drawImage(canvas, 0, 0, gw, gh);

      const imgData = offCtx.getImageData(0, 0, gw, gh);
      framesRgba.push(new Uint8ClampedArray(imgData.data));

      // UI 반응성 유지 및 브라우저 이벤트 루프 양보
      await new Promise((r) => requestAnimationFrame(r));
    }

    showBusy('GIF 움짤 파일 인코딩 중… 잠시만 기다려주세요');
    await new Promise((r) => setTimeout(r, 60));

    const gifBlob = encodeGif89a(framesRgba, gw, gh, delayCs, isTransparent);
    const filename = `${getExportFilePrefix()}_motion_${Date.now()}.gif`;
    await triggerDownload(gifBlob, filename);
    showMediaResultModal(gifBlob, filename, 'image/gif');
  } finally {
    isGifRecordingNow = false;
    renderer.setPixelRatio(prevPixelRatio);
    renderer.setSize(prevSize.x, prevSize.y, false);
    camera.aspect = prevAspect;
    camera.updateProjectionMatrix();
    clock.getDelta(); // 애니메이션 루프 재개 시 누적 델타 방지
    renderer.render(scene, camera);
  }
}

async function recordCustomWebm(durationSec) {
  if (typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
    throw new Error('현재 브라우저에서 동영상 녹화를 지원하지 않습니다. GIF 포맷을 선택해주세요.');
  }

  const stream = canvas.captureStream(30);
  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    } else {
      mimeType = '';
    }
  }

  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
  const stopPromise = new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      triggerDownload(blob, `${getExportFilePrefix()}_motion_${Date.now()}.${ext}`);
      resolve();
    };
  });

  recorder.start();

  const startMs = performance.now();
  const totalMs = durationSec * 1000;
  while (performance.now() - startMs < totalMs) {
    const elapsed = Math.min(durationSec, (performance.now() - startMs) / 1000).toFixed(1);
    showBusy(`영상 녹화 중… (${elapsed}초 / ${durationSec.toFixed(1)}초)`);
    await new Promise((r) => setTimeout(r, 100));
  }

  if (recorder.state !== 'inactive') {
    recorder.stop();
  }
  await stopPromise;
}

function showBusy(msg) {
  const overlay = document.getElementById('busyOverlay');
  const text = document.getElementById('busyText');
  if (text) text.textContent = msg;
  if (overlay) overlay.hidden = false;
}

function hideBusy() {
  const overlay = document.getElementById('busyOverlay');
  if (overlay) overlay.hidden = true;
}

function updateSceneAnimation(dt) {
  if (isStudioMode) {
    studioActors.forEach((actor) => {
      let effectiveMode = state.danceMode;
      if (actor.motionOverride === 'actor_custom' && actor.customMotion) {
        effectiveMode = actor.customMotion.type === 'fbx' ? 'custom_fbx' : 'custom_vmd';
      } else if (actor.motionOverride && actor.motionOverride !== 'follow') {
        effectiveMode = actor.motionOverride;
      }

      const actorAnimState = {
        ...(actor.state || state),
        danceMode: effectiveMode,
        danceSpeed: state.danceSpeed,
      };
      actor.animator.update(dt, actorAnimState);
    });
  } else {
    animator.update(dt, state);
  }
}

handleResize();
initUI();
rebuildCharacterMesh(false);

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  if (isGifRecordingNow) return; // GIF 녹화 중 메인 렌더 루프와의 버퍼 충돌 방지

  const dt = Math.min(clock.getDelta(), 0.1);
  controls.update();
  updateSceneAnimation(dt);
  renderer.render(scene, camera);
}
animate();
