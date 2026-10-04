// 10공방 — 1:1 정면 직교 투영(Orthographic Front Projection) 및 귀 전용 UV 패치 통합 텍스처 아틀라스 생성기

export const ATLAS_SIZE = 1024;
export const FACE_CENTER_X = 512;
export const FACE_CENTER_Y = 350;
export const FACE_PROJ_SCALE = 360;

// 하단 좌측: 파츠별 단색 스와치 영역 (x: 0 ~ 460, y: 740 ~ 1024)
export const SWATCH_MAP = {
  body:          { index: 0,  x: 0,   y: 740, w: 20, h: 284 },
  innerEar:      { index: 1,  x: 20,  y: 740, w: 20, h: 284 },
  tailTip:       { index: 2,  x: 40,  y: 740, w: 20, h: 284 },
  belly:         { index: 3,  x: 60,  y: 740, w: 20, h: 284 },
  antler:        { index: 4,  x: 80,  y: 740, w: 20, h: 284 },
  accessory:     { index: 5,  x: 100, y: 740, w: 20, h: 284 },
  dark:          { index: 6,  x: 120, y: 740, w: 20, h: 284 },
  sprout:        { index: 7,  x: 140, y: 740, w: 20, h: 284 },
  gold:          { index: 8,  x: 160, y: 740, w: 20, h: 284 },
  earOuter:      { index: 9,  x: 180, y: 740, w: 20, h: 284 },
  white:         { index: 10, x: 200, y: 740, w: 20, h: 284 },
  arm:           { index: 11, x: 220, y: 740, w: 20, h: 284 },
  ahoge:         { index: 12, x: 240, y: 740, w: 20, h: 284 },
  beak:          { index: 13, x: 260, y: 740, w: 20, h: 284 },
  mane:          { index: 14, x: 280, y: 740, w: 20, h: 284 },
  devilRed:      { index: 15, x: 300, y: 740, w: 20, h: 284 },
  beret:         { index: 16, x: 320, y: 740, w: 20, h: 284 },
  starPin:       { index: 17, x: 340, y: 740, w: 20, h: 284 },
  glasses:       { index: 18, x: 360, y: 740, w: 20, h: 284 },
  squareGlasses: { index: 19, x: 380, y: 740, w: 20, h: 284 },
  crown:         { index: 20, x: 400, y: 740, w: 20, h: 284 },
  devilHorns:    { index: 21, x: 420, y: 740, w: 20, h: 284 },
  monocle:       { index: 22, x: 440, y: 740, w: 20, h: 284 },
};

// 하단 중앙: 몸통 배 무늬(Belly Patch) 전용 정면 직교 투영 패치 영역
export const TORSO_PATCH_RECT = {
  x: 470,
  y: 700,
  w: 180,
  h: 300,
};

// 하단 우측: 귀 정면 전용 UV 패치 영역 (안쪽 귀 곡선 + 검은 윤곽선을 겹침 아티팩트 없이 100% 깔끔하게 렌더링)
export const EAR_PATCH_RECT = {
  x: 660,
  y: 700,
  w: 340,
  h: 300,
};

export function getSwatchUV(swatchName) {
  const s = SWATCH_MAP[swatchName] || SWATCH_MAP.body;
  const cx = (s.x + s.w * 0.5) / ATLAS_SIZE;
  const cy = (s.y + s.h * 0.5) / ATLAS_SIZE;
  return { u: cx, v: 1.0 - cy };
}

// 몸통 정면 정점(nxTorso: -1~1 가로, nyTorso: 0~1 하단~상단)을 배 패치 전용 UV로 변환
export function getTorsoFrontUV(nxTorso, nyTorso) {
  const r = TORSO_PATCH_RECT;
  const uRaw = Math.max(0.02, Math.min(0.98, 0.5 + nxTorso * 0.46));
  const vRaw = Math.max(0.02, Math.min(0.98, nyTorso));
  const px = r.x + uRaw * r.w;
  const py = r.y + (1.0 - vRaw) * r.h;
  return {
    u: px / ATLAS_SIZE,
    v: 1.0 - py / ATLAS_SIZE,
  };
}

// 귀 정점(rawU: 0~1 가로폭, rawV: 0~1 뿌리~끝, nz: 앞/뒤)을 귀 전용 UV 패치로 변환
export function getEarVertexUV(rawU, rawV, nz, hasInner) {
  if (!hasInner || nz < -0.02) {
    return getSwatchUV('earOuter');
  }
  const r = EAR_PATCH_RECT;
  const px = r.x + Math.max(0.02, Math.min(0.98, rawU)) * r.w;
  const py = r.y + (1.0 - Math.max(0.02, Math.min(0.98, rawV))) * r.h;
  return {
    u: px / ATLAS_SIZE,
    v: 1.0 - py / ATLAS_SIZE,
  };
}

export function getHeadOrthographicUV(dx, dy) {
  const cx = FACE_CENTER_X + dx * FACE_PROJ_SCALE;
  const cy = FACE_CENTER_Y - dy * FACE_PROJ_SCALE;
  const u = Math.max(0.01, Math.min(0.99, cx / ATLAS_SIZE));
  const v = Math.max(0.32, Math.min(0.99, 1.0 - cy / ATLAS_SIZE));
  return { u, v };
}

