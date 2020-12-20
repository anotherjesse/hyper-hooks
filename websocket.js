const fs = require('fs');
var HTTP = require('http');
const WebSocket = require('ws');
const DAT = require('dat-sdk');

var config = {
  http: 8000,
  http_host: '0.0.0.0',
  ws: 8080,
};

const agent = req => {
  const agent = req.headers['user-agent'] || '';
  if (agent.includes('Chrome')) return 'chrome';
  if (agent.includes('Safari')) return 'safari';
  if (agent.includes('Firefox')) return 'firefox';
  return agent;
};

async function main() {
  const log = (req, msg) => console.log(agent(req), ' | ', msg);

  const {Hyperdrive, close: close} = await DAT({
    persist: false,
    storage: null,
  });

  const drive = Hyperdrive(
    'hyper://da54f0a3e2b8c10af47f6df63b2480156f8f6e09ca02574c7fbe8017bca33bf2/'
  );

  await drive.ready();

  const liveIndex = (req, res) => {
    fs.readFile('public-websockets/index.html', 'utf8', function (err, data) {
      if (err) {
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end(String(err));
      } else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(data);
      }
    });
  };

  const sendFile = (req, res) => {
    const path = req.url.split('?')[0];

    drive
      .readFile(path)
      .then(c => {
        res.writeHead(200);
        res.end(c);
      })
      .catch(e => {
        console.error(e);
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('not-found');
      });
  };

  function handleRequest(req, res) {
    log(req, 'GET ' + req.url);
    switch (req.url) {
      case '/':
      case '/index.html':
        liveIndex(req, res);
        break;
      default:
        sendFile(req, res);
        break;
    }
  }
  HTTP.createServer(handleRequest).listen(config.http, config.host);
  console.log('Started http server.');

  const wss = new WebSocket.Server({port: config.ws});

  wss.on('connection', conn => {
    // FIXME(ja): unwatch when the connection is closed!
    watch = drive.watch('/', () => {
      console.log('Change detected', drive.version);
      drive
        .readFile('/index.html')
        .then(html => {
          conn.send(
            JSON.stringify({version: drive.version, html: html.toString()})
          );
        })
        .catch(e => console.error(e));
    });

    // FIXME(ja): instead of hardcoding (watch '/' and send '/index.html')
    // we should let the client specify what they want to subscribe/request
    conn.on('message', message => {
      console.log(`Received message => ${message}`);
    });
  });

  console.log('started wss');
}

main().catch(e =>
  process.nextTick(() => {
    throw e;
  })
);
