/**
 * Unit tests: WebSocket streaming event parsing — Sprint 16, Task 16.1
 */
import { describe, it, expect } from 'vitest';
import type {
  ChatStreamEvent,
  ChunkEvent,
  ToolCallEvent,
  KnowledgeEvent,
  DoneEvent,
  ErrorEvent,
} from '../ws';

/** Simulate parsing a raw WebSocket message (same as connectChatStream internals) */
function parseEvent(raw: string): ChatStreamEvent {
  return JSON.parse(raw) as ChatStreamEvent;
}

describe('ws event parsing', () => {
  it('parses chunk event', () => {
    const raw = JSON.stringify({ type: 'chunk', data: { content: 'hello' } });
    const event = parseEvent(raw) as ChunkEvent;
    expect(event.type).toBe('chunk');
    expect(event.data.content).toBe('hello');
  });

  it('parses tool_call event with running status', () => {
    const raw = JSON.stringify({
      type: 'tool_call',
      data: { name: 'search', args: '{"query": "BGT staking"}', status: 'running' },
    });
    const event = parseEvent(raw) as ToolCallEvent;
    expect(event.type).toBe('tool_call');
    expect(event.data.name).toBe('search');
    expect(event.data.args).toContain('BGT staking');
    expect(event.data.status).toBe('running');
    expect(event.data.result).toBeUndefined();
  });

  it('parses tool_result as tool_call with done status and result', () => {
    const raw = JSON.stringify({
      type: 'tool_call',
      data: {
        name: 'search',
        args: '{"query": "BGT staking"}',
        status: 'done',
        result: 'BGT staking rewards are distributed daily',
      },
    });
    const event = parseEvent(raw) as ToolCallEvent;
    expect(event.type).toBe('tool_call');
    expect(event.data.status).toBe('done');
    expect(event.data.result).toContain('distributed daily');
  });

  it('accumulates multiple tool calls in a message', () => {
    const toolCalls: ToolCallEvent['data'][] = [];

    // Simulate streaming tool calls
    const events = [
      { type: 'tool_call', data: { name: 'search', args: '{}', status: 'running' } },
      { type: 'tool_call', data: { name: 'search', args: '{}', status: 'done', result: 'found' } },
      { type: 'tool_call', data: { name: 'read', args: '{"file":"doc.md"}', status: 'running' } },
      { type: 'tool_call', data: { name: 'read', args: '{"file":"doc.md"}', status: 'done', result: 'content' } },
    ];

    for (const evt of events) {
      const parsed = parseEvent(JSON.stringify(evt)) as ToolCallEvent;
      toolCalls.push(parsed.data);
    }

    expect(toolCalls).toHaveLength(4);
    expect(toolCalls.filter((t) => t.status === 'done')).toHaveLength(2);
  });

  it('parses knowledge event', () => {
    const raw = JSON.stringify({
      type: 'knowledge',
      data: { sources_used: ['oracle-corpus-001'], mode: 'full', tokens_used: 1500 },
    });
    const event = parseEvent(raw) as KnowledgeEvent;
    expect(event.type).toBe('knowledge');
    expect(event.data.sources_used).toHaveLength(1);
    expect(event.data.mode).toBe('full');
  });

  it('parses done event', () => {
    const raw = JSON.stringify({
      type: 'done',
      data: { content: 'Final answer', usage: { input: 100, output: 50 } },
    });
    const event = parseEvent(raw) as DoneEvent;
    expect(event.type).toBe('done');
    expect(event.data.content).toBe('Final answer');
    expect(event.data.usage?.output).toBe(50);
  });

  it('parses error event', () => {
    const raw = JSON.stringify({
      type: 'error',
      data: { message: 'Rate limit exceeded' },
    });
    const event = parseEvent(raw) as ErrorEvent;
    expect(event.type).toBe('error');
    expect(event.data.message).toContain('Rate limit');
  });
});
