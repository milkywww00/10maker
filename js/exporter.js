import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BONE_DEFS, BONE_INDEX } from './characterBuilder.js?v=25';

// 동적 바이너리 버퍼 작성기 (PMX 2.0 생성용)
class BinaryWriter {
  constructor(initialCapacity = 512 * 1024) {
    this.buffer = new ArrayBuffer(initialCapacity);
    this.view = new DataView(this.buffer);
    this.uint8 = new Uint8Array(this.buffer);
    this.offset = 0;
  }

  ensure(bytes) {
    if (this.offset + bytes <= this.buffer.byteLength) return;
    let newCap = this.buffer.byteLength * 2;
    while (newCap < this.offset + bytes) newCap *= 2;
    const nextBuf = new ArrayBuffer(newCap);
    new Uint8Array(nextBuf).set(this.uint8);
    this.buffer = nextBuf;
    this.view = new DataView(this.buffer);
    this.uint8 = new Uint8Array(this.buffer);
  }

  writeUint8(v) {
    this.ensure(1);
    this.view.setUint8(this.offset, v);
    this.offset += 1;
  }

  writeInt8(v) {
    this.ensure(1);
    this.view.setInt8(this.offset, v);
    this.offset += 1;
  }

  writeUint16(v) {
    this.ensure(2);
    this.view.setUint16(this.offset, v, true);
    this.offset += 2;
  }

  writeInt16(v) {
    this.ensure(2);
    this.view.setInt16(this.offset, v, true);
    this.offset += 2;
  }

  writeInt32(v) {
    this.ensure(4);
    this.view.setInt32(this.offset, v, true);
    this.offset += 4;
  }

  writeUint32(v) {
    this.ensure(4);
    this.view.setUint32(this.offset, v, true);
    this.offset += 4;
  }

  writeFloat32(v) {
    this.ensure(4);
    this.view.setFloat32(this.offset, v, true);
    this.offset += 4;
  }

  writeBytes(arr) {
    this.ensure(arr.length);
    this.uint8.set(arr, this.offset);
    this.offset += arr.length;
  }

  // PMX UTF-16LE 텍스트 버퍼 작성
  writeTextUtf16(str) {
    const byteLen = str.length * 2;
    this.writeInt32(byteLen);
    this.ensure(byteLen);
    for (let i = 0; i < str.length; i++) {
      this.view.setUint16(this.offset, str.charCodeAt(i), true);
      this.offset += 2;
    }
  }

  toUint8Array() {
    return new Uint8Array(this.buffer, 0, this.offset);
  }
}

// 외부 라이브러리 없이 동작하는 순수 JS ZIP 아카이브 빌더 (PMX + PNG 텍스처 패키징용)
function createZipArchive(files) {
  // CRC32 테이블 생성
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c >>> 0;
  }

  const crc32 = (bytes) => {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  };

  const encoder = new TextEncoder();
  const writer = new BinaryWriter(1024 * 1024);
  const centralDir = [];

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const data = file.data;
    const crc = crc32(data);
    const localHeaderOffset = writer.offset;

    // Local File Header
    writer.writeUint32(0x04034b50);
    writer.writeUint16(20); // version needed
    writer.writeUint16(0x0800); // UTF-8 flag
    writer.writeUint16(0); // store (uncompressed)
    writer.writeUint16(0); // mod time
    writer.writeUint16(0); // mod date
    writer.writeUint32(crc);
    writer.writeUint32(data.length);
    writer.writeUint32(data.length);
    writer.writeUint16(nameBytes.length);
    writer.writeUint16(0); // extra len
    writer.writeBytes(nameBytes);
    writer.writeBytes(data);

    centralDir.push({
      nameBytes,
      crc,
      size: data.length,
      offset: localHeaderOffset,
    });
  });

  const cdStart = writer.offset;
  centralDir.forEach((cd) => {
    writer.writeUint32(0x02014b50);
    writer.writeUint16(20);
    writer.writeUint16(20);
    writer.writeUint16(0x0800);
    writer.writeUint16(0);
    writer.writeUint16(0);
    writer.writeUint16(0);
    writer.writeUint32(cd.crc);
    writer.writeUint32(cd.size);
    writer.writeUint32(cd.size);
    writer.writeUint16(cd.nameBytes.length);
    writer.writeUint16(0);
    writer.writeUint16(0);
    writer.writeUint16(0);
    writer.writeUint16(0);
    writer.writeUint32(0);
    writer.writeUint32(cd.offset);
    writer.writeBytes(cd.nameBytes);
  });

  const cdSize = writer.offset - cdStart;
  // End of Central Directory
  writer.writeUint32(0x06054b50);
  writer.writeUint16(0);
  writer.writeUint16(0);
  writer.writeUint16(centralDir.length);
  writer.writeUint16(centralDir.length);
  writer.writeUint32(cdSize);
  writer.writeUint32(cdStart);
  writer.writeUint16(0);

  return new Blob([writer.toUint8Array()], { type: 'application/zip' });
}

