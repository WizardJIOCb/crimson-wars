# Server Commands (Crimson Wars)

## SSH to server
```bash
ssh root@82.146.42.213
```

## Project directory
```bash
cd /var/www/crimson.rodion.pro
```

## Deploy latest main
```bash
git fetch origin main
git checkout main
git pull --ff-only origin main
systemctl restart crimson-wars
systemctl is-active crimson-wars
```

## Service status and logs
```bash
systemctl status crimson-wars --no-pager
journalctl -u crimson-wars -n 120 --no-pager
```

## Records DB location
```bash
/var/www/crimson.rodion.pro/data/records.db
```

## Open SQLite shell
```bash
sqlite3 /var/www/crimson.rodion.pro/data/records.db
```

## List tables
```sql
.tables
```

## Show records schema
```sql
.schema records
```

## Count records
```sql
SELECT COUNT(*) FROM records;
```

## Show top 20 records
```sql
SELECT id, name, kills, score, room_code, duration_sec, at
FROM records
ORDER BY kills DESC, score DESC, at DESC
LIMIT 20;
```

## Show one record by id
```sql
SELECT * FROM records WHERE id = 1;
```

## Update one record example
```sql
UPDATE records
SET kills = 999, score = 9990
WHERE id = 1;
```

## Delete one record
```sql
DELETE FROM records WHERE id = 1;
```

## Clear all records
```sql
DELETE FROM records;
DELETE FROM sqlite_sequence WHERE name = 'records';
```

## Verify clear
```sql
SELECT COUNT(*) FROM records;
```
