'use strict';

(() => {
  const newsFeedEl = document.getElementById('news-feed');
  const tr = (key, params = null) => {
    if (typeof window.cwI18nT === 'function') return window.cwI18nT(key, params);
    return String(key || '');
  };
  const trWithFallback = (key, fallback, params = null) => {
    const out = tr(key, params);
    return out === key ? String(fallback ?? key) : out;
  };
  const NEWS_COMMENT_SHORTCUT_HINT = 'Ctrl + Enter';
  function escapeNewsHtml(raw) {
    return String(raw ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  function formatNewsDate(ts) {
    const ms = Math.max(0, Number(ts) || 0);
    if (!ms) return '--';
    try {
      return new Date(ms).toLocaleString(window.cwI18nGetLanguage?.() === 'ru' ? 'ru-RU' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return new Date(ms).toLocaleString();
    }
  }

  function getActiveHeroLabel() {
    const heroId = String(game.playerAuth?.progression?.activeHero || selectedPlayerClass || '').trim();
    const heroes = Array.isArray(game.playerAuth?.progressionCatalog?.heroes) ? game.playerAuth.progressionCatalog.heroes : [];
    const hero = heroes.find((entry) => String(entry?.id || '').trim() === heroId);
    return String(hero?.name || heroId || '').trim();
  }

  function getCommentHeroLabel(comment) {
    return String(comment?.authorHeroName || comment?.authorHeroId || '').trim();
  }

  const newsUi = {
    items: [],
    activeId: '',
    activeItem: null,
    loading: false,
    loadingItem: false,
    postingComment: false,
    error: '',
    itemError: '',
    commentError: '',
    lastLoadedAt: 0,
    cacheMs: 15000,
    fetchToken: 0,
    itemFetchToken: 0,
    commentDraft: '',
    replyTargetId: '',
    replyDraftByParent: {},
    shareCopied: false,
    lightboxIndex: -1,
  };
  let newsShareToastTimer = null;

  function upsertNewsListCounters(item) {
    if (!item || !item.id) return;
    const idx = newsUi.items.findIndex((x) => x && x.id === item.id);
    if (idx < 0) return;
    newsUi.items[idx] = {
      ...newsUi.items[idx],
      title: item.title,
      summary: item.summary,
      images: Array.isArray(item.images) ? item.images : [],
      publishedAt: item.publishedAt,
      views: Math.max(0, Number(item.views) || 0),
      commentsCount: Math.max(0, Number(item.commentsCount) || 0),
    };
  }

  function setNewsDetailItem(item) {
    if (!item || !item.id) return;
    newsUi.activeId = String(item.id);
    newsUi.activeItem = {
      ...item,
      views: Math.max(0, Number(item.views) || 0),
      commentsCount: Math.max(0, Number(item.commentsCount) || 0),
      images: Array.isArray(item.images) ? item.images : [],
      comments: Array.isArray(item.comments) ? item.comments : [],
    };
    upsertNewsListCounters(newsUi.activeItem);
  }

  function openNewsImage(index) {
    const images = Array.isArray(newsUi.activeItem?.images) ? newsUi.activeItem.images : [];
    if (!images.length) return;
    newsUi.lightboxIndex = Math.max(0, Math.min(images.length - 1, Number(index) || 0));
    renderNewsFeed();
  }

  function closeNewsImage() {
    newsUi.lightboxIndex = -1;
    renderNewsFeed();
  }

  function renderNewsImages(container, images, options = {}) {
    const list = Array.isArray(images) ? images.filter((image) => image && image.url) : [];
    if (!list.length) return;
    const wrap = document.createElement('div');
    wrap.className = options.detail ? 'news-media-carousel' : 'news-media-strip';
    list.forEach((image, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'news-media-thumb';
      const img = document.createElement('img');
      img.src = String(image.url || '');
      img.alt = String(image.alt || '');
      img.loading = 'lazy';
      btn.appendChild(img);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (options.detail) openNewsImage(index);
        else void openNewsItem(options.newsId || newsUi.activeId || '');
      });
      wrap.appendChild(btn);
    });
    container.appendChild(wrap);
  }

  function renderNewsLightbox() {
    const images = Array.isArray(newsUi.activeItem?.images) ? newsUi.activeItem.images : [];
    const rawIndex = Number(newsUi.lightboxIndex);
    const index = Number.isFinite(rawIndex) ? Math.max(-1, Math.min(images.length - 1, rawIndex)) : -1;
    if (index < 0 || !images[index]) return null;
    const overlay = document.createElement('div');
    overlay.className = 'news-lightbox';
    overlay.addEventListener('click', closeNewsImage);

    const panel = document.createElement('div');
    panel.className = 'news-lightbox-panel';
    panel.addEventListener('click', (e) => e.stopPropagation());

    const img = document.createElement('img');
    img.src = String(images[index].url || '');
    img.alt = String(images[index].alt || '');

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'mini news-lightbox-close';
    closeBtn.textContent = 'x';
    closeBtn.addEventListener('click', closeNewsImage);

    const counter = document.createElement('div');
    counter.className = 'news-lightbox-counter';
    counter.textContent = `${index + 1} / ${images.length}`;

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'mini news-lightbox-prev';
    prevBtn.textContent = '<';
    prevBtn.disabled = images.length <= 1;
    prevBtn.addEventListener('click', () => {
      newsUi.lightboxIndex = (index - 1 + images.length) % images.length;
      renderNewsFeed();
    });

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'mini news-lightbox-next';
    nextBtn.textContent = '>';
    nextBtn.disabled = images.length <= 1;
    nextBtn.addEventListener('click', () => {
      newsUi.lightboxIndex = (index + 1) % images.length;
      renderNewsFeed();
    });

    panel.appendChild(img);
    panel.appendChild(closeBtn);
    panel.appendChild(counter);
    panel.appendChild(prevBtn);
    panel.appendChild(nextBtn);
    overlay.appendChild(panel);
    return overlay;
  }

  function updateMenuUrlState(tabId, newsId = '') {
    const url = new URL(window.location.href);
    const tab = String(tabId || '').trim().toLowerCase();
    if (tab && tab !== 'run') url.searchParams.set('tab', tab);
    else url.searchParams.delete('tab');
    const id = String(newsId || '').trim();
    if (tab === 'news' && id) url.searchParams.set('news', id);
    else url.searchParams.delete('news');
    window.history.replaceState({}, document.title, url.toString());
  }

  function buildNewsShareUrl(newsId) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'news');
    url.searchParams.set('news', String(newsId || '').trim());
    return url.toString();
  }

  function showNewsShareToast() {
    newsUi.shareCopied = true;
    if (newsShareToastTimer) {
      clearTimeout(newsShareToastTimer);
      newsShareToastTimer = null;
    }
    renderNewsFeed();
    newsShareToastTimer = setTimeout(() => {
      newsUi.shareCopied = false;
      newsShareToastTimer = null;
      renderNewsFeed();
    }, 2000);
  }

  async function shareNewsLink(newsId) {
    const id = String(newsId || '').trim();
    if (!id) return;
    const shareUrl = buildNewsShareUrl(id);
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(shareUrl);
      showNewsShareToast();
      return;
    }
    const ta = document.createElement('textarea');
    ta.value = shareUrl;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (ok) showNewsShareToast();
  }

  async function deleteNewsComment(newsId, { commentId, parentId = '' } = {}) {
    const newsKey = String(newsId || '').trim();
    const commentKey = String(commentId || '').trim();
    if (!newsKey || !commentKey || newsUi.postingComment) return;
    newsUi.postingComment = true;
    newsUi.commentError = '';
    renderNewsFeed();
    try {
      const query = parentId ? ('?parentId=' + encodeURIComponent(String(parentId || '').trim())) : '';
      const res = await fetch('/api/news/' + encodeURIComponent(newsKey) + '/comments/' + encodeURIComponent(commentKey) + query, {
        method: 'DELETE',
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.ok || !payload?.item) {
        throw new Error(payload?.message || ('HTTP ' + res.status));
      }
      setNewsDetailItem(payload.item);
      updateMenuUrlState('news', newsKey);
      newsUi.replyTargetId = '';
    } catch (err) {
      newsUi.commentError = err?.message || 'Failed to delete comment.';
    } finally {
      newsUi.postingComment = false;
      renderNewsFeed();
    }
  }

  async function submitNewsComment(newsId, { text, parentId = '' } = {}) {
    const bodyText = String(text || '').trim();
    if (!bodyText || newsUi.postingComment) return;
    newsUi.postingComment = true;
    newsUi.commentError = '';
    renderNewsFeed();
    try {
      const res = await fetch('/api/news/' + encodeURIComponent(newsId) + '/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: bodyText, parentId: String(parentId || '').trim() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.ok || !payload?.item) {
        throw new Error(payload?.message || ('HTTP ' + res.status));
      }
      setNewsDetailItem(payload.item);
      updateMenuUrlState('news', String(newsId || '').trim());
      if (parentId) {
        delete newsUi.replyDraftByParent[parentId];
        newsUi.replyTargetId = '';
      } else {
        newsUi.commentDraft = '';
      }
    } catch (err) {
      newsUi.commentError = err?.message || 'Failed to send comment.';
    } finally {
      newsUi.postingComment = false;
      renderNewsFeed();
    }
  }

  function renderNewsReplyComposer(container, parentId) {
    const wrap = document.createElement('div');
    wrap.className = 'news-comment-compose news-comment-reply-compose';

    const identity = document.createElement('div');
    identity.className = 'news-comment-identity';
    const hero = getActiveHeroLabel();
    identity.textContent = trWithFallback('ui.news.comment_as', 'Комментируете как') + ' ' + String(game.playerAuth?.player?.nickname || 'Player') + (hero ? ' · ' + hero : '');

    const input = document.createElement('textarea');
    input.className = 'news-comment-input';
    input.rows = 2;
    input.maxLength = 1500;
    input.placeholder = trWithFallback('ui.news.comment_placeholder', 'Напишите комментарий...');
    input.value = String(newsUi.replyDraftByParent[parentId] || '');
    input.addEventListener('input', () => {
      newsUi.replyDraftByParent[parentId] = input.value;
    });

    const actions = document.createElement('div');
    actions.className = 'news-comment-actions';

    const sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.className = 'mini';
    sendBtn.textContent = newsUi.postingComment ? trWithFallback('ui.news.sending', 'Отправка...') : trWithFallback('ui.news.send', 'Отправить');
    sendBtn.disabled = newsUi.postingComment || !input.value.trim();
    sendBtn.addEventListener('click', () => {
      void submitNewsComment(newsUi.activeId, { text: input.value, parentId });
    });
    const refreshSendState = () => {
      sendBtn.disabled = newsUi.postingComment || !input.value.trim();
    };
    input.addEventListener('input', refreshSendState);
    input.addEventListener('keydown', (e) => {
      if (!e.isComposing && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!sendBtn.disabled) sendBtn.click();
      }
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'mini';
    cancelBtn.textContent = trWithFallback('ui.news.cancel', 'Отмена');
    cancelBtn.disabled = newsUi.postingComment;
    cancelBtn.addEventListener('click', () => {
      newsUi.replyTargetId = '';
      renderNewsFeed();
    });
    const shortcutHint = document.createElement('span');
    shortcutHint.className = 'news-comment-shortcut-hint';
    shortcutHint.textContent = NEWS_COMMENT_SHORTCUT_HINT;

    actions.appendChild(sendBtn);
    actions.appendChild(cancelBtn);
    actions.appendChild(shortcutHint);
    wrap.appendChild(identity);
    wrap.appendChild(input);
    wrap.appendChild(actions);
    container.appendChild(wrap);
  }

  function renderNewsCommentNode(comment, isReply = false, parentCommentId = '') {
    const item = document.createElement('div');
    item.className = isReply ? 'news-comment news-comment-reply' : 'news-comment';

    const isLoggedIn = Boolean(game.playerAuth?.player);
    const parentId = String(comment?.id || '').trim();
    const myAccountId = Math.max(0, Number(game.playerAuth?.player?.id) || 0);
    const commentOwnerId = Math.max(0, Number(comment?.authorAccountId) || 0);
    const canDelete = Boolean(isLoggedIn && myAccountId > 0 && commentOwnerId === myAccountId && parentId);

    const head = document.createElement('div');
    head.className = 'news-comment-head';

    const authorAccountId = Math.max(0, Number(comment?.authorAccountId) || 0);
    const authorNameText = String(comment?.authorName || 'Player');
    const author = document.createElement('button');
  author.type = 'button';
  author.className = 'news-comment-author news-comment-author-btn';
  author.textContent = authorNameText;
  author.addEventListener('click', () => {
    void globalThis.CWProfileModal?.openFromComment?.(authorAccountId, authorNameText);
  });

    const meta = document.createElement('div');
    meta.className = 'news-comment-meta';
    const heroLabel = getCommentHeroLabel(comment);
    if (heroLabel) {
      const hero = document.createElement('span');
      hero.className = 'news-comment-hero';
      hero.textContent = heroLabel;
      meta.appendChild(hero);
    }
    const date = document.createElement('span');
    date.className = 'news-comment-date';
    date.textContent = formatNewsDate(comment?.createdAt || 0);
    meta.appendChild(date);

    head.appendChild(author);
    head.appendChild(meta);

    const text = document.createElement('div');
    text.className = 'news-comment-text';
    text.textContent = String(comment?.text || '');

    item.appendChild(head);
    item.appendChild(text);

    const actionsRow = document.createElement('div');
    actionsRow.className = 'news-comment-actions-row';
    let hasActions = false;

    if (!isReply && isLoggedIn && parentId) {
      const replyBtn = document.createElement('button');
      replyBtn.type = 'button';
      replyBtn.className = 'mini news-comment-reply-btn';
      replyBtn.textContent = newsUi.replyTargetId === parentId ? trWithFallback('ui.news.close_reply', 'Закрыть ответ') : trWithFallback('ui.news.reply', 'Ответить');
      replyBtn.addEventListener('click', () => {
        newsUi.replyTargetId = newsUi.replyTargetId === parentId ? '' : parentId;
        renderNewsFeed();
      });
      actionsRow.appendChild(replyBtn);
      hasActions = true;
    }

    if (canDelete) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'mini news-comment-delete-btn';
      deleteBtn.textContent = trWithFallback('ui.news.delete', 'Удалить');
      deleteBtn.disabled = newsUi.postingComment;
      deleteBtn.addEventListener('click', () => {
        void deleteNewsComment(newsUi.activeId, {
          commentId: parentId,
          parentId: isReply ? parentCommentId : '',
        });
      });
      actionsRow.appendChild(deleteBtn);
      hasActions = true;
    }

    if (hasActions) {
      item.appendChild(actionsRow);
    }

    if (!isReply && isLoggedIn && parentId && newsUi.replyTargetId === parentId) {
      renderNewsReplyComposer(item, parentId);
    }

    const replies = Array.isArray(comment?.replies) ? comment.replies : [];
    if (replies.length > 0) {
      const repliesWrap = document.createElement('div');
      repliesWrap.className = 'news-comment-replies';
      for (const reply of replies) {
        repliesWrap.appendChild(renderNewsCommentNode(reply, true, parentId));
      }
      item.appendChild(repliesWrap);
    }

    return item;
  }

  function renderNewsFeed() {
    if (!newsFeedEl) return;

    newsFeedEl.innerHTML = '';

    if (newsUi.loading && newsUi.items.length === 0 && !newsUi.activeItem) {
      const loading = document.createElement('div');
      loading.className = 'news-sub';
      loading.textContent = trWithFallback('ui.news.loading_news', 'Загрузка новостей...');
      newsFeedEl.appendChild(loading);
      return;
    }

    if (newsUi.error && newsUi.items.length === 0 && !newsUi.activeItem) {
      const error = document.createElement('div');
      error.className = 'news-sub';
      error.textContent = newsUi.error;
      newsFeedEl.appendChild(error);
      return;
    }

    if (newsUi.activeItem) {
      const detailActions = document.createElement('div');
      detailActions.className = 'news-detail-actions';
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'mini news-back-btn';
      backBtn.textContent = trWithFallback('ui.news.back', '← К списку новостей');
      backBtn.addEventListener('click', () => {
        newsUi.activeId = '';
        newsUi.activeItem = null;
        newsUi.itemError = '';
        newsUi.commentError = '';
        newsUi.replyTargetId = '';
        newsUi.shareCopied = false;
        newsUi.lightboxIndex = -1;
        updateMenuUrlState('news', '');
        renderNewsFeed();
      });
      const shareBtn = document.createElement('button');
      shareBtn.type = 'button';
      shareBtn.className = 'mini news-share-btn';
      shareBtn.textContent = newsUi.shareCopied ? trWithFallback('ui.news.share_copied', 'Ссылка скопирована') : trWithFallback('ui.news.share', 'Поделиться');
      shareBtn.addEventListener('click', async () => {
        try {
          await shareNewsLink(newsUi.activeId);
        } catch {
          newsUi.commentError = trWithFallback('ui.news.share_copy_failed', 'Не удалось скопировать ссылку.');
          renderNewsFeed();
        }
      });
      detailActions.appendChild(backBtn);
      detailActions.appendChild(shareBtn);
      newsFeedEl.appendChild(detailActions);

      if (newsUi.loadingItem) {
        const loadingItem = document.createElement('div');
        loadingItem.className = 'news-sub';
        loadingItem.textContent = trWithFallback('ui.news.opening', 'Открываем новость...');
        newsFeedEl.appendChild(loadingItem);
        return;
      }

      if (newsUi.itemError) {
        const itemError = document.createElement('div');
        itemError.className = 'news-sub';
        itemError.textContent = newsUi.itemError;
        newsFeedEl.appendChild(itemError);
        return;
      }

      const item = newsUi.activeItem;

      const article = document.createElement('article');
      article.className = 'news-item news-item-detail';

      const h = document.createElement('h3');
      h.className = 'news-item-title';
      h.textContent = String(item?.title || trWithFallback('ui.news.untitled', 'Без названия'));

      const meta = document.createElement('div');
      meta.className = 'news-item-meta';
      meta.textContent = formatNewsDate(item?.publishedAt) + ' | ' + trWithFallback('ui.news.views', 'Просмотры') + ': ' + (Math.max(0, Number(item?.views) || 0)) + ' | ' + trWithFallback('ui.news.comments_count', 'Комментарии') + ': ' + (Math.max(0, Number(item?.commentsCount) || 0));

      const summary = document.createElement('div');
      summary.className = 'news-sub';
      summary.textContent = String(item?.summary || '');

      article.appendChild(h);
      article.appendChild(meta);
      if (summary.textContent) article.appendChild(summary);
      renderNewsImages(article, item?.images, { detail: true, newsId: item?.id || '' });

      const lines = Array.isArray(item?.items) ? item.items : [];
      if (lines.length > 0) {
        const list = document.createElement('div');
        list.className = 'news-list';
        for (const line of lines) {
          const row = document.createElement('div');
          row.textContent = '- ' + String(line || '').replace(/^[-\s]+/, '');
          list.appendChild(row);
        }
        article.appendChild(list);
      }

      newsFeedEl.appendChild(article);

      const commentsTitle = document.createElement('div');
      commentsTitle.className = 'news-comments-title';
      commentsTitle.textContent = trWithFallback('ui.news.comments', 'Комментарии');

      const isLoggedIn = Boolean(game.playerAuth?.player);
      if (isLoggedIn) {
        const compose = document.createElement('div');
        compose.className = 'news-comment-compose';

        const identity = document.createElement('div');
        identity.className = 'news-comment-identity';
        const hero = getActiveHeroLabel();
        identity.textContent = trWithFallback('ui.news.comment_as', 'Комментируете как') + ' ' + String(game.playerAuth?.player?.nickname || 'Player') + (hero ? ' · ' + hero : '');
        compose.appendChild(identity);

        const input = document.createElement('textarea');
        input.className = 'news-comment-input';
        input.rows = 3;
        input.maxLength = 1500;
        input.placeholder = trWithFallback('ui.news.comment_placeholder', 'Напишите комментарий...');
        input.value = newsUi.commentDraft;
        input.addEventListener('input', () => {
          newsUi.commentDraft = input.value;
        });

        const actions = document.createElement('div');
        actions.className = 'news-comment-actions';

        const sendBtn = document.createElement('button');
        sendBtn.type = 'button';
        sendBtn.className = 'mini';
        sendBtn.textContent = newsUi.postingComment ? trWithFallback('ui.news.sending', 'Отправка...') : trWithFallback('ui.news.send', 'Отправить');
        sendBtn.disabled = newsUi.postingComment || !input.value.trim();
        sendBtn.addEventListener('click', () => {
          void submitNewsComment(item.id, { text: input.value });
        });
        const refreshSendState = () => {
          sendBtn.disabled = newsUi.postingComment || !input.value.trim();
        };
        input.addEventListener('input', refreshSendState);
        input.addEventListener('keydown', (e) => {
          if (!e.isComposing && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!sendBtn.disabled) sendBtn.click();
          }
        });
        const shortcutHint = document.createElement('span');
        shortcutHint.className = 'news-comment-shortcut-hint';
        shortcutHint.textContent = NEWS_COMMENT_SHORTCUT_HINT;

        actions.appendChild(sendBtn);
        actions.appendChild(shortcutHint);
        compose.appendChild(input);
        compose.appendChild(actions);
        newsFeedEl.appendChild(compose);
      } else {
        const authHint = document.createElement('div');
        authHint.className = 'news-sub';
        authHint.textContent = trWithFallback('ui.news.auth_hint', 'Войдите в аккаунт, чтобы оставлять комментарии и ответы.');
        newsFeedEl.appendChild(authHint);
      }

      if (newsUi.commentError) {
        const commentError = document.createElement('div');
        commentError.className = 'news-sub';
        commentError.textContent = newsUi.commentError;
        newsFeedEl.appendChild(commentError);
      }

      newsFeedEl.appendChild(commentsTitle);

      const commentsWrap = document.createElement('div');
      commentsWrap.className = 'news-comments-wrap';
      const comments = Array.isArray(item?.comments) ? item.comments : [];
      if (comments.length <= 0) {
        const empty = document.createElement('div');
        empty.className = 'news-sub';
        empty.textContent = trWithFallback('ui.news.no_comments', 'Пока нет комментариев.');
        commentsWrap.appendChild(empty);
      } else {
        for (const comment of comments) {
          commentsWrap.appendChild(renderNewsCommentNode(comment, false));
        }
      }
      newsFeedEl.appendChild(commentsWrap);
      const lightbox = renderNewsLightbox();
      if (lightbox) newsFeedEl.appendChild(lightbox);
      return;
    }

    const items = Array.isArray(newsUi.items) ? newsUi.items : [];
    if (items.length <= 0) {
      const empty = document.createElement('div');
      empty.className = 'news-sub';
      empty.textContent = trWithFallback('ui.news.empty', 'Пока новостей нет.');
      newsFeedEl.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'news-items';
    for (const item of items) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'news-item news-item-button';

      const h = document.createElement('div');
      h.className = 'news-item-title';
      h.textContent = String(item?.title || trWithFallback('ui.news.untitled', 'Без названия'));

      const meta = document.createElement('div');
      meta.className = 'news-item-meta';
      meta.textContent = formatNewsDate(item?.publishedAt) + ' | ' + trWithFallback('ui.news.views', 'Просмотры') + ': ' + (Math.max(0, Number(item?.views) || 0)) + ' | ' + trWithFallback('ui.news.comments_count', 'Комментарии') + ': ' + (Math.max(0, Number(item?.commentsCount) || 0));

      const summary = document.createElement('div');
      summary.className = 'news-sub';
      summary.textContent = String(item?.summary || '');

      card.appendChild(h);
      card.appendChild(meta);
      if (summary.textContent) card.appendChild(summary);
      renderNewsImages(card, item?.images, { detail: false, newsId: item?.id || '' });

      card.addEventListener('click', () => {
        void openNewsItem(item?.id || '');
      });

      list.appendChild(card);
    }
    newsFeedEl.appendChild(list);
  }

  async function requestNewsFeed(options = {}) {
    const force = options?.force === true;
    const now = Date.now();
    if (!force && !newsUi.loading && newsUi.items.length > 0 && (now - newsUi.lastLoadedAt) < newsUi.cacheMs) {
      renderNewsFeed();
      return;
    }
    const token = newsUi.fetchToken + 1;
    newsUi.fetchToken = token;
    newsUi.loading = true;
    newsUi.error = '';
    renderNewsFeed();
    try {
      const res = await fetch('/api/news', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const payload = await res.json();
      if (newsUi.fetchToken !== token) return;
      newsUi.items = Array.isArray(payload?.items) ? payload.items : [];
      newsUi.lastLoadedAt = Date.now();
      newsUi.error = '';
      if (newsUi.activeItem) upsertNewsListCounters(newsUi.activeItem);
    } catch (err) {
      if (newsUi.fetchToken !== token) return;
      newsUi.error = err?.message || 'Failed to load news.';
    } finally {
      if (newsUi.fetchToken === token) {
        newsUi.loading = false;
        renderNewsFeed();
      }
    }
  }

  async function openNewsItem(newsId, { force = false } = {}) {
    const id = String(newsId || '').trim();
    if (!id) return;
    if (newsUi.loadingItem) return;
    if (!force && newsUi.activeItem && newsUi.activeId === id) {
      renderNewsFeed();
      return;
    }

    const token = newsUi.itemFetchToken + 1;
    newsUi.itemFetchToken = token;
    newsUi.loadingItem = true;
    newsUi.itemError = '';
    newsUi.commentError = '';
    newsUi.replyTargetId = '';
    newsUi.activeId = id;
    newsUi.activeItem = null;
    renderNewsFeed();

    try {
      const res = await fetch('/api/news/' + encodeURIComponent(id), { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (newsUi.itemFetchToken !== token) return;
      if (!res.ok || !payload?.ok || !payload?.item) {
        throw new Error(payload?.message || ('HTTP ' + res.status));
      }
      setNewsDetailItem(payload.item);
      updateMenuUrlState('news', id);
    } catch (err) {
      if (newsUi.itemFetchToken !== token) return;
      newsUi.itemError = err?.message || 'Failed to open news.';
    } finally {
      if (newsUi.itemFetchToken === token) {
        newsUi.loadingItem = false;
        renderNewsFeed();
      }
    }
  }

  function resetActiveDetail() {
    newsUi.activeId = '';
    newsUi.activeItem = null;
    newsUi.itemError = '';
    newsUi.commentError = '';
    newsUi.replyTargetId = '';
    newsUi.shareCopied = false;
    newsUi.lightboxIndex = -1;
    updateMenuUrlState('news', '');
    renderNewsFeed();
  }

  function clearShareState() {
    newsUi.shareCopied = false;
  }

  globalThis.CWNews = {
    render: renderNewsFeed,
    request: requestNewsFeed,
    open: openNewsItem,
    resetActiveDetail,
    clearShareState,
    updateMenuUrlState,
    hasActiveItem: () => Boolean(newsUi.activeItem),
  };
  globalThis.renderNewsFeed = renderNewsFeed;

  void requestNewsFeed({ force: false });
  try {
    const params = new URLSearchParams(window.location.search);
    const initialNewsId = String(params.get('news') || '').trim();
    const activeTab = typeof currentMainMenuTab === 'string' ? currentMainMenuTab : String(params.get('tab') || 'run').trim();
    if (activeTab === 'news' && initialNewsId) {
      void openNewsItem(initialNewsId, { force: true });
    }
  } catch {}
})();
