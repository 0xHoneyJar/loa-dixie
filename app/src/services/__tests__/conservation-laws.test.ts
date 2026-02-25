/**
 * Conservation Laws Unit Tests — Sprint 74 (cycle-007), Task S2-T3
 *
 * Tests all 5 conservation laws from CONSERVATION_REGISTRY.
 * Verifies ConservationLaw instances are correctly constructed
 * with appropriate invariants, enforcement modes, and field mappings.
 */
import { describe, it, expect } from 'vitest';
import {
  BUDGET_CONSERVATION,
  PRICING_CONSERVATION,
  CACHE_COHERENCE,
  NON_NEGATIVE_SPEND,
  BUDGET_MONOTONICITY,
  CONSERVATION_REGISTRY,
} from '../conservation-laws.js';

describe('Conservation Laws', () => {
  describe('CONSERVATION_REGISTRY', () => {
    it('contains all 5 conservation laws', () => {
      expect(CONSERVATION_REGISTRY.size).toBe(5);
      expect(CONSERVATION_REGISTRY.has('I-1')).toBe(true);
      expect(CONSERVATION_REGISTRY.has('I-2')).toBe(true);
      expect(CONSERVATION_REGISTRY.has('I-3')).toBe(true);
      expect(CONSERVATION_REGISTRY.has('INV-002')).toBe(true);
      expect(CONSERVATION_REGISTRY.has('INV-004')).toBe(true);
    });

    it('maps to correct law instances', () => {
      expect(CONSERVATION_REGISTRY.get('I-1')).toBe(BUDGET_CONSERVATION);
      expect(CONSERVATION_REGISTRY.get('I-2')).toBe(PRICING_CONSERVATION);
      expect(CONSERVATION_REGISTRY.get('I-3')).toBe(CACHE_COHERENCE);
      expect(CONSERVATION_REGISTRY.get('INV-002')).toBe(NON_NEGATIVE_SPEND);
      expect(CONSERVATION_REGISTRY.get('INV-004')).toBe(BUDGET_MONOTONICITY);
    });
  });

  describe('BUDGET_CONSERVATION (I-1)', () => {
    it('has strict enforcement', () => {
      expect(BUDGET_CONSERVATION.enforcement).toBe('strict');
    });

    it('has invariants defined', () => {
      expect(BUDGET_CONSERVATION.invariants).toBeDefined();
      expect(BUDGET_CONSERVATION.invariants.length).toBeGreaterThan(0);
    });
  });

  describe('PRICING_CONSERVATION (I-2)', () => {
    it('has strict enforcement', () => {
      expect(PRICING_CONSERVATION.enforcement).toBe('strict');
    });

    it('has invariants defined', () => {
      expect(PRICING_CONSERVATION.invariants).toBeDefined();
      expect(PRICING_CONSERVATION.invariants.length).toBeGreaterThan(0);
    });
  });

  describe('CACHE_COHERENCE (I-3)', () => {
    it('has advisory enforcement (eventual consistency)', () => {
      expect(CACHE_COHERENCE.enforcement).toBe('advisory');
    });

    it('has invariants defined', () => {
      expect(CACHE_COHERENCE.invariants).toBeDefined();
      expect(CACHE_COHERENCE.invariants.length).toBeGreaterThan(0);
    });
  });

  describe('NON_NEGATIVE_SPEND (INV-002)', () => {
    it('has strict enforcement', () => {
      expect(NON_NEGATIVE_SPEND.enforcement).toBe('strict');
    });

    it('has invariants defined', () => {
      expect(NON_NEGATIVE_SPEND.invariants).toBeDefined();
      expect(NON_NEGATIVE_SPEND.invariants.length).toBeGreaterThan(0);
    });
  });

  describe('BUDGET_MONOTONICITY (INV-004)', () => {
    it('has strict enforcement', () => {
      expect(BUDGET_MONOTONICITY.enforcement).toBe('strict');
    });

    it('has invariants defined', () => {
      expect(BUDGET_MONOTONICITY.invariants).toBeDefined();
      expect(BUDGET_MONOTONICITY.invariants.length).toBeGreaterThan(0);
    });
  });
});
