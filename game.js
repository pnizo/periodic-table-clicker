// ===== Game State =====
const gameState = {
  energy: 0n,
  particles: {
    electrons: 0n,
    protons: 0n,
    neutrons: 0n
  },
  generators: {
    electrons: 0,
    protons: 0,
    neutrons: 0
  },
  elements: {}, // 値はBigInt
  elementGenerators: {},
  totalClicks: 0,
  startTime: Date.now(),
  lastUpdate: Date.now(),
  buyMultiplier: 1, // 1, 10, 100, 1000, 1000000, or 'max'
  totalEnergyEarned: 0n, // 総獲得エネルギー量（リセットしても引き継がれる）
  multiplier: 1 // 倍率（リセット時に総獲得エネルギー量のlogにセット）- Numberのまま
};

// Persistent state (survives reset)
let persistentState = {
  totalEnergyEarned: 0n,
  totalClicks: 0,
  totalPlayTime: 0, // 累計プレイ時間（ミリ秒）
  achievements: {} // 解除済み実績 { achievementId: timestamp }
};

// ===== Constants =====
const GENERATOR_CONFIG = {
  electrons: {
    baseCost: 1,
    baseRate: 0.1667,
    costMultiplier: 1.15
  },
  protons: {
    baseCost: 1840,
    baseRate: 0.1667,
    costMultiplier: 1.15
  },
  neutrons: {
    baseCost: 1840,
    baseRate: 0.1667,
    costMultiplier: 1.15
  }
};

const PARTICLE_ENERGY_RATE = 0.1; // Energy per particle per second
const PARTICLE_COUNT_ENERGY_RATE = 1; // Energy from particle count (count / 60 per second)
const AVOGADRO = 602214076000000000000000n; // アボガドロ数 (1mol) as BigInt

// ===== BigInt Helper Functions =====
// BigIntとNumberの比較・演算用ヘルパー
function toBigInt(val) {
  if (typeof val === 'bigint') return val;
  if (typeof val === 'number') return BigInt(Math.floor(val));
  if (typeof val === 'string') return BigInt(val);
  return 0n;
}

function toNumber(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'bigint') return Number(val);
  return 0;
}

function bigIntMax(a, b) {
  return a > b ? a : b;
}

function bigIntMin(a, b) {
  return a < b ? a : b;
}

// ===== Achievement Definitions =====
// 周期ごとの元素リスト
const PERIOD_ELEMENTS = {
  1: ['H', 'He'],
  2: ['Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne'],
  3: ['Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar'],
  4: ['K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr'],
  5: ['Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe'],
  6: ['Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg', 'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn'],
  7: ['Fr', 'Ra', 'Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og']
};

// 族ごとの元素リスト
const GROUP_ELEMENTS = {
  1: ['H', 'Li', 'Na', 'K', 'Rb', 'Cs', 'Fr'],
  2: ['Be', 'Mg', 'Ca', 'Sr', 'Ba', 'Ra'],
  3: ['Sc', 'Y', 'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr'],
  4: ['Ti', 'Zr', 'Hf', 'Rf'],
  5: ['V', 'Nb', 'Ta', 'Db'],
  6: ['Cr', 'Mo', 'W', 'Sg'],
  7: ['Mn', 'Tc', 'Re', 'Bh'],
  8: ['Fe', 'Ru', 'Os', 'Hs'],
  9: ['Co', 'Rh', 'Ir', 'Mt'],
  10: ['Ni', 'Pd', 'Pt', 'Ds'],
  11: ['Cu', 'Ag', 'Au', 'Rg'],
  12: ['Zn', 'Cd', 'Hg', 'Cn'],
  13: ['B', 'Al', 'Ga', 'In', 'Tl', 'Nh'],
  14: ['C', 'Si', 'Ge', 'Sn', 'Pb', 'Fl'],
  15: ['N', 'P', 'As', 'Sb', 'Bi', 'Mc'],
  16: ['O', 'S', 'Se', 'Te', 'Po', 'Lv'],
  17: ['F', 'Cl', 'Br', 'I', 'At', 'Ts'],
  18: ['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn', 'Og']
};

// ランタノイド・アクチノイド
const LANTHANIDES = ['La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu'];
const ACTINIDES = ['Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr'];

// 全元素シンボルリスト
const ALL_ELEMENT_SYMBOLS = ['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg', 'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'];

// ===== Element Data =====
// ===== Element Data & Generation =====
const ELEMENT_DATA_RAW = "1,H,Hydrogen,Nonmetal|2,He,Helium,Noble Gas|3,Li,Lithium,Alkali Metal|4,Be,Beryllium,Alkaline Earth Metal|5,B,Boron,Metalloid|6,C,Carbon,Nonmetal|7,N,Nitrogen,Nonmetal|8,O,Oxygen,Nonmetal|9,F,Fluorine,Halogen|10,Ne,Neon,Noble Gas|11,Na,Sodium,Alkali Metal|12,Mg,Magnesium,Alkaline Earth Metal|13,Al,Aluminum,Post-transition Metal|14,Si,Silicon,Metalloid|15,P,Phosphorus,Nonmetal|16,S,Sulfur,Nonmetal|17,Cl,Chlorine,Halogen|18,Ar,Argon,Noble Gas|19,K,Potassium,Alkali Metal|20,Ca,Calcium,Alkaline Earth Metal|21,Sc,Scandium,Transition Metal|22,Ti,Titanium,Transition Metal|23,V,Vanadium,Transition Metal|24,Cr,Chromium,Transition Metal|25,Mn,Manganese,Transition Metal|26,Fe,Iron,Transition Metal|27,Co,Cobalt,Transition Metal|28,Ni,Nickel,Transition Metal|29,Cu,Copper,Transition Metal|30,Zn,Zinc,Transition Metal|31,Ga,Gallium,Post-transition Metal|32,Ge,Germanium,Metalloid|33,As,Arsenic,Metalloid|34,Se,Selenium,Nonmetal|35,Br,Bromine,Halogen|36,Kr,Krypton,Noble Gas|37,Rb,Rubidium,Alkali Metal|38,Sr,Strontium,Alkaline Earth Metal|39,Y,Yttrium,Transition Metal|40,Zr,Zirconium,Transition Metal|41,Nb,Niobium,Transition Metal|42,Mo,Molybdenum,Transition Metal|43,Tc,Technetium,Transition Metal|44,Ru,Ruthenium,Transition Metal|45,Rh,Rhodium,Transition Metal|46,Pd,Palladium,Transition Metal|47,Ag,Silver,Transition Metal|48,Cd,Cadmium,Transition Metal|49,In,Indium,Post-transition Metal|50,Sn,Tin,Post-transition Metal|51,Sb,Antimony,Metalloid|52,Te,Tellurium,Metalloid|53,I,Iodine,Halogen|54,Xe,Xenon,Noble Gas|55,Cs,Cesium,Alkali Metal|56,Ba,Barium,Alkaline Earth Metal|57,La,Lanthanum,Lanthanide|58,Ce,Cerium,Lanthanide|59,Pr,Praseodymium,Lanthanide|60,Nd,Neodymium,Lanthanide|61,Pm,Promethium,Lanthanide|62,Sm,Samarium,Lanthanide|63,Eu,Europium,Lanthanide|64,Gd,Gadolinium,Lanthanide|65,Tb,Terbium,Lanthanide|66,Dy,Dysprosium,Lanthanide|67,Ho,Holmium,Lanthanide|68,Er,Erbium,Lanthanide|69,Tm,Thulium,Lanthanide|70,Yb,Ytterbium,Lanthanide|71,Lu,Lutetium,Lanthanide|72,Hf,Hafnium,Transition Metal|73,Ta,Tantalum,Transition Metal|74,W,Tungsten,Transition Metal|75,Re,Rhenium,Transition Metal|76,Os,Osmium,Transition Metal|77,Ir,Iridium,Transition Metal|78,Pt,Platinum,Transition Metal|79,Au,Gold,Transition Metal|80,Hg,Mercury,Transition Metal|81,Tl,Thallium,Post-transition Metal|82,Pb,Lead,Post-transition Metal|83,Bi,Bismuth,Post-transition Metal|84,Po,Polonium,Post-transition Metal|85,At,Astatine,Metalloid|86,Rn,Radon,Noble Gas|87,Fr,Francium,Alkali Metal|88,Ra,Radium,Alkaline Earth Metal|89,Ac,Actinium,Actinide|90,Th,Thorium,Actinide|91,Pa,Protactinium,Actinide|92,U,Uranium,Actinide|93,Np,Neptunium,Actinide|94,Pu,Plutonium,Actinide|95,Am,Americium,Actinide|96,Cm,Curium,Actinide|97,Bk,Berkelium,Actinide|98,Cf,Californium,Actinide|99,Es,Einsteinium,Actinide|100,Fm,Fermium,Actinide|101,Md,Mendelevium,Actinide|102,No,Nobelium,Actinide|103,Lr,Lawrencium,Actinide|104,Rf,Rutherfordium,Transition Metal|105,Db,Dubnium,Transition Metal|106,Sg,Seaborgium,Transition Metal|107,Bh,Bohrium,Transition Metal|108,Hs,Hassium,Transition Metal|109,Mt,Meitnerium,Transition Metal|110,Ds,Darmstadtium,Transition Metal|111,Rg,Roentgenium,Transition Metal|112,Cn,Copernicium,Transition Metal|113,Nh,Nihonium,Post-transition Metal|114,Fl,Flerovium,Post-transition Metal|115,Mc,Moscovium,Post-transition Metal|116,Lv,Livermorium,Post-transition Metal|117,Ts,Tennessine,Halogen|118,Og,Oganesson,Noble Gas";

const CATEGORY_COLORS = {
  "Alkali Metal": "#87CEEB", // Cyan
  "Alkaline Earth Metal": "#FF6B6B", // Red
  "Transition Metal": "#DDA0DD", // Purple
  "Post-transition Metal": "#98FB98", // Green
  "Metalloid": "#F0E68C", // Yellow
  "Nonmetal": "#87CEEB", // Blue (same as Alkali for H/C/N/O)
  "Halogen": "#87CEEB", // Blue
  "Noble Gas": "#FFB6C1", // Pink/Red
  "Lanthanide": "#E6E6FA", // Light Purple
  "Actinide": "#FFDAB9" // Orange/Peach
};

