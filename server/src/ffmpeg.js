import child_process from 'child_process';
import { EventEmitter } from 'events';
import { createSdpText } from './sdp.js';
import { convertStringToStream } from './utils.js';
import { format } from 'path';

const RECORD_FILE_LOCATION_PATH = process.env.RECORD_FILE_LOCATION_PATH || './files';

export default class FFmpeg {
  constructor(options) {

    const { rtpParameters, format } = options
    this.format = format
    this._rtpParameters = rtpParameters;
    this._process = null;
    this._observer = new EventEmitter();

    this.formats = {
      "mp3": this._audioArgs,
      "hls": this._hlsArgs
    }
    this.args = this.formats[format]
    // this._createProcess("mp3", this._audioArgs);
    this._createProcess();
  }
  _createProcess() {

    const sdpString = createSdpText(this._rtpParameters);
    const sdpStream = convertStringToStream(sdpString);
    // console.log('createProcess() [sdpString:%s]', sdpString);
    console.log('create process');

    this._process = child_process.spawn('ffmpeg', this._commandArgs());
    console.log('create', this._process === null ? "null process" : this._process.pid);

    if (this._process.stderr) {
      this._process.stderr.setEncoding('utf-8');

      this._process.stderr.on('data', data =>
        console.log('ffmpeg::process::data [data:%o]', data)
      );
    }

    // if (this._process.stdout) {
    //   this._process.stdout.setEncoding('utf-8');

    //   this._process.stdout.on('data', data =>
    //     console.log('ffmpeg::process::data [data:%o]', data)
    //   );
    // }

    // this._process.on('message', message =>
    //   console.log('ffmpeg::process::message [message:%o]', message)
    // );

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

    console.log('kill() [pid:%d]', this._process === null ? "process is null" : this._process.pid);
    this._process.kill('SIGINT');
  }

  _commandArgs() {
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

    commandArgs = commandArgs.concat(this.args);

    if (this.format == "mp3") {
      commandArgs = commandArgs.concat([
        `${RECORD_FILE_LOCATION_PATH}/${this._rtpParameters.fileName}.mp3`
      ]);
    }
    else if (this.format == "hls") {
      commandArgs = commandArgs.concat([
        `${RECORD_FILE_LOCATION_PATH}/${this._rtpParameters.fileName}.m3u8`
      ]);
    }
      console.log('arg', commandArgs);

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