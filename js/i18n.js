// 10공방 — 다국어(i18n) 지원 모듈 (한국어 · English · 日本語 · 简体中文)

export const SUPPORTED_LANGS = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '简体中文' },
];

export const PART_NAMES = {
  ko: {
    // 귀 (스케치 2번 / 스크린샷 1번)
    ear_cat: '고양이',
    ear_fox: '여우',
    ear_wolf: '늑대',
    ear_bear: '곰',
    ear_mouse: '쥐',
    ear_hamster: '햄스터',
    ear_dog: '강아지',
    ear_deer1: '사슴 1',
    ear_deer2: '사슴 2 뿔',
    ear_rabbit: '토끼',
    ear_lop_rabbit: '롭이어 토끼',
    ear_axolotl: '아홀로틀',
    ear_raccoon: '너구리',
    ear_otter: '수달',
    ear_lion: '사자',
    ear_none: '귀 없음',

    // 꼬리 (10종)
    tail_round: '동그란 꼬리',
    tail_long: '긴 꼬리',
    tail_stubby: '뭉툭한 꼬리',
    tail_fluffy: '복슬복슬 꼬리',
    tail_hamster: '햄스터 꼬리',
    tail_mouse: '쥐 꼬리',
    tail_lion: '사자 꼬리',
    tail_raccoon: '너구리 꼬리',
    tail_mermaid: '인어 꼬리',
    tail_none: '꼬리 없음',

    // 날개 (3종)
    wing_none: '날개 없음',
    wing_angel: '천사 날개',
    wing_devil: '악마 날개',

    // 눈 (9종)
    eye_angry: '화남',
    eye_default: '기본',
    eye_sad: '처짐',
    eye_half: '반감음',
    eye_sparkle: '반짝',
    eye_wink_tight: '찡그림',
    eye_closed_down: '감음',
    eye_happy_up: '웃음',
    eye_flat_line: '일자',

    // 안광 (눈 하이라이트)
    hl_double: '초롱초롱',
    hl_circle: '기본 점',
    hl_sparkle: '별빛',
    hl_heart: '하트',

    // 속눈썹
    eyelash_none: '없음',
    eyelash_top: '위 속눈썹',
    eyelash_bottom: '아래 속눈썹',
    eyelash_both: '위 + 아래 모두',

    // 눈썹
    eyebrow_none: '없음',
    eyebrow_songchung: '송충이',
    eyebrow_short_arch: '짧은 아치',
    eyebrow_round: '둥근 아치',
    eyebrow_angry: '화남',
    eyebrow_sad: '처짐',

    // 입 (7종)
    mouth_line_t: '일자입',
    mouth_cat_w: '고양이입',
    mouth_pout_v: '삐죽입',
    mouth_smile_u: '미소입',
    mouth_nose_only: '코만 표시',
    mouth_open_d: '벌린입',
    mouth_beak: '새 부리',

    // 홍조 이펙트 (스크린샷 3번)
    blush_comic_circle: '원형',
    blush_comic_circle_slash: '원형+빗금',
    blush_slash_only: '빗금',
    blush_soft_oval: '블러',
    blush_none: '없음',

    // 얼굴 꾸밈 (스크린샷 3번)
    face_none: '없음',
    face_beard: '수염',
    face_whiskers: '수염',
    face_shadow: '그림자',
    face_sweat: '삐질',
    face_wrinkle: '주름',
    face_shock: '놀람',
    face_anger: '화남',

    // 무늬 (스크린샷 2번)
    pattern_none: '무늬 없음',
    pattern_tabby: '이마 줄무늬',
    pattern_cheek_stripes: '볼 줄무늬',
    pattern_spots: '점박이 무늬',
    pattern_mask_raccoon: '안대 무늬',
    pattern_muzzle: '주둥이 포인트',
    pattern_two_tone: '이마 투톤',

    // 리본 (스크린샷 3번)
    ribbon_none: '리본 없음',
    ribbon_ear_left: '왼쪽 머리 리본',
    ribbon_ear_right: '오른쪽 머리 리본',
    ribbon_double_ears: '양쪽 미니 리본',
    ribbon_head_top: '정수리 리본',
    ribbon_neck_bow: '목 보타이',
    ribbon_chest_big_bow: '가슴 왕리본',

    // 추가 소품 (스크린샷 3번)
    acc_none: '없음',
    acc_sprout: '머리 위 새싹',
    acc_crown: '미니 왕관',
    acc_beret: '베레모',
    acc_star_pin: '별 머리핀',
    acc_glasses: '동그란 안경',
    acc_square_glasses: '사각 안경',
    acc_eyepatch_left: '왼쪽 안대',
    acc_eyepatch_right: '오른쪽 안대',
    acc_pirate_patch_left: '왼쪽 검은 안대',
    acc_pirate_patch_right: '오른쪽 검은 안대',
    acc_bandaid_nose: '코 밴드',
    acc_bandaid_left_cheek: '왼쪽 볼 밴드',
    acc_bandaid_right_cheek: '오른쪽 볼 밴드',
    acc_dressing_nose: '코 드레싱',
    acc_dressing_left_cheek: '왼쪽 볼 드레싱',
    acc_dressing_right_cheek: '오른쪽 볼 드레싱',
    acc_halo: '헤일로',
    acc_devil_horns: '악마 뿔',
    acc_monocle: '모노클',

    // 모션 프리셋
    dance_idle: '기본 대기 모션',
    dance_bounce: '바운스 리듬',
    dance_happy_dance: '양팔 율동',
    dance_tail_wag: '꼬리 살랑 댄스',
    dance_jump_spin: '점프 & 턴',
    dance_step_dance: '워킹 스텝',

    // 폴리곤 디테일
    poly_very_low: '로우 폴리곤',
    poly_low: '표준 폴리곤',
    poly_medium: '하이 폴리곤',

    // 흉터 종류
    scar_slash: '일자 흉터',
    scar_stitch: '바늘땀 흉터',
    scar_cross: '십자 흉터',
    scar_double_slash: '두 줄 흉터',
    scar_burn: '화상 흉터',
  },

  en: {
    // Ears
    ear_cat: 'Cat',
    ear_fox: 'Fox',
    ear_wolf: 'Wolf',
    ear_bear: 'Bear',
    ear_mouse: 'Mouse',
    ear_hamster: 'Hamster',
    ear_dog: 'Puppy',
    ear_deer1: 'Deer 1',
    ear_deer2: 'Deer 2 Horns',
    ear_rabbit: 'Rabbit',
    ear_lop_rabbit: 'Lop Rabbit',
    ear_axolotl: 'Axolotl',
    ear_raccoon: 'Raccoon',
    ear_otter: 'Otter',
    ear_lion: 'Lion',
    ear_none: 'No Ears',

    // Tails (10)
    tail_round: 'Round Tail',
    tail_long: 'Long Tail',
    tail_stubby: 'Stubby Tail',
    tail_fluffy: 'Fluffy Tail',
    tail_hamster: 'Hamster Tail',
    tail_mouse: 'Mouse Tail',
    tail_lion: 'Lion Tail',
    tail_raccoon: 'Raccoon Tail',
    tail_mermaid: 'Mermaid Tail',
    tail_none: 'No Tail',

    // Wings (3)
    wing_none: 'No Wings',
    wing_angel: 'Angel Wings',
    wing_devil: 'Devil Wings',

    // Eyes
    eye_angry: 'Angry',
    eye_default: 'Default',
    eye_sad: 'Droopy',
    eye_half: 'Half-closed',
    eye_sparkle: 'Sparkle',
    eye_wink_tight: 'Squint',
    eye_closed_down: 'Closed',
    eye_happy_up: 'Smile',
    eye_flat_line: 'Flat Line',

    // Eye Highlights
    hl_double: 'Double Glow',
    hl_circle: 'Single Dot',
    hl_sparkle: 'Sparkle',
    hl_heart: 'Heart',

    // Eyelashes
    eyelash_none: 'None',
    eyelash_top: 'Top Lashes',
    eyelash_bottom: 'Bottom Lashes',
    eyelash_both: 'Both Top & Bottom',

    // Eyebrows
    eyebrow_none: 'None',
    eyebrow_songchung: 'Bushy',
    eyebrow_short_arch: 'Short Arch',
    eyebrow_round: 'Round Arch',
    eyebrow_angry: 'Angry',
    eyebrow_sad: 'Droopy',

    // Mouth
    mouth_line_t: 'Straight Mouth',
    mouth_cat_w: 'Cat Mouth',
    mouth_pout_v: 'Pout Mouth',
    mouth_smile_u: 'Smile Mouth',
    mouth_nose_only: 'Nose Only',
    mouth_open_d: 'Open Mouth',
    mouth_beak: 'Bird Beak',

    // Blush
    blush_comic_circle: 'Circle',
    blush_comic_circle_slash: 'Circle+Hatch',
    blush_slash_only: 'Hatch',
    blush_soft_oval: 'Blur',
    blush_none: 'None',

    // Face Decorations
    face_none: 'None',
    face_beard: 'Whiskers',
    face_whiskers: 'Whiskers',
    face_shadow: 'Shadow',
    face_sweat: 'Sweat',
    face_wrinkle: 'Wrinkles',
    face_shock: 'Shock',
    face_anger: 'Anger',

    // Patterns
    pattern_none: 'No Pattern',
    pattern_tabby: 'Forehead Stripes',
    pattern_cheek_stripes: 'Cheek Stripes',
    pattern_spots: 'Spot Pattern',
    pattern_mask_raccoon: 'Mask Pattern',
    pattern_muzzle: 'Muzzle Accent',
    pattern_two_tone: 'Forehead Two-tone',

    // Ribbons
    ribbon_none: 'No Ribbon',
    ribbon_ear_left: 'Left Head Ribbon',
    ribbon_ear_right: 'Right Head Ribbon',
    ribbon_double_ears: 'Twin Mini Ribbons',
    ribbon_head_top: 'Top Head Ribbon',
    ribbon_neck_bow: 'Neck Bowtie',
    ribbon_chest_big_bow: 'Chest Big Bow',

    // Extra Accessories
    acc_none: 'None',
    acc_sprout: 'Head Sprout',
    acc_crown: 'Mini Crown',
    acc_beret: 'Beret',
    acc_star_pin: 'Star Hairpin',
    acc_glasses: 'Round Glasses',
    acc_square_glasses: 'Square Glasses',
    acc_eyepatch_left: 'Left Eyepatch',
    acc_eyepatch_right: 'Right Eyepatch',
    acc_pirate_patch_left: 'Left Black Eyepatch',
    acc_pirate_patch_right: 'Right Black Eyepatch',
    acc_bandaid_nose: 'Nose Bandage',
    acc_bandaid_left_cheek: 'Left Cheek Bandage',
    acc_bandaid_right_cheek: 'Right Cheek Bandage',
    acc_dressing_nose: 'Nose Dressing',
    acc_dressing_left_cheek: 'Left Cheek Dressing',
    acc_dressing_right_cheek: 'Right Cheek Dressing',
    acc_halo: 'Halo',
    acc_devil_horns: 'Devil Horns',
    acc_monocle: 'Monocle',

    // Dance Motions
    dance_idle: 'Idle Stance',
    dance_bounce: 'Bounce Rhythm',
    dance_happy_dance: 'Happy Dance',
    dance_tail_wag: 'Tail Wag Dance',
    dance_jump_spin: 'Jump & Turn',
    dance_step_dance: 'Walking Steps',

    // Polygon
    poly_very_low: 'Low Poly',
    poly_low: 'Standard Poly',
    poly_medium: 'High Poly',

    // Scars
    scar_slash: 'Slash Scar',
    scar_stitch: 'Stitch Scar',
    scar_cross: 'Cross Scar',
    scar_double_slash: 'Double Scar',
    scar_burn: 'Burn Scar',
  },

  ja: {
    // 耳
    ear_cat: '猫',
    ear_fox: 'きつね',
    ear_wolf: 'オオカミ',
    ear_bear: 'くま',
    ear_mouse: 'ねずみ',
    ear_hamster: 'ハムスター',
    ear_dog: '犬',
    ear_deer1: '鹿 1',
    ear_deer2: '鹿 2 (角)',
    ear_rabbit: 'うさぎ',
    ear_lop_rabbit: 'ロップイヤー',
    ear_axolotl: 'ウーパールーパー',
    ear_raccoon: 'たぬき',
    ear_otter: 'カワウソ',
    ear_lion: 'ライオン',
    ear_none: '耳なし',

    // しっぽ (10種)
    tail_round: 'まるいしっぽ',
    tail_long: '長いしっぽ',
    tail_stubby: 'ずんぐりしっぽ',
    tail_fluffy: 'もふもふしっぽ',
    tail_hamster: 'ハムスターのしっぽ',
    tail_mouse: 'ネズミのしっぽ',
    tail_lion: 'ライオンのしっぽ',
    tail_raccoon: 'アライグマのしっぽ',
    tail_mermaid: '人魚のしっぽ',
    tail_none: 'しっぽなし',

    // 翼 (3種)
    wing_none: '翼なし',
    wing_angel: '天使の翼',
    wing_devil: '悪魔の翼',

    // 目
    eye_angry: '怒り',
    eye_default: '基本',
    eye_sad: 'たれ目',
    eye_half: '半開き',
    eye_sparkle: 'キラキラ',
    eye_wink_tight: 'ウインク',
    eye_closed_down: '閉じ目',
    eye_happy_up: '笑顔',
    eye_flat_line: '一文字',

    // ハイライト (瞳の光)
    hl_double: 'きらきら',
    hl_circle: '丸',
    hl_sparkle: '星・十字',
    hl_heart: 'ハート',

    // まつげ
    eyelash_none: 'なし',
    eyelash_top: '上まつげ',
    eyelash_bottom: '下まつげ',
    eyelash_both: '上下両方',

    // 眉
    eyebrow_none: 'なし',
    eyebrow_songchung: 'ふさふさ',
    eyebrow_short_arch: '短いアーチ',
    eyebrow_round: '丸いアーチ',
    eyebrow_angry: '怒り',
    eyebrow_sad: '下がり眉',

    // 口
    mouth_line_t: '一文字口',
    mouth_cat_w: '猫口',
    mouth_pout_v: 'への字口',
    mouth_smile_u: 'にっこり口',
    mouth_nose_only: '鼻のみ',
    mouth_open_d: '開いた口',
    mouth_beak: '鳥のくちばし',

    // チーク
    blush_comic_circle: '円形',
    blush_comic_circle_slash: '円形+斜線',
    blush_slash_only: '斜線',
    blush_soft_oval: 'ぼかし',
    blush_none: 'なし',

    // 顔の装飾
    face_none: 'なし',
    face_beard: 'ヒゲ',
    face_whiskers: 'ヒゲ',
    face_shadow: '影',
    face_sweat: '冷や汗',
    face_wrinkle: 'しわ',
    face_shock: '驚き',
    face_anger: '怒り',

    // 模様
    pattern_none: '模様なし',
    pattern_tabby: '額の縞模様',
    pattern_cheek_stripes: '頬の縞模様',
    pattern_spots: 'ぶち模様',
    pattern_mask_raccoon: 'アイマスク模様',
    pattern_muzzle: 'マズルポイント',
    pattern_two_tone: '額ツートン',

    // リボン
    ribbon_none: 'リボンなし',
    ribbon_ear_left: '左耳リボン',
    ribbon_ear_right: '右耳リボン',
    ribbon_double_ears: '両耳ミニリボン',
    ribbon_head_top: '頭頂部リボン',
    ribbon_neck_bow: '首元蝶ネクタイ',
    ribbon_chest_big_bow: '胸元ビッグリボン',

    // 追加小物
    acc_none: 'なし',
    acc_sprout: '頭の若葉',
    acc_crown: 'ミニ王冠',
    acc_beret: 'ベレー帽',
    acc_star_pin: '星のヘアピン',
    acc_glasses: '丸メガネ',
    acc_square_glasses: 'スクエアメガネ',
    acc_eyepatch_left: '左眼帯',
    acc_eyepatch_right: '右眼帯',
    acc_pirate_patch_left: '左黒眼帯',
    acc_pirate_patch_right: '右黒眼帯',
    acc_bandaid_nose: '鼻の絆創膏',
    acc_bandaid_left_cheek: '左頬の絆創膏',
    acc_bandaid_right_cheek: '右頬の絆創膏',
    acc_dressing_nose: '鼻ドレッシング',
    acc_dressing_left_cheek: '左頬ドレッシング',
    acc_dressing_right_cheek: '右頬ドレッシング',
    acc_halo: 'ヘイロー',
    acc_devil_horns: '悪魔の角',
    acc_monocle: 'モノクル',

    // モーション
    dance_idle: '待機モーション',
    dance_bounce: 'バウンスリズム',
    dance_happy_dance: '両手ダンス',
    dance_tail_wag: 'しっぽフリフリ',
    dance_jump_spin: 'ジャンプ＆ターン',
    dance_step_dance: 'ステップダンス',

    // ポリゴン
    poly_very_low: 'ローポリ',
    poly_low: '標準ポリ',
    poly_medium: 'ハイポリ',

    // 傷跡
    scar_slash: '一文字傷',
    scar_stitch: '縫い目傷',
    scar_cross: '十字傷',
    scar_double_slash: '二本線傷',
    scar_burn: '火傷痕',
  },

  zh: {
    // 耳朵
    ear_cat: '猫咪',
    ear_fox: '狐狸',
    ear_wolf: '狼',
    ear_bear: '小熊',
    ear_mouse: '老鼠',
    ear_hamster: '仓鼠',
    ear_dog: '小狗',
    ear_deer1: '鹿 1',
    ear_deer2: '鹿 2 (角)',
    ear_rabbit: '兔子',
    ear_lop_rabbit: '垂耳兔',
    ear_axolotl: '六角恐龙',
    ear_raccoon: '浣熊',
    ear_otter: '水獭',
    ear_lion: '狮子',
    ear_none: '无耳朵',

    // 尾巴 (10种)
    tail_round: '圆尾巴',
    tail_long: '长尾巴',
    tail_stubby: '粗短尾巴',
    tail_fluffy: '蓬松尾巴',
    tail_hamster: '仓鼠尾巴',
    tail_mouse: '老鼠尾巴',
    tail_lion: '狮子尾巴',
    tail_raccoon: '浣熊尾巴',
    tail_mermaid: '人鱼尾巴',
    tail_none: '无尾巴',

    // 翅膀 (3种)
    wing_none: '无翅膀',
    wing_angel: '天使之翼',
    wing_devil: '恶魔之翼',

    // 眼睛
    eye_angry: '生气',
    eye_default: '默认',
    eye_sad: '垂眼',
    eye_half: '半睁',
    eye_sparkle: '闪亮',
    eye_wink_tight: '眨眼',
    eye_closed_down: '闭眼',
    eye_happy_up: '微笑',
    eye_flat_line: '一字',

    // 瞳孔高光
    hl_double: '水汪汪',
    hl_circle: '单圆点',
    hl_sparkle: '星光',
    hl_heart: '爱心',

    // 睫毛
    eyelash_none: '无',
    eyelash_top: '上睫毛',
    eyelash_bottom: '下睫毛',
    eyelash_both: '上下全有',

    // 眉毛
    eyebrow_none: '无',
    eyebrow_songchung: '粗眉',
    eyebrow_short_arch: '短拱眉',
    eyebrow_round: '圆拱眉',
    eyebrow_angry: '生气',
    eyebrow_sad: '八字眉',

    // 嘴巴
    mouth_line_t: '一字嘴',
    mouth_cat_w: '猫咪嘴',
    mouth_pout_v: '嘟嘟嘴',
    mouth_smile_u: '微笑嘴',
    mouth_nose_only: '仅鼻子',
    mouth_open_d: '张嘴',
    mouth_beak: '鸟嘴',

    // 腮红
    blush_comic_circle: '圆形',
    blush_comic_circle_slash: '圆形+斜线',
    blush_slash_only: '斜线',
    blush_soft_oval: '模糊',
    blush_none: '无',

    // 面部饰效
    face_none: '无',
    face_beard: '胡须',
    face_whiskers: '胡须',
    face_shadow: '阴影',
    face_sweat: '流汗',
    face_wrinkle: '皱纹',
    face_shock: '震惊',
    face_anger: '怒气',

    // 花纹
    pattern_none: '无花纹',
    pattern_tabby: '额头条纹',
    pattern_cheek_stripes: '脸颊条纹',
    pattern_spots: '斑点花纹',
    pattern_mask_raccoon: '眼罩花纹',
    pattern_muzzle: '口鼻部高光',
    pattern_two_tone: '额头双色',

    // 蝴蝶结
    ribbon_none: '无蝴蝶结',
    ribbon_ear_left: '左头饰蝴蝶结',
    ribbon_ear_right: '右头饰蝴蝶结',
    ribbon_double_ears: '双侧迷你结',
    ribbon_head_top: '头顶蝴蝶结',
    ribbon_neck_bow: '颈部领结',
    ribbon_chest_big_bow: '胸前大蝴蝶结',

    // 额外配件
    acc_none: '无',
    acc_sprout: '头顶豆芽',
    acc_crown: '迷你皇冠',
    acc_beret: '贝雷帽',
    acc_star_pin: '星星发夹',
    acc_glasses: '圆框眼镜',
    acc_square_glasses: '方框眼镜',
    acc_eyepatch_left: '左眼罩',
    acc_eyepatch_right: '右眼罩',
    acc_pirate_patch_left: '左黑色眼罩',
    acc_pirate_patch_right: '右黑色眼罩',
    acc_bandaid_nose: '鼻梁创口贴',
    acc_bandaid_left_cheek: '左脸创口贴',
    acc_bandaid_right_cheek: '右脸创口贴',
    acc_dressing_nose: '鼻梁敷料贴',
    acc_dressing_left_cheek: '左脸敷料贴',
    acc_dressing_right_cheek: '右脸敷料贴',
    acc_halo: '光环',
    acc_devil_horns: '恶魔角',
    acc_monocle: '单片眼镜',

    // 动作
    dance_idle: '默认待机',
    dance_bounce: '律动弹跳',
    dance_happy_dance: '欢快双臂舞',
    dance_tail_wag: '摇尾萌舞',
    dance_jump_spin: '跳跃旋转',
    dance_step_dance: '漫步踏步',

    // 多边形
    poly_very_low: '低多边形',
    poly_low: '标准多边形',
    poly_medium: '高多边形',

    // 伤痕
    scar_slash: '一字伤',
    scar_stitch: '缝合伤',
    scar_cross: '十字伤',
    scar_double_slash: '双条伤',
    scar_burn: '烧伤疤痕',
  },
};

