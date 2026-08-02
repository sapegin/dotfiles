/**
 * Adds structured web search and Markdown extraction tools backed by local
 * CLIs.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
  type ExtensionAPI,
  type ExecResult,
  truncateHead,
} from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';
import {
  renderPrettyCompletedTool,
  renderPrettyPendingTool,
} from './pretty.ts';

const SEARCH_TIMEOUT_MS = 30_000;
const FETCH_TIMEOUT_MS = 60_000;

function getCommandError(command: string, result: ExecResult): Error {
  if (result.stderr !== '') {
    return new Error(result.stderr);
  }
  if (result.killed) {
    return new Error(`${command} was cancelled or timed out`);
  }
  return new Error(`${command} exited with code ${result.code}`);
}

async function createWebToolResult(output: string, filename: string) {
  const truncation = truncateHead(output, {
    maxBytes: DEFAULT_MAX_BYTES,
    maxLines: DEFAULT_MAX_LINES,
  });
  if (!truncation.truncated) {
    return {
      content: [{ type: 'text' as const, text: truncation.content }],
      details: {},
    };
  }

  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-web-tools-'));
  const fullOutputPath = path.join(directory, filename);
  await fs.writeFile(fullOutputPath, output, 'utf8');

  const text =
    `${truncation.content}\n\n` +
    `[Output truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines ` +
    `(${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). ` +
    `Full output saved to: ${fullOutputPath}]`;
  return {
    content: [{ type: 'text' as const, text }],
    details: {},
  };
}

function validateWebUrl(url: string): void {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`Unsupported URL protocol: ${parsedUrl.protocol}`);
  }
}

export default function registerWebTools(pi: ExtensionAPI) {
  pi.registerTool({
    name: 'web_search',
    label: 'Web search',
    description: `Search the web using DuckDuckGo. Use for current information, documentation, articles, and other non-GitHub resources. Returns JSON.`,
    promptSnippet: 'Search the web using DuckDuckGo',
    parameters: Type.Object({
      query: Type.String({ description: 'Search query', minLength: 1 }),
      limit: Type.Optional(
        Type.Integer({
          description: 'Maximum number of results (default 10)',
          maximum: 25,
          minimum: 1,
        })
      ),
      time: Type.Optional(
        Type.String({
          description: 'Limit results to the past day, week, month, or year',
          enum: ['d', 'w', 'm', 'y'],
        })
      ),
      site: Type.Optional(
        Type.String({ description: 'Restrict results to this site or domain' })
      ),
    }),
    renderShell: 'self',
    async execute(_toolCallId, params, signal) {
      const args = ['--noua', '--json'];
      if (params.limit !== undefined) {
        args.push('--num', String(params.limit));
      }
      if (params.time !== undefined) {
        args.push('--time', params.time);
      }
      if (params.site !== undefined) {
        args.push('--site', params.site);
      }
      args.push(params.query);

      const result = await pi.exec('ddgr', args, {
        signal,
        timeout: SEARCH_TIMEOUT_MS,
      });
      if (result.code !== 0 || result.killed) {
        throw getCommandError('ddgr', result);
      }

      return createWebToolResult(result.stdout, 'search.json');
    },
    renderCall(args, theme, ctx) {
      return renderPrettyPendingTool({
        ctx,
        theme,
        name: 'Web search',
        value: args.query,
      });
    },
    renderResult(result, _options, theme, ctx) {
      const content =
        result.content[0]?.type === 'text' ? result.content[0].text : '';
      return renderPrettyCompletedTool({
        ctx,
        error: ctx.isError ? content : undefined,
        theme,
        name: 'Web search',
        value: ctx.args.query,
      });
    },
  });

  pi.registerTool({
    name: 'web_fetch',
    label: 'Web fetch',
    description: `Fetch a web page and extract its main content as Markdown using Trafilatura. Use for non-GitHub pages; prefer the github skill for GitHub URLs.`,
    promptSnippet: 'Fetch a web page and extract its main content as Markdown',
    parameters: Type.Object({
      url: Type.String({ description: 'HTTP or HTTPS URL to fetch' }),
    }),
    renderShell: 'self',
    async execute(_toolCallId, params, signal) {
      validateWebUrl(params.url);
      const result = await pi.exec(
        'trafilatura',
        ['--markdown', '-u', params.url],
        { signal, timeout: FETCH_TIMEOUT_MS }
      );
      if (result.code !== 0 || result.killed) {
        throw getCommandError('trafilatura', result);
      }

      return createWebToolResult(result.stdout, 'page.md');
    },
    renderCall(args, theme, ctx) {
      return renderPrettyPendingTool({
        ctx,
        theme,
        name: 'Web fetch',
        value: args.url,
      });
    },
    renderResult(result, _options, theme, ctx) {
      const content =
        result.content[0]?.type === 'text' ? result.content[0].text : '';
      return renderPrettyCompletedTool({
        ctx,
        error: ctx.isError ? content : undefined,
        theme,
        name: 'Web fetch',
        value: ctx.args.url,
      });
    },
  });
}
