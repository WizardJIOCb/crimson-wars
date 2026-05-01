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

function registerNewsRoutes(app, {
  adminNewsHtmlPath,
  newsImageDir,
  newsStore,
  requireAdmin,
}) {
  const uploadDir = newsImageDir || path.join(process.cwd(), 'data', 'news-images');
  fs.mkdirSync(uploadDir, { recursive: true });

  app.get('/api/news/images/:file', (req, res) => {
    const file = String(req.params.file || '').trim();
    if (!/^[a-z0-9_.-]+\.(png|jpg|jpeg|webp|gif)$/i.test(file)) {
      res.status(404).end();
      return;
    }
    res.sendFile(path.join(uploadDir, file));
  });

  app.get('/admin/news', (_req, res) => {
    res.sendFile(adminNewsHtmlPath);
  });

  app.get('/api/news', (_req, res) => {
    res.json({ ok: true, items: newsStore.listPublic(), now: Date.now() });
  });

  app.get('/api/news/:id', (req, res) => {
    const result = newsStore.getPublicById(req.params.id, { incrementView: true });
    if (!result.ok) {
      res.status(result.code || 404).json({ ok: false, message: result.message || 'News not found' });
      return;
    }
    res.json({ ok: true, item: result.item, now: Date.now() });
  });

  app.post('/api/news/:id/comments', (req, res) => {
    if (!req.playerUser) {
      res.status(401).json({ ok: false, message: 'Authentication required' });
      return;
    }
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const result = newsStore.addComment(req.params.id, {
      authorName: req.playerUser.nickname || 'Player',
      authorAccountId: req.playerUser.id,
      text: payload.text,
      parentId: payload.parentId,
    });
    if (!result.ok) {
      res.status(result.code || 400).json({ ok: false, message: result.message || 'Failed to add comment' });
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
    try {
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (body.length <= 0) {
        res.status(400).json({ ok: false, message: 'Image file is required' });
        return;
      }
      const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      const extByType = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
        'image/gif': 'gif',
      };
      const ext = extByType[contentType];
      if (!ext) {
        res.status(400).json({ ok: false, message: 'Supported image types: PNG, JPG, WEBP, GIF' });
        return;
      }
      const id = crypto.randomBytes(10).toString('hex');
      const fileName = `${Date.now()}-${id}.${ext}`;
      fs.writeFileSync(path.join(uploadDir, fileName), body);
      res.json({
        ok: true,
        image: {
          id: fileName.replace(/\.[^.]+$/, ''),
          url: `/api/news/images/${fileName}`,
          alt: '',
        },
      });
    } catch (err) {
      console.error('Admin news image upload failed:', err?.message || err);
      res.status(500).json({ ok: false, message: 'Failed to upload image' });
    }
  });

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
