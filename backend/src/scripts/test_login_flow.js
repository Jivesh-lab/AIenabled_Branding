// Native fetch used

async function testLogin() {
  console.log('--- 1. Testing Backend /api/auth/login directly without 2FA ---');
  let res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'superadmin@aai-dbitic.edu',
      password: 'SuperAdmin#2026!Secure',
    }),
  });
  let data = await res.json();
  console.log('Status:', res.status, 'Response:', data);

  console.log('\n--- 2. Testing Backend /api/auth/login directly with test 2FA code 123456 ---');
  res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'superadmin@aai-dbitic.edu',
      password: 'SuperAdmin#2026!Secure',
      twoFactorCode: '123456',
    }),
  });
  data = await res.json();
  console.log('Status:', res.status, 'Response:', data);

  console.log('\n--- 3. Testing Frontend NextAuth signIn via NextAuth endpoint ---');
  // Let's test what NextAuth returns when calling /api/auth/callback/credentials
  const csrfRes = await fetch('http://localhost:3000/api/auth/csrf');
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  console.log('CSRF Token:', csrfToken);

  const cookie = csrfRes.headers.get('set-cookie');

  let naRes = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie || '',
    },
    body: new URLSearchParams({
      csrfToken,
      email: 'superadmin@aai-dbitic.edu',
      password: 'SuperAdmin#2026!Secure',
      json: 'true',
    }),
  });
  let naData = await naRes.json();
  console.log('NextAuth response without 2FA:', naData);

  naRes = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie || '',
    },
    body: new URLSearchParams({
      csrfToken,
      email: 'superadmin@aai-dbitic.edu',
      password: 'SuperAdmin#2026!Secure',
      twoFactorCode: '123456',
      json: 'true',
    }),
  });
  naData = await naRes.json();
  console.log('NextAuth response with 2FA code 123456:', naData);
}

testLogin().catch(console.error);
