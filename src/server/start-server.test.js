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
const startServer = require("./start-server");
const rooms = require("../persistance/rooms");
const messageTypes = require("../websocket/on-user-start-connection/message-types");
const { noop } = require("lodash");
const environment = require("../environment");
const { serverAuthToken } = require("../environment");
const { connectedUsersList } = require("../websocket/connected-users");
const { minutes } = require("../to-milliseconds");

waitFor.defaults.timeout = 15000;
waitFor.defaults.interval = 1000;

describe("startServer", () => {
  const testPort = 3005;
  let server = null;
  const mockDeviceId = "012345678998765--123";

  beforeEach(async () => {
    await truncateDatabaseTables();

    jest.clearAllMocks();
    server = await startServer({ port: testPort });
  });
  afterEach(async () => {
    await server.closeServers();
  });

  it("can make a request to the health endpoint without a device id or auth token", async () => {
    const response = await fetch(`http://localhost:${testPort}/health`, {});
    expect(await response.text()).toBe(`{"status":"OK"}`);
  });

  it("can connect to the server using web sockets", async () => {
    const client = new WebSocketClient();

    const actual = new Promise((resolve, reject) => {
      client.on("connect", resolve);
      client.on("connectFailed", reject);
    });

    client.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      // TODO remove all use of headers in tests
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );

    // Asserts connection to server resolves
    await expect(actual).resolves.toBeDefined();
    expect(connectedUsersList.count()).toBe(1);
  });

  it("updates uses lastActive time when they send a message via the websocket", async () => {
    const client = new WebSocketClient();

    const connection = new Promise((resolve, reject) => {
      client.on("connect", (connection) => resolve(connection));
      client.on("connectFailed", reject);
    });

    client.connect(`ws://localhost:${testPort}/?authToken=${serverAuthToken}`);
    const resolvedConnection = await connection;

    // 1. Confirm only one user is connected
    expect(connectedUsersList.count()).toBe(1);

    // 2. get connected user id
    let userId = null;
    connectedUsersList.forEachUser((user) => (userId = user.id));

    // 3. get users last active time
    const initialLastActive = connectedUsersList.findUserById(userId)
      .lastActive;

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
      const updatedLastActive = connectedUsersList.findUserById(userId)
        .lastActive;

      // 6. Assert the last active time has updated
      expect(updatedLastActive.getTime()).toBeGreaterThan(
        initialLastActive.getTime()
      );
    });
  });

  it("errors if you do not provide an auth token", async () => {
    const response = await fetch(`http://localhost:${testPort}`, {
      headers: {
        deviceId: mockDeviceId,
      },
    });
    expect(response.status).toBe(401);
  });

  it("disconnects users when the client closes the connection", async () => {
    const client = new w3cwebsocket(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
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

  it("disconnects users if they try to connect but do not provide the auth token", async () => {
    const client = new WebSocketClient();

    client.connect(`ws://localhost:${testPort}`);

    const actual = new Promise((resolve, reject) => {
      client.on("connect", resolve);
      client.on("connectFailed", reject);
    });

    await actual;
    expect(connectedUsersList.count()).toBe(0);
  });

  it("disconnects users if they try to connect but do not provide an invalid auth token", async () => {
    const client = new WebSocketClient();

    client.connect(`ws://localhost:${testPort}/?authToken=bad-auth-token`);

    const actual = new Promise((resolve, reject) => {
      client.on("connect", resolve);
      client.on("connectFailed", reject);
    });

    await actual;
    expect(connectedUsersList.count()).toBe(0);
  });

  it("disconnects users which do not return a 'pong' when the server returns a ping", async () => {
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
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
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
      expect((await rooms.findRoomById(testRoom.id)).users_in_room).toEqual([]);
    });
  });

  it("disconnects users who have been idle for 10 minutes", async () => {
    const removeUserSpy = jest.spyOn(
      connectedUsers.connectedUsersList,
      "removeUser"
    );

    const client = new WebSocketClient();

    const connection = new Promise((resolve, reject) => {
      client.on("connect", (connection) => resolve(connection));
      client.on("connectFailed", reject);
    });

    client.connect(`ws://localhost:${testPort}/?authToken=${serverAuthToken}`);
    await connection;

    // 1. Confirm only one user is connected
    expect(connectedUsersList.count()).toBe(1);

    // 2. get connected user
    let testUser = null;
    connectedUsersList.forEachUser((user) => (testUser = user));

    // 3. fake user being inactive for 10 minutes
    testUser.lastActive = new Date(Date.now() - connectedUsers.userMaxIdleTime);

    // 4. assert use has being disconnected
    await waitFor(() => {
      expect(removeUserSpy).toHaveBeenCalledTimes(1);
      expect(connectedUsersList.count()).toBe(0);
    });
  });

  it("errors if a device id is not given in the headers when making rest requests", async () => {
    const response = await fetch(`http://localhost:${testPort}/room`, {
      method: "POST",
      headers: {
        authToken: environment.serverAuthToken,
      },
    });

    expect(response.status).toBe(403);
  });
});
