/**
 * Purpose: Define the recognized top-level sections of an intent definition.
 * Responsibilities:
 * - Separate required sections from optional sections.
 * - Declare which sections count as software-domain sections.
 * - Keep definition validation and schema evolution centralized.
 */

/**
 * Required top-level definition sections.
 *
 * @type {string[]}
 */
export const REQUIRED_SECTIONS = [
  'id',
  'meta',
  'what',
  'why',
  'scope',
  'runtime',
  'constraints',
  'outcomes',
  'verification'
];

/**
 * Compact-mode sections that must still be authored explicitly.
 *
 * @type {string[]}
 */
export const COMPACT_CORE_SECTIONS = ['meta', 'what', 'runtime'];

/**
 * Optional top-level definition sections.
 *
 * @type {string[]}
 */
export const OPTIONAL_SECTIONS = [
  'build',
  'references',
  'assumptions',
  'architecture',
  'policies',
  'quality_attributes',
  'web',
  'cli',
  'service',
  'library',
  'desktop',
  'mobile',
  'model',
  'security'
];

/**
 * Recognized sections that identify the software domain.
 *
 * @type {string[]}
 */
export const DOMAIN_SECTIONS = ['web', 'cli', 'service', 'library', 'desktop', 'mobile'];
