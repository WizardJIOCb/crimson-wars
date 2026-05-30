const fs = require('fs');
const path = require('path');

const { DEFAULT_SKILL_DEFS } = require('../server/config');

const outDir = path.join(__dirname, '..', 'public', 'assets', 'hero-skills');

const palettes = {
  damage: ['#fb7185', '#ef4444', '#fed7aa'],
  speed: ['#facc15', '#fb923c', '#fff7ed'],
  support: ['#34d399', '#14b8a6', '#dcfce7'],
  tech: ['#60a5fa', '#22d3ee', '#dbeafe'],
  electric: ['#22d3ee', '#2563eb', '#ecfeff'],
  void: ['#c084fc', '#7c3aed', '#f5d0fe'],
  ordnance: ['#fb923c', '#f97316', '#ffedd5'],
  weapon: ['#e5e7eb', '#94a3b8', '#f8fafc'],
};

const iconSpecs = {
  weapon_mastery: { role: 'weapon', motif: 'weaponMastery' },
  rapid_reload: { role: 'speed', motif: 'rapidReload' },
  tactical_slap: { role: 'speed', motif: 'tacticalSlap' },
  shilo_rm: { role: 'damage', motif: 'pierce' },
  bullet_gps: { role: 'tech', motif: 'bulletGps' },
  vitality: { role: 'support', motif: 'vitality' },
  haste: { role: 'speed', motif: 'haste' },
  magnetism: { role: 'tech', motif: 'magnetism' },
  bloodlust: { role: 'damage', motif: 'bloodlust' },
  regeneration: { role: 'support', motif: 'regeneration' },
  force_shield: { role: 'support', motif: 'forceShield' },
  dodge_instinct: { role: 'speed', motif: 'dodgeInstinct' },
  pistol_buddy: { role: 'weapon', motif: 'pistolBuddy' },
  smg_buddy: { role: 'weapon', motif: 'smgBuddy' },
  shotgun_buddy: { role: 'ordnance', motif: 'shotgunBuddy' },
  sniper_buddy: { role: 'tech', motif: 'sniperBuddy' },
  shockwave: { role: 'electric', motif: 'shockwave' },
  psi_blast: { role: 'void', motif: 'psiBlast' },
  blade_orbit: { role: 'damage', motif: 'bladeOrbit' },
  chain_lightning: { role: 'electric', motif: 'chainLightning' },
  laser_strike: { role: 'void', motif: 'laserStrike' },
  homing_missiles: { role: 'ordnance', motif: 'homingMissiles' },
};

