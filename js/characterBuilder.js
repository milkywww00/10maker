// 10공방 — 3D 캐릭터 빌더 (롭이어·강아지·햄스터·쥐 귀 정밀 복원, 무늬 끊김 0%, 꼬리 끝 잉크라인 보강, 소품·리본 매끈한 조형)
import * as THREE from 'three';
import { getSwatchUV, getHeadOrthographicUV, getEarVertexUV, getTorsoFrontUV } from './textureGenerator.js?v=67';

export const BONE_DEFS = [
  { name: '全ての親', nameEn: 'Root', parent: -1 },          // 0
  { name: 'センター', nameEn: 'Center', parent: 0 },         // 1
  { name: '下半身', nameEn: 'LowerBody', parent: 1 },        // 2
  { name: '上半身', nameEn: 'UpperBody', parent: 1 },        // 3
  { name: '首', nameEn: 'Neck', parent: 3 },                 // 4
  { name: '頭', nameEn: 'Head', parent: 4 },                 // 5
  { name: '左耳', nameEn: 'Ear_L', parent: 5 },              // 6
  { name: '右耳', nameEn: 'Ear_R', parent: 5 },              // 7
  { name: '左腕', nameEn: 'Arm_L', parent: 3 },              // 8
  { name: '左ひじ', nameEn: 'Elbow_L', parent: 8 },          // 9
  { name: '右腕', nameEn: 'Arm_R', parent: 3 },              // 10
  { name: '右ひじ', nameEn: 'Elbow_R', parent: 10 },         // 11
  { name: '左足', nameEn: 'Leg_L', parent: 2 },              // 12
  { name: '左ひざ', nameEn: 'Knee_L', parent: 12 },          // 13
  { name: '左足首', nameEn: 'Ankle_L', parent: 13 },         // 14
  { name: '右足', nameEn: 'Leg_R', parent: 2 },              // 15
  { name: '右ひざ', nameEn: 'Knee_R', parent: 15 },          // 16
  { name: '右足首', nameEn: 'Ankle_R', parent: 16 },         // 17
  { name: '尻尾1', nameEn: 'Tail_Base', parent: 2 },         // 18
  { name: '尻尾2', nameEn: 'Tail_Tip', parent: 18 },         // 19
];

export const BONE_INDEX = {
  ROOT: 0,
  CENTER: 1,
  LOWER_BODY: 2,
  UPPER_BODY: 3,
  NECK: 4,
  HEAD: 5,
  EAR_L: 6,
  EAR_R: 7,
  ARM_L: 8,
  ELBOW_L: 9,
  ARM_R: 10,
  ELBOW_R: 11,
  LEG_L: 12,
  KNEE_L: 13,
  ANKLE_L: 14,
  LEG_R: 15,
  KNEE_R: 16,
  ANKLE_R: 17,
  TAIL_BASE: 18,
  TAIL_TIP: 19,
};

function toSmoothNonIndexed(geo) {
  if (!geo.userData.keepCustomNormals) {
    geo.computeVertexNormals();
  }
  // 구(Sphere)·캡슐(Capsule)의 극점(Pole) 및 경선 이음매(Seam)에 중복 생성된 동일 3D 좌표 정점들의 노멀을 하나로 통합하여
  // 로우폴리곤에서도 머리 정수리·귀 끝·소품 테두리 외곽선이 갈라지거나 깨지는 현상을 원천 차단!
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  if (pos && norm && !geo.userData.keepCustomNormals) {
    const map = new Map();
    for (let i = 0; i < pos.count; i++) {
      const kx = Math.round(pos.getX(i) * 10000);
      const ky = Math.round(pos.getY(i) * 10000);
      const kz = Math.round(pos.getZ(i) * 10000);
      const key = `${kx},${ky},${kz}`;
      let entry = map.get(key);
      if (!entry) {
        entry = { nx: 0, ny: 0, nz: 0, indices: [] };
        map.set(key, entry);
      }
      entry.nx += norm.getX(i);
      entry.ny += norm.getY(i);
      entry.nz += norm.getZ(i);
      entry.indices.push(i);
    }
    for (const entry of map.values()) {
      if (entry.indices.length > 1) {
        const len = Math.max(1e-6, Math.hypot(entry.nx, entry.ny, entry.nz));
        const ux = entry.nx / len;
        const uy = entry.ny / len;
        const uz = entry.nz / len;
        for (let k = 0; k < entry.indices.length; k++) {
          norm.setXYZ(entry.indices[k], ux, uy, uz);
        }
      }
    }
    norm.needsUpdate = true;
  }
  const out = geo.index ? geo.toNonIndexed() : geo;
  out.userData = { ...geo.userData };
  return out;
}

function reverseGeometryWinding(geo) {
  if (geo.index) {
    const idx = geo.index.array;
    for (let i = 0; i < idx.length; i += 3) {
      const tmp = idx[i];
      idx[i] = idx[i + 2];
      idx[i + 2] = tmp;
    }
    geo.index.needsUpdate = true;
  } else {
    for (const name of ['position', 'normal', 'uv']) {
      const attr = geo.attributes[name];
      if (!attr) continue;
      const arr = attr.array;
      const itemSize = attr.itemSize;
      const count = attr.count;
      for (let i = 0; i < count; i += 3) {
        const o0 = i * itemSize;
        const o2 = (i + 2) * itemSize;
        for (let k = 0; k < itemSize; k++) {
          const tmp = arr[o0 + k];
          arr[o0 + k] = arr[o2 + k];
          arr[o2 + k] = tmp;
        }
      }
      attr.needsUpdate = true;
    }
  }
  geo.computeVertexNormals();
}

export class CharacterBuilder {
  constructor(texture) {
    this.texture = texture;
  }

  getPolySpec(polyDetail, lowPolyFlat) {
    if (polyDetail === 'very_low') {
      // 1단계 [로우 폴리곤]: 머리·몸통·팔다리·안경은 각진 로우폴리곤으로 표현하고, 귀·소품은 대칭 4배수 세그먼트로 깨짐 없이 유지
      return {
        isVeryLow: true,
        isStandardPoly: false,
        headW: 12,
        headH: 6,
        torsoW: 10,
        torsoH: 5,
        limbRadial: 6,
        limbCap: 2,
        earPointedU: 16,
        earPointedV: 10,
        earRoundW: 16,
        earRoundH: 10,
        earLobeU: 16,
        earLobeV: 10,
        tailW: 12,
        tailH: 8,
        glassesTubular: 8,
        glassesRadial: 6,
        accW: 16,
        accH: 10,
        facetBlend: lowPolyFlat ? 1.0 : 0.65,
      };
    } else if (polyDetail === 'medium') {
      // 3단계 [하이 폴리곤]: 각진 모서리 없이 완전히 매끄러운 고밀도 곡면 (머리 48x34, 안경 40각)
      return {
        isVeryLow: false,
        isStandardPoly: false,
        headW: 48,
        headH: 34,
        torsoW: 36,
        torsoH: 24,
        limbRadial: 24,
        limbCap: 8,
        earPointedU: 28,
        earPointedV: 22,
        earRoundW: 32,
        earRoundH: 24,
        earLobeU: 28,
        earLobeV: 22,
        tailW: 28,
        tailH: 26,
        glassesTubular: 40,
        glassesRadial: 10,
        accW: 36,
        accH: 20,
        facetBlend: lowPolyFlat ? 1.0 : 0.0,
      };
    }
    // 2단계 [표준 폴리곤]: 로우폴리와 하이폴리의 중간 단계로 은은한 다각형 실루엣과 면 분할이 느껴지는 세미 로우폴리 (머리 18x10, 안경 14각)
    return {
      isVeryLow: false,
      isStandardPoly: true,
      headW: 18,
      headH: 10,
      torsoW: 14,
      torsoH: 8,
      limbRadial: 10,
      limbCap: 3,
      earPointedU: 20,
      earPointedV: 14,
      earRoundW: 20,
      earRoundH: 14,
      earLobeU: 20,
      earLobeV: 14,
      tailW: 16,
      tailH: 12,
      glassesTubular: 14,
      glassesRadial: 6,
      accW: 20,
      accH: 14,
      facetBlend: lowPolyFlat ? 1.0 : 0.30,
    };
  }

