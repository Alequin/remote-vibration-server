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
const messageTypes = require("../websocket/on-user-start-connection/message-types");

waitFor.defaults.timeout = 15000;
waitFor.defaults.interval = 1000;

describe("startServer", () => {
  const testPort = 3004;
  let server = null;
  beforeEach(async () => {
    rooms.removeAllRooms();
    jest.clearAllMocks();
    server = await startServer({ port: testPort });
  });
  afterEach(async () => {
    await server.closeServers();
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

  it("does not send a message to users connected to other rooms", async (done) => {
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
});
