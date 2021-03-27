jest.mock(
  "../websocket/check-if-clients-are-alive/check-alive-clients-interval",
  () => ({ checkAliveClientsInterval: () => 2000 })
);

jest.mock(
  "../websocket/check-if-rooms-are-abandoned/check-rooms-interval",
  () => ({ checkRoomsInterval: () => 2000 })
);

var { client: WebSocketClient, w3cwebsocket } = require("websocket");
const { default: waitFor } = require("wait-for-expect");
const startServer = require("./start-server");
const rooms = require("../persistance/rooms");
const { connectedUsersList } = require("../websocket/connected-users");
const messageTypes = require("../websocket/on-user-start-connection/message-types");
const { toUpper } = require("lodash");

waitFor.defaults.timeout = 15000;
waitFor.defaults.interval = 1000;

describe("startServer", () => {
  const testPort = 3002;
  let server = null;
  beforeEach(async () => {
    rooms.removeAllRooms();
    jest.clearAllMocks();
    server = await startServer({ port: testPort });
  });
  afterEach(async () => {
    await server.closeServers();
  });

  it("allows a user to connect to a room", async () => {
    const testRoom = rooms.createRoom("123");

    const client = new WebSocketClient();

    const connectToRoomAndSendMessage = new Promise((resolve, reject) => {
      client.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { roomKey: testRoom.key },
          }),
          resolve
        );
      });
      client.on("connectFailed", reject);
    });

    client.connect(`ws://localhost:${testPort}`);
    await connectToRoomAndSendMessage;

    await waitFor(() => {
      // Assert only the current user is connected at the time of the test
      expect(connectedUsersList.count()).toBe(1);

      // Assert the user has been added to the expected room
      expect(rooms.findRoomById(testRoom.id).userIds).toHaveLength(1);
    });
  });

  it("allows a user to connect to a room with a upper case version of the room key", async () => {
    const testRoom = rooms.createRoom("123");

    const client = new WebSocketClient();

    const connectToRoomAndSendMessage = new Promise((resolve, reject) => {
      client.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { roomKey: testRoom.key.toUpperCase() },
          }),
          resolve
        );
      });
      client.on("connectFailed", reject);
    });

    client.connect(`ws://localhost:${testPort}`);
    await connectToRoomAndSendMessage;

    await waitFor(() => {
      // Assert only the current user is connected at the time of the test
      expect(connectedUsersList.count()).toBe(1);

      // Assert the user has been added to the expected room
      expect(rooms.findRoomById(testRoom.id).userIds).toHaveLength(1);
    });
  });

  it("allows multiple users to connect to a room", async () => {
    const testRoom = rooms.createRoom("123");

    for (const client of [new WebSocketClient(), new WebSocketClient()]) {
      const connectToRoomAndSendMessage = new Promise((resolve, reject) => {
        client.on("connect", (connection) => {
          connection.send(
            JSON.stringify({
              type: messageTypes.connectToRoom,
              data: { roomKey: testRoom.key },
            }),
            resolve
          );
        });
        client.on("connectFailed", reject);
      });

      client.connect(`ws://localhost:${testPort}`);
      await connectToRoomAndSendMessage;
    }

    await waitFor(() => {
      // Assert only the 2 expected users are connected at the time of the test
      expect(connectedUsersList.count()).toBe(2);

      // Assert the two users have been added to the expected room
      expect(rooms.findRoomById(testRoom.id).userIds).toHaveLength(2);
    });
  });

  it("returns an error if a user attempts to connect to a room that does not exist", async () => {
    const client = new WebSocketClient();

    const connectToRoomAndSendMessage = new Promise((resolve, reject) => {
      client.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            // 1. Attempt to connect to a room with an invalid key
            data: { roomKey: "bad room key" },
          })
        );

        connection.on("message", (message) => {
          // 1. Assert an error message is returned
          expect(JSON.parse(message.utf8Data).error).toBe(
            "There is no room for the give key"
          );
          resolve();
        });
      });
      client.on("connectFailed", reject);
    });

    client.connect(`ws://localhost:${testPort}`);
    await connectToRoomAndSendMessage;
  });
});
