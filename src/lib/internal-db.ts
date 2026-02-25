type AnyObj = Record<string, any>;

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';
const TOKEN_KEY = 'dg_token';
const USER_KEY = 'dg_user';
const PROFILE_KEY = 'dg_profile';
const DB_KEY = 'dg_mockdb_v3';

export interface User { id: string; email: string; }
export interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  website?: string;
  created_at?: string;
}
export interface PostMedia { id: string; post_id: string; media_url: string; media_type: 'image' | 'video'; order_index: number; created_at: string; }
export interface Post {
  id: string; user_id: string; image_url: string; video_url?: string; caption: string; created_at: string;
  profiles: Profile; likes: { id: string }[]; comments: { id: string }[]; post_media?: PostMedia[];
  dive_type?: 'scuba' | 'freediving'; dive_date?: string; max_depth?: number; water_temperature?: number;
  dive_duration?: number; dive_site?: string; visibility?: number; buddy?: string; buddy_name?: string; location?: string;
}
export interface Comment { id: string; post_id: string; user_id: string; content: string; created_at: string; profiles: Profile; }
export interface Room { id: string; type: 'direct' | 'group'; created_at: string; }
export interface Participant { id: string; room_id: string; user_id: string; joined_at: string; profiles: Profile; }
export interface Message { id: string; room_id: string; sender_id: string; content: string; created_at: string; read_at: string | null; profiles?: Profile; }

function nowIso() { return new Date().toISOString(); }
function uid(prefix = 'id') { return `${prefix}_${Math.random().toString(36).slice(2, 10)}`; }

function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
function setSession(user: User, profile: Profile, token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PROFILE_KEY);
}
function getSessionLocal() {
  const token = getToken();
  if (!token) return null;
  const userRaw = localStorage.getItem(USER_KEY);
  const profileRaw = localStorage.getItem(PROFILE_KEY);
  if (!userRaw || !profileRaw) return null;
  return { user: JSON.parse(userRaw), profile: JSON.parse(profileRaw), token };
}

