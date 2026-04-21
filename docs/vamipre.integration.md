# Vampire Integration

Документ описывает интеграцию между внешней игрой и `Crimson Wars` для сценария:

1. Внешняя игра вызывает наш end-point и стартует специальный забег.
2. Игрок открывает наш `joinUrl` и играет забег.
3. После завершения забега `Crimson Wars` вызывает callback end-point внешней игры и передает награду и статистику.

## Production base

Наш production base URL:

```text
https://crimson.rodion.pro
```

## Переменные окружения на нашей стороне

```ini
PARTNER_RUNS_START_SECRET=84f9344f18fc8344635614ad2dc6f19fb62054ce8587c325
PARTNER_RUNS_CALLBACK_BASE_URL=https://BASE_URL_ДРУГОЙ_ИГРЫ
PARTNER_RUNS_CALLBACK_SECRET=138317058078a57d7580ead6be98eb288f3547e06a8b9111
PARTNER_RUNS_SESSION_TTL_MS=1800000
PUBLIC_BASE_URL=https://crimson.rodion.pro
```

Где:

- `PARTNER_RUNS_START_SECRET` - секрет, с которым внешняя игра вызывает наш start end-point.
- `PARTNER_RUNS_CALLBACK_BASE_URL` - базовый URL внешней игры. Его вы подставите сами.
- `PARTNER_RUNS_CALLBACK_SECRET` - секрет, который мы прикладываем в callback во внешнюю игру.
- `PARTNER_RUNS_SESSION_TTL_MS` - время жизни `integrationToken`.
- `PUBLIC_BASE_URL` - публичный URL нашего клиента, из него строится `joinUrl`.

## 1. Start end-point у нас

`POST https://crimson.rodion.pro/api/integrations/partner-runs/start`

### Заголовки

```http
Content-Type: application/json
X-Crimson-Integration-Secret: 84f9344f18fc8344635614ad2dc6f19fb62054ce8587c325
```

Можно также передавать секрет через:

```http
Authorization: Bearer 84f9344f18fc8344635614ad2dc6f19fb62054ce8587c325
```

### Тело запроса

```json
{
  "partnerRunId": "vw-raid-20260421-0001",
  "externalPlayerId": "player-7741",
  "playerName": "Vlad",
  "heroId": "cyber",
  "roomCode": "VAMP42",
  "gameMode": "normal",
  "pvpDurationMin": 10,
  "callbackPath": "/api/integrations/crimson-wars/run-complete",
  "requestedBy": "vampire-wars-backend",
  "metadata": {
    "seasonId": "s3",
    "rewardPackId": "zombie_pack_alpha"
  }
}
```

### Поля

- `partnerRunId` - обязательный id забега во внешней игре.
- `externalPlayerId` - обязательный id игрока во внешней игре.
- `playerName` - ник, с которым игрок зайдет в наш ран.
- `heroId` - герой в нашем ранe.
- `roomCode` - необязательно, если нужен свой код комнаты.
- `gameMode` - `normal`, `hardcore` или `pvp`.
- `pvpDurationMin` - только для `pvp`, допустимые значения: `3`, `5`, `10`, `15`.
- `callbackPath` - обязательный path callback-а на стороне внешней игры. Должен начинаться с `/`.
- `requestedBy` - кто инициировал запрос.
- `metadata` - любые дополнительные данные, которые мы потом вернем в callback как есть.

### Успешный ответ

```json
{
  "ok": true,
  "integration": "partner-runs",
  "session": {
    "integrationToken": "7f9f8e2b2cf5f0f0d47c4e00ebf84a7c5a3f",
    "expiresAt": 1770000000000,
    "roomCode": "VAMP42",
    "gameMode": "normal",
    "pvpDurationMin": 10,
    "playerName": "Vlad",
    "heroId": "cyber",
    "partnerRunId": "vw-raid-20260421-0001",
    "externalPlayerId": "player-7741"
  },
  "launch": {
    "joinUrl": "https://crimson.rodion.pro/?room=VAMP42&mode=join&integrationToken=7f9f8e2b2cf5f0f0d47c4e00ebf84a7c5a3f&name=Vlad&heroId=cyber",
    "websocketJoinPayload": {
      "type": "join",
      "roomCode": "VAMP42",
      "name": "Vlad",
      "playerClass": "cyber",
      "integrationToken": "7f9f8e2b2cf5f0f0d47c4e00ebf84a7c5a3f"
    }
  },
  "callback": {
    "baseUrlConfigured": true,
    "baseUrl": "https://BASE_URL_ДРУГОЙ_ИГРЫ",
    "path": "/api/integrations/crimson-wars/run-complete"
  }
}
```

## 2. Как запускать игру после start

Есть 2 варианта.

### Вариант A. Открывать наш `joinUrl`

Самый простой путь: внешняя игра вызывает `POST https://crimson.rodion.pro/api/integrations/partner-runs/start`, получает `launch.joinUrl` и открывает его у игрока.