// ===== Custom Recipe Table =====
// 元素ごとのカスタムレシピ定義（核融合反応に基づく）
// neutrons: 必要な中性子数, energy: 必要なエネルギー, elements: 必要な元素（核融合反応の組み合わせ）

// エネルギー消費係数（レシピのエネルギー値にこの係数を掛ける）
const ENERGY_COST_MULTIPLIER = 10;

const CUSTOM_RECIPES = {
  // 水素 - 基本元素（電子1個、陽子1個を消費）
  H: { electrons: 1, protons: 1, neutrons: 0, energy: 50, elements: {} },
  // ヘリウム - pp鎖反応: 4H → He
  He: { neutrons: 2, energy: 60, elements: { H: 4 } },
  // リチウム - ビッグバン元素合成 / 宇宙線核破砕
  Li: { neutrons: 4, energy: 72, elements: { He: 2 } },
  // ベリリウム - 宇宙線核破砕 / He + He → Be (不安定)
  Be: { neutrons: 5, energy: 86, elements: { He: 2, H: 1 } },
  // ホウ素 - 宇宙線核破砕
  B: { neutrons: 6, energy: 103, elements: { Be: 1, H: 2 } },
  // 炭素 - トリプルアルファ反応: 3He → C
  C: { neutrons: 6, energy: 124, elements: { He: 3 } },
  // 窒素 - CNOサイクル: C + H → N
  N: { neutrons: 7, energy: 149, elements: { C: 1, H: 1 } },
  // 酸素 - ヘリウム燃焼: C + He → O
  O: { neutrons: 8, energy: 179, elements: { C: 1, He: 1 } },
  // フッ素 - ネオン燃焼副産物: O + H → F (稀)
  F: { neutrons: 10, energy: 214, elements: { O: 1, H: 2 } },
  // ネオン - 炭素燃焼: C + C → Ne + He
  Ne: { neutrons: 10, energy: 257, elements: { C: 2 } },
  // ナトリウム - 炭素燃焼: C + C → Na + H
  Na: { neutrons: 12, energy: 309, elements: { C: 2 } },
  // マグネシウム - 炭素燃焼 / ネオン燃焼: Ne + He → Mg
  Mg: { neutrons: 12, energy: 371, elements: { Ne: 1, He: 1 } },
  // アルミニウム - 炭素燃焼副産物
  Al: { neutrons: 14, energy: 445, elements: { Mg: 1, H: 1 } },
  // ケイ素 - 酸素燃焼: O + O → Si + He
  Si: { neutrons: 14, energy: 534, elements: { O: 2 } },
  // リン - 酸素燃焼副産物
  P: { neutrons: 16, energy: 641, elements: { Si: 1, H: 1 } },
  // 硫黄 - 酸素燃焼: O + O → S
  S: { neutrons: 16, energy: 770, elements: { O: 2 } },
  // 塩素 - s過程
  Cl: { neutrons: 18, energy: 924, elements: { S: 1, H: 1 } },
  // アルゴン - 酸素燃焼 / ケイ素燃焼
  Ar: { neutrons: 22, energy: 1109, elements: { S: 1, He: 1 } },
  // カリウム - 酸素燃焼
  K: { neutrons: 20, energy: 1331, elements: { Ar: 1, H: 1 } },
  // カルシウム - 酸素燃焼 / ケイ素燃焼: Si + O → Ca
  Ca: { neutrons: 20, energy: 1597, elements: { Si: 1, O: 1 } },
  // スカンジウム - ケイ素燃焼
  Sc: { neutrons: 24, energy: 1916, elements: { Ca: 1, H: 1 } },
  // チタン - ケイ素燃焼: Ca + He → Ti
  Ti: { neutrons: 26, energy: 2300, elements: { Ca: 1, He: 1 } },
  // バナジウム - ケイ素燃焼
  V: { neutrons: 28, energy: 2760, elements: { Ti: 1, H: 1 } },
  // クロム - ケイ素燃焼: Ti + He → Cr
  Cr: { neutrons: 28, energy: 3312, elements: { Ti: 1, He: 1 } },
  // マンガン - ケイ素燃焼
  Mn: { neutrons: 30, energy: 3974, elements: { Cr: 1, H: 1 } },
  // 鉄 - ケイ素燃焼の最終産物: Si + Si → Ni → Fe (崩壊)
  Fe: { neutrons: 30, energy: 4769, elements: { Si: 2 } },
  // コバルト - 超新星 / r過程
  Co: { neutrons: 32, energy: 5723, elements: { Fe: 1, H: 1 } },
  // ニッケル - ケイ素燃焼: Si + Si → Ni
  Ni: { neutrons: 30, energy: 6868, elements: { Fe: 1, He: 1 } },
  // 銅 - s過程: Ni + n → Cu
  Cu: { neutrons: 34, energy: 8242, elements: { Ni: 1, H: 1 } },
  // 亜鉛 - s過程
  Zn: { neutrons: 34, energy: 9890, elements: { Cu: 1, H: 1 } },
  // ガリウム - s過程
  Ga: { neutrons: 38, energy: 11868, elements: { Zn: 1, H: 1 } },
  // ゲルマニウム - s過程
  Ge: { neutrons: 42, energy: 14242, elements: { Ga: 1, H: 1 } },
  // ヒ素 - s過程
  As: { neutrons: 42, energy: 17091, elements: { Ge: 1, H: 1 } },
  // セレン - s過程
  Se: { neutrons: 46, energy: 20509, elements: { As: 1, H: 1 } },
  // 臭素 - s過程
  Br: { neutrons: 44, energy: 24611, elements: { Se: 1, H: 1 } },
  // クリプトン - s過程
  Kr: { neutrons: 48, energy: 29533, elements: { Br: 1, H: 1 } },
  // ルビジウム - s過程
  Rb: { neutrons: 48, energy: 35440, elements: { Kr: 1, H: 1 } },
  // ストロンチウム - s過程
  Sr: { neutrons: 50, energy: 42528, elements: { Rb: 1, H: 1 } },
  // イットリウム - s過程
  Y: { neutrons: 50, energy: 51033, elements: { Sr: 1, H: 1 } },
  // ジルコニウム - s過程
  Zr: { neutrons: 52, energy: 61240, elements: { Y: 1, H: 1 } },
  // ニオブ - s過程
  Nb: { neutrons: 52, energy: 73488, elements: { Zr: 1, H: 1 } },
  // モリブデン - s過程
  Mo: { neutrons: 56, energy: 88186, elements: { Nb: 1, H: 1 } },
  // テクネチウム - s過程 (不安定)
  Tc: { neutrons: 56, energy: 105823, elements: { Mo: 1, H: 1 } },
  // ルテニウム - s過程
  Ru: { neutrons: 58, energy: 126988, elements: { Tc: 1, H: 1 } },
  // ロジウム - s過程
  Rh: { neutrons: 58, energy: 152385, elements: { Ru: 1, H: 1 } },
  // パラジウム - s過程
  Pd: { neutrons: 60, energy: 182863, elements: { Rh: 1, H: 1 } },
  // 銀 - s過程 / r過程
  Ag: { neutrons: 60, energy: 219435, elements: { Pd: 1, H: 1 } },
  // カドミウム - s過程
  Cd: { neutrons: 66, energy: 263322, elements: { Ag: 1, H: 1 } },
  // インジウム - s過程
  In: { neutrons: 66, energy: 315987, elements: { Cd: 1, H: 1 } },
  // スズ - s過程
  Sn: { neutrons: 70, energy: 379184, elements: { In: 1, H: 1 } },
  // アンチモン - s過程
  Sb: { neutrons: 70, energy: 455021, elements: { Sn: 1, H: 1 } },
  // テルル - s過程
  Te: { neutrons: 78, energy: 546026, elements: { Sb: 1, H: 1 } },
  // ヨウ素 - s過程 / r過程
  I: { neutrons: 74, energy: 655231, elements: { Te: 1, H: 1 } },
  // キセノン - s過程 / r過程
  Xe: { neutrons: 78, energy: 786277, elements: { I: 1, H: 1 } },
  // セシウム - s過程 / r過程
  Cs: { neutrons: 78, energy: 943533, elements: { Xe: 1, H: 1 } },
  // バリウム - s過程 (主要生成元素)
  Ba: { neutrons: 82, energy: 1132240, elements: { Cs: 1, H: 1 } },
  // ランタン - s過程
  La: { neutrons: 82, energy: 1358688, elements: { Ba: 1, H: 1 } },
  // セリウム - s過程
  Ce: { neutrons: 82, energy: 1630425, elements: { La: 1, H: 1 } },
  // プラセオジム - s過程
  Pr: { neutrons: 82, energy: 1956510, elements: { Ce: 1, H: 1 } },
  // ネオジム - s過程
  Nd: { neutrons: 84, energy: 2347813, elements: { Pr: 1, H: 1 } },
  // プロメチウム - r過程 (不安定)
  Pm: { neutrons: 86, energy: 2817375, elements: { Nd: 1, H: 1 } },
  // サマリウム - s過程 / r過程
  Sm: { neutrons: 90, energy: 3380850, elements: { Pm: 1, H: 1 } },
  // ユウロピウム - r過程
  Eu: { neutrons: 90, energy: 4057021, elements: { Sm: 1, H: 1 } },
  // ガドリニウム - s過程 / r過程
  Gd: { neutrons: 94, energy: 4868425, elements: { Eu: 1, H: 1 } },
  // テルビウム - s過程
  Tb: { neutrons: 94, energy: 5842110, elements: { Gd: 1, H: 1 } },
  // ジスプロシウム - s過程
  Dy: { neutrons: 98, energy: 7010532, elements: { Tb: 1, H: 1 } },
  // ホルミウム - s過程
  Ho: { neutrons: 98, energy: 8412638, elements: { Dy: 1, H: 1 } },
  // エルビウム - s過程
  Er: { neutrons: 98, energy: 10095166, elements: { Ho: 1, H: 1 } },
  // ツリウム - s過程
  Tm: { neutrons: 100, energy: 12114199, elements: { Er: 1, H: 1 } },
  // イッテルビウム - s過程
  Yb: { neutrons: 104, energy: 14537039, elements: { Tm: 1, H: 1 } },
  // ルテチウム - s過程
  Lu: { neutrons: 104, energy: 17444447, elements: { Yb: 1, H: 1 } },
  // ハフニウム - s過程
  Hf: { neutrons: 108, energy: 20933337, elements: { Lu: 1, H: 1 } },
  // タンタル - s過程
  Ta: { neutrons: 108, energy: 25120004, elements: { Hf: 1, H: 1 } },
  // タングステン - s過程
  W: { neutrons: 110, energy: 30144005, elements: { Ta: 1, H: 1 } },
  // レニウム - s過程
  Re: { neutrons: 112, energy: 36172807, elements: { W: 1, H: 1 } },
  // オスミウム - s過程 / r過程
  Os: { neutrons: 116, energy: 43407368, elements: { Re: 1, H: 1 } },
  // イリジウム - r過程
  Ir: { neutrons: 116, energy: 52088842, elements: { Os: 1, H: 1 } },
  // 白金 - s過程 / r過程
  Pt: { neutrons: 118, energy: 62506610, elements: { Ir: 1, H: 1 } },
  // 金 - r過程 (中性子星合体)
  Au: { neutrons: 118, energy: 75007932, elements: { Pt: 1, H: 1 } },
  // 水銀 - s過程
  Hg: { neutrons: 122, energy: 90009519, elements: { Au: 1, H: 1 } },
  // タリウム - s過程
  Tl: { neutrons: 124, energy: 108011423, elements: { Hg: 1, H: 1 } },
  // 鉛 - s過程の終着点
  Pb: { neutrons: 126, energy: 129613707, elements: { Tl: 1, H: 1 } },
  // ビスマス - s過程の終着点
  Bi: { neutrons: 126, energy: 155536449, elements: { Pb: 1, H: 1 } },
  // ポロニウム - r過程 / α崩壊
  Po: { neutrons: 126, energy: 186643739, elements: { Bi: 1, H: 1 } },
  // アスタチン - r過程 (不安定)
  At: { neutrons: 126, energy: 223972486, elements: { Po: 1, H: 1 } },
  // ラドン - r過程 / α崩壊
  Rn: { neutrons: 136, energy: 268766984, elements: { At: 1, H: 1 } },
  // フランシウム - r過程 (不安定)
  Fr: { neutrons: 136, energy: 322520381, elements: { Rn: 1, H: 1 } },
  // ラジウム - r過程 / α崩壊
  Ra: { neutrons: 138, energy: 387024457, elements: { Fr: 1, H: 1 } },
  // アクチニウム - r過程
  Ac: { neutrons: 138, energy: 464429348, elements: { Ra: 1, H: 1 } },
  // トリウム - r過程
  Th: { neutrons: 142, energy: 557315218, elements: { Ac: 1, H: 1 } },
  // プロトアクチニウム - r過程
  Pa: { neutrons: 140, energy: 668778262, elements: { Th: 1, H: 1 } },
  // ウラン - r過程
  U: { neutrons: 146, energy: 802533914, elements: { Pa: 1, H: 1 } },
  // ネプツニウム - 人工元素: U + n
  Np: { neutrons: 144, energy: 963040697, elements: { U: 1, H: 1 } },
  // プルトニウム - 人工元素: U + n
  Pu: { neutrons: 150, energy: 1155648837, elements: { Np: 1, H: 1 } },
  // アメリシウム - 人工元素
  Am: { neutrons: 146, energy: 1386778605, elements: { Pu: 1, H: 1 } },
  // キュリウム - 人工元素: Pu + He
  Cm: { neutrons: 151, energy: 1664134326, elements: { Pu: 1, He: 1 } },
  // バークリウム - 人工元素: Am + He
  Bk: { neutrons: 150, energy: 1996961191, elements: { Am: 1, He: 1 } },
  // カリホルニウム - 人工元素: Cm + He
  Cf: { neutrons: 153, energy: 2396353429, elements: { Cm: 1, He: 1 } },
  // アインスタイニウム - 人工元素
  Es: { neutrons: 154, energy: 2875624115, elements: { Cf: 1, H: 1 } },
  // フェルミウム - 人工元素
  Fm: { neutrons: 157, energy: 3450748938, elements: { Es: 1, H: 1 } },
  // メンデレビウム - 人工元素: Es + He
  Md: { neutrons: 157, energy: 4140898726, elements: { Es: 1, He: 1 } },
  // ノーベリウム - 人工元素: Cm + C
  No: { neutrons: 157, energy: 4969078471, elements: { Cm: 1, C: 1 } },
  // ローレンシウム - 人工元素: Cf + B
  Lr: { neutrons: 159, energy: 5962894165, elements: { Cf: 1, B: 1 } },
  // ラザホージウム - 人工元素: Cf + C
  Rf: { neutrons: 163, energy: 7155472998, elements: { Cf: 1, C: 1 } },
  // ドブニウム - 人工元素: Cf + N
  Db: { neutrons: 163, energy: 8586567598, elements: { Cf: 1, N: 1 } },
  // シーボーギウム - 人工元素: Cf + O
  Sg: { neutrons: 163, energy: 10303881118, elements: { Cf: 1, O: 1 } },
  // ボーリウム - 人工元素: Bk + O
  Bh: { neutrons: 163, energy: 12364657341, elements: { Bk: 1, O: 1 } },
  // ハッシウム - 人工元素: Pb + Fe
  Hs: { neutrons: 169, energy: 14837588810, elements: { Pb: 1, Fe: 1 } },
  // マイトネリウム - 人工元素: Bi + Fe
  Mt: { neutrons: 169, energy: 17805106572, elements: { Bi: 1, Fe: 1 } },
  // ダームスタチウム - 人工元素: Pb + Ni
  Ds: { neutrons: 171, energy: 21366127886, elements: { Pb: 1, Ni: 1 } },
  // レントゲニウム - 人工元素: Bi + Ni
  Rg: { neutrons: 171, energy: 25639353463, elements: { Bi: 1, Ni: 1 } },
  // コペルニシウム - 人工元素: Pb + Zn
  Cn: { neutrons: 173, energy: 30767224156, elements: { Pb: 1, Zn: 1 } },
  // ニホニウム - 人工元素: Bi + Zn
  Nh: { neutrons: 173, energy: 36920668987, elements: { Bi: 1, Zn: 1 } },
  // フレロビウム - 人工元素: Pu + Ca
  Fl: { neutrons: 175, energy: 44304802785, elements: { Pu: 1, Ca: 1 } },
  // モスコビウム - 人工元素: Am + Ca
  Mc: { neutrons: 175, energy: 53165763342, elements: { Am: 1, Ca: 1 } },
  // リバモリウム - 人工元素: Cm + Ca
  Lv: { neutrons: 177, energy: 63798916011, elements: { Cm: 1, Ca: 1 } },
  // テネシン - 人工元素: Bk + Ca
  Ts: { neutrons: 177, energy: 76558699213, elements: { Bk: 1, Ca: 1 } },
  // オガネソン - 人工元素: Cf + Ca
  Og: { neutrons: 176, energy: 91870439056, elements: { Cf: 1, Ca: 1 } }
};

