const fs = require('fs');
const path = require('path');

function nowMs() {
  return Date.now();
}

function clampInt(value, min = 0) {
  return Math.max(min, Math.floor(Number(value) || 0));
}

function toId(raw) {
  const s = String(raw || '').trim().toLowerCase();
  return s.replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
}

function safeText(raw, maxLen = 1000) {
  return String(raw || '').trim().slice(0, maxLen);
}

function normalizeItems(raw) {
  const source = Array.isArray(raw) ? raw : [];
  return source.map((line) => safeText(line, 420)).filter(Boolean).slice(0, 80);
}

function commentId() {
  return `c-${nowMs()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeReply(raw, fallback = {}) {
  return {
    id: toId(raw?.id || fallback.id || commentId()) || commentId(),
    authorName: safeText(raw?.authorName || fallback.authorName || 'Player', 48),
    authorAccountId: clampInt(raw?.authorAccountId || fallback.authorAccountId, 0),
    text: safeText(raw?.text || fallback.text || '', 1500),
    createdAt: clampInt(raw?.createdAt || fallback.createdAt || nowMs(), 0),
    updatedAt: clampInt(raw?.updatedAt || fallback.updatedAt || nowMs(), 0),
  };
}

function normalizeComment(raw, fallback = {}) {
  const sourceReplies = Array.isArray(raw?.replies) ? raw.replies : (Array.isArray(fallback.replies) ? fallback.replies : []);
  const replies = sourceReplies.map((reply) => normalizeReply(reply)).filter((reply) => reply.text).slice(0, 200);
  return {
    id: toId(raw?.id || fallback.id || commentId()) || commentId(),
    authorName: safeText(raw?.authorName || fallback.authorName || 'Player', 48),
    authorAccountId: clampInt(raw?.authorAccountId || fallback.authorAccountId, 0),
    text: safeText(raw?.text || fallback.text || '', 1500),
    createdAt: clampInt(raw?.createdAt || fallback.createdAt || nowMs(), 0),
    updatedAt: clampInt(raw?.updatedAt || fallback.updatedAt || nowMs(), 0),
    replies,
  };
}

function countComments(item) {
  const comments = Array.isArray(item?.comments) ? item.comments : [];
  let total = 0;
  for (const comment of comments) {
    total += 1;
    if (Array.isArray(comment.replies)) total += comment.replies.length;
  }
  return total;
}

function normalizeNewsItem(raw, fallback = {}) {
  const title = safeText(raw?.title || fallback.title || '', 180);
  const summary = safeText(raw?.summary || fallback.summary || '', 1000);
  const items = normalizeItems(raw?.items || fallback.items);
  const idSource = raw?.id || fallback.id || title;
  const id = toId(idSource) || `news-${nowMs()}`;
  const createdAt = clampInt(raw?.createdAt || fallback.createdAt || nowMs(), 0);
  const updatedAt = clampInt(raw?.updatedAt || fallback.updatedAt || nowMs(), 0);
  const publishedAt = clampInt(raw?.publishedAt || fallback.publishedAt || updatedAt, 0);
  const isPublished = raw?.isPublished === undefined
    ? (fallback.isPublished !== undefined ? Boolean(fallback.isPublished) : true)
    : Boolean(raw.isPublished);
  const views = clampInt(raw?.views || fallback.views, 0);
  const commentsRaw = Array.isArray(raw?.comments) ? raw.comments : (Array.isArray(fallback.comments) ? fallback.comments : []);
  const comments = commentsRaw.map((comment) => normalizeComment(comment)).filter((comment) => comment.text).slice(0, 500);
  return {
    id,
    title,
    summary,
    items,
    isPublished,
    createdAt,
    updatedAt,
    publishedAt,
    views,
    comments,
  };
}

function seedDefaultNews() {
  const now = nowMs();
  return [
    normalizeNewsItem({
      id: 'welcome-news',
      title: 'Welcome Update',
      summary: 'News now supports views, comments and replies directly in game.',
      items: [
        'Track views and comments per news item.',
        'Open full article view and discuss it in comments.',
        'Reply to comments in one click if you are authorized.',
      ],
      isPublished: true,
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      views: 0,
      comments: [],
    }),
  ];
}

function createNewsStore({ dataDir, filePath }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const fullPath = filePath || path.join(dataDir, 'news.json');

  function readAll() {
    if (!fs.existsSync(fullPath)) {
      const seeded = seedDefaultNews();
      writeAll(seeded);
      return seeded;
    }
    try {
      const raw = fs.readFileSync(fullPath, 'utf8');
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : [];
      return arr.map((item) => normalizeNewsItem(item)).filter((item) => item.title || item.summary || item.items.length > 0);
    } catch {
      const seeded = seedDefaultNews();
      writeAll(seeded);
      return seeded;
    }
  }

  function writeAll(items) {
    fs.writeFileSync(fullPath, JSON.stringify(items, null, 2), 'utf8');
  }

  function tryWriteAll(items) {
    try {
      writeAll(items);
      return true;
    } catch {
      return false;
    }
  }

  function sortItems(items) {
    return items.slice().sort((a, b) => {
      const ap = clampInt(a.publishedAt, 0);
      const bp = clampInt(b.publishedAt, 0);
      if (bp !== ap) return bp - ap;
      return clampInt(b.updatedAt, 0) - clampInt(a.updatedAt, 0);
    });
  }

  function listAdmin() {
    return sortItems(readAll());
  }

  function listPublic() {
    return listAdmin().filter((item) => item.isPublished).map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      publishedAt: item.publishedAt,
      views: item.views,
      commentsCount: countComments(item),
    }));
  }

  function getPublicById(id, { incrementView = true } = {}) {
    const targetId = toId(id);
    if (!targetId) return { ok: false, code: 400, message: 'Invalid news id' };
    const all = readAll();
    const idx = all.findIndex((item) => item.id === targetId && item.isPublished);
    if (idx < 0) return { ok: false, code: 404, message: 'News not found' };
    if (incrementView) {
      all[idx].views = clampInt(all[idx].views, 0) + 1;
      all[idx].updatedAt = nowMs();
      // View counter must never break article opening even if file is read-only.
      tryWriteAll(all);
    }
    const current = normalizeNewsItem(all[idx], all[idx]);
    return {
      ok: true,
      item: {
        id: current.id,
        title: current.title,
        summary: current.summary,
        items: current.items,
        publishedAt: current.publishedAt,
        views: current.views,
        commentsCount: countComments(current),
        comments: current.comments,
      },
    };
  }

  function create(payload) {
    const now = nowMs();
    const item = normalizeNewsItem({
      ...payload,
      id: payload?.id || payload?.title || `news-${now}`,
      createdAt: now,
      updatedAt: now,
      publishedAt: payload?.publishedAt || now,
      views: 0,
      comments: [],
    });
    if (!item.title) return { ok: false, code: 400, message: 'Title is required' };
    const all = readAll();
    if (all.some((x) => x.id === item.id)) item.id = `${item.id}-${Math.floor(Math.random() * 9999)}`;
    all.push(item);
    writeAll(all);
    return { ok: true, item };
  }

  function update(id, patch) {
    const targetId = toId(id);
    if (!targetId) return { ok: false, code: 400, message: 'Invalid news id' };
    const all = readAll();
    const idx = all.findIndex((x) => x.id === targetId);
    if (idx < 0) return { ok: false, code: 404, message: 'News not found' };
    const prev = all[idx];
    const next = normalizeNewsItem({
      ...prev,
      ...patch,
      id: prev.id,
      createdAt: prev.createdAt,
      updatedAt: nowMs(),
      views: prev.views,
      comments: prev.comments,
      publishedAt: patch?.publishedAt !== undefined ? patch.publishedAt : prev.publishedAt,
    }, prev);
    if (!next.title) return { ok: false, code: 400, message: 'Title is required' };
    all[idx] = next;
    writeAll(all);
    return { ok: true, item: next };
  }

  function remove(id) {
    const targetId = toId(id);
    if (!targetId) return { ok: false, code: 400, message: 'Invalid news id' };
    const all = readAll();
    const idx = all.findIndex((x) => x.id === targetId);
    if (idx < 0) return { ok: false, code: 404, message: 'News not found' };
    const removed = all[idx];
    all.splice(idx, 1);
    writeAll(all);
    return { ok: true, item: removed };
  }

  function addComment(newsId, { authorName, authorAccountId, text, parentId }) {
    const targetId = toId(newsId);
    if (!targetId) return { ok: false, code: 400, message: 'Invalid news id' };
    const body = safeText(text, 1500);
    if (!body) return { ok: false, code: 400, message: 'Comment text is required' };

    const all = readAll();
    const idx = all.findIndex((x) => x.id === targetId && x.isPublished);
    if (idx < 0) return { ok: false, code: 404, message: 'News not found' };

    const item = normalizeNewsItem(all[idx], all[idx]);
    const now = nowMs();
    const baseComment = {
      id: commentId(),
      authorName: safeText(authorName || 'Player', 48),
      authorAccountId: clampInt(authorAccountId, 0),
      text: body,
      createdAt: now,
      updatedAt: now,
    };

    const parentKey = toId(parentId);
    if (parentKey) {
      const parent = item.comments.find((c) => c.id === parentKey);
      if (!parent) return { ok: false, code: 404, message: 'Parent comment not found' };
      if (!Array.isArray(parent.replies)) parent.replies = [];
      parent.replies.push(baseComment);
    } else {
      item.comments.push({ ...baseComment, replies: [] });
    }

    item.updatedAt = now;
    all[idx] = item;
    if (!tryWriteAll(all)) {
      return { ok: false, code: 503, message: 'News storage is temporarily read-only' };
    }
    return {
      ok: true,
      item: {
        id: item.id,
        title: item.title,
        summary: item.summary,
        items: item.items,
        publishedAt: item.publishedAt,
        views: item.views,
        commentsCount: countComments(item),
        comments: item.comments,
      },
    };
  }



  function deleteComment(newsId, { commentId, parentId, authorAccountId }) {
    const targetId = toId(newsId);
    if (!targetId) return { ok: false, code: 400, message: 'Invalid news id' };
    const targetCommentId = toId(commentId);
    if (!targetCommentId) return { ok: false, code: 400, message: 'Invalid comment id' };
    const actorId = clampInt(authorAccountId, 0);
    if (!actorId) return { ok: false, code: 401, message: 'Authentication required' };

    const all = readAll();
    const idx = all.findIndex((x) => x.id === targetId && x.isPublished);
    if (idx < 0) return { ok: false, code: 404, message: 'News not found' };

    const item = normalizeNewsItem(all[idx], all[idx]);
    const parentKey = toId(parentId);
    let removed = false;

    if (parentKey) {
      const parent = item.comments.find((c) => c.id === parentKey);
      if (!parent) return { ok: false, code: 404, message: 'Parent comment not found' };
      const replyIdx = (parent.replies || []).findIndex((r) => r.id === targetCommentId);
      if (replyIdx < 0) return { ok: false, code: 404, message: 'Comment not found' };
      const target = parent.replies[replyIdx];
      if (clampInt(target?.authorAccountId, 0) !== actorId) {
        return { ok: false, code: 403, message: 'You can delete only your own comment' };
      }
      parent.replies.splice(replyIdx, 1);
      removed = true;
    } else {
      const topIdx = item.comments.findIndex((c) => c.id === targetCommentId);
      if (topIdx >= 0) {
        const target = item.comments[topIdx];
        if (clampInt(target?.authorAccountId, 0) !== actorId) {
          return { ok: false, code: 403, message: 'You can delete only your own comment' };
        }
        item.comments.splice(topIdx, 1);
        removed = true;
      } else {
        for (const parent of item.comments) {
          const replyIdx = (parent.replies || []).findIndex((r) => r.id === targetCommentId);
          if (replyIdx < 0) continue;
          const target = parent.replies[replyIdx];
          if (clampInt(target?.authorAccountId, 0) !== actorId) {
            return { ok: false, code: 403, message: 'You can delete only your own comment' };
          }
          parent.replies.splice(replyIdx, 1);
          removed = true;
          break;
        }
      }
    }

    if (!removed) return { ok: false, code: 404, message: 'Comment not found' };

    item.updatedAt = nowMs();
    all[idx] = item;
    if (!tryWriteAll(all)) {
      return { ok: false, code: 503, message: 'News storage is temporarily read-only' };
    }
    return {
      ok: true,
      item: {
        id: item.id,
        title: item.title,
        summary: item.summary,
        items: item.items,
        publishedAt: item.publishedAt,
        views: item.views,
        commentsCount: countComments(item),
        comments: item.comments,
      },
    };
  }
  return {
    listPublic,
    listAdmin,
    getPublicById,
    create,
    update,
    remove,
    addComment,
    deleteComment,
  };
}

module.exports = {
  createNewsStore,
};


