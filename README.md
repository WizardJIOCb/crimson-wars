# Crimson Wars

Веб-арена-шутер (inspired by Crimsonland) с мультиплеером до 8 игроков в одной комнате.

## Реализовано
- Авторитетный Node.js сервер (`express` + `ws`)
- Комнаты по коду матча (`room code`)
- До 8 игроков на комнату
- Движение, стрельба, враги, респавн
- Оружие: `Pistol`, `SMG`, `Shotgun`, `Sniper`
- Дропы оружия с мобов
- Таблица очков и отображение оружия/патронов
- Визуальные улучшения:
  - Спрайтовый анимированный игрок
  - Спрайтовые анимированные монстры
  - Эффекты крови при попаданиях
  - Вспышки выстрелов (muzzle flash)
  - Текстурная земля
  - Деревья в случайных местах (общие для комнаты)

## Локальный запуск
```bash
npm install
npm start
```
Открыть: `http://localhost:8080`

Для локальной разработки также можно использовать:
```bash
start-dev.bat
```

Локальная админка:
- URL: `http://localhost:8080/admin-skills.html`
- Логин: `WizardJIOCb`
- Пароль: `WizardJIOCb-local`

## Админка навыков и администраторы

Админка навыков находится по адресу:
- `/admin/skills`
- `/admin-skills.html`

Доступ в админку теперь идёт через обычный логин и пароль, а не через `token` в URL.

Первый bootstrap-админ:
- Логин: `WizardJIOCb`
- Для локальной разработки пароль по умолчанию: `WizardJIOCb-local`
- Для production пароль должен быть задан через переменную окружения `ADMIN_BOOTSTRAP_PASSWORD`

Что может делать админ с правом управления администраторами:
- создавать новые учётные записи админов
- менять логин администратора
- менять пароль администратора
- отключать (`disable`) учётные записи
- удалять учётные записи

Ограничения безопасности:
- админ не может удалить сам себя
- админ не может отключить сам себе доступ
- нельзя удалить или отключить последнего администратора, у которого есть право управлять другими админами

Если при создании нового администратора пароль оставить пустым, система сгенерирует пароль автоматически и покажет его в интерфейсе один раз.

## Игровой поток
- На входе можно создать комнату (авто-код) или войти по коду.
- Код комнаты можно отправить друзьям.
- Дропы поднимаются при касании.
- `1` переключает на `Pistol`.

## Деплой на сервер `82.146.42.213`

### 1) DNS
A-запись:
- `crimson.rodion.pro` -> `82.146.42.213`

### 2) Установка окружения (Ubuntu)
```bash
sudo apt update
sudo apt install -y nginx nodejs npm certbot python3-certbot-nginx
```

### 3) Заливка проекта
```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
git clone <YOUR_REPO_URL> /var/www/crimson-wars
cd /var/www/crimson-wars
npm install --omit=dev
```

### 4) systemd
```bash
sudo cp /var/www/crimson-wars/deploy/crimson-wars.service /etc/systemd/system/crimson-wars.service
sudo systemctl daemon-reload
sudo systemctl enable --now crimson-wars
sudo systemctl status crimson-wars
```

Для production обязательно задайте bootstrap-пароль первого администратора, например через override:
```bash
sudo mkdir -p /etc/systemd/system/crimson-wars.service.d
sudo nano /etc/systemd/system/crimson-wars.service.d/override.conf
```

Пример содержимого:
```ini
[Service]
Environment=ADMIN_BOOTSTRAP_LOGIN=WizardJIOCb
Environment=ADMIN_BOOTSTRAP_PASSWORD=CHANGE_ME_STRONG_PASSWORD
```

После изменения:
```bash
sudo systemctl daemon-reload
sudo systemctl restart crimson-wars
```

### 5) nginx
```bash
sudo cp /var/www/crimson-wars/deploy/nginx.crimson.rodion.pro.conf /etc/nginx/sites-available/crimson.rodion.pro
sudo ln -sf /etc/nginx/sites-available/crimson.rodion.pro /etc/nginx/sites-enabled/crimson.rodion.pro
sudo nginx -t
sudo systemctl reload nginx
```

### 6) HTTPS
```bash
sudo certbot --nginx -d crimson.rodion.pro
```

## Ассеты (открытые источники)
- `public/assets/sprites/player_dude.png`
  - Source: Phaser 3 Examples repository
  - URL: `https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/dude.png`
- `public/assets/sprites/enemy_mummy.png`
  - Source: Phaser 3 Examples repository
  - URL: `https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/metalslug_mummy37x45.png`
- `public/assets/sprites/tree.png`
  - Source: Phaser 3 Examples repository
  - URL: `https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/tree.png`
- `public/assets/tiles/ground_grass.jpg`
  - Source: three.js examples textures
  - URL: `https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/terrain/grasslight-big.jpg`

Проверьте соответствие лицензий вашей коммерческой модели перед релизом.

## Полезно для продакшена
- SSH: `ssh root@82.146.42.213`
- Директория проекта: `cd /var/www/crimson.rodion.pro`
- Обновить код на проде:
  ```bash
  git fetch origin main
  git checkout main
  git pull --ff-only origin main
  ```
- Перезапустить весь прод:
  ```bash
  ./deploy/restart-crimson-services.sh
  ```
- Проверить, что все инстансы поднялись:
  ```bash
  systemctl is-active crimson-wars crimson-wars-2 crimson-wars-3 crimson-wars-4
  ```
- Логи основного инстанса: `journalctl -u crimson-wars -f`
- Логи всех инстансов:
  ```bash
  journalctl -u crimson-wars -u crimson-wars-2 -u crimson-wars-3 -u crimson-wars-4 -n 120 --no-pager
  ```
- Проверка портов:
  ```bash
  ss -ltnp | grep -E ':8080|:8081|:8082|:8083'
  ```

### Очистка таблицы рейтинга на проде

База рекордов находится в:

```bash
/var/www/crimson.rodion.pro/data/records.db
```

Очистить все записи рейтинга:

```bash
sqlite3 /var/www/crimson.rodion.pro/data/records.db "DELETE FROM records; DELETE FROM sqlite_sequence WHERE name = 'records';"
```

Проверить, что таблица пуста:

```bash
sqlite3 /var/www/crimson.rodion.pro/data/records.db "SELECT COUNT(*) FROM records;"
```
