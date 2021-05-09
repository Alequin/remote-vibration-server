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
const truncateDatabaseTables = require("../../script/truncate-database-tables");
const { serverAuthToken } = require("../environment");
const database = require("../persistance/database");

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

          // 3. Assert a message is sent to confirm the room connection
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

    client.connect(`ws://localhost:${testPort}/?authToken=${serverAuthToken}`);
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

    client.connect(`ws://localhost:${testPort}/?authToken=${serverAuthToken}`);
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

      client.connect(
        `ws://localhost:${testPort}/?authToken=${serverAuthToken}`
      );
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

    client.connect(`ws://localhost:${testPort}/?authToken=${serverAuthToken}`);
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

    client.connect(`ws://localhost:${testPort}/?authToken=${serverAuthToken}`);
    await connectToRoomAndSendMessage;
  });

  it("removes a user from their currently connect room if they try to connect to a different room", async (done) => {
    const testRoom1 = await rooms.createRoom("123");
    const testRoom2 = await rooms.createRoom("345");

    const client = new WebSocketClient();

    client.on("connect", (connection) => {
      connection.on("message", async () => {
        const isUserInRoom1 =
          (await rooms.findRoomById(testRoom1.id)).users_in_room.length === 1;
        const isUserInRoom2 =
          (await rooms.findRoomById(testRoom2.id)).users_in_room.length === 1;

        if (isUserInRoom1) {
          // 1. Confirm user is not is room 2 when in room 1
          expect(isUserInRoom2).toBe(false);
          // 2. Connect to room 2
          connection.send(
            JSON.stringify({
              type: messageTypes.connectToRoom,
              data: { password: testRoom2.password },
            })
          );
        }

        if (isUserInRoom2) {
          // 3. Confirm user has been removed from room 1 after moving to room 2
          expect(isUserInRoom1).toBe(false);
          done();
        }
      });

      connection.send(
        JSON.stringify({
          type: messageTypes.connectToRoom,
          data: { password: testRoom1.password },
        })
      );
    });
    client.connect(`ws://localhost:${testPort}/?authToken=${serverAuthToken}`);
  });

  it("removes users who are disconnected from the server from any rooms", async () => {
    const mockRoomOwnerId = "123";
    const testRoom = await rooms.createRoom(mockRoomOwnerId);

    const client = new w3cwebsocket(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`
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

    await waitFor(async () => {
      // 1. Assert the user has connected to the room
      const users_in_room = (await rooms.findRoomById(testRoom.id))
        ?.users_in_room;

      expect(users_in_room.length).toBe(1);
    });

    // 2. close the clients connection
    const removeUserSpy = jest.spyOn(connectedUsersList, "removeUser");
    client.close();

    // 3. Assert the user is recognized as disconnected
    await waitFor(() => expect(removeUserSpy).toHaveBeenCalledTimes(1));

    // 4. Assert the user is no longer in the testRoom
    await waitFor(async () => {
      expect((await rooms.findRoomById(testRoom.id)).users_in_room).toEqual([]);
    });
  });

  it("removes room if it have been open for too long with no connected users", async () => {
    const testRoom = await rooms.createRoom("123");

    // The room should exist
    expect(await rooms.findRoomById(testRoom.id)).toBeDefined();

    // Set time to twice the required period to be considered abandoned
    await database.query(
      "UPDATE rooms SET last_active_date=NOW() - interval '35 minutes'"
    );

    await waitFor(async () => {
      // After a period of time the room should be removed
      expect(await rooms.findRoomById(testRoom.id)).not.toBeDefined();
    });
  });
});
