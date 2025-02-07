const url = require('url');
const https = require('https');
const moment = require('moment');
const knex = require('../knex');
const config = require('../config');

const UPDATE_CHECK_FREQUENCY = 12; // In hours
let updateCheckPromise = null;

async function initUpdatesTable() {
  const row = await knex('updates').first();
  if (! row) {
    await knex('updates').insert({
      available_version: null,
      last_checked: null,
    });
  }
}

/**
 * @param {String} a Version string, e.g. "2.20.0"
 * @param {String} b Version string, e.g. "2.20.0"
 * @returns {Number} 1 if version a is larger than b, -1 is version a is smaller than b, 0 if they are equal
 */
function compareVersions(a, b) {
  const aParts = a.split('.');
  const bParts = b.split('.');
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    let aPart = parseInt((aParts[i] || '0').match(/\d+/)[0] || '0', 10);
    let bPart = parseInt((bParts[i] || '0').match(/\d+/)[0] || '0', 10);
    if (aPart > bPart) return 1;
    if (aPart < bPart) return -1;
  }
  return 0;
}

async function getAvailableUpdate() {
  await initUpdatesTable();

  const packageJson = require('../../package.json');
  const currentVersion = packageJson.version;
  const { available_version: availableVersion } = await knex('updates').first();
  if (availableVersion == null) return null;
  if (currentVersion == null) return availableVersion;

  const versionDiff = compareVersions(currentVersion, availableVersion);
  if (versionDiff === -1) return availableVersion;

  return null;
}

async function refreshVersionsLoop() {
  await refreshVersions();
  setTimeout(refreshVersionsLoop, UPDATE_CHECK_FREQUENCY * 60 * 60 * 1000);
}

module.exports = {
  getAvailableUpdate
};
