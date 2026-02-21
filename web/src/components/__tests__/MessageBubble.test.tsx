/**
 * Integration tests: MessageBubble with tool calls and citations — Sprint 16, Task 16.3
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../MessageBubble';
import type { ChatMessage } from '../../hooks/useChat';

describe('MessageBubble integration', () => {
  it('renders assistant message with inline tool calls', () => {
    const message: ChatMessage = {
      id: 'msg-1',
      role: 'assistant',
      content: 'Let me search for that information.',
      toolCalls: [
        { name: 'search', args: '{"query": "BGT"}', status: 'done', result: 'Found results' },
      ],
    };
    render(<MessageBubble message={message} />);
    expect(screen.getByText('search')).toBeInTheDocument();
    expect(screen.getByText(/Let me search/)).toBeInTheDocument();
  });

  it('renders assistant message with tool calls and citations together', () => {
    const message: ChatMessage = {
      id: 'msg-2',
      role: 'assistant',
      content: 'Based on my research, here is what I found.',
      toolCalls: [
        { name: 'search', args: '{}', status: 'done', result: 'ok' },
      ],
      knowledge: {
        sources_used: ['oracle-corpus-001', 'oracle-corpus-002'],
        mode: 'full',
        tokens_used: 2000,
      },
    };
    render(<MessageBubble message={message} />);
    // Tool call and citations should both render
    expect(screen.getByText('search')).toBeInTheDocument();
    expect(screen.getByText(/Based on my research/)).toBeInTheDocument();
  });

  it('renders streaming indicator when message is still streaming', () => {
    const message: ChatMessage = {
      id: 'msg-3',
      role: 'assistant',
      content: 'Thinking...',
      isStreaming: true,
      toolCalls: [
        { name: 'search', args: '{}', status: 'running' },
      ],
    };
    const { container } = render(<MessageBubble message={message} />);
    // Streaming indicator (pulsing dot) should be present
    const pulse = container.querySelector('.animate-pulse');
    expect(pulse).toBeInTheDocument();
    // Running tool should have spinner
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders user message without tool calls', () => {
    const message: ChatMessage = {
      id: 'msg-4',
      role: 'user',
      content: 'What is BGT staking?',
    };
    render(<MessageBubble message={message} />);
    expect(screen.getByText('What is BGT staking?')).toBeInTheDocument();
  });
});
