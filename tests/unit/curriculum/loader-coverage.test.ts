import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  loadCurriculumBundle,
  loaderEvents,
  getLastCurriculumLoadFailure,
  clearLastCurriculumLoadFailure,
} from '@/curriculum/loader';

describe('Curriculum Loader Coverage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    clearLastCurriculumLoadFailure();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('handles legacy levels format', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: 1,
          contentVersion: '1.0.0',
          levels: {
            level1: [
              {
                id: 'q1',
                archetype: 'identify',
                prompt: 'Test',
                payload: {},
                correctAnswer: true,
                validatorId: 'v1',
                skillIds: ['s1'],
                difficultyTier: 'easy',
              },
            ],
          },
        }),
      })
    );

    const result = await loadCurriculumBundle();
    expect(result.questionTemplates).toHaveLength(1);
    expect(result.questionTemplates[0].id).toBe('q1');
  });

  it('handles network failure (TypeError) with bundled fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    // This will use src/curriculum/bundle.json
    const result = await loadCurriculumBundle();
    expect(result.contentVersion).toBeDefined();
    expect(getLastCurriculumLoadFailure()).toBeNull();
  });

  it('handles non-TypeError failure with bundled fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Some other error')));

    const result = await loadCurriculumBundle();
    expect(result.contentVersion).toBeDefined();
  });

  it('emits failure on HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })
    );

    const listener = vi.fn();
    loaderEvents.addEventListener('curriculumLoadFailed', listener);

    await loadCurriculumBundle();

    expect(getLastCurriculumLoadFailure()).not.toBeNull();
    expect(getLastCurriculumLoadFailure()?.reason).toBe('http_error');
    expect(listener).toHaveBeenCalled();
  });

  it('handles clearLastCurriculumLoadFailure', () => {
    // Manually trigger a failure if possible or just call it
    clearLastCurriculumLoadFailure();
    expect(getLastCurriculumLoadFailure()).toBeNull();
  });

  it('handles unrecognized bundle format', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: 1,
          contentVersion: '1.0.0',
          // No questionTemplates, no skills, no levels
        }),
      })
    );

    const result = await loadCurriculumBundle();
    expect(result.contentVersion).toBe('0.0.0');
  });
});