  build(state) {
    const poly = this.getPolySpec(state.polyDetail, state.lowPolyFlat);
    const geometries = [];

    const legLen = state.legLength ?? 1.0;
    const chubby = state.bodyChubby ?? 1.0;
    const headScale = state.headScale ?? 1.0;

    // 목과 몸통 사이, 몸통과 다리 사이에 유격(빈 공간)이 절대 생기지 않도록 서로 안쪽으로 맞물리게(Overlap) 설계!
    const legTopY = 0.44 * legLen;
    const torsoBotY = legTopY - 0.035;
    const torsoTopY = torsoBotY + 0.56;
    const headRy = 0.64 * headScale;
    const headCenterY = torsoTopY - 0.055 + headRy * 0.70;

    // 1. 머리
    geometries.push(this.createHeadGeometry(state, headCenterY, headScale, poly));

    // 2. 몸통
    geometries.push(this.createTorsoGeometry(state, torsoBotY, torsoTopY, chubby, poly));

    // 3. 양팔 (어깨 구면 중심을 팔 본 피벗과 1:1 일치시켜 모션 시 팔 비틀림·접힘을 원천 차단)
    geometries.push(this.createLimbArmGeometry(1, torsoTopY, chubby, poly));
    geometries.push(this.createLimbArmGeometry(-1, torsoTopY, chubby, poly));

    // 4. 양다리 (상단이 몸통 하단 안쪽으로 깊숙이 맞물려 빈틈 0%)
    geometries.push(this.createLimbLegGeometry(1, legTopY, chubby, poly));
    geometries.push(this.createLimbLegGeometry(-1, legTopY, chubby, poly));

    // 5. 15종 귀
    const earGeoms = this.createEarsGeometry(state, headCenterY, headScale, poly);
    geometries.push(...earGeoms);

    // 6. 10종 꼬리 (뿌리를 몸통 안쪽 깊이 심어 외곽선 두께를 줄여도 떨어져 보이지 않음)
    const tailGeoms = this.createTailGeometry(state, torsoBotY, chubby, poly);
    geometries.push(...tailGeoms);

    // 6-1. 날개 (천사 날개, 악마 날개)
    if (state.wingType && state.wingType !== 'none') {
      const wingGeoms = this.createWingsGeometry(state, torsoTopY, chubby, headScale, poly);
      geometries.push(...wingGeoms);
    }

    // 7. 리본 & 추가 소품
    const accGeoms = this.createAccessoriesGeometry(state, headCenterY, torsoTopY, headScale, chubby, poly);
    geometries.push(...accGeoms);

    // 8. 머리카락 더듬이 (바보털)
    const ahogeGeoms = this.createAhogesGeometry(state, headCenterY, headScale, poly);
    geometries.push(...ahogeGeoms);

    // 9. 돌출형 3D 새 부리 (입 모양 '새 부리' 선택 시)
    if (state.mouthType === 'beak') {
      const beakGeoms = this.createBeakGeometry(state, headCenterY, headScale, poly);
      geometries.push(...beakGeoms);
    }

    const mergedGeometry = this.mergeGeometries(geometries, poly.facetBlend);
    const outlineTargetGeometries = geometries.filter((g) => !g.userData.noOutline);
    const mergedOutlineBase = this.mergeGeometries(outlineTargetGeometries, 0.0);

    const { bones, skeleton } = this.createSkeleton(legTopY, torsoTopY, headCenterY, headScale, chubby);

    const material = new THREE.MeshToonMaterial({
      map: this.texture,
      gradientMap: this.createToonGradientMap(state.lowPolyFlat, poly.isVeryLow, poly.isStandardPoly),
      flatShading: Boolean(state.lowPolyFlat),
    });

    const skinnedMesh = new THREE.SkinnedMesh(mergedGeometry, material);
    skinnedMesh.name = 'CustomAnimalCharacter';
    skinnedMesh.castShadow = true;
    skinnedMesh.receiveShadow = false;

    skinnedMesh.add(bones[0]);
    skinnedMesh.bind(skeleton);

    const rootGroup = new THREE.Group();
    rootGroup.name = 'CharacterRootGroup';
    rootGroup.add(skinnedMesh);

    let outlineMesh = null;
    if (state.outlineEnabled && (state.outlineThickness ?? 0.032) > 0.001) {
      const outlineGeo = this.createOutlineGeometry(mergedOutlineBase, state.outlineThickness ?? 0.032);
      const outlineMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(state.outlineColor || '#18181b'),
        side: THREE.BackSide,
      });
      outlineMesh = new THREE.SkinnedMesh(outlineGeo, outlineMat);
      outlineMesh.name = 'CharacterOutline';
      outlineMesh.bind(skeleton);
      rootGroup.add(outlineMesh);
    }

    return {
      rootGroup,
      skinnedMesh,
      outlineMesh,
      bones,
      skeleton,
      boneWorldPositions: this.computeBoneWorldPositions(legTopY, torsoTopY, headCenterY, headScale, chubby),
    };
  }

  createToonGradientMap(lowPolyFlat, isVeryLow, isStandardPoly) {
    let data;
    if (lowPolyFlat || isVeryLow) {
      data = new Uint8Array([115, 165, 212, 242, 255]);
    } else if (isStandardPoly) {
      data = new Uint8Array([145, 195, 235, 255]);
    } else {
      data = new Uint8Array([182, 228, 255]);
    }
    const gradTex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
    const useLinear = !lowPolyFlat && (isVeryLow || !isStandardPoly);
    gradTex.minFilter = useLinear ? THREE.LinearFilter : THREE.NearestFilter;
    gradTex.magFilter = useLinear ? THREE.LinearFilter : THREE.NearestFilter;
    gradTex.needsUpdate = true;
    return gradTex;
  }

  // ==========================================================================
  // 1. 머리 지오메트리 (정면 반구 전체 + 이마 투톤 정수리까지 끊김 없이 매핑!)
  // ==========================================================================
  createHeadGeometry(state, headCenterY, headScale, poly) {
    const segW = poly.headW;
    const segH = poly.headH;
    let geo = new THREE.SphereGeometry(1.0, segW, segH);

    const rx = 0.88 * headScale;
    const ry = 0.64 * headScale;
    const rz = 0.68 * headScale;

    const pos = geo.attributes.position;
    const skinIndices = [];
    const skinWeights = [];

    for (let i = 0; i < pos.count; i++) {
      const nx = pos.getX(i);
      const ny = pos.getY(i);
      const nz = pos.getZ(i);

      let vx, vy, vz;

      if (ny >= 0) {
        const domeR = Math.pow(Math.max(0.0, 1.0 - Math.pow(ny, 2.1)), 0.47);
        const origR = Math.max(0.0001, Math.sqrt(1.0 - ny * ny));
        const scaleHoriz = domeR / origR;

        vx = nx * rx * scaleHoriz;
        vy = Math.pow(ny, 0.94) * ry + headCenterY;
        vz = nz * rz * scaleHoriz;
      } else {
        const ay = -ny;
        const squircleR = Math.pow(Math.max(0.0, 1.0 - Math.pow(ay, 2.8)), 0.36);
        const origR = Math.max(0.0001, Math.sqrt(1.0 - ny * ny));
        const scaleHoriz = squircleR / origR;
        const flatY = -Math.pow(ay, poly.isVeryLow ? 0.68 : 0.54) * (ry * 0.70);

        vx = nx * rx * scaleHoriz;
        vy = flatY + headCenterY;
        vz = nz * rz * scaleHoriz;
      }

      pos.setXYZ(i, vx, vy, vz);

      if (ny < -0.82) {
        skinIndices.push(BONE_INDEX.HEAD, BONE_INDEX.NECK, 0, 0);
        skinWeights.push(0.8, 0.2, 0, 0);
      } else {
        skinIndices.push(BONE_INDEX.HEAD, 0, 0, 0);
        skinWeights.push(1.0, 0, 0, 0);
      }
    }

    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    geo = toSmoothNonIndexed(geo);
    const nPos = geo.attributes.position;
    const nUv = geo.attributes.uv;
    const bodyUV = getSwatchUV('body');
    const earOuterUV = getSwatchUV('earOuter');
    const isTwoTone = (Array.isArray(state.patterns) && state.patterns.includes('two_tone')) || state.patternType === 'two_tone';

    for (let i = 0; i < nPos.count; i += 3) {
      const dz0 = nPos.getZ(i) / headScale;
      const dz1 = nPos.getZ(i + 1) / headScale;
      const dz2 = nPos.getZ(i + 2) / headScale;

      const dy0 = (nPos.getY(i) - headCenterY) / headScale;
      const dy1 = (nPos.getY(i + 1) - headCenterY) / headScale;
      const dy2 = (nPos.getY(i + 2) - headCenterY) / headScale;

      const isFrontHemisphere = (dz0 >= -0.02 && dz1 >= -0.02 && dz2 >= -0.02);
      const isUpperCrownTwoTone = isTwoTone && (dy0 >= -0.02 && dy1 >= -0.02 && dy2 >= -0.02 && (dy0 + dy1 + dy2) > 0.02);

      if (isFrontHemisphere) {
        for (let k = 0; k < 3; k++) {
          const idx = i + k;
          const dx = nPos.getX(idx) / headScale;
          const dy = (nPos.getY(idx) - headCenterY) / headScale;
          const { u, v } = getHeadOrthographicUV(dx, dy);
          nUv.setXY(idx, u, v);
        }
      } else if (isUpperCrownTwoTone) {
        for (let k = 0; k < 3; k++) {
          nUv.setXY(i + k, earOuterUV.u, earOuterUV.v);
        }
      } else {
        for (let k = 0; k < 3; k++) {
          nUv.setXY(i + k, bodyUV.u, bodyUV.v);
        }
      }
    }

    return geo;
  }

  // ==========================================================================
  // 2. 몸통 지오메트리 (상단 목 부분과 하단 골반 부분이 머리·다리와 빈틈없이 맞물리도록 연장!)
  // ==========================================================================
  createTorsoGeometry(state, torsoBotY, torsoTopY, chubby, poly) {
    const segW = poly.torsoW;
    const segH = poly.torsoH;
    let geo = new THREE.SphereGeometry(1.0, segW, segH);

    const pos = geo.attributes.position;
    const skinIndices = [];
    const skinWeights = [];
    const outlineScales = [];

    const torsoH = torsoTopY - torsoBotY;
    const midY = (torsoBotY + torsoTopY) * 0.5;
    const topRx = 0.22 * chubby;
    const botRx = 0.31 * chubby;
    const topRz = 0.19 * chubby;
    const botRz = 0.24 * chubby;

    for (let i = 0; i < pos.count; i++) {
      const nx = pos.getX(i);
      const ny = pos.getY(i);
      const nz = pos.getZ(i);

      const signY = ny >= 0 ? 1 : -1;
      const ay = Math.abs(ny);
      const flatY = signY * Math.pow(ay, poly.isVeryLow ? 0.52 : 0.38);
      const t = (flatY + 1.0) * 0.5;

      const squircleHoriz = Math.pow(Math.max(0.0, 1.0 - Math.pow(ay, 4.2)), 0.22);
      const origR = Math.max(0.0001, Math.sqrt(1.0 - ny * ny));
      const radialFactor = squircleHoriz / origR;

      const neckTaper = ny > 0.65 ? Math.max(0.55, 1.0 - (ny - 0.65) * 1.1) : 1.0;
      const rx = (topRx * t + botRx * (1.0 - t)) * neckTaper;
      const rz = (topRz * t + botRz * (1.0 - t)) * neckTaper;

      const vx = nx * rx * radialFactor;
      // 상·하 높이를 0.53배로 넉넉히 확장해 머리 밑면 및 다리 윗면 안쪽으로 깊숙이 파고들게 함 (유격 0%)
      const vy = midY + flatY * (torsoH * 0.53);
      const vz = nz * rz * radialFactor;

      pos.setXYZ(i, vx, vy, vz);

      // 머리 밑면 내부(ny > 0.68) 및 다리 사이 내부(ny < -0.78)로 들어가는 캡의 외곽선을 0으로 마스킹하여 목 뒤 검은 고리 아티팩트 제거
      outlineScales.push(ny > 0.68 || ny < -0.78 ? 0.0 : 1.0);

      const upperW = Math.max(0, Math.min(1, (t - 0.25) / 0.55));
      skinIndices.push(BONE_INDEX.UPPER_BODY, BONE_INDEX.LOWER_BODY, 0, 0);
      skinWeights.push(upperW, 1.0 - upperW, 0, 0);
    }

    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
    geo.setAttribute('outlineScale', new THREE.Float32BufferAttribute(outlineScales, 1));

    geo = toSmoothNonIndexed(geo);
    const nPos = geo.attributes.position;
    const nUv = geo.attributes.uv;
    const bodyUV = getSwatchUV('body');

    for (let i = 0; i < nPos.count; i += 3) {
      const z0 = nPos.getZ(i);
      const z1 = nPos.getZ(i + 1);
      const z2 = nPos.getZ(i + 2);
      const isFront = state.bellyPatch && z0 >= -0.01 && z1 >= -0.01 && z2 >= -0.01 && (z0 + z1 + z2) > 0.02;

      if (isFront) {
        for (let k = 0; k < 3; k++) {
          const idx = i + k;
          const nxTorso = nPos.getX(idx) / (0.31 * chubby);
          const nyTorso = (nPos.getY(idx) - torsoBotY) / torsoH;
          const { u, v } = getTorsoFrontUV(nxTorso, nyTorso);
          nUv.setXY(idx, u, v);
        }
      } else {
        for (let k = 0; k < 3; k++) {
          nUv.setXY(i + k, bodyUV.u, bodyUV.v);
        }
      }
    }

    return geo;
  }

  // ==========================================================================
  // 3. 양팔 지오메트리 (어깨 구면 캡의 중심을 ARM 본 피벗과 1:1 일치시켜 모션 시 팔 비틀림·접힘 완벽 해결!)
  // ==========================================================================
  createLimbArmGeometry(dir, torsoTopY, chubby, poly) {
    const radialSegs = poly.limbRadial;
    const capSegs = poly.limbCap;
    const armRadius = 0.086 * chubby;
    const cylLen = 0.28;
    const totalLen = cylLen + armRadius * 2.0;

    let geo = new THREE.CapsuleGeometry(armRadius, cylLen, capSegs, radialSegs);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const armUV = getSwatchUV('arm');
    const skinIndices = [];
    const skinWeights = [];

    const armBone = dir > 0 ? BONE_INDEX.ARM_L : BONE_INDEX.ARM_R;
    const elbowBone = dir > 0 ? BONE_INDEX.ELBOW_L : BONE_INDEX.ELBOW_R;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      const t = Math.max(0, Math.min(1, 0.5 - y / totalLen));
      const taper = 0.82 + 0.24 * Math.sin(t * Math.PI * 0.85);

      const localY = y - cylLen * 0.5;
      pos.setXYZ(i, x * taper, localY, z * taper * 0.82);
      uv.setXY(i, armUV.u, armUV.v);

      if (t < 0.48) {
        skinIndices.push(armBone, 0, 0, 0);
        skinWeights.push(1.0, 0, 0, 0);
      } else {
        const elbowW = Math.min(0.75, ((t - 0.48) / 0.52) * 0.75);
        skinIndices.push(armBone, elbowBone, 0, 0);
        skinWeights.push(1.0 - elbowW, elbowW, 0, 0);
      }
    }

    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    const armAngle = 0.58;
    geo.rotateZ(dir * armAngle);
    geo.translate(dir * (0.175 * chubby), torsoTopY - 0.055, -0.015);

    return toSmoothNonIndexed(geo);
  }

  // ==========================================================================
  // 4. 양다리 지오메트리 (상단을 몸통 하단 안쪽으로 0.04만큼 깊숙이 밀어 넣어 다리 분리 현상 완벽 제거!)
  // ==========================================================================
  createLimbLegGeometry(dir, legTopY, chubby, poly) {
    const radialSegs = poly.limbRadial;
    const capSegs = poly.limbCap;
    const legRadius = 0.112 * chubby;
    const extTopY = legTopY + 0.04;
    const totalLen = extTopY;
    const cylLen = Math.max(0.06, totalLen - legRadius * 2.0);

    let geo = new THREE.CapsuleGeometry(legRadius, cylLen, capSegs, radialSegs);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const bodyUV = getSwatchUV('body');
    const skinIndices = [];
    const skinWeights = [];

    const centerX = dir * 0.145 * chubby;
    const centerY = totalLen * 0.5;

    const legBone = dir > 0 ? BONE_INDEX.LEG_L : BONE_INDEX.LEG_R;
    const kneeBone = dir > 0 ? BONE_INDEX.KNEE_L : BONE_INDEX.KNEE_R;
    const ankleBone = dir > 0 ? BONE_INDEX.ANKLE_L : BONE_INDEX.ANKLE_R;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i) + centerY;
      const z = pos.getZ(i);

      const t = Math.max(0, Math.min(1, 1.0 - y / totalLen));
      let modY = y;
      if (t < 0.28) {
        modY = extTopY - (extTopY - y) * 0.32;
      }
      const widen = 1.0 + 0.04 * Math.sin(t * Math.PI);
      const vx = centerX + dir * t * 0.012 + x * widen;
      const vy = Math.max(0.0, modY);
      const vz = z * 0.86;

      pos.setXYZ(i, vx, vy, vz);
      uv.setXY(i, bodyUV.u, bodyUV.v);

      if (t < 0.45) {
        skinIndices.push(legBone, kneeBone, 0, 0);
        skinWeights.push(0.8, 0.2, 0, 0);
      } else if (t < 0.78) {
        skinIndices.push(kneeBone, legBone, ankleBone, 0);
        skinWeights.push(0.65, 0.2, 0.15, 0);
      } else {
        skinIndices.push(ankleBone, kneeBone, 0, 0);
        skinWeights.push(0.75, 0.25, 0, 0);
      }
    }

    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    return toSmoothNonIndexed(geo);
  }

  // ==========================================================================
  // 5. 15종 동물 귀 (롭이어 토끼·강아지·햄스터·쥐 스케치 2번 1:1 재현 + 로우폴리곤 대응)
  // ==========================================================================
  createEarsGeometry(state, headCenterY, headScale, poly) {
    const type = state.earType || 'cat';
    if (type === 'none') return [];

    const list = [];
    const earZ = -0.02;

    if (type === 'axolotl') {
      [-1, 1].forEach((dir) => {
        const earBone = dir > 0 ? BONE_INDEX.EAR_L : BONE_INDEX.EAR_R;
        const gills = [
          { base: [dir * 0.68, 0.20, earZ], rotZ: -dir * 1.00, len: 0.48, w0: 0.075, w1: 0.095, curve: 0.04 },
          { base: [dir * 0.74, -0.02, earZ], rotZ: -dir * 1.52, len: 0.50, w0: 0.075, w1: 0.095, curve: 0.01 },
          { base: [dir * 0.68, -0.22, earZ], rotZ: -dir * 2.02, len: 0.44, w0: 0.070, w1: 0.088, curve: -0.03 },
        ];
        gills.forEach((g) => {
          list.push(this.createNaturalLobeEar({
            dir, earBone, headCenterY, headScale, poly,
            base: g.base,
            rotZ: g.rotZ,
            len: g.len,
            wBase: g.w0,
            wTip: g.w1,
            curveX: g.curve,
            thick: 0.065,
            hasInner: false,
          }));
        });
      });
      return list;
    }

    [-1, 1].forEach((dir) => {
      const earBone = dir > 0 ? BONE_INDEX.EAR_L : BONE_INDEX.EAR_R;

      if (type === 'cat') {
        list.push(this.createBezierPatchEar({
          dir, earBone, headCenterY, headScale, poly,
          in0:  [dir * 0.25, 0.50, earZ],
          in1:  [dir * 0.44, 0.86, earZ],
          out0: [dir * 0.85, 0.04, earZ],
          out1: [dir * 0.89, 0.62, earZ],
          tip:  [dir * 0.64, 0.96, earZ],
          baseCurve: 0.08,
          thick: 0.09,
          roundTip: 0.22,
          hasInner: true,
        }));
      } else if (type === 'fox') {
        list.push(this.createBezierPatchEar({
          dir, earBone, headCenterY, headScale, poly,
          in0:  [dir * 0.24, 0.50, earZ],
          in1:  [dir * 0.48, 0.94, earZ],
          out0: [dir * 0.85, 0.02, earZ],
          out1: [dir * 0.99, 0.68, earZ],
          tip:  [dir * 0.72, 1.09, earZ],
          baseCurve: 0.08,
          thick: 0.09,
          roundTip: 0.16,
          hasInner: true,
        }));
      } else if (type === 'wolf') {
        list.push(this.createBezierPatchEar({
          dir, earBone, headCenterY, headScale, poly,
          in0:  [dir * 0.26, 0.52, earZ],
          in1:  [dir * 0.42, 0.90, earZ],
          out0: [dir * 0.82, 0.06, earZ],
          out1: [dir * 0.78, 0.66, earZ],
          tip:  [dir * 0.58, 1.11, earZ],
          baseCurve: 0.08,
          thick: 0.09,
          roundTip: 0.10,
          hasInner: true,
        }));
      } else if (type === 'bear') {
        list.push(this.createRoundDiskEar({
          dir, earBone, headCenterY, headScale, poly,
          center: [dir * 0.66, 0.47, earZ],
          rx: 0.25, ry: 0.25, rz: 0.08,
          rotZ: -dir * 0.56,
          hasInner: true,
        }));
      } else if (type === 'mouse') {
        list.push(this.createRoundDiskEar({
          dir, earBone, headCenterY, headScale, poly,
          center: [dir * 0.66, 0.53, earZ],
          rx: 0.37, ry: 0.37, rz: 0.08,
          rotZ: -dir * 0.50,
          hasInner: true,
          innerUVScale: 0.49,
        }));
      } else if (type === 'hamster') {
        list.push(this.createRoundDiskEar({
          dir, earBone, headCenterY, headScale, poly,
          center: [dir * 0.68, 0.39, earZ],
          rx: 0.23, ry: 0.30, rz: 0.08,
          rotZ: -dir * 0.82,
          hasInner: true,
          innerUVScale: 0.44,
        }));
      } else if (type === 'dog') {
        list.push(this.createFoldedPuppyEar({
          dir, earBone, headCenterY, headScale, poly,
        }));
      } else if (type === 'deer1' || type === 'deer2') {
        list.push(this.createBezierPatchEar({
          dir, earBone, headCenterY, headScale, poly,
          in0:  [dir * 0.58, 0.36, earZ],
          in1:  [dir * 0.90, 0.62, earZ],
          out0: [dir * 0.78, 0.08, earZ],
          out1: [dir * 1.06, 0.26, earZ],
          tip:  [dir * 1.20, 0.54, earZ],
          baseCurve: 0.05,
          thick: 0.08,
          roundTip: 0.16,
          hasInner: true,
        }));

        if (type === 'deer2') {
          list.push(...this.createDeerAntler(dir, headCenterY, headScale, poly));
        }
      } else if (type === 'rabbit') {
        list.push(this.createNaturalLobeEar({
          dir, earBone, headCenterY, headScale, poly,
          base: [dir * 0.34, 0.46, earZ],
          rotZ: -dir * 0.06,
          len: 0.82,
          wBase: 0.18,
          wTip: 0.22,
          curveX: 0.0,
          thick: 0.085,
          hasInner: true,
        }));
      } else if (type === 'lop_rabbit') {
        list.push(this.createNaturalLobeEar({
          dir, earBone, headCenterY, headScale, poly,
          base: [dir * 0.68, 0.18, earZ],
          rotZ: -dir * 2.48,
          len: 0.74,
          wBase: 0.16,
          wTip: 0.26,
          curveX: -0.06,
          thick: 0.085,
          hasInner: true,
          invertU: dir > 0,
        }));
      } else if (type === 'raccoon') {
        list.push(this.createRoundDiskEar({
          dir, earBone, headCenterY, headScale, poly,
          center: [dir * 0.62, 0.44, earZ],
          rx: 0.26, ry: 0.29, rz: 0.08,
          rotZ: -dir * 0.54,
          hasInner: true,
        }));
      } else if (type === 'otter') {
        list.push(this.createRoundDiskEar({
          dir, earBone, headCenterY, headScale, poly,
          center: [dir * 0.75, 0.31, earZ],
          rx: 0.16, ry: 0.16, rz: 0.07,
          rotZ: -dir * 0.78,
          hasInner: true,
        }));
      } else if (type === 'lion') {
        list.push(this.createRoundDiskEar({
          dir, earBone, headCenterY, headScale, poly,
          center: [dir * 0.59, 0.43, 0.09],
          rx: 0.20, ry: 0.21, rz: 0.07,
          rotZ: -dir * 0.45,
          hasInner: true,
        }));
      }
    });

    if (type === 'lion') {
      list.push(...this.createLionManeGeometry(state, headCenterY, headScale, poly));
    }

    return list;
  }

  createLionManeGeometry(state, headCenterY, headScale, poly) {
    const maneUV = getSwatchUV('mane');
    const parts = [];
    const count = 16;
    const segW = poly ? (poly.isVeryLow ? 8 : 12) : 12;
    const segH = poly ? (poly.isVeryLow ? 6 : 8) : 8;

    const rxHead = 0.88 * headScale;
    const ryTop = 0.64 * headScale;
    const ryBot = 0.46 * headScale;
    const lobeR = 0.17 * headScale;

    // 16개의 갈기 꽃잎이 머리 둘레를 360도 완벽하게 하나의 통일된 원형/타원형으로 감싸도록 단일 연속 수식 적용
    // 상단(z = +0.025)에서 하단(z = +0.175)까지 자연스럽게 앞으로 전진하여 얼굴과 어우러지게 배치
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.5 + (i / count) * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const cx = cosA * (rxHead + lobeR * 0.06);
      const ryEff = sinA >= 0 ? ryTop : ryBot;
      const cy = headCenterY + sinA * (ryEff + lobeR * 0.12);
      const cz = (0.10 - sinA * 0.075) * headScale;

      const lobeGeo = new THREE.SphereGeometry(1.0, segW, segH);
      lobeGeo.scale(lobeR, lobeR, lobeR * 0.48);
      lobeGeo.translate(cx, cy, cz);
      lobeGeo.computeVertexNormals();

      const pos = lobeGeo.attributes.position;
      const uvs = [];
      const sIdx = [];
      const sW = [];
      const outScale = [];

      for (let k = 0; k < pos.count; k++) {
        uvs.push(maneUV.u, maneUV.v);
        sIdx.push(BONE_INDEX.HEAD, 0, 0, 0);
        sW.push(1.0, 0, 0, 0);
        outScale.push(0.90);
      }

      lobeGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      lobeGeo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
      lobeGeo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sW, 4));
      lobeGeo.setAttribute('outlineScale', new THREE.Float32BufferAttribute(outScale, 1));

      parts.push(toSmoothNonIndexed(lobeGeo));
    }

    return parts;
  }

  createNaturalLobeEar(opts) {
    const {
      dir, earBone, headCenterY, headScale, poly,
      base, rotZ, len, wBase, wTip,
      curveX = 0.0, thick = 0.085,
      hasInner = true, invertU = false,
    } = opts;

    const segU = poly.earLobeU;
    const segV = poly.earLobeV;
    let geo = new THREE.SphereGeometry(1.0, segU, segV);

    const pos = geo.attributes.position;
    const skinIndices = [];
    const skinWeights = [];
    const vertMeta = [];

    const cosR = Math.cos(rotZ);
    const sinR = Math.sin(rotZ);

    for (let i = 0; i < pos.count; i++) {
      const nx = pos.getX(i);
      const ny = pos.getY(i);
      const nz = pos.getZ(i);

      const s = (ny + 1.0) * 0.5;
      const halfW = wBase * (1.0 - s) + wTip * s;
      const bend = dir * curveX * Math.sin(s * Math.PI);

      const lx = nx * halfW + bend;
      const ly = s * len;
      const lz = nz * thick;

      const rx = lx * cosR - ly * sinR;
      const ry = lx * sinR + ly * cosR;

      const vx = (base[0] + rx) * headScale;
      const vy = headCenterY + (base[1] + ry) * headScale;
      const vz = (base[2] + lz) * headScale;

      pos.setXYZ(i, vx, vy, vz);

      let rawU = 0.5 + (nx * dir) * 0.45;
      if (invertU) rawU = 1.0 - rawU;
      const rawV = Math.max(0.02, Math.min(0.98, s * 0.92));
      vertMeta.push({ rawU, rawV, nz });

      const earW = Math.min(1.0, s * 1.1);
      skinIndices.push(earBone, BONE_INDEX.HEAD, 0, 0);
      skinWeights.push(earW, 1.0 - earW, 0, 0);
    }

    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    const indexAttr = geo.index;
    const triMeta = [];
    if (indexAttr) {
      for (let i = 0; i < indexAttr.count; i += 3) {
        triMeta.push([
          vertMeta[indexAttr.getX(i)],
          vertMeta[indexAttr.getX(i + 1)],
          vertMeta[indexAttr.getX(i + 2)],
        ]);
      }
    }

    geo = toSmoothNonIndexed(geo);
    this.applyEarTriangleUVs(geo, triMeta, hasInner);
    return geo;
  }

  createFoldedPuppyEar(opts) {
    const { dir, earBone, headCenterY, headScale, poly } = opts;
    const segU = poly.earLobeU;
    const segV = poly.earLobeV;
    let geo = new THREE.SphereGeometry(1.0, segU, segV);

    const pos = geo.attributes.position;
    const skinIndices = [];
    const skinWeights = [];

    const rotZ = -dir * 2.02;
    const cosR = Math.cos(rotZ);
    const sinR = Math.sin(rotZ);
    const base = [dir * 0.55, 0.42, 0.15];

    for (let i = 0; i < pos.count; i++) {
      const nx = pos.getX(i);
      const ny = pos.getY(i);
      const nz = pos.getZ(i);

      const s = (ny + 1.0) * 0.5;
      const halfW = 0.17 + 0.10 * Math.sin(s * Math.PI * 0.85);
      const archUp = -dir * 0.05 * Math.sin(s * Math.PI);

      const lx = nx * halfW + archUp;
      const ly = s * 0.56;
      const lz = nz * 0.075;

      const rx = lx * cosR - ly * sinR;
      const ry = lx * sinR + ly * cosR;

      const vx = (base[0] + rx) * headScale;
      const vy = headCenterY + (base[1] + ry) * headScale;
      const vz = (base[2] + lz) * headScale;

      pos.setXYZ(i, vx, vy, vz);

      const earW = Math.min(1.0, s * 1.1);
      skinIndices.push(earBone, BONE_INDEX.HEAD, 0, 0);
      skinWeights.push(earW, 1.0 - earW, 0, 0);
    }

    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    geo = toSmoothNonIndexed(geo);
    const nUv = geo.attributes.uv;
    const earOuterUV = getSwatchUV('earOuter');
    for (let i = 0; i < nUv.count; i++) {
      nUv.setXY(i, earOuterUV.u, earOuterUV.v);
    }
    return geo;
  }

  createBezierPatchEar(opts) {
    const {
      dir, earBone, headCenterY, headScale, poly,
      in0, in1, out0, out1, tip,
      baseCurve = 0.08,
      thick = 0.09, roundTip = 0.22,
      hasInner = true,
    } = opts;

    const segU = poly.earPointedU;
    const segV = poly.earPointedV;
    let geo = new THREE.SphereGeometry(1.0, segU, segV);

    const pos = geo.attributes.position;
    const skinIndices = [];
    const skinWeights = [];
    const vertMeta = [];

    for (let i = 0; i < pos.count; i++) {
      const nx = pos.getX(i);
      const ny = pos.getY(i);
      const nz = pos.getZ(i);

      const rawV = (ny + 1.0) * 0.5;
      const ringR = Math.max(0.0001, Math.sqrt(1.0 - ny * ny));
      const unitU = nx / ringR;
      const rawU = (unitU * dir + 1.0) * 0.5;

      const effV = rawV * (1.0 - roundTip * 0.24 * rawV * rawV);
      const pIn = evalQuadBezier(in0, in1, tip, effV);
      const pOut = evalQuadBezier(out0, out1, tip, effV);

      const rootArch = Math.sin(rawU * Math.PI) * baseCurve * Math.pow(1.0 - rawV, 1.4);
      const tipArch = Math.sin(rawV * Math.PI) * roundTip * 0.06 * Math.sin(rawU * Math.PI);

      const bx = pIn[0] * (1.0 - rawU) + pOut[0] * rawU;
      const by = pIn[1] * (1.0 - rawU) + pOut[1] * rawU + rootArch + tipArch;
      const bz = pIn[2] * (1.0 - rawU) + pOut[2] * rawU;

      const tipFade = Math.pow(Math.max(0.03, 1.0 - rawV * 0.82), 0.45);
      const vx = bx * headScale;
      const vy = headCenterY + by * headScale;
      const vz = (bz + nz * thick * tipFade) * headScale;

      pos.setXYZ(i, vx, vy, vz);
      vertMeta.push({ rawU, rawV, nz });

      const earW = Math.min(1.0, rawV * 1.1);
      skinIndices.push(earBone, BONE_INDEX.HEAD, 0, 0);
      skinWeights.push(earW, 1.0 - earW, 0, 0);
    }

    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    const indexAttr = geo.index;
    const triMeta = [];
    if (indexAttr) {
      for (let i = 0; i < indexAttr.count; i += 3) {
        triMeta.push([
          vertMeta[indexAttr.getX(i)],
          vertMeta[indexAttr.getX(i + 1)],
          vertMeta[indexAttr.getX(i + 2)],
        ]);
      }
    }

    geo = toSmoothNonIndexed(geo);
    this.applyEarTriangleUVs(geo, triMeta, hasInner);
    return geo;
  }

  createRoundDiskEar(opts) {
    const {
      dir, earBone, headCenterY, headScale, poly,
      center, rx, ry, rz, rotZ, hasInner,
      innerUVScale = 0.46,
    } = opts;

    const segW = poly.earRoundW;
    const segH = poly.earRoundH;
    const euler = new THREE.Euler(0, dir * 0.04, rotZ, 'XYZ');
    let geo = new THREE.SphereGeometry(1.0, segW, segH);

    const pos = geo.attributes.position;
    const skinIndices = [];
    const skinWeights = [];
    const vertMeta = [];

    for (let i = 0; i < pos.count; i++) {
      const nx = pos.getX(i);
      const ny = pos.getY(i);
      const nz = pos.getZ(i);

      const rawU = Math.max(0.02, Math.min(0.98, 0.5 + (nx * dir) * innerUVScale));
      const rawV = Math.max(0.02, Math.min(0.98, (ny + 1.0) * 0.48));

      const vec = new THREE.Vector3(nx * rx, ny * ry, nz * rz);
      vec.applyEuler(euler);
      vec.x = (vec.x + center[0]) * headScale;
      vec.y = headCenterY + (vec.y + center[1]) * headScale;
      vec.z = (vec.z + center[2]) * headScale;

      pos.setXYZ(i, vec.x, vec.y, vec.z);
      vertMeta.push({ rawU, rawV, nz });

      skinIndices.push(earBone, BONE_INDEX.HEAD, 0, 0);
      skinWeights.push(0.6, 0.4, 0, 0);
    }

    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    const indexAttr = geo.index;
    const triMeta = [];
    if (indexAttr) {
      for (let i = 0; i < indexAttr.count; i += 3) {
        triMeta.push([
          vertMeta[indexAttr.getX(i)],
          vertMeta[indexAttr.getX(i + 1)],
          vertMeta[indexAttr.getX(i + 2)],
        ]);
      }
    }

    geo = toSmoothNonIndexed(geo);
    this.applyEarTriangleUVs(geo, triMeta, hasInner);
    return geo;
  }

  applyEarTriangleUVs(geo, triMeta, hasInner) {
    const nUv = geo.attributes.uv;
    const earOuterUV = getSwatchUV('earOuter');

    for (let t = 0; t < triMeta.length; t++) {
      const [m0, m1, m2] = triMeta[t];
      const baseIdx = t * 3;
      const avgNz = (m0.nz + m1.nz + m2.nz) / 3.0;
      if (hasInner && avgNz > 0.0001 && m0.nz >= -0.01 && m1.nz >= -0.01 && m2.nz >= -0.01) {
        const uv0 = getEarVertexUV(m0.rawU, m0.rawV, m0.nz, true);
        const uv1 = getEarVertexUV(m1.rawU, m1.rawV, m1.nz, true);
        const uv2 = getEarVertexUV(m2.rawU, m2.rawV, m2.nz, true);
        nUv.setXY(baseIdx, uv0.u, uv0.v);
        nUv.setXY(baseIdx + 1, uv1.u, uv1.v);
        nUv.setXY(baseIdx + 2, uv2.u, uv2.v);
      } else {
        nUv.setXY(baseIdx, earOuterUV.u, earOuterUV.v);
        nUv.setXY(baseIdx + 1, earOuterUV.u, earOuterUV.v);
        nUv.setXY(baseIdx + 2, earOuterUV.u, earOuterUV.v);
      }
    }
  }

  createDeerAntler(dir, headCenterY, headScale, poly) {
    const parts = [];
    const antlerUV = getSwatchUV('antler');
    const radSeg = poly.limbRadial;
    const capSeg = poly.limbCap;

    const makeBranch = (p0, p1, r0, r1) => {
      const v0 = new THREE.Vector3(p0[0] * headScale, headCenterY + p0[1] * headScale, p0[2] * headScale);
      const v1 = new THREE.Vector3(p1[0] * headScale, headCenterY + p1[1] * headScale, p1[2] * headScale);
      const diff = new THREE.Vector3().subVectors(v1, v0);
      const len = diff.length();
      const mid = new THREE.Vector3().addVectors(v0, v1).multiplyScalar(0.5);

      let geo = new THREE.CapsuleGeometry(((r0 + r1) * 0.5) * headScale, Math.max(0.02, len - r1 * headScale), capSeg, radSeg);
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.clone().normalize());
      geo.applyQuaternion(quat);
      geo.translate(mid.x, mid.y, mid.z);

      const p = geo.attributes.position;
      const u = geo.attributes.uv;
      const sIdx = [];
      const sW = [];
      const oScale = [];
      for (let i = 0; i < p.count; i++) {
        u.setXY(i, antlerUV.u, antlerUV.v);
        sIdx.push(BONE_INDEX.HEAD, 0, 0, 0);
        sW.push(1.0, 0, 0, 0);
        oScale.push(0.55);
      }
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sW, 4));
      geo.setAttribute('outlineScale', new THREE.Float32BufferAttribute(oScale, 1));
      return toSmoothNonIndexed(geo);
    };

    const z = -0.02;
    parts.push(makeBranch([dir * 0.25, 0.54, z], [dir * 0.37, 0.88, z], 0.052, 0.045));
    parts.push(makeBranch([dir * 0.37, 0.88, z], [dir * 0.33, 1.14, z], 0.045, 0.036));
    parts.push(makeBranch([dir * 0.33, 0.78, z], [dir * 0.50, 0.94, z], 0.038, 0.030));
    parts.push(makeBranch([dir * 0.35, 0.96, z], [dir * 0.20, 1.08, z], 0.036, 0.028));

    return parts;
  }

  // ==========================================================================
  // 6. 꼬리 10종 (동그란·긴·뭉툭한·복슬·햄스터·쥐·사자·너구리·인어·없음)
  // ==========================================================================
  createTailGeometry(state, torsoBotY, chubby, poly) {
    const type = state.tailType || 'long';
    if (type === 'none') return [];

    const bodyUV = getSwatchUV('body');
    const tipUV = getSwatchUV('tailTip');
    const maneUV = getSwatchUV('mane');
    const darkUV = getSwatchUV('dark');

    const baseY = torsoBotY + 0.14;
    const baseZ = -0.07 * chubby;

    const segW = poly.tailW;
    const segH = poly.tailH;
    let geo = new THREE.SphereGeometry(1.0, segW, segH);

    const pos = geo.attributes.position;
    const skinIndices = [];
    const skinWeights = [];
    const outlineScales = [];
    const vertT = [];
    const rawNy = [];

    for (let i = 0; i < pos.count; i++) {
      const nx = pos.getX(i);
      const ny = pos.getY(i);
      const nz = pos.getZ(i);

      rawNy.push(ny);
      const t = (ny + 1.0) * 0.5;
      vertT.push(t);

      const ringR = Math.max(0.0001, Math.sqrt(1.0 - ny * ny));
      const rootPlug = ny < -0.15 ? Math.max(1.0, 0.62 / Math.max(0.18, ringR)) : 1.0;

      let vx = 0, vy = 0, vz = 0;

      if (type === 'round') {
        // 동그란 토끼 꼬리: 몸통 뒷면(-0.22 * chubby) 바깥쪽으로 봉긋하고 동그란 방울 실루엣이 75% 이상 드러나도록 배치!
        const r = 0.178;
        vx = nx * r;
        vy = baseY + 0.03 + ny * r;
        vz = (-0.285 * chubby) + nz * r;
        outlineScales.push(nz > 0.45 ? 0.0 : 1.0);
      } else if (type === 'long') {
        const r = 0.084 * (1.0 - t * 0.12);
        const spineY = Math.pow(t, 1.30) * 0.44 + Math.sin(t * Math.PI * 1.5) * 0.05;
        const spineZ = -t * 0.62;
        vx = nx * r * rootPlug;
        vy = baseY + spineY + nz * r * rootPlug + (ny > 0 ? ny * r * 0.45 : 0);
        vz = baseZ + spineZ - (ny > 0 ? ny * r * 0.65 : 0);
        outlineScales.push(t < 0.12 ? 0.0 : 1.0);
      } else if (type === 'stubby') {
        const r = 0.175 * (0.85 + 0.22 * Math.sin(t * Math.PI));
        const spineY = -t * 0.03 + Math.sin(t * Math.PI) * 0.04;
        const spineZ = -t * 0.54;
        vx = nx * r * rootPlug;
        vy = baseY + spineY + nz * r * rootPlug;
        vz = baseZ + spineZ - (ny > 0 ? ny * r * 0.65 : 0);
        outlineScales.push(t < 0.12 ? 0.0 : 1.0);
      } else if (type === 'fluffy') {
        const r = 0.22 * (0.75 + 0.35 * Math.sin(Math.pow(t, 0.8) * Math.PI));
        const spineY = t * 0.30;
        const spineZ = -t * 0.62;
        vx = nx * r * rootPlug;
        vy = baseY + spineY + nz * r * rootPlug + (ny > 0 ? ny * r * 0.45 : 0);
        vz = baseZ + spineZ - (ny > 0 ? ny * r * 0.65 : 0);
        outlineScales.push(t < 0.12 ? 0.0 : 1.0);
      } else if (type === 'hamster') {
        // 햄스터 꼬리: 뭉툭한 꼬리를 아주 짧고 작게 변형한 귀여운 꼬투리
        const r = 0.092 * (0.85 + 0.22 * Math.sin(t * Math.PI));
        const spineY = -t * 0.015 + Math.sin(t * Math.PI) * 0.02;
        const spineZ = -t * 0.17;
        vx = nx * r * rootPlug;
        vy = baseY + spineY + nz * r * rootPlug;
        vz = baseZ - 0.11 * chubby + spineZ - (ny > 0 ? ny * r * 0.4 : 0);
        outlineScales.push(t < 0.15 ? 0.0 : 1.0);
      } else if (type === 'mouse') {
        // 쥐 꼬리: 긴 꼬리를 가늘고 길게 변형한 와이어형 꼬리
        const r = 0.042 * (1.0 - t * 0.52);
        const spineY = -t * 0.05 + Math.sin(t * Math.PI * 1.8) * 0.07 + Math.pow(t, 2.2) * 0.26;
        const spineZ = -t * 0.82;
        const spineX = Math.sin(t * Math.PI) * 0.04;
        vx = spineX + nx * r * rootPlug;
        vy = baseY + spineY + nz * r * rootPlug;
        vz = baseZ + spineZ - (ny > 0 ? ny * r * 0.35 : 0);
        outlineScales.push(t < 0.10 ? 0.0 : 1.0);
      } else if (type === 'lion') {
        // 사자 꼬리: 가늘게 뻗어 나가다 끝에 탐스러운 털술(갈기색)이 맺히는 실루엣
        let r = 0.046 * (1.0 - t * 0.15);
        let tuftY = 0;
        if (t >= 0.76) {
          const tuftT = (t - 0.76) / 0.24;
          const tuftR = 0.04 + Math.sin(tuftT * Math.PI) * 0.128;
          r = tuftR;
          if (tuftT > 0.82) {
            tuftY = (tuftT - 0.82) * 0.06;
          }
        }
        const spineY = Math.pow(t, 1.35) * 0.42 + Math.sin(t * Math.PI * 1.4) * 0.06 + tuftY;
        const spineZ = -t * 0.68;
        const spineX = Math.sin(t * Math.PI * 1.1) * 0.06;
        vx = spineX + nx * r * rootPlug;
        vy = baseY + spineY + nz * r * rootPlug;
        vz = baseZ + spineZ;
        outlineScales.push(t < 0.12 ? 0.0 : 1.0);
      } else if (type === 'raccoon') {
        // 너구리 꼬리: 등 뒤로 자연스럽게 뻗으며, 몸통 쪽은 좁고 뒤로 갈수록 도톰하게 팽창(r=0.20)하며 끝은 완벽한 둥근 돔!
        let r = 0;
        if (t < 0.65) {
          const u = t / 0.65;
          r = 0.07 + Math.sin(u * Math.PI * 0.5) * 0.13;
        } else {
          r = 0.20;
        }
        const spineY = -t * 0.14;
        const spineZ = -t * 0.52;
        vx = nx * r * rootPlug;
        vy = baseY + spineY + nz * r * rootPlug;
        vz = baseZ + spineZ - (ny > 0 ? ny * r * 0.60 : 0);
        outlineScales.push(t < 0.12 ? 0.0 : 1.0);
      } else if (type === 'mermaid') {
        // 인어 꼬리: 엉덩이 하단에서 바닥 쪽으로 자연스럽게 흐르는 원통형 몸통(t<0.65) + 끝에서 매끄럽게 일체화되어 펼쳐지는 플루크 지느러미(t>=0.65)
        if (t < 0.65) {
          const u = t / 0.65;
          const spineY = -u * 0.35;
          const spineZ = -u * 0.45;
          const r = 0.17 * (1.0 - u * 0.30);
          vx = nx * r * rootPlug;
          vy = baseY + spineY + nz * r * rootPlug;
          vz = baseZ + spineZ - (ny > 0 ? ny * r * 0.60 : 0);
        } else {
          const u = (t - 0.65) / 0.35;
          const spineY = -0.35 - u * 0.12;
          const spineZ = -0.45 - u * 0.25;
          const finSpan = 0.12 + Math.sin(u * Math.PI * 0.5) * 0.36;
          const thick = 0.045 * (1.0 - u * 0.65);
          const notch = (1.0 - Math.min(1.0, Math.abs(nx) * 2.2)) * 0.08 * u;
          const sweep = u * 0.12 + Math.abs(nx) * 0.07 * u;
          vx = nx * finSpan;
          vy = baseY + spineY + nz * thick;
          vz = baseZ + spineZ - sweep + notch + nz * thick;
        }
        outlineScales.push(t < 0.10 ? 0.0 : 1.0);
      }

      pos.setXYZ(i, vx, vy, vz);

      // 본 스키닝 웨이트: 회전 중심(Base)에서 꼬리 끝(Tip)으로 갈수록 단절 없이 매끄럽게 보간
      const tipWeight = (type === 'round' || type === 'hamster')
        ? 0.10
        : Math.pow(Math.max(0, t), 1.35);
      skinIndices.push(BONE_INDEX.TAIL_BASE, BONE_INDEX.TAIL_TIP, BONE_INDEX.LOWER_BODY, 0);
      skinWeights.push((1.0 - tipWeight) * 0.90, tipWeight * 0.90, 0.10, 0);
    }

    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
    geo.setAttribute('outlineScale', new THREE.Float32BufferAttribute(outlineScales, 1));

    const indexAttr = geo.index;
    const triT = [];
    const triRowT = [];
    if (indexAttr) {
      for (let i = 0; i < indexAttr.count; i += 3) {
        const i0 = indexAttr.getX(i);
        const i1 = indexAttr.getX(i + 1);
        const i2 = indexAttr.getX(i + 2);
        const y0 = rawNy[i0];
        const y1 = rawNy[i1];
        const y2 = rawNy[i2];
        const rowMidY = (Math.min(y0, y1, y2) + Math.max(y0, y1, y2)) * 0.5;
        const rowT = (rowMidY + 1.0) * 0.5;
        triRowT.push(rowT);

        const tAvg = (vertT[i0] + vertT[i1] + vertT[i2]) / 3;
        triT.push(tAvg);
      }
    }

    geo = toSmoothNonIndexed(geo);
    const nUv = geo.attributes.uv;

    for (let tIdx = 0; tIdx < triT.length; tIdx++) {
      const t = triT[tIdx];
      let targetUV = bodyUV;

      if (type === 'round') {
        if (state.tailTipEnabled && t > 0.55) targetUV = tipUV;
      } else if (type === 'long') {
        if (state.tailTipEnabled && t > 0.68) targetUV = tipUV;
      } else if (type === 'stubby') {
        if (state.tailTipEnabled && ((t > 0.70) || (t > 0.34 && t < 0.52))) targetUV = tipUV;
      } else if (type === 'fluffy') {
        if (state.tailTipEnabled && t > 0.62) targetUV = tipUV;
      } else if (type === 'hamster') {
        if (state.tailTipEnabled && t > 0.55) targetUV = tipUV;
      } else if (type === 'mouse') {
        if (state.tailTipEnabled && t > 0.72) targetUV = tipUV;
      } else if (type === 'lion') {
        if (t > 0.76) {
          targetUV = state.tailTipEnabled ? tipUV : maneUV;
        }
      } else if (type === 'raccoon') {
        // 너구리 꼬리: 완벽한 수평 링 줄무늬 (사선 분할 지그재그 0%)
        const rowT = triRowT[tIdx] ?? t;
        const band = Math.floor(rowT * 7);
        const isStripe = (band % 2 === 1) || (rowT > 0.88);
        targetUV = isStripe ? (state.tailTipEnabled ? tipUV : darkUV) : bodyUV;
      } else if (type === 'mermaid') {
        if (state.tailTipEnabled && t > 0.68) targetUV = tipUV;
      }

      const baseV = tIdx * 3;
      nUv.setXY(baseV, targetUV.u, targetUV.v);
      nUv.setXY(baseV + 1, targetUV.u, targetUV.v);
      nUv.setXY(baseV + 2, targetUV.u, targetUV.v);
    }

    return [geo];
  }

  // ==========================================================================
  // 6-2. 날개 3D 지오메트리 (천사 날개 & 악마 날개)
  // ==========================================================================
  createWingsGeometry(state, torsoTopY, chubby, headScale, poly) {
    const wingType = state.wingType || 'none';
    if (wingType === 'angel') {
      return this.createAngelWingsMesh(torsoTopY, chubby, headScale, poly);
    }
    if (wingType === 'devil') {
      return this.createDevilWingsMesh(torsoTopY, chubby, headScale, poly);
    }
    return [];
  }

  // 천사 날개 (첨부 레퍼런스 media_1791110826164 기준 1:1 정밀 벡터화)
  createAngelWingsMesh(torsoTopY, chubby, headScale, poly) {
    const whiteUV = getSwatchUV('white');
    const parts = [];

    const angelPts = [
      [0.3881, 0.5358], [0.3375, 0.4472], [0.2742, 0.3839], [0.1139, 0.2911],
      [0.0506, 0.2405], [0.0127, 0.1856], [0.0, 0.135], [0.0042, 0.0928],
      [0.0211, 0.0506], [0.0548, 0.0127], [0.0844, 0.0], [0.1308, 0.0],
      [0.1519, 0.0084], [0.1772, 0.0338], [0.1898, 0.0675], [0.1814, 0.1013],
      [0.1645, 0.1181], [0.1139, 0.1266], [0.0928, 0.1013], [0.097, 0.0802],
      [0.1266, 0.0717], [0.1477, 0.0844], [0.1519, 0.0717], [0.1266, 0.0506],
      [0.0928, 0.0591], [0.0717, 0.0928], [0.0844, 0.1266], [0.1055, 0.1434],
      [0.1392, 0.1477], [0.1645, 0.1392], [0.1983, 0.1055], [0.2067, 0.0759],
      [0.2278, 0.0633], [0.2784, 0.0675], [0.3164, 0.097], [0.3291, 0.1434],
      [0.2953, 0.1392], [0.2658, 0.1561], [0.2742, 0.1645], [0.3248, 0.1603],
      [0.3628, 0.1772], [0.3923, 0.2109], [0.4134, 0.2658], [0.4092, 0.308],
      [0.3966, 0.3248], [0.3291, 0.2784], [0.3122, 0.2827], [0.3923, 0.3502],
      [0.4177, 0.405], [0.4177, 0.4725], [0.3923, 0.54],
    ];

    const shape = new THREE.Shape();
    shape.moveTo(angelPts[0][0], angelPts[0][1]);
    for (let i = 1; i < angelPts.length; i++) {
      shape.lineTo(angelPts[i][0], angelPts[i][1]);
    }
    shape.closePath();

    const extrudeSettings = {
      depth: 0.040 * headScale,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.003 * headScale,
      bevelThickness: 0.008 * headScale,
    };

    const wingScale = 1.30 * headScale;

    [-1, 1].forEach((dir) => {
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.translate(0, 0, -extrudeSettings.depth * 0.5);

      if (dir === -1) {
        geo.scale(-1, 1, 1);
        reverseGeometryWinding(geo);
      }

      geo.scale(wingScale, wingScale, wingScale);
      geo.rotateY(dir * 0.15);
      geo.rotateZ(dir * -0.10);
      geo.translate(
        dir * (0.16 * chubby + 0.12 * headScale),
        torsoTopY - 0.38 * headScale,
        -0.38 * chubby - 0.28 * headScale
      );

      const p = geo.attributes.position;
      const u = geo.attributes.uv;
      const sIdx = [];
      const sW = [];
      const oScale = [];
      for (let i = 0; i < p.count; i++) {
        u.setXY(i, whiteUV.u, whiteUV.v);
        sIdx.push(BONE_INDEX.UPPER_BODY, 0, 0, 0);
        sW.push(1.0, 0, 0, 0);
        oScale.push(1.0);
      }
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sW, 4));
      geo.setAttribute('outlineScale', new THREE.Float32BufferAttribute(oScale, 1));
      parts.push(toSmoothNonIndexed(geo));
    });

    return parts;
  }

  // 악마 날개 (첨부 레퍼런스 media_1791110840479 기준 1:1 정밀 벡터화: 검은 뼈대 프레임 + 3단 진홍빛 피막)
  createDevilWingsMesh(torsoTopY, chubby, headScale, poly) {
    const darkUV = getSwatchUV('dark');
    const devilRedUV = getSwatchUV('devilRed');
    const parts = [];

    const devilSilPts = [
      [0.1302, 0.4374], [0.1276, 0.414], [0.1328, 0.4088], [0.1354, 0.3671],
      [0.1406, 0.3541], [0.1406, 0.2942], [0.1328, 0.2604], [0.0859, 0.1406],
      [0.0547, 0.0885], [0.0026, 0.0182], [0.0, 0.0], [0.0104, 0.0],
      [0.0729, 0.0391], [0.0833, 0.0547], [0.0885, 0.0469], [0.1406, 0.0651],
      [0.1901, 0.0677], [0.2265, 0.0625], [0.2447, 0.0547], [0.2525, 0.0599],
      [0.2578, 0.0495], [0.2838, 0.0443], [0.2812, 0.0599], [0.2864, 0.0599],
      [0.2994, 0.0989], [0.3411, 0.1432], [0.3801, 0.164], [0.4114, 0.1666],
      [0.44, 0.1614], [0.4322, 0.1692], [0.4348, 0.1744], [0.4478, 0.1588],
      [0.4582, 0.1588], [0.4608, 0.1849], [0.4791, 0.2187], [0.5129, 0.2525],
      [0.5441, 0.2682], [0.5363, 0.2786], [0.5389, 0.2812], [0.5493, 0.2734],
      [0.5806, 0.276], [0.5806, 0.289], [0.5233, 0.328], [0.4218, 0.3671],
      [0.3228, 0.3853], [0.2343, 0.3853], [0.2005, 0.3801], [0.1588, 0.4322],
      [0.1328, 0.44],
    ];

    const devilBonePts = [
      [0.1302, 0.4374], [0.1276, 0.414], [0.1328, 0.4088], [0.1354, 0.3671],
      [0.1406, 0.3541], [0.1406, 0.2942], [0.1328, 0.2604], [0.0859, 0.1406],
      [0.0547, 0.0885], [0.0026, 0.0182], [0.0, 0.0], [0.0104, 0.0],
      [0.0781, 0.0443], [0.164, 0.2317], [0.1744, 0.2447], [0.1849, 0.2317],
      [0.2135, 0.151], [0.2578, 0.0495], [0.2838, 0.0443], [0.2838, 0.0547],
      [0.2499, 0.1224], [0.1927, 0.2682], [0.1927, 0.276], [0.2161, 0.2994],
      [0.2369, 0.3124], [0.3463, 0.2473], [0.4218, 0.1875], [0.4478, 0.1588],
      [0.4608, 0.1614], [0.4634, 0.1822], [0.44, 0.2031], [0.3463, 0.276],
      [0.2682, 0.3254], [0.2864, 0.3385], [0.3359, 0.3541], [0.3853, 0.3515],
      [0.4764, 0.3228], [0.5285, 0.2916], [0.5493, 0.2734], [0.5806, 0.276],
      [0.5806, 0.289], [0.5233, 0.328], [0.4218, 0.3671], [0.3228, 0.3853],
      [0.2343, 0.3853], [0.2005, 0.3801], [0.1588, 0.4322], [0.1328, 0.44],
    ];

    const devilHolePts = [
      [0.1432, 0.427], [0.1614, 0.4192], [0.1692, 0.4114], [0.1849, 0.3905],
      [0.1875, 0.3801], [0.151, 0.3723], [0.1432, 0.3827], [0.1354, 0.4062],
      [0.1354, 0.4218], [0.1406, 0.4244],
    ];

    // 1) 붉은 피막 Shape
    const membraneShape = new THREE.Shape();
    membraneShape.moveTo(devilSilPts[0][0], devilSilPts[0][1]);
    for (let i = 1; i < devilSilPts.length; i++) {
      membraneShape.lineTo(devilSilPts[i][0], devilSilPts[i][1]);
    }
    membraneShape.closePath();

    // 2) 검은 뼈대 골격 Shape (상단 엄지 뿔 홀 포함)
    const boneShape = new THREE.Shape();
    boneShape.moveTo(devilBonePts[0][0], devilBonePts[0][1]);
    for (let i = 1; i < devilBonePts.length; i++) {
      boneShape.lineTo(devilBonePts[i][0], devilBonePts[i][1]);
    }
    boneShape.closePath();

    if (devilHolePts.length > 2) {
      const holePath = new THREE.Path();
      holePath.moveTo(devilHolePts[0][0], devilHolePts[0][1]);
      for (let i = 1; i < devilHolePts.length; i++) {
        holePath.lineTo(devilHolePts[i][0], devilHolePts[i][1]);
      }
      holePath.closePath();
      boneShape.holes.push(holePath);
    }

    const membraneSettings = {
      depth: 0.016 * headScale,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.005 * headScale,
      bevelThickness: 0.006 * headScale,
    };

    const boneSettings = {
      depth: 0.024 * headScale,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.006 * headScale,
      bevelThickness: 0.007 * headScale,
    };

    const wingScale = 1.30 * headScale;

    [-1, 1].forEach((dir) => {
      const processGeo = (geo, uv, outlineScaleVal, zThick) => {
        geo.translate(0, 0, -zThick * 0.5);

        if (dir === -1) {
          geo.scale(-1, 1, 1);
          reverseGeometryWinding(geo);
        }

        geo.scale(wingScale, wingScale, wingScale);
        geo.rotateY(dir * 0.15);
        geo.rotateZ(dir * -0.10);
        geo.translate(
          dir * (0.16 * chubby + 0.12 * headScale),
          torsoTopY - 0.38 * headScale,
          -0.38 * chubby - 0.28 * headScale
        );

        const p = geo.attributes.position;
        const u = geo.attributes.uv;
        const sIdx = [];
        const sW = [];
        const oScale = [];
        for (let i = 0; i < p.count; i++) {
          u.setXY(i, uv.u, uv.v);
          sIdx.push(BONE_INDEX.UPPER_BODY, 0, 0, 0);
          sW.push(1.0, 0, 0, 0);
          oScale.push(outlineScaleVal);
        }
        geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
        geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sW, 4));
        geo.setAttribute('outlineScale', new THREE.Float32BufferAttribute(oScale, 1));
        parts.push(toSmoothNonIndexed(geo));
      };

      // 1. 붉은 피막 (기저부)
      const memGeo = new THREE.ExtrudeGeometry(membraneShape, membraneSettings);
      processGeo(memGeo, devilRedUV, 0.55, membraneSettings.depth);

      // 2. 검은 뼈대 프레임 (피막 앞뒤로 입체 돌출)
      const boneGeo = new THREE.ExtrudeGeometry(boneShape, boneSettings);
      processGeo(boneGeo, darkUV, 0.65, boneSettings.depth);
    });

    return parts;
  }

  // ==========================================================================
  // 7. 리본 & 추가 소품 (사각 안경 추가 + 로우폴리곤 세그먼트 연동)
  // ==========================================================================
  createAccessoriesGeometry(state, headCenterY, torsoTopY, headScale, chubby, poly) {
    const list = [];
    const rScale = (state.ribbonScale ?? 1.0) * headScale;

    const ribbons = Array.isArray(state.ribbons)
      ? state.ribbons
      : (state.ribbonType && state.ribbonType !== 'none' ? [state.ribbonType] : []);

    ribbons.forEach((rType) => {
      if (rType === 'ear_left') {
        list.push(...this.createBowMesh([0.48 * headScale, headCenterY + 0.48 * headScale, 0.36 * headScale], [0.08, 0.32, -0.32], 0.22 * rScale, BONE_INDEX.HEAD, false, poly));
      } else if (rType === 'ear_right') {
        list.push(...this.createBowMesh([-0.48 * headScale, headCenterY + 0.48 * headScale, 0.36 * headScale], [0.08, -0.32, 0.32], 0.22 * rScale, BONE_INDEX.HEAD, false, poly));
      } else if (rType === 'double_ears') {
        list.push(...this.createBowMesh([0.50 * headScale, headCenterY + 0.46 * headScale, 0.34 * headScale], [0.08, 0.32, -0.32], 0.17 * rScale, BONE_INDEX.HEAD, false, poly));
        list.push(...this.createBowMesh([-0.50 * headScale, headCenterY + 0.46 * headScale, 0.34 * headScale], [0.08, -0.32, 0.32], 0.17 * rScale, BONE_INDEX.HEAD, false, poly));
      } else if (rType === 'head_top') {
        list.push(...this.createBowMesh([0, headCenterY + 0.65 * headScale, 0.22 * headScale], [-0.12, 0, 0], 0.26 * rScale, BONE_INDEX.HEAD, false, poly));
      } else if (rType === 'neck_bow') {
        list.push(...this.createBowMesh([0, torsoTopY - 0.05, 0.22 * chubby], [0.06, 0, 0], 0.19 * (state.ribbonScale ?? 1.0), BONE_INDEX.UPPER_BODY, false, poly));
      } else if (rType === 'chest_big_bow') {
        list.push(...this.createBowMesh([0, torsoTopY - 0.11, 0.24 * chubby], [0.10, 0, 0], 0.25 * (state.ribbonScale ?? 1.0), BONE_INDEX.UPPER_BODY, true, poly));
      }
    });

    const extras = Array.isArray(state.extraAccessories)
      ? state.extraAccessories
      : (state.extraAccType && state.extraAccType !== 'none' ? [state.extraAccType] : []);

    extras.forEach((extra) => {
      if (extra === 'sprout') {
        list.push(...this.createSproutMesh(headCenterY, headScale, poly));
      } else if (extra === 'crown') {
        list.push(...this.createCrownMesh(headCenterY, headScale, poly));
      } else if (extra === 'beret') {
        list.push(...this.createBeretMesh(headCenterY, headScale, poly));
      } else if (extra === 'star_pin') {
        list.push(...this.createStarPinMesh(state, headCenterY, headScale, poly));
      } else if (extra === 'glasses') {
        list.push(...this.createGlassesMesh(headCenterY, headScale, poly));
      } else if (extra === 'square_glasses') {
        list.push(...this.createSquareGlassesMesh(headCenterY, headScale, poly));
      } else if (extra === 'halo') {
        list.push(...this.createHaloMesh(headCenterY, headScale, poly));
      } else if (extra === 'devil_horns') {
        list.push(...this.createDevilHornsMesh(headCenterY, headScale, poly));
      } else if (extra === 'monocle') {
        list.push(...this.createMonocleMesh(headCenterY, headScale, poly));
      }
    });

    return list;
  }

  createBowMesh(pos, rot, size, boneIdx, withTails = false, poly) {
    const parts = [];
    const accUV = getSwatchUV('accessory');
    const euler = new THREE.Euler(rot[0], rot[1], rot[2], 'XYZ');
    const center = new THREE.Vector3(...pos);
    const segW = poly ? poly.accW : 16;
    const segH = poly ? poly.accH : 12;

    const transformAndSkin = (geo, oScaleVal = 0.45) => {
      const p = geo.attributes.position;
      const u = geo.attributes.uv;
      const sIdx = [];
      const sW = [];
      const oScale = [];
      for (let i = 0; i < p.count; i++) {
        const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
        v.multiplyScalar(size).applyEuler(euler).add(center);
        p.setXYZ(i, v.x, v.y, v.z);
        u.setXY(i, accUV.u, accUV.v);
        sIdx.push(boneIdx, 0, 0, 0);
        sW.push(1.0, 0, 0, 0);
        oScale.push(oScaleVal);
      }
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sW, 4));
      geo.setAttribute('outlineScale', new THREE.Float32BufferAttribute(oScale, 1));
      return toSmoothNonIndexed(geo);
    };

    const knot = new THREE.SphereGeometry(0.30, segW, segH);
    knot.scale(0.85, 0.95, 0.78);
    knot.translate(0, 0, 0.12);
    parts.push(transformAndSkin(knot, 0.42));

    [-1, 1].forEach((dir) => {
      const wing = new THREE.SphereGeometry(1.0, segW, segH);
      const wp = wing.attributes.position;
      for (let i = 0; i < wp.count; i++) {
        const nx = wp.getX(i);
        const ny = wp.getY(i);
        const nz = wp.getZ(i);
        const s = (nx * dir + 1.0) * 0.5;
        const hScale = 0.24 + 0.58 * Math.pow(s, 0.75);
        wp.setXYZ(
          i,
          dir * (0.14 + s * 0.92),
          ny * hScale,
          nz * 0.28
        );
      }
      parts.push(transformAndSkin(wing, 0.45));
    });

    if (withTails) {
      [-1, 1].forEach((dir) => {
        const tail = new THREE.SphereGeometry(1.0, segW, segH);
        const tp = tail.attributes.position;
        for (let i = 0; i < tp.count; i++) {
          const nx = tp.getX(i);
          const ny = tp.getY(i);
          const nz = tp.getZ(i);
          const s = (1.0 - ny) * 0.5;
          const w = 0.14 + 0.10 * s;
          tp.setXYZ(i, nx * w, -s * 0.92, nz * 0.12);
        }
        tail.rotateZ(dir * 0.36);
        tail.translate(dir * 0.12, -0.10, -0.06);
        parts.push(transformAndSkin(tail, 0.42));
      });
    }

    return parts;
  }

  createSproutMesh(headCenterY, headScale, poly) {
    const parts = [];
    const greenUV = getSwatchUV('sprout');
    const topY = headCenterY + 0.61 * headScale;
    const segW = poly ? poly.accW : 14;
    const segH = poly ? poly.accH : 10;

    const applySkin = (geo) => {
      const p = geo.attributes.position;
      const u = geo.attributes.uv;
      const sIdx = [];
      const sW = [];
      const oScale = [];
      for (let i = 0; i < p.count; i++) {
        u.setXY(i, greenUV.u, greenUV.v);
        sIdx.push(BONE_INDEX.HEAD, 0, 0, 0);
        sW.push(1.0, 0, 0, 0);
        oScale.push(0.45);
      }
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sW, 4));
      geo.setAttribute('outlineScale', new THREE.Float32BufferAttribute(oScale, 1));
      return toSmoothNonIndexed(geo);
    };

    const stem = new THREE.CapsuleGeometry(0.024 * headScale, 0.18 * headScale, Math.max(2, poly ? poly.limbCap : 5), Math.max(6, segW));
    stem.translate(0, topY + 0.09 * headScale, 0.0);
    parts.push(applySkin(stem));

    [-1, 1].forEach((dir) => {
      const leaf = new THREE.SphereGeometry(0.11 * headScale, segW, segH);
      leaf.scale(1.3, 0.38, 0.78);
      leaf.rotateZ(dir * 0.34);
      leaf.translate(dir * 0.11 * headScale, topY + 0.20 * headScale, 0.0);
      parts.push(applySkin(leaf));
    });

    return parts;
  }

  createCrownMesh(headCenterY, headScale, poly) {
    const crownUV = getSwatchUV('crown');
    const parts = [];
    const baseY = headCenterY + 0.60 * headScale;
    const baseZ = 0.05 * headScale;
    // 로우폴리곤에서도 왕관의 5개 봉우리와 테두리가 깨지지 않도록 50x24 세그먼트 고정
    const crownSegW = 50;
    const crownSegH = 24;

    const finalize = (geo, oScaleVal = 0.55) => {
      const p = geo.attributes.position;
      const u = geo.attributes.uv;
      const sIdx = [];
      const sW = [];
      const oScale = [];
      for (let i = 0; i < p.count; i++) {
        u.setXY(i, crownUV.u, crownUV.v);
        sIdx.push(BONE_INDEX.HEAD, 0, 0, 0);
        sW.push(1.0, 0, 0, 0);
        oScale.push(oScaleVal);
      }
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sW, 4));
      geo.setAttribute('outlineScale', new THREE.Float32BufferAttribute(oScale, 1));
      return toSmoothNonIndexed(geo);
    };

    // 속이 파인 입체 5각 왕관 (방사형 구면 노멀을 유지하여 오목한 골짜기에서도 외곽선이 절대 교차하거나 깨지지 않음)
    const crownBody = new THREE.SphereGeometry(1.0, crownSegW, crownSegH);
    crownBody.userData.keepCustomNormals = true;
    const cp = crownBody.attributes.position;
    const cn = crownBody.attributes.normal;
    for (let i = 0; i < cp.count; i++) {
      const nx = cp.getX(i);
      const ny = cp.getY(i);
      const nz = cp.getZ(i);

      const horizLen = Math.hypot(nx, nz);
      const dirX = horizLen > 1e-5 ? nx / horizLen : 0;
      const dirZ = horizLen > 1e-5 ? nz / horizLen : 0;

      const ang = Math.atan2(nz, nx);
      const wave = Math.pow(0.5 + 0.5 * Math.cos(ang * 5), 1.55);

      const outerBottomR = 0.165 * headScale;
      const outerTopR = (0.188 + 0.028 * wave) * headScale;
      const innerTopR = outerTopR - 0.030 * headScale;
      const innerBottomR = 0.125 * headScale;
      const rimH = (0.085 + 0.135 * wave) * headScale;
      const innerFloorH = 0.035 * headScale;

      let rad = 0;
      let vy = baseY;

      if (ny <= -0.75) {
        const t = (ny + 1.0) / 0.25;
        rad = t * outerBottomR;
        vy = baseY;
      } else if (ny <= 0.20) {
        const t = (ny + 0.75) / 0.95;
        rad = outerBottomR + t * (outerTopR - outerBottomR);
        vy = baseY + t * rimH;
      } else if (ny <= 0.32) {
        const t = (ny - 0.20) / 0.12;
        rad = outerTopR + t * (innerTopR - outerTopR);
        vy = baseY + rimH;
      } else if (ny <= 0.82) {
        const t = (ny - 0.32) / 0.50;
        rad = innerTopR + t * (innerBottomR - innerTopR);
        vy = baseY + rimH * (1.0 - t) + innerFloorH * t;
      } else {
        const t = (1.0 - ny) / 0.18;
        rad = t * innerBottomR;
        vy = baseY + innerFloorH;
      }

      const vx = dirX * rad;
      const vz = baseZ + dirZ * rad;
      cp.setXYZ(i, vx, vy, vz);
      cn.setXYZ(i, nx, ny, nz);
    }
    parts.push(finalize(crownBody, 0.55));

    // 5개 왕관 봉우리 끝에 달린 미니 진주 장식
    const numProngs = 5;
    for (let k = 0; k < numProngs; k++) {
      const ang = (k / numProngs) * Math.PI * 2;
      const tipR = 0.202 * headScale;
      const tipX = Math.cos(ang) * tipR;
      const tipZ = baseZ + Math.sin(ang) * tipR;
      const pearl = new THREE.SphereGeometry(0.028 * headScale, 14, 10);
      pearl.translate(tipX, baseY + 0.228 * headScale, tipZ);
      parts.push(finalize(pearl, 0.50));
    }

    return parts;
  }

  createBeretMesh(headCenterY, headScale, poly) {
    const beretUV = getSwatchUV('beret');
    const segW = poly ? poly.accW : 24;
    const segH = poly ? poly.accH : 16;

    const apply = (geo, oScaleVal = 0.50) => {
      const p = geo.attributes.position;
      const u = geo.attributes.uv;
      const sIdx = [];
      const sW = [];
      const oScale = [];
      for (let i = 0; i < p.count; i++) {
        u.setXY(i, beretUV.u, beretUV.v);
        sIdx.push(BONE_INDEX.HEAD, 0, 0, 0);
        sW.push(1.0, 0, 0, 0);
        oScale.push(oScaleVal);
      }
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sW, 4));
      geo.setAttribute('outlineScale', new THREE.Float32BufferAttribute(oScale, 1));
      return toSmoothNonIndexed(geo);
    };

    const hat = new THREE.SphereGeometry(0.54 * headScale, segW, segH);
    hat.scale(1.1, 0.38, 1.05);
    hat.rotateZ(-0.22);
    hat.translate(0.12 * headScale, headCenterY + 0.62 * headScale, 0.02 * headScale);

    const tip = new THREE.CapsuleGeometry(0.022 * headScale, 0.08 * headScale, 3, Math.max(6, segW));
    tip.rotateZ(-0.22);
    tip.translate(0.16 * headScale, headCenterY + 0.81 * headScale, 0.02 * headScale);

    return [apply(hat, 0.52), apply(tip, 0.42)];
  }

  createStarPinMesh(state, headCenterY, headScale, poly) {
    const starPinUV = getSwatchUV('starPin');
    const darkUV = getSwatchUV('dark');
    const segW = 50;
    const segH = 14;

    const makeStarLayer = (radialPad, zThick, zShift, swatchUV) => {
      const starGeo = new THREE.SphereGeometry(1.0, segW, segH);
      starGeo.rotateX(Math.PI * 0.5);
      starGeo.userData.noOutline = true;
      starGeo.userData.keepCustomNormals = true;

      const p = starGeo.attributes.position;
      const n = starGeo.attributes.normal;
      const u = starGeo.attributes.uv;
      const sIdx = [];
      const sW = [];

      for (let i = 0; i < p.count; i++) {
        const nx = p.getX(i);
        const ny = p.getY(i);
        const nz = p.getZ(i);

        const ang = Math.atan2(ny, nx) - Math.PI * 0.5;
        const starWave = 0.5 + 0.5 * Math.cos(ang * 5);
        const rProfile = (0.068 + 0.076 * Math.pow(starWave, 1.30)) * headScale + radialPad;

        const vx = nx * rProfile;
        const vy = ny * rProfile;
        // 머리 곡률을 따라 별 끝부분이 자연스럽게 휘어지도록 곡률 보정 적용
        const rSq = (vx * vx + vy * vy) / Math.max(0.01, headScale * headScale);
        const vz = nz * zThick + zShift - rSq * 0.45 * headScale;

        p.setXYZ(i, vx, vy, vz);
        n.setXYZ(i, nx * 0.35, ny * 0.35, nz >= 0 ? 0.94 : -0.94);
        u.setXY(i, swatchUV.u, swatchUV.v);
        sIdx.push(BONE_INDEX.HEAD, 0, 0, 0);
        sW.push(1.0, 0, 0, 0);
      }

      starGeo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
      starGeo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sW, 4));

      starGeo.rotateZ(-0.18);
      starGeo.rotateY(-0.52);
      starGeo.rotateX(-0.32);
      starGeo.translate(-0.52 * headScale, headCenterY + 0.23 * headScale, 0.58 * headScale);

      return toSmoothNonIndexed(starGeo);
    };

    const parts = [
      makeStarLayer(0.0, 0.020 * headScale, 0.012 * headScale, starPinUV),
    ];

    const outThick = state && state.outlineEnabled ? (state.outlineThickness ?? 0.032) : 0.0;
    if (outThick > 0.001) {
      parts.push(
        makeStarLayer(outThick * 0.72, 0.012 * headScale, -0.004 * headScale, darkUV)
      );
    }

    return parts;
  }

  // 동그란 안경 (얇고 깔끔한 단일 와이어 프레임)
  createGlassesMesh(headCenterY, headScale, poly) {
    const glassesUV = getSwatchUV('glasses');
    const parts = [];
    const tubularSegs = poly ? poly.glassesTubular : 28;
    const radialSegs = poly ? poly.glassesRadial : 8;

    const apply = (geo) => {
      geo.userData.noOutline = true;
      const p = geo.attributes.position;
      const u = geo.attributes.uv;
      const sIdx = [];
      const sW = [];
      for (let i = 0; i < p.count; i++) {
        u.setXY(i, glassesUV.u, glassesUV.v);
        sIdx.push(BONE_INDEX.HEAD, 0, 0, 0);
        sW.push(1.0, 0, 0, 0);
      }
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sW, 4));
      return toSmoothNonIndexed(geo);
    };

    const eyeY = headCenterY - 0.19 * headScale;
    const eyeZ = 0.685 * headScale;
    const lensR = 0.195 * headScale;
    const tubeR = 0.0095 * headScale;
    const lensX = 0.36 * headScale;

    [-1, 1].forEach((dir) => {
      const frame = new THREE.TorusGeometry(lensR, tubeR, radialSegs, tubularSegs);
      frame.rotateZ(Math.PI / tubularSegs);
      frame.translate(dir * lensX, eyeY, eyeZ);
      parts.push(apply(frame));
    });

    const bridgeLen = (lensX - lensR) * 2.0;
    const bridge = new THREE.CylinderGeometry(0.0085 * headScale, 0.0085 * headScale, bridgeLen, radialSegs);
    bridge.rotateZ(Math.PI * 0.5);
    bridge.translate(0, eyeY + 0.015 * headScale, eyeZ);
    parts.push(apply(bridge));

    return parts;
  }

  // 사각 안경 (얇고 세련된 단일 와이어 스퀘어 안경테)
  createSquareGlassesMesh(headCenterY, headScale, poly) {
    const squareGlassesUV = getSwatchUV('squareGlasses');
    const parts = [];
    const radialSegs = poly ? poly.glassesRadial : 8;

    const apply = (geo) => {
      geo.userData.noOutline = true;
      const p = geo.attributes.position;
      const u = geo.attributes.uv;
      const sIdx = [];
      const sW = [];
      for (let i = 0; i < p.count; i++) {
        u.setXY(i, squareGlassesUV.u, squareGlassesUV.v);
        sIdx.push(BONE_INDEX.HEAD, 0, 0, 0);
        sW.push(1.0, 0, 0, 0);
      }
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sW, 4));
      return toSmoothNonIndexed(geo);
    };

    const eyeY = headCenterY - 0.19 * headScale;
    const eyeZ = 0.685 * headScale;
    const halfW = 0.195 * headScale;
    const halfH = 0.142 * headScale;
    const tubeR = 0.0095 * headScale;
    const lensX = 0.36 * headScale;

    [-1, 1].forEach((dir) => {
      const cx = dir * lensX;
      // 상·하 가로 프레임 바
      [-1, 1].forEach((sy) => {
        const barH = new THREE.CapsuleGeometry(tubeR, halfW * 1.95, 4, radialSegs);
        barH.rotateZ(Math.PI * 0.5);
        barH.translate(cx, eyeY + sy * halfH, eyeZ);
        parts.push(apply(barH));
      });
      // 좌·우 세로 프레임 바
      [-1, 1].forEach((sx) => {
        const barV = new THREE.CapsuleGeometry(tubeR, halfH * 1.95, 4, radialSegs);
        barV.translate(cx + sx * halfW, eyeY, eyeZ);
        parts.push(apply(barV));
      });
    });

    // 중앙 브릿지 (렌즈 안쪽을 침범하지 않도록 정확히 양쪽 내측 테두리만 연결)
    const bridgeLen = (lensX - halfW) * 2.0;
    const bridge = new THREE.CylinderGeometry(0.0085 * headScale, 0.0085 * headScale, bridgeLen, radialSegs);
    bridge.rotateZ(Math.PI * 0.5);
    bridge.translate(0, eyeY + 0.02 * headScale, eyeZ);
    parts.push(apply(bridge));

    return parts;
  }

  // 헤일로 (2번 레퍼런스처럼 머리 위 공중에 가로/수평으로 부유하는 황금빛 원환)
  createHaloMesh(headCenterY, headScale, poly) {
    const goldUV = getSwatchUV('gold');
    const tubularSegs = poly ? (poly.isVeryLow ? 24 : 36) : 36;
    const radialSegs = poly ? (poly.isVeryLow ? 8 : 12) : 12;

    const ringR = 0.33 * headScale;
    const tubeR = 0.022 * headScale;
    const geo = new THREE.TorusGeometry(ringR, tubeR, radialSegs, tubularSegs);

    // 2번 사진과 동일하게 가로(수평)로 눕힘 (약 82도 틸트로 정면에서도 타원 원환 홀이 입체적으로 예쁘게 보임)
    geo.rotateX(Math.PI * 0.46);
    geo.translate(0, headCenterY + 0.82 * headScale, 0.02 * headScale);

    const p = geo.attributes.position;
    const u = geo.attributes.uv;
    const sIdx = [];
    const sW = [];
    const oScale = [];
    for (let i = 0; i < p.count; i++) {
      u.setXY(i, goldUV.u, goldUV.v);
      sIdx.push(BONE_INDEX.HEAD, 0, 0, 0);
      sW.push(1.0, 0, 0, 0);
      oScale.push(0.35);
    }
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sW, 4));
    geo.setAttribute('outlineScale', new THREE.Float32BufferAttribute(oScale, 1));
    return [toSmoothNonIndexed(geo)];
  }

  // 악마 뿔 (뒤로 눕지 않고 이마 위에서 시원하게 위·바깥쪽으로 솟아오르는 악마 뿔)
  createDevilHornsMesh(headCenterY, headScale, poly) {
    const devilHornsUV = getSwatchUV('devilHorns');
    const parts = [];
    const steps = poly ? (poly.isVeryLow ? 7 : 10) : 10;
    const radSegs = poly ? (poly.isVeryLow ? 8 : 12) : 12;

    [-1, 1].forEach((dir) => {
      const positions = [];
      const uvs = [];
      const sIdx = [];
      const sW = [];
      const oScale = [];
      const indices = [];

      // 이마 윗부분에서 출발 (뒤로 숨지 않고 정면에서 잘 보이도록 Z=0.30)
      const baseX = dir * 0.32 * headScale;
      const baseY = headCenterY + 0.40 * headScale;
      const baseZ = 0.30 * headScale;

      const ringVerts = [];

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;

        // 중심 경로 (위로 시원하게 솟아오르며 바깥쪽으로 유려하게 곡선 형성, 뒤로는 살짝만)
        const cx = baseX + dir * (0.04 * t + 0.10 * Math.sin(t * Math.PI * 0.70)) * headScale;
        const cy = baseY + (0.42 * t) * headScale;
        const cz = baseZ - (0.04 * t) * headScale;

        if (i === steps) {
          // 끝 팁 뾰족한 정점
          const tipIdx = positions.length / 3;
          positions.push(cx, cy, cz);
          uvs.push(devilHornsUV.u, devilHornsUV.v);
          sIdx.push(BONE_INDEX.HEAD, 0, 0, 0);
          sW.push(1.0, 0, 0, 0);
          oScale.push(0.55);
          ringVerts.push([tipIdx]);
          continue;
        }

        const r = 0.070 * headScale * Math.pow(1.0 - t, 0.75);

        // 접선 방향 근사
        const nextT = (i + 0.1) / steps;
        const ncx = baseX + dir * (0.04 * nextT + 0.10 * Math.sin(nextT * Math.PI * 0.70)) * headScale;
        const ncy = baseY + (0.42 * nextT) * headScale;
        const ncz = baseZ - (0.04 * nextT) * headScale;

        let tx = ncx - cx, ty = ncy - cy, tz = ncz - cz;
        const tLen = Math.hypot(tx, ty, tz) || 1;
        tx /= tLen; ty /= tLen; tz /= tLen;

        let nx = -ty, ny = tx, nz = 0;
        const nLen = Math.hypot(nx, ny, nz) || 1;
        nx /= nLen; ny /= nLen; nz /= nLen;

        let bx = ty * nz - tz * ny;
        let by = tz * nx - tx * nz;
        let bz = tx * ny - ty * nx;
        const bLen = Math.hypot(bx, by, bz) || 1;
        bx /= bLen; by /= bLen; bz /= bLen;

        const curRing = [];
        for (let j = 0; j < radSegs; j++) {
          const theta = (j / radSegs) * Math.PI * 2;
          const cosT = Math.cos(theta);
          const sinT = Math.sin(theta);

          const px = cx + (nx * cosT + bx * sinT) * r;
          const py = cy + (ny * cosT + by * sinT) * r;
          const pz = cz + (nz * cosT + bz * sinT) * r;

          const vIdx = positions.length / 3;
          positions.push(px, py, pz);
          uvs.push(devilHornsUV.u, devilHornsUV.v);
          sIdx.push(BONE_INDEX.HEAD, 0, 0, 0);
          sW.push(1.0, 0, 0, 0);
          oScale.push(0.55);
          curRing.push(vIdx);
        }
        ringVerts.push(curRing);
      }

      // 측면 튜브 면 생성
      for (let i = 0; i < steps - 1; i++) {
        for (let j = 0; j < radSegs; j++) {
          const nextJ = (j + 1) % radSegs;
          const a0 = ringVerts[i][j];
          const a1 = ringVerts[i][nextJ];
          const b0 = ringVerts[i + 1][j];
          const b1 = ringVerts[i + 1][nextJ];

          indices.push(a0, a1, b0);
          indices.push(a1, b1, b0);
        }
      }

      // 끝 팁 연결
      const lastRing = ringVerts[steps - 1];
      const tipVertexIdx = ringVerts[steps][0];
      for (let j = 0; j < radSegs; j++) {
        const nextJ = (j + 1) % radSegs;
        indices.push(lastRing[j], lastRing[nextJ], tipVertexIdx);
      }

      // 밑동 캡 닫기
      const baseCenterIdx = positions.length / 3;
      positions.push(baseX, baseY, baseZ);
      uvs.push(devilHornsUV.u, devilHornsUV.v);
      sIdx.push(BONE_INDEX.HEAD, 0, 0, 0);
      sW.push(1.0, 0, 0, 0);
      oScale.push(0.55);

      const firstRing = ringVerts[0];
      for (let j = 0; j < radSegs; j++) {
        const nextJ = (j + 1) % radSegs;
        indices.push(baseCenterIdx, firstRing[nextJ], firstRing[j]);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sW, 4));
      geo.setAttribute('outlineScale', new THREE.Float32BufferAttribute(oScale, 1));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      geo.userData.keepCustomNormals = true;
      parts.push(toSmoothNonIndexed(geo));
    });

    return parts;
  }

  // 모노클 (오른쪽 눈에 반듯하게 착용되는 외알 안경 + 뺨을 타고 늘어지는 황금 체인)
  createMonocleMesh(headCenterY, headScale, poly) {
    const monocleUV = getSwatchUV('monocle');
    const parts = [];
    const tubularSegs = poly ? poly.glassesTubular : 32;
    const radialSegs = poly ? poly.glassesRadial : 8;

    const apply = (geo) => {
      geo.userData.noOutline = true;
      const p = geo.attributes.position;
      const u = geo.attributes.uv;
      const sIdx = [];
      const sW = [];
      for (let i = 0; i < p.count; i++) {
        u.setXY(i, monocleUV.u, monocleUV.v);
        sIdx.push(BONE_INDEX.HEAD, 0, 0, 0);
        sW.push(1.0, 0, 0, 0);
      }
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sW, 4));
      return toSmoothNonIndexed(geo);
    };

    // 오른쪽 눈 중심 위치에 정확하게 맞춤
    const eyeX = 0.36 * headScale;
    const eyeY = headCenterY - 0.18 * headScale;
    const eyeZ = 0.692 * headScale;
    const lensR = 0.190 * headScale;
    const tubeR = 0.010 * headScale;

    // 1. 단일 원형 프레임 림 (두상 곡면에 맞춰 자연스럽게 바깥으로 미세 회전)
    const frame = new THREE.TorusGeometry(lensR, tubeR, radialSegs, tubularSegs);
    frame.rotateY(0.12);
    frame.translate(eyeX, eyeY, eyeZ);
    parts.push(apply(frame));

    // 2. 바깥쪽 미니 힌지 고리
    const hingeR = 0.024 * headScale;
    const hingeTube = 0.007 * headScale;
    const hinge = new THREE.TorusGeometry(hingeR, hingeTube, 6, 14);
    hinge.rotateY(0.12);
    hinge.translate(eyeX + lensR, eyeY, eyeZ - 0.015 * headScale);
    parts.push(apply(hinge));

    // 3. 뺨을 따라 귀·턱선 쪽으로 우아하게 늘어지는 황금 체인 (스플라인 튜브)
    const chainPoints = [
      new THREE.Vector3(eyeX + lensR, eyeY - 0.01 * headScale, eyeZ - 0.015 * headScale),
      new THREE.Vector3(eyeX + lensR + 0.04 * headScale, eyeY - 0.10 * headScale, eyeZ - 0.06 * headScale),
      new THREE.Vector3(eyeX + lensR + 0.02 * headScale, eyeY - 0.20 * headScale, eyeZ - 0.18 * headScale),
      new THREE.Vector3(eyeX + lensR - 0.03 * headScale, eyeY - 0.28 * headScale, eyeZ - 0.32 * headScale),
    ];
    const curve = new THREE.CatmullRomCurve3(chainPoints);
    const chainGeo = new THREE.TubeGeometry(curve, 16, 0.006 * headScale, 6, false);
    parts.push(apply(chainGeo));

    return parts;
  }

  // ==========================================================================
  // 7-2. 머리카락 더듬이 (바보털) 3D 지오메트리 생성
  // ==========================================================================
  createAhogesGeometry(state, headCenterY, headScale, poly) {
    const ahoges = Array.isArray(state.ahoges) ? state.ahoges : [];
    if (ahoges.length === 0) return [];

    const parts = [];
    // 스와치 색상에서 '몸 색상과 일치' 여부를 처리하므로 항상 더듬이 전용 스와치 사용 (색상 변경 즉시 반영)
    const ahogeUV = getSwatchUV('ahoge');

    // 머리 돔 타원 반지름
    const rx = 0.88 * headScale;
    const ry = 0.64 * headScale;
    const rz = 0.68 * headScale;

    const radSegs = poly ? (poly.isVeryLow ? 8 : (poly.isStandardPoly ? 10 : 14)) : 10;
    const steps = poly ? (poly.isVeryLow ? 10 : 14) : 12;

    const buildSingleMesh = (ahoge) => {
      const posX = ahoge.x ?? 0.0;
      const posZ = ahoge.z ?? 0.05;
      const size = Math.max(0.2, ahoge.size ?? 1.0);
      const thickness = Math.max(0.1, ahoge.thickness ?? 1.0);
      const angle = ((ahoge.angle ?? 10) * Math.PI) / 180;
      const curve = ahoge.curve ?? 0.65;
      const rotY = (((ahoge.rotation ?? 0) * Math.PI) / 180);

      // 두피 표면 높이(Y) 계산 (머리 돔 표면 안쪽으로 0.03 깊게 안착)
      const nx = Math.max(-0.95, Math.min(0.95, posX / rx));
      const nz = Math.max(-0.95, Math.min(0.95, posZ / rz));
      const ny = Math.sqrt(Math.max(0.01, 1.0 - nx * nx - nz * nz));
      const surfaceY = Math.pow(ny, 0.94) * ry + headCenterY;

      // 두피 안쪽 뿌리 위치 설정 (두께가 두꺼워져도 밑동이 공중에 뜨지 않도록 안정적으로 매립)
      const embedDepth = (0.028 + 0.005 * Math.min(4.0, thickness)) * headScale;
      const rootPos = new THREE.Vector3(posX, surfaceY - embedDepth, posZ);

      // 실제 애니메이션 바보털 비율: 충분히 길고 높게 호를 그리며 뻗어 나가는 길이 (기존 0.36 -> 0.52)
      const totalH = 0.52 * headScale * size;

      // 1. 첨부해주신 실제 애니메이션 아호게 사진(media_1791032622625)과 동일하게
      //    정수리에서 솟아올라 바깥쪽으로 시원하게 퍼져나가는(Flaring outward) 유려한 포물선 스파인 생성
      //    (끝에서 다시 안쪽으로 모여드는 달걀형/S자 닫힘 왜곡을 원천 차단하고 외측으로 부드럽게 퍼져나감)
      const localSpine = [];
      localSpine.push({ x: 0, y: 0, z: 0 });

      const ds = totalH / steps;
      let curX = 0;
      let curY = 0;

      for (let i = 1; i <= steps; i++) {
        const t = (i - 0.5) / steps;
        // t가 커질수록 외측으로 점진적으로 더 크게 휘어짐 (바깥쪽으로 뻗어 나가는 자연스러운 포물선 곡선)
        const phi = angle + curve * 1.55 * Math.pow(t, 1.25);
        curX += Math.sin(phi) * ds;
        curY += Math.cos(phi) * ds;
        // Z축: 미세 곡면 깊이감
        const zProg = i / steps;
        const curZ = 0.012 * totalH * Math.sin(zProg * Math.PI) * (curve >= 0 ? 1 : -1) * 0.3;

        localSpine.push({ x: curX, y: curY, z: curZ });
      }

      // 두께 설정: 뭉툭한 동물 꼬리/뿔이 아니라, 가늘고 세련된 "실제 머리카락 한 가닥"의 슬림 프로파일!
      // 뿌리는 얇고, 중간에 아주 살짝 도톰해졌다가 끝으로 갈수록 섬세한 바늘 끝으로 테이퍼링
      const wBase = 0.016 * headScale * thickness;
      const dBase = 0.010 * headScale * thickness;

      // 외곽선 스케일: 가느다란 머리카락 메쉬를 삼키지 않으면서도, 두께 증가 시 자연스럽게 비례 조절
      const globalThick = state && state.outlineEnabled ? (state.outlineThickness ?? 0.032) : 0.032;
      const hairThickFactor = Math.min(2.5, Math.max(1.0, Math.sqrt(thickness)));
      const safeOutlineScale = Math.min(0.35, (0.0055 * hairThickFactor) / Math.max(0.001, globalThick));

      // 회전 변환 행렬 (Y축 회전: rotY)
      const cosR = Math.cos(rotY);
      const sinR = Math.sin(rotY);
      const rotateY = (v) => ({
        x: v.x * cosR + v.z * sinR,
        y: v.y,
        z: -v.x * sinR + v.z * cosR,
      });

      const positions = [];
      const uvs = [];
      const skinIndices = [];
      const skinWeights = [];
      const outlineScales = [];
      const indices = [];

      const ringVertIndices = [];

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const curLoc = localSpine[i];
        const curWorld = {
          x: rootPos.x + (curLoc.x * cosR + curLoc.z * sinR),
          y: rootPos.y + curLoc.y,
          z: rootPos.z + (-curLoc.x * sinR + curLoc.z * cosR),
        };

        if (i === steps) {
          // 끝부분 뾰족한 단일 정점 (가느다란 머리카락 팁)
          const tipIdx = positions.length / 3;
          positions.push(curWorld.x, curWorld.y, curWorld.z);
          uvs.push(ahogeUV.u, ahogeUV.v);
          skinIndices.push(BONE_INDEX.HEAD, 0, 0, 0);
          skinWeights.push(1.0, 0, 0, 0);
          outlineScales.push(safeOutlineScale);
          ringVertIndices.push([tipIdx]);
          continue;
        }

        // 로컬 2D 평면에서 접선(Tloc) 및 직교 법선(Nloc, Bloc) 정밀 계산 (꼬임 0%)
        let Tloc;
        if (i === 0) {
          Tloc = {
            x: localSpine[1].x - localSpine[0].x,
            y: localSpine[1].y - localSpine[0].y,
            z: localSpine[1].z - localSpine[0].z,
          };
        } else {
          Tloc = {
            x: localSpine[i + 1].x - localSpine[i - 1].x,
            y: localSpine[i + 1].y - localSpine[i - 1].y,
            z: localSpine[i + 1].z - localSpine[i - 1].z,
          };
        }
        const tLen = Math.hypot(Tloc.x, Tloc.y, Tloc.z) || 1;
        Tloc.x /= tLen; Tloc.y /= tLen; Tloc.z /= tLen;

        let Nloc = { x: -Tloc.y, y: Tloc.x, z: 0 };
        const nLen = Math.hypot(Nloc.x, Nloc.y) || 1;
        Nloc.x /= nLen; Nloc.y /= nLen;

        let Bloc = {
          x: Tloc.y * Nloc.z - Tloc.z * Nloc.y,
          y: Tloc.z * Nloc.x - Tloc.x * Nloc.z,
          z: Tloc.x * Nloc.y - Tloc.y * Nloc.x,
        };
        const bLen = Math.hypot(Bloc.x, Bloc.y, Bloc.z) || 1;
        Bloc.x /= bLen; Bloc.y /= bLen; Bloc.z /= bLen;

        // 월드 좌표계로 강체 회전
        const N = rotateY(Nloc);
        const B = rotateY(Bloc);

        // 머리카락 전용 폭(w) 및 깊이(d) 테이퍼링 프로파일:
        // 통통한 꼬리가 아니라, 얇고 날렵한 애니 머리카락 한 올
        const taper = Math.max(0.001, 1.0 - Math.pow(t, 1.25));
        const swell = 0.010 * headScale * thickness * Math.sin(t * Math.PI);
        const w = taper * (wBase + swell);
        const d = taper * dBase;

        const currentRing = [];
        for (let j = 0; j < radSegs; j++) {
          const theta = (j / radSegs) * Math.PI * 2;
          const vx = curWorld.x + N.x * (w * 0.5 * Math.cos(theta)) + B.x * (d * 0.5 * Math.sin(theta));
          const vy = curWorld.y + N.y * (w * 0.5 * Math.cos(theta)) + B.y * (d * 0.5 * Math.sin(theta));
          const vz = curWorld.z + N.z * (w * 0.5 * Math.cos(theta)) + B.z * (d * 0.5 * Math.sin(theta));

          const vIdx = positions.length / 3;
          positions.push(vx, vy, vz);
          uvs.push(ahogeUV.u, ahogeUV.v);
          skinIndices.push(BONE_INDEX.HEAD, 0, 0, 0);
          skinWeights.push(1.0, 0, 0, 0);
          outlineScales.push(safeOutlineScale);
          currentRing.push(vIdx);
        }
        ringVertIndices.push(currentRing);
      }

      // 링 간 사각형 면(삼각형 2개씩) 올바른 와인딩(CCW 외향 노멀)으로 연결
      for (let i = 0; i < steps - 1; i++) {
        const ringA = ringVertIndices[i];
        const ringB = ringVertIndices[i + 1];
        for (let j = 0; j < radSegs; j++) {
          const nextJ = (j + 1) % radSegs;
          const a0 = ringA[j];
          const a1 = ringA[nextJ];
          const b0 = ringB[j];
          const b1 = ringB[nextJ];

          // 정점 순서: (a0, a1, b0), (a1, b1, b0) -> 표면 외향 노멀 생성
          indices.push(a0, a1, b0);
          indices.push(a1, b1, b0);
        }
      }

      // 마지막 링과 끝 팁 정점 연결 (외향 노멀)
      const lastRing = ringVertIndices[steps - 1];
      const tipVertexIdx = ringVertIndices[steps][0];
      for (let j = 0; j < radSegs; j++) {
        const nextJ = (j + 1) % radSegs;
        indices.push(lastRing[j], lastRing[nextJ], tipVertexIdx);
      }

      // 바닥 캡 (두피 결합부 닫음, 외향/하향 노멀)
      const baseCenterIdx = positions.length / 3;
      positions.push(rootPos.x, rootPos.y, rootPos.z);
      uvs.push(ahogeUV.u, ahogeUV.v);
      skinIndices.push(BONE_INDEX.HEAD, 0, 0, 0);
      skinWeights.push(1.0, 0, 0, 0);
      outlineScales.push(safeOutlineScale);

      const firstRing = ringVertIndices[0];
      for (let j = 0; j < radSegs; j++) {
        const nextJ = (j + 1) % radSegs;
        indices.push(baseCenterIdx, firstRing[nextJ], firstRing[j]);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
      geo.setAttribute('outlineScale', new THREE.Float32BufferAttribute(outlineScales, 1));
      geo.setIndex(indices);
      geo.computeVertexNormals();

      // 로우폴리곤 패싯 노멀 블렌딩에 의해 뾰족한 끝이나 테두리가 찢어지지 않도록 스무스 노멀 보존
      geo.userData.keepCustomNormals = true;

      return toSmoothNonIndexed(geo);
    };

    ahoges.forEach((ahoge) => {
      parts.push(buildSingleMesh(ahoge));
      if (ahoge.mirror) {
        parts.push(
          buildSingleMesh({
            ...ahoge,
            x: -(ahoge.x ?? 0.0),
            angle: -(ahoge.angle ?? 10),
            curve: -(ahoge.curve ?? 0.65),
            rotation: -(ahoge.rotation ?? 0),
          })
        );
      }
    });

    return parts;
  }

  // ==========================================================================
  // 7-3. 돌출형 3D 새 부리 (입 모양 '새 부리' 선택 시)
  // ==========================================================================
  createBeakGeometry(state, headCenterY, headScale, poly) {
    const beakUV = getSwatchUV('beak');
    const darkUV = getSwatchUV('dark');
    const radSegs = poly ? (poly.isVeryLow ? 12 : 20) : 20;
    const steps = poly ? (poly.isVeryLow ? 6 : 8) : 8;

    const size = Math.max(0.4, state.beakSize ?? 1.0);
    const yOffset = (state.beakY ?? 0.0) * 0.08 * headScale;

    // 부리 위치: 실제 볼/입 레벨
    const rootX = 0;
    const rootY = headCenterY - 0.30 * headScale + yOffset;

    const rxHead = 0.88 * headScale;
    const ryHead = 0.64 * headScale;
    const rzHead = 0.68 * headScale;

    // 해당 높이에서의 실제 얼굴 앞면 Z를 계산하는 헬퍼 함수 (두상 타원체 곡률 정밀 매핑)
    const getHeadSurfZ = (y, x = 0) => {
      const dyRel = y - headCenterY;
      let squircleR;
      if (dyRel >= 0) {
        const nyN = Math.min(0.999, Math.pow(Math.max(0, dyRel / ryHead), 1 / 0.94));
        squircleR = Math.pow(Math.max(0, 1 - Math.pow(nyN, 2.1)), 0.47);
      } else {
        const expo = poly && poly.isVeryLow ? 0.68 : 0.54;
        const ay = Math.min(0.999, Math.pow(Math.max(0, -dyRel / (ryHead * 0.70)), 1 / expo));
        squircleR = Math.pow(Math.max(0, 1 - Math.pow(ay, 2.8)), 0.36);
      }
      const baseZ = rzHead * squircleR;
      if (Math.abs(x) > 0.001) {
        const xFactor = Math.min(0.99, Math.abs(x) / (rxHead * Math.max(0.2, squircleR)));
        return baseZ * Math.sqrt(Math.max(0.01, 1 - xFactor * xFactor));
      }
      return baseZ;
    };

    const surfZCenter = getHeadSurfZ(rootY, 0);

    const tipX = 0;
    const tipY = rootY - 0.022 * headScale * size;
    const tipZ = surfZCenter + 0.15 * headScale * size;

    const baseW = 0.225 * headScale * size;
    const baseHTop = 0.066 * headScale * size;
    const baseHBot = 0.046 * headScale * size;

    const positions = [];
    const uvs = [];
    const skinIndices = [];
    const skinWeights = [];
    const outlineScales = [];
    const indices = [];

    const ringVertIndices = [];

    // 1) 노란색 본체 3D 부리 메시
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;

      if (i === steps) {
        const tipIdx = positions.length / 3;
        positions.push(tipX, tipY, tipZ);
        uvs.push(beakUV.u, beakUV.v);
        skinIndices.push(BONE_INDEX.HEAD, 0, 0, 0);
        skinWeights.push(1.0, 0, 0, 0);
        outlineScales.push(0.85);
        ringVertIndices.push([tipIdx]);
        continue;
      }

      const taper = Math.pow(1.0 - Math.pow(t, 2.0), 0.55);
      const w = baseW * taper;
      const hTop = baseHTop * taper;
      const hBot = baseHBot * Math.pow(1.0 - Math.pow(t, 2.0), 0.60);

      const curY = rootY + Math.pow(t, 1.35) * (tipY - rootY);

      // 루트 링(i = 0)은 인버티드 헐 외곽선이 얼굴 위로 들뜨지 않도록 0.0, 돌출 팁(i > 0)은 0.85
      const outScaleVal = i === 0 ? 0.0 : 0.85;

      const currentRing = [];
      for (let j = 0; j < radSegs; j++) {
        const theta = (j / radSegs) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        const vx = rootX + cosT * (w * 0.5);
        const vy = curY + (sinT >= 0 ? sinT * hTop : sinT * hBot);

        const baseZ_j = getHeadSurfZ(vy, vx) + 0.002 * headScale * size;
        const vz = baseZ_j + (1.0 - Math.pow(1.0 - t, 1.25)) * (tipZ - baseZ_j);

        const vIdx = positions.length / 3;
        positions.push(vx, vy, vz);
        uvs.push(beakUV.u, beakUV.v);
        skinIndices.push(BONE_INDEX.HEAD, 0, 0, 0);
        skinWeights.push(1.0, 0, 0, 0);
        outlineScales.push(outScaleVal);
        currentRing.push(vIdx);
      }
      ringVertIndices.push(currentRing);
    }

    for (let i = 0; i < steps - 1; i++) {
      const ringA = ringVertIndices[i];
      const ringB = ringVertIndices[i + 1];
      for (let j = 0; j < radSegs; j++) {
        const nextJ = (j + 1) % radSegs;
        indices.push(ringA[j], ringA[nextJ], ringB[j]);
        indices.push(ringA[nextJ], ringB[nextJ], ringB[j]);
      }
    }

    const lastRing = ringVertIndices[steps - 1];
    const tipVertexIdx = ringVertIndices[steps][0];
    for (let j = 0; j < radSegs; j++) {
      const nextJ = (j + 1) % radSegs;
      indices.push(lastRing[j], lastRing[nextJ], tipVertexIdx);
    }

    // 바닥 캡 (얼굴 접합면 닫음)
    const baseCenterIdx = positions.length / 3;
    const baseCenterZ = surfZCenter - 0.002 * headScale * size;
    positions.push(rootX, rootY, baseCenterZ);
    uvs.push(beakUV.u, beakUV.v);
    skinIndices.push(BONE_INDEX.HEAD, 0, 0, 0);
    skinWeights.push(1.0, 0, 0, 0);
    outlineScales.push(0.0);

    const firstRing = ringVertIndices[0];
    for (let j = 0; j < radSegs; j++) {
      const nextJ = (j + 1) % radSegs;
      indices.push(baseCenterIdx, firstRing[nextJ], firstRing[j]);
    }

    const beakGeo = new THREE.BufferGeometry();
    beakGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    beakGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    beakGeo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    beakGeo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
    beakGeo.setAttribute('outlineScale', new THREE.Float32BufferAttribute(outlineScales, 1));
    beakGeo.setIndex(indices);
    beakGeo.computeVertexNormals();

    const parts = [toSmoothNonIndexed(beakGeo)];

    // 2) 안면 접합부 둘레 전용 툰 외곽선 칼라 (상단까지 잘림 없이 부리 전체를 온전히 닫아주는 외곽선)
    const outThick = state && state.outlineEnabled ? (state.outlineThickness ?? 0.032) : 0.0;
    if (outThick > 0.001) {
      const collarPositions = [];
      const collarUvs = [];
      const collarSkinIndices = [];
      const collarSkinWeights = [];
      const collarOutlineScales = [];
      const collarIndices = [];

      const wOut = baseW + outThick * 1.5;
      const hTopOut = baseHTop + outThick * 1.25;
      const hBotOut = baseHBot + outThick * 1.25;

      for (let j = 0; j < radSegs; j++) {
        const theta = (j / radSegs) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        // 안쪽 링: 노란 부리 뿌리 위치
        const inX = rootX + cosT * (baseW * 0.5);
        const inY = rootY + (sinT >= 0 ? sinT * baseHTop : sinT * baseHBot);
        const inZ = getHeadSurfZ(inY, inX) + 0.0025 * headScale * size;

        // 바깥쪽 링: 얼굴 표면을 따라 outThick만큼 확장된 테두리
        const outX = rootX + cosT * (wOut * 0.5);
        const outY = rootY + (sinT >= 0 ? sinT * hTopOut : sinT * hBotOut);
        const outZ = getHeadSurfZ(outY, outX) + 0.0012 * headScale * size;

        const idxIn = j * 2;
        const idxOut = j * 2 + 1;

        collarPositions.push(inX, inY, inZ);
        collarPositions.push(outX, outY, outZ);

        collarUvs.push(darkUV.u, darkUV.v);
        collarUvs.push(darkUV.u, darkUV.v);

        collarSkinIndices.push(BONE_INDEX.HEAD, 0, 0, 0, BONE_INDEX.HEAD, 0, 0, 0);
        collarSkinWeights.push(1.0, 0, 0, 0, 1.0, 0, 0, 0);
        collarOutlineScales.push(0.0, 0.0);

        const nextJ = (j + 1) % radSegs;
        const nextIn = nextJ * 2;
        const nextOut = nextJ * 2 + 1;

        collarIndices.push(idxIn, idxOut, nextIn);
        collarIndices.push(nextIn, idxOut, nextOut);
      }

      const collarGeo = new THREE.BufferGeometry();
      collarGeo.setAttribute('position', new THREE.Float32BufferAttribute(collarPositions, 3));
      collarGeo.setAttribute('uv', new THREE.Float32BufferAttribute(collarUvs, 2));
      collarGeo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(collarSkinIndices, 4));
      collarGeo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(collarSkinWeights, 4));
      collarGeo.setAttribute('outlineScale', new THREE.Float32BufferAttribute(collarOutlineScales, 1));
      collarGeo.setIndex(collarIndices);
      collarGeo.computeVertexNormals();
      collarGeo.userData.noOutline = true;

      parts.unshift(collarGeo);
    }

    return parts;
  }

  // ==========================================================================
  // 8. 지오메트리 병합 및 윤곽선 (로우폴리곤 선택 시 패싯 노멀 블렌딩으로 입체 각면 강조!)
  // ==========================================================================
  mergeGeometries(geometries, facetBlend = 0.0) {
    const nonIndexedList = geometries.map((g) => {
      const out = g.index ? g.toNonIndexed() : g.clone();
      out.userData = { ...g.userData };
      return out;
    });

    let totalVerts = 0;
    nonIndexedList.forEach((g) => {
      totalVerts += g.attributes.position.count;
    });

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const uvs = new Float32Array(totalVerts * 2);
    const skinIndices = new Uint16Array(totalVerts * 4);
    const skinWeights = new Float32Array(totalVerts * 4);
    const outlineScales = new Float32Array(totalVerts);
    const keepSmoothMask = new Uint8Array(totalVerts);

    let offset = 0;
    nonIndexedList.forEach((g) => {
      const count = g.attributes.position.count;
      positions.set(g.attributes.position.array, offset * 3);
      if (g.attributes.normal) {
        normals.set(g.attributes.normal.array, offset * 3);
      }
      if (g.attributes.uv) {
        uvs.set(g.attributes.uv.array, offset * 2);
      }
      if (g.attributes.skinIndex) {
        skinIndices.set(g.attributes.skinIndex.array, offset * 4);
      }
      if (g.attributes.skinWeight) {
        skinWeights.set(g.attributes.skinWeight.array, offset * 4);
      }
      if (g.attributes.outlineScale) {
        outlineScales.set(g.attributes.outlineScale.array, offset);
      } else {
        outlineScales.fill(1.0, offset, offset + count);
      }
      if (g.userData && g.userData.keepCustomNormals) {
        keepSmoothMask.fill(1, offset, offset + count);
      }
      offset += count;
    });

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    merged.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndices, 4));
    merged.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeights, 4));
    merged.setAttribute('outlineScale', new THREE.BufferAttribute(outlineScales, 1));

    if (facetBlend > 0.01) {
      // 스무스 정점 노멀과 삼각형 플랫 노멀을 블렌딩해 로우폴리곤 각면과 부드러운 음영이 동시에 살아나게 함!
      const smoothNormals = new Float32Array(normals);
      merged.computeVertexNormals();
      const flatNormals = merged.attributes.normal.array;
      for (let i = 0; i < totalVerts; i++) {
        const ix = i * 3;
        const effBlend = keepSmoothMask[i] ? 0.0 : facetBlend;
        const nx = smoothNormals[ix] * (1.0 - effBlend) + flatNormals[ix] * effBlend;
        const ny = smoothNormals[ix + 1] * (1.0 - effBlend) + flatNormals[ix + 1] * effBlend;
        const nz = smoothNormals[ix + 2] * (1.0 - effBlend) + flatNormals[ix + 2] * effBlend;
        const len = Math.max(0.0001, Math.hypot(nx, ny, nz));
        flatNormals[ix] = nx / len;
        flatNormals[ix + 1] = ny / len;
        flatNormals[ix + 2] = nz / len;
      }
      merged.attributes.normal.needsUpdate = true;
    }

    return merged;
  }

  createOutlineGeometry(baseGeo, thickness) {
    const geo = baseGeo.clone();
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const outScale = geo.attributes.outlineScale;

    for (let i = 0; i < pos.count; i++) {
      const mask = outScale ? outScale.getX(i) : 1.0;
      const effThick = thickness * mask;
      pos.setXYZ(
        i,
        pos.getX(i) + norm.getX(i) * effThick,
        pos.getY(i) + norm.getY(i) * effThick,
        pos.getZ(i) + norm.getZ(i) * effThick
      );
    }
    return geo;
  }

  // ==========================================================================
  // 9. MMD 호환 스켈레톤 생성 (어깨 본 피벗을 팔 상단 구면 중심에 정확히 일치시킴!)
  // ==========================================================================
  computeBoneWorldPositions(legTopY, torsoTopY, headCenterY, headScale, chubby = 1.0) {
    const hipY = legTopY + 0.04;
    const armAngle = 0.58;
    const cylLen = 0.28;
    const shX = 0.175 * chubby;
    const shY = torsoTopY - 0.055;
    const shZ = -0.015;
    const elbX = shX + Math.sin(armAngle) * (cylLen * 0.58);
    const elbY = shY - Math.cos(armAngle) * (cylLen * 0.58);

    return [
      [0, 0, 0],                                                   // 0: Root
      [0, hipY + 0.14, 0],                                         // 1: Center
      [0, hipY + 0.08, 0],                                         // 2: LowerBody
      [0, hipY + 0.22, 0],                                         // 3: UpperBody
      [0, torsoTopY, 0],                                           // 4: Neck
      [0, headCenterY - 0.15 * headScale, 0],                      // 5: Head
      [0.44 * headScale, headCenterY + 0.42 * headScale, 0.0],     // 6: Ear_L
      [-0.44 * headScale, headCenterY + 0.42 * headScale, 0.0],    // 7: Ear_R
      [shX, shY, shZ],                                             // 8: Arm_L (어깨 볼 조인트 중심!)
      [elbX, elbY, shZ],                                           // 9: Elbow_L
      [-shX, shY, shZ],                                            // 10: Arm_R (어깨 볼 조인트 중심!)
      [-elbX, elbY, shZ],                                          // 11: Elbow_R
      [0.15 * chubby, legTopY, 0.0],                               // 12: Leg_L
      [0.15 * chubby, legTopY * 0.52, 0.0],                        // 13: Knee_L
      [0.15 * chubby, 0.08, 0.0],                                  // 14: Ankle_L
      [-0.15 * chubby, legTopY, 0.0],                              // 15: Leg_R
      [-0.15 * chubby, legTopY * 0.52, 0.0],                       // 16: Knee_R
      [-0.15 * chubby, 0.08, 0.0],                                 // 17: Ankle_R
      [0, hipY + 0.04, -0.14 * chubby],                            // 18: Tail_Base
      [0, hipY + 0.16, -0.48 * chubby],                            // 19: Tail_Tip
    ];
  }

  createSkeleton(legTopY, torsoTopY, headCenterY, headScale, chubby = 1.0) {
    const worldPos = this.computeBoneWorldPositions(legTopY, torsoTopY, headCenterY, headScale, chubby);
    const bones = BONE_DEFS.map((def, idx) => {
      const b = new THREE.Bone();
      b.name = def.name;
      b.userData = { nameJp: def.name, nameEn: def.nameEn, index: idx };
      return b;
    });

    BONE_DEFS.forEach((def, idx) => {
      const [wx, wy, wz] = worldPos[idx];
      if (def.parent === -1) {
        bones[idx].position.set(wx, wy, wz);
      } else {
        const [px, py, pz] = worldPos[def.parent];
        bones[idx].position.set(wx - px, wy - py, wz - pz);
        bones[def.parent].add(bones[idx]);
      }
    });

    const skeleton = new THREE.Skeleton(bones);
    return { bones, skeleton };
  }
}

function evalQuadBezier(p0, p1, p2, t) {
  const u = 1.0 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    u * u * p0[2] + 2 * u * t * p1[2] + t * t * p2[2],
  ];
}
