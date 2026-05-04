(function initClientRoomsList() {
  const battleHubPresenceEl = document.getElementById('battle-hub-presence');
  const battleHubPresenceRefreshBtn = document.getElementById('battle-hub-presence-refresh');

  function renderPresence(presence) {
    const online = Number(presence?.online) || 0;
    const inGame = Number(presence?.inGame) || 0;
    const inMenu = Number(presence?.inMenu) || 0;
    const hasRegistered = Number.isFinite(Number(presence?.registered));
    const registered = hasRegistered ? Math.max(0, Number(presence?.registered) || 0) : null;
    const renderCount = (value) => {
      if (value === null) return '<span class="presence-count">--</span>';
      const cls = value > 0 ? 'presence-count hot' : 'presence-count';
      return `<span class="${cls}">${value}</span>`;
    };
    if (presenceMetaEl) {
      presenceMetaEl.innerHTML = `Online: ${renderCount(online)} | In game: ${renderCount(inGame)} | In menu: ${renderCount(inMenu)} | Registered: ${renderCount(registered)}`;
    }
    if (battleHubPresenceEl) {
      const renderPanelCount = (label, value) => {
        const valueText = value === null ? '--' : String(value);
        const hotClass = value > 0 ? ' class="hot"' : '';
        return `<span><b>${label}</b><strong${hotClass}>${valueText}</strong></span>`;
      };
      battleHubPresenceEl.innerHTML = ''
        + renderPanelCount('Online', online)
        + renderPanelCount('In game', inGame)
        + renderPanelCount('In menu', inMenu)
        + renderPanelCount('Registered', registered);
    }
  }

  function renderRoomsList(rooms) {
    if (!roomsListEl) return;

    if (!rooms.length) {
      roomsListEl.textContent = 'No active rooms yet.';
      return;
    }

    roomsListEl.innerHTML = '';
    for (const room of rooms) {
      const row = document.createElement('div');
      row.className = 'room-row';

      const code = document.createElement('div');
      code.className = 'room-code';
      code.textContent = room.code;

      const meta = document.createElement('div');
      meta.className = 'room-meta';
      meta.textContent = `${room.players}/${room.maxPlayers}`;

      const joinBtn = document.createElement('button');
      joinBtn.type = 'button';
      joinBtn.className = 'room-join';
      joinBtn.textContent = 'Join';
      joinBtn.disabled = room.players >= room.maxPlayers;
      joinBtn.addEventListener('click', () => {
        roomCodeInput.value = room.code;
        joinMode = 'join';
        if (typeof window.cwTrackMetrikaGoal === 'function') {
          window.cwTrackMetrikaGoal('room_search_result_click', {
            room_code: room.code,
            players: Number(room.players) || 0,
          });
        }
        void sendJoinRequest(room.code, null, { source: 'rooms_list' });
      });

      row.appendChild(code);
      row.appendChild(meta);
      row.appendChild(joinBtn);
      roomsListEl.appendChild(row);
    }
  }

  async function requestRoomsList() {
    if (!roomsListEl) return;
    try {
      const res = await fetch('/api/rooms', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      if (payload?.isShuttingDown) {
        statusEl.textContent = 'Server restarting. New rooms are temporarily unavailable.';
      }
      renderPresence(payload.presence);
      renderRoomsList(Array.isArray(payload.rooms) ? payload.rooms : []);
    } catch {
      if (presenceMetaEl) presenceMetaEl.textContent = 'Online: -- | In game: -- | In menu: -- | Registered: --';
      if (battleHubPresenceEl) {
        battleHubPresenceEl.innerHTML = '<span><b>Online</b><strong>--</strong></span><span><b>In game</b><strong>--</strong></span><span><b>In menu</b><strong>--</strong></span><span><b>Registered</b><strong>--</strong></span>';
      }
      roomsListEl.textContent = 'Failed to load rooms.';
    }
  }

  refreshRoomsBtn?.addEventListener('click', () => {
    if (typeof window.cwTrackMetrikaGoal === 'function') {
      window.cwTrackMetrikaGoal('room_search_manual', { source: 'refresh_button' });
    }
    requestRoomsList();
  });

  battleHubPresenceRefreshBtn?.addEventListener('click', () => {
    if (typeof window.cwTrackMetrikaGoal === 'function') {
      window.cwTrackMetrikaGoal('room_search_manual', { source: 'profile_panel_refresh' });
    }
    requestRoomsList();
  });

  const api = {
    renderPresence,
    renderRooms: renderRoomsList,
    request: requestRoomsList,
  };

  globalThis.CWRoomsList = api;
  globalThis.renderPresence = renderPresence;
  globalThis.renderRoomsList = renderRoomsList;
  globalThis.requestRoomsList = requestRoomsList;
}());
