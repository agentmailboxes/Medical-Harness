# Deployment

medical-harness serves the frontend and API from the same FastAPI application. Every deployment needs `CEREBRAS_API_KEY` and `MEDISEARCH_API_KEY` set on the host. Keep `.env` local; it is excluded from Git and Vercel uploads.

## Vercel

Vercel recognizes `app.main:app` through `pyproject.toml`. `vercel.json` gives the Function 180 seconds, longer than the app's default 150-second request timeout. The Python runtime serves the UI and API together.

1. In Vercel, create a project from this GitHub repository. Leave the root directory at the repository root and use the detected FastAPI settings.
2. Add both provider keys under **Project Settings → Environment Variables** for Production. Add Preview only if preview deployments should call the providers.
3. Keep the committed `static/dist/`, `static/build.json`, and regional atlas files. These are built locally/CI; production does not run npm. Scratch artifacts, tests, evaluations, and `.env` are excluded from uploads.
4. Deploy a preview. Check `/api/health`, the home page, `/docs`, and a synthetic question. Confirm no 3D assets download until opening a relevant scene.

You can also deploy a linked local checkout with:

```bash
vercel link --project medical-harness
vercel deploy --target preview
```

The refactor links a project named `medical-harness` and connects the GitHub repository. Preview and Production provider variables are configured as sensitive values. Verify Git integration and the production branch in Vercel settings before relying on automatic deployments. Merge the reviewed PR when ready; use `vercel deploy --prod` only for an intentional production deployment. A preview may require the owner's Vercel session because of deployment protection.

Vercel Functions scale independently. In-memory caches, concurrency slots, and rate limits are per instance. Use external shared infrastructure if you need global quotas or durable state. The application has no user authentication or database.

## Docker

```bash
docker build -t medical-harness .
docker run --env-file .env -p 8080:8080 medical-harness
```

`Dockerfile` installs runtime dependencies with uv and runs Uvicorn as a non-root user. The health endpoint is `/api/health`. `docker run --env-file` passes keys at runtime; they are not baked into the image.

## DigitalOcean App Platform

The example `deploy/app-spec.yaml` uses a container image in DigitalOcean Container Registry. Build and push a `medical-harness` image to your registry, update the repository/tag fields, and provide provider values as secrets in the console. The Docker and DigitalOcean paths are documented but were not deployed during this refactor.

## Before sharing a public URL

Check that the home page, `/api/health`, and an ordinary answer work. Review provider costs, request limits, deployment protection, and privacy expectations for your audience. See [SECURITY.md](../SECURITY.md).
