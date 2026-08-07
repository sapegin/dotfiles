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
  'Return exactly one line containing a concise 2-4 word topic title for this agent session. Use a noun phrase, not a sentence or stated intention: for example, "Redirect flow inspection". Use sentence case with no quotes, labels, or explanation.';

// A 2–4-word title needs little output; 32 tokens allow tokenizer variation.
const MAX_TOKENS = 32;
// Pi has no session-name limit, but we limit names to 100 characters just in
// case the model output is too long.
const SESSION_NAME_MAX_CHARACTERS = 100;
// Retain enough task context without sending large blobs of text.
const PROMPT_MAX_CHARACTERS = 4000;

function getCheapestModel(ctx: ExtensionContext) {
  return ctx.modelRegistry
    .getAvailable()
    .filter((model) => model.thinkingLevelMap?.off !== null)
    .toSorted(
      // Compare only input cost as output length is insignificant
      (leftModel, rightModel) => leftModel.cost.input - rightModel.cost.input
    )
    .at(0);
}

/** Extracts a valid title from the model's response without rewriting it. */
export function normalizeSessionName(response: string) {
  // Ignore any preamble and use the model's final non-empty line.
  const title = response
    .split(/\r?\n/)
    .map((line) => line.trim())
    .findLast(Boolean);

  // Cut the title if it's too long.
  return title?.slice(0, SESSION_NAME_MAX_CHARACTERS);
}

function getTextContent(content: string | { type: string; text?: string }[]) {
  if (typeof content === 'string') {
    return content;
  }

  return content
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('\n');
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

    return normalizeSessionName(getTextContent(response.content));
  } finally {
    signal.removeEventListener('abort', abortSession);
    session.dispose();
  }
}

export default function registerSessionNameExtension(pi: ExtensionAPI) {
  let shouldGenerateName = false;
  let generationController: AbortController | undefined;
  let titleUpdateTimeout: ReturnType<typeof setTimeout> | undefined;

  const scheduleTitleUpdate = (
    name: string | undefined,
    ctx: ExtensionContext
  ) => {
    clearTimeout(titleUpdateTimeout);
    if (!name) {
      return;
    }

    // Pi updates its default title after session events, so run once it finishes.
    titleUpdateTimeout = setTimeout(() => ctx.ui.setTitle(name), 0);
  };

  pi.on('session_start', (_event, ctx) => {
    // Preserve explicit names and leave existing unnamed sessions unchanged.
    shouldGenerateName =
      !pi.getSessionName() &&
      !ctx.sessionManager
        .getEntries()
        .some(
          (entry) => entry.type === 'message' && entry.message.role === 'user'
        );
    scheduleTitleUpdate(pi.getSessionName(), ctx);
  });

  pi.on('session_info_changed', (event, ctx) => {
    scheduleTitleUpdate(event.name, ctx);
  });

  pi.on('message_start', (event, ctx) => {
    if (!shouldGenerateName || event.message.role !== 'user') {
      return;
    }
    shouldGenerateName = false;
    const prompt = getTextContent(event.message.content);
    if (!prompt.trim()) {
      return;
    }

    const currentGenerationController = new AbortController();
    generationController = currentGenerationController;

    // Start naming from the actual user message without delaying the main agent.
    void (async () => {
      try {
        const generatedName = await generateSessionName(
          prompt,
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
    clearTimeout(titleUpdateTimeout);
    titleUpdateTimeout = undefined;
  });
}
