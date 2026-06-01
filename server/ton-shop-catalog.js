const TON_DECIMALS = 9;
const NANO_TON = 1000000000;

function tonToNanoTon(value) {
  return Math.max(1, Math.round(Number(value || 0) * NANO_TON));
}

const HERO_SKINS = [
  {
    id: 'neon_warden',
    heroId: 'cyber',
    name: 'Neon Warden',
    rarity: 'mythic',
    tint: '#22d3ee',
    glow: '#67e8f9',
    image: '/assets/ton-shop/hero-skins/neon_warden.png',
    tagline: 'Cold blue armor for clean arena work.',
  },
  {
    id: 'solar_scout',
    heroId: 'scout',
    name: 'Solar Scout',
    rarity: 'legendary',
    tint: '#fbbf24',
    glow: '#fde68a',
    image: '/assets/ton-shop/hero-skins/solar_scout.png',
    tagline: 'Gold cloak, fast cuts, bright trail.',
  },
  {
    id: 'void_shadow',
    heroId: 'shadow',
    name: 'Void Shadow',
    rarity: 'mythic',
    tint: '#a855f7',
    glow: '#c084fc',
    image: '/assets/ton-shop/hero-skins/void_shadow.png',
    tagline: 'Violet samurai plating from the dark lane.',
  },
  {
    id: 'bio_lumen_medic',
    heroId: 'medic',
    name: 'Bio Lumen Medic',
    rarity: 'legendary',
    tint: '#84cc16',
    glow: '#bef264',
    image: '/assets/ton-shop/hero-skins/bio_lumen_medic.png',
    tagline: 'Clean white armor with toxic green pulse lines.',
  },
  {
    id: 'iron_raider',
    heroId: 'raider',
    name: 'Iron Raider',
    rarity: 'legendary',
    tint: '#f97316',
    glow: '#fdba74',
    image: '/assets/ton-shop/hero-skins/iron_raider.png',
    tagline: 'Heavy red-orange siege exosuit.',
  },
  {
    id: 'crimson_founder',
    heroId: 'cyber',
    name: 'Crimson Founder',
    rarity: 'founder',
    tint: '#ef4444',
    glow: '#fca5a5',
    image: '/assets/ton-shop/hero-skins/crimson_founder.png',
    tagline: 'Limited champion armor for early supporters.',
  },
];

const ITEM_SKINS = [
  {
    id: 'aurora_plasma_blade',
    target: 'melee',
    name: 'Aurora Plasma Blade',
    rarity: 'mythic',
    tint: '#38bdf8',
    glow: '#e879f9',
    image: '/assets/ton-shop/item-skins/aurora_plasma_blade.png',
    tagline: 'Melee trails split into blue and magenta arcs.',
  },
  {
    id: 'ton_orbit_ring',
    target: 'ring',
    name: 'TON Orbit Ring',
    rarity: 'legendary',
    tint: '#22d3ee',
    glow: '#67e8f9',
    image: '/assets/ton-shop/item-skins/ton_orbit_ring.png',
    tagline: 'A tiny orbiting TON prism around equipped rings.',
  },
  {
    id: 'reactor_plate',
    target: 'armor',
    name: 'Reactor Plate',
    rarity: 'legendary',
    tint: '#ef4444',
    glow: '#f87171',
    image: '/assets/ton-shop/item-skins/reactor_plate.png',
    tagline: 'Red reactor chest glow for armor slots.',
  },
  {
    id: 'nano_medkit',
    target: 'quick',
    name: 'Nano Medkit',
    rarity: 'epic',
    tint: '#84cc16',
    glow: '#bbf7d0',
    image: '/assets/ton-shop/item-skins/nano_medkit.png',
    tagline: 'Premium quick-slot med tech with green pulse FX.',
  },
  {
    id: 'prism_boots',
    target: 'legs',
    name: 'Prism Boots',
    rarity: 'legendary',
    tint: '#60a5fa',
    glow: '#f0abfc',
    image: '/assets/ton-shop/item-skins/prism_boots.png',
    tagline: 'Color-split boot streaks while moving.',
  },
];

const PRODUCTS = [
  {
    id: 'hero_contract_scout',
    type: 'hero_unlock',
    title: 'Scout Contract',
    subtitle: 'Unlock Scout instantly',
    priceTon: 0.95,
    image: '/assets/ton-shop/hero-skins/solar_scout.png',
    grants: [{ type: 'hero_unlock', heroId: 'scout' }],
  },
  {
    id: 'hero_contract_shadow',
    type: 'hero_unlock',
    title: 'Shadow Contract',
    subtitle: 'Unlock Shadow instantly',
    priceTon: 1.25,
    image: '/assets/ton-shop/hero-skins/void_shadow.png',
    grants: [{ type: 'hero_unlock', heroId: 'shadow' }],
  },
  {
    id: 'hero_contract_raider',
    type: 'hero_unlock',
    title: 'Raider Contract',
    subtitle: 'Unlock Raider instantly',
    priceTon: 1.15,
    image: '/assets/ton-shop/hero-skins/iron_raider.png',
    grants: [{ type: 'hero_unlock', heroId: 'raider' }],
  },
  {
    id: 'hero_contract_medic',
    type: 'hero_unlock',
    title: 'Medic Contract',
    subtitle: 'Unlock Medic instantly',
    priceTon: 1.05,
    image: '/assets/ton-shop/hero-skins/bio_lumen_medic.png',
    grants: [{ type: 'hero_unlock', heroId: 'medic' }],
  },
  ...HERO_SKINS.map((skin) => ({
    id: `skin_${skin.id}`,
    type: 'hero_skin',
    title: skin.name,
    subtitle: skin.tagline,
    priceTon: skin.id === 'crimson_founder' ? 1.75 : 0.55,
    image: skin.image,
    grants: [{ type: 'hero_skin', skinId: skin.id, heroId: skin.heroId }],
  })),
  ...ITEM_SKINS.map((skin) => ({
    id: `item_skin_${skin.id}`,
    type: 'item_skin',
    title: skin.name,
    subtitle: skin.tagline,
    priceTon: skin.id === 'aurora_plasma_blade' ? 0.65 : 0.42,
    image: skin.image,
    grants: [{ type: 'item_skin', skinId: skin.id, target: skin.target }],
  })),
  {
    id: 'pack_crimson_founder',
    type: 'bundle',
    title: 'Crimson Founder Pack',
    subtitle: 'Founder armor, TON ring, plasma blade and instant Shadow unlock',
    priceTon: 3.5,
    image: '/assets/ton-shop/hero-skins/crimson_founder.png',
    featured: true,
    grants: [
      { type: 'hero_unlock', heroId: 'shadow' },
      { type: 'hero_skin', skinId: 'crimson_founder', heroId: 'cyber' },
      { type: 'hero_skin', skinId: 'void_shadow', heroId: 'shadow' },
      { type: 'item_skin', skinId: 'aurora_plasma_blade', target: 'melee' },
      { type: 'item_skin', skinId: 'ton_orbit_ring', target: 'ring' },
    ],
  },
].map((product) => ({
  ...product,
  priceNanoTon: tonToNanoTon(product.priceTon),
}));