// MMD PMX 2.0 바이너리 데이터 생성
export function buildPmxBinary(skinnedMesh, boneWorldPositions, modelName = '', state = null) {
  const geo = skinnedMesh.geometry;
  const posAttr = geo.attributes.position;
  const normAttr = geo.attributes.normal;
  const uvAttr = geo.attributes.uv;
  const sIdxAttr = geo.attributes.skinIndex;
  const sWAttr = geo.attributes.skinWeight;
  const indexAttr = geo.index;

  // MMD 표준 스케일: 캐릭터 키가 약 11.5 MMD 단위가 되도록 5.0배 스케일링
  const SCALE = 5.0;
  const writer = new BinaryWriter(1024 * 1024);

  // 1. PMX 2.0 헤더
  writer.writeBytes(new Uint8Array([0x50, 0x4d, 0x58, 0x20])); // "PMX "
  writer.writeFloat32(2.0);
  writer.writeUint8(8); // globals count
  writer.writeUint8(0); // UTF-16LE encoding
  writer.writeUint8(0); // additional vec4 count
  writer.writeUint8(4); // vertex index size = 4 (Int32)
  writer.writeUint8(1); // texture index size = 1 (Int8)
  writer.writeUint8(1); // material index size = 1 (Int8)
  writer.writeUint8(2); // bone index size = 2 (Int16)
  writer.writeUint8(1); // morph index size = 1 (Int8)
  writer.writeUint8(1); // rigidbody index size = 1 (Int8)

  // 2. 모델 정보
  const cleanTitle = (modelName || '').trim() || '커스텀 동물 캐릭터';
  writer.writeTextUtf16(cleanTitle);
  writer.writeTextUtf16(cleanTitle);
  writer.writeTextUtf16(`10공방에서 제작된 MMD 호환 모델 (${cleanTitle}) 입니다.\r\n표준 본 및 다리 IK가 포함되어 있습니다.`);
  writer.writeTextUtf16(`Created with 10 Studio (${cleanTitle}).`);

  // 3. 정점 (Vertices)
  const vertexCount = posAttr.count;
  writer.writeInt32(vertexCount);

  for (let i = 0; i < vertexCount; i++) {
    // Three.js (x, y, z) -> MMD (x, y, -z)
    const x = posAttr.getX(i) * SCALE;
    const y = posAttr.getY(i) * SCALE;
    const z = -posAttr.getZ(i) * SCALE;
    writer.writeFloat32(x);
    writer.writeFloat32(y);
    writer.writeFloat32(z);

    const nx = normAttr.getX(i);
    const ny = normAttr.getY(i);
    const nz = -normAttr.getZ(i);
    writer.writeFloat32(nx);
    writer.writeFloat32(ny);
    writer.writeFloat32(nz);

    // Three.js UV -> DirectX/PMX UV (v 반전)
    const u = uvAttr.getX(i);
    const v = 1.0 - uvAttr.getY(i);
    writer.writeFloat32(u);
    writer.writeFloat32(v);

    // BDEF4 스키닝 웨이트 기록
    writer.writeUint8(2); // 2 = BDEF4
    writer.writeInt16(sIdxAttr.getX(i));
    writer.writeInt16(sIdxAttr.getY(i));
    writer.writeInt16(sIdxAttr.getZ(i));
    writer.writeInt16(sIdxAttr.getW(i));

    let w0 = sWAttr.getX(i);
    let w1 = sWAttr.getY(i);
    let w2 = sWAttr.getZ(i);
    let w3 = sWAttr.getW(i);
    const sum = w0 + w1 + w2 + w3;
    if (sum > 0.0001) {
      w0 /= sum;
      w1 /= sum;
      w2 /= sum;
      w3 /= sum;
    } else {
      w0 = 1.0;
    }
    writer.writeFloat32(w0);
    writer.writeFloat32(w1);
    writer.writeFloat32(w2);
    writer.writeFloat32(w3);

    // Edge Scale
    writer.writeFloat32(1.0);
  }

  // 4. 면 인덱스 (Faces - Z축 반전에 따른 삼각형 와인딩 순서 반전)
  const indexCount = indexAttr ? indexAttr.count : vertexCount;
  writer.writeInt32(indexCount);
  if (indexAttr) {
    const arr = indexAttr.array;
    for (let i = 0; i < indexCount; i += 3) {
      writer.writeInt32(arr[i]);
      writer.writeInt32(arr[i + 2]);
      writer.writeInt32(arr[i + 1]);
    }
  } else {
    for (let i = 0; i < indexCount; i += 3) {
      writer.writeInt32(i);
      writer.writeInt32(i + 2);
      writer.writeInt32(i + 1);
    }
  }

  // 5. 텍스처 목록
  writer.writeInt32(1);
  writer.writeTextUtf16('texture.png');

  // 6. 재질 (Materials)
  writer.writeInt32(1);
  writer.writeTextUtf16('몸통_얼굴');
  writer.writeTextUtf16('CharacterMaterial');
  // Diffuse RGBA
  writer.writeFloat32(1.0);
  writer.writeFloat32(1.0);
  writer.writeFloat32(1.0);
  writer.writeFloat32(1.0);
  // Specular RGB + Strength
  writer.writeFloat32(0.05);
  writer.writeFloat32(0.05);
  writer.writeFloat32(0.05);
  writer.writeFloat32(5.0);
  // Ambient RGB
  writer.writeFloat32(0.68);
  writer.writeFloat32(0.68);
  writer.writeFloat32(0.68);
  // Flag (양면 + 그림자 + 엣지)
  writer.writeUint8(0x1f);
  // Edge Color RGBA + Size
  let edgeR = 0x14 / 255;
  let edgeG = 0x14 / 255;
  let edgeB = 0x16 / 255;
  if (state?.outlineColor !== undefined) {
    try {
      const edgeColor = new THREE.Color(state.outlineColor);
      edgeR = edgeColor.r;
      edgeG = edgeColor.g;
      edgeB = edgeColor.b;
    } catch (_) {
      // fallback
    }
  }
  writer.writeFloat32(edgeR);
  writer.writeFloat32(edgeG);
  writer.writeFloat32(edgeB);
  writer.writeFloat32(1.0);
  writer.writeFloat32(0.75);
  // Texture Index
  writer.writeInt8(0);
  // Sphere Texture Index & Mode
  writer.writeInt8(-1);
  writer.writeUint8(0);
  // Shared Toon
  writer.writeUint8(1);
  writer.writeUint8(1); // toon02.bmp
  // Memo
  writer.writeTextUtf16('');
  // Surface Count
  writer.writeInt32(indexCount);

  // 7. 본 (Bones: 24개 기본 본 + 2개 다리 IK 본 = 26개)
  const totalBones = BONE_DEFS.length + 2;
  writer.writeInt32(totalBones);

  BONE_DEFS.forEach((def, idx) => {
    writer.writeTextUtf16(def.name);
    writer.writeTextUtf16(def.nameEn);
    const wp = (boneWorldPositions && boneWorldPositions[idx]) || def.pos;
    writer.writeFloat32(wp[0] * SCALE);
    writer.writeFloat32(wp[1] * SCALE);
    writer.writeFloat32(-wp[2] * SCALE);

    writer.writeInt16(def.parent);
    writer.writeInt32(0); // layer

    // 루트(0)와 센터(1)는 회전+이동 가능(0x001E), 나머지는 회전 가능(0x001A)
    const movable = idx === BONE_INDEX.ROOT || idx === BONE_INDEX.CENTER;
    const flags = movable ? 0x001e : 0x001a;
    writer.writeUint16(flags);

    // Tail Offset (0x0001 플래그가 꺼져 있으므로 Float32 x 3)
    writer.writeFloat32(0.0);
    writer.writeFloat32(0.35);
    writer.writeFloat32(0.0);
  });

  // 다리 IK 본 2개 추가 (24: 左足ＩＫ, 25: 右足ＩＫ)
  const ikDefs = [
    {
      name: '左足ＩＫ',
      nameEn: 'LegIK_L',
      targetIdx: BONE_INDEX.ANKLE_L,
      kneeIdx: BONE_INDEX.KNEE_L,
      legIdx: BONE_INDEX.LEG_L,
    },
    {
      name: '右足ＩＫ',
      nameEn: 'LegIK_R',
      targetIdx: BONE_INDEX.ANKLE_R,
      kneeIdx: BONE_INDEX.KNEE_R,
      legIdx: BONE_INDEX.LEG_R,
    },
  ];

  ikDefs.forEach((ik) => {
    writer.writeTextUtf16(ik.name);
    writer.writeTextUtf16(ik.nameEn);
    const wp = (boneWorldPositions && boneWorldPositions[ik.targetIdx]) || (BONE_DEFS[ik.targetIdx] ? BONE_DEFS[ik.targetIdx].pos : [0, 0, 0]);
    writer.writeFloat32(wp[0] * SCALE);
    writer.writeFloat32(wp[1] * SCALE);
    writer.writeFloat32(-wp[2] * SCALE);

    writer.writeInt16(BONE_INDEX.ROOT); // 부모: 全ての親
    writer.writeInt32(1); // IK 레이어

    // 회전 + 이동 + 표시 + 조작 + IK (0x003E)
    writer.writeUint16(0x003e);

    // Tail Offset
    writer.writeFloat32(0.0);
    writer.writeFloat32(0.0);
    writer.writeFloat32(-0.5);

    // IK 데이터
    writer.writeInt16(ik.targetIdx);
    writer.writeInt32(40); // Loop count
    writer.writeFloat32(2.0); // Limit angle
    writer.writeInt32(2); // 2개 링크 (무릎, 허벅지)

    // Link 0: 무릎 (X축 굽힘 각도 제한)
    writer.writeInt16(ik.kneeIdx);
    writer.writeUint8(1); // has limits
    writer.writeFloat32(-Math.PI);
    writer.writeFloat32(0.0);
    writer.writeFloat32(0.0);
    writer.writeFloat32(-0.005);
    writer.writeFloat32(0.0);
    writer.writeFloat32(0.0);

    // Link 1: 다리(고관절)
    writer.writeInt16(ik.legIdx);
    writer.writeUint8(0); // no limits
  });

  // 8. 모프 (Morphs = 0)
  writer.writeInt32(0);

  // 9. 표시 프레임 (Display Frames = 기본 2개: Root, 表情)
  writer.writeInt32(2);
  // Frame 0: Root
  writer.writeTextUtf16('Root');
  writer.writeTextUtf16('Root');
  writer.writeUint8(1); // special frame
  writer.writeInt32(1);
  writer.writeUint8(0); // bone target
  writer.writeInt16(0); // Root bone

  // Frame 1: 表情
  writer.writeTextUtf16('表情');
  writer.writeTextUtf16('Exp');
  writer.writeUint8(1); // special frame
  writer.writeInt32(0);

  // 10. 강체(RigidBody = 0) & 조인트(Joint = 0)
  writer.writeInt32(0);
  writer.writeInt32(0);

  return writer.toUint8Array();
}

