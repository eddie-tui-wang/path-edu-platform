# Development preferences

- For every frontend change, read `docs/design-system/交互与UI原则.md` first; use `docs/design-system/师生端设计审计_20260910.md` as the design-debt checklist. Update evidence/status after verification, not merely after compilation.
- Keep page actions separate from filters. Recording belongs only to teaching records. Root pages do not need back buttons; record details do. Never add duplicate summary/status cards without clear scope and traceable evidence.
- Use shared controls and concise copy; retain meaningful failure, data-loss and simulation provenance information. Check large option sets, keyboard access, narrow layouts and unsaved-data behavior before reporting completion.

- Follow the Ponytail skill for subsequent coding work, as explicitly requested by the user: prefer existing code, native features and the smallest maintainable solution.
- Never simplify away authorization, validation, data safety, accessibility or tests.
- Ponytail audits are reports only; do not apply suggested deletions without a separate implementation request.
- Preserve the independent project boundary. Do not change the old research platform.
- Hospital branding uses the supplied public logo and the semantic colors in app/migrated.css. Do not recolor pathology images or annotation categories to match the theme.
