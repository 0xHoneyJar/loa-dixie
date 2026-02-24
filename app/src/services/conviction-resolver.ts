import type { FinnClient } from '../proxy/finn-client.js';
import type { ProjectionCache } from './projection-cache.js';
import type { AllowlistStore } from '../middleware/allowlist.js';
import {
  bgtToTier,
  TIER_CAPABILITIES,
  TIER_MODEL_POOLS,
  type ConvictionResult,
  type ConvictionTier,
  type FreesideConvictionResponse,
} from '../types/conviction.js';
import { BffError } from '../errors.js';
import { normalizeWallet } from '../utils/normalize-wallet.js';

/**
 * Conviction Tier Resolver — resolves wallet → BGT staking → conviction tier.
 *
 * Resolution flow (SDD §4.3):
 * 1. Check Redis cache for cached tier
 * 2. On miss: query freeside conviction API via loa-finn
 * 3. On freeside failure: check legacy allowlist (auto-maps to 'architect')
 * 4. On all failures: return 'observer' tier (default — graceful degradation)
 * 5. Cache result with configurable TTL (default 5min)
 *
 * See: SDD §4.3, PRD FR-4, ADR communitarian-agents (Ostrom's commons)
 */
export class ConvictionResolver {
  constructor(
    private readonly finnClient: FinnClient,
    private readonly cache: ProjectionCache<ConvictionResult> | null,
    private readonly allowlistStore: AllowlistStore | null,
    private readonly adminWallets: Set<string> = new Set(),
  ) {}

  /**
   * Resolve conviction tier for a wallet address.
   */
  async resolve(wallet: string): Promise<ConvictionResult> {
    if (!wallet) {
      return this.defaultResult();
    }

    // Admin override — always sovereign
    if (this.adminWallets.has(normalizeWallet(wallet))) {
      return {
        tier: 'sovereign',
        bgtStaked: 0,
        capabilities: TIER_CAPABILITIES['sovereign'],
        modelPool: TIER_MODEL_POOLS['sovereign'],
        source: 'admin',
      };
    }

    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get(normalizeWallet(wallet)).catch(() => null);
      if (cached) return cached;
    }

    // Try freeside conviction API
    const freesideResult = await this.resolveFromFreeside(wallet);
    if (freesideResult) {
      await this.cacheResult(wallet, freesideResult);
      return freesideResult;
    }

    // Fallback: legacy allowlist → 'architect' tier
    if (this.allowlistStore?.hasWallet(wallet)) {
      const legacyResult: ConvictionResult = {
        tier: 'architect',
        bgtStaked: 0,
        capabilities: TIER_CAPABILITIES['architect'],
        modelPool: TIER_MODEL_POOLS['architect'],
        source: 'legacy_allowlist',
      };
      await this.cacheResult(wallet, legacyResult);
      return legacyResult;
    }

    // Default: observer
    return this.defaultResult();
  }

  /**
   * Check if a wallet has a specific capability at their current tier.
   */
  async hasCapability(wallet: string, capability: string): Promise<boolean> {
    const result = await this.resolve(wallet);
    return result.capabilities.includes(capability as never);
  }

  /**
   * Invalidate cached conviction for a wallet.
   * Called when staking events are detected.
   */
  async invalidate(wallet: string): Promise<void> {
    if (this.cache) {
      await this.cache.invalidate(normalizeWallet(wallet)).catch(() => {});
    }
  }

  private async resolveFromFreeside(wallet: string): Promise<ConvictionResult | null> {
    try {
      const response = await this.finnClient.request<FreesideConvictionResponse>(
        'GET',
        `/api/conviction/${encodeURIComponent(wallet)}/staking`,
      );

      const tier: ConvictionTier = bgtToTier(response.bgtStaked);
      return {
        tier,
        bgtStaked: response.bgtStaked,
        capabilities: TIER_CAPABILITIES[tier],
        modelPool: TIER_MODEL_POOLS[tier],
        source: 'freeside',
      };
    } catch (err) {
      const walletPrefix = wallet.slice(0, 10);
      if (BffError.isBffError(err)) {
        if (err.status === 404) {
          // Expected — wallet not found in freeside
          return null;
        }
        if (err.status === 401 || err.status === 403) {
          console.warn('[conviction-resolver]', { wallet: walletPrefix, status: err.status, error: 'auth_failure' });
          return null;
        }
        if (err.status >= 500) {
          console.warn('[conviction-resolver]', { wallet: walletPrefix, status: err.status, error: 'transient_failure' });
          return null;
        }
      }
      console.warn('[conviction-resolver]', { wallet: walletPrefix, error: String(err) });
      return null;
    }
  }

  private async cacheResult(wallet: string, result: ConvictionResult): Promise<void> {
    if (this.cache) {
      await this.cache.set(normalizeWallet(wallet), {
        ...result,
        cachedAt: new Date().toISOString(),
      }).catch(() => {});
    }
  }

  private defaultResult(): ConvictionResult {
    return {
      tier: 'observer',
      bgtStaked: 0,
      capabilities: TIER_CAPABILITIES['observer'],
      modelPool: TIER_MODEL_POOLS['observer'],
      source: 'default',
    };
  }
}
