const io = require('socket.io-client')
const mediasoupClient = require('mediasoup-client')

// const socket = io("/mediasoup")
const socket = io("https://f641-2402-800-61d7-a70b-d967-a252-bc8a-29bc.ngrok-free.app/mediasoup")
let device
let rtpCapabilities
let consumerTransport
let consumer
let isProducer = false

let mediaRecorder
let recordedChunks = []

socket.on('connection-success', ({ socketId, existsProducer }) => {
  console.log(socketId, existsProducer)

})


// const saveStream = async (stream) => {
//   try {
//     mediaRecorder = new MediaRecorder(stream);
//     mediaRecorder.ondataavailable = function (event) {
//       if (event.data.size > 0) {

//         recordedChunks.push(event.data);
//       }
//     };

//     mediaRecorder.onstop = (e) => {
//       const blob = new Blob(recordedChunks, { type: 'audio/opus' });
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       a.href = url;
//       a.download = 'recorded-video.webm';
//       document.body.appendChild(a);
//       a.click();
//       window.URL.revokeObjectURL(url)
//       recordedChunks = [];
//     }

//     mediaRecorder.start()

//   } catch (err) {
//     console.error('Error accessing webcam:', err);
//   }
// }



socket.on("closeproduce", () => {
  const video = document.getElementById("remoteVideo")
  // mediaRecorder.stop()
  video.src = ''
})

const goConsume = () => {
  device === undefined ? getRtpCapabilities() : createRecvTransport()
}

const goConsume2 = () => {
  device === undefined ? getRtpCapabilities() : createRecvTransport2()
}

const createDevice = async () => {
  console.log('stage2');

  try {
    device = new mediasoupClient.Device()

    await device.load({
      routerRtpCapabilities: rtpCapabilities
    })

    createRecvTransport()
    createRecvTransport2()
  } catch (error) {
    console.log(error)
    if (error.name === 'UnsupportedError')
      console.warn('browser not supported')
  }
}

const getRtpCapabilities = () => {
  console.log('stage1');
  socket.emit('createRoom', (data) => {
    rtpCapabilities = data.rtpCapabilities
    createDevice()
  })
}

const createRecvTransport = async () => {
  console.log('stage3');

  await socket.emit('createWebRtcTransport', { sender: false }, ({ params }) => {

    if (params.error) {
      console.log(params.error)
      return
    }
    consumerTransport = device.createRecvTransport(params)

    consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await socket.emit('transport-recv-connect', {
          dtlsParameters,
        })
        
        callback()
      } catch (error) {
        errback(error)
      }
    })

      
    // consumerTransport.on('connectionstatechange', (state) => {
    // if (state == 'disconnected') {
    //     createRecvTransport()
    // }
    // })

    connectRecvTransport()
  })
}

const connectRecvTransport = async () => {
  console.log('stage4');
  await socket.emit('consume', {
    rtpCapabilities: device.rtpCapabilities,
    channelSlug: channelSlug
  }, async ({ params }) => {
    console.log(params)
    if (params.error) {
      console.log('error', params.error);
      return
    }

    consumer = await consumerTransport.consume({
      id: params.id,
      producerId: params.producerId,
      kind: params.kind,
      rtpParameters: params.rtpParameters
    })

    const { track } = consumer
    console.log("tracks", track);

    // let stream = new MediaStream([track])
    let audiostream = new MediaStream([track])
    remoteVideo.srcObject = audiostream
    // await saveStream(audiostream)

    socket.emit('consumer-resume')
  })
}

socket.on('reconnect', async () => {
    console.log('consumer resume ====================')
    createRecvTransport()
})

btnRecvSendTransport.addEventListener('click',() => goConsume('kenh1'))
btnRecvSendTransport2.addEventListener('click', () => goConsume('kenh2'))
btnRecvSendTransport3.addEventListener('click', () => goConsume('kenh3'))