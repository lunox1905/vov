import React from "react";
import { useEffect, useRef ,useContext} from "react";
import * as mediasoupClient from "mediasoup-client"
import { SocketContext} from "../context/SocketContext";
export const Play = () => {
    const { socket } = useContext(SocketContext);
    const msgSpan=useRef(null)
    useEffect(() => {
        if (socket) {
            socket.on('connect', () => {
                console.log('Connected to socket server');
            });

            socket.on('message', (message) => {
                console.log('New message:', message);
            });
            // Cleanup on unmount
            return () => {
                socket.off('connect');
                socket.off('message');
            };
        }
    }, [socket]);
    // const audioRef = useRef(null);
    let device
    let rtpCapabilities
    let producerTransport
    let producer
   
    let params = {}
    const streamSuccess = (stream) => {
        const track = stream.getAudioTracks()[0]
        params = {
            track,
            ...params
        }

        device === undefined ? getRtpCapabilities() : createSendTransport()
    }

    const getLocalStream = () => {
        msgSpan.innerHTML = "Start streaming "
        navigator.mediaDevices.getUserMedia({
            audio: true,
        })
            .then(streamSuccess)
            .catch(error => {
                console.log(error.message)
            })
    }

    const createDevice = async () => {
        try {
            console.log('stage2');

            device = new mediasoupClient.Device()

            await device.load({
                routerRtpCapabilities: rtpCapabilities
            })

            console.log('Device RTP Capabilities', device.rtpCapabilities)

            createSendTransport()

        } catch (error) {
            console.log(error)
            if (error.name === 'UnsupportedError')
                console.warn('browser not supported')
        }
    }

    const getRtpCapabilities = () => {

        console.log('stage1');

        socket.emit('createRoom', (data) => {
            console.log(`Router RTP Capabilities...`, data.rtpCapabilities)
            rtpCapabilities = data.rtpCapabilities
            createDevice()
        })
    }

    const createSendTransport = () => {
        console.log('stage3');

        socket.emit('createWebRtcTransport', { sender: true }, ({ params }) => {
            if (params.error) {
                console.log(params.error)
                return
            }
            console.log(params)
            producerTransport = device.createSendTransport(params)

            producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
                    await socket.emit('transport-connect', {
                        dtlsParameters,
                    })
                    callback()

                } catch (error) {
                    errback(error)
                }
            })

            producerTransport.on('produce', async (parameters, callback, errback) => {
                console.log("pppp:::::::::::", parameters)

                try {
                    await socket.emit('transport-produce', {
                        kind: parameters.kind,
                        rtpParameters: parameters.rtpParameters,
                        appData: parameters.appData,
                    }, ({ id }) => {
                        callback({ id })
                    })
                } catch (error) {
                    errback(error)
                }
            })

            connectSendTransport()
        })
    }

    const connectSendTransport = async () => {
        console.log('stage4');

        producer = await producerTransport.produce(params)

        producer.on('trackended', () => {
            console.log('track ended')

        })

        producer.on('transportclose', () => {
            console.log('transport ended')

        })
    }
    const stopStream = () => {
        msgSpan.innerHTML = "Stop streaming ..."
        socket.emit("closeAll")
        console.log('finished stopStream');
    }
    return (
        <>
            <div className="flex flex-col">
                <div className="flex justify-center ">
                    <span ref={msgSpan} id="msg" className=""> play</span>
                </div>
                <div className=" m-3 flex  justify-center gap-3">

                    <div>
                        <button onClick={getLocalStream} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Publish</button>
                    </div>
                    <div>

                        <button onClick={stopStream} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"> stop publish </button>
                    </div>

                </div>
            </div>
        </>
    )
} 