function getElementPosition(atomicNumber) {
  if (atomicNumber === 1) return { row: 1, col: 1 };
  if (atomicNumber === 2) return { row: 1, col: 18 };

  if (atomicNumber >= 3 && atomicNumber <= 4) return { row: 2, col: atomicNumber - 2 };
  if (atomicNumber >= 5 && atomicNumber <= 10) return { row: 2, col: atomicNumber + 8 };

  if (atomicNumber >= 11 && atomicNumber <= 12) return { row: 3, col: atomicNumber - 10 };
  if (atomicNumber >= 13 && atomicNumber <= 18) return { row: 3, col: atomicNumber };

  if (atomicNumber >= 19 && atomicNumber <= 36) return { row: 4, col: atomicNumber - 18 };
  if (atomicNumber >= 37 && atomicNumber <= 54) return { row: 5, col: atomicNumber - 36 };

  if (atomicNumber >= 55 && atomicNumber <= 56) return { row: 6, col: atomicNumber - 54 };
  if (atomicNumber >= 57 && atomicNumber <= 71) return { row: 9, col: atomicNumber - 54 }; // Lanthanides
  if (atomicNumber >= 72 && atomicNumber <= 86) return { row: 6, col: atomicNumber - 68 };

  if (atomicNumber >= 87 && atomicNumber <= 88) return { row: 7, col: atomicNumber - 86 };
  if (atomicNumber >= 89 && atomicNumber <= 103) return { row: 10, col: atomicNumber - 86 }; // Actinides
  if (atomicNumber >= 104 && atomicNumber <= 118) return { row: 7, col: atomicNumber - 100 };

  return { row: 1, col: 1 };
}

function adjustColorBrightness(hex, rowNumber) {
  // 段（row）ごとにRGB各色の数値を下げてグラデーションさせる
  // Row 1: 0減算, Row 2: 15減算, Row 3: 30減算, ... など
  const reductionPerRow = 12; // 1段ごとに減らす値
  const reduction = (rowNumber - 1) * reductionPerRow;

  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);

  r = Math.max(0, r - reduction);
  g = Math.max(0, g - reduction);
  b = Math.max(0, b - reduction);

  const toHex = (n) => n.toString(16).padStart(2, '0');
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

function generateElements() {
  const elements = [];
  const rawList = ELEMENT_DATA_RAW.split('|');

  rawList.forEach(item => {
    const [zStr, symbol, name, category] = item.split(',');
    const z = parseInt(zStr);
    const pos = getElementPosition(z);

    // Color logic: Base color + row darkening (RGB値を段ごとに減算)
    const baseColor = CATEGORY_COLORS[category] || "#FFFFFF";
    const color = adjustColorBrightness(baseColor, pos.row);

    // Recipe Generation - カスタムレシピがあれば使用、なければデフォルト計算
    const customRecipe = CUSTOM_RECIPES[symbol];
    
    // デフォルトの計算値
    const defaultNeutrons = Math.floor(z * (1 + (z / 200)));
    const defaultEnergy = z === 1 ? 50 : Math.floor(50 * Math.pow(1.2, z - 1));
    
    // レシピの構築
    let recipe = {
      protons: z,
      electrons: z,
      neutrons: customRecipe?.neutrons ?? defaultNeutrons,
      energy: customRecipe?.energy ?? defaultEnergy
    };
    
    // 必要な元素を追加
    if (customRecipe?.elements) {
      // カスタムレシピで元素が指定されている場合
      for (const [elemSymbol, count] of Object.entries(customRecipe.elements)) {
        recipe[elemSymbol] = count;
      }
    } else if (z > 1) {
      // カスタムレシピがない場合、デフォルトで1つ前の元素を1個必要とする
      const prevElement = elements[z - 2];
      if (prevElement) {
        recipe[prevElement.symbol] = 1;
      }
    }

    elements.push({
      symbol,
      name,
      atomicNumber: z,
      category,
      color,
      row: pos.row,
      col: pos.col,
      recipe
    });
  });

  return elements;
}

