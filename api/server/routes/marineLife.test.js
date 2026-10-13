import test from 'node:test';
import assert from 'node:assert/strict';
import { registerMarineLifeRoutes } from './marineLife.js';

function setup(fetchImpl) {
  const handlers = new Map();
  const rows = new Map();
  const app = Object.fromEntries(['get', 'post', 'patch', 'delete'].map(method => [
    method,
    (path, ...callbacks) => handlers.set(`${method}:${path}`, callbacks.at(-1)),
  ]));
  const pool = {
    async query(sql, params = []) {
      if (sql.startsWith('SELECT s.*,p.full_name')) {
        if (sql.includes('WHERE s.id=$2')) {
          const row = rows.get(params[1]);
          const allowed = row && (row.user_id === params[0] || row.visibility_type === 'public');
          return { rows: allowed ? [{ ...row, full_name: row.user_id === 'owner' ? 'Ocean Diver' : 'Diver', username: row.user_id, avatar_url: 'https://images.example.test/avatar.jpg' }] : [] };
        }
        return {
          rows: [...rows.values()].slice(0, params[1]).map(row => ({
            ...row,
            full_name: row.user_id === 'owner' ? 'Ocean Diver' : 'Diver',
            username: row.user_id,
            avatar_url: 'https://images.example.test/avatar.jpg',
          })),
        };
      }
      if (sql.startsWith('SELECT * FROM app_marine_life_sightings')) {
        return { rows: [...rows.values()].filter(row => row.user_id === params[0]) };
      }
      if (sql.startsWith('INSERT INTO app_marine_life_sightings')) {
        const row = {
          id: params[0],
          user_id: params[1],
          species_name: params[2],
          normalized_species_name: params[3],
          image_url: params[4],
          observed_at: params[5],
          location_name: params[6],
          notes: params[7],
          source: params[8],
          ai_confidence: params[9],
          ai_candidates: JSON.parse(params[10]),
          species_scientific_name: params[11],
          species_summary: params[12],
          species_habitat: params[13],
          species_identification_tips: JSON.parse(params[14]),
          visibility_type: params[15],
          media_type: params[16],
          media_url: params[17],
          species_category: params[18],
          created_at: '2026-09-06T00:00:00.000Z',
        };
        rows.set(row.id, row);
        return { rows: [row] };
      }
      if (sql.startsWith('DELETE FROM app_marine_life_sightings')) {
        const row = rows.get(params[0]);
        if (!row || row.user_id !== params[1]) return { rows: [] };
        rows.delete(params[0]);
        return { rows: [{ id: params[0] }] };
      }
      if (sql.startsWith('UPDATE app_marine_life_sightings SET visibility_type')) {
        const row = rows.get(params[1]);
        if (!row || row.user_id !== params[2]) return { rows: [] };
        row.visibility_type = params[0];
        return { rows: [row] };
      }
      return { rows: [] };
    },
  };
  registerMarineLifeRoutes(app, {
    pool,
    getAuthUserId: req => req.user,
    authRateLimit: () => (_req, _res, next) => next(),
    fetchImpl,
  });

  return async function call(method, path, { user = 'owner', body = {}, params = {}, query = {} } = {}) {
    const response = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.body = payload; return this; },
    };
    await handlers.get(`${method}:${path}`)({ user, body, params, query }, response);
    return response;
  };
}

test('manual marine-life sighting saves and can be read again', async () => {
  const call = setup();
  const created = await call('post', '/api/marine-life/sightings', { body: {
    speciesName: 'Clownfish',
    imageUrl: 'https://images.example.test/clownfish.jpg',
    observedAt: '2026-09-06',
    locationName: 'Anilao',
    notes: 'Near the reef wall',
  } });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.data.source, 'USER');

  const loaded = await call('get', '/api/marine-life/sightings');
  assert.equal(loaded.statusCode, 200);
  assert.equal(loaded.body.data.length, 1);
  assert.equal(loaded.body.data[0].speciesName, 'Clownfish');
});

test('video coral sighting saves its original media and category', async () => {
  const call = setup();
  const created = await call('post', '/api/marine-life/sightings', { body: {
    speciesName: 'Staghorn coral',
    imageUrl: 'https://images.example.test/coral-frame.jpg',
    mediaType: 'video',
    mediaUrl: 'https://videos.example.test/coral.mp4',
    category: 'coral',
  } });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.data.mediaType, 'video');
  assert.equal(created.body.data.mediaUrl, 'https://videos.example.test/coral.mp4');
  assert.equal(created.body.data.category, 'coral');
});

