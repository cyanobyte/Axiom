# Docker Counter Example

This deterministic example proves the host-to-Docker Axiom build path.

It uses the same fake provider flow as the basic counter example, but the intent declares:

```js
security: {
  build: {
    mode: "docker",
    profile: "node-webapp"
  }
}
```

Run the smoke from the repository root:

```bash
npm run docker:runner:integration
```

If your user cannot access the Docker daemon directly, run:

```bash
sudo -n npm run docker:runner:integration
```

Expected signs that the build ran inside the runner:

- `securityReport.build.mode` is `docker`
- the test step runs with `cwd` set to `/workspace/generated`
- the health report intent path starts with `/workspace/source`

Generated files are written under `generated/`, and the deterministic report fixture is tracked in `reports/`.
