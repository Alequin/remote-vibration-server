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
const rooms = require("../persistance/rooms");
const { connectedUsersList } = require("../websocket/connected-users");
const messageTypes = require("../websocket/on-user-start-connection/message-types");
const truncateDatabaseTables = require("../../script/truncate-database-tables");
const { serverAuthToken } = require("../environment");
const database = require("../persistance/database");
const { startServerTest } = require("./test-utils");

waitFor.defaults.timeout = 15000;
waitFor.defaults.interval = 1000;

describe("startServer", () => {
  let server = null;
  let closeServerPromise = null;

  beforeEach(async () => {
    await closeServerPromise;

    await truncateDatabaseTables();
    jest.clearAllMocks();
  });

  describe("When a user tries to connect to a room", () => {
    const context = startServerTest();

    it("allows them to", async (done) => {
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

      client.connect(
        `ws://localhost:${context.server.port}/?authToken=${serverAuthToken}`
      );
      await connectToRoomAndSendMessage;
    });
  });

  describe("When a user tries to connect to a room but the key casing does not match", () => {
    const context = startServerTest();

    it("allows a user to connect, as the key ignores casing", async () => {
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

      client.connect(
        `ws://localhost:${context.server.port}/?authToken=${serverAuthToken}`
      );
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
  });

  describe("When multiple users try to connect to a room", () => {
    const context = startServerTest();

    it("allows them all to be connected", async () => {
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
          `ws://localhost:${context.server.port}/?authToken=${serverAuthToken}`
        );
        await connectToRoomAndSendMessage;
      }

      // Assert only the 2 expected users are connected at the time of the test
      expect(connectedUsersList.count()).toBe(2);

      // Assert the two users have been added to the expected room
      const usersInRoom = (await rooms.findRoomById(testRoom.id)).users_in_room;
      expect(usersInRoom).toHaveLength(2);
    });
  });

  describe("When a user tries to connect to a room that does not exist", () => {
    const context = startServerTest();

    it("returns an error", async () => {
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

      client.connect(
        `ws://localhost:${context.server.port}/?authToken=${serverAuthToken}`
      );
      await connectToRoomAndSendMessage;
    });
  });

  describe("When a user tries to connect to a room with an invalid key", () => {
    const context = startServerTest();

    it("returns an error", async () => {
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

      client.connect(
        `ws://localhost:${context.server.port}/?authToken=${serverAuthToken}`
      );
      await connectToRoomAndSendMessage;
    });
  });

  describe("When a user is connected to room 'A' and then tries to connect to room 'B'", () => {
    const context = startServerTest();

    it("removes a user from the original room 'A'", async (done) => {
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
      client.connect(
        `ws://localhost:${context.server.port}/?authToken=${serverAuthToken}`
      );
    });
  });

  describe("When a user is connected to any room and they disconnect from the server", () => {
    const context = startServerTest();

    it("removes them from all rooms", async () => {
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
        expect((await rooms.findRoomById(testRoom.id)).users_in_room).toEqual(
          []
        );
      });
    });
  });

  describe("When a room has been open for too long with no users", () => {
    startServerTest();

    it("removes the room", async () => {
      const testRoom = await rooms.createRoom("123");

      // The room should exist
      expect(await rooms.findRoomById(testRoom.id)).toBeDefined();

      // Set time to a period where it is considered abandoned
      await database.query(
        "UPDATE rooms SET last_active_date=NOW() - interval '1.1 hours'"
      );

      await waitFor(async () => {
        // After a period of time the room should be removed
        expect(await rooms.findRoomById(testRoom.id)).not.toBeDefined();
      });
    });
  });
});