// ELEMENTSは初期化時に生成される
let ELEMENTS = [];

// ===== Utility Functions =====
function formatNumber(num) {
  // BigIntの場合はNumberに変換（精度は落ちるが表示用なのでOK）
  const n = typeof num === 'bigint' ? Number(num) : num;
  if (n >= 1e30) return (n / 1e30).toFixed(3) + "Q";
  if (n >= 1e27) return (n / 1e27).toFixed(3) + "R";
  if (n >= 1e24) return (n / 1e24).toFixed(3) + "Y";
  if (n >= 1e21) return (n / 1e21).toFixed(3) + "Z";
  if (n >= 1e18) return (n / 1e18).toFixed(3) + "E";
  if (n >= 1e15) return (n / 1e15).toFixed(3) + "P";
  if (n >= 1e12) return (n / 1e12).toFixed(3) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(3) + "G";
  if (n >= 1e6) return (n / 1e6).toFixed(3) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(3) + "k";
  return Math.floor(n).toLocaleString();
}

// 単位が付くときは小数点第1位まで表示
function formatNumberShort(num) {
  const n = typeof num === 'bigint' ? Number(num) : num;
  if (n >= 1e30) return (n / 1e30).toFixed(1) + "Q";
  if (n >= 1e27) return (n / 1e27).toFixed(1) + "R";
  if (n >= 1e24) return (n / 1e24).toFixed(1) + "Y";
  if (n >= 1e21) return (n / 1e21).toFixed(1) + "Z";
  if (n >= 1e18) return (n / 1e18).toFixed(1) + "E";
  if (n >= 1e15) return (n / 1e15).toFixed(1) + "P";
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "G";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return Math.floor(n).toLocaleString();
}

function formatMultiplier(num) {

  if (num >= 1e18) return (num / 1e18).toFixed(2) + "E";
  if (num >= 1e15) return (num / 1e15).toFixed(2) + "P";
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "G";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "k";
  return num.toFixed(2);
}

function formatDecimal(num) {
  return num.toFixed(1);
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function getGeneratorCost(type) {
  const config = GENERATOR_CONFIG[type];
  const level = gameState.generators[type];
  return Math.floor(config.baseCost * Math.pow(config.costMultiplier, level));
}

function getGeneratorRate(type) {
  const config = GENERATOR_CONFIG[type];
  const level = gameState.generators[type];
  return config.baseRate * level * gameState.multiplier;
}

function calculateMultiplierFromEnergy(totalEnergy) {
  if (totalEnergy <= 1) return 1;
  return Math.max(1, Math.log(totalEnergy));
}

function getRowMultiplier(row) {
  // 最上段(row=1)は×1、以降は10^(row-1)
  // Row 1: ×1, Row 2: ×10, Row 3: ×100, Row 4: ×1000...
  // ランタノイド(row=9)はRow 6扱い、アクチノイド(row=10)はRow 7扱い
  let effectiveRow = row;
  if (row === 9) effectiveRow = 6;  // ランタノイド
  if (row === 10) effectiveRow = 7; // アクチノイド
  return Math.pow(10, effectiveRow - 1);
}

function getElementEnergyValue(element) {
  const rowMultiplier = getRowMultiplier(element.row);
  return element.atomicNumber * 10 * rowMultiplier;
}

// ===== Achievement System =====
function generateAchievements() {
  const achievements = [];
  
  // 元素ごとの実績（保有数1個、1mol）
  ALL_ELEMENT_SYMBOLS.forEach(symbol => {
    achievements.push({
      id: `element_${symbol}_1`,
      name: `Hold 1 unit of ${symbol}`,
      description: `Hold at least 1 unit of ${symbol}`,
      check: () => (gameState.elements[symbol] || 0n) >= 1n
    });
    achievements.push({
      id: `element_${symbol}_mol`,
      name: `Hold 1 mol of ${symbol}`,
      description: `Hold at least 1 mol (6.02×10²³ units) of ${symbol}`,
      check: () => (gameState.elements[symbol] || 0n) >= AVOGADRO
    });
  });
  
  // 周期ごとの実績
  for (let period = 1; period <= 7; period++) {
    const elements = PERIOD_ELEMENTS[period];
    achievements.push({
      id: `period_${period}_1`,
      name: `Complete Period ${period}`,
      description: `Hold at least 1 unit of all elements in Period ${period}`,
      check: () => elements.every(s => (gameState.elements[s] || 0n) >= 1n)
    });
    achievements.push({
      id: `period_${period}_mol`,
      name: `Master Period ${period}`,
      description: `Hold at least 1 mol of all elements in Period ${period}`,
      check: () => elements.every(s => (gameState.elements[s] || 0n) >= AVOGADRO)
    });
  }
  
  // 族ごとの実績
  for (let group = 1; group <= 18; group++) {
    const elements = GROUP_ELEMENTS[group];
    achievements.push({
      id: `group_${group}_1`,
      name: `Complete Group ${group}`,
      description: `Hold at least 1 unit of all elements in Group ${group}`,
      check: () => elements.every(s => (gameState.elements[s] || 0n) >= 1n)
    });
    achievements.push({
      id: `group_${group}_mol`,
      name: `Master Group ${group}`,
      description: `Hold at least 1 mol of all elements in Group ${group}`,
      check: () => elements.every(s => (gameState.elements[s] || 0n) >= AVOGADRO)
    });
  }
  
  // ランタノイド実績
  achievements.push({
    id: 'lanthanides_1',
    name: 'Complete Lanthanides',
    description: 'Hold at least 1 unit of all Lanthanides',
    check: () => LANTHANIDES.every(s => (gameState.elements[s] || 0n) >= 1n)
  });
  achievements.push({
    id: 'lanthanides_mol',
    name: 'Master Lanthanides',
    description: 'Hold at least 1 mol of all Lanthanides',
    check: () => LANTHANIDES.every(s => (gameState.elements[s] || 0n) >= AVOGADRO)
  });
  
  // アクチノイド実績
  achievements.push({
    id: 'actinides_1',
    name: 'Complete Actinides',
    description: 'Hold at least 1 unit of all Actinides',
    check: () => ACTINIDES.every(s => (gameState.elements[s] || 0n) >= 1n)
  });
  achievements.push({
    id: 'actinides_mol',
    name: 'Master Actinides',
    description: 'Hold at least 1 mol of all Actinides',
    check: () => ACTINIDES.every(s => (gameState.elements[s] || 0n) >= AVOGADRO)
  });
  
  // クリック数実績
  const clickMilestones = [
    { id: 'clicks_1k', name: '1,000 Clicks', value: 1e3 },
    { id: 'clicks_1M', name: '1M Clicks', value: 1e6 },
    { id: 'clicks_1G', name: '1G Clicks', value: 1e9 },
    { id: 'clicks_1T', name: '1T Clicks', value: 1e12 },
    { id: 'clicks_1P', name: '1P Clicks', value: 1e15 },
    { id: 'clicks_1E', name: '1E Clicks', value: 1e18 },
  ];
  clickMilestones.forEach(m => {
    achievements.push({
      id: m.id,
      name: m.name,
      description: `Achieve a total of ${m.name} clicks`,
      check: () => gameState.totalClicks >= m.value
    });
  });
  
  // プレイ時間実績
  const timeMilestones = [
    { id: 'time_1min', name: '1 Minute Play', ms: 60 * 1000 },
    { id: 'time_1hour', name: '1 Hour Play', ms: 60 * 60 * 1000 },
    { id: 'time_1day', name: '1 Day Play', ms: 24 * 60 * 60 * 1000 },
    { id: 'time_1week', name: '1 Week Play', ms: 7 * 24 * 60 * 60 * 1000 },
    { id: 'time_1month', name: '1 Month Play', ms: 30 * 24 * 60 * 60 * 1000 },
    { id: 'time_1year', name: '1 Year Play', ms: 365 * 24 * 60 * 60 * 1000 },
    { id: 'time_1century', name: '1 Century Play', ms: 100 * 365 * 24 * 60 * 60 * 1000 },
    { id: 'time_1millennium', name: '1 Millennium Play', ms: 1000 * 365 * 24 * 60 * 60 * 1000 },
  ];
  timeMilestones.forEach(m => {
    achievements.push({
      id: m.id,
      name: m.name,
      description: `Achieve a total of ${m.name} play time`,
      check: () => (Date.now() - gameState.startTime) >= m.ms
    });
  });
  
  // 粒子数実績（電子・陽子・中性子）
  const particleMilestones = [
    { suffix: '1k', name: '1k', value: 1000n },
    { suffix: '1M', name: '1M', value: 1000000n },
    { suffix: '1G', name: '1G', value: 1000000000n },
    { suffix: '1T', name: '1T', value: 1000000000000n },
    { suffix: '1P', name: '1P', value: 1000000000000000n },
    { suffix: '1E', name: '1E', value: 1000000000000000000n },
    { suffix: '1Z', name: '1Z', value: 1000000000000000000000n },
    { suffix: '1Y', name: '1Y', value: 1000000000000000000000000n },
  ];
  
  const particleTypes = [
    { id: 'electrons', name: 'Electrons', key: 'electrons' },
    { id: 'protons', name: 'Protons', key: 'protons' },
    { id: 'neutrons', name: 'Neutrons', key: 'neutrons' },
  ];
  
  particleTypes.forEach(particle => {
    particleMilestones.forEach(m => {
      achievements.push({
        id: `${particle.id}_${m.suffix}`,
        name: `${particle.name} ${m.name}`,
        description: `Hold at least ${m.name} ${particle.name}`,
        check: () => gameState.particles[particle.key] >= m.value
      });
    });
  });
  
  return achievements;
}

let ACHIEVEMENTS = [];

// 実績通知キューイングシステム
const achievementNotificationQueue = [];
let isShowingNotification = false;

function queueAchievementNotification(achievement) {
  achievementNotificationQueue.push(achievement);
  processNotificationQueue();
}

function processNotificationQueue() {
  // 表示中なら何もしない（表示完了後に再度呼ばれる）
  if (isShowingNotification) return;
  
  // キューにエントリがあれば表示開始
  if (achievementNotificationQueue.length > 0) {
    const achievement = achievementNotificationQueue.shift();
    showAchievementNotificationImmediate(achievement);
  }
}

function showAchievementNotificationImmediate(achievement) {
  isShowingNotification = true;
  
  const notification = document.createElement('div');
  notification.className = 'achievement-notification';
  notification.innerHTML = `
    <div class="achievement-icon">🏆</div>
    <div class="achievement-content">
      <div class="achievement-title">Achievement Unlocked!</div>
      <div class="achievement-name">${achievement.name}</div>
    </div>
  `;
  document.body.appendChild(notification);
  
  // 表示アニメーション開始
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // 表示時間後に戻りアニメーション
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
      isShowingNotification = false;
      // 次の通知を処理
      processNotificationQueue();
    }, 300);
  }, 2000);
}

