(function initClientRecordsList() {
  function updateRecordsPager() {
    if (recordsPageEl) recordsPageEl.textContent = `Page ${recordsUi.page}/${recordsUi.totalPages}`;
    if (recordsTotalEl) recordsTotalEl.textContent = `(Total: ${recordsUi.total})`;
    if (recordsPrevBtn) recordsPrevBtn.disabled = recordsUi.page <= 1;
    if (recordsNextBtn) recordsNextBtn.disabled = recordsUi.page >= recordsUi.totalPages;
  }

  function renderRecordsList(items, page = 1, totalPages = 1, total = 0) {
    if (!recordsListEl) return;
    recordsUi.page = page;
    recordsUi.totalPages = totalPages;
    recordsUi.total = total;
    updateRecordsPager();

    if (!items.length) {
      recordsListEl.textContent = 'No records yet.';
      return;
    }

    const rankOffset = (recordsUi.page - 1) * recordsUi.pageSize;
    recordsListEl.innerHTML = '';
    for (let i = 0; i < items.length; i += 1) {
      const r = items[i];
      const rankNumber = rankOffset + i + 1;
      const rankLabel = `#${rankNumber}`;
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'record-row';

      const rank = document.createElement('div');
      rank.className = 'record-rank';
      rank.textContent = rankLabel;

      const name = document.createElement('div');
      name.className = 'record-name';
      const attempts = Math.max(1, Number(r.attempts) || 1);
      name.textContent = (r.name || 'Unknown') + ' [' + attempts + ']';

      const kills = Number(r.kills) || 0;
      const score = Number(r.score) || 0;

      const meta = document.createElement('div');
      meta.className = 'record-meta';
      meta.textContent = `${kills} kills / ${score} pts`;

      row.addEventListener('click', () => {
        openRecordDetailsModal(r, rankLabel);
      });

      row.appendChild(rank);
      row.appendChild(name);
      row.appendChild(meta);
      recordsListEl.appendChild(row);
    }
  }

  async function requestRecordsList(page = recordsUi.page) {
    if (!recordsListEl) return;
    try {
      const params = new URLSearchParams({
        page: String(Math.max(1, page)),
        page_size: String(recordsUi.pageSize),
      });
      const res = await fetch(`/api/records?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      renderRecordsList(
        Array.isArray(payload.records) ? payload.records : [],
        Number(payload.page) || 1,
        Number(payload.totalPages) || 1,
        Number(payload.total) || 0,
      );
    } catch {
      recordsUi.total = 0;
      updateRecordsPager();
      recordsListEl.textContent = 'Failed to load records.';
    }
  }

  recordsPrevBtn?.addEventListener('click', () => {
    if (recordsUi.page > 1) requestRecordsList(recordsUi.page - 1);
  });

  recordsNextBtn?.addEventListener('click', () => {
    if (recordsUi.page < recordsUi.totalPages) requestRecordsList(recordsUi.page + 1);
  });

  const api = {
    render: renderRecordsList,
    request: requestRecordsList,
    updatePager: updateRecordsPager,
    getState: () => ({ ...recordsUi }),
  };

  globalThis.CWRecordsList = api;
  globalThis.renderRecordsList = renderRecordsList;
  globalThis.requestRecordsList = requestRecordsList;
  globalThis.updateRecordsPager = updateRecordsPager;
}());
