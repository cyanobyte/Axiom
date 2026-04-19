# Axiom Shell v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a walking-skeleton conversational shell invoked as bare `ax` that drives a native agent loop, reuses existing Axiom CLI commands via hybrid slash commands, and supports both Anthropic and OpenAI-compatible providers (including local LLMs).

**Architecture:** New `src/shell/` module owns REPL + agent loop + tools + slash-command dispatch + permission enforcement + rendering. New `src/providers/` module owns a streaming-first Provider abstraction with two adapters (`@anthropic-ai/sdk` and `openai`). Slash commands call existing `src/cli/*-command.js` modules as in-process functions so build/analyze behavior stays a single source of truth. Permission policy is declared in `.axiom.js` under `security.shell` and normalized alongside the existing security block.

**Tech Stack:** Node.js 22+, ESM, Vitest, `@anthropic-ai/sdk`, `openai`, `node:readline`, existing Axiom runtime and security modules.

---

## File Structure

**Create:**
- `src/providers/provider-interface.js` — shared types / contract doc
- `src/providers/normalize.js` — cross-provider helpers
- `src/providers/anthropic-provider.js` — Anthropic Messages adapter
- `src/providers/openai-compat-provider.js` — OpenAI-shape adapter (cloud + local)
- `src/shell/session.js` — in-memory conversation state
- `src/shell/permissions.js` — evaluate `security.shell` policy
- `src/shell/tools/read.js` — Read tool
- `src/shell/tools/write.js` — Write tool
- `src/shell/tools/edit.js` — Edit tool
- `src/shell/tools/bash.js` — Bash tool
- `src/shell/tool-registry.js` — register tools, expose schemas + dispatch
- `src/shell/render.js` — streaming terminal renderer
- `src/shell/agent-loop.js` — one-turn orchestration
- `src/shell/slash-commands.js` — parse `/command` + dispatch
- `src/shell/index.js` — `startShell()` wiring
- `test/providers/normalize.test.js`
- `test/providers/anthropic-provider.test.js`
- `test/providers/openai-compat-provider.test.js`
- `test/providers/anthropic-provider.integration.test.js`
- `test/providers/openai-compat-provider.integration.test.js`
- `test/shell/session.test.js`
- `test/shell/permissions.test.js`
- `test/shell/tools/read.test.js`
- `test/shell/tools/write.test.js`
- `test/shell/tools/edit.test.js`
- `test/shell/tools/bash.test.js`
- `test/shell/tool-registry.test.js`
- `test/shell/render.test.js`
- `test/shell/agent-loop.test.js`
- `test/shell/slash-commands.test.js`
- `test/shell/shell-session.integration.test.js`

**Modify:**
- `package.json` — add `@anthropic-ai/sdk` and `openai` as dependencies
- `src/security/normalize-security-policy.js` — normalize optional `security.shell`
- `src/index.js` — export shell + provider factories
- `bin/ax.js` — dispatch bare `ax` / `ax shell` to the shell entry point
- `test/security/normalize-security-policy.test.js` — cover `security.shell`
- `test/definition/validate-definition.test.js` — accept `security.shell`

---

## Task 1: Install Provider SDKs

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install `@anthropic-ai/sdk` and `openai`**

Run:

```bash
npm install @anthropic-ai/sdk openai
```

Expected: both packages appear under `"dependencies"` in `package.json`, `package-lock.json` updates, no errors.

- [ ] **Step 2: Verify the current suite still passes**

Run:

```bash
npm test
```

Expected: all 132 tests pass, 1 skipped. No regressions from adding deps.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add anthropic and openai SDKs for the shell"
```

---

## Task 2: Normalize `security.shell` In The Definition Schema

**Files:**
- Modify: `src/security/normalize-security-policy.js`
- Modify: `test/security/normalize-security-policy.test.js`
- Modify: `test/definition/validate-definition.test.js`

- [ ] **Step 1: Add failing tests for `security.shell` normalization**

Append to `test/security/normalize-security-policy.test.js`:

```js
  it('normalizes a shell policy with defaultAction allow and per-tool rules', () => {
    const policy = normalizeSecurityPolicy({
      shell: {
        defaultAction: 'allow',
        tools: {
          Read: 'allow',
          Edit: { allow: ['src/**'], deny: ['.env*'] },
          Bash: { allow: ['npm *'], deny: ['rm -rf *'] }
        }
      }
    });

    expect(policy.shell).toEqual({
      defaultAction: 'allow',
      tools: {
        Read: { action: 'allow', allow: [], deny: [] },
        Edit: { action: 'patterns', allow: ['src/**'], deny: ['.env*'] },
        Bash: { action: 'patterns', allow: ['npm *'], deny: ['rm -rf *'] }
      }
    });
  });

  it('applies defaultAction "allow" when no shell block is declared', () => {
    const policy = normalizeSecurityPolicy({});
    expect(policy.shell).toEqual({ defaultAction: 'allow', tools: {} });
  });

  it('rejects an unsupported shell defaultAction', () => {
    expect(() =>
      normalizeSecurityPolicy({ shell: { defaultAction: 'nope' } })
    ).toThrow(/Unsupported security\.shell\.defaultAction: nope/);
  });

  it('rejects an unsupported shell tool action', () => {
    expect(() =>
      normalizeSecurityPolicy({ shell: { tools: { Read: 'maybe' } } })
    ).toThrow(/Unsupported security\.shell\.tools\.Read action: maybe/);
  });
```

- [ ] **Step 2: Add a failing definition-validation acceptance test**

Append to `test/definition/validate-definition.test.js`:

```js
  it('accepts a top-level security.shell section', () => {
    const definition = validateDefinition({
      id: 'shell-ok',
      meta: { title: 't', summary: 's', version: '1.0.0' },
      what: { capability: 'x', description: 'y' },
      runtime: { languages: ['javascript'] },
      constraints: [],
      outcomes: [],
      verification: { intent: [], outcome: [] },
      security: {
        shell: {
          defaultAction: 'allow',
          tools: { Read: 'allow', Bash: { allow: ['npm *'], deny: ['rm -rf *'] } }
        }
      }
    });

    expect(definition.security.shell.defaultAction).toBe('allow');
    expect(definition.security.shell.tools.Bash.action).toBe('patterns');
  });
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
npm test -- test/security/normalize-security-policy.test.js test/definition/validate-definition.test.js
```

Expected: the four new tests FAIL because `security.shell` is not yet normalized.

- [ ] **Step 4: Implement shell-policy normalization**

At the top of `src/security/normalize-security-policy.js`, add the valid-action set alongside the existing sets:

```js
const SUPPORTED_SHELL_ACTIONS = new Set(['allow', 'prompt', 'deny']);
```

Replace the body of `normalizeSecurityPolicy` with:

```js
export function normalizeSecurityPolicy(security = {}) {
  return {
    ...(security.build ? { build: normalizeBuildSecurity(security.build) } : {}),
    ...(security.app ? { app: normalizeAppSecurity(security.app) } : {}),
    shell: normalizeShellSecurity(security.shell)
  };
}
```

Append this helper to the bottom of the file:

```js
function normalizeShellSecurity(shell) {
  if (!shell) {
    return { defaultAction: 'allow', tools: {} };
  }

  const defaultAction = shell.defaultAction ?? 'allow';
  if (!SUPPORTED_SHELL_ACTIONS.has(defaultAction)) {
    throw new Error(`Unsupported security.shell.defaultAction: ${defaultAction}`);
  }

  const tools = {};
  for (const [toolName, rule] of Object.entries(shell.tools ?? {})) {
    if (typeof rule === 'string') {
      if (!SUPPORTED_SHELL_ACTIONS.has(rule)) {
        throw new Error(`Unsupported security.shell.tools.${toolName} action: ${rule}`);
      }
      tools[toolName] = { action: rule, allow: [], deny: [] };
      continue;
    }

    if (typeof rule === 'object' && rule !== null) {
      tools[toolName] = {
        action: 'patterns',
        allow: Array.isArray(rule.allow) ? [...rule.allow] : [],
        deny: Array.isArray(rule.deny) ? [...rule.deny] : []
      };
      continue;
    }

    throw new Error(`Unsupported security.shell.tools.${toolName} value`);
  }

  return { defaultAction, tools };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
npm test -- test/security/normalize-security-policy.test.js test/definition/validate-definition.test.js
```

Expected: all tests PASS.

- [ ] **Step 6: Run the full suite to guard against regressions**

Run:

```bash
npm test
```

Expected: all tests pass (existing security-report tests may now see a `shell` field — confirm they still pass; if any snapshot test fails because of the added `shell: { defaultAction: 'allow', tools: {} }`, update that snapshot as part of this task).

- [ ] **Step 7: Commit**

```bash
git add src/security/normalize-security-policy.js test/security/normalize-security-policy.test.js test/definition/validate-definition.test.js
git commit -m "feat: normalize security.shell policy declarations"
```

---

## Task 3: Provider Interface Contract And Normalize Helpers

**Files:**
- Create: `src/providers/provider-interface.js`
- Create: `src/providers/normalize.js`
- Create: `test/providers/normalize.test.js`

- [ ] **Step 1: Write the interface contract file**

Create `src/providers/provider-interface.js`:

```js
/**
 * Purpose: Document the Provider contract shared by every LLM adapter.
 * Responsibilities:
 * - Describe the streaming event shape the agent loop consumes.
 * - Describe the message shape the agent loop passes in.
 * - Keep provider-specific shapes out of the agent loop.
 *
 * This file exports runtime helpers only; the contract itself is a JSDoc type.
 *
 * @typedef {{ type: 'text', text: string }} TextBlock
 * @typedef {{ type: 'tool_use', id: string, name: string, input: object }} ToolUseBlock
 * @typedef {{ type: 'tool_result', tool_use_id: string, content: string, is_error?: boolean }} ToolResultBlock
 * @typedef {{ role: 'user' | 'assistant', content: Array<TextBlock | ToolUseBlock | ToolResultBlock> }} Message
 *
 * @typedef {{ kind: 'text', delta: string }} TextEvent
 * @typedef {{ kind: 'tool_use', id: string, name: string, input: object }} ToolUseEvent
 * @typedef {{ kind: 'done', stopReason: string }} DoneEvent
 * @typedef {{ kind: 'error', error: Error }} ErrorEvent
 * @typedef {TextEvent | ToolUseEvent | DoneEvent | ErrorEvent} Event
 *
 * @typedef {{ name: string, description: string, schema: object }} ToolDefinition
 *
 * @typedef {object} Provider
 * @property {(params: { messages: Message[], tools: ToolDefinition[], model?: string, signal?: AbortSignal, system?: string }) => AsyncIterable<Event>} stream
 */

export const PROVIDER_STOP_REASONS = Object.freeze({
  END_TURN: 'end_turn',
  TOOL_USE: 'tool_use',
  MAX_TOKENS: 'max_tokens',
  ERROR: 'error'
});
```

- [ ] **Step 2: Write failing tests for shared normalize helpers**

Create `test/providers/normalize.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  stringifyToolInput,
  accumulateToolInputJson,
  messageBlocksToText
} from '../../src/providers/normalize.js';

