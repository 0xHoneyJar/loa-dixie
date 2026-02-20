/**
 * Component tests: OracleIdentityCard — Sprint 16, Task 16.4
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OracleIdentityCard } from '../OracleIdentityCard';

describe('OracleIdentityCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders identity card with personality data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          nftId: 'oracle',
          name: 'The Oracle',
          damp96_summary: { archetype: 'sage', temperament: 'deliberate' },
          beauvoir_hash: 'sha256:abc123def456789012345678',
        }),
        { status: 200 },
      ),
    );

    render(<OracleIdentityCard />);

    await waitFor(() => {
      expect(screen.getByText('The Oracle')).toBeInTheDocument();
    });
    expect(screen.getByText('oracle')).toBeInTheDocument();
    expect(screen.getByText(/archetype: sage/)).toBeInTheDocument();
    expect(screen.getByText(/BEAUVOIR sha256:abc123de.../)).toBeInTheDocument();
  });

  it('is hidden when identity endpoint returns error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const { container } = render(<OracleIdentityCard />);

    // Wait for the fetch to settle
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('can be dismissed', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          nftId: 'oracle',
          name: 'The Oracle',
          damp96_summary: null,
          beauvoir_hash: null,
        }),
        { status: 200 },
      ),
    );

    render(<OracleIdentityCard dismissible />);

    await waitFor(() => {
      expect(screen.getByText('The Oracle')).toBeInTheDocument();
    });

    const dismissBtn = screen.getByLabelText('Dismiss identity card');
    await user.click(dismissBtn);

    expect(screen.queryByText('The Oracle')).not.toBeInTheDocument();
  });
});
