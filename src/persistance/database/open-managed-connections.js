const { uniqueId, map, size } = require("lodash");
const logger = require("../../logger");
const { openConnection } = require("./open-connection");

const activeClients = {};
const idleClients = {};
const openManagedConnection = async (options) => {
  try {
    const connection = await getConntection(options);

    moveConnectionToActive(connection.id);
    return connection;
  } catch (error) {
    logger.error(`Unable to open database connection: ${error}`);
    throw error;
  }
};

const MAX_CLIENTS = 10;
const getConntection = async (options) => {
  // Wait for clients to become idle
  await sleepUntil(() => size(activeClients) < MAX_CLIENTS, 10_000);

  const connection =
    size(idleClients) >= MAX_CLIENTS
      ? idleClients[Object.keys(idleClients)[0]]
      : await setupNewManagedConnection(options);

  return connection;
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
    query: async (query, variables) => {
      try {
        return await rawConnection.client.query(query, variables);
      } catch (error) {
        throw error;
      } finally {
        moveConnectionToIdle(connectionId);
      }
    },
    closeConnection: async () => {
      await rawConnection.closeConnection();
      delete idleClients[connectionId];
      delete activeClients[connectionId];
    },
  };

  idleClients[connectionId] = connection;
  return connection;
};

const moveConnectionToActive = (conntectionId) => {
  activeClients[conntectionId] = idleClients[conntectionId];
  delete idleClients[conntectionId];
};

const moveConnectionToIdle = (conntectionId) => {
  idleClients[conntectionId] = activeClients[conntectionId];
  delete activeClients[conntectionId];
};

const disconnect = async () => {
  await Promise.all([
    ...map(idleClients, async (connection) => connection?.closeConnection()),
    ...map(activeClients, async (connection) => connection?.closeConnection()),
  ]);
};

module.exports = {
  openManagedConnection,
  disconnect,
};
