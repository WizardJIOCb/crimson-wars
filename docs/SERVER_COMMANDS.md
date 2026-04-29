# Server Commands (Crimson Wars)

Рабочая памятка по production-серверу `crimsonwars.ru`.

## Подключение

```bash
ssh root@82.146.42.213
cd /var/www/crimsonwars.ru
```

## Обновить код и перезапустить

```bash
git fetch origin main
git checkout main
git pull --ff-only origin main
npm install --omit=dev
./deploy/restart-crimson-services.sh
```

Проверить инстансы:

```bash
systemctl is-active crimson-wars crimson-wars-2 crimson-wars-3 crimson-wars-4
```

## Статус и логи

```bash
systemctl status crimson-wars --no-pager
journalctl -u crimson-wars -n 120 --no-pager
```

Все игровые инстансы:

```bash
journalctl -u crimson-wars -u crimson-wars-2 -u crimson-wars-3 -u crimson-wars-4 -n 160 --no-pager
```

Следить за логами:

```bash
journalctl -u crimson-wars -u crimson-wars-2 -u crimson-wars-3 -u crimson-wars-4 -f
```

## Health checks

```bash
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:8080/readyz
curl -fsS http://127.0.0.1:8080/api/runtime
```

Через домен:

```bash
curl -fsS https://crimsonwars.ru/healthz
curl -fsS https://crimsonwars.ru/readyz
```

## Порты

```bash
ss -ltnp | grep -E ':8080|:8081|:8082|:8083'
```

## Production env

Посмотреть override основного сервиса:

```bash
systemctl cat crimson-wars
```

Редактировать override:

```bash
sudo systemctl edit crimson-wars
sudo systemctl daemon-reload
sudo systemctl restart crimson-wars crimson-wars-2 crimson-wars-3 crimson-wars-4
```

Ключевые переменные:

```ini
DATA_STORE=mysql
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=crimson_wars
MYSQL_USER=crimson_wars_app
MYSQL_PASSWORD=...
PUBLIC_BASE_URL=https://crimsonwars.ru
SESSION_COOKIE_DOMAIN=.crimsonwars.ru
ADMIN_BOOTSTRAP_PASSWORD=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
VK_CLIENT_ID=...
VK_CLIENT_SECRET=...
VK_SERVICE_TOKEN=...
```

## MySQL

Открыть shell:

```bash
mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p "$MYSQL_DATABASE"
```

Если переменные заданы только в systemd, удобнее сначала посмотреть их через `systemctl cat crimson-wars` и подставить вручную.

Список таблиц:

```sql
SHOW TABLES;
```

Количество рекордов:

```sql
SELECT COUNT(*) FROM records;
```

Top-20 рекордов:

```sql
SELECT id, name, attempts, kills, score, room_code, duration_sec, FROM_UNIXTIME(at / 1000) AS played_at
FROM records
ORDER BY kills DESC, score DESC, at DESC
LIMIT 20;
```

Последние забеги:

```sql
SELECT id, name, kills, score, room_code, duration_sec, FROM_UNIXTIME(at / 1000) AS played_at
FROM player_runs
ORDER BY at DESC
LIMIT 20;
```

Очистить рейтинг и историю забегов:

```sql
TRUNCATE TABLE records;
TRUNCATE TABLE player_runs;
```

## Миграция файлов в MySQL

Перед миграцией сделать backup `data/`:

```bash
tar -czf "/root/crimson-data-backup-$(date +%Y%m%d-%H%M%S).tar.gz" data
```

Импорт без очистки:

```bash
DATA_STORE=mysql npm run migrate:mysql
```

Импорт с очисткой целевых таблиц:

```bash
DATA_STORE=mysql npm run migrate:mysql -- --truncate
```

## Файловый fallback

Если MySQL не включён, данные лежат в `data/`.

Основные файлы:

```text
data/records.db
data/player-auth.db
data/admin-auth.db
data/runtime-registry.db
data/news.json
```

SQLite shell для fallback-рейтинга:

```bash
sqlite3 /var/www/crimsonwars.ru/data/records.db
```

Top-20 в fallback:

```sql
SELECT id, name, attempts, kills, score, room_code, duration_sec, at
FROM records
ORDER BY kills DESC, score DESC, at DESC
LIMIT 20;
```

Очистить fallback-рейтинг:

```sql
DELETE FROM records;
DELETE FROM player_runs;
DELETE FROM sqlite_sequence WHERE name IN ('records', 'player_runs');
```

## Nginx

Проверить конфиг:

```bash
nginx -t
systemctl reload nginx
```

Логи nginx:

```bash
tail -n 120 /var/log/nginx/error.log
tail -n 120 /var/log/nginx/access.log
```

## Быстрая диагностика лагов

Во время активного боя база не должна получать частые записи. Если снова появляются лаги:

```bash
journalctl -u crimson-wars -u crimson-wars-2 -u crimson-wars-3 -u crimson-wars-4 -n 240 --no-pager | grep -Ei 'mysql|persist|records|failed|slow|error'
```

Проверить нагрузку:

```bash
top
iostat -xz 1 5
```

Если `iostat` не установлен:

```bash
apt install -y sysstat
```