// 캔버스를 PNG Uint8Array로 변환
async function canvasToPngUint8Array(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('텍스처 이미지 변환에 실패했습니다.'));
        return;
      }
      try {
        const buf = await blob.arrayBuffer();
        resolve(new Uint8Array(buf));
      } catch (err) {
        reject(err);
      }
    }, 'image/png');
  });
}

// MMD 패키지 (.zip 안에 character.pmx + texture.png + character.json + 안내문 포함) 다운로드
export async function exportMmdZip(skinnedMesh, boneWorldPositions, textureCanvas, filename = 'custom_animal_mmd.zip', state = null) {
  const pmxBytes = buildPmxBinary(skinnedMesh, boneWorldPositions, state?.characterName || '', state);
  const pngBytes = await canvasToPngUint8Array(textureCanvas);

  const readmeText = [
    '====================================================',
    '  10공방 — 커스텀 동물 캐릭터 3D 모델 (MMD .pmx 패키지)',
    '====================================================',
    '',
    '1. 압축을 같은 폴더에 풀어주세요.',
    '   - character.pmx  : 3D 캐릭터 모델 파일 (일본어 표준 본 + 다리 IK 포함)',
    '   - texture.png    : 얼굴 표정·무늬·파츠 컬러 통합 텍스처 파일',
    '   - character.json : 10공방 사이트에서 다시 불러와 편집하거나 스튜디오 촬영에 사용할 수 있는 데이터 파일',
    '',
    '2. MikuMikuDance(MMD) 실행 후 [모델 불러오기]에서 character.pmx를 열거나',
    '   MMD 창에 드래그 앤 드롭하면 바로 로드됩니다.',
    '',
    '3. 10공방 사이트 상단 [파일 불러오기] 또는 [스튜디오 모드]에 이 ZIP 파일이나',
    '   character.json 파일을 넣으면 사이트에서 다시 불러올 수 있습니다.',
  ].join('\r\n');

  const entries = [
    { name: 'character.pmx', data: pmxBytes },
    { name: 'texture.png', data: pngBytes },
    { name: 'README_사용법.txt', data: new TextEncoder().encode(readmeText) },
  ];

  if (state) {
    const jsonStr = JSON.stringify({ version: 1, app: '10공방', state }, null, 2);
    entries.push({ name: 'character.json', data: new TextEncoder().encode(jsonStr) });
  }

  const zipBlob = createZipArchive(entries);
  triggerDownload(zipBlob, filename);
}