const PRODUCT_MAP = new Map(PRODUCTS.map((product) => [product.id, product]));
const HERO_SKIN_MAP = new Map(HERO_SKINS.map((skin) => [skin.id, skin]));
const ITEM_SKIN_MAP = new Map(ITEM_SKINS.map((skin) => [skin.id, skin]));

function normalizeTonNetwork(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'mainnet' || value === '-239') return 'mainnet';
  return 'testnet';
}

function getTonNetworkId(network) {
  return normalizeTonNetwork(network) === 'mainnet' ? '-239' : '-3';
}

function getTonShopRuntimeConfig() {
  const network = normalizeTonNetwork(process.env.TON_NETWORK || process.env.TON_SHOP_NETWORK || (process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet'));
  const receiverAddress = String(process.env.TON_RECEIVER_ADDRESS || process.env.TON_SHOP_RECEIVER_ADDRESS || '').trim();
  const devAutoConfirm = ['1', 'true', 'yes'].includes(String(process.env.TON_DEV_AUTO_CONFIRM || '').trim().toLowerCase());
  return {
    enabled: Boolean(receiverAddress),
    receiverAddress,
    network,
    networkId: getTonNetworkId(network),
    decimals: TON_DECIMALS,
    currency: 'TON',
    devAutoConfirm,
    orderTtlMs: Math.max(60000, Number(process.env.TON_ORDER_TTL_MS) || 1000 * 60 * 20),
  };
}

function getProduct(productId) {
  return PRODUCT_MAP.get(String(productId || '').trim()) || null;
}

function getHeroSkin(skinId) {
  return HERO_SKIN_MAP.get(String(skinId || '').trim()) || null;
}

function getItemSkin(skinId) {
  return ITEM_SKIN_MAP.get(String(skinId || '').trim()) || null;
}

function listProducts() {
  return PRODUCTS.map((product) => ({ ...product, grants: product.grants.map((grant) => ({ ...grant })) }));
}

function listHeroSkins() {
  return HERO_SKINS.map((skin) => ({ ...skin }));
}

function listItemSkins() {
  return ITEM_SKINS.map((skin) => ({ ...skin }));
}

function getProductOwnedState(product, progression) {
  const entitlements = progression?.cosmeticEntitlements && typeof progression.cosmeticEntitlements === 'object'
    ? progression.cosmeticEntitlements
    : {};
  const ownedProducts = new Set(Array.isArray(entitlements.ownedProducts) ? entitlements.ownedProducts : []);
  if (ownedProducts.has(product?.id)) return true;
  const ownedHeroSkins = new Set(Array.isArray(entitlements.ownedHeroSkins) ? entitlements.ownedHeroSkins : []);
  const ownedItemSkins = new Set(Array.isArray(entitlements.ownedItemSkins) ? entitlements.ownedItemSkins : []);
  const unlockedHeroes = new Set(Array.isArray(progression?.unlockedHeroes) ? progression.unlockedHeroes : []);
  return (Array.isArray(product?.grants) ? product.grants : []).every((grant) => {
    if (grant.type === 'hero_unlock') return unlockedHeroes.has(grant.heroId);
    if (grant.type === 'hero_skin') return ownedHeroSkins.has(grant.skinId);
    if (grant.type === 'item_skin') return ownedItemSkins.has(grant.skinId);
    return false;
  });
}

function buildPublicTonShopPayload({ progression = null } = {}) {
  const runtime = getTonShopRuntimeConfig();
  const products = listProducts().map((product) => ({
    ...product,
    owned: getProductOwnedState(product, progression),
  }));
  return {
    ...runtime,
    manifestUrl: process.env.TONCONNECT_MANIFEST_URL || '/tonconnect-manifest.json',
    products,
    cosmetics: {
      heroSkins: listHeroSkins(),
      itemSkins: listItemSkins(),
    },
  };
}

module.exports = {
  TON_DECIMALS,
  NANO_TON,
  getTonShopRuntimeConfig,
  getProduct,
  getHeroSkin,
  getItemSkin,
  listProducts,
  listHeroSkins,
  listItemSkins,
  getProductOwnedState,
  buildPublicTonShopPayload,
};
