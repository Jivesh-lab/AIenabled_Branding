async function testNextAuth() {
  const csrfRes = await fetch('http://localhost:3000/api/auth/csrf');
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  const cookie = csrfRes.headers.get('set-cookie');

  const naRes = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie || '',
    },
    body: new URLSearchParams({
      csrfToken,
      email: 'superadmin@dbit.ac.in',
      password: 'SuperAdmin@123',
      twoFactorCode: '123456',
      json: 'true',
    }),
  });
  const naData = await naRes.json();
  console.log('NextAuth response:', naData);
}

testNextAuth().catch(console.error);

