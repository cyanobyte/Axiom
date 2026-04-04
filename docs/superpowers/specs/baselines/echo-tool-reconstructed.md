# Echo Tool

This is a reconstructed Markdown baseline for compression measurement. It is not a historical source
file from the repo. It is written to cover the same practical intent as the current Axiom example so
the comparison stays as fair as possible.

## Summary

Build a tiny CLI tool that prints the provided message.

The command should accept one required positional argument and print it to stdout. If the message is
missing, the tool should exit with a clear usage error. The project should include a test path and
should produce a machine-readable verification report.

## Goal

This example exists to prove that Axiom can drive the same compile, test, and verify loop for a very
small CLI target instead of only for web apps.

## Scope

Include:

- a single echo command
- one required positional argument
- a clear missing-argument usage error
- human approval of the generated plan
- a machine-readable report

Exclude:

- subcommands
- configuration files
- multiple output formats

## Runtime

- language: JavaScript
- target: Node.js
- platforms: Linux, macOS, Windows

## Build And Test

- package manager: npm
- install command: `npm install`
- test command: `npm test`

## CLI Shape

- command name: `echo-tool`
- arguments: `<message>`

Expected behavior:

- print the provided message to stdout
- show a usage error when the message is missing

## Hard Requirements

- the tool runs as a CLI command
- the tool accepts the declared required argument

## Expected Outcomes

- running the command with a message succeeds
- running the command without the required message shows a clear usage error

## Verification Expectations

The implementation plan should clearly cover:

- printing the message
- rejecting missing input
- using a Node.js CLI entrypoint

The run should verify:

- the CLI flow itself
- the presence of a machine-readable report
