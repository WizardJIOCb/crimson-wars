'use strict';

function registerLeaderboardRoutes(app, {
  leaderboardService,
  recordsStore,
  leaderboardPageSize,
  hasActiveGameplay,
}) {
  app.get('/api/leaderboard', (req, res) => {
    try {
      res.json(leaderboardService.buildResponse(req.query, { activeGameplay: hasActiveGameplay() }));
    } catch (err) {
      console.error('Leaderboard API failed:', err?.message || err);
      res.status(500).json({ ok: false, message: 'Failed to load leaderboard' });
    }
  });

  app.get('/api/records', (req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.page_size) || leaderboardPageSize;
    const payload = recordsStore.listRecordsForLobby(page, pageSize);

    res.json({
      records: payload.items,
      page: payload.page,
      pageSize: payload.pageSize,
      total: payload.total,
      totalPages: payload.totalPages,
      now: Date.now(),
    });
  });

  app.get('/api/leaderboard/runs/:id/replay', (req, res) => {
    if (hasActiveGameplay()) {
      res.status(503).json({
        ok: false,
        error: 'Replay loading is paused during an active match.',
        lowLatencyMode: true,
        recordId: Math.max(0, Number(req.params.id) || 0),
        now: Date.now(),
      });
      return;
    }

    const payload = recordsStore.getPlayerRunReplayById(req.params.id);
    if (!payload?.replay) {
      res.status(404).json({
        error: 'Replay not found.',
        recordId: Math.max(0, Number(req.params.id) || 0),
        now: Date.now(),
      });
      return;
    }

    res.json({
      record: {
        id: payload.id,
        name: payload.name,
        kills: payload.kills,
        score: payload.score,
        roomCode: payload.roomCode,
        durationSec: payload.durationSec,
        at: payload.at,
      },
      replay: payload.replay,
      now: Date.now(),
    });
  });

  app.get('/api/records/:id/replay', (req, res) => {
    if (hasActiveGameplay()) {
      res.status(503).json({
        ok: false,
        error: 'Replay loading is paused during an active match.',
        lowLatencyMode: true,
        recordId: Math.max(0, Number(req.params.id) || 0),
        now: Date.now(),
      });
      return;
    }

    const payload = recordsStore.getRecordReplay(req.params.id);
    if (!payload?.replay) {
      res.status(404).json({
        error: 'Replay not found.',
        recordId: Math.max(0, Number(req.params.id) || 0),
        now: Date.now(),
      });
      return;
    }

    res.json({
      record: {
        id: payload.id,
        name: payload.name,
        kills: payload.kills,
        score: payload.score,
        roomCode: payload.roomCode,
        durationSec: payload.durationSec,
        at: payload.at,
      },
      replay: payload.replay,
      now: Date.now(),
    });
  });
}

module.exports = {
  registerLeaderboardRoutes,
};