function seedDb() {
  const me = getSessionLocal()?.profile || { id: '9', username: 'demo', full_name: 'demo', bio: 'Diver', avatar_url: '' };

  const names = [
    ['2', 'ocean_lee', 'Ocean Lee'], ['3', 'blue_fin', 'Blue Fin'], ['4', 'deep_jane', 'Deep Jane'],
    ['5', 'coral_park', 'Coral Park'], ['6', 'abyss_kim', 'Abyss Kim'], ['7', 'reef_song', 'Reef Song'],
    ['8', 'freedive_han', 'Freedive Han'], ['10', 'night_dive', 'Night Dive'], ['11', 'jeju_diver', 'Jeju Diver']
  ];

  const profiles = [
    me,
    ...names.map(([id, username, full_name]) => ({ id, username, full_name, bio: `${full_name} profile`, avatar_url: '' }))
  ];

  const imagePool = [
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200',
    'https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=1200',
    'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=1200',
    'https://images.unsplash.com/photo-1583212292454-3f82f0a96f4d?w=1200',
    'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=1200',
    'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=1200'
  ];

  const locations = ['Jeju', 'Cebu', 'Bohol', 'Bali', 'Maldives', 'Okinawa', 'Anilao', 'Palau'];
  const captions = ['야간다이빙 기록', '프리다이빙 세션', '리프 탐험', '난파선 포인트', '오늘 수온 최고', '버디와 함께'];

  const posts: Post[] = [];
  const post_media: any[] = [];
  const likes: any[] = [];
  const comments: any[] = [];
  const follows: any[] = [];
  const saved_posts: any[] = [];
  const notifications: any[] = [];

  // follows
  profiles.forEach((p, idx) => {
    if (p.id !== me.id && idx % 2 === 0) follows.push({ id: uid('f'), follower_id: me.id, following_id: p.id });
  });

  // posts + media + likes/comments (성능 테스트용: 게시물 100 / 댓글 300 / 알림 200)
  const TARGET_POSTS = 100;
  const TARGET_COMMENTS = 300;
  const TARGET_NOTIFICATIONS = 200;

  let postSeq = 1;
  for (let i = 0; i < TARGET_POSTS; i++) {
    const author = profiles[(i % (profiles.length - 1)) + 1] || me;
    const postId = `p${postSeq++}`;
    const createdAt = new Date(Date.now() - i * 1000 * 60 * 20).toISOString();
    const image = imagePool[i % imagePool.length];
    const location = locations[i % locations.length];

    posts.push({
      id: postId,
      user_id: author.id,
      image_url: image,
      caption: `${captions[i % captions.length]} #${location} #dive${i + 1}`,
      created_at: createdAt,
      profiles: author,
      likes: [],
      comments: [],
      post_media: [],
      dive_type: i % 3 === 0 ? 'freediving' : 'scuba',
      dive_site: location,
      max_depth: 10 + (i % 25),
      water_temperature: 18 + (i % 11),
      visibility: 6 + (i % 15),
      dive_duration: 25 + (i % 35),
      location
    });

    post_media.push({ id: uid('m'), post_id: postId, media_url: image, media_type: 'image', order_index: 0, created_at: createdAt });

    const likeCount = (i % 8) + 2;
    for (let l = 0; l < likeCount; l++) {
      const liker = profiles[(i + l) % profiles.length];
      likes.push({ id: uid('l'), post_id: postId, user_id: liker.id });
    }

    if (i % 3 === 0) saved_posts.push({ id: uid('s'), user_id: me.id, post_id: postId });
  }

  for (let i = 0; i < TARGET_COMMENTS; i++) {
    const post = posts[i % posts.length];
    const commenter = profiles[(i + 1) % profiles.length];
    comments.push({
      id: uid('c'),
      post_id: post.id,
      user_id: commenter.id,
      content: `샘플 댓글 ${i + 1} - 멋진 포스트입니다!`,
      created_at: new Date(Date.now() - i * 1000 * 60 * 5).toISOString(),
      profiles: commenter
    });
  }

  for (let i = 0; i < TARGET_NOTIFICATIONS; i++) {
    const actor = profiles[(i % (profiles.length - 1)) + 1] || profiles[1];
    const post = posts[i % posts.length];
    notifications.push({
      id: uid('n'),
      user_id: me.id,
      type: i % 3 === 0 ? 'comment' : i % 2 === 0 ? 'follow' : 'like',
      actor_id: actor.id,
      post_id: post.id,
      is_read: i % 4 === 0,
      created_at: new Date(Date.now() - i * 1000 * 60 * 3).toISOString(),
      profiles: actor
    });
  }

  const rooms = [
    { id: 'r1', type: 'direct', created_at: nowIso() },
    { id: 'r2', type: 'direct', created_at: nowIso() },
    { id: 'r3', type: 'group', created_at: nowIso() }
  ];

  const participants = [
    { id: uid('pt'), room_id: 'r1', user_id: me.id, joined_at: nowIso(), profiles: me },
    { id: uid('pt'), room_id: 'r1', user_id: profiles[1].id, joined_at: nowIso(), profiles: profiles[1] },
    { id: uid('pt'), room_id: 'r2', user_id: me.id, joined_at: nowIso(), profiles: me },
    { id: uid('pt'), room_id: 'r2', user_id: profiles[2].id, joined_at: nowIso(), profiles: profiles[2] },
    ...profiles.slice(0, 5).map((p) => ({ id: uid('pt'), room_id: 'r3', user_id: p.id, joined_at: nowIso(), profiles: p }))
  ];

  const messages = Array.from({ length: 24 }).map((_, i) => {
    const room_id = i % 3 === 0 ? 'r3' : i % 2 === 0 ? 'r2' : 'r1';
    const sender = room_id === 'r1' ? (i % 2 ? profiles[1] : me) : room_id === 'r2' ? (i % 2 ? profiles[2] : me) : profiles[i % 5];
    return {
      id: uid('msg'),
      room_id,
      sender_id: sender.id,
      content: `샘플 메시지 ${i + 1}`,
      created_at: new Date(Date.now() - i * 1000 * 60 * 30).toISOString(),
      read_at: i % 4 === 0 ? null : nowIso(),
      profiles: sender
    };
  });

  return {
    profiles,
    posts,
    post_media,
    follows,
    saved_posts,
    likes,
    comments,
    notifications,
    rooms,
    participants,
    messages,
    reports: []
  };
}

function loadDb() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    const seeded = seedDb();
    localStorage.setItem(DB_KEY, JSON.stringify(seeded));
    return seeded;
  }
  return JSON.parse(raw);
}
function saveDb(db: AnyObj) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

function applyFilters(rows: any[], filters: AnyObj[]) {
  return rows.filter((r) => filters.every((f) => {
    if (f.op === 'eq') return r[f.column] === f.value;
    if (f.op === 'neq') return r[f.column] !== f.value;
    if (f.op === 'in') return Array.isArray(f.value) && f.value.includes(r[f.column]);
    return true;
  }));
}

function normalizePost(post: any, db: any) {
  const profile = db.profiles.find((p: any) => p.id === post.user_id) || post.profiles || null;
  return {
    ...post,
    profiles: profile,
    likes: db.likes.filter((l: any) => l.post_id === post.id).map((l: any) => ({ id: l.id })),
    comments: db.comments.filter((c: any) => c.post_id === post.id).map((c: any) => ({ id: c.id })),
    post_media: (post.post_media && post.post_media.length ? post.post_media : db.post_media?.filter((m: any) => m.post_id === post.id)) || []
  };
}

type AuthCb = (event: string, session: any) => void;
const listeners = new Set<AuthCb>();
function emit(event: string, session: any) { listeners.forEach((cb) => cb(event, session)); }

