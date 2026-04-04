# Counter Web App

This is a reconstructed Markdown baseline for compression measurement. It is not a historical source
file from the repo. It is written to cover the same practical intent as the current Axiom example so
the comparison stays as fair as possible.

## Summary

Build a very small full-stack counter web app.

The app should render a single page that shows the current count, let the user increment the count,
and let the user reset the count back to zero. The backend should use Node.js with Express. State can
stay in memory for this example. The project should include a test path that produces a machine-readable
report so the behavior can be verified automatically.

## Goal

The purpose of this project is to demonstrate a beginner-friendly Axiom example that is still complete
enough to show planning, approval, implementation, testing, and verification in one flow.

## Scope

Include:

- a single counter screen
- an increment action
- a reset action
- an Express backend
- in-memory counter state
- JSON API responses that include the current count
- one served browser page
- a human approval point before implementation
- a machine-readable verification report

Exclude:

- authentication
- database persistence
- multiple screens
- complex styling

## Runtime

- language: JavaScript
- targets: Node.js and browser
- platforms: Linux, macOS, Windows, web

## Build And Test

- package manager: npm
- install command: `npm install`
- dev command: `npm run dev`
- test command: `npm test`

## Assumptions

- the runtime has a writable generated workspace
- the user reviews the implementation plan before generation continues
- the runtime has explicit AI, shell, workspace, and artifact capabilities

## Architecture

### Counter UI

Render the counter value and expose increment and reset actions. A plain HTML and JavaScript page is
enough for this example.

### Counter API

Serve the current count and handle increment and reset requests through HTTP endpoints.

### Counter Store

Hold the current count in memory for the life of the running process.

## Policies

- implementation must not begin until the generated plan is approved
- verification must execute by statically declared verification ID

## Quality Goals

- the example should stay short enough for a new user to understand quickly
- the run should clearly show where planning, approval, testing, and verification occur

## Web App Requirements

- frontend style: minimal
- frontend framework: vanilla
- entry route: `/`
- API style: REST

Required endpoints:

- `GET /api/counter` returns `{ count: number }`
- `POST /api/counter/increment` returns `{ count: number }`
- `POST /api/counter/reset` returns `{ count: number }`

Screen:

- one home screen that displays the current count and the available actions

Interactions:

- show the current count on page load
- increment the counter
- reset the counter

## Hard Requirements

- the app shows the current counter value
- the app increments the counter from the UI
- the app resets the counter from the UI
- the backend uses Node.js with Express
- counter state is stored in memory for the MVP
- all counter API endpoints return JSON with a `count` field
- the app serves a single browser page for the UI

## Expected Outcomes

- page load shows count `0`
- increment changes the visible count from `0` to `1`
- reset changes the visible count back to `0`
- API endpoints return JSON with the current count
- the test run produces a machine-readable report

## Verification Expectations

The plan should clearly cover:

- showing the counter
- incrementing the counter
- resetting the counter
- using Express
- using in-memory state
- returning JSON count payloads
- serving one page

The run should verify:

- counter UI flow
- API JSON behavior
- report existence