// 범용 3D 모델 (.glb) 다운로드 (10공방 재불러오기용 state 메타데이터 내장)
export function exportGlbFile(rootGroup, filename = 'custom_animal_character.glb', state = null) {
  if (state) {
    if (state.characterName && state.characterName.trim()) {
      rootGroup.name = state.characterName.trim();
    }
    rootGroup.userData = {
      ...rootGroup.userData,
      studio10State: structuredClone(state),
    };
  }
  const exporter = new GLTFExporter();
  exporter.parse(
    rootGroup,
    (result) => {
      const blob = new Blob([result], { type: 'model/gltf-binary' });
      triggerDownload(blob, filename);
    },
    (err) => {
      console.error('GLB 내보내기 오류:', err);
      alert('GLB 파일 생성 중 오류가 발생했습니다.');
    },
    { binary: true }
  );
}

// 캐릭터 커스텀 프로젝트 파일 (.json) 저장
export function exportCharacterJson(state, filename = '10studio_character.json') {
  const payload = {
    version: 1,
    app: '10공방',
    savedAt: new Date().toISOString(),
    state: structuredClone(state),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  triggerDownload(blob, filename);
}

// ZIP 아카이브(비압축 Store 방식)에서 character.json 추출
function extractCharacterJsonFromZipBuffer(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder('utf-8');
  let offset = 0;

  while (offset + 30 <= bytes.length) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break;
    const compression = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);

    const nameBytes = bytes.subarray(offset + 30, offset + 30 + nameLen);
    const fileName = decoder.decode(nameBytes);
    const dataStart = offset + 30 + nameLen + extraLen;
    const dataEnd = dataStart + compSize;

    if (fileName.endsWith('.json') && compression === 0 && dataEnd <= bytes.length) {
      const jsonText = decoder.decode(bytes.subarray(dataStart, dataEnd));
      return JSON.parse(jsonText);
    }
    offset = dataEnd;
  }
  return null;
}

