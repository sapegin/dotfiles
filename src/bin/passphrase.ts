// Human readable password generator.
//
// - Generate a password:
//
// `passphrase`
//
// ---
// Based on https://github.com/Version2beta/passphrase
// Author: Artem Sapegin, sapegin.me
// License: MIT
// https://github.com/sapegin/dotfiles

import fs from 'node:fs';

const NAMES_DICT = '/usr/share/dict/propernames';
const DICT = '/usr/share/dict/words';

function randomItem<T>(array: T[]): T {
  const item = array[Math.floor(Math.random() * array.length)];
  if (item === undefined) {
    throw new Error('Array is empty');
  }
  return item;
}

const names = fs.readFileSync(NAMES_DICT, 'utf8').trim().split('\n');
const words = fs.readFileSync(DICT, 'utf8').trim().split('\n');

const name = randomItem(names).toLowerCase();
const word1 = randomItem(words).toLowerCase();
const word2 = randomItem(words).toLowerCase();

console.log(`${name}${word1}${word2}`);
