<<<<<<< HEAD
import React from "react";
=======
import { useState } from "react";
>>>>>>> 83c7254c0600241b57b00301b97ab00c59b8d03c
import { useEffect ,useRef} from "react";
import { useSocket } from "../context/SocketContext";
import * as mediasoupClient from "mediasoup-client"
export const Listen = () => {
    const socket = useSocket();
    const audioRef = useRef(null);
<<<<<<< HEAD
=======
    const [ channelSlug, setChanelSlug ] = useState('')
>>>>>>> 83c7254c0600241b57b00301b97ab00c59b8d03c
    useEffect(() => {
        if (socket) {
            socket.on('connect', () => {
                console.log('Connected to socket server');

            });
            // Cleanup on unmount
            return () => {
                socket.off('connect');
                socket.off('message');
            };
        }
    }, [socket]);


    let device
    let rtpCapabilities
    let consumerTransport
    let consumer

    // socket.on("closeproduce", () => {
    //     const video = document.getElementById("remoteVideo")
    //     // mediaRecorder.stop()
    //     video.src = ''
    // })

<<<<<<< HEAD
    const goConsume = () => {
=======
    const goConsume = (channelSlug) => {
        setChanelSlug(channelSlug)
>>>>>>> 83c7254c0600241b57b00301b97ab00c59b8d03c
        device === undefined ? getRtpCapabilities() : createRecvTransport()
    }
    const getRtpCapabilities = () => {
        console.log('stage1');
        socket.emit('createRoom', (data) => {
            rtpCapabilities = data.rtpCapabilities
            createDevice()
        })
    }
    const createDevice = async () => {
        console.log('stage2');

        try {
            device = new mediasoupClient.Device()
            await device.load({
                routerRtpCapabilities: rtpCapabilities
            })

            createRecvTransport()

        } catch (error) {
            console.log(error)
            if (error.name === 'UnsupportedError')
                console.warn('browser not supported')
        }
    }

    

    const createRecvTransport = async () => {
        console.log('stage3');

        await socket.emit('createWebRtcTransport', { sender: false }, ({ params }) => {

            if (params.error) {
                console.log(params.error)
                return
            }
<<<<<<< HEAD
=======
            console.log('1111111111111===')
>>>>>>> 83c7254c0600241b57b00301b97ab00c59b8d03c
            consumerTransport = device.createRecvTransport(params)

            consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
<<<<<<< HEAD
=======
                    console.log('1222222===')
>>>>>>> 83c7254c0600241b57b00301b97ab00c59b8d03c
                    await socket.emit('transport-recv-connect', {
                        dtlsParameters,
                    })

                    callback()
                } catch (error) {
                    errback(error)
                }
            })

            connectRecvTransport()
        })
    }

    const connectRecvTransport = async () => {
        console.log('stage4');
        await socket.emit('consume', {
            rtpCapabilities: device.rtpCapabilities,
<<<<<<< HEAD
            channelSlug:"slug"
=======
            channelSlug: channelSlug
>>>>>>> 83c7254c0600241b57b00301b97ab00c59b8d03c
        }, async ({ params }) => {

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
<<<<<<< HEAD
            console.log("tracks", track);

            // let stream = new MediaStream([track])
            let audiostream = new MediaStream([track])
            audioRef.srcObject = audiostream
            // await saveStream(audiostream)
            socket.emit('consumer-resume')
        })
    }

    return (
        <>
        
            <div className="p-3">
                
            <div id="sharedBtns">
                    <audio ref={ audioRef} id="remoteVideo" autoPlay ></audio>
            </div>
    
            <div id="sharedBtns">
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={goConsume}>Nghe</button>
            </div>
           </div>
        </>
)
=======
            let audiostream = new MediaStream([track])
            
            audioRef.current.srcObject = audiostream
        })
    }

    useEffect(() => {
        socket.on('reconnect', async () => {
            createRecvTransport()
        })
    }, [])

    return (
        <>
            <div className="p-3">
                
            <div id="sharedBtns">
                    <audio ref={audioRef} id="remoteVideo" autoPlay ></audio>
            </div>
    
            <div id="sharedBtns">
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={() => goConsume('kenh1')}>Nghe kênh 1</button>
            </div>

            <div id="sharedBtns">
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={() => goConsume('kenh2')}>Nghe kênh 2</button>
            </div>

            <div id="sharedBtns">
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={() => goConsume('kenh3')}>Nghe kênh 3</button>
            </div>
           </div>
        </>
    )
>>>>>>> 83c7254c0600241b57b00301b97ab00c59b8d03c
}