function checkAchievements() {
  let newAchievements = [];
  
  ACHIEVEMENTS.forEach(achievement => {
    if (!persistentState.achievements[achievement.id] && achievement.check()) {
      // 実績取得時の詳細情報を記録
      persistentState.achievements[achievement.id] = {
        timestamp: Date.now(),
        clicks: gameState.totalClicks,
        playTime: Date.now() - gameState.startTime
      };
      newAchievements.push(achievement);
    }
  });
  
  if (newAchievements.length > 0) {
    savePersistentData();
    newAchievements.forEach(a => queueAchievementNotification(a));
  }
  
  return newAchievements;
}

function getAchievementCount() {
  return Object.keys(persistentState.achievements).length;
}

function getTotalAchievementCount() {
  return ACHIEVEMENTS.length;
}

function getAchievementBonus() {
  // 実績1個 = 100% ボーナス（つまり 1 + 実績数）
  return 1 + getAchievementCount();
}

function updateAchievementModal() {
  document.getElementById('achievementModalCount').textContent = `${getAchievementCount()}/${getTotalAchievementCount()}`;
  document.getElementById('achievementModalBonus').textContent = `x${getAchievementBonus()}`;
  renderAchievementList('elements');
  
  // タブをリセット
  document.querySelectorAll('.achievement-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.achievement-tab[data-tab="elements"]').classList.add('active');
}

function renderAchievementList(tab) {
  const container = document.getElementById('achievementListContainer');
  let html = '';
  
  if (tab === 'elements') {
    // 元素ごとの実績（1個保有）
    html += '<div class="achievement-category"><div class="achievement-category-title">Element 1 retained</div>';
    ALL_ELEMENT_SYMBOLS.forEach(symbol => {
      const achievement = ACHIEVEMENTS.find(a => a.id === `element_${symbol}_1`);
      const unlocked = persistentState.achievements[achievement.id];
      html += renderAchievementItem(achievement, unlocked);
    });
    html += '</div>';
    
    // 元素ごとの実績（1mol保有）
    html += '<div class="achievement-category"><div class="achievement-category-title">Element 1mol retained</div>';
    ALL_ELEMENT_SYMBOLS.forEach(symbol => {
      const achievement = ACHIEVEMENTS.find(a => a.id === `element_${symbol}_mol`);
      const unlocked = persistentState.achievements[achievement.id];
      html += renderAchievementItem(achievement, unlocked);
    });
    html += '</div>';
  } else if (tab === 'periods') {
    // Period Complete
    html += '<div class="achievement-category"><div class="achievement-category-title">Period Complete (1 or more)</div>';
    for (let i = 1; i <= 7; i++) {
      const achievement = ACHIEVEMENTS.find(a => a.id === `period_${i}_1`);
      const unlocked = persistentState.achievements[achievement.id];
      html += renderAchievementItem(achievement, unlocked);
    }
    html += '</div>';
    
    // Period Master
    html += '<div class="achievement-category"><div class="achievement-category-title">Period Master (1mol or more)</div>';
    for (let i = 1; i <= 7; i++) {
      const achievement = ACHIEVEMENTS.find(a => a.id === `period_${i}_mol`);
      const unlocked = persistentState.achievements[achievement.id];
      html += renderAchievementItem(achievement, unlocked);
    }
    html += '</div>';
  } else if (tab === 'groups') {
    // Group Complete
    html += '<div class="achievement-category"><div class="achievement-category-title">Group Complete (1 or more)</div>';
    for (let i = 1; i <= 18; i++) {
      const achievement = ACHIEVEMENTS.find(a => a.id === `group_${i}_1`);
      const unlocked = persistentState.achievements[achievement.id];
      html += renderAchievementItem(achievement, unlocked);
    }
    html += '</div>';
    
    // Group Master
    html += '<div class="achievement-category"><div class="achievement-category-title">Group Master (1mol or more)</div>';
    for (let i = 1; i <= 18; i++) {
      const achievement = ACHIEVEMENTS.find(a => a.id === `group_${i}_mol`);
      const unlocked = persistentState.achievements[achievement.id];
      html += renderAchievementItem(achievement, unlocked);
    }
    html += '</div>';
  } else if (tab === 'special') {
    // Lanthanides
    html += '<div class="achievement-category"><div class="achievement-category-title">Lanthanides</div>';
    const lanthanide1 = ACHIEVEMENTS.find(a => a.id === 'lanthanides_1');
    const lanthanideMol = ACHIEVEMENTS.find(a => a.id === 'lanthanides_mol');
    html += renderAchievementItem(lanthanide1, persistentState.achievements[lanthanide1.id]);
    html += renderAchievementItem(lanthanideMol, persistentState.achievements[lanthanideMol.id]);
    html += '</div>';
    
    // Actinides
    html += '<div class="achievement-category"><div class="achievement-category-title">Actinides</div>';
    const actinide1 = ACHIEVEMENTS.find(a => a.id === 'actinides_1');
    const actinideMol = ACHIEVEMENTS.find(a => a.id === 'actinides_mol');
    html += renderAchievementItem(actinide1, persistentState.achievements[actinide1.id]);
    html += renderAchievementItem(actinideMol, persistentState.achievements[actinideMol.id]);
    html += '</div>';
    
    // Clicks
    html += '<div class="achievement-category"><div class="achievement-category-title">Clicks</div>';
    const clickIds = ['clicks_1k', 'clicks_1M', 'clicks_1G', 'clicks_1T', 'clicks_1P', 'clicks_1E'];
    clickIds.forEach(id => {
      const achievement = ACHIEVEMENTS.find(a => a.id === id);
      if (achievement) {
        html += renderAchievementItem(achievement, persistentState.achievements[achievement.id]);
      }
    });
    html += '</div>';
    
    // Play Time
    html += '<div class="achievement-category"><div class="achievement-category-title">Play Time</div>';
    const timeIds = ['time_1min', 'time_1hour', 'time_1day', 'time_1week', 'time_1month', 'time_1year', 'time_1century', 'time_1millennium'];
    timeIds.forEach(id => {
      const achievement = ACHIEVEMENTS.find(a => a.id === id);
      if (achievement) {
        html += renderAchievementItem(achievement, persistentState.achievements[achievement.id]);
      }
    });
    html += '</div>';
    
    // Electrons
    html += '<div class="achievement-category"><div class="achievement-category-title">Electrons Retained</div>';
    const electronIds = ['electrons_1k', 'electrons_1M', 'electrons_1G', 'electrons_1T', 'electrons_1P', 'electrons_1E', 'electrons_1Z', 'electrons_1Y'];
    electronIds.forEach(id => {
      const achievement = ACHIEVEMENTS.find(a => a.id === id);
      if (achievement) {
        html += renderAchievementItem(achievement, persistentState.achievements[achievement.id]);
      }
    });
    html += '</div>';
    
    // Protons
    html += '<div class="achievement-category"><div class="achievement-category-title">Protons Retained</div>';
    const protonIds = ['protons_1k', 'protons_1M', 'protons_1G', 'protons_1T', 'protons_1P', 'protons_1E', 'protons_1Z', 'protons_1Y'];
    protonIds.forEach(id => {
      const achievement = ACHIEVEMENTS.find(a => a.id === id);
      if (achievement) {
        html += renderAchievementItem(achievement, persistentState.achievements[achievement.id]);
      }
    });
    html += '</div>';
    
    // Neutrons
    html += '<div class="achievement-category"><div class="achievement-category-title">Neutrons Retained</div>';
    const neutronIds = ['neutrons_1k', 'neutrons_1M', 'neutrons_1G', 'neutrons_1T', 'neutrons_1P', 'neutrons_1E', 'neutrons_1Z', 'neutrons_1Y'];
    neutronIds.forEach(id => {
      const achievement = ACHIEVEMENTS.find(a => a.id === id);
      if (achievement) {
        html += renderAchievementItem(achievement, persistentState.achievements[achievement.id]);
      }
    });
    html += '</div>';
  }
  
  container.innerHTML = html;
}

function renderAchievementItem(achievement, unlocked) {
  const statusClass = unlocked ? 'unlocked' : 'locked';
  const icon = unlocked ? '🏆' : '🔒';
  const status = unlocked ? 'Unlocked' : 'Locked';
  const clickable = unlocked ? 'onclick="showAchievementDetail(\'' + achievement.id + '\')"' : '';
  const cursorStyle = unlocked ? 'style="cursor: pointer;"' : '';
  
  return `
    <div class="achievement-item ${statusClass}" ${clickable} ${cursorStyle}>
      <div class="achievement-item-icon">${icon}</div>
      <div class="achievement-item-info">
        <div class="achievement-item-name">${achievement.name}</div>
        <div class="achievement-item-desc">${achievement.description}</div>
      </div>
      <div class="achievement-item-status">${status}</div>
    </div>
  `;
}

