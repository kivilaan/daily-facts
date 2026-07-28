#!/usr/bin/env node
// Picks 5 facts for "today" from data/facts-pool.json, avoiding facts used
// recently, and writes data/daily.json + data/history.json.
// Deterministic per UTC date, so re-running on the same day is a no-op.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POOL_PATH = path.join(ROOT, 'data', 'facts-pool.json');
const DAILY_PATH = path.join(ROOT, 'data', 'daily.json');
const HISTORY_PATH = path.join(ROOT, 'data', 'history.json');
const PICKS_PER_DAY = 5;

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// Small deterministic string hash -> 32-bit seed.
function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

// mulberry32 seeded PRNG.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const date = todayUTC();
  const { pool } = readJson(POOL_PATH, { pool: [] });

  if (pool.length < PICKS_PER_DAY) {
    throw new Error(`facts-pool.json needs at least ${PICKS_PER_DAY} facts.`);
  }

  const existingDaily = readJson(DAILY_PATH, null);
  if (existingDaily && existingDaily.date === date) {
    console.log(`daily.json already up to date for ${date}, nothing to do.`);
    return;
  }

  const history = readJson(HISTORY_PATH, { recentlyUsed: [] });
  const recentlyUsed = new Set(history.recentlyUsed || []);

  let available = pool.filter((f) => !recentlyUsed.has(f.id));
  if (available.length < PICKS_PER_DAY) {
    // Not enough fresh facts left in the rotation window; start over.
    available = pool;
    history.recentlyUsed = [];
  }

  const rng = mulberry32(hashString(date));
  const picks = shuffle(available, rng).slice(0, PICKS_PER_DAY);
  const pickIds = picks.map((f) => f.id);

  const daily = {
    date,
    factIds: pickIds,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(DAILY_PATH, JSON.stringify(daily, null, 2) + '\n');

  // Keep a rolling window of recently-used ids so we don't repeat too soon,
  // but always leave enough of the pool free to fill a future day.
  const maxWindow = Math.max(pool.length - PICKS_PER_DAY, 0);
  const updatedRecent = [...(history.recentlyUsed || []), ...pickIds].slice(-maxWindow);
  fs.writeFileSync(
    HISTORY_PATH,
    JSON.stringify({ recentlyUsed: updatedRecent }, null, 2) + '\n'
  );

  console.log(`Picked facts for ${date}:`, pickIds.join(', '));
}

main();
