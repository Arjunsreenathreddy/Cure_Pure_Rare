const https = require('https');
const fs = require('fs');

const query = `[out:json][timeout:250];
area["name:en"="Telangana"]->.searchArea;
(
  relation["admin_level"="5"](area.searchArea);
);
out geom;`;

const req = https.request({
    hostname: 'overpass-api.de',
    port: 443,
    path: '/api/interpreter',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength('data=' + encodeURIComponent(query))
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        fs.writeFileSync('overpass.json', data);
        console.log('Query done. Size:', data.length);
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.write('data=' + encodeURIComponent(query));
req.end();
