/** Names new sessions from their first prompt without delaying the main agent. */

import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  SessionManager,
  type ExtensionAPI,
  type ExtensionContext,
} from '@earendil-works/pi-coding-agent';

const SYSTEM_PROMPT =
  'Generate a concise 4-6 word title for this coding session. Use lowercase words only, with no punctuation, quotes, labels, or explanation.';

// A 4–6-word title needs little output; 32 tokens allow tokenizer variation.
const MAX_TOKENS = 32;
// Retain enough task context without sending large blobs of text.
const PROMPT_MAX_CHARACTERS = 4000;

function getCheapestModel(ctx: ExtensionContext) {
  return ctx.modelRegistry 
    .getAvailable()
    .filter((model) => model.thinkingLevelMap?.off !== null)
    .toSorted(
      (leftModel, rightModel) =>
        leftModel.cost.input +
        leftModel.cost.output -
        (rightModel.cost.input + rightModel.cost.output)
    )
    .at(0);
}

async function generateSessionName(
  prompt: string,
  ctx: ExtensionContext,
  signal: AbortSignal
) {
  const model = getCheapestModel(ctx);
  if (!model) {
    return;
  }

  // Keep the naming request isolated from project context, tools, and extensions.
  const resourceLoader = new DefaultResourceLoader({
    cwd: ctx.cwd,
    agentDir: getAgentDir(),
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
    systemPrompt: SYSTEM_PROMPT,
    appendSystemPrompt: [],
  });
  await resourceLoader.reload();

  const { session } = await createAgentSession({
    cwd: ctx.cwd,
    model: { ...model, maxTokens: MAX_TOKENS },
    thinkingLevel: 'off',
    noTools: 'all',
    resourceLoader,
    sessionManager: SessionManager.inMemory(ctx.cwd),
  });
  const abortSession = () => void session.abort();
  signal.addEventListener('abort', abortSession, { once: true });

  try {
    if (signal.aborted) {
      return;
    }
    await session.prompt(prompt.slice(0, PROMPT_MAX_CHARACTERS));
    const response = session.messages.at(-1);
    if (response?.role !== 'assistant') {
      return;
    }

    return response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join(' ')
      .toLowerCase()
      .replaceAll(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 6)
      .join(' ');
  } finally {
    signal.removeEventListener('abort', abortSession);
    session.dispose();
  }
}

export default function registerSessionNameExtension(pi: ExtensionAPI) {
  let shouldGenerateName = false;
  let generationController: AbortController | undefined;

  pi.on('session_start', (_event, ctx) => {
    // Preserve explicit names and leave existing unnamed sessions unchanged.
    shouldGenerateName =
      !pi.getSessionName() &&
      !ctx.sessionManager
        .getEntries()
        .some(
          (entry) => entry.type === 'message' && entry.message.role === 'user'
        );
  });

  pi.on('before_agent_start', (event, ctx) => {
    if (!shouldGenerateName) {
      return;
    }
    shouldGenerateName = false;
    const currentGenerationController = new AbortController();
    generationController = currentGenerationController;

    // Start naming in the background so the user's request proceeds immediately.
    void (async () => {
      try {
        const generatedName = await generateSessionName(
          event.prompt,
          ctx,
          currentGenerationController.signal
        );
        if (
          generatedName &&
          !currentGenerationController.signal.aborted &&
          !pi.getSessionName()
        ) {
          pi.setSessionName(generatedName);
        }
      } catch {
        // Keep Pi's default first-prompt title if background naming fails.
      }
    })();
  });

  pi.on('session_shutdown', () => {
    generationController?.abort();
    generationController = undefined;
  });
}
