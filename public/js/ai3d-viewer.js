(function () {
  const characters = [
    {
      id: 'cyber',
      name: 'Cyber',
      role: 'Heavy assault',
      accent: 'cyan-red',
      vertices: 3929,
      faces: 4001,
      meshes: 65,
      sheet: '/assets/characters/cyber-pos.png',
      glb: '/assets/characters/ai3d/generated/kitbash/cyber/cyber.glb',
      fbx: '/assets/characters/ai3d/generated/kitbash/cyber/cyber.fbx',
      blend: '/assets/characters/ai3d/generated/kitbash/cyber/cyber.blend',
      raw: '/assets/characters/ai3d/generated/triposr/cyber/0/cyber-preview.glb',
    },
    {
      id: 'medis',
      name: 'Medis',
      role: 'Field medic',
      accent: 'cyan',
      vertices: 3278,
      faces: 3284,
      meshes: 59,
      sheet: '/assets/characters/medis-pos.png',
      glb: '/assets/characters/ai3d/generated/kitbash/medis/medis.glb',
      fbx: '/assets/characters/ai3d/generated/kitbash/medis/medis.fbx',
      blend: '/assets/characters/ai3d/generated/kitbash/medis/medis.blend',
      raw: '/assets/characters/ai3d/generated/triposr/medis/0/medis-preview.glb',
    },
    {
      id: 'raider',
      name: 'Raider',
      role: 'Heavy raider',
      accent: 'red',
      vertices: 4379,
      faces: 4473,
      meshes: 68,
      sheet: '/assets/characters/raider-pos.png',
      glb: '/assets/characters/ai3d/generated/kitbash/raider/raider.glb',
      fbx: '/assets/characters/ai3d/generated/kitbash/raider/raider.fbx',
      blend: '/assets/characters/ai3d/generated/kitbash/raider/raider.blend',
      raw: '/assets/characters/ai3d/generated/triposr/raider/0/raider-preview.glb',
    },
    {
      id: 'scout',
      name: 'Scout',
      role: 'Marksman scout',
      accent: 'green',
      vertices: 3430,
      faces: 3424,
      meshes: 55,
      sheet: '/assets/characters/scout-pos.png',
      glb: '/assets/characters/ai3d/generated/kitbash/scout/scout.glb',
      fbx: '/assets/characters/ai3d/generated/kitbash/scout/scout.fbx',
      blend: '/assets/characters/ai3d/generated/kitbash/scout/scout.blend',
      raw: '/assets/characters/ai3d/generated/triposr/scout/0/scout-preview.glb',
    },
    {
      id: 'shadow',
      name: 'Shadow',
      role: 'Stealth assassin',
      accent: 'blue',
      vertices: 3274,
      faces: 3270,
      meshes: 54,
      sheet: '/assets/characters/shadow-pos.png',
      glb: '/assets/characters/ai3d/generated/kitbash/shadow/shadow.glb',
      fbx: '/assets/characters/ai3d/generated/kitbash/shadow/shadow.fbx',
      blend: '/assets/characters/ai3d/generated/kitbash/shadow/shadow.blend',
      raw: '/assets/characters/ai3d/generated/triposr/shadow/0/shadow-preview.glb',
    },
  ];

  const byId = new Map(characters.map((character) => [character.id, character]));
  const buttonsEl = document.getElementById('character-buttons');
  const modelEl = document.getElementById('character-model');
  const statusEl = document.getElementById('stage-status');
  const nameEl = document.getElementById('character-name');
  const roleEl = document.getElementById('character-role');
  const sheetEl = document.getElementById('character-sheet');
  const verticesEl = document.getElementById('stat-vertices');
  const facesEl = document.getElementById('stat-faces');
  const mapsEl = document.getElementById('stat-maps');
  const glbLink = document.getElementById('open-glb');
  const fbxLink = document.getElementById('open-fbx');
  const blendLink = document.getElementById('open-blend');
  const rawLink = document.getElementById('open-ai');

  function formatNumber(value) {
    return new Intl.NumberFormat('ru-RU').format(value);
  }

  function renderButtons() {
    buttonsEl.innerHTML = characters.map((character) => `
      <button class="character-button" type="button" data-character="${character.id}" style="--accent: var(--${character.accent === 'cyan-red' ? 'cyan' : character.accent})">
        <span class="accent-mark" aria-hidden="true"></span>
        <span class="button-copy">
          <span class="button-name">${character.name}</span>
          <span class="button-meta">${formatNumber(character.faces)} faces</span>
        </span>
      </button>
    `).join('');
  }

  function setActive(characterId) {
    const character = byId.get(characterId) || characters[0];
    document.body.dataset.accent = character.accent;
    nameEl.textContent = character.name;
    roleEl.textContent = character.role;
    sheetEl.src = character.sheet;
    verticesEl.textContent = formatNumber(character.vertices);
    facesEl.textContent = formatNumber(character.faces);
    mapsEl.textContent = formatNumber(character.meshes);
    glbLink.href = character.glb;
    fbxLink.href = character.fbx;
    blendLink.href = character.blend;
    rawLink.href = character.raw;
    statusEl.textContent = `${character.name}: loading ${character.glb}`;
    modelEl.src = character.glb;
    modelEl.alt = `${character.name} generated 3D prototype`;

    for (const button of buttonsEl.querySelectorAll('.character-button')) {
      button.classList.toggle('is-active', button.dataset.character === character.id);
    }

    const url = new URL(window.location.href);
    url.searchParams.set('character', character.id);
    window.history.replaceState({}, '', url);
  }

  renderButtons();

  buttonsEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-character]');
    if (!button) return;
    setActive(button.dataset.character);
  });

  modelEl.addEventListener('load', () => {
    const active = byId.get(new URL(window.location.href).searchParams.get('character')) || characters[0];
    statusEl.textContent = `${active.name}: GLB loaded`;
  });

  modelEl.addEventListener('error', () => {
    statusEl.textContent = 'GLB preview failed to load. Check that the local server is running and the model-viewer script is available.';
  });

  const requested = new URL(window.location.href).searchParams.get('character');
  setActive(requested || 'cyber');
}());