// 10공방에서 제작한 파일(.json, .glb, .zip)을 불러와 캐릭터 상태 또는 3D 메쉬로 복원
export async function importCharacterFile(file) {
  const ext = file.name.toLowerCase().split('.').pop();
  const baseName = file.name.replace(/\.[^.]+$/, '');

  if (ext === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const loadedState = parsed && parsed.state ? parsed.state : parsed;
    if (!loadedState || typeof loadedState !== 'object' || !loadedState.earType) {
      throw new Error('유효한 10공방 캐릭터 JSON 파일이 아닙니다.');
    }
    return { type: 'state', state: loadedState, name: baseName };
  }

  if (ext === 'zip') {
    const buf = await file.arrayBuffer();
    const parsed = extractCharacterJsonFromZipBuffer(buf);
    if (!parsed) {
      throw new Error('ZIP 파일 내부에 character.json 데이터가 없습니다. 최신 10공방에서 저장한 ZIP/JSON/GLB 파일을 사용해주세요.');
    }
    const loadedState = parsed.state || parsed;
    return { type: 'state', state: loadedState, name: baseName };
  }

  if (ext === 'glb' || ext === 'gltf') {
    const buf = await file.arrayBuffer();
    const loader = new GLTFLoader();
    const gltf = await new Promise((resolve, reject) => {
      loader.parse(buf, '', resolve, reject);
    });

    // 1. 내장된 studio10State 메타데이터가 있는지 확인
    let embeddedState = gltf.scene?.userData?.studio10State || null;
    if (!embeddedState && gltf.scene) {
      gltf.scene.traverse((child) => {
        if (!embeddedState && child.userData && child.userData.studio10State) {
          embeddedState = child.userData.studio10State;
        }
      });
    }
    if (embeddedState && typeof embeddedState === 'object' && embeddedState.earType) {
      return { type: 'state', state: embeddedState, name: baseName };
    }

    // 2. 이전 버전에서 다운로드한 .glb 파일이라도 SkinnedMesh와 본 구조를 그대로 복원하여 스튜디오/뷰포트에서 모션 재생 가능하게 처리!
    let foundSkinned = null;
    const allBones = [];
    gltf.scene.traverse((child) => {
      if (child.isSkinnedMesh && !foundSkinned) {
        foundSkinned = child;
      }
      if (child.isBone) {
        allBones.push(child);
      }
      if (child.isMesh) {
        child.castShadow = true;
      }
    });

    const orderedBones = BONE_DEFS.map((def, idx) => {
      return (
        allBones.find((b) => b.name === def.name || b.name === def.nameEn) ||
        (foundSkinned && foundSkinned.skeleton && foundSkinned.skeleton.bones[idx]) ||
        null
      );
    });

    if (orderedBones.every(Boolean)) {
      return {
        type: 'glb_scene',
        rootGroup: gltf.scene,
        bones: orderedBones,
        name: baseName,
      };
    }

    throw new Error('불러온 GLB 파일에서 10공방 캐릭터 본 구조를 찾을 수 없습니다.');
  }

  throw new Error('지원하지 않는 파일 형식입니다. (.json, .glb, .zip 파일 지원)');
}

