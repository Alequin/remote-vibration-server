jest.mock(
  "../websocket/check-if-clients-are-alive/check-alive-clients-interval",
  () => ({ checkAliveClientsInterval: () => 2000 })
);

jest.mock(
  "../websocket/check-if-rooms-are-abandoned/check-rooms-interval",
  () => ({ checkRoomsInterval: () => 2000 })
);

const fetch = require("node-fetch");
var { client: WebSocketClient, w3cwebsocket } = require("websocket");
const { default: waitFor } = require("wait-for-expect");
const connectedUsers = require("../websocket/connected-users");
const startServer = require("./start-server");
const rooms = require("../persistance/rooms");
const { connectedUsersList } = require("../websocket/connected-users");
const messageTypes = require("../websocket/on-user-start-connection/message-types");
const toMilliseconds = require("../to-milliseconds");

waitFor.defaults.timeout = 15000;
waitFor.defaults.interval = 1000;

describe("startServer", () => {
  const testPort = 3005;
  let server = null;
  beforeEach(async () => {
    rooms.removeAllRooms();
    jest.clearAllMocks();
    server = await startServer({ port: testPort });
  });
  afterEach(async () => {
    await server.closeServers();
  });

  it("can make a request to the health endpoint", async () => {
    const response = await fetch(`http://localhost:${testPort}/health`, {
      headers: {
        deviceId: "123",
      },
    });
    expect(await response.text()).toBe(
      `{"status":"OK","totalConnectionUsers":0,"totalOpenRooms":0}`
    );
  });

  it("can connect to the server using web sockets", async () => {
    const client = new WebSocketClient();

    const actual = new Promise((resolve, reject) => {
      client.on("connect", resolve);
      client.on("connectFailed", reject);
    });

    client.connect(`ws://localhost:${testPort}`);

    // Asserts connection to server resolves
    await expect(actual).resolves.toBeDefined();
  });

  it("disconnects users when the client closes the connection", async () => {
    const client = new w3cwebsocket(`ws://localhost:${testPort}`);

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

  it("removes users who are disconnected from the server from any rooms", async () => {
    const testRoom = rooms.createRoom("123");

    const client = new w3cwebsocket(`ws://localhost:${testPort}`);

    const clientConnection = new Promise((resolve) => {
      client.onopen = () => {
        client.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { roomKey: testRoom.key },
          })
        );
        resolve();
      };
    });
    await clientConnection;

    await waitFor(() =>
      // 1. Assert the user has connected to the room
      expect(rooms.findRoomById(testRoom.id).userIds).toHaveLength(1)
    );

    // 2. close the clients connection
    const removeUserSpy = jest.spyOn(
      connectedUsers.connectedUsersList,
      "removeUser"
    );
    client.close();

    // 3. Assert the user is recognized as disconnected
    await waitFor(() => expect(removeUserSpy).toHaveBeenCalledTimes(1));

    // 4. Assert the user is no longer in the testRoom
    await waitFor(() =>
      expect(rooms.findRoomById(testRoom.id).userIds).toHaveLength(0)
    );
  });

  it("removes room if it have been open for too long with no connected users", async () => {
    const testRoom = rooms.createRoom("123");

    // The room should exist
    expect(rooms.findRoomById(testRoom.id)).toBeDefined();

    // Set time to twice the required period to be considered abandoned
    testRoom.lastValidCheckTime = new Date(
      Date.now() - toMilliseconds.minutes(60)
    );

    await waitFor(() =>
      // After a period of time the room should be removed
      expect(rooms.findRoomById(testRoom.id)).not.toBeDefined()
    );
  });

  it("errors if a device id is not given in the headers when making rest requests", async () => {
    const response = await fetch(`http://localhost:${testPort}/room`, {
      method: "POST",
    });

    expect(response.status).toBe(403);
  });

  it("returns an error message if an unknown message type is sent", async () => {
    const client = new WebSocketClient();

    const connectToRoomAndSendMessage = new Promise((resolve) => {
      client.on("connect", (connection) => {
        connection.send(
          // Send a message with a bad type to the server
          JSON.stringify({
            type: "bad message type",
          })
        );

        connection.on("message", (message) => {
          const parsedMessage = JSON.parse(message.utf8Data);
          // Asserts an error message was returned
          expect(parsedMessage.error).toBe("unknown message type");
          resolve();
        });
      });

      client.on("connectFailed", () => {
        console.log("connectFailed");
      });
    });

    client.connect(`ws://localhost:${testPort}`);
    await connectToRoomAndSendMessage;
  });
});
