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
- Логи сервиса: `journalctl -u crimson-wars -f`
- Перезапуск: `sudo systemctl restart crimson-wars`
- Проверка порта: `ss -ltnp | grep 8080`