// 実績詳細表示
function showAchievementDetail(achievementId) {
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
  const data = persistentState.achievements[achievementId];
  if (!achievement || !data) return;
  
  // 古い形式（タイムスタンプのみ）への対応
  let timestamp, clicks, playTime;
  if (typeof data === 'object') {
    timestamp = data.timestamp;
    clicks = data.clicks;
    playTime = data.playTime;
  } else {
    // 古い形式: dataはタイムスタンプの数値
    timestamp = data;
    clicks = '不明';
    playTime = null;
  }
  
  const dateStr = new Date(timestamp).toLocaleString('en-US');
  const clicksStr = typeof clicks === 'number' ? formatNumber(clicks) + ' clicks' : clicks;
  const playTimeStr = playTime !== null ? formatTime(playTime) : 'Unknown';
  
  // 詳細モーダルを表示
  const modal = document.getElementById('achievementDetailModal');
  document.getElementById('achievementDetailName').textContent = achievement.name;
  document.getElementById('achievementDetailDesc').textContent = achievement.description;
  document.getElementById('achievementDetailDate').textContent = dateStr;
  document.getElementById('achievementDetailClicks').textContent = clicksStr;
  document.getElementById('achievementDetailPlayTime').textContent = playTimeStr;
  modal.style.display = 'flex';
}

// 原料元素から得られる粒子数を計算
function calculateParticlesFromElements(recipe, count = 1) {
  let electrons = 0n;
  let protons = 0n;
  let neutrons = 0n;
  const countBig = BigInt(count);
  
  for (const [key, amount] of Object.entries(recipe)) {
    if (key !== 'energy' && key !== 'protons' && key !== 'electrons' && key !== 'neutrons') {
      // これは元素シンボル
      const element = ELEMENTS.find(e => e.symbol === key);
      if (element) {
        const amountBig = BigInt(amount);
        // 元素の原子番号 = 電子数 = 陽子数
        electrons += BigInt(element.atomicNumber) * amountBig * countBig;
        protons += BigInt(element.atomicNumber) * amountBig * countBig;
        // 元素の中性子数はレシピから取得
        neutrons += BigInt(element.recipe.neutrons) * amountBig * countBig;
      }
    }
  }
  
  return { electrons, protons, neutrons };
}

// 必要な追加中性子数を計算
function calculateRequiredNeutrons(recipe, count = 1) {
  const fromElements = calculateParticlesFromElements(recipe, count);
  const requiredNeutrons = BigInt(recipe.neutrons || 0) * BigInt(count);
  const additionalNeutrons = bigIntMax(0n, requiredNeutrons - fromElements.neutrons);
  return additionalNeutrons;
}

function canAffordRecipe(recipe, count = 1) {
  const countBig = BigInt(count);
  const energyCost = BigInt(recipe.energy || 0) * BigInt(ENERGY_COST_MULTIPLIER);
  if (energyCost > 0n && gameState.energy < energyCost * countBig) return false;
  
  // 原料元素から得られる粒子を計算
  const fromElements = calculateParticlesFromElements(recipe, count);
  
  // 必要な粒子数
  const requiredElectrons = BigInt(recipe.electrons || 0) * countBig;
  const requiredProtons = BigInt(recipe.protons || 0) * countBig;
  const requiredNeutrons = BigInt(recipe.neutrons || 0) * countBig;
  
  // 原料元素がない場合（水素）は、電子と陽子を直接消費
  const hasSourceElements = Object.keys(recipe).some(key => 
    key !== 'energy' && key !== 'protons' && key !== 'electrons' && key !== 'neutrons'
  );
  
  if (!hasSourceElements) {
    // 水素生成: 電子と陽子を直接消費
    if (requiredElectrons > 0n && gameState.particles.electrons < requiredElectrons) return false;
    if (requiredProtons > 0n && gameState.particles.protons < requiredProtons) return false;
    if (requiredNeutrons > 0n && gameState.particles.neutrons < requiredNeutrons) return false;
  } else {
    // 原料元素から足りない分だけ粒子が必要
    // 電子と陽子は原料元素から完全に供給される前提（レシピが正しければ過不足なし）
    // 中性子のみ不足分を消費
    const additionalNeutrons = bigIntMax(0n, requiredNeutrons - fromElements.neutrons);
    
    if (additionalNeutrons > 0n && gameState.particles.neutrons < additionalNeutrons) return false;
  }

  // 原料元素のチェック
  for (const [element, amount] of Object.entries(recipe)) {
    if (element !== 'energy' && element !== 'protons' && element !== 'electrons' && element !== 'neutrons') {
      if ((gameState.elements[element] || 0n) < BigInt(amount) * countBig) return false;
    }
  }

  return true;
}

function getMaxAffordable(recipe) {
  let max = BigInt(Number.MAX_SAFE_INTEGER); // 十分大きな値

  const energyCost = BigInt(recipe.energy || 0) * BigInt(ENERGY_COST_MULTIPLIER);
  if (energyCost > 0n) max = bigIntMin(max, gameState.energy / energyCost);
  
  // 原料元素がない場合（水素）は、電子と陽子を直接消費
  const hasSourceElements = Object.keys(recipe).some(key => 
    key !== 'energy' && key !== 'protons' && key !== 'electrons' && key !== 'neutrons'
  );
  
  if (!hasSourceElements) {
    // 水素生成: 電子、陽子、中性子を直接チェック
    if (recipe.electrons) max = bigIntMin(max, gameState.particles.electrons / BigInt(recipe.electrons));
    if (recipe.protons) max = bigIntMin(max, gameState.particles.protons / BigInt(recipe.protons));
    if (recipe.neutrons) max = bigIntMin(max, gameState.particles.neutrons / BigInt(recipe.neutrons));
  } else {
    // 1個あたりの追加中性子数を計算
    const additionalNeutronsPerOne = calculateRequiredNeutrons(recipe, 1);
    if (additionalNeutronsPerOne > 0n) {
      max = bigIntMin(max, gameState.particles.neutrons / additionalNeutronsPerOne);
    }
  }

  for (const [element, amount] of Object.entries(recipe)) {
    if (element !== 'energy' && element !== 'protons' && element !== 'electrons' && element !== 'neutrons') {
      max = bigIntMin(max, (gameState.elements[element] || 0n) / BigInt(amount));
    }
  }

  return max === BigInt(Number.MAX_SAFE_INTEGER) ? 0n : max;
}

function consumeRecipe(recipe, count = 1, targetElement = null) {
  const countBig = BigInt(count);
  const energyCost = BigInt(recipe.energy || 0) * BigInt(ENERGY_COST_MULTIPLIER);
  if (energyCost > 0n) gameState.energy -= energyCost * countBig;
  
  // 原料元素がない場合（水素）は、電子と陽子を直接消費
  const hasSourceElements = Object.keys(recipe).some(key => 
    key !== 'energy' && key !== 'protons' && key !== 'electrons' && key !== 'neutrons'
  );
  
  if (!hasSourceElements) {
    // 水素生成: 電子、陽子、中性子を直接消費
    if (recipe.electrons) gameState.particles.electrons -= BigInt(recipe.electrons) * countBig;
    if (recipe.protons) gameState.particles.protons -= BigInt(recipe.protons) * countBig;
    if (recipe.neutrons) gameState.particles.neutrons -= BigInt(recipe.neutrons) * countBig;
  } else {
    // 原料元素から得られる粒子を計算
    const fromElements = calculateParticlesFromElements(recipe, count);
    
    // ターゲット元素が必要とする粒子数
    let requiredElectrons = 0n;
    let requiredProtons = 0n;
    let requiredNeutrons = 0n;
    
    if (targetElement) {
      requiredElectrons = BigInt(targetElement.atomicNumber) * countBig;
      requiredProtons = BigInt(targetElement.atomicNumber) * countBig;
      requiredNeutrons = BigInt(targetElement.recipe.neutrons) * countBig;
    }
    
    // 足りない中性子のみ消費
    const additionalNeutrons = bigIntMax(0n, requiredNeutrons - fromElements.neutrons);
    if (additionalNeutrons > 0n) {
      gameState.particles.neutrons -= additionalNeutrons;
    }
    
    // 余った粒子を返却
    const excessElectrons = fromElements.electrons - requiredElectrons;
    const excessProtons = fromElements.protons - requiredProtons;
    const excessNeutrons = fromElements.neutrons - requiredNeutrons;
    
    if (excessElectrons > 0n) gameState.particles.electrons += excessElectrons;
    if (excessProtons > 0n) gameState.particles.protons += excessProtons;
    if (excessNeutrons > 0n) gameState.particles.neutrons += excessNeutrons;
  }

  // 原料元素を消費
  for (const [element, amount] of Object.entries(recipe)) {
    if (element !== 'energy' && element !== 'protons' && element !== 'electrons' && element !== 'neutrons') {
      gameState.elements[element] = (gameState.elements[element] || 0n) - BigInt(amount) * countBig;
      // 元素減少エフェクト
      triggerElementChangeEffect(element, 'decrease');
    }
  }
}

function calculateClickPower() {
  let power = 0n;
  for (const [symbol, count] of Object.entries(gameState.elements)) {
    const element = ELEMENTS.find(e => e.symbol === symbol);
    if (element) {
      power += BigInt(element.atomicNumber) * toBigInt(count);
    }
  }
  return bigIntMax(1n, power);
}

// ===== Element Change Effect =====
function triggerElementChangeEffect(symbol, type) {
  const card = document.getElementById(`element-${symbol}`);
  if (!card) return;
  
  const ownedEl = card.querySelector('.element-owned');
  if (!ownedEl) return;
  
  // 既存のクラスを削除してリセット
  ownedEl.classList.remove('increase', 'decrease');
  
  // アニメーションをリスタートするために一度再描画
  void ownedEl.offsetWidth;
  
  // 新しいクラスを追加
  ownedEl.classList.add(type);
  
  // アニメーション終了後にクラスを削除
  setTimeout(() => {
    ownedEl.classList.remove(type);
  }, 500);
  
  // 発光エフェクトを作成
  const rect = ownedEl.getBoundingClientRect();
  const glow = document.createElement('div');
  glow.className = `element-glow ${type}`;
  glow.style.left = (rect.left + rect.width / 2 - 15) + 'px';
  glow.style.top = (rect.top + rect.height / 2 - 15) + 'px';
  glow.style.width = '30px';
  glow.style.height = '30px';
  glow.style.position = 'fixed';
  document.body.appendChild(glow);
  
  // アニメーション終了後に削除
  setTimeout(() => glow.remove(), 800);
}

