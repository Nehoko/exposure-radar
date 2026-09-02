# Contributing to Exposure Radar

Thanks for helping improve Exposure Radar. Small, focused changes are easiest to
review and maintain.

## Before you start

- Search existing issues before opening a new one.
- Open an issue before a large architectural change.
- Keep portfolio data, API keys, access tokens, and other secrets out of issues,
  commits, screenshots, fixtures, and logs.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Local setup

Install Deno 2.9 and SpacetimeDB CLI 2.8, then run:

```bash
cp frontend/.env.example frontend/.env.local
deno task check
deno task test
deno task dev
```

Run SpacetimeDB locally and publish the module when backend work needs it:

```bash
spacetime start
deno task spacetime:publish:local
```

After changing the SpacetimeDB schema, regenerate client bindings:

```bash
deno task spacetime:generate
```

Generated files under `frontend/src/module_bindings` should not be edited by
hand.

## Pull requests

Before submitting a pull request:

```bash
deno task check
deno task test
deno task build
```

Explain what changed, why it changed, and how it was tested. Include screenshots
for visible UI changes. Avoid unrelated formatting or refactoring.

## Data providers

New providers must:

- keep credentials server-side;
- clearly identify delayed, stale, sample, or missing data;
- document attribution and commercial-use requirements;
- avoid committing real API responses when their licence forbids redistribution;
- fail without exposing credentials or private portfolio information.

See [DATA_LICENSING.md](DATA_LICENSING.md) before adding a provider.

## Licence for contributions

By submitting a contribution, you agree to license it under `AGPL-3.0-or-later`,
the same licence used by this project. You confirm that you have the right to
submit it.
