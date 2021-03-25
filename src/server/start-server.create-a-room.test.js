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
  const testPort = 3003;
  let server = null;
  beforeEach(async () => {
    rooms.removeAllRooms();
    jest.clearAllMocks();
    server = await startServer({ port: testPort });
  });
  afterEach(async () => {
    await server.closeServers();
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
});