// ============================================================================
// 순수 JS 고품질 GIF89a 인코더 (통합 글로벌 팔레트 + 무깜빡임 보정 + LZW 압축)
// ============================================================================
const SHARED_LZW_TABLE = new Int32Array(4096 * 256);

function buildUnifiedGlobalPalette(framesRgba, isTransparent) {
  // 15-bit RGB 히스토그램 (32 x 32 x 32 = 32768 버킷)
  const histCount = new Int32Array(32768);
  const histR = new Int32Array(32768);
  const histG = new Int32Array(32768);
  const histB = new Int32Array(32768);

  const numFrames = framesRgba.length;
  // 전체 애니메이션 프레임 중 최대 30프레임을 균등 샘플링하여 전 구간의 색상과 조명을 수집
  const step = Math.max(1, Math.floor(numFrames / 30));

  for (let f = 0; f < numFrames; f += step) {
    const rgba = framesRgba[f];
    const totalPixels = rgba.length >> 2;
    for (let i = 0; i < totalPixels; i++) {
      const idx = i << 2;
      const a = rgba[idx + 3];
      if (isTransparent && a < 80) continue;
      let r = rgba[idx];
      let g = rgba[idx + 1];
      let b = rgba[idx + 2];
      // 투명 배경 시 안티에일리어싱으로 어두워진(Pre-multiplied) 테두리 픽셀 색상 복원
      if (isTransparent && a < 254 && a > 0) {
        r = Math.min(255, Math.round((r * 255) / a));
        g = Math.min(255, Math.round((g * 255) / a));
        b = Math.min(255, Math.round((b * 255) / a));
      }
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      if (histCount[key] < 8000) {
        histCount[key]++;
        histR[key] += r;
        histG[key] += g;
        histB[key] += b;
      }
    }
  }

  const activeCells = [];
  for (let k = 0; k < 32768; k++) {
    if (histCount[k] > 0) activeCells.push(k);
  }

  const palette = new Uint8Array(256 * 3);
  const lut = new Uint8Array(32768);
  lut.fill(255); // 255는 미할당 또는 투명 인덱스 마킹

  const maxColors = isTransparent ? 255 : 256;

  if (activeCells.length === 0) {
    return { palette, lut };
  }

  const makeBox = (cells) => {
    let rMin = 31, rMax = 0, gMin = 31, gMax = 0, bMin = 31, bMax = 0;
    let count = 0;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const r5 = (c >> 10) & 31;
      const g5 = (c >> 5) & 31;
      const b5 = c & 31;
      if (r5 < rMin) rMin = r5;
      if (r5 > rMax) rMax = r5;
      if (g5 < gMin) gMin = g5;
      if (g5 > gMax) gMax = g5;
      if (b5 < bMin) bMin = b5;
      if (b5 > bMax) bMax = b5;
      count += histCount[c];
    }
    return { cells, rMin, rMax, gMin, gMax, bMin, bMax, count };
  };

  const boxes = [makeBox(activeCells)];

  while (boxes.length < maxColors) {
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < boxes.length; i++) {
      const bx = boxes[i];
      if (bx.cells.length < 2) continue;
      const span = Math.max(bx.rMax - bx.rMin, bx.gMax - bx.gMin, bx.bMax - bx.bMin);
      if (span === 0) continue;
      // 색 공간 범위(span)와 포함된 고유 색상 수를 기준으로 분할하여 모든 캐릭터 부위 색상 독립 보장
      const score = span * bx.cells.length;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break;

    const target = boxes[bestIdx];
    const rSpan = target.rMax - target.rMin;
    const gSpan = target.gMax - target.gMin;
    const bSpan = target.bMax - target.bMin;

    let sortFn, getChannelVal, minVal, maxVal;
    if (rSpan >= gSpan && rSpan >= bSpan) {
      sortFn = (a, b) => ((a >> 10) & 31) - ((b >> 10) & 31);
      getChannelVal = (c) => (c >> 10) & 31;
      minVal = target.rMin;
      maxVal = target.rMax;
    } else if (gSpan >= rSpan && gSpan >= bSpan) {
      sortFn = (a, b) => ((a >> 5) & 31) - ((b >> 5) & 31);
      getChannelVal = (c) => (c >> 5) & 31;
      minVal = target.gMin;
      maxVal = target.gMax;
    } else {
      sortFn = (a, b) => (a & 31) - (b & 31);
      getChannelVal = (c) => c & 31;
      minVal = target.bMin;
      maxVal = target.bMax;
    }

    target.cells.sort(sortFn);

    // 색 공간 중간값(midpoint)을 기준으로 분할하여 거대한 배경 면적이 캐릭터 피부/귀 색상을 흡수하지 못하도록 차단
    const midVal = (minVal + maxVal) >> 1;
    let splitPos = -1;
    for (let i = 0; i < target.cells.length; i++) {
      if (getChannelVal(target.cells[i]) > midVal) {
        splitPos = i;
        break;
      }
    }
    if (splitPos <= 0 || splitPos >= target.cells.length) {
      splitPos = target.cells.length >> 1;
    }

    const leftCells = target.cells.slice(0, splitPos);
    const rightCells = target.cells.slice(splitPos);
    boxes.splice(bestIdx, 1, makeBox(leftCells), makeBox(rightCells));
  }

  const assigned = new Uint8Array(32768);

  const numColors = Math.min(boxes.length, maxColors);
  for (let i = 0; i < numColors; i++) {
    const bx = boxes[i];
    let sumR = 0, sumG = 0, sumB = 0, total = 0;
    for (let j = 0; j < bx.cells.length; j++) {
      const c = bx.cells[j];
      sumR += histR[c];
      sumG += histG[c];
      sumB += histB[c];
      total += histCount[c];
      lut[c] = i;
      assigned[c] = 1;
    }
    if (total > 0) {
      palette[i * 3] = Math.round(sumR / total);
      palette[i * 3 + 1] = Math.round(sumG / total);
      palette[i * 3 + 2] = Math.round(sumB / total);
    }
  }

  if (isTransparent) {
    palette[255 * 3] = 0;
    palette[255 * 3 + 1] = 0;
    palette[255 * 3 + 2] = 0;
  }

  // 15비트 색 공간(32768개) 중 샘플에 잡히지 않은 모든 미할당 색상을 인간 시각 가중치 유클리드 거리로 가장 가까운 팔레트 색에 매핑
  // -> 특정 프레임에서 색이 날아가거나 엉뚱한 색(0번)으로 떨어지는 현상 완벽 방지
  const findNearestColor = (r, g, b) => {
    let bestDist = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < numColors; i++) {
      const pr = palette[i * 3];
      const pg = palette[i * 3 + 1];
      const pb = palette[i * 3 + 2];
      const dr = r - pr;
      const dg = g - pg;
      const db = b - pb;
      const dist = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  for (let k = 0; k < 32768; k++) {
    if (!assigned[k]) {
      const r = ((k >> 10) & 31) << 3;
      const g = ((k >> 5) & 31) << 3;
      const b = (k & 31) << 3;
      lut[k] = findNearestColor(r, g, b);
    }
  }

  return { palette, lut };
}

