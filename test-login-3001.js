const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response 3001:', res.statusCode, data));
});

req.on('error', (e) => console.error(e));
req.write(JSON.stringify({ username: 'admin', password: 'deoksi2026' }));
req.end();
