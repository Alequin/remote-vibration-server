jest.mock(
  "../websocket/check-if-clients-are-alive/check-alive-clients-interval",
  () => ({ checkAliveClientsInterval: () => 2000 })
);

jest.mock(
  "../websocket/check-if-rooms-are-abandoned/check-rooms-interval",
  () => ({ checkRoomsInterval: () => 2000 })
);

var { client: WebSocketClient } = require("websocket");
const { default: waitFor } = require("wait-for-expect");
const startServer = require("./start-server");
const rooms = require("../persistance/rooms");
const { connectedUsersList } = require("../websocket/connected-users");
const messageTypes = require("../websocket/on-user-start-connection/message-types");
const dropDatabase = require("../../script/drop-database");
const createDatabase = require("../../script/create-database");
const truncateDatabaseTables = require("../../script/truncate-database-tables");

waitFor.defaults.timeout = 15000;
waitFor.defaults.interval = 1000;

describe("startServer", () => {
  const testPort = 3002;
  let server = null;

  beforeEach(async () => {
    await truncateDatabaseTables();

    jest.clearAllMocks();
    server = await startServer({ port: testPort });
  });
  afterEach(async () => {
    await server.closeServers();
  });

  it("allows a user to connect to a room", async (done) => {
    const testRoom = await rooms.createRoom("123");

    const client = new WebSocketClient();

    const connectToRoomAndSendMessage = new Promise((resolve, reject) => {
      client.on("connect", (connection) => {
        connection.on("message", async (message) => {
          // 1. Assert only the current user is connected at the time of the test
          expect(connectedUsersList.count()).toBe(1);

          // 2. Assert the user has been added to the expected room
          expect(
            (await rooms.findRoomById(testRoom.id)).users_in_room
          ).toHaveLength(1);

          // 3. Assert an message is sent to confirm the room connection
          expect(JSON.parse(message.utf8Data).type).toBe(
            messageTypes.confirmRoomConnection
          );
          done();
        });

        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { password: testRoom.password },
          }),
          resolve
        );
      });
      client.on("connectFailed", reject);
    });

    client.connect(`ws://localhost:${testPort}`);
    await connectToRoomAndSendMessage;
  });

  it("allows a user to connect to a room with a upper case version of the room key", async () => {
    const testRoom = await rooms.createRoom("123");

    const client = new WebSocketClient();

    const connectToRoomAndSendMessage = new Promise((resolve, reject) => {
      client.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { password: testRoom.password.toUpperCase() },
          })
        );

        connection.on("message", () => {
          resolve();
        });
      });
      client.on("connectFailed", reject);
    });

    client.connect(`ws://localhost:${testPort}`);
    await connectToRoomAndSendMessage;

    await waitFor(async () => {
      // Assert only the current user is connected at the time of the test
      expect(connectedUsersList.count()).toBe(1);

      // Assert the user has been added to the expected room
      expect(
        (await rooms.findRoomById(testRoom.id)).users_in_room
      ).toHaveLength(1);
    });
  });

  it("allows multiple users to connect to a room", async () => {
    const testRoom = await rooms.createRoom("123");

    for (const client of [new WebSocketClient(), new WebSocketClient()]) {
      const connectToRoomAndSendMessage = new Promise((resolve, reject) => {
        client.on("connect", (connection) => {
          connection.send(
            JSON.stringify({
              type: messageTypes.connectToRoom,
              data: { password: testRoom.password },
            })
          );

          connection.on("message", () => {
            resolve();
          });
        });

        client.on("connectFailed", reject);
      });

      client.connect(`ws://localhost:${testPort}`);
      await connectToRoomAndSendMessage;
    }

    // Assert only the 2 expected users are connected at the time of the test
    expect(connectedUsersList.count()).toBe(2);

    // Assert the two users have been added to the expected room
    const usersInRoom = (await rooms.findRoomById(testRoom.id)).users_in_room;
    expect(usersInRoom).toHaveLength(2);
  });

  it("returns an error if a user attempts to connect to a room that does not exist", async () => {
    const client = new WebSocketClient();

    const connectToRoomAndSendMessage = new Promise((resolve, reject) => {
      client.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            // 1. Attempt to connect to a room with an invalid key
            data: { password: "wrong password" },
          })
        );

        connection.on("message", (message) => {
          // 1. Assert an error message is returned
          expect(JSON.parse(message.utf8Data).error).toBe(
            "password does not exist"
          );
          resolve();
        });
      });
      client.on("connectFailed", reject);
    });

    client.connect(`ws://localhost:${testPort}`);
    await connectToRoomAndSendMessage;
  });

  it("returns an error if an invalid password is provided", async () => {
    const client = new WebSocketClient();

    const connectToRoomAndSendMessage = new Promise((resolve, reject) => {
      client.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            // 1. Attempt to connect to a room with an invalid key
            data: { password: "123 456" },
          })
        );

        connection.on("message", (message) => {
          // 1. Assert an error message is returned
          expect(JSON.parse(message.utf8Data).error).toBe(
            "password is invalid"
          );
          resolve();
        });
      });
      client.on("connectFailed", reject);
    });

    client.connect(`ws://localhost:${testPort}`);
    await connectToRoomAndSendMessage;
  });

  it.todo(
    "removes a user from their currently connect room if they try to connect to a different room"
  );
});
