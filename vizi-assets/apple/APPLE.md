# Apple

**Bundle ID:** `com.vizi.mobile.app`

## Auth keys (local only — gitignored)

Place Apple auth key `.p8` files in this folder. Filenames are local; **do not** commit `.p8` files or paste key contents into git.

| Purpose | Local filename pattern |
|---|---|
| APNs | `AuthKey_*.p8` (APNs) |
| App Store Connect API | `AuthKey_*.p8` (ASC) |

Configure paths via EAS secrets / CI env vars, not committed markdown.
