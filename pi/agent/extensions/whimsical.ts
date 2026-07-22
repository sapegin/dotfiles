import {
  type ExtensionAPI,
  type ExtensionContext,
  type Theme,
} from '@earendil-works/pi-coding-agent';

// Based on https://github.com/mitsuhiko/agent-stuff/blob/main/extensions/whimsical.ts

const SPINNER_FRAMES = ['·', '✻', '✽', '✶', '✳', '✢'] as const;
const SPINNER_INTERVAL_MS = 200;
const MESSAGE_INTERVAL_MS = 90;
const GLIDE_WIDTH = 6;
const GRAPHEME_SEGMENTER = new Intl.Segmenter();

const messages = [
  // Short
  'Vibing…',
  'Concocting…',
  'Transmuting…',
  'Pontificating…',
  'Flibbertigibbeting…',
  'Noodling…',
  'Percolating…',
  'Ruminating…',
  'Simmering…',
  'Brewing…',
  'Contemplating…',
  'Musing…',
  'Pondering…',
  'Mulling…',
  'Daydreaming…',
  'Woolgathering…',
  'Dithering…',
  'Tinkering…',
  'Fiddling…',
  'Wrangling…',
  'Jiggling…',
  'Wiggling…',
  'Meandering…',
  'Bumbling…',
  'Bamboozling…',
  'Discombobulating…',
  'Yodeling…',
  'Zigzagging…',
  'Canoodling…',
  'Schmoozing…',
  'Skedaddling…',
  'Scampering…',
  'Skittering…',
  'Swashbuckling…',
  'Oscillating…',
  'Undulating…',
  'Pulsating…',
  'Fizzing…',
  'Bubbling…',
  'Perplexing…',
  'Enchanting…',
  'Mesmerizing…',
  'Bedazzling…',
  'Sparkling…',
  'Glittering…',
  'Synthesizing…',
  'Procrastinating…',
  'Dillydallying…',
  'Lollygagging…',
  'Skulking…',
  'Lurking…',
  'Sleuthing…',
  'Rummaging…',
  'Foraging…',
  'Scavenging…',
  'Grooving…',
  'Jamming…',
  'Improvising…',
  'Freestyling…',
  'Whooshing…',
  'Swooshing…',
  'Clunking…',
  'Clanking…',
  'Rattling…',
  'Scribbling…',
  'Squiggling…',
  'Wriggling…',
  'Humming…',
  'Struggling…',

  // Long
  'Consulting the void…',
  'Asking the electrons…',
  'Bribing the compiler…',
  'Negotiating with entropy…',
  'Whispering to the bits…',
  'Tickling the stack…',
  'Massaging the heap…',
  'Herding pointers…',
  'Untangling spaghetti…',
  'Polishing the algorithms…',
  'Consulting ancient scrolls…',
  'Reading tea leaves…',
  'Shaking the magic 8-ball…',
  'Warming up the hamsters…',
  'Spinning up the squirrels…',
  'Caffeinating…',
  'Existentially questioning…',
  'Having a little think…',
  'Stroking chin thoughtfully…',
  'Squinting at the problem…',
  'Staring into the abyss…',
  'Abyss staring back…',
  'Achieving enlightenment…',
  'Performing arcane rituals…',
  'Consulting the oracle…',
  'Divining the answer…',
  'Scrying the codebase…',
  'Shuffling bits around…',
  'Aligning the chakras…',
  'Waiting for a sign…',
  'Hoping for the best…',
  'Willing it into existence…',
  'Believing really hard…',
  'Bargaining with fate…',
  'Greasing the gears…',
  'Oiling the cogs…',
  'Winding up the clockwork…',
  'Stoking the furnace…',
  'Watering the logic tree…',
  'Pruning the decision branches…',
  'Teaching old code new tricks…',
  'Having a moment of clarity…',
  'Experiencing a flash of insight…',
  'Asking the hamsters to run faster…',
  'Convincing the pixels to cooperate…',
  'Bribing the byte fairies…',
  'Whispering passwords to the void…',
  'Seducing the semicolons…',
  'Hypnotizing the hash tables…',
  'Mesmerizing the memory banks…',
  'Enchanting the error handlers…',
  'Bewitching the boolean logic…',
  'Spellbinding the stack frames…',
  'Hexing the hexadecimals…',
  'Releasing the references…',
  'Unbinding the variables…',
  'Snorkeling through the streams…',
  'Maturing the methods…',
  'Adding a dash of elegance…',
  'Sprinkling some magic dust…',
  'Folding in the features…',

  // Extra
  'Klatzing…',
  'Tram-param-param-pam-pam…',
  'Trum-purum-purum-pum-pum…',
  'Counting sheep…',
  'Yelling at a cloud…',
  'Playing with fonts…',
  'Playing with fire…',
  'Pushing pixels…',
  'Sacrificing a lamb…',
  'Praying to His Noodliness…',
  'Having a little snack…',
  'Calming exceptions…',
  'Excusing exceptions…',
  'Reading forbidden books…',
  'Fishing floating points…',
  'Purifying functions…',
  'Unwinding for loops…',
  'Sticking nose into someone’s code…',
  'Typing furiously…',
  'Lubricating with fresh butter…',
  'Squeezing the cat…',
  'Chasing tail…',
  'Barking at a wrong tree…',
  'Drawing in sand…',
  'Boiling spaghetti…',
  'Whistling a tune…',
  'Scratching head…',
  'Having a short nap…',
  'Grilling kebab-case-variables…',
  'Charming snake_case_variables…',
  'Passing camelCaseVariables through needle’s eye…',
  'SCREAMING_AT_SNAKE_CASE_VARIABLES…',
  'Converting tabs to spaces…',
  'Converting spaces to tabs…',
  'Plotting…',
  'Scheming…',
  'Wondering whether god exists…',
  'Questioning motives…',
  'Thinking of lunch…',
  'Grokking algorithms…',
  'Expecto patronum…',
  'Avada kedavra…',
  'Killing two birds with one stone…',
  'Intensifying…',
  'Rolling like cheese in butter…',
  'Raccooning…',
  'Squirreling…',
  'Running like a headless chicken…',
  'Loosing threads…',
  'Panicking…',
  'Pushing tempo…',
  'Buying tokens on black market…',
  'Starting fire…',
  'Summoning a demon…',
  'Talking to ghosts of mainframe developers…',
  'Looking into crystal ball…',
  'Tuning a radio…',
  'Receiving a transmission from USSR…',
  'Persevering…',
  'Surviving…',
  'Getting getters…',
  'Setting setters…',
  'Surfing error squiggles…',
  'Aligning pointers…',
  'Returning callbacks’ calls…',
  'Thinking v. hard…',
  'Hissing silently…',
  'Herding cats…',
  'Demystifying…',
  'Typing type declarations…',
  'Clack, clack, clack…',
  'Closing closures…',
  'Adding semicolons…',
  'Yoloing…',
  'Rubberducking…',
  'Tracing stack trace…',
  'Falling into rabbit hole…',
  'Creeping scope…',
  'Dotting loop indices…',
  'Shivering…',
  'Accepting criteria…',
  'Transgressing…',
  'Signing code with blood…',
  'Burrowing…',
  'Seasoning with salt and pepper…',
  'Crossing myself…',
  'Reading datas…',
  'Writing codes…',
  'Mmmmmmmmmmm…',
  'Is it Friday already?..',
];

