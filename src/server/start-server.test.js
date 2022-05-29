jest.mock(
  "../websocket/check-if-clients-are-alive/check-alive-clients-interval",
  () => ({ checkAliveClientsInterval: () => 2000 })
);

jest.mock(
  "../websocket/check-if-rooms-are-abandoned/check-rooms-interval",
  () => ({ checkRoomsInterval: () => 2000 })
);

const truncateDatabaseTables = require("../../script/truncate-database-tables");

const fetch = require("node-fetch");
const { client: WebSocketClient, w3cwebsocket } = require("websocket");
const { default: waitFor } = require("wait-for-expect");
const connectedUsers = require("../websocket/connected-users");
const rooms = require("../persistance/rooms");
const messageTypes = require("../websocket/on-user-start-connection/message-types");
const { noop } = require("lodash");
const environment = require("../environment");
const { serverAuthToken } = require("../environment");
const { connectedUsersList } = require("../websocket/connected-users");
const { startServerTest } = require("./test-utils");

waitFor.defaults.timeout = 15000;
waitFor.defaults.interval = 1000;

describe("startServer", () => {
  const mockDeviceId = "012345678998765--123";

  beforeEach(async () => {
    jest.clearAllMocks();
    await truncateDatabaseTables();
  });

  describe("When a request is made to the health endpoint without a device id or auth token", () => {
    const context = startServerTest();

    it("returns an okay status", async () => {
      const response = await fetch(
        `http://localhost:${context.server.port}/health`,
        {}
      );
      expect(await response.text()).toBe(`{"status":"OK"}`);
    });
  });

  describe("When it tries to connect to the server", () => {
    const context = startServerTest();

    it("can do it using web sockets", async () => {
      const client = new WebSocketClient();

      const actual = new Promise((resolve, reject) => {
        client.on("connect", resolve);
        client.on("connectFailed", reject);
      });

      client.connect(
        `ws://localhost:${context.server.port}/?authToken=${serverAuthToken}`
      );

      // Asserts connection to server resolves
      await expect(actual).resolves.toBeDefined();
      expect(connectedUsersList.count()).toBe(1);
    });
  });

  describe("When a user sends a message via the websocket", () => {
    const context = startServerTest();

    it("updates uses lastActive time of the user", async () => {
      const client = new WebSocketClient();

      const connection = new Promise((resolve, reject) => {
        client.on("connect", (connection) => resolve(connection));
        client.on("connectFailed", reject);
      });

      client.connect(
        `ws://localhost:${context.server.port}/?authToken=${serverAuthToken}`
      );
      const resolvedConnection = await connection;

      // 1. Confirm only one user is connected
      expect(connectedUsersList.count()).toBe(1);

      // 2. get connected user id
      let userId = null;
      connectedUsersList.forEachUser((user) => (userId = user.id));

      // 3. get users last active time
      const initialLastActive =
        connectedUsersList.findUserById(userId).lastActive;

      // 4. delay to allow the last active time to be in the past
      await new Promise((r) => setTimeout(r, 100));

      // 5. send a message via the websocket
      resolvedConnection.send(
        JSON.stringify({
          type: messageTypes.connectToRoom,
          data: { password: "password" },
        })
      );

      await waitFor(() => {
        const updatedLastActive =
          connectedUsersList.findUserById(userId).lastActive;

        // 6. Assert the last active time has updated
        expect(updatedLastActive.getTime()).toBeGreaterThan(
          initialLastActive.getTime()
        );
      });
    });
  });

  describe("When an auth token is not provided", () => {
    const context = startServerTest();

    it("errors if you do not provide an auth token", async () => {
      const response = await fetch(`http://localhost:${context.server.port}`, {
        headers: {
          deviceId: mockDeviceId,
        },
      });
      expect(response.status).toBe(401);
    });
  });

  describe("When a user tries to connection without an auth token", () => {
    const context = startServerTest();

    it("disconnects the user", async () => {
      const client = new WebSocketClient();

      client.connect(`ws://localhost:${context.server.port}`);

      const actual = new Promise((resolve, reject) => {
        client.on("connect", resolve);
        client.on("connectFailed", reject);
      });

      await actual;
      expect(connectedUsersList.count()).toBe(0);
    });
  });

  describe("When a user tries to connection with an invalid auth token", () => {
    const context = startServerTest();

    it("disconnects the user", async () => {
      const client = new WebSocketClient();

      client.connect(
        `ws://localhost:${context.server.port}/?authToken=bad-auth-token`
      );

      const actual = new Promise((resolve, reject) => {
        client.on("connect", resolve);
        client.on("connectFailed", reject);
      });

      await actual;
      expect(connectedUsersList.count()).toBe(0);
    });
  });

  describe("When the device id is not given in the headers when making rest requests", () => {
    const context = startServerTest();

    it("reponsed with a 403 error ", async () => {
      const response = await fetch(
        `http://localhost:${context.server.port}/room`,
        {
          method: "POST",
          headers: {
            authToken: environment.serverAuthToken,
          },
        }
      );

      expect(response.status).toBe(403);
    });
  });
});