// ===== Click Handler =====
function handleClick(event) {
  const clickPower = calculateClickPower() * BigInt(getAchievementBonus());
  gameState.energy += clickPower;
  gameState.totalEnergyEarned += clickPower;
  gameState.totalClicks += 1;

  // Visual feedback - ripple effect
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const ripple = document.createElement('div');
  ripple.className = 'click-ripple';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.style.width = '20px';
  ripple.style.height = '20px';
  button.appendChild(ripple);

  setTimeout(() => ripple.remove(), 600);

  // Number pop animation
  const numberPop = document.createElement('div');
  numberPop.className = 'number-pop';
  numberPop.textContent = '+' + formatNumberShort(clickPower);
  numberPop.style.left = x + 'px';
  numberPop.style.top = y + 'px';
  button.appendChild(numberPop);

  setTimeout(() => numberPop.remove(), 1000);

  updateUI();
}

// ===== Generator Upgrade Handlers =====
function upgradeGenerator(type) {
  const cost = getGeneratorCost(type);

  const costBig = BigInt(cost);
  if (gameState.energy >= costBig) {
    gameState.energy -= costBig;
    gameState.generators[type] += 1;
    gameState.totalClicks += 1; // Track click
    updateUI();
  }
}

// ===== Element Handlers =====
function synthesizeElement(symbol) {
  const element = ELEMENTS.find(e => e.symbol === symbol);
  let countToBuy = 0n;

  if (gameState.buyMultiplier === 'max') {
    countToBuy = getMaxAffordable(element.recipe);
  } else {
    countToBuy = BigInt(gameState.buyMultiplier);
  }

  if (countToBuy > 0n && canAffordRecipe(element.recipe, toNumber(countToBuy))) {
    consumeRecipe(element.recipe, toNumber(countToBuy), element);
    gameState.elements[symbol] = (gameState.elements[symbol] || 0n) + countToBuy;
    gameState.totalClicks += 1; // Track click
    
    // 元素増加エフェクト
    triggerElementChangeEffect(symbol, 'increase');
    
    updateUI();
  }
}

// ===== Game Loop =====
// 小数の蓄積用（BigIntは小数を扱えないため）
const particleAccumulator = { electrons: 0, protons: 0, neutrons: 0 };
let energyAccumulator = 0;

function gameLoop() {
  const now = Date.now();
  const deltaTime = (now - gameState.lastUpdate) / 1000; // seconds
  gameState.lastUpdate = now;
  
  const achievementBonus = getAchievementBonus();

  // Generate particles (小数を蓄積し、1以上になったらBigIntに変換、実績ボーナス適用)
  for (const [type, level] of Object.entries(gameState.generators)) {
    const rate = getGeneratorRate(type);
    particleAccumulator[type] += rate * deltaTime * achievementBonus;
    if (particleAccumulator[type] >= 1) {
      const toAdd = BigInt(Math.floor(particleAccumulator[type]));
      gameState.particles[type] += toAdd;
      particleAccumulator[type] -= Number(toAdd);
    }
  }

  // Generate energy from particles (実績ボーナス適用)
  const totalParticles = toNumber(gameState.particles.electrons + gameState.particles.protons + gameState.particles.neutrons);
  const particleEnergy = totalParticles * PARTICLE_ENERGY_RATE * deltaTime * achievementBonus;
  energyAccumulator += particleEnergy;
  
  // Generate energy from particle count (count / 60 per second)
  const electronCount = toNumber(gameState.particles.electrons);
  const protonCount = toNumber(gameState.particles.protons);
  const neutronCount = toNumber(gameState.particles.neutrons);
  const particleCountEnergy = (electronCount + protonCount + neutronCount) * PARTICLE_COUNT_ENERGY_RATE * deltaTime * achievementBonus;
  energyAccumulator += particleCountEnergy;

  // Generate energy from elements (実績ボーナス適用)
  for (const [symbol, count] of Object.entries(gameState.elements)) {
    const element = ELEMENTS.find(e => e.symbol === symbol);
    if (element) {
      const energyValue = getElementEnergyValue(element);
      const elementEnergy = toNumber(count) * energyValue * 0.05 * deltaTime * achievementBonus;
      energyAccumulator += elementEnergy;
    }
  }
  
  // 蓄積したエネルギーを1以上になったらBigIntに変換
  if (energyAccumulator >= 1) {
    const toAdd = BigInt(Math.floor(energyAccumulator));
    gameState.energy += toAdd;
    gameState.totalEnergyEarned += toAdd;
    energyAccumulator -= Number(toAdd);
  }
  
  // 実績チェック
  checkAchievements();

  updateUI();
  requestAnimationFrame(gameLoop);
}

// ===== UI Update =====
function updateUI() {
  // Energy display
  document.getElementById('energyValue').textContent = formatNumber(gameState.energy);

  // Energy rate (実績ボーナス適用)
  const achievementBonus = getAchievementBonus();
  const totalParticles = toNumber(gameState.particles.electrons + gameState.particles.protons + gameState.particles.neutrons);
  let energyRate = totalParticles * PARTICLE_ENERGY_RATE * achievementBonus;
  // Add energy from particle count (表示上は粒子数そのまま = count/sec)
  energyRate += totalParticles * achievementBonus;

  for (const [symbol, count] of Object.entries(gameState.elements)) {
    const element = ELEMENTS.find(e => e.symbol === symbol);
    if (element) {
      const energyValue = getElementEnergyValue(element);
      energyRate += toNumber(count) * energyValue * 0.05 * achievementBonus;
    }
  }

  document.getElementById('energyRate').textContent = formatNumber(energyRate);

  // Multiplier display
  document.getElementById('multiplierValue').textContent = formatMultiplier(gameState.multiplier);
  
  // Achievement display
  const achievementCountEl = document.getElementById('achievementCount');
  if (achievementCountEl) {
    achievementCountEl.textContent = `${getAchievementCount()}/${getTotalAchievementCount()}`;
  }

  // Stats
  document.getElementById('totalClicks').textContent = formatNumber(gameState.totalClicks);
  document.getElementById('playTime').textContent = formatTime(Date.now() - gameState.startTime);

  // Particle generators
  updateGeneratorUI('electrons');
  updateGeneratorUI('protons');
  updateGeneratorUI('neutrons');

  // Elements
  updateElementsUI();
}

function updateGeneratorUI(type) {
  const level = gameState.generators[type];
  const count = gameState.particles[type];
  const rate = getGeneratorRate(type);
  const cost = getGeneratorCost(type);
  const achievementBonus = getAchievementBonus();

  const capitalizedType = type.charAt(0).toUpperCase() + type.slice(0, -1);

  document.getElementById(`${type.slice(0, -1)}Level`).textContent = level;
  document.getElementById(`${type.slice(0, -1)}Count`).textContent = formatNumber(count);
  document.getElementById(`${type.slice(0, -1)}Rate`).textContent = formatDecimal(rate * achievementBonus);
  document.getElementById(`${type.slice(0, -1)}Cost`).textContent = formatNumber(cost) + ' E';

  const button = document.getElementById(`${type.slice(0, -1)}Upgrade`);
  button.disabled = gameState.energy < cost;
}

function updateElementsUI() {
  const grid = document.getElementById('elementsGrid');

  // Only create elements once
  if (grid.children.length === 0) {
    ELEMENTS.forEach(element => {
      const card = createElementCard(element);
      grid.appendChild(card);
    });
  }

  // Update existing elements
  ELEMENTS.forEach(element => {
    const card = document.getElementById(`element-${element.symbol}`);
    if (card) {
      const count = gameState.elements[element.symbol] || 0n;

      let canAfford = false;
      if (gameState.buyMultiplier === 'max') {
        canAfford = getMaxAffordable(element.recipe) > 0n;
      } else {
        canAfford = canAffordRecipe(element.recipe, gameState.buyMultiplier);
      }

      card.classList.toggle('locked', !canAfford && count === 0n);
      // Also toggle a 'disabled' class for visual feedback even if owned
      card.classList.toggle('disabled', !canAfford);

      const ownedEl = card.querySelector('.element-owned');
      if (ownedEl) {
        ownedEl.textContent = count > 0n ? formatNumberShort(count) : '';
        ownedEl.style.display = count > 0n ? 'flex' : 'none';
      }
    }
  });
}

function createElementCard(element) {
  const card = document.createElement('div');
  card.className = 'element-card';
  card.id = `element-${element.symbol}`;

  // Apply grid positioning
  card.style.gridColumn = element.col;
  card.style.gridRow = element.row;

  // Apply colors
  card.style.borderColor = element.color;
  card.style.boxShadow = `0 0 10px ${element.color}33`; // Subtle glow

  card.innerHTML = `
        <div class="element-number">${element.atomicNumber}</div>
        <div class="element-owned"></div>
        <div class="element-symbol" style="color: ${element.color}">${element.symbol}</div>
        <div class="element-name" style="color: ${element.color}">${element.name}</div>
    `;

  // Click to synthesize
  card.addEventListener('click', () => {
    synthesizeElement(element.symbol);
    hideElementTooltip();
    lastClickedElement = element.symbol;
  });

  // Hover tooltip
  card.addEventListener('mouseenter', () => {
    // クリックした元素と同じならツールチップを表示しない
    if (lastClickedElement !== element.symbol) {
      showElementTooltip(card, element);
    }
  });

  card.addEventListener('mouseleave', () => {
    hideElementTooltip();
    // 他の元素に移動したらリセット
    lastClickedElement = null;
  });

  return card;
}

// ===== Tooltip Functions =====
let currentTooltip = null;
let lastClickedElement = null;

