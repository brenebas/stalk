import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrCreateInstagramProfile } from '../src/data/mockProfiles.ts';
import { generateScanMetrics, generateStalkersList } from '../src/data/stalkersData.ts';

test('getOrCreateInstagramProfile handles raw handles and generates consistent data', () => {
  const profile = getOrCreateInstagramProfile('@wesley_dev');
  assert.equal(profile.handle, 'wesley_dev');
  assert.ok(profile.followersCount > 0);
  assert.ok(profile.name.length > 0);
  assert.ok(profile.bio.length > 0);

  const customProfile = getOrCreateInstagramProfile('@outro_usuario_qualquer');
  assert.equal(customProfile.handle, 'outro_usuario_qualquer');
  assert.ok(customProfile.followersCount >= 1000);
});

test('generateScanMetrics returns plausible metrics and scales intelligently with followers', () => {
  const metricsDefault = generateScanMetrics('test_user');
  assert.ok(metricsDefault.visitorsToday >= 20);

  // 1. Small profile (300 followers): should have ~25 to 45 visitors
  const metricsSmall = generateScanMetrics('amigo_pessoal', 300, false);
  assert.ok(metricsSmall.visitorsToday >= 20 && metricsSmall.visitorsToday <= 55);
  assert.ok(metricsSmall.savedPostsCount <= metricsSmall.visitorsToday);
  assert.ok(metricsSmall.forwardedDirectCount <= metricsSmall.visitorsToday);

  // 2. Medium profile (15,000 followers): should have hundreds of visitors
  const metricsMedium = generateScanMetrics('criador_sp', 15000, false);
  assert.ok(metricsMedium.visitorsToday >= 300 && metricsMedium.visitorsToday <= 750);
  assert.ok(metricsMedium.savedPostsCount >= 60);

  // 3. Celebrity profile (1,000,000 followers): should have thousands of visitors
  const metricsHuge = generateScanMetrics('famoso_oficial', 1000000, false);
  assert.ok(metricsHuge.visitorsToday >= 6000 && metricsHuge.visitorsToday <= 20000);
  assert.ok(metricsHuge.savedPostsCount >= 1000);
});

test('generateStalkersList returns 2 revealed and 16 blurred by default, or all revealed when unlocked', () => {
  const lockedList = generateStalkersList(false);
  assert.equal(lockedList.length, 18);
  const revealedLocked = lockedList.filter(s => s.isRevealed);
  assert.equal(revealedLocked.length, 2);

  const unlockedList = generateStalkersList(true);
  assert.equal(unlockedList.length, 18);
  const revealedUnlocked = unlockedList.filter(s => s.isRevealed);
  assert.equal(revealedUnlocked.length, 18);

  // Large follower profiles (e.g. 10,000 visitors detected): must cap suspect cards to max 24
  const hugeList = generateStalkersList(false, 10000);
  assert.ok(hugeList.length <= 24);
  assert.equal(hugeList.length, 24);
});

test('fetchInstagramProfileLive returns valid InstagramProfile for handle', async () => {
  const { fetchInstagramProfileLive } = await import('../src/services/instagramService.ts');
  const profile = await fetchInstagramProfileLive('camila.lima_oficial');
  assert.equal(profile.handle, 'camila.lima_oficial');
  assert.equal(profile.name, 'Camila Lima');
  assert.ok(profile.followersCount > 0);
  assert.ok(profile.postsCount > 0);
});

test('sanitizeAndValidateUsername validates and cleans handles properly', async () => {
  const { sanitizeAndValidateUsername, ApifyError } = await import('../src/services/apifyInstagramService.ts');
  
  assert.equal(sanitizeAndValidateUsername('@instagram'), 'instagram');
  assert.equal(sanitizeAndValidateUsername('  @NeymarJr  '), 'neymarjr');
  assert.equal(sanitizeAndValidateUsername('user.name_123'), 'user.name_123');

  assert.throws(() => sanitizeAndValidateUsername(''), (err: any) => err instanceof ApifyError && err.code === 'INVALID_USERNAME');
  assert.throws(() => sanitizeAndValidateUsername('@user with space'), (err: any) => err instanceof ApifyError && err.code === 'INVALID_USERNAME');
  assert.throws(() => sanitizeAndValidateUsername('@user!invalid#'), (err: any) => err instanceof ApifyError && err.code === 'INVALID_USERNAME');
});

