const express = require('express');
const https = require('httpolyglot');
const fs = require('fs');
const path = require('path');
const _dirname = path.resolve();
const cors = require("cors");
const { Server } = require('socket.io');
const mediasoup = require('mediasoup');
// const SdpBridge = require('mediasoup-sdp-bridge');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();

const config = require('./config');
const FFmpeg = require('./ffmpeg');
const {
  getPort,
} = require('./port');

app.use(cors("*"))
const parentDir = path.dirname(_dirname);
console.log(" path", path.resolve("../client/public'"))
app.use('/play', express.static('../client/public'))
app.use('/webplay', express.static('../webclient/public'))

console.log(" path", path.resolve("./ssl/key.pem"))
const options = {
  key: fs.readFileSync('./ssl/key.pem', 'utf-8'),
  cert: fs.readFileSync('./ssl/cert.pem', 'utf-8')
}

const httpsServer = https.createServer(options, app)

const PORT = process.env.PORT;
const HOST_IP = process.env.HOST_IP;
const DEVICE_IP = process.env.DEVICE_IP;
httpsServer.listen(PORT, () => {
  console.log('listening on port: ' + PORT)
})

const io = new Server(httpsServer, {
  allowEIO3: true,
  cors: {
    origin: "*"
  }
})

const peers = io.of('/mediasoup')

let worker
let router
let producerTransport
let consumerTransport
let producer
let consumer
const peer = {};
let rtpConsumer
let sdpEndpoint;
let streamTransport;


const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    preferredPayloadType: 111,
    clockRate: 48000,
    channels: 2,
    parameters: {
      minptime: 10,
      useinbandfec: 1,
    }
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,
    },
  },
]

const createWorker = async () => {
  worker = await mediasoup.createWorker({
    rtcMinPort: 20000,
    rtcMaxPort: 30000,
  })
  console.log(`worker pid ${worker.pid}`)

  worker.on('died', error => {
    console.error('mediasoup worker has died');
    setTimeout(() => process.exit(1), 2000);
  })
  return worker
}

const createPlain = async () => {
  router = await worker.createRouter({ mediaCodecs })
  const streamTransport = await router.createPlainTransport({
    listenInfo: {
      protocol: "udp",
      ip: '0.0.0.0',
      announcedIp: HOST_IP,
      // port: 26000
    },
    rtcpMux: true,
    comedia: true,
  });

  streamTransport.on('close', () => {
    console.log('===== transport stream closed =====')
  })

  return streamTransport;
}

worker = createWorker()

