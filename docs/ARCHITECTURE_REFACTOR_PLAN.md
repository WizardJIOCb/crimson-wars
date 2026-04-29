# Crimson Wars: архитектура и план рефакторинга

Дата среза: 2026-04-29.

## Текущее состояние

Crimson Wars сейчас состоит из одного Node.js процесса на инстанс, статического клиента без bundler и WebSocket-симуляции боя. Основной боевой runtime остаётся в памяти процесса: комнаты, игроки, враги, снаряды, эффекты и активный забег не должны синхронно писать в базу во время боя.

После завершения забега результат, replay и прогресс игрока передаются в persist-очередь и сохраняются отдельно. Это важное правило производительности: любые новые механики боя сначала должны жить в памяти, а в долговременное хранилище попадать только на безопасных контрольных точках.

Самые крупные runtime-файлы сейчас:

| Строк | Файл | Роль |
| ---: | --- | --- |
| 5716 | `server.js` | Express/WebSocket wiring, OAuth, часть HTTP API, room lifecycle и игровой tick. |
| 5659 | `public/style.css` | Общие стили HUD, Battle Hub, меню, инвентаря, рейтинга, новостей и адаптива. |
| 5180 | `public/js/client-net-input.js` | Сетевой клиент, replay/game playback, input и часть orchestration. |
| 3080 | `public/js/client-core.js` | Базовое состояние клиента, auth UI, socket bridge, audio, HUD и настройки. |
| 2567 | `public/landing.css` | Стили главной страницы и live-витрины. |
| 2301 | `public/landing.js` | Логика главной, live showcase и последние забеги. |
| 1437 | `public/js/client-render.js` | Canvas render loop, игроки, враги, снаряды и HUD над персонажем. |
| 1215 | `public/js/client-menu-characters.js` | Roster, Loadout, инвентарь, таланты и навыки героя. |
| 542 | `server/config.js` | Игровые константы, герои, предметы, навыки, экономика и пути data-файлов. |
| 391 | `public/js/cw-menu-react.js` | Battle Hub shell, вкладки и базовые React-панели меню. |

## Уже вынесено

- `server/services/leaderboard-service.js`: доменная логика рейтингов и категорий лидерборда.
- `server/http/leaderboard-routes.js`: API рейтинга, рекордов и replay endpoints.
- `server/http/news-routes.js`: API новостей и админские endpoints новостей.
- `server/game/math.js`: чистая игровая математика.
- `public/js/client-menu-news.js`: вкладка новостей и просмотр отдельной новости.
- `public/js/client-menu-rating.js`: вкладка рейтинга.
- `public/js/client-menu-profile.js`: вкладка профиля.
- `public/js/client-profile-modal.js`: публичная модалка профиля игрока.
- `public/js/client-hero-equip-modal.js`: модалка выбора предмета для слота.
- `public/js/client-menu-characters.js`: персонажи, экипировка, инвентарь, таланты и уникальные навыки.
- `public/js/client-records-list.js`: список рекордов и пагинация.
- `public/js/client-rooms-list.js`: presence, список активных комнат и кнопки входа.
- `public/js/client-death.js`: death overlay, награды забега, кровь на экране и камера смерти.
- `server/run-persistence-worker.js`: фоновое сохранение результата забега и прогресса после боя.

После текущего выноса `client-net-input.js` уменьшен примерно с 8569 до 5180 строк, а `server.js` примерно с 6928 до 5716 строк.

## Хранилище данных

По умолчанию проект может работать в файловом режиме: SQLite-файлы и JSON лежат в `data/`.

Production-режим может использовать MySQL, если включить `DATA_STORE=mysql`, `STORAGE_BACKEND=mysql` или `MYSQL_ENABLED=1`. Поддерживаемые переменные:

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_CLI`

В MySQL-режиме stores используют синхронный CLI-клиент `mysql`, поэтому особенно важно не делать такие вызовы в горячем боевом цикле. Для активного боя использовать только память процесса и уже существующие in-memory кеши.

## Главные проблемы

- `client-net-input.js` всё ещё смешивает сетевые события, input, replay UI и replay playback.
- `server.js` всё ещё смешивает HTTP routes, OAuth, WebSocket lifecycle и боевую симуляцию.
- `client-core.js` содержит много общей глобальной инициализации: auth, audio, DOM refs, HUD, настройки.
- `public/style.css` большой и содержит поздние override-блоки, из-за чего мелкая правка может неожиданно задеть другие экраны.
- Stores поддерживают и MySQL, и файловый fallback, поэтому код местами дублирует одни и те же операции для разных backend.

## Правила безопасного рефакторинга

- Не менять форму WebSocket payload без отдельного миграционного шага.
- Не писать в базу во время активного боя.
- Не менять replay format без обратной совместимости.
- Каждый перенос заканчивать проверками `npm run build`, `npm run check:encoding` и `git diff --check`.
- Оставлять старые глобальные функции-обёртки или `globalThis.*` API, пока клиент грузится обычными script-тегами без bundler.
- Для новых UI-модулей держать DOM-id стабильными, потому что часть старого клиента всё ещё ищет элементы через `document.getElementById`.

## Ближайший план

1. Отделить replay modal UI от replay playback, не меняя формат повторов.
2. Вынести player/progression routes из `server.js` в `server/http/player-routes.js`.
3. Вынести admin/auth routes в отдельные route-модули.
4. Разделить `client-core.js` на `client-state`, `client-auth`, `client-audio`, `client-settings`.
5. Вернуться к game domain: weapons, skills, replay capture и serialization.

## Позже

- Разбить `public/style.css` на логические CSS-файлы или хотя бы жёстко секционировать его.
- Сократить дубли store-кода между MySQL/file режимами через общие адаптеры.
- Добавить smoke-скрипт для `/healthz`, `/readyz`, `/api/runtime`, `/api/skills` и базовой загрузки `/play`.
- Подготовить переход от глобальных script-тегов к сборке только после стабилизации текущего рефакторинга.
