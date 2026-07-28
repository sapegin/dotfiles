import { describe, expect, test } from 'vitest';
import { expandShellVars, parseEntries } from './defaults.ts';

describe(parseEntries, () => {
  test('parses active typed defaults write lines and skips comments', () => {
    const source = `# Always show scrollbars
#defaults write NSGlobalDomain AppleShowScrollBars -string "Always"

defaults write NSGlobalDomain AppleShowScrollBars -string "Always"
defaults write -g AppleAquaColorVariant -int 6
defaults write com.apple.finder ShowPathbar -bool true
sudo defaults write /Library/Preferences/com.apple.windowserver DisplayResolutionEnabled -bool true
defaults write NSGlobalDomain AppleLanguages -array "en-US" "en"
`;

    expect(parseEntries(source)).toStrictEqual([
      {
        raw: 'defaults write NSGlobalDomain AppleShowScrollBars -string "Always"',
        domain: 'NSGlobalDomain',
        key: 'AppleShowScrollBars',
        valueType: 'string',
        expected: 'Always',
        currentHost: false,
        sudo: false,
      },
      {
        raw: 'defaults write -g AppleAquaColorVariant -int 6',
        domain: 'NSGlobalDomain',
        key: 'AppleAquaColorVariant',
        valueType: 'int',
        expected: 6,
        currentHost: false,
        sudo: false,
      },
      {
        raw: 'defaults write com.apple.finder ShowPathbar -bool true',
        domain: 'com.apple.finder',
        key: 'ShowPathbar',
        valueType: 'bool',
        expected: true,
        currentHost: false,
        sudo: false,
      },
      {
        raw: 'sudo defaults write /Library/Preferences/com.apple.windowserver DisplayResolutionEnabled -bool true',
        domain: '/Library/Preferences/com.apple.windowserver',
        key: 'DisplayResolutionEnabled',
        valueType: 'bool',
        expected: true,
        currentHost: false,
        sudo: true,
      },
    ]);
  });

  test('strips single-quoted string values', () => {
    const source =
      "defaults write -g AppleHighlightColor -string '0.674510 0.607843 0.772549 Other'\n";

    expect(parseEntries(source)).toStrictEqual([
      {
        raw: "defaults write -g AppleHighlightColor -string '0.674510 0.607843 0.772549 Other'",
        domain: 'NSGlobalDomain',
        key: 'AppleHighlightColor',
        valueType: 'string',
        expected: '0.674510 0.607843 0.772549 Other',
        currentHost: false,
        sudo: false,
      },
    ]);
  });

  test('expands ${HOME} in string values for drift checks', () => {
    expect(expandShellVars('file://${HOME}/Desktop/')).toMatch(
      /^file:\/\/.+\/Desktop\/$/
    );
  });

  test('rejects alternate type flags like -boolean', () => {
    const source = 'defaults write com.apple.finder ShowPathbar -boolean true\n';

    expect(() => parseEntries(source)).toThrow('Invalid defaults type flags');
  });
});