test('marine-life sightings remain owner scoped for reads and deletes', async () => {
  const call = setup();
  const created = await call('post', '/api/marine-life/sightings', { body: {
    speciesName: 'Manta ray',
    imageUrl: 'https://images.example.test/manta.jpg',
  } });
  const id = created.body.data.id;

  assert.deepEqual((await call('get', '/api/marine-life/sightings', { user: 'other' })).body.data, []);
  assert.equal((await call('delete', '/api/marine-life/sightings/:id', { user: 'other', params: { id } })).statusCode, 404);
  assert.equal((await call('delete', '/api/marine-life/sightings/:id', { params: { id } })).statusCode, 200);
  assert.deepEqual((await call('get', '/api/marine-life/sightings')).body.data, []);
});

test('marine-life routes reject unauthenticated access and invalid input', async () => {
  const call = setup();
  assert.equal((await call('get', '/api/marine-life/sightings', { user: null })).statusCode, 401);
  assert.equal((await call('get', '/api/marine-life/feed', { user: null })).statusCode, 401);
  const invalid = await call('post', '/api/marine-life/sightings', { body: {
    speciesName: '',
    imageUrl: 'file:///private/photo.jpg',
  } });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.body.error, 'species_name_required');
});

test('marine-life feed exposes a compact sighting with its author', async () => {
  const call = setup();
  await call('post', '/api/marine-life/sightings', { body: {
    speciesName: 'Whale shark',
    imageUrl: 'https://images.example.test/whale-shark.jpg',
    locationName: 'Oslob',
    visibilityType: 'public',
  } });

  const loaded = await call('get', '/api/marine-life/feed');
  assert.equal(loaded.statusCode, 200);
  assert.equal(loaded.body.data.length, 1);
  assert.equal(loaded.body.data[0].speciesName, 'Whale shark');
  assert.deepEqual(loaded.body.data[0].user, {
    id: 'owner',
    name: 'Ocean Diver',
    avatar: 'https://images.example.test/avatar.jpg',
  });
});

test('marine-life detail enforces visibility and includes its author', async () => {
  const call = setup();
  const publicSighting = await call('post', '/api/marine-life/sightings', { body: {
    speciesName: 'Green turtle',
    imageUrl: 'https://images.example.test/turtle.jpg',
    visibilityType: 'public',
  } });
  const privateSighting = await call('post', '/api/marine-life/sightings', { body: {
    speciesName: 'Seahorse',
    imageUrl: 'https://images.example.test/seahorse.jpg',
    visibilityType: 'private',
  } });

  const visible = await call('get', '/api/marine-life/sightings/:id', { user: 'other', params: { id: publicSighting.body.data.id } });
  assert.equal(visible.statusCode, 200);
  assert.equal(visible.body.data.speciesName, 'Green turtle');
  assert.equal(visible.body.data.user.name, 'Ocean Diver');
  assert.equal((await call('get', '/api/marine-life/sightings/:id', { user: 'other', params: { id: privateSighting.body.data.id } })).statusCode, 404);
  assert.equal((await call('get', '/api/marine-life/sightings/:id', { params: { id: privateSighting.body.data.id } })).statusCode, 200);
  assert.equal((await call('get', '/api/marine-life/sightings/:id', { params: { id: 'not-a-uuid' } })).statusCode, 400);
});

test('species search keeps fish results and reusable attributed photos', async () => {
  const fetchImpl = async url => {
    const href = String(url);
    if (href.includes('api.inaturalist.org')) {
      const requestUrl = new URL(href);
      assert.equal(requestUrl.searchParams.get('locale'), 'ko');
      assert.equal(requestUrl.searchParams.get('all_names'), 'true');
      return {
        ok: true,
        json: async () => ({ results: [
        { id: 132688, name: 'Amphiprion ocellaris', preferred_common_name: null, matched_term: 'カクレクマノミ', names: [{ name: 'Ocellaris Anemonefish', locale: 'en', is_valid: true }, { name: '흰동가리', locale: 'ko', is_valid: true }, { name: 'カクレクマノミ', locale: 'ja', is_valid: true }], rank: 'species', iconic_taxon_name: 'Actinopterygii', observations_count: 4969, family: 'Pomacentridae', genus: 'Amphiprion' },
        { id: 1, name: 'Octopus vulgaris', preferred_common_name: 'Common octopus', iconic_taxon_name: 'Mollusca' },
        ] }),
      };
    }
    return {
      ok: true,
      json: async () => ({ query: { pages: { 1: { imageinfo: [{ thumburl: 'https://upload.wikimedia.org/clownfish.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Clownfish.jpg', extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: '<a>Ocean Photographer</a>' } } }] } } } }),
    };
  };
  const call = setup(fetchImpl);
  const response = await call('get', '/api/marine-life/species-search', { query: { q: 'カクレクマノミ', locale: 'ko' } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].scientificName, 'Amphiprion ocellaris');
  assert.equal(response.body.data[0].commonName, '흰동가리');
  assert.equal(response.body.data[0].photo.attribution, 'Ocean Photographer');
  assert.equal(response.body.data[0].photo.license, 'CC BY-SA 4.0');
});
