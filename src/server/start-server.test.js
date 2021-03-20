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
    expect(responseJson.newRoomId).toMatch(
      /........-....-....-....-............/
    );

    // Assert a room has been created
    expect(rooms.findRoom(responseJson.newRoomId)).toEqual({
      id: responseJson.newRoomId,
      users: [],
    });
  });

  it("returns an error message if an unknown message type is sent", async () => {
    const client = new WebSocketClient();

    const sendConnectToRoomMessage = new Promise((resolve) => {
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
    await sendConnectToRoomMessage;
  });

  it("allows a user to connect to a room", async () => {
    const testRoom = rooms.createRoom();

    const client = new WebSocketClient();

    const sendConnectToRoomMessage = new Promise((resolve, reject) => {
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
    await sendConnectToRoomMessage;

    await waitFor(() => {
      // Assert only the current user is connected at the time of the test
      expect(connectedUsersList.count()).toBe(1);

      // Assert the user has been added to the expected room
      expect(rooms.findRoom(testRoom.id).users).toHaveLength(1);
    });
  });
});
