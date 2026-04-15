import { describe, expect, it } from 'vitest';
import { intent, must, should, outcome, verify } from '../../src/index.js';

describe('intent helpers', () => {
  it('expands compact definitions into the full runtime shape', () => {
    const file = intent(
      {
        meta: {
          title: 'Echo Tool'
        },
        what: {
          capability: 'echo_cli_tool',
          description: 'Users can run a command that prints the provided message.'
        },
        runtime: {
          languages: ['javascript'],
          targets: ['node'],
          platforms: ['linux', 'macos', 'windows']
        },
        cli: {
          command: 'echo-tool',
          arguments: ['<message>']
        }
      },
      async () => ({ ok: true })
    );

    expect(file.definition).toMatchObject({
      id: 'echo-tool',
      meta: {
        title: 'Echo Tool'
      },
      why: {
        problem: 'Users can run a command that prints the provided message.',
        value: 'Deliver Echo Tool.'
      },
      scope: {
        includes: [],
        excludes: []
      },
      constraints: [
        {
          id: 'must-run-cli-command',
          text: 'The tool runs as a CLI command.',
          severity: 'error'
        },
        {
          id: 'must-accept-required-arguments',
          text: 'The tool accepts the declared required CLI arguments.',
          severity: 'error'
        }
      ],
      outcomes: [
        {
          id: 'cli-command-runs',
          text: 'Running the command with the declared arguments succeeds.'
        },
        {
          id: 'cli-usage-is-clear',
          text: 'Running the command without required arguments shows a clear usage error.'
        }
      ],
      verification: {
        intent: [
          {
            id: 'plan-covers-cli-flow',
            covers: ['must-run-cli-command', 'must-accept-required-arguments']
          }
        ],
        outcome: [
          {
            id: 'cli-flow',
            covers: ['cli-command-runs', 'cli-usage-is-clear']
          }
        ]
      }
    });
  });

  it('derives the standard CLI contract for compact CLI intents', () => {
    const file = intent(
      {
        meta: {
          title: 'Echo Tool'
        },
        what: {
          capability: 'echo_cli_tool',
          description: 'Users can run a command that prints the provided message.'
        },
        runtime: {
          languages: ['javascript'],
          targets: ['node'],
          platforms: ['linux', 'macos', 'windows']
        },
        cli: {
          command: 'echo-tool',
          arguments: ['<message>']
        }
      },
      async () => ({ ok: true })
    );

    expect(file.definition.constraints).toEqual([
      {
        id: 'must-run-cli-command',
        text: 'The tool runs as a CLI command.',
        severity: 'error'
      },
      {
        id: 'must-accept-required-arguments',
        text: 'The tool accepts the declared required CLI arguments.',
        severity: 'error'
      }
    ]);
    expect(file.definition.outcomes).toEqual([
      {
        id: 'cli-command-runs',
        text: 'Running the command with the declared arguments succeeds.'
      },
      {
        id: 'cli-usage-is-clear',
        text: 'Running the command without required arguments shows a clear usage error.'
      }
    ]);
    expect(file.definition.verification).toEqual({
      intent: [
        {
          id: 'plan-covers-cli-flow',
          covers: ['must-run-cli-command', 'must-accept-required-arguments']
        }
      ],
      outcome: [
        {
          id: 'cli-flow',
          covers: ['cli-command-runs', 'cli-usage-is-clear']
        }
      ]
    });
  });

  it('builds an immutable intent definition with helper records', () => {
    const file = intent(
      {
        id: 'sample',
        meta: { title: 'Sample' },
        what: { capability: 'sample', description: 'Sample app' },
        why: { problem: 'Need sample', value: 'Demonstrate runtime' },
        scope: { includes: ['x'], excludes: ['y'] },
        runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
        constraints: [must('must-exist', 'Constraint exists')],
        outcomes: [outcome('works', 'It works')],
        verification: {
          intent: [verify('plan-covers-core', ['must-exist'])],
          outcome: [verify('works-check', ['works'])]
        },
        library: { kind: 'package' }
      },
      async () => ({ ok: true })
    );

    expect(file.kind).toBe('intent-file');
    expect(file.definition.id).toBe('sample');
    expect(Object.isFrozen(file.definition)).toBe(true);
    expect(file.definition.constraints[0]).toEqual({
      id: 'must-exist',
      text: 'Constraint exists',
      severity: 'error'
    });
    expect(file.definition.outcomes[0]).toEqual({
      id: 'works',
      text: 'It works'
    });
    expect(file.definition.verification.intent[0]).toEqual({
      id: 'plan-covers-core',
      covers: ['must-exist']
    });
  });

  it('fails when an unknown top-level section is present', () => {
    expect(() =>
      intent(
        {
          id: 'broken',
          meta: { title: 'Broken' },
          what: { capability: 'sample', description: 'Broken app' },
          why: { problem: 'Need sample', value: 'Demonstrate runtime' },
          scope: { includes: [], excludes: [] },
          runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
          constraints: [must('must-exist', 'Constraint exists')],
          outcomes: [outcome('works', 'It works')],
          verification: {
            intent: [verify('plan-covers-core', ['must-exist'])],
            outcome: []
          },
          library: { kind: 'package' },
          mystery: true
        },
        async () => ({ ok: true })
      )
    ).toThrow(/Unknown top-level section: mystery/);
  });

  it('fails when verification covers an unknown clause id', () => {
    expect(() =>
      intent(
        {
          id: 'broken-coverage',
          meta: { title: 'Broken Coverage' },
          what: { capability: 'sample', description: 'Broken app' },
          why: { problem: 'Need sample', value: 'Demonstrate runtime' },
          scope: { includes: [], excludes: [] },
          runtime: { languages: ['javascript'], targets: ['node'], platforms: ['linux'] },
          constraints: [must('must-exist', 'Constraint exists')],
          outcomes: [outcome('works', 'It works')],
          verification: {
            intent: [verify('plan-covers-core', ['missing-clause'])],
            outcome: []
          },
          library: { kind: 'package' }
        },
        async () => ({ ok: true })
      )
    ).toThrow(/Unknown verification coverage id: missing-clause/);
  });

  it('accepts a top-level security section', () => {
    const file = intent(
      {
        id: 'secure-web-app',
        meta: { title: 'Secure Web App' },
        what: { capability: 'webapp', description: 'Secure browser app' },
        why: { problem: 'Need secure app', value: 'Audit generated output' },
        scope: { includes: [], excludes: [] },
        runtime: { languages: ['javascript'], targets: ['browser'], platforms: ['web'] },
        constraints: [must('must-exist', 'Constraint exists')],
        outcomes: [outcome('works', 'It works')],
        verification: { intent: [], outcome: [] },
        web: { kind: 'static' },
        security: {
          build: { mode: 'local' },
          app: {
            target: 'web-app',
            profile: 'browser-app-basic'
          }
        }
      },
      async () => ({ ok: true })
    );

    expect(file.definition.security.app.violationAction).toBe('break');
    expect(file.definition.security.build.mode).toBe('local');
  });

  it('rejects invalid security declarations during intent validation', () => {
    expect(() =>
      intent(
        {
          id: 'bad-security',
          meta: { title: 'Bad Security' },
          what: { capability: 'webapp', description: 'Bad security app' },
          why: { problem: 'Need secure app', value: 'Audit generated output' },
          scope: { includes: [], excludes: [] },
          runtime: { languages: ['javascript'], targets: ['browser'], platforms: ['web'] },
          constraints: [must('must-exist', 'Constraint exists')],
          outcomes: [outcome('works', 'It works')],
          verification: { intent: [], outcome: [] },
          web: { kind: 'static' },
          security: {
            build: { mode: 'vm', provider: 'aws', profile: 'node-webapp' }
          }
        },
        async () => ({ ok: true })
      )
    ).toThrow(/Unsupported New MVP vm provider: aws/);
  });
});
