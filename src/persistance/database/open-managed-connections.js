const { uniqueId, map, size } = require("lodash");
const logger = require("../../logger");
const { seconds } = require("../../to-milliseconds");
const { openConnection } = require("./open-connection");

const activeConnections = {};
const idleConnections = {};
const openManagedConnection = async (options) => {
  try {
    const connection = await getConntection(options);
    console.log(
      "🚀 ~ file: open-managed-connections.js ~ line 11 ~ openManagedConnection ~ connection",
      connection.id
    );

    moveConnectionToActive(connection.id);
    return connection;
  } catch (error) {
    logger.error(`Unable to open database connection: ${error}`);
    throw error;
  }
};

const MAX_CLIENTS = 10;
const CONNECTIION_LIFE_SPAN = seconds(10);
const getConntection = async (options) => {
  // Wait for clients to become idle
  await sleepUntil(() => size(activeConnections) < MAX_CLIENTS, 10_000);

  const idleConnection = idleConnections[Object.keys(idleConnections)[0]];
  const hasClientTimedOut =
    idleConnection &&
    idleConnection.lastQueryTime < Date.now() - CONNECTIION_LIFE_SPAN;

  if (hasClientTimedOut) {
    cleanUpIdleConnection(idleConnection);
    return await setupNewManagedConnection(options);
  }

  return idleConnection && size(idleConnections) >= MAX_CLIENTS
    ? idleConnection
    : await setupNewManagedConnection(options);
};

const sleepUntil = async (f, timeoutMs) => {
  return new Promise((resolve, reject) => {
    const timeWas = new Date();
    const wait = setInterval(function () {
      if (f()) {
        clearInterval(wait);
        resolve();
      } else if (new Date() - timeWas > timeoutMs) {
        // Timeout
        clearInterval(wait);
        reject();
      }
    }, 20);
  });
};

const setupNewManagedConnection = async (options) => {
  const rawConnection = await openConnection(options);

  const connectionId = uniqueId();
  const connection = {
    id: connectionId,
    lastQueryTime: Date.now(),
    query: async (query, variables) => {
      try {
        this.lastQueryTime = Date.now();
        return await rawConnection.client.query(query, variables);
      } catch (error) {
        throw error;
      } finally {
        moveConnectionToIdle(connectionId);
      }
    },
    closeConnection: async () => {
      await rawConnection.closeConnection();
      delete idleConnections[connectionId];
      delete activeConnections[connectionId];
    },
  };

  idleConnections[connectionId] = connection;
  return connection;
};

const moveConnectionToActive = (conntectionId) => {
  activeConnections[conntectionId] = idleConnections[conntectionId];
  delete idleConnections[conntectionId];
};

const moveConnectionToIdle = (conntectionId) => {
  idleConnections[conntectionId] = activeConnections[conntectionId];
  delete activeConnections[conntectionId];
};

const cleanUpIdleConnection = async (connection) => {
  delete idleConnections[connection.id];
  await connection.closeConnection();
};

const hasConnectionTimedOut = (connection) =>
  connection.lastQueryTime > Date.now() - seconds(10);

const disconnect = async () => {
  await Promise.all([
    ...map(idleConnections, async (connection) =>
      connection?.closeConnection()
    ),
    ...map(activeConnections, async (connection) =>
      connection?.closeConnection()
    ),
  ]);
};

module.exports = {
  openManagedConnection,
  disconnect,
};