peers.on('connection', async socket => {

  socket.emit('connection-success', {
    socketId: socket.id,
    existsProducer: producer ? true : false,
  })

  socket.on('disconnect', () => {
    console.log('peer disconnected')
  })

  socket.on('createRoom', async (callback) => {
    if (router === undefined) {
      router = await worker.createRouter({ mediaCodecs })
      console.log(`Router ID: ${router.id}`)
    }
    getRtpCapabilities(callback)
  })

  const getRtpCapabilities = (callback) => {
    const rtpCapabilities = router.rtpCapabilities;
    callback({ rtpCapabilities })
  }

  socket.on('createWebRtcTransport', async ({ sender }, callback) => {
    console.log(`Is this a sender request? ${sender}`)
    if (sender) {
      producerSocketId = socket.id
      producerTransport = await createWebRtcTransport(callback)
    }
    else {
      consumerSocketId = socket.id
      consumerTransport = await createWebRtcTransport(callback)
    }
  })

  // socket.on('createWebRtcTransportForDevice', async ({ sender }, callback) => {
  //   console.log(`Is this a sender request? ${sender}`)
  //   router = await worker.createRouter({ mediaCodecs })
  //   if (sender) {
  //     producerSocketId = socket.id
  //     producerTransport = await createWebRtcTransport(callback)
  //     const rtpCapabilities = router.rtpCapabilities;
  //     sdpEndpoint = SdpBridge.createSdpEndpoint(producerTransport, rtpCapabilities);
  //   }
  //   else {
  //     consumerSocketId = socket.id
  //     consumerTransport = await createWebRtcTransport(callback)
  //   }
  // })

  socket.on('transport-test-sdp', async (sdpOffer) => {
    const producers = await sdpEndpoint.processOffer(sdpOffer);
    producer = producers[0]
    const sdpAnswer = sdpEndpoint.createAnswer();
    socket.emit("answer", sdpAnswer)
    // let sdpEndpoint = createSdpEndpoint(transport,);
    // let producers = await sdpEndpoint.processOffer(sdpOffer);
    // let answer = sdpEndpoint.createAnswer();

    // console.log("DD::", answer)
  })

  socket.on('record', async () => {
    startRecord(peer)
  })

  socket.on('transport-connect', async ({ dtlsParameters }) => {
    await producerTransport.connect({ dtlsParameters })
  })

  socket.on('transport-produce', async ({ kind, rtpParameters, appData }, callback) => {
    producer = await producerTransport.produce({
      kind,
      rtpParameters,
    })
    producer.on('transportclose', () => {
      console.log('transport for this producer closed ')
      producer.close()
    })

    startRecord(peer)

    callback({
      id: producer.id
    })
  })

  socket.on('transport-recv-connect', async ({ dtlsParameters }) => {
    await consumerTransport.connect({ dtlsParameters })
  })

  socket.on('consume', async ({ rtpCapabilities }, callback) => {
    try {
      if (router.canConsume({
        producerId: producer.id,
        rtpCapabilities
      })) {
        consumer = await consumerTransport.consume({
          producerId: producer.id,
          rtpCapabilities,
          paused: true,
        })

        const params = {
          id: consumer.id,
          producerId: producer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        }

        callback({ params })
      }
    } catch (error) {
      console.log(error.message)
      callback({
        params: {
          error: error
        }
      })
    }
  })


  socket.on('closeAll', () => {
    if (producer) {
      producer.close()
    }
    if (producerTransport) {
      producerTransport.close()
    }
    socket.broadcast.emit('closeproduce');

  })

  socket.on('consumer-resume', async () => {
    console.log('consumer resume')
    await consumer.resume()
  })

  socket.on('create-producer', async (callback) => {
    streamTransport = await createPlain()
    producer = await streamTransport.produce({
      kind: 'audio',
      rtpParameters: {
        codecs: [{
          mimeType: 'audio/opus',
          clockRate: 48000,
          payloadType: 101,
          channels: 2,
          parameters: { 'sprop-stereo': 1 },
          rtcpFeedback: [
            { type: 'transport-cc' },
          ],
        }],
        encodings: [{ ssrc: 11111111 }],
      },
      appData: {},
    });
    callback(streamTransport.tuple.localPort)

  })

  socket.on('recive-producer-audio', async (data) => {
    startRecord(peer)
  })

})

const createWebRtcTransport = async (callback) => {
  try {
    const webRtcTransport_options = {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: HOST_IP,
        }
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    }

    let transport = await router.createWebRtcTransport(webRtcTransport_options);

    transport.on('dtlsstatechange', dtlsState => {
      if (dtlsState === 'closed') {
        transport.close()
      }
    })

    transport.on('close', () => {
      console.log('transport closed')
    })

    callback({
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      }
    })

    return transport;
  } catch (error) {
    console.log(error)
    callback({
      params: {
        error: error
      }
    })
  }
}

const startRecord = async (peer) => {
  let recordInfo = await publishProducerRtpStream(peer, producer);

  recordInfo.fileName = Date.now().toString() + "p";
  const options = {
    "rtpParameters": recordInfo,
    "format": "hls"
  }
  peer.process = new FFmpeg(options);

  setTimeout(async () => {
    rtpConsumer.resume();
    rtpConsumer.requestKeyFrame();
  }, 1000);

};

const publishProducerRtpStream = async (peer, producer, ffmpegRtpCapabilities) => {
  const rtpTransportConfig = config.plainRtpTransport;

  const rtpTransport = await router.createPlainTransport(rtpTransportConfig)
  const remoteRtpPort = await getPort();

  let remoteRtcpPort;
  if (!rtpTransportConfig.rtcpMux) {
    remoteRtcpPort = await getPort();
  }

  await rtpTransport.connect({
    ip: '127.0.0.1',
    port: remoteRtpPort,
    rtcpPort: remoteRtcpPort
  });

  const codecs = [];
  const routerCodec = router.rtpCapabilities.codecs.find(
    codec => codec.kind === producer.kind
  );
  codecs.push(routerCodec);
  const rtpCapabilities = {
    codecs,
    rtcpFeedback: []
  };

  rtpConsumer = await rtpTransport.consume({
    producerId: producer.id,
    rtpCapabilities,
    paused: true
  });

  return {
    remoteRtpPort,
    remoteRtcpPort,
    localRtcpPort: rtpTransport.rtcpTuple ? rtpTransport.rtcpTuple.localPort : undefined,
    rtpCapabilities,
    rtpParameters: rtpConsumer.rtpParameters
  };
};