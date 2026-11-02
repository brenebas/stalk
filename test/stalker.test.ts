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

test('generateStalkersList returns 3 revealed and 21 blurred by default, or all revealed when unlocked', () => {
  const lockedList = generateStalkersList(false);
  assert.equal(lockedList.length, 24);
  const revealedLocked = lockedList.filter(s => s.isRevealed);
  assert.equal(revealedLocked.length, 3);

  const unlockedList = generateStalkersList(true);
  assert.equal(unlockedList.length, 24);
  const revealedUnlocked = unlockedList.filter(s => s.isRevealed);
  assert.equal(revealedUnlocked.length, 24);

  // Large follower profiles (e.g. 10,000 visitors detected): must cap suspect cards to max 24
  const hugeList = generateStalkersList(false, 10000);
  assert.ok(hugeList.length <= 24);
  assert.equal(hugeList.length, 24);
});

test('fetchInstagramProfileLive returns valid InstagramProfile for handle', async () => {
  const { fetchInstagramProfileLive } = await import('../src/services/instagramService.ts');
  const profile = await fetchInstagramProfileLive('camila.lima_oficial');
  assert.equal(profile.handle, 'camila.lima_oficial');
  assert.ok(profile.name.includes('Camila Lima'));
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

test('open profiles have max 2 visits and private profiles have realistic visits unless man stalking woman', () => {
  const listFemale = generateStalkersList(false, undefined, 'female');
  const freeProfiles = listFemale.filter(s => s.isRevealed);
  const lockedProfiles = listFemale.filter(s => !s.isRevealed);

  assert.equal(freeProfiles.length, 3);
  for (const s of freeProfiles) {
    assert.ok(s.visitsToday <= 2, `Free profile ${s.handle} must have max 2 visits, got ${s.visitsToday}`);
    // Behavior text must not contain follow relationship phrases
    assert.ok(!s.curiosityHint.toLowerCase().includes('segue você'), 'Must not say segue você');
    assert.ok(!s.curiosityHint.toLowerCase().includes('você segue'), 'Must not say você segue');
    assert.ok(!s.curiosityHint.toLowerCase().includes('vocês se seguem'), 'Must not say vocês se seguem');
  }

  // When female user is researching:
  // Male stalkers have elevated visits (14-20)
  // Female stalkers have realistic visits (3-6)
  const maleStalkers = lockedProfiles.filter(s => s.gender === 'male');
  const femaleStalkers = lockedProfiles.filter(s => s.gender === 'female');
  for (const s of maleStalkers) {
    assert.ok(s.visitsToday >= 10, `Male stalker on female user should have elevated visits, got ${s.visitsToday}`);
  }
  for (const s of femaleStalkers) {
    assert.ok(s.visitsToday <= 6, `Female stalker on female user must not exaggerate visits, got ${s.visitsToday}`);
  }

  // When male user is researching: ALL stalkers have realistic non-exaggerated visits (3-6)
  const listMale = generateStalkersList(false, undefined, 'male');
  const lockedMaleUser = listMale.filter(s => !s.isRevealed);
  for (const s of lockedMaleUser) {
    assert.ok(s.visitsToday <= 6, `For male user, private visits must not be exaggerated, got ${s.visitsToday}`);
  }

  // Verify reduced mutual friends count and existence of 0 mutual friends
  const zeroMutual = listFemale.filter(s => s.commonFriendsCount === 0);
  assert.ok(zeroMutual.length > 0, 'Must have some profiles with 0 mutual friends');
  for (const s of listFemale) {
    assert.ok(s.commonFriendsCount <= 3, `Common friends must be reduced (max 3), got ${s.commonFriendsCount}`);
  }
});

test('21 blocked profiles are configured with the user provided images and mixed/non-sequential order', () => {
  const list = generateStalkersList(false, undefined, 'female');
  const lockedProfiles = list.filter(s => !s.isRevealed);

  assert.equal(lockedProfiles.length, 21, 'Must have exactly 21 locked profiles');

  const maleLocked = lockedProfiles.filter(s => s.gender === 'male');
  const femaleLocked = lockedProfiles.filter(s => s.gender === 'female');

  assert.equal(maleLocked.length, 10, 'Must have 10 male locked profiles');
  assert.equal(femaleLocked.length, 11, 'Must have 11 female locked profiles');

  // Verify all have avatarUrl from i.ibb.co
  for (const s of lockedProfiles) {
    assert.ok(s.avatarUrl, `Profile ${s.id} must have avatarUrl`);
    assert.ok(s.avatarUrl.startsWith('https://i.ibb.co/'), `Profile ${s.id} avatarUrl must be from i.ibb.co`);
  }

  // Verify male and female genders are interleaved (not all male first then all female)
  const firstFourGenders = lockedProfiles.slice(0, 4).map(s => s.gender);
  assert.ok(firstFourGenders.includes('male') && firstFourGenders.includes('female'), 'Genders must be interleaved, not grouped in block order');
});

test('psychological engineering adapts triggers and priority based on gender', () => {
  // 1. Female user: top locked profile is female with direct story forwarding trigger
  const femaleUserList = generateStalkersList(false, undefined, 'female');
  const femaleLocked = femaleUserList.filter(s => !s.isRevealed);
  assert.equal(femaleLocked[0].gender, 'female');
  assert.equal(femaleLocked[0].relationshipCategory, 'Encaminhou no Direct');
  assert.ok(femaleLocked[0].curiosityHint.includes('Direct'));

  // 2. Male user: all 11 female locked profiles come first, with midnight and saved photo triggers
  const maleUserList = generateStalkersList(false, undefined, 'male');
  const maleLocked = maleUserList.filter(s => !s.isRevealed);
  // First 11 locked profiles must all be female
  const top11Locked = maleLocked.slice(0, 11);
  assert.equal(top11Locked.every(s => s.gender === 'female'), true, 'Top 11 locked profiles for men must be women');
  assert.equal(top11Locked[0].relationshipCategory, 'Stalker da Madrugada');
  assert.ok(top11Locked[0].curiosityHint.includes('madrugada'));
  assert.equal(top11Locked[1].relationshipCategory, 'Salvou sua Foto');
});

test('validateUsername enforces strict Instagram handle syntax', async () => {
  const { validateUsername } = await import('../api/lib/apifyBackendService.ts');
  
  assert.equal(validateUsername('@neymarjr').valid, true);
  assert.equal(validateUsername('@neymarjr').clean, 'neymarjr');
  assert.equal(validateUsername('user.name_12').valid, true);
  
  assert.equal(validateUsername('').valid, false);
  assert.equal(validateUsername('a'.repeat(31)).valid, false);
  assert.equal(validateUsername('user@invalid').valid, false);
  assert.equal(validateUsername('user name').valid, false);
});

test('getApifyToken detects missing token or invalid Stripe keys securely', async () => {
  const { getApifyToken } = await import('../api/lib/apifyBackendService.ts');
  
  const original = process.env.APIFY_API_TOKEN;
  try {
    delete process.env.APIFY_API_TOKEN;
    const resMissing = getApifyToken();
    assert.equal(resMissing.token, null);
    assert.equal(resMissing.code, 'TOKEN_MISSING');

    process.env.APIFY_API_TOKEN = 'sk_live_1234567890';
    const resStripe = getApifyToken();
    assert.equal(resStripe.token, null);
    assert.equal(resStripe.code, 'INVALID_TOKEN_FORMAT');

    process.env.APIFY_API_TOKEN = 'apify_api_testtoken123';
    const resOk = getApifyToken();
    assert.equal(resOk.token, 'apify_api_testtoken123');
  } finally {
    if (original !== undefined) {
      process.env.APIFY_API_TOKEN = original;
    } else {
      delete process.env.APIFY_API_TOKEN;
    }
  }
});

test('simulated profiles in mockProfiles are strictly flagged as isRealData: false and isDemo: true', async () => {
  const { DEMO_PROFILES, getDemoInstagramProfile } = await import('../src/data/mockProfiles.ts');
  
  for (const p of DEMO_PROFILES) {
    assert.equal(p.isRealData, false, 'Demo profile must never have isRealData: true');
    assert.equal(p.isDemo, true, 'Demo profile must have isDemo: true');
  }

  const generated = getDemoInstagramProfile('random_user_test');
  assert.equal(generated.isRealData, false);
  assert.equal(generated.isDemo, true);
});


