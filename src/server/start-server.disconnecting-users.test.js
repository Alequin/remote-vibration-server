const truncateDatabaseTables = require("../../script/truncate-database-tables");

const { w3cwebsocket } = require("websocket");
const { default: waitFor } = require("wait-for-expect");
const connectedUsers = require("../websocket/connected-users");
const rooms = require("../persistance/rooms");
const messageTypes = require("../websocket/on-user-start-connection/message-types");
const { noop } = require("lodash");
const { serverAuthToken } = require("../environment");
const { connectedUsersList } = require("../websocket/connected-users");
const { startServerTest } = require("./test-utils");
const { seconds } = require("../to-milliseconds");

waitFor.defaults.timeout = 15000;
waitFor.defaults.interval = 1000;

const EXPECTED_CLIENT_TIMEOUT_TIME = seconds(120);

describe("startServer", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await truncateDatabaseTables();
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
      await waitFor(
        () => {
          expect(removeUserSpy).toHaveBeenCalledTimes(1);
        },
        { timeout: 60_000, interval: 1_000 }
      );
    }, 60_000);
  });

  describe("When the user sends regular heartbeat messages", () => {
    const context = startServerTest();

    it("does not disconnect the user", async () => {
      // Do nothing to fake the user not receiving the pong from the client
      // Pong is deprectaed and should be removed once old versions of the app do not need it
      jest
        .spyOn(connectedUsers, "markUserAsHavingReceivePong")
        .mockImplementationOnce(noop);

      const mockRoomOwnerId = "123";
      const testRoom = await rooms.createRoom(mockRoomOwnerId);

      const client = new w3cwebsocket(
        `ws://localhost:${context.server.port}/?authToken=${serverAuthToken}`
      );

      // 1. Connect to a room
      await new Promise((resolve) => {
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

      // 2. Send multiple heartbeat message to maintain the connection for longer than expected timeout time
      // Stop sending after expected timeout time
      await new Promise((resolve) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
          JSON.stringify({
            type: messageTypes.receivedHeartbeat,
          });

          const hasTimoutTimePassed =
            Date.now() - startTime > EXPECTED_CLIENT_TIMEOUT_TIME;
          if (!hasTimoutTimePassed) return;

          clearInterval(interval);
          resolve();
        }, 30_000);
      });

      // 3. Assert the user is has not been disconnected recognized as disconnected
      expect(connectedUsersList.count()).toBe(1);

      // 4. Assert the user is still in the room
      expect((await rooms.findRoomById(testRoom.id)).users_in_room.length).toBe(
        1
      );
    }, 180_000);
  });

  describe("When the user does not send a heartbeat often enough and does not return a 'pong' when the server sends a ping", () => {
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

      // 1. Connect to a room but dont send any heartbeat messages
      await new Promise((resolve) => {
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

      // 2. Assert the user is recognized as disconnected
      await waitFor(
        () => {
          expect(removeUserSpy).toHaveBeenCalledTimes(1);
          expect(connectedUsersList.count()).toBe(0);
        },
        {
          timeout: 150_000,
          interval: 1_000,
        }
      );

      // 3. Assert the user is no longer in the testRoom
      await waitFor(async () => {
        expect((await rooms.findRoomById(testRoom.id)).users_in_room).toEqual(
          []
        );
      });
    }, 180_000);
  });
});
