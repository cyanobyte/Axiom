# Axiom Core API Design

Date: 2026-04-01
Status: Draft approved for planning

## Overview

Axiom is a development system where engineers define intent as executable code, and LLMs generate implementations and plans that are continuously verified against that intent. Intent includes what a system must do, why it exists, its constraints, and its success criteria.

V1 focuses on the core JavaScript authoring API. Engineers should be able to write intent in a way that feels like writing a spec, not a framework. The surface should feel like JavaScript, not a DSL; it should feel like declaring truth, not wiring plumbing; and it should feel like tests and requirements merged into one. The API must stay predictable, minimal, and easy to reason about.

The authoring model is declarative modules with a small authored vocabulary, not giant nested objects. Authors should write concise, intentional declarations with small executable hooks where proof requires real logic. Internally, Axiom may normalize authored modules into a richer model, but the surface should remain readable source code with clear boundaries and names.

## Goals

- Provide a small JavaScript API for authoring executable intent.
- Normalize authored modules into a stable internal intent model.
- Preserve traceability from authored clauses to verification and diagnostics.
- Define the foundational contracts that later verification and diagnostics systems will consume.
- Make intent-aware debugging first-class through structured metadata and source mapping.

## Non-Goals

- Building the full orchestration layer for LLM planning and implementation.
- Building a custom live debugger.
- Solving every possible target system or runtime in V1.
- Designing a giant schema-driven configuration format.

## Core Components

V1 should have four core pieces.

### Authoring API

A small JavaScript API for declaring systems, requirements, constraints, success criteria, and verification hooks. This is the only surface engineers write directly.

### Intent Model

A normalized internal representation built from authored modules. This gives the rest of the system a stable structure without forcing authors to write raw data shapes.

### Verification Runtime

A runtime that evaluates whether an implementation satisfies the declared intent. It executes explicit checks, tracks clause-to-check coverage, and attaches evidence to results, so correctness is based on concrete proof rather than inferred confidence.

### Diagnostics Layer

An explanation and reporting layer that shows what passed, what failed, which intent clause each result maps to, what evidence was collected, and where proof is missing. If Axiom is going to govern LLM-produced code, outcomes must be explainable and traceable.

For V1, the core API repo should primarily establish the first two pieces cleanly, while defining the interfaces the verification runtime and diagnostics layer will depend on. That keeps scope controlled without designing the API in a vacuum.

## Authoring Model

V1 centers on JavaScript modules that read like executable specifications. Engineers write intent as normal code using a minimal set of top-level authoring primitives. The module should be mostly declarations, with selective executable hooks where proof requires real logic. The shape is spec first: concise named declarations for what the system is, why it exists, its constraints, success criteria, and verification rules.

To avoid collapsing into a giant object, the API should prefer small composable declarations over one monolithic literal. The authoring experience should encourage a sequence of intentional statements rather than a single deeply nested export. Internally Axiom can normalize this into an intent model, but the surface API should feel like authored source code with readable boundaries and names.

Authors declare truths, not lifecycle wiring. If a verification rule needs code, it should appear as a focused executable clause attached to a clear requirement, not as framework plumbing spread across files.

## Data Flow

The V1 flow should be:

1. Engineers author intent in JavaScript modules using the Authoring API.
2. Axiom loads those modules and normalizes them into an Intent Model.
3. The Intent Model exposes stable clause identities and relationships so every requirement, constraint, success criterion, and verification hook can be traced.
4. The verification runtime evaluates produced artifacts and outcomes against that model, records which clauses are covered by which checks, executes explicit proofs, and stores concrete evidence.
5. The diagnostics layer renders the result as an intent map: satisfied clauses, failed clauses, uncovered clauses, evidence produced, and proof gaps.

Two design constraints matter here. First, traceability must be first-class, not reconstructed later from test names or logs. Second, verification results must be structured data, not just console output, because LLM orchestration and tooling will need to consume them programmatically.

## Error Handling

V1 should fail in ways that preserve trust in the intent model.

