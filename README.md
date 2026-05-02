# Crimson Wars

Crimson Wars - браузерный co-op arena shooter в духе Crimsonland: быстрые забеги, комнаты по коду, живой Battle Hub, герои, экипировка, таланты, рейтинг, новости, повторы и live-витрина матча.

## Текущий статус

Проект находится в активной разработке. Основной фокус сейчас: боевой runtime без лагов, аккуратный Battle Hub, прогресс аккаунта и постепенный рефакторинг больших файлов без поломки существующих маршрутов и форматов данных.

Сейчас реализовано:

- Авторитетный Node.js сервер на `express` + `ws`.
- Комнаты по коду матча, PvE/PvP-настройки, активные комнаты в Battle Hub.
- Canvas-клиент с движением, стрельбой, врагами, боссами, дропами, прыжками, эффектами попаданий, повторами и spectator/live showcase.
- Battle Hub с вкладками `Играть`, `Персонажи`, `Навыки`, `Профиль`, `Рейтинг`, `Новости`, `Настройки`.
- Авторизация гостем, логином/паролем, Google OAuth, VK ID и Mail.ru через VK ID provider route.
- Прогресс аккаунта: герои, уровни, осколки, таланты, уникальные навыки, инвентарь, экипировка и боевые расходники.
- Рейтинги, история забегов, публичные профили, replay-ссылки.
- Единый Admin Hub с разделами для карт, кампаний, новостей и навыков.
- Хранилище в файловом режиме по умолчанию и MySQL-режим для production.

Важное правило производительности: во время активного боя не пишем в базу. Комнаты, игроки, враги, снаряды и эффекты живут в памяти процесса. Результат забега, replay и прогресс сохраняются после завершения забега через persist-очередь.

## Стек

- Runtime: Node.js 20+
- Server: Express, WebSocket `ws`
- Storage: `better-sqlite3`/JSON fallback и MySQL 8 production mode
- Client: обычные HTML/CSS/JS script-теги, React UMD для Battle Hub shell
- Deploy: nginx + systemd, несколько Node-инстансов за `/api/room-route`

## Структура

```text
server.js                         # основной сервер, WebSocket lifecycle и пока часть HTTP API
server/config.js                  # игровые константы, герои, предметы, навыки, экономика
server/http/                      # вынесенные HTTP routes
server/services/                  # доменные сервисы, сейчас leaderboard
server/game/                      # чистые игровые утилиты
server/*-store.js                 # stores для auth, records, news, skills, progression
server/run-persistence-worker.js  # сохранение результата забега после боя
public/play.html                  # страница игры и Battle Hub
public/index.html                 # главная страница
public/js/cw-menu-react.js        # shell и базовая структура меню
public/js/client-core.js          # клиентское состояние, auth, socket bridge, HUD, audio
public/js/client-net-input.js     # input, сеть, replay playback и часть orchestration
public/js/client-menu-*.js        # вынесенные вкладки меню
public/js/client-render.js        # canvas render
public/style.css                  # общий UI/HUD CSS
data/                             # локальные файлы данных в fallback-режиме
docs/                             # рабочая документация
deploy/                           # systemd/nginx/restart scripts
```

Подробный статус рефакторинга: [docs/ARCHITECTURE_REFACTOR_PLAN.md](docs/ARCHITECTURE_REFACTOR_PLAN.md).

## Локальный запуск

```bash
npm install
npm start
```

Открыть:

```text
http://localhost:8080
```

Для Windows можно использовать:

```bat
start-dev.bat
```

Проверки перед коммитом:

```bash
npm run build
npm run check:encoding
git diff --check
```

`npm run build` сейчас выполняет синтаксическую проверку основных server/client файлов через `node --check`.

## Локальная MySQL

Файловый режим работает без MySQL. Если нужно проверить production-like backend локально:

```bash
copy .env.mysql.local.example .env.mysql.local
npm run db:local:up
npm run db:local:migrate
```

Запуск сервера в MySQL-режиме из PowerShell:

```powershell
$env:DATA_STORE='mysql'
$env:MYSQL_HOST='127.0.0.1'
$env:MYSQL_PORT='3307'
$env:MYSQL_DATABASE='crimson_wars'
$env:MYSQL_USER='crimson_wars_app'
$env:MYSQL_PASSWORD='<password-from-.env.mysql.local>'
npm start
```

MySQL-режим использует CLI-клиент `mysql`. Если он не в `PATH`, задайте:

```powershell
$env:MYSQL_CLI='C:\Path\To\mysql.exe'
```

Остановить локальную базу:

```bash
npm run db:local:down
```

## Хранилище данных

По умолчанию используются локальные файлы:

- `data/records.db` - рекорды, история забегов и replay fallback.
- `data/player-auth.db` - игроки, логин/пароль и social identities fallback.
- `data/admin-auth.db` - администраторы fallback.
- `data/runtime-registry.db` - registry инстансов fallback, если включено persistence.
- `data/news.json` - новости fallback.

MySQL включается одной из переменных:

```ini
DATA_STORE=mysql
STORAGE_BACKEND=mysql
MYSQL_ENABLED=1
```

Основные переменные MySQL:

```ini
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=crimson_wars
MYSQL_USER=crimson_wars_app
MYSQL_PASSWORD=...
MYSQL_CLI=mysql
```

Миграция файловой базы в MySQL:

```bash
npm run migrate:mysql
```

С очисткой целевых таблиц перед импортом:

```bash
npm run migrate:mysql -- --truncate
```

