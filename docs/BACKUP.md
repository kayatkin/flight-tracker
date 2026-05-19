# Backup: stable version before monetization

## Snapshot

| Item | Value |
|------|--------|
| Tag | `v2.0.0-stable` |
| Branch | `backup/pre-monetization-2026-05-19` |
| Commit | `fda3ac7` — Migrate to Vite and secure Supabase access with JWT auth |
| Date | 2026-05-19 |

## Restore this exact version

```bash
cd ~/Documents/flight-tracker
git fetch --tags
git checkout v2.0.0-stable
```

Or stay on backup branch:

```bash
git checkout backup/pre-monetization-2026-05-19
```

## Return to monetization work

```bash
git checkout feature/monetization-i18n
```

## Archive (optional)

```bash
./scripts/backup.sh
```

Creates `../flight-tracker-backup-YYYYMMDD.tar.gz` excluding `node_modules`.

## Push backup to GitHub

```bash
git push origin v2.0.0-stable
git push origin backup/pre-monetization-2026-05-19
```
