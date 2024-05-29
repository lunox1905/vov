const express = require('express');
const https = require('httpolyglot');
const fs = require('fs');
const path = require('path');
const cors = require("cors");
const { Server } = require('socket.io');
const mediasoup = require('mediasoup');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const app = express();
const config = require('./config');
const FFmpeg = require('./ffmpeg');
const {
  getPort,
} = require('./port');
const { ppid } = require('process');

app.use(cors("*"))
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
let producers = new Map()
let consumers = []
const peer = {};
let rtpConsumer
let webRTCTransport = []
let streamTransport;
let consumer;
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
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    payloadType: 101,
    channels: 2,
    parameters: { 'sprop-stereo': 1 },
    rtcpFeedback: [
      { type: 'transport-cc' },
    ],
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
  router = await worker.createRouter({ mediaCodecs })
  return router
}

const createPlain = async () => {

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

  return streamTransport;
}
// Create Mediasoup Router
router = createWorker()

const getProducer = (channelSlug) => {
  console.log("producers", producers)
  console.log("has slug", producers.get(channelSlug))
  if (!producers.has(channelSlug) || producers.has(channelSlug).length==0) {
    return null
  }
  return producers.get(channelSlug)[0].producer
}

const getProducerList = () => {
  return producers
  let producersList = {}
  for ([key, value] in producers) {

    producersList[key] = {
      id: value.id,
      slug: value.slug
    }
  }
  return producersList
}

peers.on('connection', async socket => {

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
      console.log('===========================================')
      consumerSocketId = socket.id
      consumerTransport = await createWebRtcTransport(callback)
      console.log(socket.id)
      const existsIndex = webRTCTransport.findIndex(item => item.id === socket.id);
      if (existsIndex !== -1) {
        webRTCTransport[existsIndex].consumerTransport = consumerTransport;
      } else {
        webRTCTransport.push({
          consumerTransport,
          id: socket.id
        })
      }

    }
  })

  socket.on('record', async () => {
    startRecord(peer)
  })

  socket.on('transport-recv-connect', async ({ dtlsParameters }) => {
    console.log(socket.id)
    const consumerTransport = webRTCTransport.find(item => item.id == socket.id).consumerTransport
    await consumerTransport.connect({ dtlsParameters })
  })

  socket.on('consume', async ({ rtpCapabilities, channelSlug }, callback) => {
    try {
      if (!channelSlug) {
        throw new Error(`Invalid channel:${channelSlug}`)
      }
      console.log("SID::", socket.id)
      socket.join(channelSlug);
      const producer = null
      if (producers.get(channelSlug) && producers.get(channelSlug).length > 0) {

        producer = producers.get(channelSlug)[0]
      }
      if (!producer) {
        throw new Error(`Cannot find producer for channel ${channelSlug}`)
      }
      if (router.canConsume({
        producerId: producer.id,
        rtpCapabilities
      })) {
        const consumer = await consumerTransport.consume({
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
        await consumer.resume()

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
    // if (producer) {
    //   producer.close()
    // }
    // if (producerTransport) {
    //   producerTransport.close()
    // }
    // socket.broadcast.emit('closeproduce');

  })

  // socket.on('consumer-resume', async () => {
  //   console.log('consumer resume')

  // })
  socket.on('create-producer', async (data, callback) => {
    const streamTransport = await createPlain();
    const producer = await streamTransport.produce({
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
    // const existsIndex = producers.findIndex(item => item.id === data.id);
    // if (existsIndex !== -1) {
    //     producers[existsIndex].producer = producer;
    // } else {
    //   producers.push({ channelName: data.channelName, slug: data.slug, id: data.id, producer });
    // }
    if (!producers.has(data.channelName)) {
      producers.set(data.channelName, [])
    }
    producers.get(data.channelName).push(
      {
        slug: data.slug,
        id: data.id,
        producer: producer
      }
    )
    console.log('Producers', producers);



    callback(streamTransport.tuple.localPort)
  })

  socket.on('recieve-producer-audio', async (data) => {
    startRecord(peer, data)
  })

})

// Periodically remove deleted Producer
setInterval(async () => {
  let countDelete = 0;
  const promises = [];
  for (let [key, value] of producers) {
    value.forEach(item => {
      if (item.producer) {
        promises.push(item.producer.getStats().then(stats => {
          // console.log('stats',stats);
          if (!stats ||stats[0]?.bitrate === 0) {
            console.log('close producer', item);

            item.isDelete = true;
            countDelete += 1;
            peers.to(item.slug).emit('reconnect');
            if (consumerTransport && !consumerTransport.closed) {
              consumerTransport.close();
            }
          }
        }));
      }
    });

  }


  Promise.all(promises)
    .then(() => {
      if (countDelete > 0) {
        console.log(' some producers delete');
        for (let [key, value] of producers) {
          value = value.filter(data => data.producer.isDelete !== true);
        }
      }

      // console.log("producers:",getProducerList())
    })

}, 1000)

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

const startRecord = async (peer, data) => {
  try {
    console.log('data', data);

    const producer = getProducer(data.channelSlug)
    if (!producer) {
      throw new Error(`Cannot find producer for channel : ${data.channelSlug}`)
    }
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
  } catch (error) {
    console.log(error);
  }

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