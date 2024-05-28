const { Readable } = require('stream');
const os = require('os');
module.exports.convertStringToStream = (stringToConvert) => {
  const stream = new Readable();
  stream._read = () => { };
  stream.push(stringToConvert);
  stream.push(null);

  return stream;
};

module.exports.getCodecInfoFromRtpParameters = (kind, rtpParameters) => {
  return {
    payloadType: rtpParameters.codecs[0].payloadType,
    codecName: rtpParameters.codecs[0].mimeType.replace(`${kind}/`, ''),
    clockRate: rtpParameters.codecs[0].clockRate,
    channels: kind === 'audio' ? rtpParameters.codecs[0].channels : undefined
  };
};

module.exports.getOS=()=> {
  const platform = os.platform();

  if (platform === 'win32') {
    return 'Windows';
  } else if (platform === 'linux') {
    return 'Linux';
  } else {
    return 'Unknown';
  }
}
