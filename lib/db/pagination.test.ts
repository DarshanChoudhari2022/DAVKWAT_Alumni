import { describe, it, expect } from 'vitest';
import { computePagination } from '@/lib/db/pagination';

// Unit tests for the pure pagination-math seam (design Section 5,
// "Pagination reachability under estimated counts" — Requirements 5.2).
// The property-based reachability test (Property 11) lives separately.
describe('computePagination', () => {
  const PAGE_SIZE = 20;

  describe('short page is terminal', () => {
    it('reports hasNext=false when the page returns fewer than pageSize rows', () => {
      const result = computePagination({
        rowsReturned: 7,
        pageSize: PAGE_SIZE,
        page: 1,
        estimate: 1000, // even a wildly high estimate cannot make a short page non-terminal
      });

      expect(result.hasNext).toBe(false);
    });

    it('treats an empty page as terminal', () => {
      const result = computePagination({
        rowsReturned: 0,
        pageSize: PAGE_SIZE,
        page: 3,
        estimate: 0,
      });

      expect(result.hasNext).toBe(false);
    });
  });

  describe('full page exposes a further page', () => {
    it('reports hasNext=true and at least one more page when the page is full', () => {
      const result = computePagination({
        rowsReturned: PAGE_SIZE,
        pageSize: PAGE_SIZE,
        page: 1,
        estimate: 0, // estimate undercounts; reachability must not depend on it
      });

      expect(result.hasNext).toBe(true);
      // page 1 is full -> at least 2 pages must be reachable
      expect(result.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('keeps the next page reachable on a later full page despite a low estimate', () => {
      // On page 5 with full rows, offset = 80, so we have seen 100 rows and
      // expose at least one more page -> 6 pages minimum.
      const result = computePagination({
        rowsReturned: PAGE_SIZE,
        pageSize: PAGE_SIZE,
        page: 5,
        estimate: 10, // gross underestimate
      });

      expect(result.hasNext).toBe(true);
      expect(result.totalPages).toBeGreaterThanOrEqual(6);
    });
  });

  describe('estimate influences totalPages when it is the larger bound', () => {
    it('uses the estimate to expose more pages when it exceeds the rows-seen bound', () => {
      // estimate 1000 / pageSize 20 = 50 pages, larger than the rows-seen bound.
      const result = computePagination({
        rowsReturned: PAGE_SIZE,
        pageSize: PAGE_SIZE,
        page: 1,
        estimate: 1000,
      });

      expect(result.totalPages).toBe(50);
      expect(result.hasNext).toBe(true);
    });

    it('always exposes at least one page', () => {
      const result = computePagination({
        rowsReturned: 0,
        pageSize: PAGE_SIZE,
        page: 1,
        estimate: 0,
      });

      expect(result.totalPages).toBe(1);
    });
  });

  describe('defensive input clamping', () => {
    it('clamps page and pageSize below 1 up to 1', () => {
      const result = computePagination({
        rowsReturned: 0,
        pageSize: 0,
        page: 0,
        estimate: 0,
      });

      expect(result.totalPages).toBe(1);
      expect(result.hasNext).toBe(false);
    });

    it('caps rowsReturned at pageSize so an over-count cannot exceed a full page', () => {
      // rowsReturned > pageSize is impossible for a real page; it is capped to
      // pageSize, which is treated as a full (non-terminal) page.
      const result = computePagination({
        rowsReturned: 9999,
        pageSize: PAGE_SIZE,
        page: 1,
        estimate: 0,
      });

      expect(result.hasNext).toBe(true);
      expect(result.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('floors fractional inputs', () => {
      const result = computePagination({
        rowsReturned: 5.9,
        pageSize: 20.4,
        page: 1.7,
        estimate: 3.2,
      });

      // rowsReturned floors to 5 < pageSize (20) -> terminal page
      expect(result.hasNext).toBe(false);
      expect(result.totalPages).toBe(1);
    });
  });
});
