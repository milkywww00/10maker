// 10공방 — 캐릭터 커스터마이징 파츠 및 기본 설정 데이터 (이모티콘 제거, 벡터/기호 기반)

export const DEFAULT_STATE = {
  // 캐릭터 이름 (파일명 · MMD 모델명 · 스튜디오 표시용)
  characterName: '',

  // 색상 설정
  bodyColor: '#ffffff',
  innerEarColor: '#ffb5c2',
  eyeColor: '#18181b',
  noseMouthColor: '#18181b',
  blushColor: '#ff8da1',
  patternColor: '#d4c4b4',
  bellyColor: '#fff5eb',
  tailTipColor: '#27272a',
  antlerColor: '#c69c6d',
  accessoryColor: '#ff5e7e',

  // 오드아이 (양 눈 색 다르게)
  oddEye: false,
  eyeColorLeft: '#18181b',
  eyeColorRight: '#3b82f6',

  // 귀 / 팔 개별 색상 설정
  earColorCustom: false,
  earColor: '#ffffff',
  armColorCustom: false,
  armColor: '#ffffff',

  // 파츠 종류
  earType: 'cat',          // 15종
  tailType: 'long',        // 5종
  tailTipEnabled: false,
  eyeType: 'default',      // 9종
  eyelashType: 'none',     // 4종
  eyebrowType: 'none',
  eyebrows: [],
  eyebrowColor: '#18181b',
  eyebrowScale: 1.0,
  eyebrowY: 0.0,
  eyebrowSpacing: 0.0,
  mouthType: 'cat_w',      // 6종

  // 얼굴 무늬 & 꾸밈 & 점 & 홍조
  patternType: 'none',
  patterns: [],
  faceDecos: [],
  faceDecoScale: 1.0,
  faceDecoY: 0.0,
  faceDecoX: 0.0,
  bellyPatch: false,
  blushType: 'comic_circle',
  blushScale: 1.0,
  blushOpacity: 0.85,
  blushY: 0.0,

  // 점 & 흉터 (여러 개 동시 추가 및 개별 위치/크기/각도/대칭 커스텀 가능)
  moles: [],
  scars: [],
  scarColor: '#b55d60',

  // 장식 (리본 및 추가 소품 각각 다중 선택 가능)
  ribbons: [],
  ribbonScale: 1.0,
  extraAccessories: [],

  // 모델링 & 렌더링 스타일
  lowPolyFlat: false,      // 기본은 깔끔하고 매끈한 로우폴리 툰 셰이딩 (체크 시 각진 패싯 표시)
  polyDetail: 'low',
  outlineEnabled: true,
  outlineThickness: 0.032,
  outlineColor: '#18181b',
  headScale: 1.0,
  bodyChubby: 1.0,
  legLength: 1.0,

  // 춤/모션
  danceMode: 'idle',       // idle, bounce, happy_dance, jump_spin, tail_wag, step_dance, custom_vmd, custom_fbx
  danceSpeed: 1.0,
};

// 15종 귀 모양 (스케치 2번 완벽 반영)
export const EAR_TYPES = [
  { id: 'cat', name: '고양이', hasInner: true },
  { id: 'fox', name: '여우', hasInner: true },
  { id: 'wolf', name: '늑대', hasInner: true },
  { id: 'bear', name: '곰', hasInner: true },
  { id: 'mouse', name: '쥐', hasInner: true },
  { id: 'hamster', name: '햄스터', hasInner: true },
  { id: 'dog', name: '강아지', hasInner: false },
  { id: 'deer1', name: '사슴 1', hasInner: true },
  { id: 'deer2', name: '사슴 2 뿔', hasInner: true },
  { id: 'rabbit', name: '토끼', hasInner: true },
  { id: 'lop_rabbit', name: '롭이어 토끼', hasInner: true },
  { id: 'axolotl', name: '아홀로틀', hasInner: false },
  { id: 'raccoon', name: '너구리', hasInner: true },
  { id: 'otter', name: '수달', hasInner: true },
  { id: 'none', name: '귀 없음', hasInner: false },
];

// 5종 꼬리 모양
export const TAIL_TYPES = [
  { id: 'round', name: '동그란 꼬리', sub: '토끼·곰형' },
  { id: 'long', name: '긴 꼬리', sub: '고양이·강아지형' },
  { id: 'stubby', name: '뭉툭한 꼬리', sub: '너구리형' },
  { id: 'fluffy', name: '복슬복슬 꼬리', sub: '여우형' },
  { id: 'none', name: '꼬리 없음', sub: '기본' },
];

// 9종 눈 모양 (스케치 4번 순서 및 형태)
export const EYE_TYPES = [
  { id: 'angry', name: '화남' },
  { id: 'default', name: '기본' },
  { id: 'sad', name: '처짐' },
  { id: 'half', name: '반감음' },
  { id: 'sparkle', name: '반짝' },
  { id: 'wink_tight', name: '찡그림' },
  { id: 'closed_down', name: '감음' },
  { id: 'happy_up', name: '웃음' },
  { id: 'flat_line', name: '일자' },
];

// 속눈썹 옵션
export const EYELASH_TYPES = [
  { id: 'none', name: '없음' },
  { id: 'top', name: '위 속눈썹' },
  { id: 'bottom', name: '아래 속눈썹' },
  { id: 'both', name: '위 + 아래 모두' },
];

