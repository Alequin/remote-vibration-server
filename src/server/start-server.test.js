const fetch = require("node-fetch");
var { client: WebSocketClient, w3cwebsocket } = require("websocket");
const { default: waitFor } = require("wait-for-expect");
const connectedUsers = require("../websocket/connected-users");
const startServer = require("./start-server");
const rooms = require("../persistance/rooms");
const { connectedUsersList } = require("../websocket/connected-users");

waitFor.defaults.timeout = 15000;
waitFor.defaults.interval = 1000;

describe("startServer", () => {
  const testPort = 3001;
  let server = null;
  beforeEach(async () => {
    jest.clearAllMocks();
    server = await startServer({ port: testPort });
  });
  afterEach(async () => {
    await server.closeServers();
  });

  it("can make a request to the health endpoint", async () => {
    const response = await fetch(`http://localhost:${testPort}/health`);
    expect(await response.text()).toBe("OK");
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

  it("stops tracking users on the server when the client closes the connection", async () => {
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

  it("allows a user to create a room", async () => {
    const response = await fetch(`http://localhost:${testPort}/room`, {
      method: "post",
    });
    const responseJson = await response.json();

    // Assert response contains the created room id
    expect(responseJson).toHaveProperty("newRoomId");
    const uuidRegex = /........-....-....-....-............/;
    expect(responseJson.newRoomId).toMatch(uuidRegex);

    // Assert a room has been created
    expect(rooms.findRoomById(responseJson.newRoomId)).toEqual({
      id: responseJson.newRoomId,
      usersIds: [],
    });
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
    const testRoom = rooms.createRoom();

    const client = new WebSocketClient();

    const connectToRoomAndSendMessage = new Promise((resolve, reject) => {
      client.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: "connectToRoom",
            data: { roomId: testRoom.id },
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
      expect(rooms.findRoomById(testRoom.id).usersIds).toHaveLength(1);
    });
  });

  it("allows multiple users to connect to a room", async () => {
    const testRoom = rooms.createRoom();

    for (const client of [new WebSocketClient(), new WebSocketClient()]) {
      const connectToRoomAndSendMessage = new Promise((resolve, reject) => {
        client.on("connect", (connection) => {
          connection.send(
            JSON.stringify({
              type: "connectToRoom",
              data: { roomId: testRoom.id },
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
      expect(rooms.findRoomById(testRoom.id).usersIds).toHaveLength(2);
    });
  });

  it("allows a user who is connected to a room to send a message to other users in the same room", async (done) => {
    const testRoom = rooms.createRoom();

    const client1 = new WebSocketClient();

    const expectedMessage = "hello";

    // 1. Connect first user and wait for the message to arrive
    const connectToRoom1 = new Promise((resolve, reject) => {
      client1.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: "connectToRoom",
            data: { roomId: testRoom.id },
          }),
          resolve
        );

        connection.on("message", (message) => {
          // 4. Assert client1 receives client2's message
          expect(message.utf8Data).toBe(expectedMessage);
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
            type: "connectToRoom",
            data: { roomId: testRoom.id },
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
        type: "sendMessage",
        data: {
          message: expectedMessage,
        },
      })
    );
  });

  it("does not send message to users connected to other rooms", async (done) => {
    const testRoom = rooms.createRoom();
    const otherTestRoom = rooms.createRoom();

    const client1 = new WebSocketClient();

    const expectedMessage = "hello";

    // 1. Connect first user to 'testRoom' and wait for the message to arrive
    const connectToRoom1 = new Promise((resolve, reject) => {
      client1.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: "connectToRoom",
            data: { roomId: testRoom.id },
          }),
          resolve
        );

        connection.on("message", (message) => {
          // 5. Assert client1 receives client3's message
          expect(message.utf8Data).toBe(expectedMessage);
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
            type: "connectToRoom",
            data: { roomId: otherTestRoom.id },
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
            type: "connectToRoom",
            data: { roomId: testRoom.id },
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
        type: "sendMessage",
        data: {
          message: expectedMessage,
        },
      })
    );

    await waitFor(() => {
      // 6. Assert all the rooms have the expected number of users
      expect(rooms.findRoomById(testRoom.id).usersIds).toHaveLength(2);
      expect(rooms.findRoomById(otherTestRoom.id).usersIds).toHaveLength(1);
    });
  });

  it.todo(
    "returns an error if a user attempts to send a message to a room that does not exist"
  );
});
