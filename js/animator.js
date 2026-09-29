import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { BONE_INDEX } from './characterBuilder.js?v=19';

// FBX (Mixamo / Unity / Unreal / Blender Humanoid) 본 이름 정제
function cleanFbxBoneName(rawName) {
  return rawName
    .replace(/^.*[:|]/, '')
    .replace(/^mixamorig\d*_?/i, '')
    .replace(/^bip01_?/i, '')
    .replace(/^armature_?/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// FBX 노드 이름을 역할(Role)로 분류
function classifyFbxBoneRole(rawName) {
  const clean = cleanFbxBoneName(rawName);

  if (['hips', 'pelvis', 'center', 'hip', 'cog'].includes(clean)) return 'hips';
  if (['spine', 'waist', 'lowerbody'].includes(clean)) return 'spine';
  if (['spine1', 'chest', 'torso', 'upperbody'].includes(clean)) return 'chest1';
  if (['spine2', 'upperchest'].includes(clean)) return 'chest2';
  if (['neck', 'neck1'].includes(clean)) return 'neck';
  if (['head'].includes(clean)) return 'head';

  // 왼쪽 팔 체인
  if (['leftshoulder', 'shoulderl', 'lshoulder', 'claviclel', 'lclavicle'].includes(clean)) return 'shoulderL';
  if (['leftarm', 'leftupperarm', 'upperarml', 'larml', 'lupperarm', 'arml'].includes(clean)) return 'armL';
  if (['leftforearm', 'leftlowerarm', 'lowerarml', 'forearml', 'lelbow', 'elbowl', 'lforearm'].includes(clean)) return 'elbowL';
  if (['lefthand', 'handl', 'lhand', 'wristl', 'lwrist'].includes(clean)) return 'handL';

  // 오른쪽 팔 체인
  if (['rightshoulder', 'shoulderr', 'rshoulder', 'clavicler', 'rclavicle'].includes(clean)) return 'shoulderR';
  if (['rightarm', 'rightupperarm', 'upperarmr', 'rarm', 'rupperarm', 'armr'].includes(clean)) return 'armR';
  if (['rightforearm', 'rightlowerarm', 'lowerarmr', 'forearmr', 'relbow', 'elbowr', 'rforearm'].includes(clean)) return 'elbowR';
  if (['righthand', 'handr', 'rhand', 'wristr', 'rwrist'].includes(clean)) return 'handR';

  // 왼쪽 다리 체인
  if (['leftupleg', 'leftthigh', 'thighl', 'uplegl', 'lthigh', 'lupleg', 'legl'].includes(clean)) return 'legL';
  if (['leftleg', 'leftcalf', 'leftshin', 'calfl', 'shinl', 'lknee', 'kneel', 'lleg', 'lcalf'].includes(clean)) return 'kneeL';
  if (['leftfoot', 'footl', 'lfoot', 'anklel', 'lankle'].includes(clean)) return 'footL';
  if (['lefttoebase', 'toel', 'ltoebase', 'lefttoe'].includes(clean)) return 'toeL';

  // 오른쪽 다리 체인
  if (['rightupleg', 'rightthigh', 'thighr', 'uplegr', 'rthigh', 'rupleg', 'legr'].includes(clean)) return 'legR';
  if (['rightleg', 'rightcalf', 'rightshin', 'calfr', 'shinr', 'rknee', 'kneer', 'rleg', 'rcalf'].includes(clean)) return 'kneeR';
  if (['rightfoot', 'footr', 'rfoot', 'ankler', 'rankle'].includes(clean)) return 'footR';
  if (['righttoebase', 'toer', 'rtoebase', 'righttoe'].includes(clean)) return 'toeR';

  return null;
}

// 쿼터니언에서 특정 축(axis) 방향의 비틀림(Twist) 성분을 제거하고 순수 스윙(Swing) 회전만 추출
function extractSwingQuaternion(quat, axis) {
  const rotatedAxis = axis.clone().applyQuaternion(quat).normalize();
  return new THREE.Quaternion().setFromUnitVectors(axis, rotatedAxis);
}

// 쿼터니언 회전 각도를 최대 maxRad 이내로 부드럽게 제한
function clampQuaternionAngle(quat, maxRad) {
  const qw = Math.max(-1, Math.min(1, quat.w));
  const angle = 2 * Math.acos(Math.abs(qw));
  if (angle <= maxRad || angle < 1e-5) return quat;
  const ident = new THREE.Quaternion();
  return ident.slerp(quat, maxRad / angle);
}

// 쿼터니언을 수직축(Y축) 회전(Yaw)과 기울기(Pitch/Roll)로 분해
function decomposeYawAndTilt(quat) {
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat).normalize();
  let qTilt;
  if (up.y < -0.99) {
    qTilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  } else {
    qTilt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
  }
  const qYaw = qTilt.clone().invert().multiply(quat).normalize();
  return { qYaw, qTilt };
}

export class CharacterAnimator {
  constructor() {
    this.time = 0;
    this.pokeEnergy = 0;
    this.pokePhase = 0;
    this.restPose = [];
    this.vmdData = null;
    this.vmdTime = 0;
    this.fbxData = null;
    this.fbxTime = 0;
  }

  bindCharacter(bones, rootGroup) {
    this.bones = bones;
    this.rootGroup = rootGroup;
    this.restPose = bones.map((b) => ({
      pos: b.position.clone(),
      quat: b.quaternion.clone(),
      rot: b.rotation.clone(),
    }));
  }

  triggerPoke() {
    this.pokeEnergy = 1.0;
    this.pokePhase = 0;
  }

  resetPose() {
    if (!this.bones) return;
    this.bones.forEach((b, i) => {
      b.position.copy(this.restPose[i].pos);
      b.quaternion.copy(this.restPose[i].quat);
      b.scale.set(1, 1, 1);
    });
    if (this.rootGroup) {
      this.rootGroup.position.set(0, 0, 0);
      this.rootGroup.rotation.set(0, 0, 0);
      this.rootGroup.scale.set(1, 1, 1);
    }
  }

  update(dt, state) {
    if (!this.bones || this.bones.length === 0) return;

    const speed = state.danceSpeed ?? 1.0;
    this.time += dt * speed;

    this.resetPose();

    const mode = state.danceMode || 'idle';
    const t = this.time;
    const B = this.bones;

    if (mode === 'custom_vmd' && this.vmdData) {
      this.applyVmdMotion(dt * speed);
    } else if (mode === 'custom_fbx' && this.fbxData) {
      this.applyFbxMotion(dt * speed);
    } else if (mode === 'idle') {
      const breath = Math.sin(t * 2.6);
      B[BONE_INDEX.CENTER].position.y += breath * 0.010;
      B[BONE_INDEX.HEAD].rotation.z = Math.sin(t * 1.4) * 0.030;
      B[BONE_INDEX.HEAD].rotation.x = Math.sin(t * 2.6 - 0.5) * 0.020;

      const earTwitch = Math.pow(Math.max(0, Math.sin(t * 1.9)), 8) * 0.12;
      B[BONE_INDEX.EAR_L].rotation.z = -earTwitch;
      B[BONE_INDEX.EAR_R].rotation.z = Math.sin(t * 2.2) * 0.035;

      B[BONE_INDEX.ARM_L].rotation.z = Math.sin(t * 2.6) * 0.04;
      B[BONE_INDEX.ARM_R].rotation.z = -Math.sin(t * 2.6) * 0.04;

      B[BONE_INDEX.TAIL_BASE].rotation.y = Math.sin(t * 3.2) * 0.20;
      B[BONE_INDEX.TAIL_TIP].rotation.y = Math.sin(t * 3.2 - 0.6) * 0.22;
    } else if (mode === 'bounce') {
      const beat = t * 6.5;
      const bounce = Math.abs(Math.sin(beat));
      const side = Math.sin(beat * 0.5);

      B[BONE_INDEX.CENTER].position.y += bounce * 0.055;
      B[BONE_INDEX.CENTER].position.x = side * 0.045;
      B[BONE_INDEX.UPPER_BODY].rotation.z = -side * 0.10;
      B[BONE_INDEX.HEAD].rotation.z = side * 0.16;
      B[BONE_INDEX.HEAD].rotation.x = (bounce - 0.5) * 0.12;

      // 어깨 볼 조인트를 기준으로 자연스럽게 위아래 날개짓 (비틀림 없음)
      B[BONE_INDEX.ARM_L].rotation.z = 0.24 + bounce * 0.36;
      B[BONE_INDEX.ARM_R].rotation.z = -0.24 - bounce * 0.36;

      B[BONE_INDEX.EAR_L].rotation.z = -(1.0 - bounce) * 0.15;
      B[BONE_INDEX.EAR_R].rotation.z = (1.0 - bounce) * 0.15;
      B[BONE_INDEX.TAIL_BASE].rotation.y = side * 0.42;
      B[BONE_INDEX.TAIL_BASE].rotation.x = bounce * 0.18;
    } else if (mode === 'happy_dance') {
      const beat = t * 6.0;
      const s = Math.sin(beat);
      const c = Math.cos(beat);

      B[BONE_INDEX.CENTER].position.y += Math.abs(c) * 0.050;
      B[BONE_INDEX.LOWER_BODY].rotation.z = s * 0.12;
      B[BONE_INDEX.UPPER_BODY].rotation.z = -s * 0.10;
      B[BONE_INDEX.UPPER_BODY].rotation.y = s * 0.18;

      B[BONE_INDEX.HEAD].rotation.z = s * 0.18;
      B[BONE_INDEX.HEAD].rotation.y = -s * 0.10;

      // 양팔이 몸통 안으로 파고들어 꼬이지 않도록 바깥쪽 스윙 범위(0.10 ~ 0.78 rad)로 설계
      B[BONE_INDEX.ARM_L].rotation.z = 0.42 + s * 0.34;
      B[BONE_INDEX.ARM_L].rotation.x = c * 0.18;
      B[BONE_INDEX.ARM_R].rotation.z = -0.42 + s * 0.34;
      B[BONE_INDEX.ARM_R].rotation.x = -c * 0.18;

      B[BONE_INDEX.LEG_L].rotation.x = Math.max(0, s) * -0.32;
      B[BONE_INDEX.LEG_R].rotation.x = Math.max(0, -s) * -0.32;

      B[BONE_INDEX.EAR_L].rotation.z = s * 0.14;
      B[BONE_INDEX.EAR_R].rotation.z = s * 0.14;
      B[BONE_INDEX.TAIL_BASE].rotation.y = c * 0.50;
      B[BONE_INDEX.TAIL_TIP].rotation.y = s * 0.40;
    } else if (mode === 'tail_wag') {
      const beat = t * 7.5;
      const wag = Math.sin(beat);

      // 6. 꼬리살랑댄스: position.y에 '=' 대신 '+='를 사용하여 캐릭터가 바닥을 뚫고 내려가는 버그 완벽 해결!
      B[BONE_INDEX.CENTER].position.x += wag * 0.055;
      B[BONE_INDEX.CENTER].position.y += Math.abs(Math.cos(beat)) * 0.035;
      B[BONE_INDEX.LOWER_BODY].rotation.y = wag * 0.35;
      B[BONE_INDEX.LOWER_BODY].rotation.z = wag * 0.12;
      B[BONE_INDEX.UPPER_BODY].rotation.y = -wag * 0.16;
      B[BONE_INDEX.HEAD].rotation.z = -wag * 0.14;
      B[BONE_INDEX.HEAD].rotation.x = 0.05;

      B[BONE_INDEX.ARM_L].rotation.z = 0.24 + wag * 0.18;
      B[BONE_INDEX.ARM_R].rotation.z = -0.24 + wag * 0.18;

      B[BONE_INDEX.TAIL_BASE].rotation.y = wag * 0.70;
      B[BONE_INDEX.TAIL_TIP].rotation.y = Math.sin(beat - 0.5) * 0.60;
    } else if (mode === 'jump_spin') {
      const cycle = (t * 1.4) % 2.0;
      if (cycle < 1.0) {
        const sub = cycle * Math.PI * 2;
        const b = Math.abs(Math.sin(sub));
        B[BONE_INDEX.CENTER].position.y += b * 0.065;
        B[BONE_INDEX.HEAD].rotation.z = Math.sin(sub) * 0.15;
        B[BONE_INDEX.ARM_L].rotation.z = b * 0.45;
        B[BONE_INDEX.ARM_R].rotation.z = -b * 0.45;
      } else {
        const p = cycle - 1.0;
        const jumpH = Math.sin(p * Math.PI) * 0.34;
        B[BONE_INDEX.CENTER].position.y += jumpH;
        B[BONE_INDEX.CENTER].rotation.y = p * Math.PI * 2;
        const armUp = Math.sin(p * Math.PI) * 0.78;
        B[BONE_INDEX.ARM_L].rotation.z = armUp;
        B[BONE_INDEX.ARM_R].rotation.z = -armUp;
        B[BONE_INDEX.LEG_L].rotation.x = Math.sin(p * Math.PI) * 0.22;
        B[BONE_INDEX.LEG_R].rotation.x = -Math.sin(p * Math.PI) * 0.22;
      }
      B[BONE_INDEX.TAIL_BASE].rotation.y = Math.sin(t * 8) * 0.40;
    } else if (mode === 'step_dance') {
      const beat = t * 5.5;
      const s = Math.sin(beat);
      const c = Math.cos(beat);

      B[BONE_INDEX.CENTER].position.y += Math.abs(s) * 0.045;
      B[BONE_INDEX.CENTER].rotation.y = s * 0.20;
      B[BONE_INDEX.HEAD].rotation.y = -s * 0.12;
      B[BONE_INDEX.HEAD].rotation.z = c * 0.10;

      B[BONE_INDEX.ARM_L].rotation.x = -s * 0.40;
      B[BONE_INDEX.ARM_L].rotation.z = 0.22;
      B[BONE_INDEX.ARM_R].rotation.x = s * 0.40;
      B[BONE_INDEX.ARM_R].rotation.z = -0.22;

      B[BONE_INDEX.LEG_L].rotation.x = s * 0.40;
      B[BONE_INDEX.LEG_R].rotation.x = -s * 0.40;

      B[BONE_INDEX.TAIL_BASE].rotation.y = -s * 0.38;
    }

    if (this.pokeEnergy > 0.002 && this.rootGroup) {
      this.pokePhase += dt * 24;
      const wave = Math.sin(this.pokePhase) * this.pokeEnergy;
      const sx = 1.0 + wave * 0.09;
      const sy = 1.0 - wave * 0.09;
      const sz = 1.0 + wave * 0.09;
      this.rootGroup.scale.set(sx, sy, sz);
      B[BONE_INDEX.HEAD].rotation.z += wave * 0.14;
      B[BONE_INDEX.EAR_L].rotation.z -= wave * 0.20;
      B[BONE_INDEX.EAR_R].rotation.z += wave * 0.20;
      this.pokeEnergy *= Math.pow(0.04, dt);
    }
  }

  // ==========================================================================
  // 7. FBX 모션 파일 (.fbx - Mixamo / Humanoid) 정밀 월드-스윙 리타게팅 엔진
  // ==========================================================================
  parseFbxBuffer(arrayBuffer) {
    const loader = new FBXLoader();
    const fbxScene = loader.parse(arrayBuffer, '');

    if (!fbxScene.animations || fbxScene.animations.length === 0) {
      throw new Error('이 FBX 파일에는 애니메이션 트랙이 포함되어 있지 않습니다.');
    }

    const clip = fbxScene.animations.reduce(
      (best, cur) => (cur.duration > best.duration ? cur : best),
      fbxScene.animations[0]
    );

    // FBX 씬 내부의 본/오브젝트 노드를 휴머노이드 역할별로 탐색
    const roleNodes = {};
    const nodeByName = new Map();
    fbxScene.traverse((obj) => {
      if (!obj.name) return;
      nodeByName.set(obj.name, obj);
      const clean = obj.name.replace(/^.*[:|]/, '');
      nodeByName.set(clean, obj);

      const role = classifyFbxBoneRole(obj.name);
      if (role) {
        // 더 구체적인 본이 이미 없을 때만 등록 (chest2 > chest1 > spine 우선순위 유지)
        if (!roleNodes[role]) {
          roleNodes[role] = obj;
        }
      }
    });

    const chestNode = roleNodes.chest2 || roleNodes.chest1 || roleNodes.spine || null;
    const spineNode = roleNodes.spine || roleNodes.chest1 || null;
    const headNode = roleNodes.head || roleNodes.neck || null;
    const hipsNode = roleNodes.hips || null;

    // 바인드 포즈(초기 T포즈/A포즈)에서의 월드 쿼터니언을 기록해 축 방향 기준점으로 활용
    fbxScene.updateMatrixWorld(true);
    const getWQ = (node) => {
      if (!node) return new THREE.Quaternion();
      const q = new THREE.Quaternion();
      node.getWorldQuaternion(q);
      return q.normalize();
    };
    const getWP = (node) => {
      if (!node) return new THREE.Vector3();
      const v = new THREE.Vector3();
      node.getWorldPosition(v);
      return v;
    };

    const initUp = (hipsNode && chestNode)
      ? getWP(chestNode).sub(getWP(hipsNode))
      : new THREE.Vector3(0, 1, 0);

    const bindHipsWQ = getWQ(hipsNode);
    const bindChestWQ = getWQ(chestNode);
    const bindHeadWQ = getWQ(headNode);

    // Three.js AnimationMixer로 FBX 계층 전체(PreRotation, Spine 체인, Clavicle 포함)를 30FPS로 정확히 평가!
    const mixer = new THREE.AnimationMixer(fbxScene);
    const action = mixer.clipAction(clip);
    action.play();

    mixer.setTime(0);
    fbxScene.updateMatrixWorld(true);

    // 바인드 포즈가 수직 서있는 자세인지 확인하고, 만약 바인드 포즈가 누워있다면 t=0 포즈를 기준점으로 선택
    let refHipsWQ = bindHipsWQ.clone();
    let refChestWQ = bindChestWQ.clone();
    let refHeadWQ = bindHeadWQ.clone();
    if (hipsNode && chestNode) {
      if (initUp.lengthSq() < 1e-4 || Math.abs(initUp.y) < Math.abs(initUp.z)) {
        const t0Up = getWP(chestNode).sub(getWP(hipsNode));
        if (Math.abs(t0Up.y) >= Math.abs(t0Up.z)) {
          refHipsWQ = getWQ(hipsNode);
          refChestWQ = getWQ(chestNode);
          refHeadWQ = getWQ(headNode);
        }
      }
    }
    const refHipsWQInv = refHipsWQ.clone().invert();
    const refChestWQInv = refChestWQ.clone().invert();
    const refHeadWQInv = refHeadWQ.clone().invert();

    const pHips0 = getWP(hipsNode);
    let fbxHipHeight = Math.abs(pHips0.y);
    if (fbxHipHeight < 0.2) {
      fbxHipHeight = 100.0;
    }

    // 우리 캐릭터의 팔·다리 기본 방향 벡터 (어깨 볼 조인트 기준 A포즈 각도 0.58 rad)
    const armAngle = 0.58;
    const charRestDirArmL = new THREE.Vector3(Math.sin(armAngle), -Math.cos(armAngle), 0).normalize();
    const charRestDirArmR = new THREE.Vector3(-Math.sin(armAngle), -Math.cos(armAngle), 0).normalize();
    const charRestDirLeg = new THREE.Vector3(0, -1, 0);

    const duration = Math.max(0.1, clip.duration);
    const fps = 30;
    const numSteps = Math.max(2, Math.ceil(duration * fps) + 1);

    const quatTracks = new Map();
    const ensureTrack = (boneIdx) => {
      if (!quatTracks.has(boneIdx)) quatTracks.set(boneIdx, []);
      return quatTracks.get(boneIdx);
    };

    const hipPosFrames = [];

    for (let step = 0; step < numSteps; step++) {
      const t = Math.min(duration, step / fps);
      mixer.setTime(t);
      fbxScene.updateMatrixWorld(true);

      // 1. Hips (CENTER) 월드 회전 및 위치 변화량
      const wHips = hipsNode
        ? getWQ(hipsNode).multiply(refHipsWQInv).normalize()
        : new THREE.Quaternion();

      // 수직축 회전(Yaw)과 기울기(Pitch/Roll)를 분해:
      // - Yaw (Y축 회전): 회전 및 시선 방향 100% 온전히 유지
      // - Tilt (X/Z축 앞뒤/좌우 기울기): 2등신 대두 캐릭터가 넘어지거나 바닥에 머리를 찧지 않도록
      //   최대 0.16 rad(약 9도)로 제한하고 강도를 30%로 부드럽게 감쇠
      const { qYaw, qTilt } = decomposeYawAndTilt(wHips);
      const safeTilt = new THREE.Quaternion().slerp(clampQuaternionAngle(qTilt, 0.16), 0.30);
      const safeWHips = safeTilt.multiply(qYaw).normalize();
      ensureTrack(BONE_INDEX.CENTER).push({ time: t, deltaQuat: safeWHips });

      if (hipsNode) {
        const pHips = getWP(hipsNode);
        const dp = pHips.sub(pHips0);
        hipPosFrames.push({ time: t, deltaPos: dp });
      }

      // 2. UpperBody (Chest) 월드 회전 -> CENTER 기준 로컬 회전
      const wChest = chestNode
        ? getWQ(chestNode).multiply(refChestWQInv).normalize()
        : safeWHips.clone();
      const localUpper = safeWHips.clone().invert().multiply(wChest).normalize();
      // 상체 그루브도 과도하게 꺾이지 않도록 0.28 rad(약 16도) 제한 및 50% 감쇠
      const safeLocalUpper = new THREE.Quaternion().slerp(clampQuaternionAngle(localUpper, 0.28), 0.50);
      const effectiveWChest = safeWHips.clone().multiply(safeLocalUpper).normalize();
      const effectiveWChestInv = effectiveWChest.clone().invert();
      ensureTrack(BONE_INDEX.UPPER_BODY).push({ time: t, deltaQuat: safeLocalUpper });

      // 3. Head 월드 회전 -> UpperBody 기준 로컬 회전 (데포르메 큰 머리에 맞춰 회전 폭을 자연스럽게 조율)
      if (headNode) {
        const wHead = getWQ(headNode).multiply(refHeadWQInv).normalize();
        const localHead = effectiveWChestInv.clone().multiply(wHead).normalize();
        const dampedHead = new THREE.Quaternion().slerp(clampQuaternionAngle(localHead, 0.30), 0.40);
        ensureTrack(BONE_INDEX.HEAD).push({ time: t, deltaQuat: dampedHead });
      }

      // 4. 양팔 (3D 관절 방향 벡터 스윙 리타게팅 — 축 반전 및 비틀림 0%!)
      [
        { dir: 1, armNode: roleNodes.armL, elbowNode: roleNodes.elbowL, handNode: roleNodes.handL, armIdx: BONE_INDEX.ARM_L, elbowIdx: BONE_INDEX.ELBOW_L, restDir: charRestDirArmL },
        { dir: -1, armNode: roleNodes.armR, elbowNode: roleNodes.elbowR, handNode: roleNodes.handR, armIdx: BONE_INDEX.ARM_R, elbowIdx: BONE_INDEX.ELBOW_R, restDir: charRestDirArmR },
      ].forEach(({ dir, armNode, elbowNode, handNode, armIdx, elbowIdx, restDir }) => {
        if (!armNode || !elbowNode) return;
        const pArm = getWP(armNode);
        const pElbow = getWP(elbowNode);
        const pHand = handNode ? getWP(handNode) : null;

        const vUpper = pElbow.clone().sub(pArm);
        if (vUpper.lengthSq() < 1e-6) return;
        vUpper.normalize();

        // 짧은 데포르메 팔이 손끝 제스처 방향을 잘 표현하도록 상완 방향과 팔 전체(어깨->손) 방향을 블렌딩
        let targetWorldDir = vUpper.clone();
        if (pHand) {
          const vFull = pHand.clone().sub(pArm);
          if (vFull.lengthSq() > 1e-6) {
            vFull.normalize();
            targetWorldDir.lerp(vFull, 0.35).normalize();
          }
        }

        // 가슴(UpperBody) 로컬 공간으로 방향 벡터 변환
        const localDir = targetWorldDir.applyQuaternion(effectiveWChestInv).normalize();
        // 팔이 몸통 안쪽으로 과하게 파고들지 않도록 최소 외측 여유 보정
        if (dir > 0 && localDir.x < 0.12 && localDir.y < 0) {
          localDir.x = Math.max(localDir.x, 0.12);
          localDir.normalize();
        } else if (dir < 0 && localDir.x > -0.12 && localDir.y < 0) {
          localDir.x = Math.min(localDir.x, -0.12);
          localDir.normalize();
        }

        // setFromUnitVectors는 축 방향 롤(비틀림)이 전혀 없는 순수 스윙 회전만 생성함!
        const qArm = clampQuaternionAngle(
          new THREE.Quaternion().setFromUnitVectors(restDir, localDir),
          1.25
        );
        ensureTrack(armIdx).push({ time: t, deltaQuat: qArm });

        if (pHand) {
          const vFore = pHand.clone().sub(pElbow);
          if (vFore.lengthSq() > 1e-6) {
            vFore.normalize();
            const armWorldQ = effectiveWChest.clone().multiply(qArm);
            const foreLocalDir = vFore.applyQuaternion(armWorldQ.invert()).normalize();
            const qElbowFull = new THREE.Quaternion().setFromUnitVectors(restDir, foreLocalDir);
            const qElbow = new THREE.Quaternion().slerp(clampQuaternionAngle(qElbowFull, 0.75), 0.35);
            ensureTrack(elbowIdx).push({ time: t, deltaQuat: qElbow });
          }
        }
      });

      // 5. 양다리 (3D 관절 방향 벡터 스윙 리타게팅)
      const wLowerInv = safeWHips.clone().invert();
      [
        { legNode: roleNodes.legL, kneeNode: roleNodes.kneeL, footNode: roleNodes.footL, legIdx: BONE_INDEX.LEG_L, kneeIdx: BONE_INDEX.KNEE_L },
        { legNode: roleNodes.legR, kneeNode: roleNodes.kneeR, footNode: roleNodes.footR, legIdx: BONE_INDEX.LEG_R, kneeIdx: BONE_INDEX.KNEE_R },
      ].forEach(({ legNode, kneeNode, footNode, legIdx, kneeIdx }) => {
        if (!legNode || !kneeNode) return;
        const pLeg = getWP(legNode);
        const pKnee = getWP(kneeNode);
        const pFoot = footNode ? getWP(footNode) : null;

        const vThigh = pKnee.clone().sub(pLeg);
        if (vThigh.lengthSq() < 1e-6) return;
        vThigh.normalize();

        const localThighDir = vThigh.applyQuaternion(wLowerInv).normalize();
        const qLegFull = new THREE.Quaternion().setFromUnitVectors(charRestDirLeg, localThighDir);
        const qLeg = new THREE.Quaternion().slerp(clampQuaternionAngle(qLegFull, 0.80), 0.70);
        ensureTrack(legIdx).push({ time: t, deltaQuat: qLeg });

        if (pFoot) {
          const vShin = pFoot.clone().sub(pKnee);
          if (vShin.lengthSq() > 1e-6) {
            vShin.normalize();
            const legWorldQ = safeWHips.clone().multiply(qLeg);
            const shinLocalDir = vShin.applyQuaternion(legWorldQ.invert()).normalize();
            const qKneeFull = new THREE.Quaternion().setFromUnitVectors(charRestDirLeg, shinLocalDir);
            const qKnee = new THREE.Quaternion().slerp(clampQuaternionAngle(qKneeFull, 0.70), 0.40);
            ensureTrack(kneeIdx).push({ time: t, deltaQuat: qKnee });
          }
        }
      });
    }

    if (quatTracks.size === 0) {
      throw new Error('호환되는 휴머노이드/Mixamo 본 트랙을 찾지 못했습니다.');
    }

    const charHipY = this.restPose[BONE_INDEX.CENTER] ? this.restPose[BONE_INDEX.CENTER].pos.y : 0.62;
    const unitScale = (charHipY * 0.45) / fbxHipHeight;

    this.fbxData = {
      name: clip.name || 'FBX Animation',
      duration,
      quatTracks,
      hipPosTrack: hipPosFrames.length > 0 ? { frames: hipPosFrames, unitScale } : null,
    };
    this.fbxTime = 0;
    return this.fbxData;
  }

  applyFbxMotion(dt) {
    if (!this.fbxData || !this.bones) return;
    this.fbxTime = (this.fbxTime + dt) % this.fbxData.duration;
    const t = this.fbxTime;

    this.fbxData.quatTracks.forEach((frames, boneIdx) => {
      const bone = this.bones[boneIdx];
      if (!bone || frames.length === 0) return;

      const fps = 30;
      const idx0 = Math.min(frames.length - 1, Math.max(0, Math.floor(t * fps)));
      const idx1 = Math.min(frames.length - 1, idx0 + 1);
      const f0 = frames[idx0];
      const f1 = frames[idx1];

      const alpha = f1.time > f0.time ? (t - f0.time) / (f1.time - f0.time) : 0;
      const deltaQ = f0.deltaQuat.clone().slerp(f1.deltaQuat, alpha);
      bone.quaternion.copy(this.restPose[boneIdx].quat).multiply(deltaQ);
    });

    if (this.fbxData.hipPosTrack) {
      const { frames, unitScale } = this.fbxData.hipPosTrack;
      const fps = 30;
      const idx0 = Math.min(frames.length - 1, Math.max(0, Math.floor(t * fps)));
      const idx1 = Math.min(frames.length - 1, idx0 + 1);
      const f0 = frames[idx0];
      const f1 = frames[idx1];

      const alpha = f1.time > f0.time ? (t - f0.time) / (f1.time - f0.time) : 0;
      const dp = f0.deltaPos.clone().lerp(f1.deltaPos, alpha).multiplyScalar(unitScale);

      // 캐릭터가 화면 밖으로 멀리 걸어나가거나 바닥을 뚫고 내려가지 않도록 안전 범위 클램핑 및 감쇠
      dp.x = THREE.MathUtils.clamp(dp.x * 0.4, -0.15, 0.15);
      dp.z = THREE.MathUtils.clamp(dp.z * 0.4, -0.15, 0.15);
      dp.y = THREE.MathUtils.clamp(dp.y * 0.4, -0.02, 0.12);

      this.bones[BONE_INDEX.CENTER].position.copy(this.restPose[BONE_INDEX.CENTER].pos).add(dp);
    }

    // FBX 모션 중에도 귀와 꼬리가 귀엽게 리듬을 타도록 보조 모션 추가
    const B = this.bones;
    B[BONE_INDEX.TAIL_BASE].rotation.y = Math.sin(t * 5.0) * 0.28;
    B[BONE_INDEX.TAIL_TIP].rotation.y = Math.sin(t * 5.0 - 0.5) * 0.25;
  }

  // ==========================================================================
  // MMD .vmd 모션 파일 바이너리 파서 및 플레이어 (팔 비틀림 방지 스윙 필터 포함)
  // ==========================================================================
  parseVmdBuffer(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const uint8 = new Uint8Array(arrayBuffer);
    const sjisDecoder = new TextDecoder('shift-jis');

    const readString = (offset, length) => {
      let end = offset;
      while (end < offset + length && uint8[end] !== 0) {
        end++;
      }
      return sjisDecoder.decode(uint8.subarray(offset, end));
    };

    const header = readString(0, 30);
    if (!header.startsWith('Vocaloid Motion Data')) {
      throw new Error('유효한 MMD .vmd 모션 파일이 아닙니다.');
    }

    const isV2 = header.includes('0002');
    let offset = 30 + (isV2 ? 20 : 10);

    const boneFrameCount = view.getUint32(offset, true);
    offset += 4;

    const tracks = new Map();
    let maxFrame = 0;

    for (let i = 0; i < boneFrameCount; i++) {
      if (offset + 111 > arrayBuffer.byteLength) break;
      const boneName = readString(offset, 15);
      offset += 15;

      const frameNum = view.getUint32(offset, true);
      offset += 4;

      const px = -view.getFloat32(offset, true);
      const py = view.getFloat32(offset + 4, true);
      const pz = view.getFloat32(offset + 8, true);
      offset += 12;

      const qx = view.getFloat32(offset, true);
      const qy = -view.getFloat32(offset + 4, true);
      const qz = -view.getFloat32(offset + 8, true);
      const qw = view.getFloat32(offset + 12, true);
      offset += 16;

      offset += 64;

      if (!tracks.has(boneName)) {
        tracks.set(boneName, []);
      }
      tracks.get(boneName).push({
        time: frameNum / 30.0,
        pos: new THREE.Vector3(px, py, pz),
        quat: new THREE.Quaternion(qx, qy, qz, qw).normalize(),
      });

      if (frameNum > maxFrame) maxFrame = frameNum;
    }

    tracks.forEach((frames) => frames.sort((a, b) => a.time - b.time));

    this.vmdData = {
      duration: Math.max(1.0, maxFrame / 30.0),
      tracks,
    };
    this.vmdTime = 0;
    return this.vmdData;
  }

  applyVmdMotion(dt) {
    if (!this.vmdData || !this.bones) return;
    this.vmdTime = (this.vmdTime + dt) % this.vmdData.duration;
    const t = this.vmdTime;
    const posScale = 0.038;

    const armAxisL = new THREE.Vector3(Math.sin(0.58), -Math.cos(0.58), 0).normalize();
    const armAxisR = new THREE.Vector3(-Math.sin(0.58), -Math.cos(0.58), 0).normalize();

    this.bones.forEach((bone, idx) => {
      const frames = this.vmdData.tracks.get(bone.name);
      if (!frames || frames.length === 0) return;

      let f0 = frames[0];
      let f1 = frames[frames.length - 1];

      if (t <= f0.time) {
        f1 = f0;
      } else if (t >= f1.time) {
        f0 = f1;
      } else {
        let low = 0;
        let high = frames.length - 1;
        while (low <= high) {
          const mid = (low + high) >> 1;
          if (frames[mid].time < t) {
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
        f0 = frames[Math.max(0, low - 1)];
        f1 = frames[Math.min(frames.length - 1, low)];
      }

      const alpha = f1.time > f0.time ? (t - f0.time) / (f1.time - f0.time) : 0;
      let interpQuat = f0.quat.clone().slerp(f1.quat, alpha);

      // VMD 모션에서도 팔 축 회전(Twist)으로 인한 팔 비틀림을 제거하고 스윙 회전만 적용
      if (idx === BONE_INDEX.ARM_L || idx === BONE_INDEX.ELBOW_L) {
        interpQuat = extractSwingQuaternion(interpQuat, armAxisL);
      } else if (idx === BONE_INDEX.ARM_R || idx === BONE_INDEX.ELBOW_R) {
        interpQuat = extractSwingQuaternion(interpQuat, armAxisR);
      }

      bone.quaternion.copy(this.restPose[idx].quat).multiply(interpQuat);

      if (idx === BONE_INDEX.CENTER || idx === BONE_INDEX.ROOT) {
        const interpPos = f0.pos.clone().lerp(f1.pos, alpha).multiplyScalar(posScale);
        interpPos.y = Math.max(-0.08, interpPos.y);
        bone.position.copy(this.restPose[idx].pos).add(interpPos);
      }
    });

    ['左', '右'].forEach((side) => {
      const legBoneIdx = side === '左' ? BONE_INDEX.LEG_L : BONE_INDEX.LEG_R;
      const legFrames = this.vmdData.tracks.get(`${side}足`);
      const ikFrames = this.vmdData.tracks.get(`${side}足ＩＫ`);

      if ((!legFrames || legFrames.length <= 1) && ikFrames && ikFrames.length > 1) {
        let f0 = ikFrames[0];
        let f1 = ikFrames[ikFrames.length - 1];
        for (let i = 0; i < ikFrames.length - 1; i++) {
          if (t >= ikFrames[i].time && t <= ikFrames[i + 1].time) {
            f0 = ikFrames[i];
            f1 = ikFrames[i + 1];
            break;
          }
        }
        const alpha = f1.time > f0.time ? (t - f0.time) / (f1.time - f0.time) : 0;
        const ikPos = f0.pos.clone().lerp(f1.pos, alpha);
        const legBone = this.bones[legBoneIdx];
        legBone.rotation.x = THREE.MathUtils.clamp(-ikPos.z * 0.12, -0.65, 0.65);
        legBone.rotation.z = THREE.MathUtils.clamp(ikPos.x * 0.08, -0.45, 0.45);
      }
    });
  }
}