export class TextureGenerator {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = ATLAS_SIZE;
    this.canvas.height = ATLAS_SIZE;
    this.ctx = this.canvas.getContext('2d');
  }

  update(state) {
    const ctx = this.ctx;
    const W = ATLAS_SIZE;
    const H = ATLAS_SIZE;

    // 1. 기본 바탕 채우기
    ctx.fillStyle = state.bodyColor || '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // 2. 얼굴 무늬
    this.drawFacePattern(ctx, state);

    // 3. 홍조
    this.drawBlush(ctx, state);

    // 4. 점 & 흉터 (다중 추가·커스텀 지원)
    this.drawMoles(ctx, state);
    this.drawScars(ctx, state);

    // 5. 눈 9종 + 속눈썹 4종
    this.drawEyes(ctx, state);

    // 5-1. 눈썹 (다중 선택 + 크기/위치 조절)
    this.drawEyebrows(ctx, state);

    // 5-2. 얼굴 꾸밈 (수염, 그림자, 삐질, 주름, 놀람, 화남 + 크기/위치 조절)
    this.drawFaceDecos(ctx, state);

    // 6. 코 + 입 6종
    this.drawNoseAndMouth(ctx, state);

    // 7. 얼굴 밀착형 소품 (밴드 3종 & 의료용 하얀 안대 끈/패드)
    this.drawFaceAccessories(ctx, state);

    // 8. 하단 컬러 스와치, 몸통 배 패치 및 귀 안쪽 UV 패치 그리기
    this.drawColorSwatches(ctx, state);
    this.drawTorsoPatch(ctx, state);
    this.drawEarPatch(ctx, state);

    return this.canvas;
  }

  getFaceCoords() {
    return {
      cx: FACE_CENTER_X,
      eyeY: 424,
      eyeSpacing: 144,
      noseY: 450,
    };
  }

  // 몸통 배 부분 색상 구분을 폴리곤 형태에 영향받지 않는 둥글고 귀여운 타원 패치로 드로잉
  drawTorsoPatch(ctx, state) {
    const r = TORSO_PATCH_RECT;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();

    ctx.fillStyle = state.bodyColor || '#ffffff';
    ctx.fillRect(r.x, r.y, r.w, r.h);

    if (state.bellyPatch) {
      const cx = r.x + r.w * 0.5;
      const cy = r.y + r.h * 0.55;
      const rx = r.w * 0.30;
      const ry = r.h * 0.28;
      ctx.fillStyle = state.bellyColor || '#fff5eb';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // 귀 안쪽 색상 + 스케치 1, 2번의 검은 테두리 선을 텍스처 패치에 매끄럽게 드로잉 (이마 투톤 시 귀 바탕색에도 투톤 색상 적용!)
  drawEarPatch(ctx, state) {
    const r = EAR_PATCH_RECT;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();

    const hasTwoTone = (Array.isArray(state.patterns) && state.patterns.includes('two_tone')) || state.patternType === 'two_tone';
    const earBaseColor = state.earColorCustom
      ? (state.earColor || state.bodyColor || '#ffffff')
      : (hasTwoTone
          ? (state.patternColor || '#d4c4b4')
          : (state.bodyColor || '#ffffff'));
    ctx.fillStyle = earBaseColor;
    ctx.fillRect(r.x, r.y, r.w, r.h);

    const cx = r.x + r.w * 0.5;
    const botY = r.y + r.h + 20;
    const topY = r.y + r.h * 0.24;
    const halfW = r.w * 0.30;

    ctx.beginPath();
    if (state.earType === 'lop_rabbit') {
      // 스케치 2번 롭이어 토끼: 볼 옆에서 아래로 길게 늘어지는 귀의 안쪽 둥근 루프
      const lopCx = cx - r.w * 0.08;
      const lopW = r.w * 0.18;
      const lopTopY = r.y + r.h * 0.24;
      ctx.moveTo(lopCx - lopW, botY);
      ctx.lineTo(lopCx - lopW, lopTopY + lopW);
      ctx.arc(lopCx, lopTopY + lopW, lopW, Math.PI, 0, false);
      ctx.lineTo(lopCx + lopW, botY);
      ctx.closePath();
    } else if (state.earType === 'mouse') {
      // 스케치 2번 쥐: 바깥 흰색 테두리가 균일하게 남도록 동그란 원형 비율로 안쪽 귀 조정
      const mouseRx = r.w * 0.27;
      const mouseRy = r.h * 0.30;
      const mouseCy = r.y + r.h * 0.57;
      ctx.ellipse(cx, mouseCy, mouseRx, mouseRy, 0, 0, Math.PI * 2);
    } else if (state.earType === 'hamster') {
      // 스케치 2번 햄스터: 둥글고 도톰한 반타원형 안쪽 귀
      const hamW = r.w * 0.33;
      const hamTopY = r.y + r.h * 0.20;
      ctx.moveTo(cx - hamW, botY);
      ctx.bezierCurveTo(cx - hamW, hamTopY, cx + hamW, hamTopY, cx + hamW, botY);
      ctx.closePath();
    } else if (['bear', 'otter', 'raccoon'].includes(state.earType)) {
      // 곰, 수달, 너구리: 깔끔한 반원 아치형 안쪽 귀
      const roundW = r.w * 0.32;
      const archTopY = r.y + r.h * 0.24;
      ctx.moveTo(cx - roundW, botY);
      ctx.lineTo(cx - roundW, archTopY + roundW * 0.85);
      ctx.bezierCurveTo(
        cx - roundW, archTopY - roundW * 0.15,
        cx + roundW, archTopY - roundW * 0.15,
        cx + roundW, archTopY + roundW * 0.85
      );
      ctx.lineTo(cx + roundW, botY);
      ctx.closePath();
    } else if (state.earType === 'rabbit') {
      // 토끼 귀: 길쭉한 반타원 아치형 안쪽 귀
      const rabW = r.w * 0.26;
      const rabTopY = r.y + r.h * 0.18;
      ctx.moveTo(cx - rabW, botY);
      ctx.bezierCurveTo(cx - rabW, rabTopY, cx + rabW, rabTopY, cx + rabW, botY);
      ctx.closePath();
    } else {
      // 고양이, 여우, 늑대, 사슴 등: 스케치 1, 2번처럼 부드러운 삼각 아치 곡선 안쪽 귀
      ctx.moveTo(cx - halfW, botY);
      ctx.quadraticCurveTo(cx - halfW * 0.86, topY + 24, cx, topY);
      ctx.quadraticCurveTo(cx + halfW * 0.86, topY + 24, cx + halfW, botY);
      ctx.closePath();
    }

    ctx.fillStyle = state.innerEarColor || '#ffb5c2';
    ctx.fill();

    const outThick = state.outlineThickness ?? 0.032;
    if (state.outlineEnabled && outThick > 0.001) {
      ctx.lineWidth = Math.max(1.0, (outThick / 0.032) * 14.0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = state.outlineColor || '#18181b';
      ctx.stroke();
    }

    ctx.restore();
  }

  drawFacePattern(ctx, state) {
    let patterns = [];
    if (Array.isArray(state.patterns)) {
      patterns = state.patterns.filter((p) => p && p !== 'none');
    } else if (state.patternType && state.patternType !== 'none') {
      patterns = [state.patternType];
    }
    if (patterns.length === 0) return;

    // 이마 투톤이 활성화되어 있을 경우 가장 먼저 그려 다른 무늬가 묻히지 않도록 정렬
    if (patterns.includes('two_tone')) {
      patterns = ['two_tone', ...patterns.filter((p) => p !== 'two_tone')];
    }

    const { cx, eyeY, eyeSpacing, noseY } = this.getFaceCoords();
    ctx.save();
    ctx.fillStyle = state.patternColor || '#d4c4b4';
    ctx.strokeStyle = state.patternColor || '#d4c4b4';

    patterns.forEach((type) => {
      if (type === 'tabby') {
        // 정수리 끝(y=0)부터 이마로 자연스럽게 내려오도록 그려 위쪽에서 끊기지 않게 함
        ctx.lineCap = 'round';
        ctx.lineWidth = 22;
        ctx.beginPath();
        ctx.moveTo(cx, 60);
        ctx.lineTo(cx, 240);
        ctx.stroke();

        ctx.lineWidth = 19;
        [-64, 64].forEach((dx) => {
          ctx.beginPath();
          ctx.moveTo(cx + dx * 0.82, 75);
          ctx.lineTo(cx + dx, 224);
          ctx.stroke();
        });
      } else if (type === 'cheek_stripes') {
        // 볼 바깥쪽 외곽선까지 충분히 뻗어나가 중간에 애매하게 끊기지 않게 함
        ctx.lineCap = 'round';
        ctx.lineWidth = 16;
        [-1, 1].forEach((dir) => {
          for (let i = 0; i < 2; i++) {
            const sy = eyeY + 6 + i * 32;
            const sx = cx + dir * (eyeSpacing + 66);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(cx + dir * 350, sy + 8);
            ctx.stroke();
          }
        });
      } else if (type === 'spots') {
        const spots = [
          { x: cx - 155, y: 235, rx: 48, ry: 36, rot: -0.25 },
          { x: cx - 82, y: 195, rx: 28, ry: 22, rot: 0.2 },
          { x: cx + 145, y: 245, rx: 42, ry: 32, rot: 0.35 },
          { x: cx - 225, y: eyeY + 24, rx: 34, ry: 25, rot: 0.1 },
          { x: cx + 220, y: eyeY + 18, rx: 36, ry: 26, rot: -0.2 },
        ];
        spots.forEach((s) => {
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, s.rx, s.ry, s.rot, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (type === 'mask_raccoon') {
        [-1, 1].forEach((dir) => {
          const ex = cx + dir * eyeSpacing;
          ctx.beginPath();
          ctx.ellipse(ex, eyeY + 2, 74, 58, dir * 0.16, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (type === 'muzzle') {
        ctx.beginPath();
        ctx.ellipse(cx, noseY + 16, 78, 52, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'two_tone') {
        // 캔버스 상단 전체(0~1024)를 덮고 내려와 정수리·양옆 어디에서도 각지게 끊기지 않는 매끈한 곡선 투톤!
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(ATLAS_SIZE, 0);
        ctx.lineTo(ATLAS_SIZE, 345);
        ctx.bezierCurveTo(cx + 260, 350, cx + 120, 355, cx, 282);
        ctx.bezierCurveTo(cx - 120, 355, cx - 260, 350, 0, 345);
        ctx.closePath();
        ctx.fill();
      }
    });

    ctx.restore();
  }

  drawBlush(ctx, state) {
    const type = state.blushType;
    if (!type || type === 'none') return;

    const { cx, eyeY, eyeSpacing } = this.getFaceCoords();
    const scale = state.blushScale ?? 1.0;
    const opacity = state.blushOpacity ?? 0.85;
    const offsetY = (state.blushY ?? 0) * 45;
    const blushColor = state.blushColor || '#ff8da1';

    const by = eyeY + 40 + offsetY;
    const bxOffset = eyeSpacing + 56;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = blushColor;
    ctx.strokeStyle = blushColor;

    [-1, 1].forEach((dir) => {
      const bx = cx + dir * bxOffset;

      if (type === 'comic_circle' || type === 'comic_circle_slash') {
        ctx.beginPath();
        ctx.ellipse(bx, by, 32 * scale, 22 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        if (type === 'comic_circle_slash') {
          ctx.save();
          ctx.globalAlpha = Math.min(1, opacity + 0.15);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4.5 * scale;
          ctx.lineCap = 'round';
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(bx + i * 11 * scale - 5 * scale, by + 9 * scale);
            ctx.lineTo(bx + i * 11 * scale + 5 * scale, by - 9 * scale);
            ctx.stroke();
          }
          ctx.restore();
        }
      } else if (type === 'slash_only') {
        ctx.lineWidth = 6 * scale;
        ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(bx + i * 13 * scale - 6 * scale, by + 12 * scale);
          ctx.lineTo(bx + i * 13 * scale + 6 * scale, by - 12 * scale);
          ctx.stroke();
        }
      } else if (type === 'soft_oval') {
        const rad = 44 * scale;
        const grad = ctx.createRadialGradient(bx, by, 3, bx, by, rad);
        grad.addColorStop(0, blushColor);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  }

  drawMoles(ctx, state) {
    const moles = Array.isArray(state.moles) ? state.moles : [];
    if (moles.length === 0) return;

    const { cx, eyeY } = this.getFaceCoords();
    ctx.save();
    ctx.fillStyle = state.noseMouthColor || '#18181b';

    moles.forEach((m) => {
      const mx = cx + (m.x ?? 0.32) * 280;
      const my = eyeY - (m.y ?? -0.18) * 220;
      const r = 7.5 * (m.size ?? 1.0);

      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();

      if (m.mirror) {
        const mx2 = cx - (m.x ?? 0.32) * 280;
        ctx.beginPath();
        ctx.arc(mx2, my, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  }

  // 다중 흉터 드로잉 (일자 · 바늘땀 · 십자 · 두 줄 흉터 및 위치/크기/각도/대칭 커스텀)
  drawScars(ctx, state) {
    const scars = Array.isArray(state.scars) ? state.scars : [];
    if (scars.length === 0) return;

    const { cx, eyeY } = this.getFaceCoords();
    const scarColor = state.scarColor || '#b55d60';

    const drawSingleScar = (sx, sy, size, angleDeg, type, isMirror = false) => {
      ctx.save();
      ctx.translate(sx, sy);
      if (isMirror) {
        ctx.scale(-1, 1);
      }
      ctx.rotate(((angleDeg ?? 0) * Math.PI) / 180);
      ctx.scale(size, size);
      ctx.strokeStyle = scarColor;
      ctx.fillStyle = scarColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (type === 'cross') {
        ctx.lineWidth = 7.5;
        ctx.beginPath();
        ctx.moveTo(-22, -22);
        ctx.lineTo(22, 22);
        ctx.moveTo(22, -22);
        ctx.lineTo(-22, 22);
        ctx.stroke();
      } else if (type === 'stitch') {
        ctx.lineWidth = 7.0;
        ctx.beginPath();
        ctx.moveTo(0, -34);
        ctx.lineTo(0, 34);
        ctx.stroke();

        ctx.lineWidth = 5.2;
        [-18, 0, 18].forEach((ty) => {
          ctx.beginPath();
          ctx.moveTo(-11, ty);
          ctx.lineTo(11, ty);
          ctx.stroke();
        });
      } else if (type === 'double_slash') {
        ctx.lineWidth = 6.8;
        [-7, 7].forEach((ox) => {
          ctx.beginPath();
          ctx.moveTo(ox, -28);
          ctx.lineTo(ox, 28);
          ctx.stroke();
        });
      } else if (type === 'burn') {
        // 화상 흉터: 스케치 기반 오목 다각형 (6점 별빛/스플래시 외곽) + 깔끔하고 얇은 테두리선
        ctx.save();

        const buildBurnPath = () => {
          ctx.beginPath();
          ctx.moveTo(-18, -34);
          ctx.quadraticCurveTo(0, -15, 16, -36);    // 상단 내측 오목곡선
          ctx.quadraticCurveTo(14, -10, 36, 4);     // 우상단 내측 오목곡선
          ctx.quadraticCurveTo(15, 14, 18, 36);     // 우하단 내측 오목곡선
          ctx.quadraticCurveTo(0, 16, -18, 32);     // 하단 내측 오목곡선
          ctx.quadraticCurveTo(-15, 10, -36, 0);    // 좌하단 내측 오목곡선
          ctx.quadraticCurveTo(-15, -11, -18, -34); // 좌상단 내측 오목곡선
          ctx.closePath();
        };

        // 1) 내부 면 채움 (부드러운 반투명 화상 틴트)
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = scarColor;
        buildBurnPath();
        ctx.fill();

        // 2) 얇고 단정한 테두리선 (기존 7~8px보다 얇은 2.2px)
        ctx.globalAlpha = 0.90;
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = scarColor;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        buildBurnPath();
        ctx.stroke();

        ctx.restore();
      } else {
        // 기본 'slash' (일자 흉터)
        ctx.lineWidth = 8.0;
        ctx.beginPath();
        ctx.moveTo(0, -32);
        ctx.lineTo(0, 32);
        ctx.stroke();
      }

      ctx.restore();
    };

    scars.forEach((s) => {
      const sx = cx + (s.x ?? -0.40) * 280;
      const sy = eyeY - (s.y ?? 0.0) * 220;
      const sz = s.size ?? 1.0;
      const ang = s.angle ?? -15;
      const sType = s.type || 'slash';

      drawSingleScar(sx, sy, sz, ang, sType, false);

      if (s.mirror) {
        const sx2 = cx - (s.x ?? -0.40) * 280;
        drawSingleScar(sx2, sy, sz, ang, sType, true);
      }
    });
  }
  // 얼굴 밀착형 소품 드로잉 (밴드 3종 / 의료용 하얀 안대 / 해적 안대)
  drawFaceAccessories(ctx, state) {
    const extras = Array.isArray(state.extraAccessories) ? state.extraAccessories : [];
    if (extras.length === 0) return;

    const { cx, eyeY, eyeSpacing } = this.getFaceCoords();

    // 윤곽선 두께 설정값에 비례한 선 굵기 계산 (캐릭터 윤곽선 설정을 따름)
    const olThick = state.outlineThickness ?? 0.032;
    const olScale = Math.max(0.4, olThick / 0.032);
    const olW = Math.max(3.5, olScale * 7);   // 기본 아우트라인 굵기
    const olWThin = Math.max(1.5, olScale * 3); // 내부 세부선 굵기

    const drawRoundRectPath = (x, y, w, h, r) => {
      const rr = Math.min(r, w * 0.5, h * 0.5);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.lineTo(x + w - rr, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
      ctx.lineTo(x + w, y + h - rr);
      ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      ctx.lineTo(x + rr, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
      ctx.lineTo(x, y + rr);
      ctx.quadraticCurveTo(x, y, x + rr, y);
      ctx.closePath();
    };

    // 밴드 그리기 (윤곽선 두께 설정 적용)
    const drawBandaid = (bx, by, w, h, angleRad) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(angleRad);

      // 바깥 반창고 몸체
      drawRoundRectPath(-w * 0.5, -h * 0.5, w, h, h * 0.46);
      ctx.fillStyle = '#f6c8af';
      ctx.fill();
      ctx.lineWidth = olW;
      ctx.strokeStyle = state.outlineColor || '#18181b';
      ctx.stroke();

      // 중앙 거즈 패드
      const pw = w * 0.36;
      const ph = h * 0.72;
      drawRoundRectPath(-pw * 0.5, -ph * 0.5, pw, ph, 4);
      ctx.fillStyle = '#fff7f2';
      ctx.fill();
      ctx.lineWidth = olWThin;
      ctx.strokeStyle = '#d48f70';
      ctx.stroke();

      // 양옆 숨구멍 도트
      ctx.fillStyle = '#be795b';
      [-1, 1].forEach((side) => {
        const baseX = side * (w * 0.31);
        [-4, 4].forEach((dy) => {
          [-3.2, 3.2].forEach((dx) => {
            ctx.beginPath();
            ctx.arc(baseX + dx, dy, 1.7 * Math.max(0.7, olScale * 0.8), 0, Math.PI * 2);
            ctx.fill();
          });
        });
      });

      ctx.restore();
    };

    // 1. 밴드 3종 배치
    // 코 위 밴드: 눈 사이 코다리 위치 (눈과 코를 가리지 않는 최적 위치)
    if (extras.includes('bandaid_nose')) {
      drawBandaid(cx, eyeY - 6, 80, 32, 0);
    }
    // 왼쪽 볼 밴드: 3D 곡면 투영 왜곡 보정(가로 늘어남 방지: w=52) 및 눈 가림 완전 차단
    if (extras.includes('bandaid_left_cheek')) {
      drawBandaid(cx - eyeSpacing - 78, eyeY + 52, 54, 34, -0.14);
    }
    // 오른쪽 볼 밴드: 3D 곡면 투영 왜곡 보정(가로 늘어남 방지: w=52) 및 눈 가림 완전 차단
    if (extras.includes('bandaid_right_cheek')) {
      drawBandaid(cx + eyeSpacing + 78, eyeY + 52, 54, 34, 0.14);
    }

    // 하얀 드레싱 밴드 그리기 (외곽선이 있는 깔끔한 흰색 사각형 + 내부 거즈 패드)
    const drawDressingBand = (bx, by, w, h, angleRad) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(angleRad);

      const radius = 6;
      // 1) 바깥 하얀색 밴드 몸체
      drawRoundRectPath(-w * 0.5, -h * 0.5, w, h, radius);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = olW;
      ctx.strokeStyle = state.outlineColor || '#18181b';
      ctx.stroke();

      // 2) 내부 사각 거즈 패드
      const pw = w * 0.62;
      const ph = h * 0.64;
      drawRoundRectPath(-pw * 0.5, -ph * 0.5, pw, ph, 4);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.lineWidth = Math.max(1.8, olWThin * 1.1);
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();

      ctx.restore();
    };

    // 하얀 드레싱 밴드 3종 배치
    if (extras.includes('dressing_nose')) {
      drawDressingBand(cx, eyeY - 6, 64, 46, 0);
    }
    if (extras.includes('dressing_left_cheek')) {
      drawDressingBand(cx - eyeSpacing - 82, eyeY + 54, 68, 56, -0.12);
    }
    if (extras.includes('dressing_right_cheek')) {
      drawDressingBand(cx + eyeSpacing + 82, eyeY + 54, 68, 56, 0.12);
    }

    const outlineColor = state.outlineColor || '#18181b';

    // 2. 의료용 하얀 안대 — 사각형(라운드 사각) 부드러운 거즈 패드 + 귀걸이형 깔끔한 탄성 끈
    const drawMedicalEyepatch2D = (dir) => {
      const ex = cx + dir * eyeSpacing;
      const ey = eyeY - 4;
      const padW = 108;
      const padH = 86;
      const padR = 18;  // 부드러운 라운드 사각

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 끈 그리기 함수 (외곽선 + 내부 채움 2패스)
      const drawCord = (x1, y1, x2, y2) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = olW + 1.2;
        ctx.strokeStyle = outlineColor;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = Math.max(2.0, olW - 1.5);
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      };

      // 의료용 귀걸이 안대 끈:
      // 패드 위/아래 모서리에서 나와서 같은 쪽 귀 뒤로 이어지는 2줄 탄성 끈 (애니/웹툰 표준 안대 형태)
      // 코나 반대편 눈을 가로지르지 않아 귀엽고 깔끔함
      const cordStartXTop = ex + dir * (padW * 0.36);
      const cordStartYTop = ey - padH * 0.34;
      const cordEndXTop = ex + dir * 360;
      const cordEndYTop = ey - 46;

      const cordStartXBottom = ex + dir * (padW * 0.36);
      const cordStartYBottom = ey + padH * 0.34;
      const cordEndXBottom = ex + dir * 360;
      const cordEndYBottom = ey + 44;

      drawCord(cordStartXTop, cordStartYTop, cordEndXTop, cordEndYTop);
      drawCord(cordStartXBottom, cordStartYBottom, cordEndXBottom, cordEndYBottom);

      // 사각형 거즈 패드 본체
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(dir * 0.04); // 살짝 자연스러운 각도

      // 1) 패드 외곽 본체 (순백색)
      drawRoundRectPath(-padW * 0.5, -padH * 0.5, padW, padH, padR);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = olW;
      ctx.strokeStyle = outlineColor;
      ctx.stroke();

      // 2) 안쪽 중앙 거즈 쿠션 (부드러운 의료용 거즈 표현)
      const innerW = padW - 22;
      const innerH = padH - 22;
      const innerR = 12;
      drawRoundRectPath(-innerW * 0.5, -innerH * 0.5, innerW, innerH, innerR);
      ctx.fillStyle = '#f6f7f9';
      ctx.fill();
      ctx.lineWidth = Math.max(1.2, olWThin * 0.7);
      ctx.strokeStyle = 'rgba(190, 195, 205, 0.6)';
      ctx.stroke();

      ctx.restore();
      ctx.restore();
    };

    if (extras.includes('eyepatch_left')) drawMedicalEyepatch2D(-1);
    if (extras.includes('eyepatch_right')) drawMedicalEyepatch2D(1);

    // 3. 검은 안대 — 첨부 이미지 형태의 둥글고 볼록한 역삼각형/쉴드형 패치 (하이라이트 및 무늬 없음)
    const drawPiratePatch = (dir) => {
      const ex = cx + dir * eyeSpacing;
      const ey = eyeY - 2;
      const hw = 54;
      const hh = 46;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 끈 색상 (캐릭터 윤곽선 색상과 일치하는 테두리 + 어두운 단색 끈)
      const strapColor = '#18181b';
      const strapBorder = outlineColor;

      // 끈 드로잉 헬퍼
      const drawCurvedStrap = (p1x, p1y, cpx, cpy, p2x, p2y) => {
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.quadraticCurveTo(cpx, cpy, p2x, p2y);
        ctx.lineWidth = olW + 1.2;
        ctx.strokeStyle = strapBorder;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.quadraticCurveTo(cpx, cpy, p2x, p2y);
        ctx.lineWidth = Math.max(2.2, olW - 1.0);
        ctx.strokeStyle = strapColor;
        ctx.stroke();
      };

      // 1) 외측 끈 (안대 바깥쪽 모서리에서 관자놀이/귀 뒤쪽으로 시원하게 뻗음)
      const outerStrapStartX = ex + dir * (hw * 0.88);
      const outerStrapStartY = ey - hh * 0.15;
      const outerStrapEndX = outerStrapStartX + dir * 190;
      const outerStrapEndY = outerStrapStartY - 70;
      const outerStrapCtrlX = outerStrapStartX + dir * 90;
      const outerStrapCtrlY = outerStrapStartY - 35;
      drawCurvedStrap(outerStrapStartX, outerStrapStartY, outerStrapCtrlX, outerStrapCtrlY, outerStrapEndX, outerStrapEndY);

      // 2) 내측 끈 (안대 안쪽 모서리에서 콧등 위 이마/반대편 눈썹 위 대각선 상단으로 뻗음 - 코/입을 절대 가로지르지 않음!)
      const innerStrapStartX = ex - dir * (hw * 0.75);
      const innerStrapStartY = ey - hh * 0.40;
      const innerStrapEndX = cx - dir * (eyeSpacing * 0.85);
      const innerStrapEndY = ey - 125;
      const innerStrapCtrlX = cx - dir * 10;
      const innerStrapCtrlY = ey - 85;
      drawCurvedStrap(innerStrapStartX, innerStrapStartY, innerStrapCtrlX, innerStrapCtrlY, innerStrapEndX, innerStrapEndY);

      // 안대 패치 본체 (이미지와 동일한 둥근 역삼각형 / 쉴드 렌즈 형태)
      ctx.save();
      ctx.translate(ex, ey);

      ctx.beginPath();
      // 안대 4대 핵심 제어점 (상단 완만한 볼록 아치 + 하단 둥근 컵)
      const xOuter = dir * (hw * 0.96);
      const yOuter = -hh * 0.15;
      const xTop = dir * (hw * 0.10);
      const yTop = -hh * 0.82;
      const xInner = -dir * (hw * 0.88);
      const yInner = -hh * 0.10;
      const xBottom = dir * (hw * 0.12);
      const yBottom = hh * 0.90;

      ctx.moveTo(xOuter, yOuter);

      // 외측 코너 -> 상단 아치: 부드러운 볼록 곡선
      ctx.bezierCurveTo(
        dir * (hw * 0.75), -hh * 0.70,
        dir * (hw * 0.45), -hh * 0.82,
        xTop, yTop
      );

      // 상단 아치 -> 내측 코너: 완만하게 코 쪽으로 내려오는 아치
      ctx.bezierCurveTo(
        -dir * (hw * 0.35), -hh * 0.82,
        -dir * (hw * 0.75), -hh * 0.60,
        xInner, yInner
      );

      // 내측 코너 -> 하단 라운드 팁: 부드럽게 좁아지는 곡면
      ctx.bezierCurveTo(
        -dir * (hw * 0.92), hh * 0.35,
        -dir * (hw * 0.40), hh * 0.90,
        xBottom, yBottom
      );

      // 하단 팁 -> 외측 코너: 볼륨감 있게 올라가는 곡면
      ctx.bezierCurveTo(
        dir * (hw * 0.55), hh * 0.90,
        dir * (hw * 0.98), hh * 0.40,
        xOuter, yOuter
      );

      ctx.closePath();

      // 내부: 하이라이트/무늬 없이 완전히 매끄러운 단색 블랙(#18181b)
      ctx.fillStyle = '#18181b';
      ctx.fill();

      // 테두리: 깔끔한 단일 외곽선
      ctx.lineWidth = olW;
      ctx.strokeStyle = outlineColor;
      ctx.stroke();

      ctx.restore();
      ctx.restore();
    };

    if (extras.includes('pirate_patch_left')) drawPiratePatch(-1);
    if (extras.includes('pirate_patch_right')) drawPiratePatch(1);
  }

  

  drawEyes(ctx, state) {
    const { cx, eyeY, eyeSpacing } = this.getFaceCoords();
    const eyeType = state.eyeType || 'default';
    const lashType = state.eyelashType || 'none';
    const defaultColor = state.eyeColor || '#18181b';
    const isOdd = Boolean(state.oddEye);
    const leftColor = isOdd ? (state.eyeColorLeft || defaultColor) : defaultColor;
    const rightColor = isOdd ? (state.eyeColorRight || '#3b82f6') : defaultColor;
    const extras = Array.isArray(state.extraAccessories) ? state.extraAccessories : [];

    const isShock = Array.isArray(state.faceDecos) && state.faceDecos.includes('shock');
    const shockSettings = (state.faceDecoSettings && state.faceDecoSettings.shock) || {};

    [-1, 1].forEach((dir) => {
      if (dir === -1 && (extras.includes('eyepatch_left') || extras.includes('pirate_patch_left'))) return;
      if (dir === 1 && (extras.includes('eyepatch_right') || extras.includes('pirate_patch_right'))) return;
      const ex = cx + dir * eyeSpacing;
      // dir === -1: 왼쪽 눈(보는 사람 기준 왼쪽), dir === 1: 오른쪽 눈(보는 사람 기준 오른쪽)
      const color = dir === -1 ? leftColor : rightColor;
      this.drawSingleEye(ctx, ex, eyeY, dir, eyeType, lashType, color, 1.0, isShock, shockSettings, state);
    });
  }

  drawSingleEye(ctx, ex, ey, dir, eyeType, lashType, color, scale = 1.0, isShock = false, shockSettings = null, state = null) {
    ctx.save();
    ctx.translate(ex, ey);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 덜 길쭉하고 동그랗고 귀여운 눈 비율 (rx=36, ry=39)
    const rx = 36;
    const ry = 39;

    const supportsLashes = ['default', 'angry', 'sad', 'half'].includes(eyeType);

    if (supportsLashes && lashType !== 'none') {
      ctx.save();
      ctx.lineWidth = 11;
      if (lashType === 'top' || lashType === 'both') {
        const startX = dir * (rx - 4);
        const startY = eyeType === 'half' ? -4 : -ry * 0.55;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + dir * 18, startY - 15);
        ctx.stroke();
      }
      if (lashType === 'bottom' || lashType === 'both') {
        ctx.lineWidth = 9.5;
        [-9, 10].forEach((offsetX, idx) => {
          const lx = offsetX * dir;
          const ly = ry * 0.80;
          ctx.beginPath();
          ctx.moveTo(lx, ly - 3);
          ctx.lineTo(lx + dir * (idx === 1 ? 7 : -3), ly + 16);
          ctx.stroke();
        });
      }
      ctx.restore();
    }

    if (eyeType === 'default') {
      if (isShock) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 11;
        ctx.strokeStyle = color;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawEyeHighlight(ctx, eyeType, dir, rx, ry, state);
      }
    } else if (eyeType === 'angry') {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-dir * 52, -4);
      ctx.lineTo(dir * 52, -46);
      ctx.lineTo(dir * 52, 56);
      ctx.lineTo(-dir * 52, 56);
      ctx.closePath();
      ctx.clip();

      if (isShock) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 2, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 12;
        ctx.strokeStyle = color;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 2, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawEyeHighlight(ctx, eyeType, dir, rx, ry, state);
      }
      ctx.restore();
    } else if (eyeType === 'sad') {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-dir * 52, -46);
      ctx.lineTo(dir * 52, -4);
      ctx.lineTo(dir * 52, 56);
      ctx.lineTo(-dir * 52, 56);
      ctx.closePath();
      ctx.clip();

      if (isShock) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 2, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 12;
        ctx.strokeStyle = color;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 2, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawEyeHighlight(ctx, eyeType, dir, rx, ry, state);
      }
      ctx.restore();
    } else if (eyeType === 'half') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-52, -5, 104, 62);
      ctx.clip();

      if (isShock) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 12;
        ctx.strokeStyle = color;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawEyeHighlight(ctx, eyeType, dir, rx, ry, state);
      }
      ctx.restore();
    } else if (eyeType === 'sparkle') {
      const w = 38;
      const h = 44;
      ctx.beginPath();
      ctx.moveTo(0, -h);
      ctx.quadraticCurveTo(5, -5, w, 0);
      ctx.quadraticCurveTo(5, 5, 0, h);
      ctx.quadraticCurveTo(-5, 5, -w, 0);
      ctx.quadraticCurveTo(-5, -5, 0, -h);
      ctx.closePath();
      if (isShock) {
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 10;
        ctx.strokeStyle = color;
        ctx.stroke();
      } else {
        ctx.fill();
      }
    } else if (eyeType === 'wink_tight') {
      if (isShock) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(dir * 25, -24);
      ctx.lineTo(-dir * 22, 0);
      ctx.lineTo(dir * 25, 24);
      ctx.stroke();
    } else if (eyeType === 'closed_down') {
      if (isShock) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(-32, 3);
      ctx.quadraticCurveTo(0, 25, 32, 3);
      ctx.stroke();
    } else if (eyeType === 'happy_up') {
      if (isShock) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(-33, 9);
      ctx.quadraticCurveTo(0, -25, 33, 9);
      ctx.stroke();
    } else if (eyeType === 'flat_line') {
      if (isShock) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(-32, 3);
      ctx.lineTo(32, 3);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawEyeHighlight(ctx, eyeType, dir, rx, ry, state) {
    if (!state || state.eyeHighlight === false) return;

    const hlType = state.eyeHighlightType || 'double';
    const hlSize = Math.max(0.4, Math.min(2.0, state.eyeHighlightSize ?? 1.0));

    ctx.save();
    ctx.fillStyle = '#ffffff';

    // 빛의 방향: 아니메/만화 표준 규칙에 따라 상단(약간 왼쪽)에서 비치는 자연스러운 안광
    const hx = eyeType === 'half' ? -8 : -10;
    const hy = eyeType === 'half' ? 9 : -13;

    if (hlType === 'double') {
      // 1. 초롱초롱 (메인 큰 하이라이트 + 보조 작은 하이라이트)
      ctx.beginPath();
      ctx.arc(hx, hy, 8.5 * hlSize, 0, Math.PI * 2);
      ctx.fill();

      const hx2 = eyeType === 'half' ? 12 : 11;
      const hy2 = eyeType === 'half' ? 22 : 14;
      ctx.beginPath();
      ctx.arc(hx2, hy2, 4.6 * hlSize, 0, Math.PI * 2);
      ctx.fill();
    } else if (hlType === 'circle') {
      // 2. 기본 점 (심플하고 또렷한 단일 원형 하이라이트)
      ctx.beginPath();
      ctx.arc(hx, hy, 9.2 * hlSize, 0, Math.PI * 2);
      ctx.fill();
    } else if (hlType === 'sparkle') {
      // 3. 별빛 (동화풍 십자 반짝이 + 보조 점)
      ctx.save();
      ctx.translate(hx + 1, hy);
      const sw = 10.5 * hlSize;
      const sh = 12.0 * hlSize;
      ctx.beginPath();
      ctx.moveTo(0, -sh);
      ctx.quadraticCurveTo(1.5, -1.5, sw, 0);
      ctx.quadraticCurveTo(1.5, 1.5, 0, sh);
      ctx.quadraticCurveTo(-1.5, 1.5, -sw, 0);
      ctx.quadraticCurveTo(-1.5, -1.5, 0, -sh);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      const hx2 = eyeType === 'half' ? 12 : 11;
      const hy2 = eyeType === 'half' ? 22 : 14;
      ctx.beginPath();
      ctx.arc(hx2, hy2, 4.0 * hlSize, 0, Math.PI * 2);
      ctx.fill();
    } else if (hlType === 'heart') {
      // 4. 하트 (사랑스러운 미니 하트 반사광 + 보조 점)
      ctx.save();
      ctx.translate(hx + 1, hy);
      const hs = 0.82 * hlSize;
      ctx.scale(hs, hs);
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.bezierCurveTo(-8, -8, -13, 2, 0, 14);
      ctx.bezierCurveTo(13, 2, 8, -8, 0, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      const hx2 = eyeType === 'half' ? 12 : 11;
      const hy2 = eyeType === 'half' ? 22 : 14;
      ctx.beginPath();
      ctx.arc(hx2, hy2, 3.8 * hlSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // 눈썹 5종 (송충이, 짧은 아치, 둥근 아치, 화남, 처짐 + 단일 선택 + 크기/위치 조절)
  drawEyebrows(ctx, state) {
    let type = state.eyebrowType || (Array.isArray(state.eyebrows) && state.eyebrows[0]) || 'none';
    if (!type || type === 'none') return;
    if (type === 'dot' || type === 'thick') {
      type = 'songchung';
    }

    const { cx, eyeY, eyeSpacing } = this.getFaceCoords();
    const color = state.eyebrowColor || state.noseMouthColor || '#18181b';
    const scale = state.eyebrowScale ?? 1.0;
    const offsetY = (state.eyebrowY ?? 0.0) * 36;
    const offsetSpacing = (state.eyebrowSpacing ?? 0.0) * 30;

    const baseY = eyeY - 58 + offsetY;

    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    [-1, 1].forEach((dir) => {
      const bx = cx + dir * (eyeSpacing + offsetSpacing);

      ctx.save();
      ctx.translate(bx, baseY);

      if (type === 'songchung') {
        // 송충이 눈썹 (스케치 1번 2번째: 타원형 둥근 루프, 내부 피부색 채움 + 윤곽선)
        ctx.rotate(dir * 0.12);
        ctx.beginPath();
        ctx.ellipse(0, 0, 19 * scale, 11 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = state.bodyColor || '#ffffff';
        ctx.fill();
        ctx.lineWidth = 5.2 * scale;
        ctx.stroke();
      } else if (type === 'short_arch') {
        // 짧은 아치 (스케치 1번 3번째: 완만한 짧은 아치)
        ctx.lineWidth = 6.5 * scale;
        ctx.beginPath();
        ctx.moveTo(-16 * scale, 4 * scale);
        ctx.quadraticCurveTo(0, -8 * scale, 16 * scale, 4 * scale);
        ctx.stroke();
      } else if (type === 'round') {
        // 둥근 아치: 뒤집은 둥근 아치 (아래로 볼록한 U자형 반전 아치)
        ctx.lineWidth = 7.0 * scale;
        ctx.beginPath();
        ctx.moveTo(-dir * 22 * scale, -8 * scale);
        ctx.quadraticCurveTo(0, 13 * scale, dir * 22 * scale, -6 * scale);
        ctx.stroke();
      } else if (type === 'angry') {
        // 화난 눈썹 (스케치 1번 5번째: 사선 치켜올림)
        ctx.lineWidth = 7.5 * scale;
        ctx.beginPath();
        ctx.moveTo(-dir * 22 * scale, 8 * scale);
        ctx.lineTo(dir * 22 * scale, -9 * scale);
        ctx.stroke();
      } else if (type === 'sad') {
        // 처진 눈썹 (스케치 1번 6번째: 바깥쪽으로 처짐)
        ctx.lineWidth = 6.5 * scale;
        ctx.beginPath();
        ctx.moveTo(-dir * 22 * scale, -4 * scale);
        ctx.quadraticCurveTo(-dir * 4 * scale, -8 * scale, dir * 22 * scale, 8 * scale);
        ctx.stroke();
      }

      ctx.restore();
    });

    ctx.restore();
  }

  // 얼굴 꾸밈 6종 (수염, 그림자, 삐질, 주름, 놀람, 화남 + 개별 크기/위치 조절)
  drawFaceDecos(ctx, state) {
    const decos = Array.isArray(state.faceDecos) ? state.faceDecos.filter((d) => d && d !== 'none') : [];
    if (decos.length === 0) return;

    const { cx, eyeY, eyeSpacing, noseY } = this.getFaceCoords();
    const settings = state.faceDecoSettings || {};

    ctx.save();

    decos.forEach((type) => {
      const cfg = settings[type] || {};
      const scale = cfg.scale !== undefined ? cfg.scale : (state.faceDecoScale ?? 1.0);
      const offsetX = ((cfg.x !== undefined ? cfg.x : (state.faceDecoX ?? 0.0))) * 45;
      const offsetY = ((cfg.y !== undefined ? cfg.y : (state.faceDecoY ?? 0.0))) * 45;

      if (type === 'beard') {
        // 1. 수염: 입 바로 아래 턱 중앙의 5개 세로 수염 선 (y=noseY+30으로 턱 중앙에 확실히 표시!)
        ctx.save();
        const by = noseY + 30 + offsetY;
        const bx = cx + offsetX;
        ctx.strokeStyle = state.noseMouthColor || '#18181b';
        ctx.lineWidth = 5 * scale;
        ctx.lineCap = 'round';
        [-16, -8, 0, 8, 16].forEach((dx) => {
          ctx.beginPath();
          ctx.moveTo(bx + dx * scale, by - 2 * scale);
          ctx.lineTo(bx + dx * scale, by + 12 * scale);
          ctx.stroke();
        });
        ctx.restore();
      } else if (type === 'shadow') {
        // 2. 그림자: 눈 사이 미간의 납작한 보라빛 타원 + 내부 세로선 (요청 4 반영: 더욱 납작한 타원형)
        ctx.save();
        const sy = eyeY - 10 + offsetY;
        const sx = cx + offsetX;
        const sw = 56 * scale; // 넓고
        const sh = 28 * scale; // 납작한 타원형!

        // 보라빛 타원 배경
        ctx.fillStyle = 'rgba(102, 92, 148, 0.75)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, sw, sh, 0, 0, Math.PI * 2);
        ctx.fill();

        // 내부 어두운 세로 해칭선 5개
        ctx.strokeStyle = '#372d5b';
        ctx.lineWidth = 5 * scale;
        ctx.lineCap = 'round';
        [-32, -16, 0, 16, 32].forEach((dx) => {
          const factor = Math.max(0, 1.0 - Math.pow(Math.abs(dx) / (sw * 0.75), 1.8));
          const len = factor * sh * 0.82;
          ctx.beginPath();
          ctx.moveTo(sx + dx * (sw / 56), sy - len);
          ctx.lineTo(sx + dx * (sw / 56), sy + len);
          ctx.stroke();
        });
        ctx.restore();
      } else if (type === 'sweat') {
        // 3. 삐질: 크기를 키우고 하이라이트(흰점)를 제거한 깔끔한 식은땀 물방울
        ctx.save();
        const tx = cx + eyeSpacing + 42 + offsetX; // x=698: 평평한 정면 영역으로 왜곡 방지
        const ty = eyeY - 64 + offsetY;
        const w = 38 * scale;
        const h = 60 * scale;

        ctx.translate(tx, ty);
        ctx.rotate(0.18);

        // 부드러운 물방울 패스 (하단 완벽한 반원 아치 + 상단 꼭짓점)
        const r = w * 0.50;
        ctx.beginPath();
        ctx.arc(0, h * 0.12, r, 0, Math.PI, false);
        ctx.lineTo(0, -h * 0.50);
        ctx.closePath();

        // 그라데이션 채우기
        const grad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
        grad.addColorStop(0, '#bae6fd');
        grad.addColorStop(1, '#38bdf8');
        ctx.fillStyle = grad;
        ctx.fill();

        // 외곽선 (매끄러운 라인 조인)
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 6 * scale;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.restore();
      } else if (type === 'wrinkle') {
        // 4. 주름: 사선 방향을 반대(/ 형태)로 하여 눈가 윤곽을 자연스럽게 감싸도록 변경 (요청 3 반영)
        ctx.save();
        const ex = cx - eyeSpacing;
        const ey = eyeY;
        ctx.strokeStyle = state.noseMouthColor || '#18181b';
        ctx.lineWidth = 6.2 * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        // 눈가 아래쪽(ex+28, ey+36)에서 눈가 오른쪽 위(ex+44, ey+14)로 흐르는 / 형태 곡선
        ctx.moveTo(ex + 28 * scale + offsetX, ey + 36 * scale + offsetY);
        ctx.quadraticCurveTo(
          ex + 37 * scale + offsetX, ey + 26 * scale + offsetY,
          ex + 44 * scale + offsetX, ey + 14 * scale + offsetY
        );
        ctx.stroke();
        ctx.restore();
      } else if (type === 'shock') {
        // 5. 놀람: 눈 모양에 맞춰 흰색 영역이 변경되는 처리는 drawEyes에서 100% 통합 처리
      } else if (type === 'anger') {
        // 6. 화남: 간격을 좁혀 더욱 오밀조밀하게 밀착된 4개 부메랑 마크 (요청 2 반영)
        ctx.save();
        const ax = cx + eyeSpacing + 46 + offsetX;
        const ay = eyeY - 78 + offsetY;

        ctx.translate(ax, ay);
        ctx.rotate(-0.08);

        const drawBoomerangs = (lineWidth, strokeColor) => {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 2);
            ctx.beginPath();
            // 끝점이 뭉쳐지지 않으면서도 서로 긴밀하게 붙어있는 오밀조밀한 부메랑
            ctx.moveTo(-14.5 * scale, -23.5 * scale);
            ctx.quadraticCurveTo(0, -13 * scale, 14.5 * scale, -23.5 * scale);
            ctx.stroke();
            ctx.restore();
          }
        };

        // 1패스: 도톰한 검은 외곽선
        drawBoomerangs(9.5 * scale, '#18181b');
        // 2패스: 선명한 빨간색 내부
        drawBoomerangs(5.5 * scale, '#ef4444');

        ctx.restore();
      }
    });

    ctx.restore();
  }

  drawNoseAndMouth(ctx, state) {
    const mouthType = state.mouthType || 'cat_w';
    // 3D 돌출형 부리가 생성되므로 2D 텍스처 상에는 중복하여 그리지 않음
    if (mouthType === 'beak') {
      return;
    }
    const { cx, noseY } = this.getFaceCoords();
    const color = state.noseMouthColor || '#18181b';

    this.drawNoseMouthShape(ctx, cx, noseY, mouthType, color, 1.0);
  }

  drawNoseMouthShape(ctx, cx, ny, mouthType, color, scale = 1.0) {
    ctx.save();
    ctx.translate(cx, ny);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 새 부리는 별도의 포유류 코 점(타원)을 그리지 않음 (부리 자체가 코/입을 대체)
    if (mouthType !== 'beak') {
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineWidth = 10.5;

    if (mouthType === 'line_t') {
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(0, 32);
      ctx.moveTo(-26, 32);
      ctx.lineTo(26, 32);
      ctx.stroke();
    } else if (mouthType === 'cat_w') {
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(0, 19);
      ctx.moveTo(-36, 22);
      ctx.quadraticCurveTo(-18, 40, 0, 19);
      ctx.quadraticCurveTo(18, 40, 36, 22);
      ctx.stroke();
    } else if (mouthType === 'pout_v') {
      ctx.beginPath();
      ctx.moveTo(-20, 35);
      ctx.lineTo(0, 17);
      ctx.lineTo(20, 35);
      ctx.stroke();
    } else if (mouthType === 'smile_u') {
      ctx.beginPath();
      ctx.moveTo(-17, 26);
      ctx.quadraticCurveTo(0, 38, 17, 26);
      ctx.stroke();
    } else if (mouthType === 'nose_only') {
      // 코만 표시
    } else if (mouthType === 'open_d') {
      ctx.lineWidth = 9.5;
      ctx.beginPath();
      ctx.moveTo(-20, 22);
      ctx.lineTo(20, 22);
      ctx.quadraticCurveTo(17, 46, 0, 46);
      ctx.quadraticCurveTo(-17, 46, -20, 22);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
    } else if (mouthType === 'beak') {
      // 귀엽고 도톰한 새 부리 (상단 부리 + 하단 부리 + 맞물림선 + 볼륨 반사광)
      ctx.save();
      const beakOutlineColor = color;
      const beakFillTop = '#fbbf24';    // 화사하고 따뜻한 옐로우 골드
      const beakFillBot = '#f59e0b';    // 따뜻한 앰버 오렌지 (입체 그림자 톤)

      // 1) 하단 부리 (아래로 둥글게 볼록한 턱)
      ctx.beginPath();
      ctx.moveTo(-16, 14);
      ctx.quadraticCurveTo(0, 16, 16, 14);
      ctx.quadraticCurveTo(0, 33, -16, 14);
      ctx.closePath();
      ctx.fillStyle = beakFillBot;
      ctx.fill();
      ctx.lineWidth = 6.8;
      ctx.strokeStyle = beakOutlineColor;
      ctx.stroke();

      // 2) 상단 부리 (위로 부드럽게 솟은 통통한 돔)
      ctx.beginPath();
      ctx.moveTo(-22, 14);
      ctx.quadraticCurveTo(0, -7, 22, 14);
      ctx.quadraticCurveTo(0, 18, -22, 14);
      ctx.closePath();
      ctx.fillStyle = beakFillTop;
      ctx.fill();
      ctx.lineWidth = 6.8;
      ctx.strokeStyle = beakOutlineColor;
      ctx.stroke();

      // 3) 부리 중앙 가로선 (입술 맞물림 라인)
      ctx.beginPath();
      ctx.moveTo(-20, 14);
      ctx.quadraticCurveTo(0, 17, 20, 14);
      ctx.lineWidth = 6.0;
      ctx.strokeStyle = beakOutlineColor;
      ctx.stroke();

      // 4) 상단 부리 앙증맞은 만화풍 볼륨 하이라이트
      ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
      ctx.beginPath();
      ctx.ellipse(0, 2.5, 8.5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }

  drawColorSwatches(ctx, state) {
    const hasTwoTone = (Array.isArray(state.patterns) && state.patterns.includes('two_tone')) || state.patternType === 'two_tone';
    const colors = {
      body: state.bodyColor || '#ffffff',
      innerEar: state.innerEarColor || '#ffb5c2',
      tailTip: state.tailTipEnabled ? (state.tailTipColor || '#27272a') : (state.bodyColor || '#ffffff'),
      belly: state.bellyPatch ? (state.bellyColor || '#fff5eb') : (state.bodyColor || '#ffffff'),
      antler: state.antlerColor || '#c69c6d',
      accessory: state.accessoryColor || '#ff5e7e',
      dark: state.outlineColor || '#18181b',
      sprout: '#52b788',
      gold: '#ffd166',
      earOuter: state.earColorCustom
        ? (state.earColor || state.bodyColor || '#ffffff')
        : (hasTwoTone
            ? (state.patternColor || '#d4c4b4')
            : (state.bodyColor || '#ffffff')),
      white: '#ffffff',
      arm: state.armColorCustom
        ? (state.armColor || state.bodyColor || '#ffffff')
        : (state.bodyColor || '#ffffff'),
      ahoge: state.ahogeFollowBody !== false
        ? (state.bodyColor || '#ffffff')
        : (state.ahogeColor || state.bodyColor || '#ffffff'),
      beak: state.beakFollowBody
        ? (state.bodyColor || '#ffffff')
        : (state.beakColor || '#fbbf24'),
      mane: state.maneColor || '#f97316',
      devilRed: '#c51b29',
      beret: state.beretColor || '#ef476f',
      starPin: state.starPinColor || '#ffd166',
      glasses: state.glassesColor || '#18181b',
      squareGlasses: state.squareGlassesColor || '#18181b',
      crown: state.crownColor || '#ffd166',
      devilHorns: state.devilHornsColor || '#18181b',
      monocle: state.monocleColor || '#ffd166',
    };

    Object.entries(SWATCH_MAP).forEach(([key, rect]) => {
      ctx.fillStyle = colors[key] || '#ffffff';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    });
  }
}