class LocalQueryBuilder {
  table: string;
  filters: AnyObj[] = [];
  _order: AnyObj | null = null;
  _limit: number | null = null;
  _range: [number, number] | null = null;

  constructor(table: string) { this.table = table; }
  select(_sel?: string, _opts?: AnyObj) { return this; }
  eq(column: string, value: any) { this.filters.push({ op: 'eq', column, value }); return this; }
  neq(column: string, value: any) { this.filters.push({ op: 'neq', column, value }); return this; }
  in(column: string, value: any[]) { this.filters.push({ op: 'in', column, value }); return this; }
  order(column: string, opts?: AnyObj) { this._order = { column, ascending: opts?.ascending !== false }; return this; }
  limit(n: number) { this._limit = n; return this; }
  range(a: number, b: number) { this._range = [a, b]; return this; }

  async _rows() {
    const db = loadDb();
    let rows = [...(db[this.table] || [])];
    rows = applyFilters(rows, this.filters);

    if (this.table === 'posts') rows = rows.map((p) => normalizePost(p, db));
    if (this.table === 'comments') rows = rows.map((c) => ({ ...c, profiles: db.profiles.find((p: any) => p.id === c.user_id) || c.profiles }));

    if (this._order) {
      const { column, ascending } = this._order;
      rows.sort((a, b) => (a[column] > b[column] ? 1 : -1) * (ascending ? 1 : -1));
    }
    if (this._range) rows = rows.slice(this._range[0], this._range[1] + 1);
    if (this._limit != null) rows = rows.slice(0, this._limit);
    return rows;
  }

  async maybeSingle() { const rows = await this._rows(); return { data: rows[0] || null, error: null }; }
  async single() { const rows = await this._rows(); return { data: rows[0] || null, error: null }; }

  async insert(data: any) {
    const db = loadDb();
    const arr = Array.isArray(data) ? data : [data];
    const out = arr.map((r) => ({ id: r.id || uid(this.table), created_at: r.created_at || nowIso(), ...r }));
    db[this.table] = [...(db[this.table] || []), ...out];
    if (this.table === 'posts') {
      db.posts = db.posts.map((p: any) => normalizePost(p, db));
    }
    saveDb(db);
    return { data: out, error: null };
  }

  async update(data: any) {
    const db = loadDb();
    const rows = db[this.table] || [];
    db[this.table] = rows.map((r: any) => applyFilters([r], this.filters).length ? { ...r, ...data } : r);
    saveDb(db);
    return { data: null, error: null };
  }

  async delete() {
    const db = loadDb();
    const rows = db[this.table] || [];
    db[this.table] = rows.filter((r: any) => !applyFilters([r], this.filters).length);
    saveDb(db);
    return { data: null, error: null };
  }

  then(resolve: any, reject: any) {
    return this._rows().then((rows) => ({ data: rows, error: null, count: rows.length })).then(resolve, reject);
  }
}

export const db = {
  channel(_name: string) {
    return {
      on() { return this; },
      subscribe() { return { unsubscribe() {} }; },
      unsubscribe() {}
    } as any;
  },
  auth: {
    async getSession() {
      const token = getToken();
      if (!token) return { data: { session: null } };
      try {
        const r = await fetch(`${API_BASE}/api/auth/session`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json();
        return { data: { session: j.session || null } };
      } catch {
        return { data: { session: null } };
      }
    },
    onAuthStateChange(cb: AuthCb) {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    },
    async signUp({ email, password }: { email: string; password: string }) {
      const username = email.split('@')[0];
      const r = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, username }),
      });
      const j = await r.json();
      if (!r.ok) return { data: { user: null }, error: { message: j.error || 'signup failed' } };
      setSession(j.user, j.profile, j.token);
      const db = loadDb();
      if (!(db.profiles || []).find((p: any) => p.id === j.profile.id)) {
        db.profiles = [...(db.profiles || []), j.profile];
        saveDb(db);
      }
      const session = { user: j.user, profile: j.profile };
      emit('SIGNED_IN', session);
      return { data: { user: j.user, session }, error: null };
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const r = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (!r.ok) return { data: null, error: { message: j.error || 'login failed' } };
      setSession(j.user, j.profile, j.token);
      const db = loadDb();
      if (!(db.profiles || []).find((p: any) => p.id === j.profile.id)) {
        db.profiles = [...(db.profiles || []), j.profile];
        saveDb(db);
      }
      emit('SIGNED_IN', { user: j.user, profile: j.profile });
      return { data: { session: { user: j.user, profile: j.profile } }, error: null };
    },
    async signOut() { clearSession(); emit('SIGNED_OUT', null); return { error: null }; },
  },
  from(table: string) { return new LocalQueryBuilder(table); },
  storage: {
    from(_bucket: string) {
      return {
        async upload(path: string, _file: File) { return { data: { path }, error: null }; },
        getPublicUrl(path: string) { return { data: { publicUrl: path } }; },
        async remove(_paths: string[]) { return { data: null, error: null }; },
      };
    },
  },
};