function lzwEncodeFrame(indexedPixels) {
  const minCodeSize = 8;
  const clearCode = 256;
  const eoiCode = 257;

  const outBytes = [];
  outBytes.push(minCodeSize);

  let subBlock = new Uint8Array(255);
  let sbLen = 0;
  let bitBuf = 0;
  let bitCount = 0;

  const flushByte = (b) => {
    subBlock[sbLen++] = b;
    if (sbLen === 255) {
      outBytes.push(255);
      for (let i = 0; i < 255; i++) outBytes.push(subBlock[i]);
      sbLen = 0;
    }
  };

  const writeCode = (code, size) => {
    bitBuf |= code << bitCount;
    bitCount += size;
    while (bitCount >= 8) {
      flushByte(bitBuf & 0xff);
      bitBuf >>= 8;
      bitCount -= 8;
    }
  };

  // 재할당 없는 고정 해시 테이블로 고속 LZW 압축 수행
  const table = SHARED_LZW_TABLE;
  table.fill(-1);

  let nextCode = 258;
  let codeSize = 9;

  writeCode(clearCode, codeSize);

  let prefix = indexedPixels[0];
  for (let i = 1; i < indexedPixels.length; i++) {
    const k = indexedPixels[i];
    const tIdx = (prefix << 8) | k;
    const hit = table[tIdx];
    if (hit !== -1) {
      prefix = hit;
    } else {
      writeCode(prefix, codeSize);
      if (nextCode < 4096) {
        table[tIdx] = nextCode;
        if (nextCode === (1 << codeSize) && codeSize < 12) {
          codeSize++;
        }
        nextCode++;
      } else {
        writeCode(clearCode, codeSize);
        table.fill(-1);
        nextCode = 258;
        codeSize = 9;
      }
      prefix = k;
    }
  }

  writeCode(prefix, codeSize);
  writeCode(eoiCode, codeSize);

  if (bitCount > 0) {
    flushByte(bitBuf & 0xff);
  }
  if (sbLen > 0) {
    outBytes.push(sbLen);
    for (let i = 0; i < sbLen; i++) outBytes.push(subBlock[i]);
  }
  outBytes.push(0); // block terminator

  return new Uint8Array(outBytes);
}

