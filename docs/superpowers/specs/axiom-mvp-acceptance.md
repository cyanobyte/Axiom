# Axiom MVP Acceptance

The MVP is fully functional only when all of the following are true:

1. `node bin/ax.js build <file.axiom.js>` works.
2. The runtime loads sibling `axiom.config.js` automatically.
3. The runtime builds adapters from config successfully.
4. The runtime can call a real local AI CLI provider for at least one configured agent capability.
5. The runtime can execute a real local shell command.
6. The runtime can read artifact files from disk.
7. The runtime can execute verification and return structured results.
8. Default CLI output shows readable AI/compiler progress without drowning in provider transcript noise.
9. `--verbose` still exposes the raw provider transcript when needed.
10. `Ctrl-C` interrupts a live run cleanly and returns `status: "interrupted"` with exit code `130`.
11. Generated output is treated as disposable build artifacts, with `.axiom-build.json` used only for staleness detection and clean rebuilds.
12. Runtime failures emit actionable diagnostics with `kind`, `stepId`, `message`, and `nextAction`.
13. At least two runnable examples exist: one small web app and one small CLI tool.
14. The live counter example can be run through the CLI with local CLI-backed providers.
15. The default automated suite still passes without calling live AI.

The final manual live smoke run has now passed:

```bash
node bin/ax.js build examples/live-counter/counter-webapp.axiom.js
```

Observed acceptance result:

- the local AI CLI adapter is invoked successfully
- readable live compiler output is shown during the run
- the generated project files are written into `examples/live-counter/generated/`
- the generated project test command succeeds after exercising the generated app's real HTTP flow
- `generated/reports/counter-ui.json` is produced
- `generated/reports/counter-ui.json` reflects the generated app's actual load, increment, and reset behavior
- Axiom returns a structured passing result

Status: MVP acceptance complete.
