# Dogfood Runtime Slice

This is the first safe dogfooding path for Axiom.

It models the shape of starting from `ax init --existing .`, refining the generated intent, and
building a small Axiom-adjacent slice into an isolated workspace instead of mutating the real
runtime source tree.

What it demonstrates:

- an Axiom-authored example that targets an Axiom-adjacent runtime helper
- deterministic fake adapters for automated tests
- isolated generated output under `generated/`
- a focused machine-readable verification report under `reports/`

This example is intentionally narrow. It is a proof that Axiom can safely describe and build a
small runtime-adjacent slice before larger dogfooding targets are attempted.
