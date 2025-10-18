<p align="center">
  <a href="https://agentset.ai">
    <img src=".github/assets/readme-cover.png" alt="Agentset — Build frontier RAG apps" />
  </a>
  
</p>

<h1 align="center">Agentset</h1>

<p align="center">
  <a href="https://docs.agentset.ai">Docs</a> ·
  <a href="https://github.com/agentset-ai/agentset/issues/new?template=bug_report.md">Report a bug</a> ·
  <a href="https://github.com/agentset-ai/agentset/issues/new?template=feature_request.md">Feature request</a> ·
  <a href="https://github.com/agentset-ai/agentset/releases">Changelog</a>
</p>

<p align="center">
  We hang out on Discord — <a href="https://discord.gg/agentset" target="_blank">join us</a>.
</p>

<p align="center">
  <a href="LICENSE.md"><img src="https://img.shields.io/github/license/agentset-ai/agentset?label=license&logo=github" alt="License" /></a>
  <a href="https://github.com/agentset-ai/agentset/issues"><img src="https://img.shields.io/github/issues/agentset-ai/agentset" alt="Issues" /></a>
  <a href="https://github.com/agentset-ai/agentset/graphs/contributors"><img src="https://img.shields.io/github/contributors/agentset-ai/agentset" alt="Contributors" /></a>
  <a href="https://github.com/agentset-ai/agentset/commits/main"><img src="https://img.shields.io/github/last-commit/agentset-ai/agentset" alt="Last Commit" /></a>
  <a href="https://github.com/agentset-ai/agentset"><img src="https://img.shields.io/github/commit-activity/m/agentset-ai/agentset?label=commit%20activity" alt="Commit activity" /></a>
  <!-- Live online count badge (enable when widget is on)
  <a href="https://discord.com/invite/XNcrk6bv"><img src="https://img.shields.io/discord/1356204157488332831?label=discord&logo=discord&logoColor=white&color=5865F2&cacheSeconds=300" alt="Discord online" /></a>
  -->
  <a href="https://discord.com/invite/XNcrk6bv"><img src="https://img.shields.io/badge/discord-join-5865F2?logo=discord&logoColor=white" alt="Join Discord" /></a>
  <!-- <a href="https://agentset.ai"><img src="https://img.shields.io/badge/visit-agentset.ai-0A0A0A" alt="Visit agentset.ai" /></a> -->
</p>

Agentset is the open-source platform to build, evaluate, and ship production-ready RAG and agentic applications. It provides end-to-end tooling: ingestion, vector indexing, evaluation/benchmarks, chat playground, hosting, and a clean API with first-class developer experience.

<!-- Screenshot (scaled down) -->
<br/>
<p align="center">
  <img src=".github/assets/screenshot.png" alt="Agentset screenshot" width="600" />
</p>

## Features

- Turnkey RAG: ingestion, chunking, embeddings, and retrieval
- Model agnostic: works with your choice of LLM, embeddings, and vector DB
- Benchmarks and evals to track quality over time
- Chat playground with message editing and citations
- Production hosting with preview links and custom domains
- API + typed SDKs, OpenAPI spec
- Built-in multi-tenancy
- Built with TypeScript, Next.js, AI SDK, Prisma, Supabase, and Trigger.dev

## Getting Started

### Agentset Cloud

The fastest way to get started with Agentset. Generous free tier with 1,000 pages and 10,000 retrievals. No credit card required.

- Sign up: https://app.agentset.ai/login

### Self-host Agentset

Follow our complete guide: https://docs.agentset.ai/open-source/self-hosting

## Quick Start (Local Development)

```bash
# 1) Copy env and fill required values
cp .env.example .env

# 2) Install dependencies
pnpm install

# 3) Run database migrations (from the repo root)
pnpm db:deploy

# 4) Start the app
pnpm dev:web
```

Useful scripts:

- `pnpm db:studio` – open Prisma Studio
- `pnpm dev:web` – run only the web app

## Star Us

If you find Agentset useful, please give the repo a star — it helps a lot!

<br/>
<img src=".github/assets/star-us.png" alt="Star Agentset on GitHub" width="200" />

## Contributing

We <3 contributions big and small. Feel free to:

- Open an issue for bugs and feature ideas
- Submit a PR with focused changes
- Improve docs or examples

Not sure where to start? Check existing issues: https://github.com/agentset-ai/agentset/issues

## License

MIT :)

## Star History

[GitHub Star History](https://www.star-history.com/#agentset-ai/agentset)

<a href="https://star-history.com/#agentset-ai/agentset&Date">
  <img src="https://api.star-history.com/svg?repos=agentset-ai/agentset&type=Date" alt="Star History Chart" />
</a>

---

Made with ❤️ by the Agentset team.
