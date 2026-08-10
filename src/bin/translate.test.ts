import { expect, test } from 'vitest';
import { modelFor, parseDirection } from './translate.ts';

test('modelFor maps supported language pairs', () => {
  expect(modelFor('de', 'en')).toBe('de-en-tiny');
  expect(modelFor('es', 'en')).toBe('es-en-tiny');
  expect(modelFor('en', 'de')).toBe('en-de-tiny');
  expect(modelFor('en', 'es')).toBe('en-es-tiny');
});

test('modelFor rejects identical languages', () => {
  expect(() => modelFor('de', 'de')).toThrow(
    'Source and target language must differ.'
  );
});

test('modelFor rejects unsupported pairs', () => {
  expect(() => modelFor('de', 'es')).toThrow(
    'Unsupported language pair: de → es'
  );
});

test('parseDirection defaults target to English', () => {
  expect(parseDirection(['Meine Versicherung'])).toStrictEqual({
    to: 'en',
    text: 'Meine Versicherung',
  });
  expect(parseDirection([])).toStrictEqual({ to: 'en' });
});

test('parseDirection accepts an explicit target language', () => {
  expect(parseDirection(['de', 'Hello world'])).toStrictEqual({
    to: 'de',
    text: 'Hello world',
  });
  expect(parseDirection(['de'])).toStrictEqual({ to: 'de' });
});
