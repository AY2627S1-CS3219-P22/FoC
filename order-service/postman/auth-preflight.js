// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-23 Asia/Singapore.
// Scope: Demo token setup diagnostics and login refresh for supplied synthetic accounts.
// Human review pending; prompt/checks: ../usage-log.md.
(async () => {
  const header = pm.request.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+\{\{([A-Z]|admin)Token\}\}$/);
  if (!match) return; // Preserve intentional no-token and garbage-token tests.
  const actor = match[1];
  const key = actor + 'Token';
  const base = pm.environment.get('userBaseUrl');
  let token = pm.environment.get(key);
  const email = pm.environment.get(actor + 'Email') ||
    ((actor === 'A' || actor === 'B') && pm.environment.get('runId')
      ? actor.toLowerCase() + '-' + pm.environment.get('runId') + '@u.nus.edu' : '');
  // D intentionally has no User account; admin credentials are supplied manually.
  if (actor === 'D' || actor === 'admin') {
    if (!token) throw new Error('Missing ' + key + ': prepare the matching environment or supply a fresh administrator token.');
    return;
  }
  if (token) {
    const check = await pm.sendRequest({url:base + '/users/me',method:'GET',header:{Authorization:'Bearer '+token}});
    if (check.code === 200) return;
    if (check.code !== 401) throw new Error('User token check returned HTTP '+check.code+'; check User Service.');
  }
  const password = pm.environment.get('demoPassword');
  if (!email || !password) throw new Error('Missing/expired '+key+'. Select the matching prepared environment, or run its registration/login setup first. Blank Web templates do not contain accounts or tokens.');
  const login = await pm.sendRequest({url:base+'/users/login',method:'POST',header:{'Content-Type':'application/json'},body:{mode:'raw',raw:JSON.stringify({email,password})}});
  if (login.code !== 200 || !login.json().token) throw new Error('Demo login failed (HTTP '+login.code+'); rerun the matching account setup.');
  pm.environment.set(key,login.json().token);
})();
