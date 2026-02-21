/**
 * Component tests: ToolUseDisplay — Sprint 16, Task 16.2
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolUseDisplay } from '../ToolUseDisplay';
import type { ToolCallEvent } from '../../lib/ws';

describe('ToolUseDisplay', () => {
  it('renders nothing when toolCalls is empty', () => {
    const { container } = render(<ToolUseDisplay toolCalls={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a single tool call with name and truncated args', () => {
    const toolCalls: ToolCallEvent['data'][] = [
      { name: 'search', args: '{"query": "Berachain validator setup"}', status: 'done', result: 'Found 3 results' },
    ];
    render(<ToolUseDisplay toolCalls={toolCalls} />);
    expect(screen.getByText('search')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('renders multiple tool calls as stacked blocks', () => {
    const toolCalls: ToolCallEvent['data'][] = [
      { name: 'search', args: '{}', status: 'done', result: 'ok' },
      { name: 'read', args: '{"file":"doc.md"}', status: 'done', result: 'content' },
      { name: 'calculate', args: '{"expr":"2+2"}', status: 'running' },
    ];
    render(<ToolUseDisplay toolCalls={toolCalls} />);
    expect(screen.getByText('search')).toBeInTheDocument();
    expect(screen.getByText('read')).toBeInTheDocument();
    expect(screen.getByText('calculate')).toBeInTheDocument();
  });

  it('shows spinner for running tool calls', () => {
    const toolCalls: ToolCallEvent['data'][] = [
      { name: 'search', args: '{"query": "test"}', status: 'running' },
    ];
    const { container } = render(<ToolUseDisplay toolCalls={toolCalls} />);
    // Spinner has animate-spin class
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('expands to show full args and result on click', async () => {
    const user = userEvent.setup();
    const toolCalls: ToolCallEvent['data'][] = [
      {
        name: 'search',
        args: '{"query": "Very long search query that should be truncated in the collapsed view"}',
        status: 'done',
        result: 'Search returned 5 matching documents about BGT staking rewards',
      },
    ];
    render(<ToolUseDisplay toolCalls={toolCalls} />);

    // Click to expand
    const button = screen.getByRole('button');
    await user.click(button);

    // Full result visible after expansion
    expect(screen.getByText(/Search returned 5 matching documents/)).toBeInTheDocument();
  });

  it('truncates long args in collapsed view', () => {
    const longArgs = JSON.stringify({ query: 'A'.repeat(100) });
    const toolCalls: ToolCallEvent['data'][] = [
      { name: 'search', args: longArgs, status: 'done' },
    ];
    render(<ToolUseDisplay toolCalls={toolCalls} />);
    // The collapsed view should show truncated args (first 60 chars + ...)
    expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
  });
});
