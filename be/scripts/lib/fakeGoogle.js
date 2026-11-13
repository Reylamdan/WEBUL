// Google palsu di memori untuk pengujian OFFLINE OAuth + Drive. Meniru (secukupnya) kontrak REST asli:
//   - oauth2.googleapis.com/token (authorization_code + PKCE S256, refresh_token) dan /revoke
//   - Drive v3: about, files.get (metadata & alt=media + Range), files.list (folder), files.create (folder),
//     unggah resumable, trash/delete
// Dipakai sebagai `fetchImpl` (unit service) atau dipasang menggantikan globalThis.fetch untuk host Google (uji HTTP).
// Tidak ada jaringan. Semua token palsu berawalan at_/rt_ agar mudah dicari saat memindai kebocoran.
const crypto = require("node:crypto");

const FOLDER_MIME = "application/vnd.google-apps.folder";
const b64url = (buf) => Buffer.from(buf).toString("base64url");
const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...headers } });
const gerr = (status, reason, message = "pesan google") => json({ error: { code: status, message, errors: [{ reason }] } }, status);
const oerr = (status, error, description = "") => json({ error, error_description: description }, status);

const createFakeGoogle = ({
  clientId = "client-id-123456.apps.googleusercontent.com",
  clientSecret = "GOCSPX-fake-client-secret-value",
  redirectUri = "http://localhost:5000/api/admin/google-drive/callback",
  rootFolderId = "ROOT_FOLDER_ID_123",
} = {}) => {
  const SCOPE = "https://www.googleapis.com/auth/drive";
  const st = {
    clientId, clientSecret, redirectUri, rootFolderId,
    accounts: new Map(),        // email -> { email, name, permissionId }
    codes: new Map(),           // code -> { email, challenge, redirectUri, used, omitRefresh, scope }
    refreshTokens: new Map(),   // rt -> { email, revoked, createdAt }
    accessTokens: new Map(),    // at -> { email, rt, revoked }
    files: new Map(),           // id -> { id, name, mimeType, buffer, parents, appProperties, trashed, owner }
    sessions: new Map(),        // url -> metadata
    rootAccess: new Set(),      // email yang boleh membuka folder root; kosong = semua akun
    rootMime: FOLDER_MIME, rootCanAdd: true, aboutStatus: 0,
    tokenFailures: [],          // antrean { status } | { network:true } untuk /token refresh
    revokeFail: null,           // { status } | { network:true }
    omitRefreshToken: false, scopeOverride: null, rotateRefresh: false,
    refreshTokenLifetimeMs: null, // simulasi app "Testing": refresh token kedaluwarsa
    clockMs: 0,                 // geser waktu palsu (ms) untuk kedaluwarsa token Google
    log: [],                    // { host, path, method, form?, auth? }
    refreshCalls: 0, exchangeCalls: 0, revokeCalls: 0, seq: 0,
    seenVerifiers: [], seenSecrets: new Set(),
  };
  const nowMs = () => Date.now() + st.clockMs;
  const rnd = (p) => `${p}_${(st.seq += 1)}_${crypto.randomBytes(6).toString("hex")}`;

  const addAccount = (email, { name = email.split("@")[0], permissionId = `perm-${email}` } = {}) => {
    st.accounts.set(email, { email, name, permissionId });
    return st.accounts.get(email);
  };

  // Simulasi layar persetujuan Google: memvalidasi parameter authUrl lalu mengembalikan URL callback.
  const authorize = (authUrl, email, { error, overrideState } = {}) => {
    const url = new URL(authUrl);
    const p = url.searchParams;
    const problems = [];
    if (url.origin + url.pathname !== "https://accounts.google.com/o/oauth2/v2/auth") problems.push("endpoint");
    if (p.get("client_id") !== st.clientId) problems.push("client_id");
    if (p.get("redirect_uri") !== st.redirectUri) problems.push("redirect_uri");
    if (p.get("response_type") !== "code") problems.push("response_type");
    if (p.get("code_challenge_method") !== "S256") problems.push("code_challenge_method");
    if (!p.get("code_challenge")) problems.push("code_challenge");
    if (!p.get("state")) problems.push("state");
    if (p.get("access_type") !== "offline") problems.push("access_type");
    if (p.get("scope") !== SCOPE) problems.push("scope");
    if (problems.length) throw new Error(`authUrl tidak valid: ${problems.join(",")}`);
    const cb = new URL(st.redirectUri);
    const state = overrideState ?? p.get("state");
    if (error) { cb.searchParams.set("error", error); cb.searchParams.set("state", state); return cb.toString(); }
    if (!st.accounts.has(email)) addAccount(email);
    const code = rnd("code");
    st.codes.set(code, { email, challenge: p.get("code_challenge"), redirectUri: p.get("redirect_uri"), used: false, omitRefresh: st.omitRefreshToken, scope: st.scopeOverride ?? p.get("scope") });
    cb.searchParams.set("code", code); cb.searchParams.set("state", state);
    return cb.toString();
  };

  const parseForm = (body) => Object.fromEntries(new URLSearchParams(String(body || "")));
  const bearer = (init) => /^Bearer (\S+)$/.exec((init.headers || {}).Authorization || "")?.[1] || null;

  const issueAccessToken = (email, rt) => {
    const at = rnd("at");
    st.accessTokens.set(at, { email, rt, revoked: false });
    return at;
  };

  const tokenEndpoint = (init) => {
    const f = parseForm(init.body);
    st.seenSecrets.add(f.client_secret);
    if (f.client_id !== st.clientId || f.client_secret !== st.clientSecret) return oerr(401, "invalid_client", "Unauthorized");
    if (f.grant_type === "authorization_code") {
      st.exchangeCalls += 1; st.seenVerifiers.push(f.code_verifier);
      const c = st.codes.get(f.code);
      if (!c || c.used) return oerr(400, "invalid_grant", "Bad Request");
      c.used = true;
      if (f.redirect_uri !== c.redirectUri) return oerr(400, "redirect_uri_mismatch");
      const challenge = b64url(crypto.createHash("sha256").update(String(f.code_verifier || "")).digest());
      if (challenge !== c.challenge) return oerr(400, "invalid_grant", "Bad Request");
      const out = { access_token: null, expires_in: 3599, scope: c.scope, token_type: "Bearer" };
      let rt = null;
      if (!c.omitRefresh) { rt = rnd("rt"); st.refreshTokens.set(rt, { email: c.email, revoked: false, createdAt: nowMs() }); out.refresh_token = rt; }
      out.access_token = issueAccessToken(c.email, rt);
      return json(out);
    }
    if (f.grant_type === "refresh_token") {
      st.refreshCalls += 1;
      const failure = st.tokenFailures.shift();
      if (failure) { if (failure.network) throw new TypeError("fetch failed"); return failure.body ? json(failure.body, failure.status) : json({ error: "backend_error" }, failure.status); }
      const r = st.refreshTokens.get(f.refresh_token);
      const expired = r && st.refreshTokenLifetimeMs !== null && nowMs() - r.createdAt > st.refreshTokenLifetimeMs;
      if (!r || r.revoked || expired) return oerr(400, "invalid_grant", "Token has been expired or revoked.");
      const out = { access_token: issueAccessToken(r.email, f.refresh_token), expires_in: 3599, scope: SCOPE, token_type: "Bearer" };
      if (st.rotateRefresh) { const nrt = rnd("rt"); st.refreshTokens.set(nrt, { email: r.email, revoked: false, createdAt: r.createdAt }); st.refreshTokens.delete(f.refresh_token); out.refresh_token = nrt; }
      return json(out);
    }
    return oerr(400, "unsupported_grant_type");
  };

  const revokeEndpoint = (init) => {
    st.revokeCalls += 1;
    if (st.revokeFail) { if (st.revokeFail.network) throw new TypeError("fetch failed"); return json({ error: "server_error" }, st.revokeFail.status); }
    const { token } = parseForm(init.body);
    const r = st.refreshTokens.get(token);
    if (!r || r.revoked) return oerr(400, "invalid_token", "Token expired or revoked");
    r.revoked = true;
    for (const a of st.accessTokens.values()) if (a.rt === token) a.revoked = true;
    return json({});
  };

  const accountOf = (init) => {
    const at = bearer(init);
    const rec = at && st.accessTokens.get(at);
    if (!rec || rec.revoked) return null;
    const r = rec.rt && st.refreshTokens.get(rec.rt);
    if (r && r.revoked) return null;
    return st.accounts.get(rec.email);
  };

  const visible = (f, email) => f.owner === email || f.sharedWith?.has(email);
  const rootVisible = (email) => st.rootAccess.size === 0 || st.rootAccess.has(email);

  const drive = async (u, init) => {
    const method = (init.method || "GET").toUpperCase();
    const acct = accountOf(init);
    if (!acct) return gerr(401, "authError", "Invalid Credentials");
    const path = u.pathname.replace(/^\/drive\/v3/, "");
    const q = u.searchParams;

    if (path === "/about") {
      if (st.aboutStatus) return gerr(st.aboutStatus, "accessNotConfigured");
      return json({ user: { displayName: acct.name, emailAddress: acct.email, permissionId: acct.permissionId } });
    }
    const idMatch = /^\/files\/([^/]+)$/.exec(path);
    if (path === "/files" && method === "GET") {
      const query = q.get("q") || "";
      const name = /name = '((?:\\'|[^'])*)'/.exec(query)?.[1]?.replace(/\\'/g, "'");
      const parent = /'((?:\\'|[^'])*)' in parents/.exec(query)?.[1];
      const files = [...st.files.values()].filter((f) => !f.trashed && visible(f, acct.email) && (!name || f.name === name) && (!parent || f.parents.includes(parent)) && (!query.includes("mimeType = '") || f.mimeType === FOLDER_MIME));
      return json({ files: files.map((f) => ({ id: f.id, name: f.name })) });
    }
    if (path === "/files" && method === "POST") {
      const meta = JSON.parse(init.body);
      const id = rnd("fld");
      st.files.set(id, { id, name: meta.name, mimeType: meta.mimeType, parents: meta.parents, owner: acct.email, trashed: false, appProperties: {} });
      return json({ id });
    }
    if (idMatch) {
      const id = decodeURIComponent(idMatch[1]);
      if (id === st.rootFolderId) {
        if (!rootVisible(acct.email)) return gerr(404, "notFound", "File not found");
        if (method === "GET") return json({ id, name: "root", mimeType: st.rootMime, capabilities: { canAddChildren: st.rootCanAdd } });
      }
      const f = st.files.get(id);
      if (!f || !visible(f, acct.email)) return gerr(404, "notFound", "File not found");
      if (method === "GET" && q.get("alt") === "media") {
        if (f.trashed) return gerr(404, "notFound");
        const range = (init.headers || {}).Range;
        let body = f.buffer; let status = 200; const h = {};
        if (range) {
          const m = /^bytes=(\d*)-(\d*)$/.exec(range);
          const start = m[1] === "" ? Math.max(0, f.buffer.length - Number(m[2])) : Number(m[1]);
          const end = m[1] !== "" && m[2] !== "" ? Math.min(Number(m[2]), f.buffer.length - 1) : f.buffer.length - 1;
          body = f.buffer.subarray(start, end + 1); status = 206; h["content-range"] = `bytes ${start}-${end}/${f.buffer.length}`;
        }
        return new Response(body, { status, headers: { "content-length": String(body.length), ...h } });
      }
      if (method === "GET") return json({ id: f.id, name: f.name, mimeType: f.mimeType, size: String(f.buffer?.length ?? 0), trashed: f.trashed, capabilities: { canAddChildren: true } });
      if (method === "PATCH") { Object.assign(f, JSON.parse(init.body).trashed ? { trashed: true } : {}); return json({ id }); }
      if (method === "DELETE") { st.files.delete(id); return new Response(null, { status: 204 }); }
    }
    return gerr(400, "badRequest", `rute drive tidak dikenal: ${method} ${path}`);
  };

  const upload = (u, init) => {
    const acct = accountOf(init);
    if (!acct) return gerr(401, "authError");
    if (u.hostname === "www.googleapis.com") {
      const meta = JSON.parse(init.body);
      const session = `https://upload.fake.google/session/${(st.seq += 1)}`;
      st.sessions.set(session, { ...meta, owner: acct.email });
      return new Response(null, { status: 200, headers: { location: session } });
    }
    const meta = st.sessions.get(u.toString());
    if (!meta) return gerr(404, "notFound");
    const id = rnd("drv");
    const buffer = Buffer.from(init.body);
    st.files.set(id, { id, name: meta.name, mimeType: meta.mimeType, buffer, parents: meta.parents, appProperties: meta.appProperties || {}, owner: meta.owner, trashed: false, createdTime: new Date().toISOString() });
    return json({ id, name: meta.name, mimeType: meta.mimeType, size: String(buffer.length), md5Checksum: crypto.createHash("md5").update(buffer).digest("hex") });
  };

  // Pengganti fetch: hanya host Google/palsu yang dikenali.
  const fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    st.log.push({ host: u.hostname, path: u.pathname, method: (init.method || "GET").toUpperCase(), auth: bearer(init), form: u.hostname === "oauth2.googleapis.com" ? parseForm(init.body) : undefined });
    if (u.hostname === "oauth2.googleapis.com" && u.pathname === "/token") return tokenEndpoint(init);
    if (u.hostname === "oauth2.googleapis.com" && u.pathname === "/revoke") return revokeEndpoint(init);
    if (u.hostname === "upload.fake.google" || u.pathname.startsWith("/upload/drive/v3")) return upload(u, init);
    if (u.hostname === "www.googleapis.com" && u.pathname.startsWith("/drive/v3")) return drive(u, init);
    throw new Error(`fakeGoogle: host tidak dikenal ${u.hostname}`);
  };
  const isGoogleUrl = (url) => /^https:\/\/(oauth2\.googleapis\.com|www\.googleapis\.com|upload\.fake\.google)\//.test(String(url));

  const secrets = () => [
    st.clientSecret, ...st.accessTokens.keys(), ...st.refreshTokens.keys(), ...st.seenVerifiers.filter(Boolean),
  ];
  const liveFiles = () => [...st.files.values()].filter((f) => f.mimeType !== FOLDER_MIME && !f.trashed);
  const revokeAllAccessTokens = () => { for (const a of st.accessTokens.values()) a.revoked = true; };

  return { st, fetch, isGoogleUrl, authorize, addAccount, secrets, liveFiles, revokeAllAccessTokens, SCOPE };
};

module.exports = { createFakeGoogle, FOLDER_MIME };
