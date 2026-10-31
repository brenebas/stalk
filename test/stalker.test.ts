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

test('generateStalkersList returns 3 revealed and 15 blurred by default, or all revealed when unlocked', () => {
  const lockedList = generateStalkersList(false);
  assert.equal(lockedList.length, 18);
  const revealedLocked = lockedList.filter(s => s.isRevealed);
  assert.equal(revealedLocked.length, 3);

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

test('the 3 free stalker profiles have 2 females and 1 male for both female and male users, with correct 3rd handles', async () => {
  const { APP_CONFIG } = await import('../src/config.ts');
  assert.equal(APP_CONFIG.getThirdProfileHandle('female'), 'vitor_ma0');
  assert.equal(APP_CONFIG.getThirdProfileHandle('male'), 'lella_silv');

  // Case 1: Researched profile is a woman
  const femaleUserList = generateStalkersList(false, undefined, 'female');
  const femaleUserFree = femaleUserList.filter(s => s.isRevealed);
  assert.equal(femaleUserFree.length, 3);
  assert.equal(femaleUserFree.filter(s => s.gender === 'female').length, 2);
  assert.equal(femaleUserFree.filter(s => s.gender === 'male').length, 1);
  assert.equal(femaleUserFree[2].handle, 'vitor_ma0');
  assert.equal(femaleUserFree[2].gender, 'male');
  assert.equal(femaleUserFree[2].followRelationship, 'neither');

  // Case 2: Researched profile is a man
  const maleUserList = generateStalkersList(false, undefined, 'male');
  const maleUserFree = maleUserList.filter(s => s.isRevealed);
  assert.equal(maleUserFree.length, 3);
  assert.equal(maleUserFree.filter(s => s.gender === 'female').length, 2);
  assert.equal(maleUserFree.filter(s => s.gender === 'male').length, 1);
  assert.equal(maleUserFree[2].handle, 'lella_silv');
  assert.equal(maleUserFree[2].gender, 'female');
  assert.equal(maleUserFree[2].followRelationship, 'neither');

  // Verify positioning: 2 free profiles at top, then blocked profiles, then 1 free profile below
  assert.equal(femaleUserList[0].id, 'stk-1');
  assert.equal(femaleUserList[0].isRevealed, true);
  assert.equal(femaleUserList[1].id, 'stk-2');
  assert.equal(femaleUserList[1].isRevealed, true);
  assert.equal(femaleUserList[2].isRevealed, false); // stk-3 locked
  assert.equal(femaleUserList[3].isRevealed, false); // stk-4 locked
  assert.equal(femaleUserList[4].isRevealed, false); // stk-5 locked
  assert.equal(femaleUserList[5].isRevealed, false); // stk-6 locked
  assert.equal(femaleUserList[6].id, 'stk-7');
  assert.equal(femaleUserList[6].isRevealed, true);  // stk-7 revealed below blocked ones
});

test('detectGender correctly identifies gender based on names, bios, and pronouns', async () => {
  const { detectGender } = await import('../src/utils/genderDetector.ts');
  
  assert.equal(detectGender('Mariana Silva', 'Ela/dela'), 'female');
  assert.equal(detectGender('Camila Santos', '✨ Vivendo um dia de cada vez'), 'female');
  assert.equal(detectGender('Larissa Manoela', ''), 'female');
  assert.equal(detectGender('Rodrigo Ferreira', 'Ele/dele'), 'male');
  assert.equal(detectGender('Lucas Mendes', 'Engenharia & Lifestyle'), 'male');
  assert.equal(detectGender('Neymar Jr', 'Atleta'), 'male');
});