function showElementTooltip(card, element) {
  // Remove existing tooltip
  hideElementTooltip();

  const tooltip = document.createElement('div');
  tooltip.className = 'element-tooltip';
  tooltip.id = 'elementTooltip';

  // Build recipe display
  let recipeHTML = '<div class="tooltip-title">Recipe</div>';
  recipeHTML += '<div class="tooltip-recipe">';

  const recipe = element.recipe;

  // Energy
  if (recipe.energy) {
    const energyCost = recipe.energy * ENERGY_COST_MULTIPLIER;
    const hasEnough = gameState.energy >= energyCost;
    recipeHTML += `<div class="recipe-item ${hasEnough ? 'available' : 'unavailable'}">`;
    recipeHTML += `<span class="recipe-label text-energy">Energy:</span>`;
    recipeHTML += `<span class="recipe-value text-energy">${formatNumber(energyCost)}</span>`;
    recipeHTML += '</div>';
  }

  // Particles
  if (recipe.electrons) {
    const hasEnough = gameState.particles.electrons >= recipe.electrons;
    recipeHTML += `<div class="recipe-item ${hasEnough ? 'available' : 'unavailable'}">`;
    recipeHTML += `<span class="recipe-label text-electron">Electrons:</span>`;
    recipeHTML += `<span class="recipe-value text-electron">${formatNumber(recipe.electrons)}</span>`;
    recipeHTML += '</div>';
  }

  if (recipe.protons) {
    const hasEnough = gameState.particles.protons >= recipe.protons;
    recipeHTML += `<div class="recipe-item ${hasEnough ? 'available' : 'unavailable'}">`;
    recipeHTML += `<span class="recipe-label text-proton">Protons:</span>`;
    recipeHTML += `<span class="recipe-value text-proton">${formatNumber(recipe.protons)}</span>`;
    recipeHTML += '</div>';
  }

  if (recipe.neutrons) {
    const hasEnough = gameState.particles.neutrons >= recipe.neutrons;
    recipeHTML += `<div class="recipe-item ${hasEnough ? 'available' : 'unavailable'}">`;
    recipeHTML += `<span class="recipe-label text-neutron">Neutrons:</span>`;
    recipeHTML += `<span class="recipe-value text-neutron">${formatNumber(recipe.neutrons)}</span>`;
    recipeHTML += '</div>';
  }

  // Other elements
  for (const [key, value] of Object.entries(recipe)) {
    if (key !== 'energy' && key !== 'protons' && key !== 'electrons' && key !== 'neutrons') {
      const hasEnough = (gameState.elements[key] || 0n) >= BigInt(value);
      const elementData = ELEMENTS.find(e => e.symbol === key);
      recipeHTML += `<div class="recipe-item ${hasEnough ? 'available' : 'unavailable'}">`;
      recipeHTML += `<span class="recipe-label" style="color: ${elementData ? elementData.color : 'inherit'}">${elementData ? elementData.name : key}:</span>`;
      recipeHTML += `<span class="recipe-value" style="color: ${elementData ? elementData.color : 'inherit'}">${formatNumber(value)}</span>`;
      recipeHTML += '</div>';
    }
  }

  recipeHTML += '</div>';

  // Energy generation info
  const energyValue = getElementEnergyValue(element) * 0.05;
  recipeHTML += `<div class="tooltip-info">Generation: ${energyValue.toFixed(1)} e/sec.</div>`;

  tooltip.innerHTML = recipeHTML;

  // Position tooltip
  const rect = card.getBoundingClientRect();
  tooltip.style.left = (rect.right + 10) + 'px';
  tooltip.style.top = rect.top + 'px';

  document.body.appendChild(tooltip);
  currentTooltip = tooltip;

  // Adjust if off screen
  const tooltipRect = tooltip.getBoundingClientRect();
  if (tooltipRect.right > window.innerWidth) {
    tooltip.style.left = (rect.left - tooltipRect.width - 10) + 'px';
  }
  if (tooltipRect.bottom > window.innerHeight) {
    tooltip.style.top = (window.innerHeight - tooltipRect.height - 10) + 'px';
  }
}

function hideElementTooltip() {
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
}

// ===== Save/Load =====
// BigInt対応のJSONシリアライズ
function stringifyWithBigInt(obj) {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return { __bigint__: value.toString() };
    }
    return value;
  });
}

function parseWithBigInt(str) {
  return JSON.parse(str, (key, value) => {
    if (value && typeof value === 'object' && value.__bigint__) {
      return BigInt(value.__bigint__);
    }
    return value;
  });
}

function saveGame() {
  localStorage.setItem('periodicTableGame', stringifyWithBigInt(gameState));
  savePersistentData();
}

function loadGame() {
  // 永続データを読み込み
  const savedPersistent = localStorage.getItem('periodicTablePersistent');
  if (savedPersistent) {
    const loaded = parseWithBigInt(savedPersistent);
    persistentState = {
      totalEnergyEarned: toBigInt(loaded.totalEnergyEarned || 0),
      totalClicks: loaded.totalClicks || 0,
      totalPlayTime: loaded.totalPlayTime || 0,
      achievements: loaded.achievements || {}
    };
  }

  const saved = localStorage.getItem('periodicTableGame');
  if (saved) {
    const loaded = parseWithBigInt(saved);
    // BigInt値の変換を確実に行う
    gameState.energy = toBigInt(loaded.energy || 0);
    gameState.particles = {
      electrons: toBigInt(loaded.particles?.electrons || 0),
      protons: toBigInt(loaded.particles?.protons || 0),
      neutrons: toBigInt(loaded.particles?.neutrons || 0)
    };
    gameState.generators = loaded.generators || { electrons: 0, protons: 0, neutrons: 0 };
    gameState.elements = {};
    for (const [key, val] of Object.entries(loaded.elements || {})) {
      gameState.elements[key] = toBigInt(val);
    }
    gameState.elementGenerators = loaded.elementGenerators || {};
    gameState.totalClicks = loaded.totalClicks || 0;
    gameState.startTime = loaded.startTime || Date.now();
    gameState.totalEnergyEarned = toBigInt(loaded.totalEnergyEarned || 0);
    gameState.multiplier = loaded.multiplier || 1;
    gameState.lastUpdate = Date.now();
  }
  
  // 永続データをgameStateに同期
  gameState.totalEnergyEarned = persistentState.totalEnergyEarned;
  gameState.totalClicks = persistentState.totalClicks || 0;
  // startTimeを調整して累計プレイ時間を反映
  gameState.startTime = Date.now() - (persistentState.totalPlayTime || 0);
  
  // 常にbuyMultiplierを1にリセットして画面表示（x1がactive）と同期
  gameState.buyMultiplier = 1;
}

function savePersistentData() {
  persistentState.totalEnergyEarned = gameState.totalEnergyEarned;
  persistentState.totalClicks = gameState.totalClicks;
  persistentState.totalPlayTime = Date.now() - gameState.startTime;
  localStorage.setItem('periodicTablePersistent', stringifyWithBigInt(persistentState));
}

// Auto-save every 10 seconds
setInterval(saveGame, 10000);

// ===== Initialization =====
function init() {
  // ELEMENTSを生成
  ELEMENTS = generateElements();
  
  // 実績を生成
  ACHIEVEMENTS = generateAchievements();
  
  loadGame();

  // Event listeners
  document.getElementById('clickButton').addEventListener('click', handleClick);
  document.getElementById('electronUpgrade').addEventListener('click', () => upgradeGenerator('electrons'));
  document.getElementById('protonUpgrade').addEventListener('click', () => upgradeGenerator('protons'));
  document.getElementById('neutronUpgrade').addEventListener('click', () => upgradeGenerator('neutrons'));

  // Reset button
  // Reset button
  const resetModal = document.getElementById('resetModal');
  const confirmResetBtn = document.getElementById('confirmReset');
  const cancelResetBtn = document.getElementById('cancelReset');

  document.getElementById('resetButton').addEventListener('click', () => {
    // リセット後の倍率を計算して表示
    const newMultiplier = calculateMultiplierFromEnergy(toNumber(gameState.totalEnergyEarned));
    document.getElementById('resetTotalEnergy').textContent = formatNumber(gameState.totalEnergyEarned);
    document.getElementById('resetNewMultiplier').textContent = formatMultiplier(newMultiplier);
    resetModal.classList.add('active');
  });

  cancelResetBtn.addEventListener('click', () => {
    resetModal.classList.remove('active');
  });

  confirmResetBtn.addEventListener('click', () => {
    // 新しい倍率を計算
    const newMultiplier = calculateMultiplierFromEnergy(toNumber(gameState.totalEnergyEarned));
    
    // 永続データを保存
    savePersistentData();
    
    // ゲームデータをリセット（永続データは残す）
    localStorage.removeItem('periodicTableGame');
    
    // 新しいゲーム状態で開始（倍率を適用）
    const newState = {
      multiplier: newMultiplier,
      totalEnergyEarned: gameState.totalEnergyEarned
    };
    localStorage.setItem('periodicTableGame', stringifyWithBigInt(newState));
    
    location.reload();
  });

  // Close modal when clicking outside
  resetModal.addEventListener('click', (e) => {
    if (e.target === resetModal) {
      resetModal.classList.remove('active');
    }
  });

  // Achievement modal
  const achievementModal = document.getElementById('achievementModal');
  const achievementButton = document.getElementById('achievementButton');
  const closeAchievementModal = document.getElementById('closeAchievementModal');
  
  achievementButton.addEventListener('click', () => {
    updateAchievementModal();
    achievementModal.classList.add('active');
  });
  
  closeAchievementModal.addEventListener('click', () => {
    achievementModal.classList.remove('active');
  });
  
  achievementModal.addEventListener('click', (e) => {
    if (e.target === achievementModal) {
      achievementModal.classList.remove('active');
    }
  });
  
  // Achievement detail modal
  const achievementDetailModal = document.getElementById('achievementDetailModal');
  const closeAchievementDetailModal = document.getElementById('closeAchievementDetailModal');
  
  closeAchievementDetailModal.addEventListener('click', () => {
    achievementDetailModal.style.display = 'none';
  });
  
  achievementDetailModal.addEventListener('click', (e) => {
    if (e.target === achievementDetailModal) {
      achievementDetailModal.style.display = 'none';
    }
  });
  
  // Achievement tabs
  const achievementTabs = document.querySelectorAll('.achievement-tab');
  achievementTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      achievementTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderAchievementList(tab.dataset.tab);
    });
  });

  // Bulk controls
  const bulkBtns = document.querySelectorAll('.bulk-btn');
  bulkBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      bulkBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update state
      const val = btn.dataset.multiplier;
      gameState.buyMultiplier = val === 'max' ? 'max' : parseInt(val);
      updateUI();
    });
  });

  // Start game loop
  gameState.lastUpdate = Date.now();
  updateUI();
  gameLoop();
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init());
} else {
  init();
}
