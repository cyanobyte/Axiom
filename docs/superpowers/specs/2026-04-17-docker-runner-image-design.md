# Docker Runner Image Design

## Goal

Make the `node-webapp` Docker build runner image reproducible from this repository.

The Docker build runner launcher now expects an official image tag:

```text
ghcr.io/science451/axiom-build-node-webapp:latest
```

This spec adds the first repo-owned image definition for that tag, plus lightweight documentation and scripts so local smoke tests no longer depend on an ad hoc Dockerfile outside the repository.

## Scope

In scope:

- add a Dockerfile for the `node-webapp` runner profile
- build an image that provides the `ax` CLI inside the container
- keep the image aligned with the existing runner contract:
  - source is mounted at `/workspace/source`
  - generated output is mounted at `/workspace/generated`
  - reports are mounted at `/workspace/reports`
  - inner command is `ax build <intent> --inside-runner`
- add package scripts for building the image and running a minimal CLI smoke against it
- document local build, smoke, and publish commands
- add deterministic tests that validate the Dockerfile and script contract without requiring Docker

Out of scope:

- GitHub Actions publishing
- multi-architecture image builds
- image signing or SBOM generation
- publishing credentials
- installing extra browser or desktop tooling
- adding a permanent Docker-mode example intent

## Image Layout

Create:

```text
docker/runner/node-webapp/Dockerfile
docker/runner/node-webapp/README.md
```

The Dockerfile should:

- use `node:22-bookworm`
- set `WORKDIR /opt/axiom`
- copy `package.json` and `package-lock.json`
- run `npm ci --omit=optional`
- copy `bin/` and `src/`
- run `npm link`
- create `/workspace/source`, `/workspace/generated`, and `/workspace/reports`
- set `WORKDIR /workspace/source`

The runner image should not copy examples, tests, docs, `.git`, or the full project tree. It only needs the runtime package files required to execute `ax`.

## Scripts

Add package scripts:

```json
{
  "docker:runner:build": "docker build -f docker/runner/node-webapp/Dockerfile -t ghcr.io/science451/axiom-build-node-webapp:latest .",
  "docker:runner:smoke": "docker run --rm ghcr.io/science451/axiom-build-node-webapp:latest sh -lc \"command -v ax\""
}
```

The smoke script verifies that the image starts and exposes the `ax` command on `PATH`. It is intentionally smaller than a full Docker-backed Axiom build because the full build smoke requires a Docker-mode intent fixture and writable bind mounts.

## Documentation

The image README should include:

- local build command
- smoke command
- optional publish command:

```bash
docker push ghcr.io/science451/axiom-build-node-webapp:latest
```

- note that Docker-backed `ax build` uses the same tag through `security.build.profile: "node-webapp"`
- note that the current image is a development runner, not a hardened production sandbox

## Testing

Add a deterministic unit test:

```text
test/docker/runner-image.test.js
```

The test should read:

- `docker/runner/node-webapp/Dockerfile`
- `docker/runner/node-webapp/README.md`
- `package.json`

It should assert:

- Dockerfile uses `node:22-bookworm`
- Dockerfile runs `npm ci`
- Dockerfile runs `npm link`
- Dockerfile sets `WORKDIR /workspace/source`
- Dockerfile creates `/workspace/generated` and `/workspace/reports`
- `package.json` defines `docker:runner:build`
- `package.json` defines `docker:runner:smoke`
- README documents the expected GHCR tag

Manual verification should build the image and run the smoke script with Docker installed.

## Error Handling

If Docker is not installed or the daemon is not running, the package scripts should fail with Docker's native error output. The Axiom Docker launcher already reports Docker process start failures through `DOCKER_BUILD_RUNNER_START_FAILED`.

## Future Work

- add CI workflow to publish the image to GHCR
- add immutable version tags in addition to `latest`
- add image signing and provenance