Authoring errors should be caught early and reported against the authored source with clear clause context. If intent is malformed, ambiguous, or incomplete enough that Axiom cannot build a reliable Intent Model, normalization should fail explicitly rather than guessing.

Verification outcomes should be classified into distinct categories: clause failed, clause uncovered, check execution error, and evidence missing or insufficient. These represent different states with different implications, and collapsing them into a generic failure would make the system hard to reason about.

Axiom should distinguish between proof failures and system failures. Proof failures indicate that the system's behavior does not satisfy the declared intent. System failures indicate that Axiom was unable to determine correctness due to execution errors, missing artifacts, or runtime issues.

Traceability gaps should be treated as first-class errors. If a declared clause has no mapped verification, or a verification result cannot be tied back to a stable clause identity, that is not just missing metadata; it is a proof defect.

Verification results should carry structured status and severity, allowing errors, warnings, and informational conditions to be handled differently while preserving a consistent model of clause state.

## Testing

V1 testing should focus on the correctness of the authoring surface and the integrity of normalization and traceability.

The authoring API should be tested for readability-preserving structure as well as behavior: declarations should normalize consistently, clause identities should remain stable across formatting and ordering changes, and small authored modules should produce predictable intent graphs. Since the API is supposed to feel like writing a spec, tests should favor realistic authored examples over low-level unit cases in isolation.

Normalization tests should verify that equivalent authored intent produces the same internal model, malformed intent fails with precise diagnostics, and clause relationships and identities are preserved through loading. Authoring order should not affect the resulting model unless explicitly defined.

Verification-facing tests, at this stage, should focus on contracts rather than a full proof engine: the model must expose enough structure for checks, coverage mapping, evidence attachment, and diagnostics to operate deterministically.

Traceability tests should ensure that every clause has a stable identity, every verification check maps to one or more clauses, and every clause can be resolved to its associated checks, evidence, and status.

A small set of end-to-end fixture specs should anchor the whole design. Those fixtures should prove that an authored module can be loaded, normalized, traced, and reported on in a way that matches the authored intent exactly. Fixtures should remain small, readable, and representative, serving as both regression tests and canonical examples.

## Intent-Aware Debugging

Axiom should treat intent-aware debugging as a first-class design goal, but implement it in V1 through structured diagnostics and source mapping rather than a custom live debugger.

Engineers should be able to use normal JavaScript debugging tools for execution-level issues, while Axiom provides the missing layer: mapping runtime and verification outcomes back to intent clauses, authored source locations, coverage state, and evidence.

V1 should make intent-aware debugging first-class through stable clause identities, source mapping, verification events, and structured diagnostics, while relying on standard Node.js tooling for raw code execution debugging.

This implies the V1 model should define these artifacts early, even if the first interface is only CLI or JSON output:

- `ClauseId`
- `SourceLocation`
- `VerificationEvent`
- `EvidenceRecord`
- `ClauseStatus`
- `CoverageMapping`
- `Diagnostic`

These types should be stable, machine-readable, and suitable for later editor integration, including a strong VS Code experience, without requiring V1 to ship a bespoke debugger.

## Scope Boundary for V1

The first deliverable for this repo is the core JavaScript authoring API. The repo should establish the authoring surface and the normalized model cleanly, while explicitly shaping the contracts the verification runtime and diagnostics layer will depend on later.

This means V1 should optimize for:

- expressive but minimal authoring primitives
- stable normalization behavior
- traceable clause identities and relationships
- structured verification-facing data contracts
- diagnostics and debugging metadata designed in from the start

This means V1 should not expand into:

- full proof execution infrastructure
- broad multi-runtime support
- editor extensions
- orchestration-heavy LLM workflows

## Open Design Constraints

- The API must feel like authored JavaScript, not JSON with commas.
- The normalized model must preserve author intent without requiring authoring to mirror internal structure.
- Every clause must be traceable through verification and diagnostics.
- Proof gaps must be representable explicitly, not inferred from missing output.
- The architecture should support future tooling and editor integrations without forcing those interfaces into V1 delivery scope.