function pickRandom(): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

function glidingMessage(
  theme: Theme,
  characters: readonly string[],
  frame: number
): string {
  const position =
    (frame % (characters.length + GLIDE_WIDTH * 2)) - GLIDE_WIDTH;

  return characters
    .map((character, index) => {
      const distance = Math.abs(index - position);
      if (distance <= 1) {
        return theme.fg('syntaxKeyword', theme.bold(character));
      }
      if (distance <= GLIDE_WIDTH) {
        return theme.fg('syntaxKeyword', character);
      }
      return theme.fg('dim', character);
    })
    .join('');
}

export default function Whimsical(pi: ExtensionAPI) {
  let animationTimer: ReturnType<typeof setInterval> | undefined;

  const stopAnimation = (): void => {
    if (!animationTimer) {
      return;
    }
    clearInterval(animationTimer);
    animationTimer = undefined;
  };

  const resetWorkingUi = (ctx: ExtensionContext): void => {
    stopAnimation();
    ctx.ui.setWorkingIndicator();
    ctx.ui.setWorkingMessage();
  };

  pi.on('turn_start', (_event, ctx) => {
    stopAnimation();
    const message = pickRandom();
    const characters = Array.from(
      GRAPHEME_SEGMENTER.segment(message),
      ({ segment }) => segment
    );
    let frame = 0;

    ctx.ui.setWorkingIndicator({
      frames: SPINNER_FRAMES.map((character) =>
        ctx.ui.theme.fg('syntaxKeyword', character)
      ),
      intervalMs: SPINNER_INTERVAL_MS,
    });
    ctx.ui.setWorkingMessage(glidingMessage(ctx.ui.theme, characters, frame));
    animationTimer = setInterval(() => {
      frame += 1;
      ctx.ui.setWorkingMessage(glidingMessage(ctx.ui.theme, characters, frame));
    }, MESSAGE_INTERVAL_MS);
  });

  pi.on('turn_end', (_event, ctx) => {
    resetWorkingUi(ctx);
  });

  pi.on('session_shutdown', (_event, ctx) => {
    resetWorkingUi(ctx);
  });
}
