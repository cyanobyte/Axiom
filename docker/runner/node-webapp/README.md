# Node Web App Runner Image

This image backs the Axiom Docker build profile:

```text
axiom-build-node-webapp:local
```

It provides Node.js, npm, and the `ax` CLI inside the runner container. The host launcher mounts source read-only at `/workspace/source`, generated output at `/workspace/generated`, and reports at `/workspace/reports`.

The image is intentionally local-only and is not published to any registry. `ax build` will build it automatically the first time you run a Docker-backed build; you can also build it manually with the script below.

## Build Locally

```bash
npm run docker:runner:build
```

## Smoke Test

```bash
npm run docker:runner:smoke
```

The smoke command starts the image and verifies that the `ax` command is available on `PATH`.

## Rebuild After Axiom Changes

The auto-build only triggers when the image is missing. After pulling Axiom source updates, force a rebuild with:

```bash
docker image rm axiom-build-node-webapp:local
```

The next `ax build` will rebuild the image from the updated source. Alternatively, run `npm run docker:runner:build` directly.

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
