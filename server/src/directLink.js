const { spawn, exec } = require('child_process');
const LinkFFmpeg = require('./linkffmpeg')
var kill = require('tree-kill');
async function createTransport(router) {    
    const transport = await router.createPlainTransport({
        listenInfo: {
            protocol: "udp",
            ip: '0.0.0.0',
            announcedIp: '127.0.0.1'
            // port: 26000
        },
        rtcpMux: true,
        comedia: true, 
    });
    console.log(`Transport created: ${transport.id}`);
    return transport;
};

async function createProducer(transport, link) {
    new LinkFFmpeg(
        {
            link: link,
            port: transport.tuple.localPort
        })
            const producer = await transport.produce({

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
    return producer
};

async function direcLink (router, data) {
    const transport = await createTransport(router);
    const producer = await createProducer(transport, data.link);
    console.log(`Producer ID: ${producer.id}`);
    return { producer, transport }
};
module.exports=direcLink