export const UI_STRINGS = {
  ko: {
    brand_title: '10공방',
    btn_import: '파일 불러오기',
    btn_import_short: '불러오기',
    btn_import_title: '사이트에서 저장한 캐릭터 파일(.json, .zip, .glb) 불러오기',
    btn_export_json: '프로젝트 저장',
    btn_export_json_short: '저장',
    btn_export_json_title: '현재 캐릭터 커스텀 데이터(.json) 저장',
    btn_undo: '되돌리기',
    btn_undo_title: '되돌리기 Ctrl+Z',
    btn_redo: '다시 실행',
    btn_redo_title: '다시 실행 Ctrl+Y',
    btn_studio: '스튜디오 모드',
    btn_studio_short: '스튜디오',
    btn_studio_title: '다중 캐릭터 배치 및 모션 촬영 스튜디오 모드',
    btn_random: '랜덤 조합',
    btn_random_short: '랜덤',
    btn_reset: '초기화',

    vp_front: '정면',
    vp_motion_toggle: '모션 전환',
    vp_capture: '캡처',
    vp_hint: '드래그: 회전 · 휠: 확대/축소 · 클릭: 탄성 반응 · 파일 드롭: 불러오기',
    busy_processing: '처리 중…',
    busy_export_mmd: 'MMD 모델 데이터 생성 중…',
    busy_export_glb: 'GLB 3D 모델 파일 생성 중…',

    studio_badge_text: '스튜디오 모드 (1명)',
    studio_badge_exit: '단일 모드로 전환',

    media_result_title: '녹화 완료',
    media_result_hint: '모바일에서는 이미지를 길게 꾹 눌러 [사진에 저장]하시거나 아래 버튼을 누르세요.',
    media_result_share: '공유 / 사진에 저장',
    media_result_download: '다운로드',

    export_pmx_title: 'MMD 모델 다운로드 (.pmx)',
    export_pmx_desc: '표준 본 · 다리 IK · 텍스처 · 재불러오기 지원 ZIP',
    export_glb_title: '범용 3D 다운로드 (.glb)',
    export_glb_desc: 'Blender · Unity 호환 및 사이트 재불러오기 지원',

    char_name_label: '캐릭터 이름',
    char_name_placeholder: '이름 입력 (예: 복실이 — 저장 파일명 및 스튜디오에 반영)',

    // 카테고리 탭 (스크린샷 1번 그대로)
    tab_ears_tail: '귀 · 꼬리 · 날개',
    tab_features: '눈 · 입',
    tab_colors: '색상 · 무늬',
    tab_accessories: '홍조 · 점 · 장식',
    tab_body: '체형 · 윤곽선',
    tab_motion_export: '모션 · 녹화',
    tab_studio: '스튜디오',

    // 탭 1
    sec_ear_shape: '귀 모양',
    sec_ear_shape_desc: '동물별 귀 실루엣 선택',
    sec_tail_shape: '꼬리 모양',
    sec_tail_shape_desc: '다양한 동물 및 환상종 꼬리 실루엣 선택',
    sec_wing_shape: '날개 모양',
    sec_wing_shape_desc: '등 뒤에 달리는 날개 실루엣 선택',
    label_tail_tip_patch: '꼬리 끝 / 줄무늬 포인트 색상 활성화',
    label_mane_color: '사자 갈기 색상',

    // 탭 2
    sec_eye_shape: '눈 모양',
    sec_eye_shape_desc: '기본 타원 · 진지 · 순둥 · 반감은 · 반짝이 등',
    sec_eye_highlight: '안광',
    sec_eye_highlight_desc: '초롱초롱한 동공 반사광',
    label_eye_highlight_size: '안광 크기',
    sec_eyelash: '속눈썹 옵션',
    sec_eyelash_desc: '위 속눈썹 · 아래 속눈썹 조합',
    sec_eyebrow: '눈썹',
    label_eyebrow_color: '눈썹 색상',
    label_eyebrow_scale: '눈썹 크기',
    label_eyebrow_pos: '눈썹 위치',
    label_eyebrow_spacing: '눈썹 간격',
    sec_mouth: '입 모양',
    sec_mouth_desc: '코와 연결된 입 라인 선택',
    sec_beak_settings: '새 부리 3D 상세 설정',
    sec_beak_color: '새 부리 색상',
    label_beak_color: '부리 색상',
    label_beak_follow_body: '몸 색상과 동일하게',
    label_beak_size: '부리 크기',
    label_beak_pos_y: '부리 상하 위치',

    // 탭 3
    sec_body_color: '몸 기본 색상',
    sec_ear_color: '귀 색상',
    label_inner_ear: '귀 안쪽',
    label_outer_ear: '귀 바탕',
    label_ear_custom: '귀 바탕 색상 따로 지정',
    sec_arm_color: '팔 색상',
    label_arm_custom: '팔 색상 따로 지정',
    sec_eye_color: '눈 & 코/입 색상',
    label_eye: '눈',
    label_nose_mouth: '코/입',
    sec_odd_eye: '오드아이',
    label_left: '왼쪽',
    label_right: '오른쪽',
    sec_pattern: '얼굴 무늬 & 부위별 색상',
    label_belly_patch: '몸통 배 부분 색상 구분',
    label_antler_color: '사슴 뿔 색상',

    // 탭 4
    sec_face_deco: '얼굴 꾸밈',
    sec_blush: '홍조 이펙트',
    label_blush_scale: '홍조 크기',
    label_blush_opacity: '홍조 농도',
    sec_mole: '점',
    btn_add_mole: '점 추가',
    btn_tear_mole: '눈물점',
    btn_mouth_mole: '입가점',
    empty_moles: '현재 추가된 점이 없습니다. 상단 점 추가 버튼을 눌러 원하는 개수만큼 추가하세요.',
    sec_scar: '흉터',
    sec_scar_color: '흉터 색상',
    empty_scars: '현재 추가된 흉터가 없습니다. 상단 흉터 버튼을 눌러 원하는 위치와 모양으로 추가하세요.',
    sec_ahoge: '머리카락 더듬이',
    sec_ahoge_color: '더듬이 색상',
    label_ahoge_match_body: '몸 색상과 일치',
    btn_add_ahoge: '더듬이 추가',
    btn_add_ahoge_twin: '양갈래 더듬이',
    btn_add_ahoge_thin: '가는 더듬이',
    empty_ahoges: '현재 추가된 더듬이가 없습니다. 상단 더듬이 추가 버튼을 눌러 원하는 모양으로 추가하세요.',
    label_rotation: '회전 각도',
    sec_ribbon: '리본 장식',
    tag_multi_select: '복수 선택 가능',
    label_ribbon_scale: '리본 크기',
    sec_extra_acc: '추가 소품',
    sec_extra_acc_desc: '안대 · 밴드 · 안경 · 모자 등을 동시에 착용할 수 있습니다',
    label_beret_color: '베레모 색상',
    label_star_pin_color: '별 머리핀 색상',
    label_glasses_color: '동그란 안경 색상',
    label_square_glasses_color: '사각 안경 색상',
    label_crown_color: '미니 왕관 색상',
    label_devil_horns_color: '악마 뿔 색상',
    label_monocle_color: '모노클 색상',

    // 탭 5
    sec_poly_outline: '폴리곤 셰이딩 & 외곽선',
    label_low_poly_flat: '각진 폴리곤 면 표시',
    label_outline_show: '외곽선 표시',
    label_outline_thick: '외곽선 두께',
    sec_body_proportions: '체형 비율 조절',
    label_head_scale: '머리 크기',
    label_body_chubby: '몸통 폭',
    label_leg_length: '다리 길이',

    // 탭 6
    sec_motion_builtin: '기본 내장 모션',
    sec_motion_builtin_desc: '단일 캐릭터 및 스튜디오 공통 모션에 적용',
    label_dance_speed: '재생 속도',
    sec_motion_external: '외부 모션 파일 적용 (.vmd / .fbx)',
    sec_motion_external_desc: 'MMD 모션(.vmd) 및 Mixamo/휴머노이드 모션(.fbx) 모두 지원',
    dropzone_prompt: '클릭하거나 .vmd 또는 .fbx 모션 파일을 드롭하세요',
    dropzone_sub: 'MMD 표준 본(.vmd)과 Mixamo/Humanoid 본(.fbx)을 자동 리타게팅하여 재생합니다.',
    sec_record_custom: '배경 & 맞춤 녹화 (GIF / WebM)',
    sec_record_custom_desc: '원하는 시간 · 포맷 · 배경 색상으로 모션 촬영',
    label_record_format: '저장 포맷',
    format_gif: 'GIF 움짤 (.gif)',
    format_webm: 'WebM 영상 (.webm)',
    label_record_time: '녹화 시간 (초)',
    unit_seconds: '초',
    label_bg_mode: '배경 설정',
    bg_solid: '단색 배경 (선택 색상)',
    bg_transparent: '투명 배경 (배경 없음)',
    bg_grid: '기본 모눈 그리드',
    label_bg_solid_color: '배경 단색 색상',
    label_shadow_disk: '바닥 원판 그림자 표시',
    btn_record_gif: '4.0초 GIF 녹화 (.gif)',
    btn_record_webm: '4.0초 WebM 녹화 (.webm)',
    info_reload_title: '파일 재불러오기 및 외부 3D 툴 안내',
    info_reload_desc1: '사이트 내 다시 불러오기: 상단 파일 불러오기 또는 스튜디오 탭에서 이 사이트로 만든 .json, .glb, .zip(MMD) 파일을 언제든 다시 불러올 수 있습니다.',
    info_reload_desc2: 'MMD (.pmx): 다운로드한 ZIP의 character.pmx와 texture.png를 같은 폴더에 두고 MikuMikuDance에 불러오세요.',

    // 탭 7
    sec_studio_title: '스튜디오 다중 캐릭터 무대',
    unit_actors: '명',
    sec_studio_desc: '제작한 캐릭터 파일을 1개 이상 불러와 개별 또는 단체 모션으로 촬영할 수 있습니다',
    label_studio_active: '스튜디오 모드 활성',
    studio_inactive_notice: '현재 단일 캐릭터 편집 모드입니다. 스튜디오 모드 활성을 켜면 무대 배치 위치·각도·크기 및 캐릭터별 모션을 조정할 수 있습니다.',
    btn_add_current_actor: '현재 에디터 캐릭터 무대 추가',
    btn_add_file_actor: '파일에서 캐릭터 불러와 추가 (.json / .glb / .zip)',
    label_formations: '빠른 대형 정렬 · 동기화',
    formation_line: '일렬 배치',
    formation_v: 'V자 대형',
    formation_circle: '원형 대형',
    formation_sync: '모션 동시 시작',
    sec_studio_actors: '무대 출연 캐릭터 목록',
    sec_studio_actors_desc: '스튜디오 모드가 활성화된 상태에서만 이름·개별 모션·배치 슬라이더를 조정할 수 있습니다',
    sec_studio_quick_record: '스튜디오 단체 촬영 바로가기',
    sec_studio_quick_record_desc: '현재 무대 구도 그대로 움짤(.gif) / 영상(.webm) 녹화',
    btn_studio_record: '현재 스튜디오 무대 4.0초 녹화 (.gif)',
    btn_studio_go_motion: '모션 · 배경 · 녹화 시간 상세 설정',

    // 공통 컨트롤
    btn_clear_all: '전체 삭제',
    label_mirror: '좌우 대칭',
    btn_delete: '삭제',
    label_pos_x: '가로 위치 (X)',
    label_pos_y: '세로 위치 (Y)',
    label_pos_z: '앞뒤 위치 (Z)',
    label_face_deco_x: '좌우 위치',
    label_face_deco_y: '상하 위치',
    label_face_deco_scale: '크기',
    label_control: '조절',
    label_size: '크기',
    label_mole_size: '점 크기',
    label_scar_size: '흉터 크기',
    label_ahoge_size: '더듬이 크기',
    label_ahoge_thickness: '더듬이 두께',
    label_ahoge_curve: '휘어짐 정도',
    label_angle: '기울기 각도',
    label_scale: '크기',
    shock_desc: '눈 모양에 맞춰 자동으로 눈동자 안쪽에 흰색 영역이 생성됩니다.',
  },

  en: {
    brand_title: '10 Studio',
    btn_import: 'Import File',
    btn_import_short: 'Import',
    btn_import_title: 'Load character files (.json, .zip, .glb) created on this site',
    btn_export_json: 'Save Project',
    btn_export_json_short: 'Save',
    btn_export_json_title: 'Save current character custom data (.json)',
    btn_undo: 'Undo',
    btn_undo_title: 'Undo Ctrl+Z',
    btn_redo: 'Redo',
    btn_redo_title: 'Redo Ctrl+Y',
    btn_studio: 'Studio Mode',
    btn_studio_short: 'Studio',
    btn_studio_title: 'Stage multi-character positioning and recording studio mode',
    btn_random: 'Randomize',
    btn_random_short: 'Random',
    btn_reset: 'Reset',

    vp_front: 'Front',
    vp_motion_toggle: 'Motion',
    vp_capture: 'Capture',
    vp_hint: 'Drag: Rotate · Scroll: Zoom · Click: Poke · Drop: Load File',
    busy_processing: 'Processing…',
    busy_export_mmd: 'Generating MMD model package…',
    busy_export_glb: 'Generating GLB 3D model file…',

    studio_badge_text: 'Studio Mode (1 actor)',
    studio_badge_exit: 'Switch to Single Mode',

    media_result_title: 'Recording Finished',
    media_result_hint: 'On mobile, long-press the image to save or click below.',
    media_result_share: 'Share / Save to Photos',
    media_result_download: 'Download',

    export_pmx_title: 'Download MMD Model (.pmx)',
    export_pmx_desc: 'Standard bones · Leg IK · Textures · Reloadable ZIP package',
    export_glb_title: 'Download Universal 3D (.glb)',
    export_glb_desc: 'Blender · Unity compatible and reloadable in editor',

    char_name_label: 'Character Name',
    char_name_placeholder: 'Enter name (e.g. Fluffy — used for filenames and studio)',

    // Tabs
    tab_ears_tail: 'Ears · Tail · Wings',
    tab_features: 'Eyes · Mouth',
    tab_colors: 'Colors · Patterns',
    tab_accessories: 'Blush · Moles · Deco',
    tab_body: 'Body · Outline',
    tab_motion_export: 'Motion · Record',
    tab_studio: 'Studio',

    // Tab 1
    sec_ear_shape: 'Ear Shape',
    sec_ear_shape_desc: 'Select animal ear silhouette',
    sec_tail_shape: 'Tail Shape',
    sec_tail_shape_desc: 'Select tail silhouette for various animals & creatures',
    sec_wing_shape: 'Wing Shape',
    sec_wing_shape_desc: 'Select wing silhouette attached to back',
    label_tail_tip_patch: 'Enable tail tip / stripe accent color',
    label_mane_color: 'Lion Mane Color',

    // Tab 2
    sec_eye_shape: 'Eye Shape',
    sec_eye_shape_desc: 'Default oval · Serious · Gentle · Half-closed · Sparkle etc.',
    sec_eye_highlight: 'Eye Highlights',
    sec_eye_highlight_desc: 'Anime catchlights & reflections',
    label_eye_highlight_size: 'Highlight Size',
    sec_eyelash: 'Eyelashes',
    sec_eyelash_desc: 'Top and bottom eyelash combinations',
    sec_eyebrow: 'Eyebrows',
    label_eyebrow_color: 'Eyebrow Color',
    label_eyebrow_scale: 'Eyebrow Size',
    label_eyebrow_pos: 'Eyebrow Position',
    label_eyebrow_spacing: 'Eyebrow Spacing',
    sec_mouth: 'Mouth Shape',
    sec_mouth_desc: 'Select mouth line connected to nose',
    sec_beak_settings: 'Bird Beak 3D Settings',
    sec_beak_color: 'Bird Beak Color',
    label_beak_color: 'Beak Color',
    label_beak_follow_body: 'Match Body Color',
    label_beak_size: 'Beak Size',
    label_beak_pos_y: 'Beak Vertical Position',

    // Tab 3
    sec_body_color: 'Body Base Color',
    sec_ear_color: 'Ear Colors',
    label_inner_ear: 'Inner Ear',
    label_outer_ear: 'Outer Ear',
    label_ear_custom: 'Customize outer ear color separately',
    sec_arm_color: 'Arm Color',
    label_arm_custom: 'Customize arm color separately',
    sec_eye_color: 'Eye & Nose/Mouth Colors',
    label_eye: 'Eyes',
    label_nose_mouth: 'Nose/Mouth',
    sec_odd_eye: 'Heterochromia',
    label_left: 'Left',
    label_right: 'Right',
    sec_pattern: 'Face Patterns & Part Colors',
    label_belly_patch: 'Belly patch color separation',
    label_antler_color: 'Antler Color',

    // Tab 4
    sec_face_deco: 'Face Decorations',
    sec_blush: 'Blush Effect',
    label_blush_scale: 'Blush Size',
    label_blush_opacity: 'Blush Opacity',
    sec_mole: 'Beauty Marks',
    btn_add_mole: 'Add Mark',
    btn_tear_mole: 'Tear Mark',
    btn_mouth_mole: 'Mouth Mark',
    empty_moles: 'No marks added yet. Click the buttons above to add as many as you want.',
    sec_scar: 'Scars',
    sec_scar_color: 'Scar Color',
    empty_scars: 'No scars added yet. Click the scar buttons above to add the shape and location you want.',
    sec_ahoge: 'Hair Antenna',
    sec_ahoge_color: 'Antenna Color',
    label_ahoge_match_body: 'Match Body Color',
    btn_add_ahoge: 'Add Antenna',
    btn_add_ahoge_twin: 'Twin Antenna',
    btn_add_ahoge_thin: 'Thin Antenna',
    empty_ahoges: 'No hair antennae added yet. Click the buttons above to add antennae.',
    label_rotation: 'Rotation Angle',
    sec_ribbon: 'Ribbon Decorations',
    tag_multi_select: 'Multi-select',
    label_ribbon_scale: 'Ribbon Size',
    sec_extra_acc: 'Extra Accessories',
    sec_extra_acc_desc: 'Wear eyepatches, bandages, glasses, hats etc. simultaneously',
    label_beret_color: 'Beret Color',
    label_star_pin_color: 'Star Hairpin Color',
    label_glasses_color: 'Round Glasses Color',
    label_square_glasses_color: 'Square Glasses Color',
    label_crown_color: 'Mini Crown Color',
    label_devil_horns_color: 'Devil Horns Color',
    label_monocle_color: 'Monocle Color',

    // Tab 5
    sec_poly_outline: 'Polygon Shading & Outline',
    label_low_poly_flat: 'Show faceted polygon faces (Flat)',
    label_outline_show: 'Show Outline',
    label_outline_thick: 'Outline Thickness',
    sec_body_proportions: 'Body Proportions',
    label_head_scale: 'Head Size',
    label_body_chubby: 'Body Width',
    label_leg_length: 'Leg Length',

    // Tab 6
    sec_motion_builtin: 'Built-in Motions',
    sec_motion_builtin_desc: 'Applies to single character and studio common motions',
    label_dance_speed: 'Playback Speed',
    sec_motion_external: 'Apply External Motion (.vmd / .fbx)',
    sec_motion_external_desc: 'Supports both MMD motions (.vmd) and Mixamo/Humanoid motions (.fbx)',
    dropzone_prompt: 'Click or drop .vmd / .fbx motion file here',
    dropzone_sub: 'Automatically retargets and plays MMD standard bones (.vmd) and Mixamo/Humanoid bones (.fbx).',
    sec_record_custom: 'Background & Custom Recording (GIF / WebM)',
    sec_record_custom_desc: 'Capture motion with custom duration, format, and background color',
    label_record_format: 'Format',
    format_gif: 'GIF Animation (.gif)',
    format_webm: 'WebM Video (.webm)',
    label_record_time: 'Recording Duration (sec)',
    unit_seconds: 's',
    label_bg_mode: 'Background Mode',
    bg_solid: 'Solid Color (Selected)',
    bg_transparent: 'Transparent (No background)',
    bg_grid: 'Default Grid',
    label_bg_solid_color: 'Background Solid Color',
    label_shadow_disk: 'Show floor shadow disk',
    btn_record_gif: 'Record 4.0s GIF (.gif)',
    btn_record_webm: 'Record 4.0s WebM (.webm)',
    info_reload_title: 'Reloading Files & External 3D Tools Guide',
    info_reload_desc1: 'Reloading in site: Use Import File or the Studio tab to reload any .json, .glb, or .zip(MMD) file previously created here.',
    info_reload_desc2: 'MMD (.pmx): Place character.pmx and texture.png from the ZIP in the same folder and open in MikuMikuDance.',

    // Tab 7
    sec_studio_title: 'Studio Multi-Character Stage',
    unit_actors: 'actors',
    sec_studio_desc: 'Load one or more characters to record individual or group motions',
    label_studio_active: 'Activate Studio Mode',
    studio_inactive_notice: 'Currently in single character editing mode. Turn on Activate Studio Mode to position actors and configure choreography.',
    btn_add_current_actor: 'Add Current Editor Character to Stage',
    btn_add_file_actor: 'Load & Add Character from File (.json / .glb / .zip)',
    label_formations: 'Quick Formations & Sync',
    formation_line: 'Line Up',
    formation_v: 'V-Formation',
    formation_circle: 'Circle Formation',
    formation_sync: 'Sync Motion',
    sec_studio_actors: 'Stage Character List',
    sec_studio_actors_desc: 'Adjust names, custom motions, and stage placement sliders only while Studio Mode is active',
    sec_studio_quick_record: 'Studio Group Recording',
    sec_studio_quick_record_desc: 'Record stage choreography into GIF (.gif) or video (.webm)',
    btn_studio_record: 'Record Current Studio Stage 4.0s (.gif)',
    btn_studio_go_motion: 'Configure Motion, Background & Duration',

    // Common
    btn_clear_all: 'Clear All',
    label_mirror: 'Mirror (Both Sides)',
    btn_delete: 'Delete',
    label_pos_x: 'Horizontal Pos (X)',
    label_pos_y: 'Vertical Pos (Y)',
    label_pos_z: 'Depth Pos (Z)',
    label_face_deco_x: 'Horizontal Pos',
    label_face_deco_y: 'Vertical Pos',
    label_face_deco_scale: 'Size',
    label_control: 'Control',
    label_size: 'Size',
    label_mole_size: 'Mark Size',
    label_scar_size: 'Scar Size',
    label_ahoge_size: 'Antenna Size',
    label_ahoge_thickness: 'Antenna Thickness',
    label_ahoge_curve: 'Curvature',
    label_angle: 'Angle',
    label_scale: 'Scale',
    shock_desc: 'White highlight area is automatically created inside eyes to match eye shape.',
  },

  ja: {
    brand_title: '10工房',
    btn_import: 'ファイル読込',
    btn_import_short: '読込',
    btn_import_title: 'このサイトで保存したキャラクターファイル(.json, .zip, .glb)を読み込みます',
    btn_export_json: 'プロジェクト保存',
    btn_export_json_short: '保存',
    btn_export_json_title: '現在のキャラクター設定データ(.json)を保存',
    btn_undo: '元に戻す',
    btn_undo_title: '元に戻す Ctrl+Z',
    btn_redo: 'やり直し',
    btn_redo_title: 'やり直し Ctrl+Y',
    btn_studio: 'スタジオモード',
    btn_studio_short: 'スタジオ',
    btn_studio_title: '複数キャラクター配置・モーション撮影スタジオモード',
    btn_random: 'ランダム',
    btn_random_short: 'ランダム',
    btn_reset: 'リセット',

    vp_front: '正面',
    vp_motion_toggle: 'モーション',
    vp_capture: 'キャプチャ',
    vp_hint: 'ドラッグ: 回転 · ホイール: 拡大/縮小 · クリック: 反応 · ドロップ: ファイル読込',
    busy_processing: '処理中…',
    busy_export_mmd: 'MMDモデルパッケージ生成中…',
    busy_export_glb: 'GLB 3Dモデルファイル生成中…',

    studio_badge_text: 'スタジオモード (1人)',
    studio_badge_exit: '単体モードへ戻る',

    media_result_title: '録画完了',
    media_result_hint: 'スマートフォンでは画像を長押しして「写真に保存」するか、下のボタンを押してください。',
    media_result_share: '共有 / 写真に保存',
    media_result_download: 'ダウンロード',

    export_pmx_title: 'MMDモデルダウンロード (.pmx)',
    export_pmx_desc: '標準ボーン · 足IK · テクスチャ · 再読込対応 ZIP',
    export_glb_title: '汎用3Dダウンロード (.glb)',
    export_glb_desc: 'Blender · Unity互換、サイトでの再読込対応',

    char_name_label: 'キャラクター名',
    char_name_placeholder: '名前を入力 (例: ポチ — ファイル名やスタジオに反映)',

    // タブ
    tab_ears_tail: '耳・しっぽ・翼',
    tab_features: '目・口',
    tab_colors: 'カラー・模様',
    tab_accessories: 'チーク・ホクロ・装飾',
    tab_body: '体型・輪郭線',
    tab_motion_export: 'モーション・録画',
    tab_studio: 'スタジオ',

    // タブ 1
    sec_ear_shape: '耳の形',
    sec_ear_shape_desc: '動物ごとの耳のシルエットを選択',
    sec_tail_shape: 'しっぽの形',
    sec_tail_shape_desc: '様々な動物や幻獣のしっぽシルエットを選択',
    sec_wing_shape: '翼の形',
    sec_wing_shape_desc: '背中に付ける翼のシルエットを選択',
    label_tail_tip_patch: 'しっぽの先端・縞模様ポイントカラーを有効化',
    label_mane_color: 'ライオンのたてがみの色',

    // タブ 2
    sec_eye_shape: '目の形',
    sec_eye_shape_desc: '基本オーバル・真面目・タレ目・ジト目・キラキラ等',
    sec_eye_highlight: 'ハイライト',
    sec_eye_highlight_desc: 'キラキラした瞳の光反射',
    label_eye_highlight_size: 'ハイライトサイズ',
    sec_eyelash: 'まつげオプション',
    sec_eyelash_desc: '上まつげ・下まつげの組み合わせ',
    sec_eyebrow: '眉',
    label_eyebrow_color: '眉の色',
    label_eyebrow_scale: '眉のサイズ',
    label_eyebrow_pos: '眉の位置',
    label_eyebrow_spacing: '眉の間隔',
    sec_mouth: '口の形',
    sec_mouth_desc: '鼻とつながる口のラインを選択',
    sec_beak_settings: '鳥のくちばし3D詳細設定',
    sec_beak_color: '鳥のくちばしの色',
    label_beak_color: 'くちばしの色',
    label_beak_follow_body: '体色と一致',
    label_beak_size: 'くちばしのサイズ',
    label_beak_pos_y: 'くちばしの上下位置',

    // タブ 3
    sec_body_color: '体の基本色',
    sec_ear_color: '耳の色',
    label_inner_ear: '耳の内側',
    label_outer_ear: '耳の地色',
    label_ear_custom: '耳の地色を個別に指定',
    sec_arm_color: '腕の色',
    label_arm_custom: '腕の色を個別に指定',
    sec_eye_color: '目・鼻/口の色',
    label_eye: '目',
    label_nose_mouth: '鼻/口',
    sec_odd_eye: 'オッドアイ',
    label_left: '左',
    label_right: '右',
    sec_pattern: '顔の模様・部位別カラー',
    label_belly_patch: 'お腹の色の塗り分け',
    label_antler_color: '鹿の角の色',

    // タブ 4
    sec_face_deco: '顔の装飾',
    sec_blush: 'チークエフェクト',
    label_blush_scale: 'チークサイズ',
    label_blush_opacity: 'チーク濃度',
    sec_mole: 'ホクロ',
    btn_add_mole: 'ホクロ追加',
    btn_tear_mole: '泣きぼくろ',
    btn_mouth_mole: '口元のホクロ',
    empty_moles: '現在追加されたホクロはありません。上のボタンから追加してください。',
    sec_scar: '傷跡',
    sec_scar_color: '傷跡の色',
    empty_scars: '現在追加された傷跡はありません。上のボタンから好きな形と位置で追加してください。',
    sec_ahoge: 'アホ毛（触角）',
    sec_ahoge_color: 'アホ毛カラー',
    label_ahoge_match_body: '体色と一致',
    btn_add_ahoge: 'アホ毛追加',
    btn_add_ahoge_twin: '二股アホ毛',
    btn_add_ahoge_thin: '細いアホ毛',
    empty_ahoges: '現在追加されたアホ毛はありません。上のボタンから追加してください。',
    label_rotation: '回転角度',
    sec_ribbon: 'リボン装飾',
    tag_multi_select: '複数選択可',
    label_ribbon_scale: 'リボンサイズ',
    sec_extra_acc: '追加小物',
    sec_extra_acc_desc: '眼帯・絆創膏・メガネ・帽子などを同時に着用できます',
    label_beret_color: 'ベレー帽の色',
    label_star_pin_color: '星のヘアピンの色',
    label_glasses_color: '丸メガネの色',
    label_square_glasses_color: 'スクエアメガネの色',
    label_crown_color: 'ミニ王冠の色',
    label_devil_horns_color: '悪魔の角の色',
    label_monocle_color: 'モノクルの色',

    // タブ 5
    sec_poly_outline: 'ポリゴンシェーディング＆輪郭線',
    label_low_poly_flat: '角ばったポリゴン面を表示 (フラット)',
    label_outline_show: '輪郭線を表示',
    label_outline_thick: '輪郭線の太さ',
    sec_body_proportions: '体型比率の調整',
    label_head_scale: '頭のサイズ',
    label_body_chubby: '体の太さ',
    label_leg_length: '脚の長さ',

    // タブ 6
    sec_motion_builtin: 'プリセットモーション',
    sec_motion_builtin_desc: '単体キャラクターおよびスタジオ共通モーションに適用',
    label_dance_speed: '再生速度',
    sec_motion_external: '外部モーションファイルの適用 (.vmd / .fbx)',
    sec_motion_external_desc: 'MMDモーション(.vmd)およびMixamo/ヒューマノイド(.fbx)に対応',
    dropzone_prompt: 'クリックまたは .vmd / .fbx モーションファイルをドロップ',
    dropzone_sub: 'MMD標準ボーン(.vmd)とMixamo/Humanoidボーン(.fbx)を自動リターゲティングして再生します。',
    sec_record_custom: '背景＆カスタム録画 (GIF / WebM)',
    sec_record_custom_desc: 'お好みの時間・フォーマット・背景色でモーションを撮影',
    label_record_format: '保存形式',
    format_gif: 'GIFアニメ (.gif)',
    format_webm: 'WebM動画 (.webm)',
    label_record_time: '録画時間 (秒)',
    unit_seconds: '秒',
    label_bg_mode: '背景設定',
    bg_solid: '単色背景 (選択色)',
    bg_transparent: '透明背景 (背景なし)',
    bg_grid: '標準グリッド',
    label_bg_solid_color: '背景単色カラー',
    label_shadow_disk: '床の円形シャドウを表示',
    btn_record_gif: '4.0秒 GIF録画 (.gif)',
    btn_record_webm: '4.0秒 WebM録画 (.webm)',
    info_reload_title: 'ファイル再読込・外部3Dツール案内',
    info_reload_desc1: 'サイト内再読込: 上部「ファイル読込」または「スタジオ」タブから、作成済みの .json、.glb、.zip(MMD)をいつでも再読み込みできます。',
    info_reload_desc2: 'MMD (.pmx): ZIP内の character.pmx と texture.png を同じフォルダに置き、MikuMikuDanceで開いてください。',

    // タブ 7
    sec_studio_title: 'スタジオ多体キャラクターステージ',
    unit_actors: '人',
    sec_studio_desc: '作成したキャラクターを1体以上読み込み、単独または集合ダンス撮影ができます',
    label_studio_active: 'スタジオモード有効化',
    studio_inactive_notice: '現在は単体編集モードです。「スタジオモード有効化」をオンにすると位置や個別モーションを調整できます。',
    btn_add_current_actor: '現在編集中のキャラクターをステージに追加',
    btn_add_file_actor: 'ファイルからキャラクターを読み込んで追加 (.json / .glb / .zip)',
    label_formations: '整列・同期ショートカット',
    formation_line: '一列配置',
    formation_v: 'V字隊形',
    formation_circle: '円形隊形',
    formation_sync: 'モーション同時再生',
    sec_studio_actors: 'ステージ出演キャラクター一覧',
    sec_studio_actors_desc: 'スタジオモードが有効な時のみ、名前や配置・個別モーションを調整できます',
    sec_studio_quick_record: 'スタジオ全体撮影',
    sec_studio_quick_record_desc: '現在の舞台構成のまま GIF(.gif) / 動画(.webm) で録画',
    btn_studio_record: '現在のステージ 4.0秒 録画 (.gif)',
    btn_studio_go_motion: 'モーション・背景・録画時間の詳細設定',

    // 共通
    btn_clear_all: '全削除',
    label_mirror: '左右対称',
    btn_delete: '削除',
    label_pos_x: '横位置 (X)',
    label_pos_y: '縦位置 (Y)',
    label_pos_z: '前後位置 (Z)',
    label_face_deco_x: '左右位置',
    label_face_deco_y: '上下位置',
    label_face_deco_scale: 'サイズ',
    label_control: '調節',
    label_size: 'サイズ',
    label_mole_size: 'ホクロサイズ',
    label_scar_size: '傷跡サイズ',
    label_ahoge_size: 'アホ毛サイズ',
    label_ahoge_thickness: 'アホ毛太さ',
    label_ahoge_curve: '曲がり具合',
    label_angle: '傾き角度',
    label_scale: 'サイズ',
    shock_desc: '目の形に合わせて、自動的に瞳孔内に白の驚きハイライトが生成されます。',
  },

  zh: {
    brand_title: '10工坊',
    btn_import: '导入文件',
    btn_import_short: '导入',
    btn_import_title: '读取在本网站保存的角色文件 (.json, .zip, .glb)',
    btn_export_json: '保存项目',
    btn_export_json_short: '保存',
    btn_export_json_title: '保存当前角色的自定义数据 (.json)',
    btn_undo: '撤销',
    btn_undo_title: '撤销 Ctrl+Z',
    btn_redo: '重做',
    btn_redo_title: '重做 Ctrl+Y',
    btn_studio: '摄影棚模式',
    btn_studio_short: '摄影棚',
    btn_studio_title: '多角色排布与动作拍摄摄影棚模式',
    btn_random: '随机生成',
    btn_random_short: '随机',
    btn_reset: '重置',

    vp_front: '正视图',
    vp_motion_toggle: '动作切换',
    vp_capture: '截图',
    vp_hint: '拖拽: 旋转 · 滚轮: 缩放 · 点击: 弹性响应 · 拖入文件: 导入',
    busy_processing: '处理中…',
    busy_export_mmd: '正在生成MMD模型包…',
    busy_export_glb: '正在生成GLB 3D模型文件…',

    studio_badge_text: '摄影棚模式 (1人)',
    studio_badge_exit: '切换至单人模式',

    media_result_title: '录制完成',
    media_result_hint: '手机端可长按图片选择【存储图像】，或点击下方按钮下载。',
    media_result_share: '分享 / 保存到相册',
    media_result_download: '下载',

    export_pmx_title: '下载MMD模型 (.pmx)',
    export_pmx_desc: '标准骨骼 · 腿部IK · 贴图 · 支持重新导入的ZIP包',
    export_glb_title: '下载通用3D模型 (.glb)',
    export_glb_desc: '兼容Blender与Unity，支持在网站重新导入',

    char_name_label: '角色名称',
    char_name_placeholder: '输入名称 (例如: 毛球 — 用于保存文件名和摄影棚)',

    // 标签页
    tab_ears_tail: '耳朵 · 尾巴 · 翅膀',
    tab_features: '眼睛 · 嘴巴',
    tab_colors: '颜色 · 花纹',
    tab_accessories: '腮红 · 痣 · 装饰',
    tab_body: '体型 · 轮廓线',
    tab_motion_export: '动作 · 录制',
    tab_studio: '摄影棚',

    // 标签 1
    sec_ear_shape: '耳朵形状',
    sec_ear_shape_desc: '选择不同动物的耳朵轮廓',
    sec_tail_shape: '尾巴形状',
    sec_tail_shape_desc: '选择各种动物与奇幻生物的尾巴造型',
    sec_wing_shape: '翅膀形状',
    sec_wing_shape_desc: '选择背部翅膀轮廓',
    label_tail_tip_patch: '启用尾巴末端 / 条纹高亮颜色',
    label_mane_color: '狮子鬃毛颜色',

    // 标签 2
    sec_eye_shape: '眼睛形状',
    sec_eye_shape_desc: '默认椭圆 · 严肃 · 垂眼 · 半睁眼 · 闪亮等',
    sec_eye_highlight: '眼神光',
    sec_eye_highlight_desc: '水灵灵的瞳孔反光',
    label_eye_highlight_size: '高光大小',
    sec_eyelash: '睫毛选项',
    sec_eyelash_desc: '上睫毛与下睫毛组合',
    sec_eyebrow: '眉毛',
    label_eyebrow_color: '眉毛颜色',
    label_eyebrow_scale: '眉毛大小',
    label_eyebrow_pos: '眉毛位置',
    label_eyebrow_spacing: '眉毛间距',
    sec_mouth: '嘴巴形状',
    sec_mouth_desc: '选择与鼻子相连的嘴巴线条',
    sec_beak_settings: '鸟嘴3D详细设置',
    sec_beak_color: '鸟嘴颜色',
    label_beak_color: '鸟嘴颜色',
    label_beak_follow_body: '与身体颜色一致',
    label_beak_size: '鸟嘴大小',
    label_beak_pos_y: '鸟嘴上下位置',

    // 标签 3
    sec_body_color: '身体基础颜色',
    sec_ear_color: '耳朵颜色',
    label_inner_ear: '耳内侧',
    label_outer_ear: '耳朵底色',
    label_ear_custom: '单独指定耳朵底色',
    sec_arm_color: '手臂颜色',
    label_arm_custom: '单独指定手臂颜色',
    sec_eye_color: '眼睛与鼻/嘴颜色',
    label_eye: '眼睛',
    label_nose_mouth: '鼻/嘴',
    sec_odd_eye: '异色瞳',
    label_left: '左',
    label_right: '右',
    sec_pattern: '面部花纹与部位颜色',
    label_belly_patch: '身体腹部颜色区分',
    label_antler_color: '鹿角颜色',

    // 标签 4
    sec_face_deco: '面部饰效',
    sec_blush: '腮红特效',
    label_blush_scale: '腮红大小',
    label_blush_opacity: '腮红浓度',
    sec_mole: '痣',
    btn_add_mole: '添加痣',
    btn_tear_mole: '泪痣',
    btn_mouth_mole: '嘴角痣',
    empty_moles: '当前未添加痣。点击上方按钮可按需添加任意数量。',
    sec_scar: '伤痕',
    sec_scar_color: '伤痕颜色',
    empty_scars: '当前未添加伤痕。点击上方伤痕按钮可在指定位置添加形状。',
    sec_ahoge: '呆毛（发丝触角）',
    sec_ahoge_color: '呆毛颜色',
    label_ahoge_match_body: '与身体同色',
    btn_add_ahoge: '添加呆毛',
    btn_add_ahoge_twin: '双呆毛',
    btn_add_ahoge_thin: '细发丝',
    empty_ahoges: '当前未添加呆毛。点击上方按钮可添加任意形状呆毛。',
    label_rotation: '旋转角度',
    sec_ribbon: '蝴蝶结装饰',
    tag_multi_select: '可多选',
    label_ribbon_scale: '蝴蝶结大小',
    sec_extra_acc: '额外配饰',
    sec_extra_acc_desc: '可同时佩戴眼罩、创口贴、眼镜、帽子等配饰',
    label_beret_color: '贝雷帽颜色',
    label_star_pin_color: '星星发夹颜色',
    label_glasses_color: '圆框眼镜颜色',
    label_square_glasses_color: '方框眼镜颜色',
    label_crown_color: '迷你皇冠颜色',
    label_devil_horns_color: '恶魔角颜色',
    label_monocle_color: '单片眼镜颜色',

    // 标签 5
    sec_poly_outline: '多边形着色与轮廓线',
    label_low_poly_flat: '显示多边形棱角面 (平面着色)',
    label_outline_show: '显示轮廓线',
    label_outline_thick: '轮廓线粗细',
    sec_body_proportions: '体型比例调节',
    label_head_scale: '头部大小',
    label_body_chubby: '身体胖瘦',
    label_leg_length: '腿长',

    // 标签 6
    sec_motion_builtin: '内置动作预设',
    sec_motion_builtin_desc: '适用于单人角色及摄影棚通用动作',
    label_dance_speed: '播放速度',
    sec_motion_external: '应用外部动作文件 (.vmd / .fbx)',
    sec_motion_external_desc: '支持MMD动作(.vmd)及Mixamo/人形动作(.fbx)',
    dropzone_prompt: '点击或拖放 .vmd / .fbx 动作文件至此',
    dropzone_sub: '自动重定向并播放MMD标准骨骼(.vmd)和Mixamo/Humanoid骨骼(.fbx)。',
    sec_record_custom: '背景与自定义录制 (GIF / WebM)',
    sec_record_custom_desc: '自定义时长、格式和背景色录制角色动作',
    label_record_format: '保存格式',
    format_gif: 'GIF动图 (.gif)',
    format_webm: 'WebM视频 (.webm)',
    label_record_time: '录制时长 (秒)',
    unit_seconds: '秒',
    label_bg_mode: '背景设置',
    bg_solid: '单色背景 (所选颜色)',
    bg_transparent: '透明背景 (无背景)',
    bg_grid: '默认网格',
    label_bg_solid_color: '背景纯色',
    label_shadow_disk: '显示地面圆形阴影',
    btn_record_gif: '录制 4.0秒 GIF (.gif)',
    btn_record_webm: '录制 4.0秒 WebM (.webm)',
    info_reload_title: '文件重新导入及外部3D软件指南',
    info_reload_desc1: '网站内重新导入: 可通过顶部【导入文件】或【摄影棚】随时重新导入由此生成的 .json、.glb 或 .zip(MMD) 文件。',
    info_reload_desc2: 'MMD (.pmx): 将解压后的 character.pmx 和 texture.png 置于同一目录下，即可在 MikuMikuDance 中载入。',

    // 标签 7
    sec_studio_title: '摄影棚多角色舞台',
    unit_actors: '人',
    sec_studio_desc: '导入1个或多个已制作的角色，进行个人或集体动作摄影',
    label_studio_active: '启用摄影棚模式',
    studio_inactive_notice: '当前为单人角色编辑模式。开启“启用摄影棚模式”即可排布角色位置并分别设置动作。',
    btn_add_current_actor: '添加当前编辑器角色至舞台',
    btn_add_file_actor: '从文件导入并添加角色 (.json / .glb / .zip)',
    label_formations: '快速队形与同步',
    formation_line: '一字排开',
    formation_v: 'V字队形',
    formation_circle: '圆形队形',
    formation_sync: '动作同步开始',
    sec_studio_actors: '舞台登场角色列表',
    sec_studio_actors_desc: '仅在摄影棚模式激活时可调整名称、单独动作及位置滑块',
    sec_studio_quick_record: '摄影棚集体录制',
    sec_studio_quick_record_desc: '直接以当前舞台视角录制 GIF(.gif) 或视频(.webm)',
    btn_studio_record: '录制当前舞台 4.0秒 (.gif)',
    btn_studio_go_motion: '详细设置动作、背景与录制时长',

    // 通用
    btn_clear_all: '全部删除',
    label_mirror: '左右对称',
    btn_delete: '删除',
    label_pos_x: '水平位置 (X)',
    label_pos_y: '垂直位置 (Y)',
    label_pos_z: '前后位置 (Z)',
    label_face_deco_x: '左右位置',
    label_face_deco_y: '上下位置',
    label_face_deco_scale: '大小',
    label_control: '调节',
    label_size: '大小',
    label_mole_size: '痣大小',
    label_scar_size: '伤痕大小',
    label_ahoge_size: '呆毛大小',
    label_ahoge_thickness: '呆毛粗细',
    label_ahoge_curve: '弯曲程度',
    label_angle: '倾斜角度',
    label_scale: '大小',
    shock_desc: '将根据眼睛形状自动在瞳孔内部生成白色惊吓高光。',
  },
};