export function encodeGif89a(framesRgba, width, height, delayCs = 5, isTransparent = false) {
  const chunks = [];
  const pushBytes = (...arr) => chunks.push(new Uint8Array(arr));

  // 전체 프레임을 아우르는 단일 고화질 글로벌 팔레트 생성 (프레임별 팔레트 교체로 인한 깜빡임/깨짐 원천 차단)
  const { palette, lut } = buildUnifiedGlobalPalette(framesRgba, isTransparent);

  // 1. Header: GIF89a
  pushBytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);

  // 2. Logical Screen Descriptor (글로벌 컬러 테이블 256색 지정)
  pushBytes(
    width & 0xff, (width >> 8) & 0xff,
    height & 0xff, (height >> 8) & 0xff,
    0xf7, // Global Color Table (256 colors)
    isTransparent ? 255 : 0,  // Background color index
    0x00
  );
  chunks.push(palette);

  // 3. Netscape 2.0 Infinite Loop Extension
  pushBytes(
    0x21, 0xff, 0x0b,
    0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
    0x03, 0x01, 0x00, 0x00, 0x00
  );

  const totalPixels = width * height;
  const indexed = new Uint8Array(totalPixels);

  // Graphic Control Extension Flags:
  // disposal: 2 (restore to background) when transparent, 1 (do not dispose / overwrite) when opaque
  const gceFlags = isTransparent ? 0x09 : 0x04;
  const transIndex = isTransparent ? 255 : 0;

  for (let f = 0; f < framesRgba.length; f++) {
    const rgba = framesRgba[f];

    for (let i = 0; i < totalPixels; i++) {
      const idx = i << 2;
      const a = rgba[idx + 3];

      if (isTransparent && a < 80) {
        indexed[i] = 255;
      } else {
        let r = rgba[idx];
        let g = rgba[idx + 1];
        let b = rgba[idx + 2];

        if (isTransparent && a < 254 && a > 0) {
          r = Math.min(255, Math.round((r * 255) / a));
          g = Math.min(255, Math.round((g * 255) / a));
          b = Math.min(255, Math.round((b * 255) / a));
        }

        const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
        indexed[i] = lut[key];
      }
    }

    // Graphic Control Extension
    pushBytes(
      0x21, 0xf9, 0x04,
      gceFlags,
      delayCs & 0xff, (delayCs >> 8) & 0xff,
      transIndex,
      0x00
    );

    // Image Descriptor (모든 프레임이 글로벌 컬러 테이블을 공통 사용하여 깜빡임 방지)
    pushBytes(
      0x2c,
      0x00, 0x00, 0x00, 0x00,
      width & 0xff, (width >> 8) & 0xff,
      height & 0xff, (height >> 8) & 0xff,
      0x00 // No Local Color Table!
    );

    chunks.push(lzwEncodeFrame(indexed));
  }

  // Trailer
  pushBytes(0x3b);

  return new Blob(chunks, { type: 'image/gif' });
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function shareFile(blob, filename) {
  if (typeof navigator.share === 'function') {
    try {
      const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
        });
        return true;
      }
    } catch (shareErr) {
      if (shareErr.name === 'AbortError') return true; // 사용자 취소
      console.warn('Web Share 실패:', shareErr);
    }
  }
  return false;
}

