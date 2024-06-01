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
const direcLink= require('./directLink')
const {
  getPort,
} = require('./port');
const { ppid } = require('process');

app.use(cors("*"))
app.use('/play', express.static('../client/public'))
app.use('/webplay', express.static('../webclient/src'))

app.use('/playhls', (request, response) => {
  const url = request.url.substring(request.url.lastIndexOf('/') + 1);
    const base = path.basename(url, path.extname(url))
    const extractBase = base.substring(0, base.indexOf('-hls') + 4);
    let filePath = ""
    var filePathOption1 = path.resolve(`../files/hls/${base}/${url}`);
    var filePathOption2 = path.resolve(`../files/hls/${extractBase}/${url}`)

    if (fs.existsSync(filePathOption1)) {
        filePath = filePathOption1
    }
    else {
        filePath = filePathOption2
    }

    fs.readFile(filePath, function (error, content) {
        response.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
        if (error) {
            if (error.code == 'ENOENT') {
                fs.readFile('./404.html', function (error, content) {
                    response.end(content, 'utf-8');
                });
            }
            else {
                response.writeHead(500);
                response.end(' error: ' + error.code + ' ..\n');
                response.end();
            }
        }
        else {
            response.end(content, 'utf-8');
        }
    });
})

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
let rtpTransports = []
let processWriteHLS = {};
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
  if (!producers.has(channelSlug) || producers.get(channelSlug).length==0) {
    return null
  }
  return producers.get(channelSlug)[0].producer
}

// const getProducerList = () => {
//   return producers
//   let producersList = {}
//   for ([key, value] in producers) {

//     producersList[key] = {
//       id: value.id,
//       slug: value.slug
//     }
//   }
//   return producersList
// }

peers.on('connection', async socket => {

  socket.on('disconnect', () => {
    if(processWriteHLS[socket.id]) {
      processWriteHLS[socket.id].kill()
      delete processWriteHLS[socket.id]
    }
    webRTCTransport = webRTCTransport.filter(item => item.id === socket.id);
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

  // socket.on('record', async () => {
  //   startRecord(peer)
  // })

  socket.on('transport-recv-connect', async ({ dtlsParameters }) => {
    console.log("=====================================::")
    const consumerTransport = webRTCTransport.find(item => item.id == socket.id).consumerTransport
    await consumerTransport.connect({ dtlsParameters })
  })

  socket.on('consume', async ({ rtpCapabilities, channelSlug }, callback) => {
    try {
      if (!channelSlug) {
        throw new Error(`Invalid channel:${channelSlug}`)
      }
      socket.join(channelSlug);
      let producer;
      if (producers.get(channelSlug) && producers.get(channelSlug).length > 0) {
        producer = producers.get(channelSlug)[0].producer;
      }
      if (!producer) {
        throw new Error(`Cannot find producer for channel ${channelSlug}`)
      }
      if (router.canConsume({
        producerId: producer.id,
        rtpCapabilities
      })) {
        const consumerTransport = webRTCTransport.find(item => item.id == socket.id).consumerTransport;
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
    // const isPlay = producers.find(item => item.slug === data.slug) 
    // const existsIndex = producers.findIndex(item => item.id === data.id);
    // if (existsIndex !== -1) {
    //     producers[existsIndex].producer = producer;
    // } else {
    //   producers.push({ channelName: data.channelName, slug: data.slug, id: data.id, producer });
    // }
    if (!producers.has(data.slug)) {
      producers.set(data.slug, [])
      // startRecord(producer, data.slug, socket.id)
    }
    producers.get(data.slug).push(
      {
        slug: data.slug,
        id: data.id,
        producer: producer
      }
    )
    console.log('Producers', producers);



    callback(streamTransport.tuple.localPort)
    // if(!isPlay) {
    //   startRecord(producer, data.slug, socket.id)
    // } 
  })

  // socket.on('receive-producer-audio', async (data) => {
  //   startRecord(peer, data)
  // })
  socket.on("link-stream", async (data) => {
    const { producer, transport } = await direcLink(router, data)
    // console.log('prod,tran',producer,transport);
    
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
  } )

})


// Periodically remove deleted Producer
setInterval(async () => {
  let countDelete = 0;
  const promises = [];
  const producerFails = [];
  for (let [key, value] of producers) {
    value.forEach(item => {
      if (item.producer) {
        promises.push(item.producer.getStats().then(stats => {
          // console.log('stats',stats);
          if (!stats ||stats[0]?.bitrate === 0) {
            // console.log('close producer', item);

            item.isDelete = true;
            countDelete += 1;
            producerFails.push(item.slug)
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
      // producers = producers.filter(producer => producer.isDelete !== true);

      for (let [key, value] of producers) {
        const newValue = value.filter(data => data.isDelete !== true);
        producers.set(key, newValue);
      }
    }
    if(producerFails.length > 0) {
      producerFails.forEach(item => {
        const data = getProducer(item)
        if(data) {
          // startRecord(data.producer, item, data.socketId)
        }
      })
    }
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

const startRecord = async (producer, channelSlug, socketId) => {
  let recordInfo = await publishProducerRtpStream(producer);

  recordInfo.fileName = channelSlug + "-hls";
  const options = {
    "rtpParameters": recordInfo,
    "format": "hls"
  }
  processWriteHLS[socketId] = new FFmpeg(options);
}

const publishProducerRtpStream = async (producer) => {
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

  const rtpConsumer = await rtpTransport.consume({
    producerId: producer.id,
    rtpCapabilities,
    paused: true
  });

  setTimeout(async () => {
    rtpConsumer.resume();
    rtpConsumer.requestKeyFrame();
  }, 1000);

  return {
    remoteRtpPort,
    remoteRtcpPort,
    localRtcpPort: rtpTransport.rtcpTuple ? rtpTransport.rtcpTuple.localPort : undefined,
    rtpCapabilities,
    rtpParameters: rtpConsumer.rtpParameters
  };
};