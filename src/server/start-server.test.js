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

  it("allows a user to create a room", async () => {
    const response = await fetch(`http://localhost:${testPort}/room`, {
      method: "POST",
      headers: {
        deviceId: "123",
      },
    });

    const responseJson = await response.json();

    // Assert response contains the room key
    expect(responseJson.roomKey).toHaveLength(6);
    expect(responseJson.roomKey).toMatch(/\w*/);

    // Assert a room has been created
    const createdRoom = rooms.findRoomByKey(responseJson.roomKey);

    expect(createdRoom.id).toBeDefined();
    expect(createdRoom.key).toBe(responseJson.roomKey);
    expect(createdRoom.userIds).toEqual([]);
    expect(createdRoom.creatorDeviceId).toEqual("123");
  });

  it("does not create a new room if the user has a room associated with their device id", async () => {
    const deviceId = "123";
    const testRoom = rooms.createRoom(deviceId);

    const response = await fetch(`http://localhost:${testPort}/room`, {
      method: "POST",
      headers: {
        deviceId,
      },
    });

    const responseJson = await response.json();

    // Returned room key should match the test rooms key
    expect(responseJson.roomKey).toBe(testRoom.key);
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

  it("allows a user who is connected to a room to send a message to other users in the same room", async (done) => {
    const testRoom = rooms.createRoom("123");

    const client1 = new WebSocketClient();

    const expectedMessage = "hello";

    // 1. Connect first user and wait for the message to arrive
    const connectToRoom1 = new Promise((resolve, reject) => {
      client1.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { roomKey: testRoom.key },
          }),
          resolve
        );

        connection.on("message", (message) => {
          // 4. Assert client1 receives client2's message
          expect(JSON.parse(message.utf8Data).text).toBe(expectedMessage);
          done();
        });
      });
      client1.on("connectFailed", reject);
    });

    client1.connect(`ws://localhost:${testPort}`);
    await connectToRoom1;

    const client2 = new WebSocketClient();

    // 2. Connect second user
    let client2Connection = null;
    const connectToRoomAndSendMessage2 = new Promise((resolve, reject) => {
      client2.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { roomKey: testRoom.key },
          }),
          resolve
        );
        client2Connection = connection;
      });
      client2.on("connectFailed", reject);
    });

    client2.connect(`ws://localhost:${testPort}`);
    await connectToRoomAndSendMessage2;

    // 3. Send a message to the room from second user
    client2Connection.send(
      JSON.stringify({
        type: messageTypes.sendMessage,
        data: {
          text: expectedMessage,
        },
      })
    );
  });

  it("does not send message to users connected to other rooms", async (done) => {
    const testRoom = rooms.createRoom("123");
    const otherTestRoom = rooms.createRoom("123");

    const client1 = new WebSocketClient();

    const expectedMessage = "hello";

    // 1. Connect first user to 'testRoom' and wait for the message to arrive
    const connectToRoom1 = new Promise((resolve, reject) => {
      client1.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { roomKey: testRoom.key },
          }),
          resolve
        );

        connection.on("message", (message) => {
          // 5. Assert client1 receives client3's message
          expect(JSON.parse(message.utf8Data).text).toBe(expectedMessage);
          done();
        });
      });
      client1.on("connectFailed", reject);
    });

    client1.connect(`ws://localhost:${testPort}`);
    await connectToRoom1;

    const client2 = new WebSocketClient();

    // 2. Connect second user to 'otherTestRoom' and wait for a message that will not arrive
    const connectToRoom2 = new Promise((resolve, reject) => {
      client2.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { roomKey: otherTestRoom.key },
          }),
          resolve
        );
        connection.on("message", (message) => {
          throw Error(
            `Client 2 should not get a message but received ${message}`
          );
        });
      });
      client2.on("connectFailed", reject);
    });

    client2.connect(`ws://localhost:${testPort}`);
    await connectToRoom2;

    const client3 = new WebSocketClient();
    let client3Connection = null;
    // 3. Connect third user to 'testRoom' and send a message
    const connectToRoomAndSendMessage3 = new Promise((resolve, reject) => {
      client3.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { roomKey: testRoom.key },
          }),
          resolve
        );
        client3Connection = connection;
      });
      client3.on("connectFailed", reject);
    });

    client3.connect(`ws://localhost:${testPort}`);
    await connectToRoomAndSendMessage3;

    // 4. Send a message to the room from third user
    client3Connection.send(
      JSON.stringify({
        type: messageTypes.sendMessage,
        data: {
          text: expectedMessage,
        },
      })
    );

    await waitFor(() => {
      // 6. Assert all the rooms have the expected number of users
      expect(rooms.findRoomById(testRoom.id).userIds).toHaveLength(2);
      expect(rooms.findRoomById(otherTestRoom.id).userIds).toHaveLength(1);
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

  it("allows a user who is connected to a room to send a vibration pattern to other users in the same room", async (done) => {
    const mockVibrationPatternObject = { pattern: [] };

    const testRoom = rooms.createRoom("123");

    const client1 = new WebSocketClient();

    // 1. Connect first user and wait for the message to arrive
    const connectToRoom1 = new Promise((resolve, reject) => {
      client1.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { roomKey: testRoom.key },
          }),
          resolve
        );

        connection.on("message", (message) => {
          // 4. Assert client1 receives client2's vibration pattern
          expect(JSON.parse(message.utf8Data)).toEqual({
            type: messageTypes.receivedVibrationPattern,
            vibrationPattern: mockVibrationPatternObject,
          });
          done();
        });
      });
      client1.on("connectFailed", reject);
    });

    client1.connect(`ws://localhost:${testPort}`);
    await connectToRoom1;

    const client2 = new WebSocketClient();

    // 2. Connect second user
    let client2Connection = null;
    const connectToRoomAndSendMessage2 = new Promise((resolve, reject) => {
      client2.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { roomKey: testRoom.key },
          }),
          resolve
        );
        client2Connection = connection;
      });
      client2.on("connectFailed", reject);
    });

    client2.connect(`ws://localhost:${testPort}`);
    await connectToRoomAndSendMessage2;

    // 3. Send a vibration pattern to the room from second user
    client2Connection.send(
      JSON.stringify({
        type: messageTypes.sendVibrationPattern,
        data: {
          vibrationPattern: mockVibrationPatternObject,
        },
      })
    );
  });

  it("returns a message to the current user when a vibration is sent to confirm it have been received", async (done) => {
    const mockVibrationPatternObject = { pattern: [] };

    const testRoom = rooms.createRoom("123");

    const client = new WebSocketClient();

    // 1. Connect  user
    let clientConnection = null;
    const connectToRoomAndSendMessage2 = new Promise((resolve, reject) => {
      client.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { roomKey: testRoom.key },
          }),
          resolve
        );
        clientConnection = connection;
      });
      client.on("connectFailed", reject);
    });

    client.connect(`ws://localhost:${testPort}`);
    await connectToRoomAndSendMessage2;

    clientConnection.on("message", (message) => {
      // 3. Assert a confirmation message was received after sending the vibration
      const parsedMessage = JSON.parse(message.utf8Data);
      expect(parsedMessage.type).toBe(messageTypes.confirmVibrationPatternSent);
      done();
    });

    // 2. Send a vibration pattern to the room
    clientConnection.send(
      JSON.stringify({
        type: messageTypes.sendVibrationPattern,
        data: {
          vibrationPattern: mockVibrationPatternObject,
        },
      })
    );
  });
});
