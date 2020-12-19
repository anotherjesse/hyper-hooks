const SDK = require('dat-sdk');
var http = require('http');

var config = {
  port: 9192,
  host: '0.0.0.0',
  multipartBoundary: `multipart-${Math.random()}`,
};

const agent = req => {
  const agent = req.headers['user-agent'] || '';
  if (agent.includes('Chrome')) return 'chrome';
  if (agent.includes('Safari')) return 'safari';
  if (agent.includes('Firefox')) return 'firefox';
  return agent;
};

async function main() {
  const {Hyperdrive, close: close} = await SDK({persist: false, storage: null});

  const drive = Hyperdrive(
    'hyper://da54f0a3e2b8c10af47f6df63b2480156f8f6e09ca02574c7fbe8017bca33bf2/'
  );

  await drive.ready();

  const liveIndex = (req, res) => {
    var sending = false;
    var watch;

    const sendUpdate = () => {
      if (sending) return;
      sendFrame();
    };

    const handleClose = function () {
      console.log('Page closed:', agent(req));
      if (watch) {
        console.log('UNWATCH /: ', agent(req));
        watch.destroy();
      }
    };

    const sendFrame = html => {
      if (sending) return;
      sending = true;

      console.log('SEND: ', agent(req));

      res.write('\r\n');
      res.write('--' + config.multipartBoundary + '\r\n');

      res.write('Content-Type: text/html\r\n');
      res.write('Content-Length: ' + html.length + '\r\n');
      res.write('\r\n');
      res.write(html);

      res.write('\r\n');
      res.write('--' + config.multipartBoundary + '\r\n');
      sending = false;
    };

    const sendIndex = async () => {
      drive
        .readFile('/index.html')
        .then(c => {
          sendFrame(c);
        })
        .catch(e => {
          console.error(e);
        });
    };

    const sendInitialHeaders = () => {
      res.writeHead(200, {
        Connection: 'Close',
        Expires: '-1',
        'Cache-Control':
          'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0, false',
        Pragma: 'no-cache',
        'Content-Type':
          'multipart/x-mixed-replace; boundary=--' + config.multipartBoundary,
      });
      res.write('\r\n');
    };

    console.log('WATCH /: ', agent(req));

    watch = drive.watch('/', () => {
      console.log('Change detected', drive.version);
      sendIndex();
    });

    res.on('close', handleClose);
    sendInitialHeaders();
    sendIndex();
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
    console.log('GET', req.url, agent(req));
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

  // Ready, Set, Go!

  http.createServer(handleRequest).listen(config.port, config.host);
  console.log('Started.');
}

main().catch(e =>
  process.nextTick(() => {
    throw e;
  })
);
