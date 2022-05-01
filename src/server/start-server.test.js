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

  describe("When the client closes the connection", () => {
    const context = startServerTest();

    it("disconnects users when the client closes the connection", async () => {
      const client = new w3cwebsocket(
        `ws://localhost:${context.server.port}/?authToken=${serverAuthToken}`
      );

      const clientConnection = new Promise((resolve) => {
        client.onopen = resolve;
      });

      await clientConnection;

      const removeUserSpy = jest.spyOn(
        connectedUsers.connectedUsersList,
        "removeUser"
      );
      client.close();

      // Assert the user is recognized as disconnected
      await waitFor(() => {
        expect(removeUserSpy).toHaveBeenCalledTimes(1);
      });
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

  describe("When the user does not return a 'pong' when the server returns a ping", () => {
    const context = startServerTest();

    it("disconnects the user", async () => {
      // Do nothing to fake the user not receiving the pong from the client
      jest
        .spyOn(connectedUsers, "markUserAsHavingReceivePong")
        .mockImplementationOnce(noop);

      const removeUserSpy = jest.spyOn(
        connectedUsers.connectedUsersList,
        "removeUser"
      );

      const mockRoomOwnerId = "123";
      const testRoom = await rooms.createRoom(mockRoomOwnerId);

      const client = new w3cwebsocket(
        `ws://localhost:${context.server.port}/?authToken=${serverAuthToken}`
      );
      const clientConnection = new Promise((resolve) => {
        client.onopen = () => {
          client.send(
            JSON.stringify({
              type: messageTypes.connectToRoom,
              data: { password: testRoom.password },
            })
          );
        };

        client.onmessage = (message) => {
          const parsedMessage = JSON.parse(message.data);
          if (parsedMessage.type === messageTypes.confirmRoomConnection) {
            expect(parsedMessage.type === messageTypes.confirmRoomConnection);
            resolve();
          }
        };
      });
      await clientConnection;

      // 1. Assert the user is recognized as disconnected
      await waitFor(() => expect(removeUserSpy).toHaveBeenCalledTimes(1));
      expect(connectedUsersList.count()).toBe(0);

      // 2. Assert the user is no longer in the testRoom
      await waitFor(async () => {
        expect((await rooms.findRoomById(testRoom.id)).users_in_room).toEqual(
          []
        );
      });
    });
  });

  describe("When the user has been idle for more than 10 minutes", () => {
    const context = startServerTest();

    it("disconnects the user", async () => {
      const removeUserSpy = jest.spyOn(
        connectedUsers.connectedUsersList,
        "removeUser"
      );

      const client = new WebSocketClient();

      const connection = new Promise((resolve, reject) => {
        client.on("connect", (connection) => resolve(connection));
        client.on("connectFailed", reject);
      });

      client.connect(
        `ws://localhost:${context.server.port}/?authToken=${serverAuthToken}`
      );
      await connection;

      // 1. Confirm only one user is connected
      expect(connectedUsersList.count()).toBe(1);

      // 2. get connected user
      let testUser = null;
      connectedUsersList.forEachUser((user) => (testUser = user));

      // 3. fake user being inactive for 10 minutes
      testUser.lastActive = new Date(
        Date.now() - connectedUsers.userMaxIdleTime
      );

      // 4. assert use has being disconnected
      await waitFor(() => {
        expect(removeUserSpy).toHaveBeenCalledTimes(1);
        expect(connectedUsersList.count()).toBe(0);
      });
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
