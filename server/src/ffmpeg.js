const child_process = require('child_process');
const { EventEmitter } = require('events');
const { createSdpText } = require('./sdp.js');
const { convertStringToStream } = require('./utils.js');
const path = require("path")
const fs = require('fs');
// console.log('path', path.resolve('../files'));

const RECORD_FILE_LOCATION_PATH = process.env.RECORD_FILE_LOCATION_PATH || path.resolve('../files');
console.log("Save path::", RECORD_FILE_LOCATION_PATH)
module.exports = class FFmpeg {
  constructor(options) {
    const { rtpParameters, format } = options;
    this.format = format;
    this._rtpParameters = rtpParameters;
    this._process = null;
    this._observer = new EventEmitter();

    this.formats = {
      "mp3": this._audioArgs,
      "hls": this._hlsArgs
    }
    this.args = this.formats[format]

    this._createProcess();
  }

  _createProcess() {
    const sdpString = createSdpText(this._rtpParameters);
    const sdpStream = convertStringToStream(sdpString);

    console.log('createProcess() [sdpString:%s]', sdpString);

    this._process = child_process.spawn('ffmpeg', this._commandArgs);

    if (this._process.stderr) {
      this._process.stderr.setEncoding('utf-8');

      this._process.stderr.on('data', data =>
        console.log('ffmpeg::process::data [data:%o]', data)
      );
    }

    if (this._process.stdout) {
      this._process.stdout.setEncoding('utf-8');

      this._process.stdout.on('data', data =>
        console.log('ffmpeg::process::data [data:%o]', data)
      );
    }

    this._process.on('message', message =>
      console.log('ffmpeg::process::message [message:%o]', message)
    );

    this._process.on('error', error =>
      console.error('ffmpeg::process::error [error:%o]', error)
    );

    this._process.once('close', () => {
      console.log('ffmpeg::process::close');
      this._observer.emit('process-close');
    });

    sdpStream.on('error', error =>
      console.error('sdpStream::error [error:%o]', error)
    );

    // Pipe sdp stream to the ffmpeg process
    sdpStream.resume();
    sdpStream.pipe(this._process.stdin);
  }

  kill() {
    console.log('kill() [pid:%d]', this._process.pid);
    this._process.kill('SIGINT');
  }

  get _commandArgs() {
    let commandArgs = [
      '-loglevel',
      'debug',
      '-protocol_whitelist',
      'pipe,udp,rtp',
      '-fflags',
      '+genpts',
      '-f',
      'sdp',
      '-i',
      'pipe:0'
    ];
    console.log("DĐ::", this.args)
    commandArgs = commandArgs.concat(this.args);

    if (this.format == "mp3") {
      commandArgs = commandArgs.concat([
        `${RECORD_FILE_LOCATION_PATH}/mp3/${this._rtpParameters.fileName}.mp3`
      ]);
    }
    else if (this.format == "hls") {
      const folderPath = `${RECORD_FILE_LOCATION_PATH}/hls/${this._rtpParameters.fileName}`
      fs.mkdir(folderPath, (err) => {
        if (err) {
          // Handle the error if the folder creation failed
          console.error('Error creating folder:', err);
        } else {
          // Folder created successfully
          console.log('Folder created successfully:', folderPath);
        }
      });
      commandArgs = commandArgs.concat([
        `${folderPath}/${this._rtpParameters.fileName}.m3u8`
      ]);
    }
      // console.log('arg', commandArgs);

    return commandArgs;
  }

  get _audioArgs() {
    return [
      '-map',
      '0:a:0',
      '-strict', // libvorbis is experimental
      '-2',
      '-c:a',
      'mp3',

    ];
  }
  get _hlsArgs() {
    return [
      '-hls_time', '5',           // Segment duration in seconds
      '-hls_list_size', '6',       // Maximum number of playlist entries
      '-start_number', '1',        // Start number for the segment filenames
      '-f', 'hls',                 // Output format HLS
    ];
  }
}