let currentLang = 'ko';

export function getLanguage() {
  return currentLang;
}

export function t(key) {
  const dict = UI_STRINGS[currentLang] || UI_STRINGS.ko;
  if (dict && dict[key]) return dict[key];
  const partDict = PART_NAMES[currentLang] || PART_NAMES.ko;
  if (partDict && partDict[key]) return partDict[key];
  return UI_STRINGS.ko?.[key] || PART_NAMES.ko?.[key] || '';
}

export function getPartName(categoryPrefix, id, fallback) {
  const langDict = PART_NAMES[currentLang] || PART_NAMES.ko;
  const key = `${categoryPrefix}_${id}`;
  if (langDict[key]) return langDict[key];
  const koDict = PART_NAMES.ko;
  if (koDict[key]) return koDict[key];
  return fallback || id;
}

export function resolvePartName(id, fallback) {
  const prefixes = ['ear', 'tail', 'eye', 'hl', 'eyelash', 'eyebrow', 'mouth', 'blush', 'face', 'pattern', 'ribbon', 'acc', 'dance', 'poly', 'scar'];
  const langDict = PART_NAMES[currentLang] || PART_NAMES.ko;
  for (const p of prefixes) {
    const k = `${p}_${id}`;
    if (langDict[k]) return langDict[k];
  }
  return fallback || id;
}