// 6종 입 모양 (스케치 3번)
export const MOUTH_TYPES = [
  { id: 'line_t', name: '일자입' },
  { id: 'cat_w', name: '고양이입' },
  { id: 'pout_v', name: '삐죽입' },
  { id: 'smile_u', name: '미소입' },
  { id: 'nose_only', name: '코만 표시' },
  { id: 'open_d', name: '벌린입' },
];

// 눈썹 종류
export const EYEBROW_TYPES = [
  { id: 'none', name: '없음' },
  { id: 'songchung', name: '송충이' },
  { id: 'short_arch', name: '짧은 아치' },
  { id: 'round', name: '둥근 아치' },
  { id: 'angry', name: '화남' },
  { id: 'sad', name: '처짐' },
];

// 얼굴 꾸밈 종류
export const FACE_DECO_TYPES = [
  { id: 'none', name: '없음' },
  { id: 'beard', name: '수염' },
  { id: 'shadow', name: '그림자' },
  { id: 'sweat', name: '삐질' },
  { id: 'wrinkle', name: '주름' },
  { id: 'shock', name: '놀람' },
  { id: 'anger', name: '화남' },
];

// 홍조 종류
export const BLUSH_TYPES = [
  { id: 'comic_circle', name: '원형' },
  { id: 'comic_circle_slash', name: '원형+빗금' },
  { id: 'slash_only', name: '빗금' },
  { id: 'soft_oval', name: '블러' },
  { id: 'none', name: '없음' },
];

// 얼굴 무늬 종류
export const PATTERN_TYPES = [
  { id: 'none', name: '무늬 없음' },
  { id: 'tabby', name: '이마 줄무늬' },
  { id: 'cheek_stripes', name: '볼 줄무늬' },
  { id: 'spots', name: '점박이 무늬' },
  { id: 'mask_raccoon', name: '안대 무늬' },
  { id: 'muzzle', name: '주둥이 포인트' },
  { id: 'two_tone', name: '이마 투톤' },
];

// 리본 장식 위치
export const RIBBON_TYPES = [
  { id: 'none', name: '리본 없음' },
  { id: 'ear_left', name: '왼쪽 머리 리본' },
  { id: 'ear_right', name: '오른쪽 머리 리본' },
  { id: 'double_ears', name: '양쪽 미니 리본' },
  { id: 'head_top', name: '정수리 리본' },
  { id: 'neck_bow', name: '목 보타이' },
  { id: 'chest_big_bow', name: '가슴 왕리본' },
];

// 추가 소품
export const EXTRA_ACC_TYPES = [
  { id: 'none', name: '없음' },
  { id: 'sprout', name: '머리 위 새싹' },
  { id: 'crown', name: '미니 왕관' },
  { id: 'beret', name: '베레모' },
  { id: 'star_pin', name: '별 머리핀' },
  { id: 'glasses', name: '동그란 안경' },
  { id: 'square_glasses', name: '사각 안경' },
  { id: 'eyepatch_left', name: '왼쪽 안대' },
  { id: 'eyepatch_right', name: '오른쪽 안대' },
  { id: 'bandaid_nose', name: '코 밴드' },
  { id: 'bandaid_left_cheek', name: '왼쪽 볼 밴드' },
  { id: 'bandaid_right_cheek', name: '오른쪽 볼 밴드' },
];

// 춤 프리셋 (이모티콘 제거)
export const DANCE_MODES = [
  { id: 'idle', name: '기본 대기 모션' },
  { id: 'bounce', name: '바운스 리듬' },
  { id: 'happy_dance', name: '양팔 율동' },
  { id: 'tail_wag', name: '꼬리 살랑 댄스' },
  { id: 'jump_spin', name: '점프 & 턴' },
  { id: 'step_dance', name: '워킹 스텝' },
];

// 추천 컬러 팔레트
export const COLOR_PALETTES = {
  body: [
    '#ffffff', '#f8f5f0', '#fde2e4', '#ffcad4', '#f4acb7',
    '#ffe5b4', '#f7d08a', '#e6b88a', '#c69c6d', '#8d6e63',
    '#d8e2dc', '#bde0fe', '#a2d2ff', '#cdb4db', '#e2ece9',
    '#4a4e69', '#27272a', '#b5e48c', '#ffd166', '#ef476f'
  ],
  innerEar: [
    '#ffb5c2', '#ff8fa3', '#ff758f', '#ffccd5', '#f4acb7',
    '#ffd6a5', '#caffbf', '#9bf6ff', '#bdb2ff', '#ffc6ff',
    '#8d6e63', '#5c4033', '#3d405b', '#ffffff', '#27272a'
  ],
  eye: [
    '#18181b', '#3d2b1f', '#5c3c28', '#2b4c7e', '#1d6b52',
    '#7b2cbf', '#c9184a', '#d97706', '#4a5568', '#ffffff'
  ],
  accent: [
    '#ff5e7e', '#ff85a1', '#ff9f1c', '#ffbf69', '#2ec4b6',
    '#3a86ff', '#8338ec', '#ef233c', '#52b788', '#18181b'
  ],
  outline: [
    '#18181b', '#27272a', '#3f3f46', '#52525b', '#71717a',
    '#451a03', '#78350f', '#8d6e63', '#831843', '#7f1d1d',
    '#1e1b4b', '#172554', '#3b0764', '#022c22', '#166534',
    '#ef476f', '#f43f5e', '#a855f7', '#3b82f6', '#ffffff'
  ]
};
