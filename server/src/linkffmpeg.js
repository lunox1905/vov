const child_process = require('child_process');
const { EventEmitter } = require('events');
const path = require("path")
const fs = require('fs');
const Logger = require('./logger.js')
var kill = require('tree-kill');
module.exports = class LinkFFmpeg {
    constructor(options) {
        const { link, port } = options;
        this.Logger = new Logger(`log.txt`).getlog()
        this.link = link
        this.port = port
        console.log('options', this.link, this.port);
        this._process = null;
        this._observer = new EventEmitter();


        this._createProcess();
    }

    _createProcess() {

        this._process = child_process.spawn('ffmpeg', this._commandArgs);

        if (this._process.stderr) {

            this._process.stderr.setEncoding('utf-8');

            this._process.stderr.on('data', data => {
                // console.log('ffmpeg::process::data [data:%o]', data)
                this.Logger.error(`ffmpeg ${data}`)
            }
            );

        }

        if (this._process.stdout) {
            this._process.stdout.setEncoding('utf-8');

            this._process.stdout.on('data', data => {
                // console.log('ffmpeg::process::data [data:%o]', data)

                this.Logger.info(`data ${data}`)
            }
            );
        }

        this._process.on('message', message => {
            // console.log('ffmpeg::process::message [message:%o]', message)

            this.Logger.info(`message ${message}`)
        }
        );

        this._process.on('error', error => {
            // console.error('ffmpeg::process::error [error:%o]', error)

            this.Logger.error(`error ${error}`)
            // kill(this._process.pid)
        }
        );

        this._process.once('close', () => {
            console.log('ffmpeg::process::close');

            // this.Logger.info('ffmpeg::process::close')
            kill(this._process.pid)
            this._observer.emit('process-close');
        });
    }

    // kill() {
    //     this.Logger.info( `kill ${this._process.pid}`)
    //     this._process.kill('SIGINT');
    // }

    get _commandArgs() {
        // let commandArgs = [

        //     '-loglevel',
        //     'debug',
        //     '-re',
        //     '-ss',
        //     '00:00:00.0',
        //     '-v',
        //     'info',
        //     '-i',
        //     this.link,
        //     '-map',
        //     '0:a:0',
        //     '-f',
        //     'tee',
        //     '-acodec',
        //     'libopus',
        //     '-ab',
        //     '128k',
        //     '-ac',
        //     '2',
        //     '-ar',
        //     '48000',
        //     '-c:v',
        //     'libvpx',
        //     '-b:v',
        //     '1000k',
        //     // `[select=v:f=rtp:ssrc=22222222:payload_type=102]rtp://127.0.0.1:${port}`,
        //     `[select=a:f=rtp:ssrc=11111111:payload_type=101]rtp://localhost:${this.port}`,
        // ];


        let commandArgs = [
            '-loglevel', 'debug',
            '-re',
            // '-ss',
            // '00:00:00.0',
            '-v','info',
            '-i',this.link,
            '-map', '0:a:0',
            '-f', 'tee',
            '-acodec', 'libopus',
            // '-ab',
            // '128k',
            '-ac', '2',
            '-ar','48000',
            // '-c:v',
            // 'libvpx',
            // '-b:v',
            // '1000k',
            `[select=a:f=rtp:ssrc=11111111:payload_type=101]rtp://127.0.0.1:${this.port}`,
        ];

        return commandArgs;
    }

}