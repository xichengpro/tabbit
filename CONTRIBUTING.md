# Contributing

## Local checks

Before opening a pull request:

```bash
npm run typecheck
npm test
npm run build
```

## Pull requests

- Keep each PR focused on one user-visible or infrastructure change.
- Include acceptance steps and screenshots/GIFs for UI changes.
- Add tests for rules, rewards, migrations, and destructive operations.
- Put every manifest permission change in a dedicated PR.
- Never add remote executable code, broad host permissions, or telemetry without an explicit product/privacy decision.

## Commits

Use Conventional Commits, for example:

- `feat(pet): add curious state animation`
- `fix(organizer): preserve recovery snapshot after a partial close`
- `docs(privacy): explain optional tabs permission`

## Product guardrails

- The pet does not shame, threaten, die, or punish missed streaks.
- No tab is closed, moved, muted, or grouped without a user-confirmed action.
- Base functionality must work without URL, title, history, or page-content access.
- Privacy claims must describe the shipped code, not future intent.
