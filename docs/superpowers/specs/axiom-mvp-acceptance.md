# Axiom MVP Acceptance

The MVP is fully functional only when all of the following are true:

1. `node bin/axiom.js run <file.axiom.js>` works.
2. The runtime loads sibling `axiom.config.js` automatically.
3. The runtime builds adapters from config successfully.
4. The runtime can call a real local AI CLI provider for at least one configured agent capability.
5. The runtime can execute a real local shell command.
6. The runtime can read artifact files from disk.
7. The runtime can execute verification and return structured results.
8. The live counter example can be run through the CLI with local CLI-backed providers.
9. The default automated suite still passes without calling live AI.

The current remaining acceptance step is the manual live smoke run:

```bash
node bin/axiom.js run examples/live-counter/counter-webapp.axiom.js
```

That run is accepted when:

- the local AI CLI adapter is invoked successfully
- the generated project files are written into `examples/live-counter/`
- the generated project test command succeeds
- `reports/counter-ui.json` is produced
- Axiom returns a structured passing result
