const SDK = require('dat-sdk');
const { once } = require('events')

async function main() {
  const { Hyperdrive, close: close } = await SDK({ persist: false, storage: null })

  const drive = Hyperdrive('hyper://77ea9004b47847648ebc6924dc6a553f3bf8dd3b64437a8af066c4750e0d620f/')
  
  await drive.ready()

  if (!drive.peers.length) {
    console.log('Waiting for peers to connect')
    const [peer] = await once(drive, 'peer-open')
  }

  console.log(drive.peers.length, 'peers')

  const watcher = drive.watch('/', () => {
    console.log('Change detected', drive.version)
  })

  console.log('watching the world')
};

main().catch(e => process.nextTick(() => { throw e }))
