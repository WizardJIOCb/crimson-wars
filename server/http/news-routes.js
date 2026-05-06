'use strict';

const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const path = require('path');

function expressImageUploadMiddleware() {
  return express.raw({
    type: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    limit: '8mb',
  });
}

function expressMediaUploadMiddleware() {
  return express.raw({
    type: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
    limit: '64mb',
  });
}

function getUploadExtension(contentType, { imagesOnly = false } = {}) {
  const extByType = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
    'video/quicktime': 'mov',
  };
  const type = String(contentType || '').split(';')[0].trim().toLowerCase();
  const ext = extByType[type] || '';
  if (imagesOnly && ext && !['png', 'jpg', 'webp', 'gif'].includes(ext)) return '';
  return ext;
}

function uploadKindFromExt(ext) {
  return ['mp4', 'webm', 'ogv', 'mov'].includes(String(ext || '').toLowerCase()) ? 'video' : 'image';
}

function registerNewsRoutes(app, {
  adminNewsHtmlPath,
  newsImageDir,
  newsStore,
  requireAdmin,
  accountProgressionStore,
}) {
  const uploadDir = newsImageDir || path.join(process.cwd(), 'data', 'news-images');
  fs.mkdirSync(uploadDir, { recursive: true });

  function getPlayerCommentIdentity(playerUser) {
    if (!playerUser) return null;
    let authorHeroId = '';
    let authorHeroName = '';
    try {
      const progression = accountProgressionStore?.getOrCreateProgression?.(playerUser.id);
      const publicProgression = accountProgressionStore?.toPublicProgression?.(progression) || progression;
      authorHeroId = String(publicProgression?.activeHero || '').trim();
      const catalog = accountProgressionStore?.getCatalogPayload?.();
      const heroes = Array.isArray(catalog?.heroes) ? catalog.heroes : [];
      const hero = heroes.find((entry) => String(entry?.id || '').trim() === authorHeroId);
      authorHeroName = String(hero?.name || authorHeroId || '').trim();
    } catch {
      authorHeroId = '';
      authorHeroName = '';
    }
    return {
      authorName: String(playerUser.nickname || 'Player').trim(),
      authorAccountId: Math.max(0, Number(playerUser.id) || 0),
      authorHeroId,
      authorHeroName,
    };
  }

  app.get('/api/news/images/:file', (req, res) => {
    const file = String(req.params.file || '').trim();
    if (!/^[a-z0-9_.-]+\.(png|jpg|jpeg|webp|gif)$/i.test(file)) {
      res.status(404).end();
      return;
    }
    res.sendFile(path.join(uploadDir, file));
  });

  app.get('/api/news/media/:file', (req, res) => {
    const file = String(req.params.file || '').trim();
    if (!/^[a-z0-9_.-]+\.(png|jpg|jpeg|webp|gif|mp4|webm|ogv|mov)$/i.test(file)) {
      res.status(404).end();
      return;
    }
    res.sendFile(path.join(uploadDir, file));
  });

  app.get('/admin/news', (_req, res) => {
    res.sendFile(adminNewsHtmlPath);
  });

  app.get('/admin/devlog', (_req, res) => {
    res.sendFile(adminNewsHtmlPath);
  });

  app.get('/api/news', (req, res) => {
    const kind = String(req.query?.kind || 'news').trim().toLowerCase();
    res.json({ ok: true, items: newsStore.listPublic({ kind }), now: Date.now() });
  });

  app.get('/api/devlog', (_req, res) => {
    res.json({ ok: true, items: newsStore.listPublic({ kind: 'devlog' }), now: Date.now() });
  });

  app.get('/api/news/:id', (req, res) => {
    const result = newsStore.getPublicById(req.params.id, { incrementView: true });
    if (!result.ok) {
      res.status(result.code || 404).json({ ok: false, message: result.message || 'News not found' });
      return;
    }
    res.json({ ok: true, item: result.item, now: Date.now() });
  });

  app.get('/api/devlog/:id', (req, res) => {
    const result = newsStore.getPublicById(req.params.id, { incrementView: true });
    if (!result.ok || result.item?.kind !== 'devlog') {
      res.status(result.code || 404).json({ ok: false, message: result.message || 'Devlog item not found' });
      return;
    }
    res.json({ ok: true, item: result.item, now: Date.now() });
  });

  app.post('/api/news/:id/comments', (req, res) => {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    if (!req.playerUser) {
      res.status(401).json({ ok: false, message: 'Authentication required' });
      return;
    }
    const identity = getPlayerCommentIdentity(req.playerUser);
    if (!identity?.authorName) {
      res.status(401).json({ ok: false, message: 'Authentication required' });
      return;
    }

    const result = newsStore.addComment(req.params.id, {
      ...identity,
      text: payload.text,
      parentId: payload.parentId,
    });
    if (!result.ok) {
      res.status(result.code || 400).json({ ok: false, message: result.message || 'Failed to add comment' });
      return;
    }
    res.json({ ok: true, item: result.item, now: Date.now() });
  });

  app.post('/api/news/:id/reactions', (req, res) => {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const result = newsStore.addReaction(req.params.id, {
      targetType: payload.targetType,
      reaction: payload.reaction,
      delta: payload.delta,
      commentId: payload.commentId,
      parentId: payload.parentId,
    });
    if (!result.ok) {
      res.status(result.code || 400).json({ ok: false, message: result.message || 'Failed to react' });
      return;
    }
    res.json({ ok: true, item: result.item, now: Date.now() });
  });

  app.delete('/api/news/:id/comments/:commentId', (req, res) => {
    if (!req.playerUser) {
      res.status(401).json({ ok: false, message: 'Authentication required' });
      return;
    }
    const parentId = (req.query?.parentId || '').toString();
    const result = newsStore.deleteComment(req.params.id, {
      commentId: req.params.commentId,
      parentId,
      authorAccountId: req.playerUser.id,
    });
    if (!result.ok) {
      res.status(result.code || 400).json({ ok: false, message: result.message || 'Failed to delete comment' });
      return;
    }
    res.json({ ok: true, item: result.item, now: Date.now() });
  });

  app.get('/api/admin/news', requireAdmin, (_req, res) => {
    res.json({ ok: true, items: newsStore.listAdmin(), now: Date.now() });
  });

  app.post('/api/admin/news/images', requireAdmin, expressImageUploadMiddleware(), (req, res) => {
    handleUpload(req, res, { imagesOnly: true });
  });

  app.post('/api/admin/news/media', requireAdmin, expressMediaUploadMiddleware(), (req, res) => {
    handleUpload(req, res, { imagesOnly: false });
  });

  function handleUpload(req, res, { imagesOnly = false } = {}) {
    try {
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (body.length <= 0) {
        res.status(400).json({ ok: false, message: 'Media file is required' });
        return;
      }
      const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      const ext = getUploadExtension(contentType, { imagesOnly });
      if (!ext) {
        res.status(400).json({ ok: false, message: imagesOnly ? 'Supported image types: PNG, JPG, WEBP, GIF' : 'Supported media types: PNG, JPG, WEBP, GIF, MP4, WEBM, OGV, MOV' });
        return;
      }
      const id = crypto.randomBytes(10).toString('hex');
      const fileName = `${Date.now()}-${id}.${ext}`;
      fs.writeFileSync(path.join(uploadDir, fileName), body);
      const type = uploadKindFromExt(ext);
      res.json({
        ok: true,
        image: {
          id: fileName.replace(/\.[^.]+$/, ''),
          url: `/api/news/images/${fileName}`,
          alt: '',
        },
        media: {
          id: fileName.replace(/\.[^.]+$/, ''),
          type,
          url: type === 'image' ? `/api/news/images/${fileName}` : `/api/news/media/${fileName}`,
          alt: '',
          caption: '',
          poster: '',
        },
      });
    } catch (err) {
      console.error('Admin news media upload failed:', err?.message || err);
      res.status(500).json({ ok: false, message: 'Failed to upload media' });
    }
  }

  app.post('/api/admin/news', requireAdmin, (req, res) => {
    try {
      const payload = req.body && typeof req.body === 'object' ? req.body : {};
      const result = newsStore.create(payload);
      if (!result.ok) {
        res.status(result.code || 400).json({ ok: false, message: result.message || 'Failed to create news' });
        return;
      }
      res.json({ ok: true, item: result.item, items: newsStore.listAdmin() });
    } catch (err) {
      console.error('Admin news create failed:', err?.message || err);
      res.status(500).json({ ok: false, message: 'Failed to create news' });
    }
  });

  app.put('/api/admin/news/:id', requireAdmin, (req, res) => {
    try {
      const payload = req.body && typeof req.body === 'object' ? req.body : {};
      const result = newsStore.update(req.params.id, payload);
      if (!result.ok) {
        res.status(result.code || 400).json({ ok: false, message: result.message || 'Failed to update news' });
        return;
      }
      res.json({ ok: true, item: result.item, items: newsStore.listAdmin() });
    } catch (err) {
      console.error('Admin news update failed:', err?.message || err);
      res.status(500).json({ ok: false, message: 'Failed to update news' });
    }
  });

  app.delete('/api/admin/news/:id', requireAdmin, (req, res) => {
    try {
      const result = newsStore.remove(req.params.id);
      if (!result.ok) {
        res.status(result.code || 400).json({ ok: false, message: result.message || 'Failed to delete news' });
        return;
      }
      res.json({ ok: true, item: result.item, items: newsStore.listAdmin() });
    } catch (err) {
      console.error('Admin news delete failed:', err?.message || err);
      res.status(500).json({ ok: false, message: 'Failed to delete news' });
    }
  });
}

module.exports = {
  registerNewsRoutes,
};
