async function testSuperAdminLogins() {
  const tests = [
    { email: 'superadmin@aai-dbitic.edu', pw: 'SuperAdmin#2026!Secure', code: '123456', desc: 'Official credentials + 123456' },
    { email: 'superadmin@dbit.ac.in', pw: 'SuperAdmin#2026!Secure', code: '123456', desc: 'DBIT email alias + 123456' },
    { email: 'superadmin@dbit.ac.in', pw: 'SuperAdmin@123', code: '123456', desc: 'DBIT email + SuperAdmin@123 + 123456' },
    { email: 'superadmin@aai-dbitic.edu', pw: 'SuperAdmin@123', code: '123456', desc: 'Official email + SuperAdmin@123 + 123456' },
  ];

  for (const t of tests) {
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: t.email,
          password: t.pw,
          twoFactorCode: t.code,
        }),
      });
      const data = await res.json();
      console.log(`[${t.desc}] Status: ${res.status}, Success: ${data.success}, Role: ${data.user?.role}`);
    } catch (e) {
      console.error(`[${t.desc}] Error:`, e.message);
    }
  }
}

testSuperAdminLogins().catch(console.error);

