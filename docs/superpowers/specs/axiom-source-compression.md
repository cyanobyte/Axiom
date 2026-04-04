# Axiom Source Compression Baselines

## Purpose

This document records a first baseline for one of Axiom's main product claims: that authored
`.axiom.js` files can be shorter than spec-heavy Markdown inputs and much shorter than the generated
source they describe.

These numbers are intentionally simple. They use file count, non-empty line count, and byte count so
the method stays easy to repeat and audit.

## Method

For each example, compare:

1. a reconstructed Markdown baseline covering the same practical intent
2. the current authored `.axiom.js`
3. the generated source bundle used as the implementation output baseline

Measurement rules:

- count full authored inputs, not selected excerpts
- count non-empty lines and bytes
- exclude `node_modules`, lockfiles, generated reports, and `.axiom-build.json`
- keep caveats explicit when the generated-source baseline comes from a different but equivalent
  workspace variant

## Provenance Notes

- The Markdown baselines in `docs/superpowers/specs/baselines/` are reconstructed comparison
  artifacts. They are not historical source files from before Axiom.
- `echo-tool` generated-source numbers come from the deterministic generated workspace under
  `examples/cli/generated/`.
- `counter-webapp` generated-source numbers use the concrete generated bundle from
  `examples/live-counter/generated/` because the deterministic beginner example does not keep a full
  generated source bundle in-repo.

## Baseline Table

| Project | Artifact | Files | Non-empty lines | Bytes |
| --- | --- | ---: | ---: | ---: |
| echo-tool | Reconstructed Markdown | 1 | 51 | 1,871 |
| echo-tool | Authored `.axiom.js` | 1 | 118 | 3,404 |
| echo-tool | Generated source bundle | 2 | 18 | 342 |
| counter-webapp | Reconstructed Markdown | 1 | 98 | 3,816 |
| counter-webapp | Authored `.axiom.js` | 1 | 336 | 10,732 |
| counter-webapp | Generated source bundle | 3 | 76 | 2,330 |

## Findings

- On both measured examples, the current `.axiom.js` source is larger than the reconstructed
  Markdown baseline.
- On both measured examples, the current `.axiom.js` source is also much larger than the generated
  source bundle.
- `echo-tool` remains the clearest proof that tiny projects do not compress well enough yet. Even
  after compact-mode improvements, the authored Axiom file is still substantially larger than both a
  natural Markdown description and the generated implementation.
- `counter-webapp` shows the same pattern. The current Axiom file carries a large amount of
  workflow, verification, and compiler control structure, which makes it significantly longer than a
  natural spec-style description for the same app.
- These baselines do not support a current broad claim that Axiom already compresses source for
  small projects. They support a narrower claim that Axiom adds structure, verification, and rebuild
  discipline, but not source compression, for these examples.

## Interpretation

The important question is not whether Axiom wins every size comparison. The important question is
where the abstraction meaningfully reduces authored material while still preserving intent,
verification, and rebuild discipline.

Tiny projects are the hardest case. If Axiom barely beats a natural Markdown note for something as
small as `echo-tool`, that is a real product constraint and should be documented plainly rather than
explained away.

The current result is stronger than that caution: the measured Axiom source does not just "barely"
lose, it loses clearly on both examples. That means the source-compression claim should stay
experimental for now. The current examples suggest Axiom is more defensible as a structured
compiler-style workflow than as a shorter authoring format for small projects.
