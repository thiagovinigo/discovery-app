import { describe, expect, it } from 'vitest';
import { GeminiError, parseJsonLoose } from './geminiClient';

describe('parseJsonLoose', () => {
  it('parses plain JSON', () => {
    expect(parseJsonLoose('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips markdown fences', () => {
    expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('extracts the object when the model adds surrounding text', () => {
    expect(parseJsonLoose('Claro! Aqui está: {"a":{"b":2}} Espero ajudar.')).toEqual({ a: { b: 2 } });
  });

  it('throws GeminiError when there is no valid JSON', () => {
    expect(() => parseJsonLoose('sem json aqui')).toThrow(GeminiError);
  });

  it('throws GeminiError when the braces hold invalid JSON', () => {
    expect(() => parseJsonLoose('{nao e json}')).toThrow(GeminiError);
  });
});
