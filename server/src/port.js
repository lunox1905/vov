const MIN_PORT = 20000;
const MAX_PORT = 30000;
const TIMEOUT = 400;

const takenPortSet = new Set();

const getPort = async () => {
  let port = getRandomPort();

  while (takenPortSet.has(port)) {
    port = getRandomPort();
  }

  takenPortSet.add(port);

  return port;
};

const releasePort = (port) => takenPortSet.delete(port);

const getRandomPort = () => Math.floor(Math.random() * (MAX_PORT - MIN_PORT + 1) + MIN_PORT);

module.exports = {
  getPort,
  releasePort
};