import { describe, expect, it } from 'vitest';
import { intent, must, should, outcome, verify } from '../../src/index.js';

describe('intent helpers', () => {
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
});