function motif(name) {
  const stroke = 'stroke="url(#iconStroke)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  const thin = 'stroke="url(#iconStroke)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".9"';
  const dim = 'stroke="url(#iconStroke)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".42"';
  const fill = 'fill="url(#iconFill)"';
  const glow = 'filter="url(#softGlow)"';
  const white = 'stroke="#f8fafc" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".72"';
  const whiteWide = 'stroke="#f8fafc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".72"';

  switch (name) {
    case 'weaponMastery':
      return `
        <g ${glow}>
          <path d="M17 43 L45 15" ${stroke}/>
          <path d="M19 18 L46 45" ${stroke}/>
          <path d="M14 32 H50 M32 14 V50" ${dim}/>
          <circle cx="32" cy="32" r="10" ${thin}/>
          <circle cx="32" cy="32" r="3.5" ${fill}/>
        </g>`;
    case 'rapidReload':
      return `
        <g ${glow}>
          <path d="M18 26a15 15 0 0 1 25-8" ${stroke}/>
          <path d="M43 18l1-8 6 5" ${stroke}/>
          <path d="M46 38a15 15 0 0 1-25 8" ${stroke}/>
          <path d="M21 46l-1 8-6-5" ${stroke}/>
          <rect x="27" y="22" width="11" height="22" rx="3" ${fill}/>
          <path d="M31 26h4 M31 31h4 M31 36h4" ${white}/>
        </g>`;
    case 'tacticalSlap':
      return `
        <g ${glow}>
          <rect x="27" y="18" width="12" height="28" rx="3" ${fill}/>
          <path d="M19 38c7-3 11-7 14-15" ${stroke}/>
          <path d="M15 27l7-4 M16 34l6-1 M41 18l8-4 M42 27l10-1 M41 36l8 3" ${thin}/>
          <path d="M31 24h4 M31 30h4 M31 36h4" ${white}/>
        </g>`;
    case 'pierce':
      return `
        <g ${glow}>
          <path d="M13 32h34" ${stroke}/>
          <path d="M47 32l-8-7v14z" ${fill}/>
          <circle cx="20" cy="32" r="6" ${thin}/>
          <circle cx="32" cy="32" r="6" ${thin}/>
          <path d="M15 23l-3-4 M23 43l-3 5 M37 21l5-5" ${thin}/>
        </g>`;
    case 'bulletGps':
      return `
        <g ${glow}>
          <path d="M18 43c4-17 14-24 29-25" ${thin} stroke-dasharray="4 4"/>
          <path d="M22 40l15-15 7 7-15 15z" ${fill}/>
          <path d="M43 18l7 7" ${stroke}/>
          <circle cx="46" cy="18" r="6" ${thin}/>
          <path d="M46 12v12 M40 18h12" ${white}/>
        </g>`;
    case 'vitality':
      return `
        <g ${glow}>
          <path d="M32 49s-16-9-16-22c0-7 8-11 16-3 8-8 16-4 16 3 0 13-16 22-16 22z" ${fill}/>
          <path d="M32 21v22 M21 32h22" ${whiteWide}/>
        </g>`;
    case 'haste':
      return `
        <g ${glow}>
          <path d="M16 42h14l-5 10 22-28H33l5-12z" ${fill}/>
          <path d="M12 21h14 M10 31h16 M13 41h11" ${thin}/>
        </g>`;
    case 'magnetism':
      return `
        <g ${glow}>
          <path d="M19 17v16c0 8 5 13 13 13s13-5 13-13V17h-8v16c0 4-2 6-5 6s-5-2-5-6V17z" ${stroke}/>
          <path d="M17 17h11 M36 17h11" ${white}/>
          <path d="M12 39l5-2 M52 39l-5-2 M16 50l5-5 M48 50l-5-5" ${thin}/>
        </g>`;
    case 'bloodlust':
      return `
        <g ${glow}>
          <path d="M32 14c8 11 12 18 12 25 0 8-5 13-12 13S20 47 20 39c0-7 4-14 12-25z" ${fill}/>
          <path d="M20 22l25 25 M27 16l22 22 M15 34l16 16" ${white}/>
        </g>`;
    case 'regeneration':
      return `
        <g ${glow}>
          <path d="M20 36c0-11 8-19 20-17" ${stroke}/>
          <path d="M39 19l-2-7 8 3" ${stroke}/>
          <path d="M44 29c0 11-8 19-20 17" ${stroke}/>
          <path d="M25 46l2 7-8-3" ${stroke}/>
          <path d="M32 24v16 M24 32h16" ${whiteWide}/>
        </g>`;
    case 'forceShield':
      return `
        <g ${glow}>
          <path d="M32 12l18 8v12c0 12-7 20-18 24-11-4-18-12-18-24V20z" ${fill}/>
          <path d="M24 33l6 6 12-15" ${whiteWide}/>
          <path d="M32 16v36" ${dim}/>
        </g>`;
    case 'dodgeInstinct':
      return `
        <g ${glow}>
          <path d="M17 43c9-1 15-5 19-14" ${stroke}/>
          <path d="M36 29l-1 9 8-5" ${stroke}/>
          <path d="M25 47h20" ${thin}/>
          <path d="M24 33l7-12 8 5-7 12z" ${fill}/>
          <path d="M15 22h12 M12 30h10" ${thin}/>
        </g>`;
    case 'pistolBuddy':
      return `
        <g ${glow}>
          <circle cx="24" cy="22" r="6" ${thin}/>
          <path d="M21 28l-5 20 M27 28l5 20" ${thin}/>
          <path d="M29 34h20l3 6H36l-2 9h-7z" ${fill}/>
          <path d="M49 35l5-2" ${white}/>
        </g>`;
    case 'smgBuddy':
      return `
        <g ${glow}>
          <circle cx="22" cy="21" r="5" ${thin}/>
          <path d="M19 27l-5 20 M25 27l5 20" ${thin}/>
          <path d="M27 31h22l4 6H35l-2 6h-8z" ${fill}/>
          <path d="M41 37v10 M46 37v8 M51 32l5-1" ${white}/>
        </g>`;
    case 'shotgunBuddy':
      return `
        <g ${glow}>
          <circle cx="22" cy="22" r="5" ${thin}/>
          <path d="M19 28l-5 19 M25 28l5 19" ${thin}/>
          <path d="M28 33h24l4 5H32z" ${fill}/>
          <path d="M50 36l7-3 M50 38l8 1 M50 40l6 4" ${white}/>
        </g>`;
    case 'sniperBuddy':
      return `
        <g ${glow}>
          <circle cx="20" cy="22" r="5" ${thin}/>
          <path d="M17 28l-5 19 M23 28l5 19" ${thin}/>
          <path d="M25 31h30l3 4H30l-2 8h-7z" ${fill}/>
          <circle cx="43" cy="29" r="4" ${thin}/>
          <path d="M50 24l6-5 M50 46l6 5" ${white}/>
        </g>`;
    case 'shockwave':
      return `
        <g ${glow}>
          <circle cx="32" cy="32" r="7" ${fill}/>
          <circle cx="32" cy="32" r="15" ${thin}/>
          <circle cx="32" cy="32" r="24" ${dim}/>
          <path d="M32 8v10 M32 46v10 M8 32h10 M46 32h10" ${stroke}/>
        </g>`;
    case 'psiBlast':
      return `
        <g ${glow}>
          <circle cx="32" cy="32" r="13" ${fill}/>
          <path d="M32 11v9 M32 44v9 M11 32h9 M44 32h9 M17 17l7 7 M40 40l7 7 M47 17l-7 7 M24 40l-7 7" ${stroke}/>
          <path d="M26 32c4-6 8-6 12 0-4 6-8 6-12 0z" ${white}/>
        </g>`;
    case 'bladeOrbit':
      return `
        <g ${glow}>
          <ellipse cx="32" cy="32" rx="22" ry="12" ${thin} transform="rotate(-18 32 32)"/>
          <path d="M18 23l10-5-4 11z" ${fill}/>
          <path d="M46 41l-10 5 4-11z" ${fill}/>
          <circle cx="32" cy="32" r="5" ${thin}/>
        </g>`;
    case 'chainLightning':
      return `
        <g ${glow}>
          <circle cx="15" cy="41" r="5" ${fill}/>
          <circle cx="33" cy="22" r="5" ${fill}/>
          <circle cx="50" cy="36" r="5" ${fill}/>
          <path d="M19 38l10-12-2 13 9-14 M38 25l8 8-9 1 5 11" ${stroke}/>
        </g>`;
    case 'laserStrike':
      return `
        <g ${glow}>
          <path d="M11 50L50 11" ${stroke}/>
          <path d="M18 53L53 18" ${thin}/>
          <circle cx="44" cy="20" r="10" ${thin}/>
          <path d="M44 10v20 M34 20h20" ${white}/>
        </g>`;
    case 'homingMissiles':
      return `
        <g ${glow}>
          <path d="M14 47c10-1 17-5 22-14" ${thin} stroke-dasharray="4 4"/>
          <path d="M31 16l17 17-12 4-9-9z" ${fill}/>
          <path d="M27 28l-8 2 5-7" ${stroke}/>
          <path d="M45 17c6 7 7 15 2 24" ${thin}/>
          <path d="M47 41l7-2-3-6" ${thin}/>
        </g>`;
    default:
      return `
        <g ${glow}>
          <circle cx="32" cy="32" r="15" ${fill}/>
          <path d="M32 16v32 M16 32h32" ${white}/>
        </g>`;
  }
}

