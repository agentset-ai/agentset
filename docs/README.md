# Agentset Documentation

Source for the Agentset docs at [docs.agentset.ai](https://docs.agentset.ai), built with [Mintlify](https://mintlify.com).

## Structure

- `docs.json` — site navigation, theme, and settings ([schema reference](https://mintlify.com/docs.json))
- `get-started/`, `data-ingestion/`, `search-and-retrieval/`, `production/`, `webhooks/`, `cookbooks/` — Documentation tab
- `open-source/` — Self-hosting guide
- `api-reference/` — API reference pages (endpoint pages are generated from the OpenAPI spec configured in `docs.json`)
- `changelog.mdx` — Changelog tab

## Local development

Install the [Mintlify CLI](https://mintlify.com/docs/installation) and run the dev server from this directory (where `docs.json` lives):

```bash
npm i -g mint
mint dev
```

The preview runs at `http://localhost:3000`.

## Publishing

Changes merged to `main` are deployed automatically by the Mintlify GitHub App.