let onLanguageChangeCallbacks = [];

export function onLanguageChange(fn) {
  if (typeof fn === 'function') {
    onLanguageChangeCallbacks.push(fn);
  }
}

export function setLanguage(lang) {
  if (!['ko', 'en', 'ja', 'zh'].includes(lang)) {
    lang = 'ko';
  }
  currentLang = lang;
  try {
    localStorage.setItem('ten_maker_lang', lang);
  } catch (e) {
    // ignore
  }

  document.documentElement.lang = lang;

  // 1) data-i18n 텍스트 갱신
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const txt = t(key);
    if (txt) el.textContent = txt;
  });

  // 2) data-i18n-title 갱신
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    const txt = t(key);
    if (txt) el.title = txt;
  });

  // 3) data-i18n-placeholder 갱신
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const txt = t(key);
    if (txt) el.placeholder = txt;
  });

  // 4) selectLanguage 드롭다운 값 동기화
  const langSelect = document.getElementById('selectLanguage');
  if (langSelect && langSelect.value !== lang) {
    langSelect.value = lang;
  }

  // 5) 등록된 콜백 실행 (버튼 라벨, 카드 썸네일, 칩 등 동적 요소 재반영)
  onLanguageChangeCallbacks.forEach((cb) => {
    try {
      cb(lang);
    } catch (e) {
      console.error(e);
    }
  });
}

export function initI18n() {
  let savedLang = 'ko';
  try {
    savedLang = localStorage.getItem('ten_maker_lang') || navigator.language?.slice(0, 2) || 'ko';
  } catch (e) {
    savedLang = 'ko';
  }
  if (!['ko', 'en', 'ja', 'zh'].includes(savedLang)) {
    savedLang = 'ko';
  }
  setLanguage(savedLang);
}