function svgForSkill(skill) {
  const id = String(skill.id || '').trim();
  const spec = iconSpecs[id] || { role: 'tech', motif: 'default' };
  const [accent, dark, highlight] = palettes[spec.role] || palettes.tech;
  const safeId = id.replace(/[^a-z0-9_-]/gi, '_');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${safeId}">
  <defs>
    <linearGradient id="bg_${safeId}" x1="10" y1="7" x2="56" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#111827"/>
      <stop offset=".46" stop-color="${dark}"/>
      <stop offset="1" stop-color="#020617"/>
    </linearGradient>
    <radialGradient id="hot_${safeId}" cx="31%" cy="24%" r="72%">
      <stop offset="0" stop-color="${highlight}" stop-opacity=".82"/>
      <stop offset=".36" stop-color="${accent}" stop-opacity=".28"/>
      <stop offset="1" stop-color="${dark}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="iconStroke" x1="12" y1="12" x2="54" y2="55" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${highlight}"/>
      <stop offset=".52" stop-color="${accent}"/>
      <stop offset="1" stop-color="#f8fafc"/>
    </linearGradient>
    <linearGradient id="iconFill" x1="17" y1="13" x2="48" y2="53" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${highlight}"/>
      <stop offset=".62" stop-color="${accent}"/>
      <stop offset="1" stop-color="${dark}"/>
    </linearGradient>
    <filter id="softGlow" x="-35%" y="-35%" width="170%" height="170%">
      <feDropShadow dx="0" dy="0" stdDeviation="2.8" flood-color="${accent}" flood-opacity=".75"/>
      <feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="${dark}" flood-opacity=".55"/>
    </filter>
  </defs>
  <rect width="64" height="64" rx="13" fill="#020617"/>
  <rect x="3.5" y="3.5" width="57" height="57" rx="12" fill="url(#bg_${safeId})"/>
  <rect x="3.5" y="3.5" width="57" height="57" rx="12" fill="url(#hot_${safeId})"/>
  <path d="M8 49c14-2 25-2 48 1M9 17c17 2 30 1 46-2M15 8l-8 47M56 11L44 58" stroke="#fff" stroke-opacity=".08" stroke-width="1.5"/>
  <path d="M13 13h38v38H13z" fill="none" stroke="${accent}" stroke-opacity=".12" stroke-width="1"/>
  ${motif(spec.motif)}
  <rect x="3.5" y="3.5" width="57" height="57" rx="12" fill="none" stroke="#f8fafc" stroke-opacity=".18"/>
  <rect x="6.5" y="6.5" width="51" height="51" rx="9" fill="none" stroke="${accent}" stroke-opacity=".35"/>
</svg>
`;
}

fs.mkdirSync(outDir, { recursive: true });

let written = 0;
for (const skill of Object.values(DEFAULT_SKILL_DEFS || {})) {
  const id = String(skill?.id || '').trim();
  if (!id) continue;
  const outPath = path.join(outDir, `${id}.svg`);
  fs.writeFileSync(outPath, svgForSkill(skill), 'utf8');
  written += 1;
}

console.log(`Generated ${written} runtime skill icons in ${path.relative(process.cwd(), outDir)}`);
