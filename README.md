# Axiom
Intent based programming

## Examples

- Beginner example: `examples/basic/counter-webapp.axiom.js`
- Example runtime config: `examples/basic/axiom.config.js`
- Richer examples: `docs/superpowers/examples/`

## Running Axiom

Install dependencies:

```bash
npm install
```

Run the beginner example:

```bash
node bin/axiom.js run examples/basic/counter-webapp.axiom.js
```

This loads:

- `examples/basic/counter-webapp.axiom.js`
- `examples/basic/axiom.config.js`

The default beginner example uses fake agent adapters so the runtime can be exercised without spending model tokens.
When a live provider adapter is implemented, replace the fake agent entries in `examples/basic/axiom.config.js` with provider-backed entries and rerun the same command.