Пример:

```text
https://crimson.rodion.pro/?room=VAMP42&mode=join&integrationToken=...&name=Vlad&heroId=cyber
```

Наш клиент:

- подставит `room`,
- подставит `integrationToken`,
- автоматически отправит `join` в websocket,
- привяжет этот забег к интеграционной сессии.

### Вариант B. Самостоятельно делать websocket `join`

Если внешний клиент управляет подключением вручную, он может использовать `launch.websocketJoinPayload`.

Обязательное поле для интеграционного ранa:

- `integrationToken`

Если `integrationToken` неверный, просрочен или уже использован, join будет отклонен.

## 3. Callback, который мы вызываем во внешнюю игру

После завершения ранa `Crimson Wars` делает:

`POST {PARTNER_RUNS_CALLBACK_BASE_URL}{callbackPath}`

Например:

```text
POST https://BASE_URL_ДРУГОЙ_ИГРЫ/api/integrations/crimson-wars/run-complete
```

### Заголовки callback

```http
Content-Type: application/json
X-Crimson-Integration-Event: run.completed
X-Crimson-Integration-Secret: 138317058078a57d7580ead6be98eb288f3547e06a8b9111
```

### Тело callback-а

```json
{
  "event": "crimson-wars.run.completed",
  "sentAt": "2026-04-21T18:45:12.000Z",
  "partnerRunId": "vw-raid-20260421-0001",
  "externalPlayerId": "player-7741",
  "integrationToken": "7f9f8e2b2cf5f0f0d47c4e00ebf84a7c5a3f",
  "roomCode": "VAMP42",
  "player": {
    "name": "Vlad",
    "accountId": 17,
    "heroId": "cyber"
  },
  "stats": {
    "gameMode": "normal",
    "score": 1480,
    "kills": 93,
    "bossKills": 1,
    "survivalSec": 402,
    "enemyKills": 93,
    "pvpKills": 0,
    "pvpDeaths": 0
  },
  "rewards": {
    "gainedXp": 693,
    "gainedShards": 185,
    "levelsGained": 2,
    "gainedCards": []
  },
  "progression": {
    "accountLevel": 7,
    "accountXp": 81,
    "xpToNext": 322
  },
  "run": {
    "startedAt": "2026-04-21T18:38:30.000Z",
    "finishedAt": "2026-04-21T18:45:12.000Z",
    "durationSec": 402,
    "details": {
      "gameMode": "normal",
      "playerClass": "cyber"
    }
  },
  "metadata": {
    "seasonId": "s3",
    "rewardPackId": "zombie_pack_alpha"
  }
}
```

## 4. Готовые примеры для партнёра

### Пример вызова нашего API через curl

```bash
curl -X POST "https://crimson.rodion.pro/api/integrations/partner-runs/start" \
  -H "Content-Type: application/json" \
  -H "X-Crimson-Integration-Secret: 84f9344f18fc8344635614ad2dc6f19fb62054ce8587c325" \
  -d '{
    "partnerRunId": "vw-raid-20260421-0001",
    "externalPlayerId": "player-7741",
    "playerName": "Vlad",
    "heroId": "cyber",
    "gameMode": "normal",
    "callbackPath": "/api/integrations/crimson-wars/run-complete",
    "metadata": {
      "seasonId": "s3",
      "rewardPackId": "zombie_pack_alpha"
    }
  }'
```

### Пример backend callback endpoint у партнёра на Express

```js
app.post('/api/integrations/crimson-wars/run-complete', express.json(), (req, res) => {
  const secret = req.header('X-Crimson-Integration-Secret');
  if (secret !== '138317058078a57d7580ead6be98eb288f3547e06a8b9111') {
    return res.status(401).json({ ok: false, message: 'invalid secret' });
  }

  const payload = req.body;

  // 1. Найти у себя запись по partnerRunId
  // 2. Проверить externalPlayerId
  // 3. Начислить награду игроку
  // 4. Сохранить статистику забега

  return res.json({ ok: true });
});
```

## 5. Рекомендуемый flow

1. Backend внешней игры вызывает наш `POST https://crimson.rodion.pro/api/integrations/partner-runs/start`.
2. Сохраняет у себя `partnerRunId`.
3. Открывает игроку `launch.joinUrl`.
4. Игрок проходит забег в `Crimson Wars`.
5. После смерти или окончания забега мы вызываем callback во внешнюю игру.
6. Внешняя игра по `partnerRunId` и `externalPlayerId` начисляет свою награду или закрывает квест.

## 6. Ограничения текущей реализации

- `integrationToken` одноразовый.
- Сессия хранится в памяти процесса и живет до `PARTNER_RUNS_SESSION_TTL_MS`.
- Если сервер перезапустится до входа игрока в ран, start придется вызвать заново.
- Callback сейчас отправляется один раз сразу после завершения ранa.