## Админки

Admin Hub:

- `/admin`

Админка навыков:

- `/admin/skills`
- `/admin-skills.html`

Админка новостей:

- `/admin/news`
- `/admin-news.html`

Локальный bootstrap-админ:

- Логин: `WizardJIOCb`
- Пароль по умолчанию в dev: `WizardJIOCb-local`

В production пароль обязательно задаётся через env:

```ini
ADMIN_BOOTSTRAP_LOGIN=WizardJIOCb
ADMIN_BOOTSTRAP_PASSWORD=CHANGE_ME_STRONG_PASSWORD
```

Админ с правом управления администраторами может создавать, менять, отключать и удалять админ-учётки. Нельзя удалить/отключить самого себя и нельзя оставить проект без последнего manager-админа.

## OAuth

Поддерживаемые routes:

- `/api/auth/google/start`
- `/api/auth/google/callback`
- `/api/auth/vk/start`
- `/api/auth/mailru/start`
- `/api/auth/vk/callback`

Production env без секретов в репозитории:

```ini
PUBLIC_BASE_URL=https://crimsonwars.ru
SESSION_COOKIE_DOMAIN=.crimsonwars.ru
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://crimsonwars.ru/api/auth/google/callback
VK_CLIENT_ID=...
VK_CLIENT_SECRET=...
VK_SERVICE_TOKEN=...
VK_REDIRECT_URI=https://crimsonwars.ru/api/auth/vk/callback
```

Mail.ru сейчас идёт через VK ID OAuthList/provider route. Если Mail.ru отключён в кабинете VK ID, кнопка или callback могут не работать.

## API и страницы

Основные страницы:

- `/` - landing/live showcase.
- `/play` - игра и Battle Hub.
- `/admin` - единый Admin Hub.
- `/admin/skills` - админка навыков.
- `/admin/news` - админка новостей.
- `/ui-atlas-1.html` - рабочий UI atlas playground.

Health/runtime:

- `/healthz`
- `/readyz`
- `/api/runtime`

Игровые и публичные API:

- `/api/rooms`
- `/api/records`
- `/api/leaderboard`
- `/api/leaderboard/runs/:id/replay`
- `/api/player/me`
- `/api/player/run-history`
- `/api/player/public-profile/:id`
- `/api/news`
- `/api/skills`

## Production deploy

Директория проекта:

```bash
cd /var/www/crimsonwars.ru
```

Обновить код:

```bash
git fetch origin main
git checkout main
git pull --ff-only origin main
npm ci --omit=dev
```

Перезапустить все инстансы:

```bash
./deploy/restart-crimson-services.sh
```

Проверить статус:

```bash
systemctl is-active crimson-wars crimson-wars-2 crimson-wars-3 crimson-wars-4
```

Логи:

```bash
journalctl -u crimson-wars -u crimson-wars-2 -u crimson-wars-3 -u crimson-wars-4 -n 120 --no-pager
```

Порты:

```bash
ss -ltnp | grep -E ':8080|:8081|:8082|:8083'
```

Подробные команды: [docs/SERVER_COMMANDS.md](docs/SERVER_COMMANDS.md).

## Production env

Production systemd override:

```bash
sudo mkdir -p /etc/systemd/system/crimson-wars.service.d
sudo nano /etc/systemd/system/crimson-wars.service.d/override.conf
```

Пример:

```ini
[Service]
Environment=NODE_ENV=production
Environment=PUBLIC_BASE_URL=https://crimsonwars.ru
Environment=SESSION_COOKIE_DOMAIN=.crimsonwars.ru
Environment=DATA_STORE=mysql
Environment=MYSQL_HOST=127.0.0.1
Environment=MYSQL_PORT=3306
Environment=MYSQL_DATABASE=crimson_wars
Environment=MYSQL_USER=crimson_wars_app
Environment=MYSQL_PASSWORD=CHANGE_ME
Environment=ADMIN_BOOTSTRAP_LOGIN=WizardJIOCb
Environment=ADMIN_BOOTSTRAP_PASSWORD=CHANGE_ME_STRONG_PASSWORD
```

После изменения:

```bash
sudo systemctl daemon-reload
sudo systemctl restart crimson-wars crimson-wars-2 crimson-wars-3 crimson-wars-4
```

## Настройки боя

Респаун:

```ini
PLAYER_RESPAWN_MODE=none
PLAYER_RESPAWN_DELAY_MS=3000
PLAYER_RESPAWN_EXTRA_LIVES=2
PLAYER_RESPAWN_START_TOKENS=1
```

Режимы:

- `none` - без респауна, смерть завершает забег.
- `lives` - ограниченные жизни.
- `token` - респаун за токены.

PvP:

```ini
PVP_MAX_PLAYERS=16
PVP_RESPAWN_DELAY_MS=2500
PVP_PLAYER_SCORE_KILL=120
PVP_ENEMY_SPAWN_MUL=0.2
PVP_ENEMY_HP_MUL=0.9
```

## Ассеты

Часть временных ассетов взята из открытых источников:

- `public/assets/sprites/player_dude.png` - Phaser 3 Examples.
- `public/assets/sprites/enemy_mummy.png` - Phaser 3 Examples.
- `public/assets/sprites/tree.png` - Phaser 3 Examples.
- `public/assets/tiles/ground_grass.jpg` - three.js examples textures.

Перед коммерческим релизом нужно отдельно проверить лицензии всех ассетов и заменить временные материалы на финальные.
