# Node Web App Runner Image

This image backs the Axiom Docker build profile:

```text
ghcr.io/science451/axiom-build-node-webapp:latest
```

It provides Node.js, npm, and the `ax` CLI inside the runner container. The host launcher mounts source read-only at `/workspace/source`, generated output at `/workspace/generated`, and reports at `/workspace/reports`.

## Build Locally

```bash
npm run docker:runner:build
```

## Smoke Test

```bash
npm run docker:runner:smoke
```

The smoke command starts the image and verifies that the `ax` command is available on `PATH`.

## Publish

```bash
docker push ghcr.io/science451/axiom-build-node-webapp:latest
```

Publishing requires Docker authentication with permission to push to the Science451 GHCR package.

## Axiom Build Use

Intent files opt into this runner through:

```js
security: {
  build: {
    mode: "docker",
    profile: "node-webapp"
  }
}
```

The host `ax build` command launches this image and runs:

```bash
ax build <intent-file> --inside-runner
```

This is a development runner image. It is not yet a hardened production sandbox: image signing, provenance, SBOMs, and stricter runtime hardening are future work.