describe('providers/normalize', () => {
  it('stringifies object tool input deterministically', () => {
    expect(stringifyToolInput({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(stringifyToolInput({})).toBe('{}');
  });

  it('accumulates streamed partial JSON deltas into a parsed object', () => {
    const acc = accumulateToolInputJson();
    acc.push('{"path":"s');
    acc.push('rc/a.js"}');
    expect(acc.complete()).toEqual({ path: 'src/a.js' });
  });

  it('returns empty object when accumulation never saw any deltas', () => {
    const acc = accumulateToolInputJson();
    expect(acc.complete()).toEqual({});
  });

  it('joins text content blocks of a message', () => {
    expect(
      messageBlocksToText({
        role: 'assistant',
        content: [
          { type: 'text', text: 'hello ' },
          { type: 'text', text: 'world' },
          { type: 'tool_use', id: 't1', name: 'Read', input: { path: 'x' } }
        ]
      })
    ).toBe('hello world');
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
npm test -- test/providers/normalize.test.js
```

Expected: FAIL because `src/providers/normalize.js` does not exist.

- [ ] **Step 4: Implement the normalize helpers**

Create `src/providers/normalize.js`:

```js
/**
 * Purpose: Shared helpers for translating provider-native shapes into the unified Event/Message contract.
 * Responsibilities:
 * - Deterministic JSON stringification for logging or hashing tool input.
 * - Accumulate streamed JSON deltas into a single parsed object.
 * - Collapse text blocks of a message into a single string.
 */

export function stringifyToolInput(input) {
  if (input == null) return '{}';
  const keys = Object.keys(input).sort();
  const sorted = {};
  for (const key of keys) {
    sorted[key] = input[key];
  }
  return JSON.stringify(sorted);
}

export function accumulateToolInputJson() {
  const parts = [];
  return {
    push(chunk) {
      if (typeof chunk === 'string' && chunk.length > 0) {
        parts.push(chunk);
      }
    },
    complete() {
      const raw = parts.join('');
      if (raw.length === 0) return {};
      try {
        return JSON.parse(raw);
      } catch (error) {
        throw new Error(`Malformed tool input JSON: ${error.message}. Raw: ${raw}`);
      }
    }
  };
}

export function messageBlocksToText(message) {
  const blocks = Array.isArray(message?.content) ? message.content : [];
  return blocks
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('');
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
npm test -- test/providers/normalize.test.js
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/providers/provider-interface.js src/providers/normalize.js test/providers/normalize.test.js
git commit -m "feat: add provider interface contract and normalize helpers"
```

---

## Task 4: Anthropic Provider

**Files:**
- Create: `src/providers/anthropic-provider.js`
- Create: `test/providers/anthropic-provider.test.js`

- [ ] **Step 1: Write failing unit tests with a mocked SDK**

Create `test/providers/anthropic-provider.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { createAnthropicProvider } from '../../src/providers/anthropic-provider.js';

function fakeAnthropicClient(scriptedEvents) {
  return {
    messages: {
      stream(params) {
        return {
          params,
          async *[Symbol.asyncIterator]() {
            for (const event of scriptedEvents) {
              yield event;
            }
          }
        };
      }
    }
  };
}

async function collect(iterable) {
  const out = [];
  for await (const value of iterable) {
    out.push(value);
  }
  return out;
}

describe('anthropic-provider', () => {
  it('translates text deltas into text events', async () => {
    const client = fakeAnthropicClient([
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'hel' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'lo' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' } }
    ]);

    const provider = createAnthropicProvider({ client, defaultModel: 'm' });
    const events = await collect(provider.stream({ messages: [], tools: [] }));

    expect(events.filter((event) => event.kind === 'text').map((event) => event.delta)).toEqual(['hel', 'lo']);
    expect(events.at(-1)).toEqual({ kind: 'done', stopReason: 'end_turn' });
  });

  it('assembles tool_use events from streamed input_json_delta chunks', async () => {
    const client = fakeAnthropicClient([
      {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'tool_use', id: 't1', name: 'Read', input: {} }
      },
      { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"path":"s' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: 'rc/a.js"}' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: 'tool_use' } }
    ]);

    const provider = createAnthropicProvider({ client, defaultModel: 'm' });
    const events = await collect(provider.stream({ messages: [], tools: [] }));

    const toolEvent = events.find((event) => event.kind === 'tool_use');
    expect(toolEvent).toEqual({ kind: 'tool_use', id: 't1', name: 'Read', input: { path: 'src/a.js' } });
    expect(events.at(-1)).toEqual({ kind: 'done', stopReason: 'tool_use' });
  });

  it('passes model, messages, and tools through to the SDK call', async () => {
    let capturedParams;
    const client = {
      messages: {
        stream(params) {
          capturedParams = params;
          return {
            async *[Symbol.asyncIterator]() {
              yield { type: 'message_delta', delta: { stop_reason: 'end_turn' } };
            }
          };
        }
      }
    };

    const provider = createAnthropicProvider({ client, defaultModel: 'claude-sonnet-4-6' });
    await collect(
      provider.stream({
        messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
        tools: [{ name: 'Read', description: 'Read file', schema: { type: 'object' } }],
        system: 'be concise'
      })
    );

    expect(capturedParams.model).toBe('claude-sonnet-4-6');
    expect(capturedParams.system).toBe('be concise');
    expect(capturedParams.messages).toEqual([
      { role: 'user', content: [{ type: 'text', text: 'hi' }] }
    ]);
    expect(capturedParams.tools).toEqual([
      { name: 'Read', description: 'Read file', input_schema: { type: 'object' } }
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/providers/anthropic-provider.test.js
```

Expected: FAIL because `src/providers/anthropic-provider.js` does not exist.

- [ ] **Step 3: Implement the Anthropic provider**

Create `src/providers/anthropic-provider.js`:

```js
/**
 * Purpose: Implement the Provider contract against Anthropic's Messages API.
 * Responsibilities:
 * - Translate the Axiom Message shape to Anthropic's message shape.
 * - Translate tool definitions to Anthropic's input_schema shape.
 * - Convert Anthropic SSE events into the unified Event stream.
 */
import { accumulateToolInputJson } from './normalize.js';

export function createAnthropicProvider({ client, defaultModel, maxTokens = 4096 }) {
  if (!client) throw new Error('createAnthropicProvider requires client');
  if (!defaultModel) throw new Error('createAnthropicProvider requires defaultModel');

  return {
    async *stream({ messages, tools, model, signal, system, max_tokens }) {
      const stream = client.messages.stream(
        {
          model: model ?? defaultModel,
          max_tokens: max_tokens ?? maxTokens,
          ...(system ? { system } : {}),
          messages,
          ...(tools?.length ? { tools: toAnthropicTools(tools) } : {})
        },
        signal ? { signal } : undefined
      );

      const toolAccumulators = new Map();
      const toolBlocks = new Map();

      try {
        for await (const event of stream) {
          if (event.type === 'content_block_start') {
            const block = event.content_block;
            if (block?.type === 'tool_use') {
              toolAccumulators.set(event.index, accumulateToolInputJson());
              toolBlocks.set(event.index, { id: block.id, name: block.name });
            }
            continue;
          }

          if (event.type === 'content_block_delta') {
            const delta = event.delta;
            if (delta?.type === 'text_delta') {
              yield { kind: 'text', delta: delta.text };
              continue;
            }
            if (delta?.type === 'input_json_delta') {
              toolAccumulators.get(event.index)?.push(delta.partial_json);
              continue;
            }
            continue;
          }

          if (event.type === 'content_block_stop') {
            const acc = toolAccumulators.get(event.index);
            const meta = toolBlocks.get(event.index);
            if (acc && meta) {
              yield {
                kind: 'tool_use',
                id: meta.id,
                name: meta.name,
                input: acc.complete()
              };
              toolAccumulators.delete(event.index);
              toolBlocks.delete(event.index);
            }
            continue;
          }

          if (event.type === 'message_delta') {
            const stopReason = event.delta?.stop_reason;
            if (stopReason) {
              yield { kind: 'done', stopReason };
            }
            continue;
          }
        }
      } catch (error) {
        yield { kind: 'error', error };
      }
    }
  };
}

function toAnthropicTools(tools) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.schema
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- test/providers/anthropic-provider.test.js
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/providers/anthropic-provider.js test/providers/anthropic-provider.test.js
git commit -m "feat: add anthropic provider for the shell"
```

---

## Task 5: OpenAI-Compat Provider

**Files:**
- Create: `src/providers/openai-compat-provider.js`
- Create: `test/providers/openai-compat-provider.test.js`

- [ ] **Step 1: Write failing unit tests with a mocked SDK**

Create `test/providers/openai-compat-provider.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { createOpenAICompatProvider } from '../../src/providers/openai-compat-provider.js';

function fakeOpenAIClient(chunks) {
  return {
    chat: {
      completions: {
        async create(params) {
          return {
            params,
            async *[Symbol.asyncIterator]() {
              for (const chunk of chunks) {
                yield chunk;
              }
            }
          };
        }
      }
    }
  };
}

async function collect(iterable) {
  const out = [];
  for await (const value of iterable) {
    out.push(value);
  }
  return out;
}

describe('openai-compat-provider', () => {
  it('emits text events from content deltas', async () => {
    const client = fakeOpenAIClient([
      { choices: [{ index: 0, delta: { content: 'hi ' }, finish_reason: null }] },
      { choices: [{ index: 0, delta: { content: 'there' }, finish_reason: null }] },
      { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }
    ]);

    const provider = createOpenAICompatProvider({ client, defaultModel: 'm' });
    const events = await collect(provider.stream({ messages: [], tools: [] }));

    expect(events.filter((event) => event.kind === 'text').map((event) => event.delta)).toEqual(['hi ', 'there']);
    expect(events.at(-1)).toEqual({ kind: 'done', stopReason: 'end_turn' });
  });

  it('assembles tool_use events from streamed tool_call deltas', async () => {
    const client = fakeOpenAIClient([
      {
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                { index: 0, id: 't1', type: 'function', function: { name: 'Read', arguments: '{"path":"s' } }
              ]
            },
            finish_reason: null
          }
        ]
      },
      {
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [{ index: 0, function: { arguments: 'rc/a.js"}' } }]
            },
            finish_reason: null
          }
        ]
      },
      { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] }
    ]);

    const provider = createOpenAICompatProvider({ client, defaultModel: 'm' });
    const events = await collect(provider.stream({ messages: [], tools: [] }));

    expect(events.find((event) => event.kind === 'tool_use')).toEqual({
      kind: 'tool_use',
      id: 't1',
      name: 'Read',
      input: { path: 'src/a.js' }
    });
    expect(events.at(-1)).toEqual({ kind: 'done', stopReason: 'tool_use' });
  });

  it('translates messages and tools to OpenAI shape', async () => {
    let capturedParams;
    const client = {
      chat: {
        completions: {
          async create(params) {
            capturedParams = params;
            return {
              async *[Symbol.asyncIterator]() {
                yield { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] };
              }
            };
          }
        }
      }
    };

    const provider = createOpenAICompatProvider({ client, defaultModel: 'gpt-5' });
    await collect(
      provider.stream({
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'hi' }] },
          {
            role: 'assistant',
            content: [
              { type: 'text', text: 'running tool' },
              { type: 'tool_use', id: 't1', name: 'Read', input: { path: 'a' } }
            ]
          },
          {
            role: 'user',
            content: [{ type: 'tool_result', tool_use_id: 't1', content: 'file body' }]
          }
        ],
        tools: [{ name: 'Read', description: 'Read file', schema: { type: 'object' } }],
        system: 'you are helpful'
      })
    );

    expect(capturedParams.model).toBe('gpt-5');
    expect(capturedParams.stream).toBe(true);
    expect(capturedParams.messages).toEqual([
      { role: 'system', content: 'you are helpful' },
      { role: 'user', content: 'hi' },
      {
        role: 'assistant',
        content: 'running tool',
        tool_calls: [
          { id: 't1', type: 'function', function: { name: 'Read', arguments: '{"path":"a"}' } }
        ]
      },
      { role: 'tool', tool_call_id: 't1', content: 'file body' }
    ]);
    expect(capturedParams.tools).toEqual([
      {
        type: 'function',
        function: { name: 'Read', description: 'Read file', parameters: { type: 'object' } }
      }
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/providers/openai-compat-provider.test.js
```

Expected: FAIL because `src/providers/openai-compat-provider.js` does not exist.

- [ ] **Step 3: Implement the OpenAI-compat provider**

Create `src/providers/openai-compat-provider.js`:

```js
/**
 * Purpose: Implement the Provider contract against OpenAI's Chat Completions API (and any OpenAI-compatible endpoint).
 * Responsibilities:
 * - Translate Axiom messages to OpenAI message shape (tool_calls, tool role, etc.).
 * - Translate tool definitions to OpenAI function shape.
 * - Accumulate streamed tool_call deltas into complete tool_use events.
 * - Support configurable baseURL so cloud OpenAI and local runners (Ollama, LM Studio, vLLM, LocalAI) work through one adapter.
 */
import { accumulateToolInputJson } from './normalize.js';

const OPENAI_FINISH_TO_STOP_REASON = Object.freeze({
  stop: 'end_turn',
  length: 'max_tokens',
  tool_calls: 'tool_use',
  function_call: 'tool_use',
  content_filter: 'content_filter'
});

export function createOpenAICompatProvider({ client, defaultModel, maxTokens = 4096 }) {
  if (!client) throw new Error('createOpenAICompatProvider requires client');
  if (!defaultModel) throw new Error('createOpenAICompatProvider requires defaultModel');

  return {
    async *stream({ messages, tools, model, signal, system, max_tokens }) {
      const params = {
        model: model ?? defaultModel,
        stream: true,
        max_tokens: max_tokens ?? maxTokens,
        messages: toOpenAIMessages(messages, system),
        ...(tools?.length ? { tools: toOpenAITools(tools) } : {})
      };

      let iterable;
      try {
        iterable = await client.chat.completions.create(params, signal ? { signal } : undefined);
      } catch (error) {
        yield { kind: 'error', error };
        return;
      }

      const toolAccumulators = new Map();
      const toolMeta = new Map();

      try {
        for await (const chunk of iterable) {
          const choice = chunk?.choices?.[0];
          if (!choice) continue;

          const delta = choice.delta ?? {};
          if (typeof delta.content === 'string' && delta.content.length > 0) {
            yield { kind: 'text', delta: delta.content };
          }

          if (Array.isArray(delta.tool_calls)) {
            for (const toolCall of delta.tool_calls) {
              const index = toolCall.index ?? 0;
              if (!toolAccumulators.has(index)) {
                toolAccumulators.set(index, accumulateToolInputJson());
                toolMeta.set(index, { id: toolCall.id, name: toolCall.function?.name });
              }
              const meta = toolMeta.get(index);
              if (toolCall.id && !meta.id) meta.id = toolCall.id;
              if (toolCall.function?.name && !meta.name) meta.name = toolCall.function.name;
              if (typeof toolCall.function?.arguments === 'string') {
                toolAccumulators.get(index).push(toolCall.function.arguments);
              }
            }
          }

          if (choice.finish_reason) {
            for (const [index, acc] of toolAccumulators) {
              const meta = toolMeta.get(index);
              if (meta?.id && meta.name) {
                yield {
                  kind: 'tool_use',
                  id: meta.id,
                  name: meta.name,
                  input: acc.complete()
                };
              }
            }
            toolAccumulators.clear();
            toolMeta.clear();
            yield {
              kind: 'done',
              stopReason: OPENAI_FINISH_TO_STOP_REASON[choice.finish_reason] ?? 'end_turn'
            };
          }
        }
      } catch (error) {
        yield { kind: 'error', error };
      }
    }
  };
}

function toOpenAIMessages(messages, system) {
  const out = [];
  if (system) out.push({ role: 'system', content: system });
  for (const message of messages) {
    if (message.role === 'user') {
      const toolResults = message.content.filter((block) => block.type === 'tool_result');
      if (toolResults.length > 0) {
        for (const block of toolResults) {
          out.push({
            role: 'tool',
            tool_call_id: block.tool_use_id,
            content: String(block.content ?? '')
          });
        }
        continue;
      }
      const text = message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join('');
      out.push({ role: 'user', content: text });
      continue;
    }

    if (message.role === 'assistant') {
      const text = message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join('');
      const toolUses = message.content.filter((block) => block.type === 'tool_use');
      const assistant = { role: 'assistant', content: text };
      if (toolUses.length > 0) {
        assistant.tool_calls = toolUses.map((block) => ({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input ?? {})
          }
        }));
      }
      out.push(assistant);
      continue;
    }
  }
  return out;
}

function toOpenAITools(tools) {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.schema
    }
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- test/providers/openai-compat-provider.test.js
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/providers/openai-compat-provider.js test/providers/openai-compat-provider.test.js
git commit -m "feat: add openai-compat provider for the shell"
```

---

## Task 6: Session Module

**Files:**
- Create: `src/shell/session.js`
- Create: `test/shell/session.test.js`

- [ ] **Step 1: Write failing tests**

Create `test/shell/session.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { createSession } from '../../src/shell/session.js';

describe('shell/session', () => {
  it('starts with an empty messages array', () => {
    const session = createSession();
    expect(session.snapshot()).toEqual([]);
  });

  it('appends messages in order', () => {
    const session = createSession();
    session.append({ role: 'user', content: [{ type: 'text', text: 'a' }] });
    session.append({ role: 'assistant', content: [{ type: 'text', text: 'b' }] });
    expect(session.snapshot()).toEqual([
      { role: 'user', content: [{ type: 'text', text: 'a' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'b' }] }
    ]);
  });

  it('snapshot returns a frozen copy that does not mutate history', () => {
    const session = createSession();
    session.append({ role: 'user', content: [{ type: 'text', text: 'a' }] });
    const snap = session.snapshot();
    expect(() => snap.push({ role: 'user', content: [] })).toThrow();
    session.append({ role: 'assistant', content: [{ type: 'text', text: 'b' }] });
    expect(snap.length).toBe(1);
  });

  it('exposes outstanding tool_use ids that lack a tool_result', () => {
    const session = createSession();
    session.append({
      role: 'assistant',
      content: [{ type: 'tool_use', id: 't1', name: 'Read', input: {} }]
    });
    expect(session.outstandingToolUseIds()).toEqual(['t1']);

    session.append({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }]
    });
    expect(session.outstandingToolUseIds()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/shell/session.test.js
```

Expected: FAIL because `src/shell/session.js` does not exist.

- [ ] **Step 3: Implement the session**

Create `src/shell/session.js`:

```js
/**
 * Purpose: Hold one shell session's conversation state.
 * Responsibilities:
 * - Append user and assistant messages in order.
 * - Expose a frozen snapshot for provider calls and tests.
 * - Track outstanding tool_use blocks that still need a tool_result.
 */

export function createSession() {
  const messages = [];

  return {
    append(message) {
      messages.push(message);
    },
    snapshot() {
      return Object.freeze(messages.map((message) => Object.freeze(message)));
    },
    outstandingToolUseIds() {
      const seen = new Set();
      const resolved = new Set();
      for (const message of messages) {
        for (const block of message.content ?? []) {
          if (block.type === 'tool_use') seen.add(block.id);
          if (block.type === 'tool_result') resolved.add(block.tool_use_id);
        }
      }
      return [...seen].filter((id) => !resolved.has(id));
    }
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- test/shell/session.test.js
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shell/session.js test/shell/session.test.js
git commit -m "feat: add shell session state"
```

---

## Task 7: Permissions Module

**Files:**
- Create: `src/shell/permissions.js`
- Create: `test/shell/permissions.test.js`

- [ ] **Step 1: Write failing tests**

Create `test/shell/permissions.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { checkPermission } from '../../src/shell/permissions.js';

const defaultAllow = { defaultAction: 'allow', tools: {} };

describe('shell/permissions', () => {
  it('returns the defaultAction when tool is not listed', () => {
    expect(checkPermission('Read', { path: 'a' }, defaultAllow)).toBe('allow');
    expect(checkPermission('Bash', { command: 'ls' }, { defaultAction: 'prompt', tools: {} })).toBe('prompt');
    expect(checkPermission('Read', { path: 'a' }, { defaultAction: 'deny', tools: {} })).toBe('deny');
  });

  it('respects literal tool actions', () => {
    expect(
      checkPermission('Read', { path: 'a' }, { defaultAction: 'deny', tools: { Read: { action: 'allow', allow: [], deny: [] } } })
    ).toBe('allow');
    expect(
      checkPermission('Bash', { command: 'ls' }, { defaultAction: 'allow', tools: { Bash: { action: 'prompt', allow: [], deny: [] } } })
    ).toBe('prompt');
  });

  it('matches glob allow patterns for file paths', () => {
    const policy = {
      defaultAction: 'allow',
      tools: { Edit: { action: 'patterns', allow: ['src/**'], deny: ['.env*'] } }
    };
    expect(checkPermission('Edit', { path: 'src/x.js' }, policy)).toBe('allow');
    expect(checkPermission('Edit', { path: '.env.local' }, policy)).toBe('deny');
    expect(checkPermission('Edit', { path: 'other.md' }, policy)).toBe('prompt');
  });

  it('matches command patterns for Bash', () => {
    const policy = {
      defaultAction: 'deny',
      tools: {
        Bash: {
          action: 'patterns',
          allow: ['npm *', 'git status', 'git log*'],
          deny: ['rm -rf *', 'git push*']
        }
      }
    };
    expect(checkPermission('Bash', { command: 'npm test' }, policy)).toBe('allow');
    expect(checkPermission('Bash', { command: 'git status' }, policy)).toBe('allow');
    expect(checkPermission('Bash', { command: 'git log --oneline -5' }, policy)).toBe('allow');
    expect(checkPermission('Bash', { command: 'git push --force origin main' }, policy)).toBe('deny');
    expect(checkPermission('Bash', { command: 'rm -rf /' }, policy)).toBe('deny');
    expect(checkPermission('Bash', { command: 'ls' }, policy)).toBe('prompt');
  });

  it('deny beats allow when both patterns match', () => {
    const policy = {
      defaultAction: 'allow',
      tools: { Edit: { action: 'patterns', allow: ['**/*.md'], deny: ['secret/*.md'] } }
    };
    expect(checkPermission('Edit', { path: 'docs/x.md' }, policy)).toBe('allow');
    expect(checkPermission('Edit', { path: 'secret/x.md' }, policy)).toBe('deny');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/shell/permissions.test.js
```

Expected: FAIL because `src/shell/permissions.js` does not exist.

- [ ] **Step 3: Implement the permission checker**

Create `src/shell/permissions.js`:

```js
/**
 * Purpose: Evaluate a shell-permission policy against a tool invocation.
 * Responsibilities:
 * - Return the per-tool literal action when configured.
 * - Evaluate allow/deny patterns for Read/Edit/Write (path) and Bash (command).
 * - Fall back to the policy defaultAction when no rule matches.
 */

export function checkPermission(toolName, args, policy) {
  const rule = policy?.tools?.[toolName];
  const fallback = policy?.defaultAction ?? 'allow';

  if (!rule) return fallback;

  if (rule.action === 'allow' || rule.action === 'prompt' || rule.action === 'deny') {
    return rule.action;
  }

  if (rule.action === 'patterns') {
    const subject = subjectForTool(toolName, args);
    const denyMatches = rule.deny?.some((pattern) => matchesPattern(subject, pattern)) ?? false;
    if (denyMatches) return 'deny';

    const allowMatches = rule.allow?.some((pattern) => matchesPattern(subject, pattern)) ?? false;
    if (allowMatches) return 'allow';

    return 'prompt';
  }

  return fallback;
}

function subjectForTool(toolName, args) {
  if (toolName === 'Bash') return args?.command ?? '';
  return args?.path ?? '';
}

function matchesPattern(subject, pattern) {
  const regex = patternToRegex(pattern);
  return regex.test(subject);
}

function patternToRegex(pattern) {
  let source = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const ch = pattern[index];
    if (ch === '*') {
      if (pattern[index + 1] === '*') {
        source += '.*';
        index += 1;
      } else {
        source += '[^/]*';
      }
      continue;
    }
    if (ch === '?') {
      source += '[^/]';
      continue;
    }
    if ('.+^$(){}|[]\\'.includes(ch)) {
      source += `\\${ch}`;
      continue;
    }
    source += ch;
  }
  source += '$';
  return new RegExp(source);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- test/shell/permissions.test.js
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shell/permissions.js test/shell/permissions.test.js
git commit -m "feat: add shell permission checker"
```

---

## Task 8: Read Tool

**Files:**
- Create: `src/shell/tools/read.js`
- Create: `test/shell/tools/read.test.js`

- [ ] **Step 1: Write failing tests**

Create `test/shell/tools/read.test.js`:

```js
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readTool, READ_SCHEMA } from '../../../src/shell/tools/read.js';

let tmpDir;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-read-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('shell/tools/read', () => {
  it('declares a JSON schema with required path', () => {
    expect(READ_SCHEMA.type).toBe('object');
    expect(READ_SCHEMA.required).toContain('path');
  });

  it('reads a file and returns its content', async () => {
    const file = path.join(tmpDir, 'a.txt');
    await fs.writeFile(file, 'hello\nworld\n');

    const result = await readTool({ path: file });

    expect(result.content).toBe('hello\nworld\n');
    expect(result.isError).toBeUndefined();
  });

  it('applies offset and limit by line', async () => {
    const file = path.join(tmpDir, 'b.txt');
    await fs.writeFile(file, '1\n2\n3\n4\n5\n');

    const result = await readTool({ path: file, offset: 1, limit: 2 });

    expect(result.content).toBe('2\n3\n');
  });

  it('returns an error tool_result when the file is missing', async () => {
    const result = await readTool({ path: path.join(tmpDir, 'nope.txt') });

    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/ENOENT|no such file/i);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/shell/tools/read.test.js
```

Expected: FAIL because `src/shell/tools/read.js` does not exist.

- [ ] **Step 3: Implement Read**

Create `src/shell/tools/read.js`:

```js
/**
 * Purpose: Read a file from disk for the shell agent.
 * Responsibilities:
 * - Return file content as a string.
 * - Support optional line offset and limit.
 * - Translate filesystem errors into tool_result errors.
 */
import fs from 'node:fs/promises';

export const READ_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    path: { type: 'string', description: 'Absolute or working-directory-relative file path.' },
    offset: { type: 'integer', minimum: 0, description: 'Zero-based line number to start at.' },
    limit: { type: 'integer', minimum: 1, description: 'Maximum number of lines to return.' }
  },
  required: ['path']
});

export async function readTool({ path: target, offset, limit }) {
  try {
    const full = await fs.readFile(target, 'utf8');
    if (offset == null && limit == null) return { content: full };
    const lines = full.split('\n');
    const startIndex = offset ?? 0;
    const endIndex = limit == null ? lines.length : Math.min(lines.length, startIndex + limit);
    const slice = lines.slice(startIndex, endIndex);
    const appendNewline = endIndex < lines.length || full.endsWith('\n');
    return { content: slice.join('\n') + (appendNewline ? '\n' : '') };
  } catch (error) {
    return { isError: true, content: error.message };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- test/shell/tools/read.test.js
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shell/tools/read.js test/shell/tools/read.test.js
git commit -m "feat: add shell Read tool"
```

---

## Task 9: Write Tool

**Files:**
- Create: `src/shell/tools/write.js`
- Create: `test/shell/tools/write.test.js`

- [ ] **Step 1: Write failing tests**

Create `test/shell/tools/write.test.js`:

```js
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeTool, WRITE_SCHEMA } from '../../../src/shell/tools/write.js';

let tmpDir;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-write-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('shell/tools/write', () => {
  it('declares a JSON schema with required path and content', () => {
    expect(WRITE_SCHEMA.required).toEqual(expect.arrayContaining(['path', 'content']));
  });

  it('writes a new file and creates parent directories', async () => {
    const file = path.join(tmpDir, 'nested', 'a.txt');
    const result = await writeTool({ path: file, content: 'hello' });

    expect(result.isError).toBeUndefined();
    expect(await fs.readFile(file, 'utf8')).toBe('hello');
  });

  it('overwrites an existing file', async () => {
    const file = path.join(tmpDir, 'a.txt');
    await fs.writeFile(file, 'old');

    const result = await writeTool({ path: file, content: 'new' });

    expect(result.isError).toBeUndefined();
    expect(await fs.readFile(file, 'utf8')).toBe('new');
  });

  it('returns an error tool_result when the target cannot be written', async () => {
    const result = await writeTool({ path: tmpDir, content: 'x' });

    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/EISDIR|directory/i);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/shell/tools/write.test.js
```

Expected: FAIL because `src/shell/tools/write.js` does not exist.

- [ ] **Step 3: Implement Write**

Create `src/shell/tools/write.js`:

```js
/**
 * Purpose: Write a file to disk for the shell agent.
 * Responsibilities:
 * - Create parent directories as needed.
 * - Overwrite the target if it already exists.
 * - Translate filesystem errors into tool_result errors.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

export const WRITE_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    path: { type: 'string', description: 'Destination file path.' },
    content: { type: 'string', description: 'Full file content.' }
  },
  required: ['path', 'content']
});

export async function writeTool({ path: target, content }) {
  try {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
    return { content: `Wrote ${content.length} bytes to ${target}` };
  } catch (error) {
    return { isError: true, content: error.message };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- test/shell/tools/write.test.js
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shell/tools/write.js test/shell/tools/write.test.js
git commit -m "feat: add shell Write tool"
```

---

## Task 10: Edit Tool

**Files:**
- Create: `src/shell/tools/edit.js`
- Create: `test/shell/tools/edit.test.js`

- [ ] **Step 1: Write failing tests**

Create `test/shell/tools/edit.test.js`:

```js
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { editTool, EDIT_SCHEMA } from '../../../src/shell/tools/edit.js';

let tmpDir;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-edit-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('shell/tools/edit', () => {
  it('declares a JSON schema with required path, old_string, new_string', () => {
    expect(EDIT_SCHEMA.required).toEqual(expect.arrayContaining(['path', 'old_string', 'new_string']));
  });

  it('replaces the single matching occurrence', async () => {
    const file = path.join(tmpDir, 'a.txt');
    await fs.writeFile(file, 'hello world');

    const result = await editTool({ path: file, old_string: 'world', new_string: 'axiom' });

    expect(result.isError).toBeUndefined();
    expect(await fs.readFile(file, 'utf8')).toBe('hello axiom');
  });

  it('errors when old_string is not found', async () => {
    const file = path.join(tmpDir, 'a.txt');
    await fs.writeFile(file, 'hello world');

    const result = await editTool({ path: file, old_string: 'absent', new_string: 'x' });

    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/no match/i);
  });

  it('errors when old_string matches multiple times without replace_all', async () => {
    const file = path.join(tmpDir, 'a.txt');
    await fs.writeFile(file, 'x\nx\n');

    const result = await editTool({ path: file, old_string: 'x', new_string: 'y' });

    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/multiple matches/i);
  });

  it('replaces all occurrences when replace_all is true', async () => {
    const file = path.join(tmpDir, 'a.txt');
    await fs.writeFile(file, 'x\nx\n');

    const result = await editTool({ path: file, old_string: 'x', new_string: 'y', replace_all: true });

    expect(result.isError).toBeUndefined();
    expect(await fs.readFile(file, 'utf8')).toBe('y\ny\n');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/shell/tools/edit.test.js
```

Expected: FAIL because `src/shell/tools/edit.js` does not exist.

- [ ] **Step 3: Implement Edit**

Create `src/shell/tools/edit.js`:

```js
/**
 * Purpose: Apply a targeted string replacement to an existing file.
 * Responsibilities:
 * - Require an exact match of old_string.
 * - Refuse ambiguous matches without replace_all.
 * - Translate filesystem errors into tool_result errors.
 */
import fs from 'node:fs/promises';

export const EDIT_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    path: { type: 'string', description: 'File to edit.' },
    old_string: { type: 'string', description: 'Exact text to replace.' },
    new_string: { type: 'string', description: 'Replacement text.' },
    replace_all: { type: 'boolean', description: 'Replace every occurrence when true.' }
  },
  required: ['path', 'old_string', 'new_string']
});

export async function editTool({ path: target, old_string, new_string, replace_all }) {
  let content;
  try {
    content = await fs.readFile(target, 'utf8');
  } catch (error) {
    return { isError: true, content: error.message };
  }

  if (!content.includes(old_string)) {
    return { isError: true, content: 'Edit failed: no match for old_string in the target file.' };
  }

  let updated;
  if (replace_all) {
    updated = content.split(old_string).join(new_string);
  } else {
    const first = content.indexOf(old_string);
    const next = content.indexOf(old_string, first + old_string.length);
    if (next !== -1) {
      return { isError: true, content: 'Edit failed: multiple matches for old_string; pass replace_all: true or include more context.' };
    }
    updated = content.slice(0, first) + new_string + content.slice(first + old_string.length);
  }

  try {
    await fs.writeFile(target, updated);
  } catch (error) {
    return { isError: true, content: error.message };
  }

  return { content: `Edited ${target}` };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- test/shell/tools/edit.test.js
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shell/tools/edit.js test/shell/tools/edit.test.js
git commit -m "feat: add shell Edit tool"
```

---

## Task 11: Bash Tool

**Files:**
- Create: `src/shell/tools/bash.js`
- Create: `test/shell/tools/bash.test.js`

- [ ] **Step 1: Write failing tests**

Create `test/shell/tools/bash.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { bashTool, BASH_SCHEMA } from '../../../src/shell/tools/bash.js';

describe('shell/tools/bash', () => {
  it('declares a JSON schema with required command', () => {
    expect(BASH_SCHEMA.required).toContain('command');
  });

  it('captures stdout and a zero exit code on success', async () => {
    const result = await bashTool({ command: "echo 'hi'" });

    expect(result.isError).toBeUndefined();
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('hi');
  });

  it('returns a non-zero exit code without marking the result as an error', async () => {
    const result = await bashTool({ command: 'exit 3' });

    expect(result.isError).toBeUndefined();
    expect(result.exitCode).toBe(3);
  });

  it('reports timedOut and kills the child when the timeout fires', async () => {
    const result = await bashTool({ command: 'sleep 2', timeout_ms: 100 });

    expect(result.timedOut).toBe(true);
    expect(result.exitCode).not.toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/shell/tools/bash.test.js
```

Expected: FAIL because `src/shell/tools/bash.js` does not exist.

- [ ] **Step 3: Implement Bash**

Create `src/shell/tools/bash.js`:

```js
/**
 * Purpose: Execute a shell command from the shell agent.
 * Responsibilities:
 * - Capture stdout, stderr, exit code, and signal.
 * - Enforce a configurable timeout that kills the child on expiry.
 * - Report non-zero exit codes as normal results; only process-level failures become errors.
 */
import { spawn } from 'node:child_process';

export const BASH_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    command: { type: 'string', description: 'Shell command to execute.' },
    timeout_ms: { type: 'integer', minimum: 1, description: 'Timeout in milliseconds. Defaults to 120_000.' },
    cwd: { type: 'string', description: 'Working directory. Defaults to the shell process cwd.' }
  },
  required: ['command']
});

const DEFAULT_TIMEOUT_MS = 120_000;

export function bashTool({ command, timeout_ms = DEFAULT_TIMEOUT_MS, cwd }) {
  return new Promise((resolve) => {
    const child = spawn('/bin/sh', ['-lc', command], { cwd });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeout_ms);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ isError: true, content: error.message });
    });
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      resolve({
        content: formatSummary({ stdout, stderr, exitCode, signal, timedOut }),
        stdout,
        stderr,
        exitCode: exitCode ?? null,
        signal: signal ?? null,
        ...(timedOut ? { timedOut: true } : {})
      });
    });
  });
}

function formatSummary({ stdout, stderr, exitCode, signal, timedOut }) {
  const parts = [];
  if (timedOut) parts.push('Command timed out and was terminated.');
  parts.push(`exit: ${exitCode ?? 'null'}${signal ? ` signal: ${signal}` : ''}`);
  if (stdout.length > 0) parts.push(`stdout:\n${stdout}`);
  if (stderr.length > 0) parts.push(`stderr:\n${stderr}`);
  return parts.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- test/shell/tools/bash.test.js
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shell/tools/bash.js test/shell/tools/bash.test.js
git commit -m "feat: add shell Bash tool"
```

---

## Task 12: Tool Registry

**Files:**
- Create: `src/shell/tool-registry.js`
- Create: `test/shell/tool-registry.test.js`

- [ ] **Step 1: Write failing tests**

Create `test/shell/tool-registry.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { buildToolRegistry } from '../../src/shell/tool-registry.js';

describe('shell/tool-registry', () => {
  it('exposes the v0 tool names and JSON schemas', () => {
    const registry = buildToolRegistry();
    const names = registry.schemas.map((schema) => schema.name).sort();
    expect(names).toEqual(['Bash', 'Edit', 'Read', 'Write']);
    for (const schema of registry.schemas) {
      expect(schema.schema.type).toBe('object');
      expect(typeof schema.description).toBe('string');
    }
  });

  it('dispatches by name to the tool implementation', async () => {
    const registry = buildToolRegistry();
    const result = await registry.dispatch('Read', { path: '/no/such/file' });
    expect(result.isError).toBe(true);
  });

  it('returns an error tool_result for unknown tool names', async () => {
    const registry = buildToolRegistry();
    const result = await registry.dispatch('Nope', {});
    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/unknown tool/i);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/shell/tool-registry.test.js
```

Expected: FAIL because `src/shell/tool-registry.js` does not exist.

- [ ] **Step 3: Implement the registry**

Create `src/shell/tool-registry.js`:

```js
/**
 * Purpose: Register the v0 shell tools and dispatch calls to them by name.
 * Responsibilities:
 * - Expose schemas for provider tool declarations.
 * - Translate unknown tool names into error tool_results.
 */
import { readTool, READ_SCHEMA } from './tools/read.js';
import { writeTool, WRITE_SCHEMA } from './tools/write.js';
import { editTool, EDIT_SCHEMA } from './tools/edit.js';
import { bashTool, BASH_SCHEMA } from './tools/bash.js';

const DESCRIPTIONS = Object.freeze({
  Read: 'Read a file from disk. Returns its content as a string.',
  Write: 'Write a file to disk, creating parent directories as needed. Overwrites if the file exists.',
  Edit: 'Replace an exact string match in an existing file. Use replace_all for multiple occurrences.',
  Bash: 'Execute a shell command with a timeout. Returns stdout, stderr, and exit code.'
});

const IMPL = Object.freeze({
  Read: readTool,
  Write: writeTool,
  Edit: editTool,
  Bash: bashTool
});

const SCHEMAS = Object.freeze({
  Read: READ_SCHEMA,
  Write: WRITE_SCHEMA,
  Edit: EDIT_SCHEMA,
  Bash: BASH_SCHEMA
});

export function buildToolRegistry() {
  const schemas = Object.keys(IMPL).map((name) => ({
    name,
    description: DESCRIPTIONS[name],
    schema: SCHEMAS[name]
  }));

  return {
    schemas,
    async dispatch(name, args) {
      const fn = IMPL[name];
      if (!fn) {
        return { isError: true, content: `Unknown tool: ${name}` };
      }
      try {
        return await fn(args ?? {});
      } catch (error) {
        return { isError: true, content: error.message ?? String(error) };
      }
    }
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- test/shell/tool-registry.test.js
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shell/tool-registry.js test/shell/tool-registry.test.js
git commit -m "feat: add shell tool registry"
```

---

## Task 13: Renderer

**Files:**
- Create: `src/shell/render.js`
- Create: `test/shell/render.test.js`

- [ ] **Step 1: Write failing tests**

Create `test/shell/render.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { createRenderer } from '../../src/shell/render.js';

function createSink() {
  let buffer = '';
  return {
    stream: {
      write(chunk) {
        buffer += chunk;
        return true;
      }
    },
    read() {
      return buffer;
    }
  };
}

describe('shell/render', () => {
  it('writes streaming text chunks to the stream as-is', () => {
    const sink = createSink();
    const renderer = createRenderer({ stream: sink.stream });
    renderer.text('hello ');
    renderer.text('world');
    expect(sink.read()).toBe('hello world');
  });

  it('renders a tool-call banner with name and input summary', () => {
    const sink = createSink();
    const renderer = createRenderer({ stream: sink.stream });
    renderer.toolCall({ name: 'Read', input: { path: 'src/a.js' } });
    expect(sink.read()).toContain('Read');
    expect(sink.read()).toContain('src/a.js');
  });

  it('renders a tool result with truncation marker when output is long', () => {
    const sink = createSink();
    const renderer = createRenderer({ stream: sink.stream, maxOutputChars: 20 });
    renderer.toolResult({ content: 'x'.repeat(100), isError: false });
    expect(sink.read()).toContain('…');
  });

  it('prefixes error results with a clear label', () => {
    const sink = createSink();
    const renderer = createRenderer({ stream: sink.stream });
    renderer.toolResult({ content: 'boom', isError: true });
    expect(sink.read()).toMatch(/error/i);
    expect(sink.read()).toContain('boom');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/shell/render.test.js
```

Expected: FAIL because `src/shell/render.js` does not exist.

- [ ] **Step 3: Implement a minimal renderer**

Create `src/shell/render.js`:

```js
/**
 * Purpose: Render streaming shell output to a terminal-like writable stream.
 * Responsibilities:
 * - Emit assistant text chunks as they stream.
 * - Render tool-call banners and results with clear separation.
 * - Truncate very long tool output to keep the terminal readable.
 */

const DEFAULT_MAX_OUTPUT = 4000;

export function createRenderer({ stream, maxOutputChars = DEFAULT_MAX_OUTPUT }) {
  if (!stream || typeof stream.write !== 'function') {
    throw new Error('createRenderer requires a writable stream');
  }

  return {
    text(chunk) {
      stream.write(chunk);
    },
    toolCall({ name, input }) {
      const summary = summarize(input, maxOutputChars);
      stream.write(`\n[tool] ${name}: ${summary}\n`);
    },
    toolResult({ content, isError }) {
      const label = isError ? '[tool error]' : '[tool result]';
      stream.write(`${label} ${truncate(String(content ?? ''), maxOutputChars)}\n`);
    },
    banner(text) {
      stream.write(`${text}\n`);
    }
  };
}

function summarize(value, max) {
  if (value == null) return '';
  if (typeof value === 'string') return truncate(value, max);
  try {
    return truncate(JSON.stringify(value), max);
  } catch {
    return '[unserializable]';
  }
}

function truncate(value, max) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- test/shell/render.test.js
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shell/render.js test/shell/render.test.js
git commit -m "feat: add shell renderer"
```

---

## Task 14: Agent Loop

**Files:**
- Create: `src/shell/agent-loop.js`
- Create: `test/shell/agent-loop.test.js`

- [ ] **Step 1: Write failing tests**

Create `test/shell/agent-loop.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';
import { runTurn } from '../../src/shell/agent-loop.js';
import { createSession } from '../../src/shell/session.js';

function fakeProvider(scriptedStreams) {
  let callIndex = 0;
  return {
    async *stream() {
      const events = scriptedStreams[callIndex] ?? [];
      callIndex += 1;
      for (const event of events) yield event;
    },
    callCount() {
      return callIndex;
    }
  };
}

function fakeTools({ responses = {} } = {}) {
  return {
    schemas: [
      { name: 'Read', description: 'read', schema: { type: 'object' } }
    ],
    async dispatch(name, args) {
      const response = responses[name] ?? { content: `${name} ran` };
      return typeof response === 'function' ? response(args) : response;
    }
  };
}

describe('shell/agent-loop', () => {
  it('streams a single text-only turn and appends the assistant message', async () => {
    const session = createSession();
    const provider = fakeProvider([
      [
        { kind: 'text', delta: 'hello' },
        { kind: 'text', delta: ' world' },
        { kind: 'done', stopReason: 'end_turn' }
      ]
    ]);

    const streamedDeltas = [];
    await runTurn(session, 'hi', {
      provider,
      tools: fakeTools(),
      policy: { defaultAction: 'allow', tools: {} },
      onStream: (chunk) => streamedDeltas.push(chunk),
      model: 'm'
    });

    expect(streamedDeltas.join('')).toBe('hello world');
    expect(session.snapshot()).toEqual([
      { role: 'user', content: [{ type: 'text', text: 'hi' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'hello world' }] }
    ]);
  });

  it('dispatches a tool_use, appends tool_result, and runs a follow-up provider call', async () => {
    const session = createSession();
    const provider = fakeProvider([
      [
        { kind: 'text', delta: 'reading' },
        { kind: 'tool_use', id: 't1', name: 'Read', input: { path: 'a' } },
        { kind: 'done', stopReason: 'tool_use' }
      ],
      [
        { kind: 'text', delta: 'done' },
        { kind: 'done', stopReason: 'end_turn' }
      ]
    ]);

    await runTurn(session, 'please read a', {
      provider,
      tools: fakeTools({ responses: { Read: { content: 'FILE BODY' } } }),
      policy: { defaultAction: 'allow', tools: {} },
      model: 'm'
    });

    expect(provider.callCount()).toBe(2);
    const snap = session.snapshot();
    expect(snap[1].content).toEqual([
      { type: 'text', text: 'reading' },
      { type: 'tool_use', id: 't1', name: 'Read', input: { path: 'a' } }
    ]);
    expect(snap[2].content).toEqual([
      { type: 'tool_result', tool_use_id: 't1', content: 'FILE BODY' }
    ]);
    expect(snap[3].content).toEqual([{ type: 'text', text: 'done' }]);
  });

  it('synthesizes a deny tool_result when the policy blocks a tool', async () => {
    const session = createSession();
    const provider = fakeProvider([
      [
        { kind: 'tool_use', id: 't1', name: 'Read', input: { path: 'a' } },
        { kind: 'done', stopReason: 'tool_use' }
      ],
      [{ kind: 'done', stopReason: 'end_turn' }]
    ]);

    const dispatchSpy = vi.fn();
    const tools = {
      schemas: [],
      dispatch: dispatchSpy
    };

    await runTurn(session, 'read', {
      provider,
      tools,
      policy: { defaultAction: 'deny', tools: {} },
      model: 'm'
    });

    expect(dispatchSpy).not.toHaveBeenCalled();
    const snap = session.snapshot();
    const toolResult = snap.find((message) =>
      message.content?.[0]?.type === 'tool_result'
    );
    expect(toolResult.content[0].is_error).toBe(true);
    expect(toolResult.content[0].content).toMatch(/Denied by security\.shell/);
  });

  it('synthesizes a prompt-declined tool_result when the user rejects', async () => {
    const session = createSession();
    const provider = fakeProvider([
      [
        { kind: 'tool_use', id: 't1', name: 'Read', input: { path: 'a' } },
        { kind: 'done', stopReason: 'tool_use' }
      ],
      [{ kind: 'done', stopReason: 'end_turn' }]
    ]);

    await runTurn(session, 'read', {
      provider,
      tools: fakeTools({ responses: { Read: { content: 'x' } } }),
      policy: { defaultAction: 'prompt', tools: {} },
      onPermissionPrompt: async () => false,
      model: 'm'
    });

    const snap = session.snapshot();
    const toolResult = snap.find((message) =>
      message.content?.[0]?.type === 'tool_result'
    );
    expect(toolResult.content[0].is_error).toBe(true);
    expect(toolResult.content[0].content).toMatch(/User declined/);
  });

  it('forwards provider errors by throwing out of the loop', async () => {
    const session = createSession();
    const boom = new Error('provider died');
    const provider = fakeProvider([[{ kind: 'error', error: boom }]]);

    await expect(
      runTurn(session, 'hi', {
        provider,
        tools: fakeTools(),
        policy: { defaultAction: 'allow', tools: {} },
        model: 'm'
      })
    ).rejects.toBe(boom);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/shell/agent-loop.test.js
```

Expected: FAIL because `src/shell/agent-loop.js` does not exist.

- [ ] **Step 3: Implement the agent loop**

Create `src/shell/agent-loop.js`:

```js
/**
 * Purpose: Orchestrate one conversation turn for the shell.
 * Responsibilities:
 * - Append the user prose to the session.
 * - Call the provider, accumulate assistant text + tool_use blocks, append as an assistant message.
 * - For each tool_use: check permissions, dispatch, append tool_result, loop.
 * - Exit the loop when the provider ends without requesting tools.
 */
import { checkPermission } from './permissions.js';

export async function runTurn(session, userInput, {
  provider,
  tools,
  policy,
  model,
  system,
  signal,
  onStream,
  onToolCall,
  onToolResult,
  onPermissionPrompt
}) {
  if (!provider) throw new Error('runTurn requires provider');
  if (!tools) throw new Error('runTurn requires tools');
  const resolvedPolicy = policy ?? { defaultAction: 'allow', tools: {} };

  session.append({ role: 'user', content: [{ type: 'text', text: userInput }] });

  while (true) {
    const assistantContent = [];
    let assistantText = '';
    const pendingToolUses = [];
    let stopReason = null;

    for await (const event of provider.stream({
      messages: session.snapshot(),
      tools: tools.schemas,
      model,
      system,
      signal
    })) {
      if (event.kind === 'text') {
        assistantText += event.delta;
        onStream?.(event.delta);
      } else if (event.kind === 'tool_use') {
        pendingToolUses.push({ id: event.id, name: event.name, input: event.input });
      } else if (event.kind === 'done') {
        stopReason = event.stopReason;
      } else if (event.kind === 'error') {
        throw event.error;
      }
    }

    if (assistantText.length > 0) {
      assistantContent.push({ type: 'text', text: assistantText });
    }
    for (const toolUse of pendingToolUses) {
      assistantContent.push({ type: 'tool_use', id: toolUse.id, name: toolUse.name, input: toolUse.input });
    }
    if (assistantContent.length > 0) {
      session.append({ role: 'assistant', content: assistantContent });
    }

    if (pendingToolUses.length === 0) return { stopReason };

    for (const toolUse of pendingToolUses) {
      onToolCall?.(toolUse);
      const decision = checkPermission(toolUse.name, toolUse.input, resolvedPolicy);

      let result;
      if (decision === 'deny') {
        result = { isError: true, content: `Denied by security.shell policy for ${toolUse.name}.` };
      } else if (decision === 'prompt') {
        const approved = await (onPermissionPrompt?.(toolUse) ?? Promise.resolve(false));
        if (!approved) {
          result = { isError: true, content: 'User declined tool invocation.' };
        } else {
          result = await tools.dispatch(toolUse.name, toolUse.input);
        }
      } else {
        result = await tools.dispatch(toolUse.name, toolUse.input);
      }

      onToolResult?.(toolUse, result);

      session.append({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: String(result.content ?? ''),
            ...(result.isError ? { is_error: true } : {})
          }
        ]
      });
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- test/shell/agent-loop.test.js
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shell/agent-loop.js test/shell/agent-loop.test.js
git commit -m "feat: add shell agent loop"
```

---

## Task 15: Slash Commands

**Files:**
- Create: `src/shell/slash-commands.js`
- Create: `test/shell/slash-commands.test.js`

- [ ] **Step 1: Write failing tests**

Create `test/shell/slash-commands.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';
import { parseSlashLine, createSlashDispatcher } from '../../src/shell/slash-commands.js';
import { createSession } from '../../src/shell/session.js';

describe('shell/slash-commands/parse', () => {
  it('returns null for non-slash lines', () => {
    expect(parseSlashLine('hello world')).toBeNull();
  });

  it('parses a bare command', () => {
    expect(parseSlashLine('/build')).toEqual({ name: 'build', args: [] });
  });

  it('parses a command with space-separated args', () => {
    expect(parseSlashLine('/build foo.axiom.js --verbose')).toEqual({
      name: 'build',
      args: ['foo.axiom.js', '--verbose']
    });
  });
});

describe('shell/slash-commands/dispatch', () => {
  it('runs /build with a stubbed handler and appends a synthetic assistant message', async () => {
    const session = createSession();
    const handler = vi.fn().mockResolvedValue({ exitCode: 0, summary: 'build ok' });
    const dispatcher = createSlashDispatcher({
      handlers: { build: handler },
      logger: { log: vi.fn(), error: vi.fn() }
    });

    const result = await dispatcher.run('/build foo.axiom.js', session);

    expect(result.handled).toBe(true);
    expect(handler).toHaveBeenCalledWith(['foo.axiom.js'], expect.any(Object));
    const snap = session.snapshot();
    expect(snap.at(-2)).toEqual({ role: 'user', content: [{ type: 'text', text: '/build foo.axiom.js' }] });
    expect(snap.at(-1).role).toBe('assistant');
    expect(snap.at(-1).content[0].text).toContain('build ok');
  });

  it('returns handled=false for non-slash input', async () => {
    const dispatcher = createSlashDispatcher({
      handlers: { build: vi.fn() },
      logger: { log: vi.fn(), error: vi.fn() }
    });
    const result = await dispatcher.run('hello', createSession());
    expect(result.handled).toBe(false);
  });

  it('reports unknown commands without invoking the LLM or mutating session', async () => {
    const session = createSession();
    const errors = [];
    const dispatcher = createSlashDispatcher({
      handlers: {},
      logger: { log: () => {}, error: (msg) => errors.push(msg) }
    });

    const result = await dispatcher.run('/nope', session);

    expect(result.handled).toBe(true);
    expect(result.unknown).toBe(true);
    expect(errors.join(' ')).toMatch(/Unknown command/);
    expect(session.snapshot()).toEqual([]);
  });

  it('captures handler errors and appends an error-summary assistant message', async () => {
    const session = createSession();
    const dispatcher = createSlashDispatcher({
      handlers: {
        build: async () => {
          throw new Error('boom');
        }
      },
      logger: { log: () => {}, error: () => {} }
    });

    const result = await dispatcher.run('/build', session);

    expect(result.handled).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
    const snap = session.snapshot();
    expect(snap.at(-1).content[0].text).toMatch(/boom/);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/shell/slash-commands.test.js
```

Expected: FAIL because `src/shell/slash-commands.js` does not exist.

- [ ] **Step 3: Implement the dispatcher**

Create `src/shell/slash-commands.js`:

```js
/**
 * Purpose: Parse and dispatch slash commands inside the shell.
 * Responsibilities:
 * - Recognize lines that start with /.
 * - Route the command to a registered handler (which calls existing src/cli/*-command.js modules in production wiring).
 * - Append a synthetic user/assistant pair so the LLM sees the command and its result on the next prose turn.
 */

export function parseSlashLine(line) {
  if (typeof line !== 'string' || !line.startsWith('/')) return null;
  const tokens = line.slice(1).trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { name: '', args: [] };
  return { name: tokens[0], args: tokens.slice(1) };
}

export function createSlashDispatcher({ handlers, logger }) {
  return {
    async run(line, session) {
      const parsed = parseSlashLine(line);
      if (!parsed) return { handled: false };

      const handler = handlers[parsed.name];
      if (!handler) {
        logger.error?.(`Unknown command: /${parsed.name}. Type /help for available commands.`);
        return { handled: true, unknown: true };
      }

      session.append({ role: 'user', content: [{ type: 'text', text: line }] });

      let result;
      let caught;
      try {
        result = await handler(parsed.args, { session, logger });
      } catch (error) {
        caught = error;
      }

      const summary = caught
        ? `/${parsed.name} failed: ${caught.message}`
        : formatSuccess(parsed.name, result);

      session.append({
        role: 'assistant',
        content: [{ type: 'text', text: summary }]
      });

      return { handled: true, result, error: caught };
    }
  };
}

function formatSuccess(name, result) {
  if (!result || typeof result !== 'object') {
    return `/${name} completed.`;
  }
  if (typeof result.summary === 'string') {
    return `/${name}: ${result.summary}${result.exitCode != null ? ` (exit ${result.exitCode})` : ''}`;
  }
  return `/${name} completed with exit ${result.exitCode ?? 0}.`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- test/shell/slash-commands.test.js
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shell/slash-commands.js test/shell/slash-commands.test.js
git commit -m "feat: add shell slash-command dispatcher"
```

---

## Task 16: Shell Entry Point And Integration Test

**Files:**
- Create: `src/shell/index.js`
- Create: `test/shell/shell-session.integration.test.js`

- [ ] **Step 1: Write failing integration test**

Create `test/shell/shell-session.integration.test.js`:

```js
import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runShellSession } from '../../src/shell/index.js';

function scriptedProvider(streams) {
  let index = 0;
  return {
    async *stream() {
      const events = streams[index] ?? [{ kind: 'done', stopReason: 'end_turn' }];
      index += 1;
      for (const event of events) yield event;
    }
  };
}

describe('shell/shell-session integration', () => {
  it('handles a prose turn that invokes Read via the real tool registry', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'axiom-shell-'));
    const file = path.join(tmp, 'a.txt');
    await fs.writeFile(file, 'FIXTURE');

    const provider = scriptedProvider([
      [
        { kind: 'tool_use', id: 't1', name: 'Read', input: { path: file } },
        { kind: 'done', stopReason: 'tool_use' }
      ],
      [
        { kind: 'text', delta: 'file says ' },
        { kind: 'text', delta: 'FIXTURE' },
        { kind: 'done', stopReason: 'end_turn' }
      ]
    ]);

    const lines = [`please read ${file}`];
    const output = { chunks: [] };
    const writable = {
      write(chunk) {
        output.chunks.push(chunk);
        return true;
      }
    };

    const result = await runShellSession({
      provider,
      policy: { defaultAction: 'allow', tools: {} },
      input: async function* () {
        for (const line of lines) yield line;
      }(),
      writable,
      model: 'm'
    });

    expect(result.turns).toBe(1);
    expect(output.chunks.join('')).toContain('file says FIXTURE');

    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('handles a slash /build turn through the injected handler without calling the provider', async () => {
    const providerCalls = [];
    const provider = {
      async *stream() {
        providerCalls.push('stream');
        yield { kind: 'done', stopReason: 'end_turn' };
      }
    };

    const buildHandler = async (args) => ({ exitCode: 0, summary: `ran build ${args.join(' ')}` });

    const output = { chunks: [] };
    const writable = {
      write(chunk) {
        output.chunks.push(chunk);
        return true;
      }
    };

    const result = await runShellSession({
      provider,
      policy: { defaultAction: 'allow', tools: {} },
      input: async function* () {
        yield '/build foo.axiom.js';
      }(),
      writable,
      model: 'm',
      slashHandlers: { build: buildHandler }
    });

    expect(result.turns).toBe(1);
    expect(providerCalls).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
npm test -- test/shell/shell-session.integration.test.js
```

Expected: FAIL because `src/shell/index.js` does not exist.

- [ ] **Step 3: Implement the shell entry point**

Create `src/shell/index.js`:

```js
/**
 * Purpose: Expose the shell's session-run entry point used by bin/ax.js and tests.
 * Responsibilities:
 * - Wire session, tools, renderer, slash dispatcher, and agent loop.
 * - Accept a line-iterator for testability instead of binding to readline directly.
 * - Return a summary of how many turns ran.
 */
import { createSession } from './session.js';
import { buildToolRegistry } from './tool-registry.js';
import { createRenderer } from './render.js';
import { createSlashDispatcher } from './slash-commands.js';
import { runTurn } from './agent-loop.js';

export async function runShellSession({
  provider,
  policy,
  input,
  writable,
  model,
  system,
  slashHandlers = {},
  onPermissionPrompt
}) {
  const session = createSession();
  const tools = buildToolRegistry();
  const renderer = createRenderer({ stream: writable });
  const dispatcher = createSlashDispatcher({
    handlers: slashHandlers,
    logger: {
      log: (message) => writable.write(`${message}\n`),
      error: (message) => writable.write(`[error] ${message}\n`)
    }
  });

  let turns = 0;
  for await (const line of input) {
    if (typeof line !== 'string' || line.trim().length === 0) continue;

    const slash = await dispatcher.run(line, session);
    if (slash.handled) {
      turns += 1;
      continue;
    }

    await runTurn(session, line, {
      provider,
      tools,
      policy,
      model,
      system,
      onStream: (chunk) => renderer.text(chunk),
      onToolCall: (toolUse) => renderer.toolCall(toolUse),
      onToolResult: (toolUse, result) =>
        renderer.toolResult({ content: result.content, isError: result.isError }),
      onPermissionPrompt
    });
    turns += 1;
  }

  return { turns, session };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- test/shell/shell-session.integration.test.js
```

Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shell/index.js test/shell/shell-session.integration.test.js
git commit -m "feat: add shell session entry point"
```

---

## Task 17: Wire `bin/ax.js` And Export Factories

**Files:**
- Modify: `bin/ax.js`
- Modify: `src/index.js`

- [ ] **Step 1: Read the current `bin/ax.js` to confirm the dispatch pattern**

Run:

```bash
cat bin/ax.js
```

Expected: the file ends with a `console.error('Usage: ax <init|analyze|build|fix> ...')` fallback. The shell dispatch will replace that fallback with a startShell call.

- [ ] **Step 2: Add a bin dispatcher for bare `ax` and `ax shell`**

Apply the following replacement to `bin/ax.js`.

Old (bottom of file):

```js
if (args[0] === 'fix') {
  const exitCode = await fixCommand(args.slice(1), { loadIntentFile, logger: console });
  process.exit(exitCode);
}

console.error('Usage: ax <init|analyze|build|fix> ...');
process.exit(1);
```

New:

```js
if (args[0] === 'fix') {
  const exitCode = await fixCommand(args.slice(1), { loadIntentFile, logger: console });
  process.exit(exitCode);
}

if (args.length === 0 || args[0] === 'shell') {
  const { startShellCli } = await import('../src/shell/start-shell-cli.js');
  const exitCode = await startShellCli(args[0] === 'shell' ? args.slice(1) : args, {
    stdin: process.stdin,
    stdout: process.stdout,
    environment: process.env,
    loadIntentFile,
    buildCommand,
    analyzeCommand,
    logger: console
  });
  process.exit(exitCode);
}

console.error('Usage: ax <init|analyze|build|fix|shell> ...');
process.exit(1);
```

- [ ] **Step 3: Create the bin-friendly CLI wrapper**

Create `src/shell/start-shell-cli.js`:

```js
/**
 * Purpose: Adapt runShellSession to the Node CLI runtime (readline input, real provider, policy lookup).
 * Responsibilities:
 * - Read lines from stdin interactively via readline.
 * - Pick a provider based on config/env (Anthropic by default; OpenAI-compat via AX_PROVIDER=openai-compat + AX_BASE_URL).
 * - Load `.axiom.js` security.shell policy when a local intent file exists.
 */
import readline from 'node:readline';
import path from 'node:path';
import { runShellSession } from './index.js';
import { createAnthropicProvider } from '../providers/anthropic-provider.js';
import { createOpenAICompatProvider } from '../providers/openai-compat-provider.js';

export async function startShellCli(
  args,
  {
    stdin,
    stdout,
    environment = process.env,
    loadIntentFile,
    buildCommand,
    analyzeCommand,
    logger = console
  }
) {
  const providerKind = environment.AX_PROVIDER ?? 'anthropic';
  let provider;
  try {
    provider = await createProvider(providerKind, environment);
  } catch (error) {
    logger.error?.(`Provider setup failed: ${error.message}`);
    return 1;
  }

  const policy = await loadShellPolicy({ cwd: process.cwd(), loadIntentFile });

  stdout.write(`ax shell (provider=${providerKind}). Ctrl-D to exit.\n> `);

  const rl = readline.createInterface({ input: stdin, crlfDelay: Infinity });
  const lines = linesFromReadline(rl, stdout);

  await runShellSession({
    provider,
    policy,
    input: lines,
    writable: stdout,
    model: environment.AX_MODEL,
    slashHandlers: {
      build: async (slashArgs) => {
        const exitCode = await buildCommand(slashArgs, { logger });
        return { exitCode, summary: `build exit ${exitCode}` };
      },
      analyze: async (slashArgs) => {
        const exitCode = await analyzeCommand(slashArgs, { logger });
        return { exitCode, summary: `analyze exit ${exitCode}` };
      }
    }
  });

  rl.close();
  return 0;
}

async function createProvider(kind, env) {
  if (kind === 'anthropic') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set.');
    }
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    return createAnthropicProvider({ client, defaultModel: env.AX_MODEL ?? 'claude-sonnet-4-6' });
  }

  if (kind === 'openai-compat') {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({
      apiKey: env.OPENAI_API_KEY ?? env.AX_API_KEY ?? 'sk-local',
      baseURL: env.AX_BASE_URL
    });
    return createOpenAICompatProvider({ client, defaultModel: env.AX_MODEL ?? 'gpt-5' });
  }

  throw new Error(`Unknown provider: ${kind}`);
}

async function loadShellPolicy({ cwd, loadIntentFile }) {
  // v0 scope: scan the cwd for a single *.axiom.js file and load its security.shell.
  // File-based shell config (.ax/config.json) is deferred to a later wave; for v0, env vars
  // (AX_PROVIDER, AX_BASE_URL, AX_MODEL) are the only non-intent configuration surface.
  try {
    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(cwd);
    const candidates = entries.filter((name) => name.endsWith('.axiom.js'));
    if (candidates.length !== 1) {
      return { defaultAction: 'allow', tools: {} };
    }
    const intent = await loadIntentFile(path.join(cwd, candidates[0]));
    return intent?.security?.shell ?? { defaultAction: 'allow', tools: {} };
  } catch {
    return { defaultAction: 'allow', tools: {} };
  }
}

async function* linesFromReadline(rl, stdout) {
  for await (const line of rl) {
    yield line;
    stdout.write('> ');
  }
}
```

- [ ] **Step 4: Export shell and provider factories from `src/index.js`**

Edit `src/index.js`, append these exports at the bottom:

```js
export { runShellSession } from './shell/index.js';
export { createSession } from './shell/session.js';
export { buildToolRegistry } from './shell/tool-registry.js';
export { createAnthropicProvider } from './providers/anthropic-provider.js';
export { createOpenAICompatProvider } from './providers/openai-compat-provider.js';
```

- [ ] **Step 5: Run the full suite**

Run:

```bash
npm test
```

Expected: all tests pass — including the new shell + provider tests and all existing tests.

- [ ] **Step 6: Commit**

```bash
git add bin/ax.js src/shell/start-shell-cli.js src/index.js
git commit -m "feat: dispatch bare ax to the shell and export shell factories"
```

---

## Task 18: Gated Live Provider Tests

**Files:**
- Create: `test/providers/anthropic-provider.integration.test.js`
- Create: `test/providers/openai-compat-provider.integration.test.js`

- [ ] **Step 1: Write the Anthropic live integration test (gated)**

Create `test/providers/anthropic-provider.integration.test.js`:

```js
import { describe, expect, it } from 'vitest';

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
const describeLive = hasKey ? describe : describe.skip;

describeLive('anthropic-provider live', () => {
  it('round-trips a trivial prompt through the real Messages API', async () => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const { createAnthropicProvider } = await import('../../src/providers/anthropic-provider.js');

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const provider = createAnthropicProvider({
      client,
      defaultModel: process.env.AX_MODEL ?? 'claude-sonnet-4-6'
    });

    let text = '';
    for await (const event of provider.stream({
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Say only the word: axiom' }] }],
      tools: []
    })) {
      if (event.kind === 'text') text += event.delta;
      if (event.kind === 'error') throw event.error;
    }

    expect(text.toLowerCase()).toContain('axiom');
  }, 30_000);
});
```

- [ ] **Step 2: Write the OpenAI-compat live integration test (gated)**

Create `test/providers/openai-compat-provider.integration.test.js`:

```js
import { describe, expect, it } from 'vitest';

const baseURL = process.env.OLLAMA_BASE_URL ?? process.env.AX_BASE_URL;
const hasLocal = Boolean(baseURL);
const hasCloud = Boolean(process.env.OPENAI_API_KEY);
const describeLive = hasLocal || hasCloud ? describe : describe.skip;

describeLive('openai-compat-provider live', () => {
  it('round-trips a trivial prompt through an OpenAI-compatible endpoint', async () => {
    const { default: OpenAI } = await import('openai');
    const { createOpenAICompatProvider } = await import('../../src/providers/openai-compat-provider.js');

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? 'sk-local',
      ...(baseURL ? { baseURL } : {})
    });
    const provider = createOpenAICompatProvider({
      client,
      defaultModel: process.env.AX_MODEL ?? (hasLocal ? 'llama3' : 'gpt-5')
    });

    let text = '';
    for await (const event of provider.stream({
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Say only the word: axiom' }] }],
      tools: []
    })) {
      if (event.kind === 'text') text += event.delta;
      if (event.kind === 'error') throw event.error;
    }

    expect(text.toLowerCase()).toContain('axiom');
  }, 60_000);
});
```

- [ ] **Step 3: Run the default suite to confirm both tests skip cleanly**

Run:

```bash
npm test -- test/providers/anthropic-provider.integration.test.js test/providers/openai-compat-provider.integration.test.js
```

Expected: both suites report skipped (no live creds in default CI env).

- [ ] **Step 4: Commit**

```bash
git add test/providers/anthropic-provider.integration.test.js test/providers/openai-compat-provider.integration.test.js
git commit -m "test: add gated live provider integration tests"
```

---

## Task 19: README Update And Final Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a shell section to the top-level README**

Append this section to `README.md` immediately above the final `## Tests` section (or the closest equivalent heading):

```markdown
## Shell

Axiom ships with a conversational shell. Launch it with bare `ax` (or `ax shell`).

```bash
ANTHROPIC_API_KEY=sk-... ax
```

The shell loads any `security.shell` policy declared in the local `.axiom.js` file. If none is declared, all tools auto-approve.

Supported providers:

- `anthropic` (default) — set `ANTHROPIC_API_KEY`.
- `openai-compat` — set `AX_PROVIDER=openai-compat`, `AX_BASE_URL=<your endpoint>`, and `OPENAI_API_KEY` (local runners like Ollama may use a placeholder key).

Slash commands inside the shell:

- `/build [target]` — run an Axiom build in-process; the result lands in the conversation.
- `/analyze [target]` — run the analyzer; the result lands in the conversation.

v0 tools: `Read`, `Write`, `Edit`, `Bash`. See `docs/superpowers/specs/2026-04-18-axiom-shell-v0-design.md` for the full design.
```

- [ ] **Step 2: Run the full test suite**

Run:

```bash
npm test
```

Expected: full suite passes, including every new shell + provider test.

- [ ] **Step 3: Smoke test the shell manually**

Run (replace key as needed):

```bash
ANTHROPIC_API_KEY=sk-... node bin/ax.js shell <<< $'hello\n'
```

Expected: the shell prints a readiness banner, streams assistant text for "hello", prints a `>` prompt, and exits cleanly on stdin close.

If a live Anthropic key is not available, verify the shell errors out with a clear message:

```bash
ANTHROPIC_API_KEY= node bin/ax.js shell
```

Expected: exit code 1, error message `Provider setup failed: ANTHROPIC_API_KEY is not set.`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document the axiom shell"
```

---

## Self-Review

Before handing off, re-read this plan against the spec (`docs/superpowers/specs/2026-04-18-axiom-shell-v0-design.md`):

- [ ] Every "In scope" item in the spec is covered by at least one task above.
- [ ] Every file named in the spec's Components section is created in a task.
- [ ] The `security.shell` schema declared in the spec matches the normalization implemented in Task 2.
- [ ] The Provider event contract in the spec matches the shape used in Tasks 3-5 and consumed in Task 14.
- [ ] The testing section in the spec (unit + integration + gated live) matches the tests created in Tasks 3-16 and 18.
- [ ] The acceptance criteria at the end of the spec are all reachable by the end of Task 19.
- [ ] Every task commits before the next begins.

Edit this plan file and mark each `- [ ]` checkbox `- [x]` as each step is completed during execution. Leave any step that is intentionally skipped as `- [ ]` with an inline note.
