import { LLMGenerator } from './llm';
import { RuleBasedGenerator } from './rule-based';
import type { RoleGenerator } from './types';

export type GeneratorMode = 'rule' | 'llm';

export function createGenerator(mode: GeneratorMode): RoleGenerator {
  if (mode === 'llm') {
    return new LLMGenerator();
  }
  return new RuleBasedGenerator();
}

export { RuleBasedGenerator } from './rule-based';
export { LLMGenerator } from './llm';
export type { RoleGenerator } from './types';
