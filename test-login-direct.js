import handler from './api/auth/login.js';

async function test() {
  try {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'password' }),
    });

    const response = await handler(request);
    console.log(response.status);
    console.log(await response.text());
  } catch (e) {
    console.error("Uncaught exception:", e);
  }
}

test();
