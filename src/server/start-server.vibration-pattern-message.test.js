jest.mock(
  "../websocket/check-if-clients-are-alive/check-alive-clients-interval",
  () => ({ checkAliveClientsInterval: () => 2000 })
);

var { client: WebSocketClient } = require("websocket");
const { default: waitFor } = require("wait-for-expect");
const startServer = require("./start-server");
const rooms = require("../persistance/rooms");
const messageTypes = require("../websocket/on-user-start-connection/message-types");
const dropDatabase = require("../../script/drop-database");
const createDatabase = require("../../script/create-database");
const truncateDatabaseTables = require("../../script/truncate-database-tables");
const database = require("../persistance/database");
const messageHandlers = require("../websocket/on-user-start-connection/message-handlers");
const { serverAuthToken } = require("../environment");

waitFor.defaults.timeout = 15000;
waitFor.defaults.interval = 1000;

describe("startServer", () => {
  const testPort = 3006;
  let server = null;

  beforeEach(async () => {
    await truncateDatabaseTables();

    jest.clearAllMocks();
    server = await startServer({ port: testPort });
  });
  afterEach(async () => {
    await server.closeServers();
  });

  it("allows a user who is connected to a room to send a vibration pattern to other users in the same room", async (done) => {
    const mockVibrationPatternObject = { pattern: [] };

    const testRoom = await rooms.createRoom("123");

    const client1 = new WebSocketClient();

    // 1. Connect first user and wait for the message to arrive
    const connectToRoom1 = new Promise((resolve, reject) => {
      client1.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { password: testRoom.password },
          }),
          resolve
        );

        connection.on("message", (message) => {
          const parsedMessage = JSON.parse(message.utf8Data);

          // 2. Confirm room connection
          if (parsedMessage.type === messageTypes.confirmRoomConnection) {
            expect(parsedMessage).toEqual({
              type: messageTypes.confirmRoomConnection,
            });
          }

          // 5. Assert client1 receives client2's vibration pattern
          if (parsedMessage.type === messageTypes.receivedVibrationPattern) {
            expect(parsedMessage).toEqual({
              type: messageTypes.receivedVibrationPattern,
              data: {
                vibrationPattern: mockVibrationPatternObject,
                speed: 1,
              },
            });
            done();
          }
        });
      });
      client1.on("connectFailed", reject);
    });

    client1.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );
    await connectToRoom1;

    const client2 = new WebSocketClient();

    // 3. Connect second user
    let client2Connection = null;
    const connectToRoomAndSendMessage2 = new Promise((resolve, reject) => {
      client2.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { password: testRoom.password },
          })
        );

        connection.on("message", (message) => {
          const parsedMessage = JSON.parse(message.utf8Data);
          if (parsedMessage.type === messageTypes.confirmRoomConnection) {
            resolve();
          }
        });

        client2Connection = connection;
      });
      client2.on("connectFailed", reject);
    });

    client2.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );
    await connectToRoomAndSendMessage2;

    // 4. Send a vibration pattern to the room from second user
    client2Connection.send(
      JSON.stringify({
        type: messageTypes.sendVibrationPattern,
        data: {
          vibrationPattern: mockVibrationPatternObject,
          speed: 1,
        },
      })
    );
  });

  it("Once vibration patterns have been sent all message will be removed from the database", async (done) => {
    const mockVibrationPatternObject = { pattern: [] };

    const testRoom = await rooms.createRoom("123");

    const client1 = new WebSocketClient();

    // 1. Connect first user and wait for the message to arrive
    const connectToRoom1 = new Promise((resolve, reject) => {
      client1.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { password: testRoom.password },
          }),
          resolve
        );

        connection.on("message", async (message) => {
          const parsedMessage = JSON.parse(message.utf8Data);

          // 4. Assert client1 receives client2's vibration pattern
          if (parsedMessage.type === messageTypes.receivedVibrationPattern) {
            await waitFor(
              async () =>
                expect(await database.query("SELECT * FROM messages")).toEqual(
                  []
                ),
              { interval: 500 }
            );
            done();
          }
        });
      });
      client1.on("connectFailed", reject);
    });

    client1.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );
    await connectToRoom1;

    const client2 = new WebSocketClient();

    // 2. Connect second user
    let client2Connection = null;
    const connectToRoomAndSendMessage2 = new Promise((resolve, reject) => {
      client2.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { password: testRoom.password },
          })
        );

        connection.on("message", (message) => {
          const parsedMessage = JSON.parse(message.utf8Data);
          if (parsedMessage.type === messageTypes.confirmRoomConnection) {
            resolve();
          }
        });

        client2Connection = connection;
      });
      client2.on("connectFailed", reject);
    });

    client2.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );
    await connectToRoomAndSendMessage2;

    // 3. Send a vibration pattern to the room from second user
    client2Connection.send(
      JSON.stringify({
        type: messageTypes.sendVibrationPattern,
        data: {
          vibrationPattern: mockVibrationPatternObject,
          speed: 1,
        },
      })
    );
  });

  it("does not send a vibrationPattern message to users connected to other rooms", async (done) => {
    const mockVibrationPatternObject = { pattern: [] };

    const testRoom = await rooms.createRoom("123");
    const otherTestRoom = await rooms.createRoom("123");

    const client1 = new WebSocketClient();

    // 1. Connect first user to 'testRoom' and wait for the message to arrive
    const connectToRoom1 = new Promise((resolve, reject) => {
      client1.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { password: testRoom.password },
          })
        );

        connection.on("message", (message) => {
          const parsedMessage = JSON.parse(message.utf8Data);

          // 2. Confirm room connection
          if (parsedMessage.type === messageTypes.confirmRoomConnection) {
            expect(parsedMessage).toEqual({
              type: messageTypes.confirmRoomConnection,
            });
            resolve();
          }

          // 7. Assert client1 receives client3's message
          if (parsedMessage.type === messageTypes.receivedVibrationPattern) {
            expect(parsedMessage).toEqual({
              type: messageTypes.receivedVibrationPattern,
              data: {
                vibrationPattern: mockVibrationPatternObject,
                speed: 1,
              },
            });
            done();
          }
        });
      });
      client1.on("connectFailed", reject);
    });

    client1.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );
    await connectToRoom1;

    const client2 = new WebSocketClient();

    // 3. Connect second user to 'otherTestRoom'
    const connectToRoom2 = new Promise((resolve, reject) => {
      client2.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { password: otherTestRoom.password },
          })
        );
        connection.on("message", (message) => {
          const parsedMessage = JSON.parse(message.utf8Data);
          if (parsedMessage.type === messageTypes.confirmRoomConnection) {
            // 4. Confirm room connection
            expect(parsedMessage).toEqual({
              type: messageTypes.confirmRoomConnection,
            });
            resolve();
          } else {
            // Error if any other messages are received
            throw Error(
              `Client 2 should not get a message but received ${message.utf8Data}`
            );
          }
        });
      });
      client2.on("connectFailed", reject);
    });

    client2.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );
    await connectToRoom2;

    const client3 = new WebSocketClient();
    let client3Connection = null;
    // 5. Connect third user to 'testRoom' and send a message
    const connectToRoomAndSendMessage3 = new Promise((resolve, reject) => {
      client3.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { password: testRoom.password },
          })
        );

        connection.on("message", (message) => {
          const parsedMessage = JSON.parse(message.utf8Data);
          if (parsedMessage.type === messageTypes.confirmRoomConnection) {
            // 4. Confirm room connection
            expect(parsedMessage).toEqual({
              type: messageTypes.confirmRoomConnection,
            });
            resolve();
          } else if (
            parsedMessage.type === messageTypes.confirmVibrationPatternSent
          ) {
            expect(parsedMessage).toEqual({
              type: messageTypes.confirmVibrationPatternSent,
            });
          } else {
            // Error if any other messages are received
            throw Error(
              `Client 3 should not get a message but received ${message.utf8Data}`
            );
          }
        });

        client3Connection = connection;
      });
      client3.on("connectFailed", reject);
    });

    client3.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );
    await connectToRoomAndSendMessage3;

    // 6. Send a message to the room from third user
    client3Connection.send(
      JSON.stringify({
        type: messageTypes.sendVibrationPattern,
        data: {
          vibrationPattern: mockVibrationPatternObject,
          speed: 1,
        },
      })
    );

    await waitFor(async () => {
      // 8. Assert all the rooms have the expected number of users
      expect((await rooms.findRoomById(testRoom.id)).user_in_room).toHaveLength(
        2
      );
      expect(
        (await rooms.findRoomById(otherTestRoom.id)).user_in_room
      ).toHaveLength(1);
    });
  });

  it("sends the expected number of messages when there is a short delay between multiple messages", async () => {
    const mockVibrationPatternObject = { pattern: [] };

    const testRoom = await rooms.createRoom("123");

    const client1 = new WebSocketClient();
    let totalVibrationsPatternsReceived = 0;

    // 1. Connect first user and wait for the message to arrive
    const connectToRoom1 = new Promise((resolve, reject) => {
      client1.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { password: testRoom.password },
          }),
          resolve
        );

        connection.on("message", (message) => {
          const parsedMessage = JSON.parse(message.utf8Data);

          // 2. Confirm room connection
          if (parsedMessage.type === messageTypes.confirmRoomConnection) {
            expect(parsedMessage).toEqual({
              type: messageTypes.confirmRoomConnection,
            });
          }

          // 5. Assert client1 receives client2's vibration pattern
          if (parsedMessage.type === messageTypes.receivedVibrationPattern) {
            expect(parsedMessage).toEqual({
              type: messageTypes.receivedVibrationPattern,
              data: {
                vibrationPattern: mockVibrationPatternObject,
                speed: 1,
              },
            });
            totalVibrationsPatternsReceived++;
          }
        });
      });
      client1.on("connectFailed", reject);
    });

    client1.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );
    await connectToRoom1;

    const client2 = new WebSocketClient();

    // 3. Connect second user
    let client2Connection = null;
    const connectToRoomAndSendMessage2 = new Promise((resolve, reject) => {
      client2.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { password: testRoom.password },
          })
        );

        connection.on("message", (message) => {
          const parsedMessage = JSON.parse(message.utf8Data);
          if (parsedMessage.type === messageTypes.confirmRoomConnection) {
            resolve();
          }
        });

        client2Connection = connection;
      });
      client2.on("connectFailed", reject);
    });

    client2.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );
    await connectToRoomAndSendMessage2;

    // 4. Send multiple vibration patterns to the room from second user
    const expectedNumberOfMessages = 200;
    for (const _ in new Array(expectedNumberOfMessages).fill(null)) {
      client2Connection.send(
        JSON.stringify({
          type: messageTypes.sendVibrationPattern,
          data: {
            vibrationPattern: mockVibrationPatternObject,
            speed: 1,
          },
        })
      );
      await new Promise((r) => setTimeout(r, 5));
    }

    await waitFor(async () => {
      expect(totalVibrationsPatternsReceived).toEqual(expectedNumberOfMessages);
    });
  });

  it("errors when sending a 'receivedVibrationPattern' message and the data property has unexpected props", async (done) => {
    const mockVibrationPatternObject = { pattern: [] };

    const testRoom = await rooms.createRoom("123");

    const client = new WebSocketClient();
    // 1. Connect second user
    let clientConnection = null;
    const connectToRoomAndSendMessage2 = new Promise((resolve, reject) => {
      client.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { password: testRoom.password },
          }),
          resolve
        );
        clientConnection = connection;
      });
      client.on("connectFailed", reject);
    });

    client.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );
    await connectToRoomAndSendMessage2;

    clientConnection.on("message", (message) => {
      const parsedMessage = JSON.parse(message.utf8Data);

      // 2. Confirm room connection
      if (parsedMessage.type === messageTypes.confirmRoomConnection) {
        expect(parsedMessage).toEqual({
          type: messageTypes.confirmRoomConnection,
        });
      }

      // 4. Assert an error message is returned to the client
      if (parsedMessage.error) {
        expect(JSON.parse(message.utf8Data)).toEqual({
          error: "sendVibrationPattern: Invalid properties provided",
        });
        done();
      }
    });

    // 3. Send a vibration pattern but include some bad data
    clientConnection.send(
      JSON.stringify({
        type: messageTypes.sendVibrationPattern,
        data: {
          vibrationPattern: mockVibrationPatternObject,
          speed: 1,
          notAProp: true,
        },
      })
    );
  });

  it("errors when sending a 'receivedVibrationPattern' message and the data property is missing the prop 'vibrationPattern'", async (done) => {
    const testRoom = await rooms.createRoom("123");

    const client2 = new WebSocketClient();
    // 1. Connect second user
    let client2Connection = null;
    const connectToRoomAndSendMessage2 = new Promise((resolve, reject) => {
      client2.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { password: testRoom.password },
          }),
          resolve
        );
        client2Connection = connection;
      });
      client2.on("connectFailed", reject);
    });

    client2.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );
    await connectToRoomAndSendMessage2;

    client2Connection.on("message", (message) => {
      const parsedMessage = JSON.parse(message.utf8Data);

      // 2. Confirm room connection
      if (parsedMessage.type === messageTypes.confirmRoomConnection) {
        expect(parsedMessage).toEqual({
          type: messageTypes.confirmRoomConnection,
        });
      }

      // 4. Assert an error message is returned to the client
      if (parsedMessage.error) {
        expect(parsedMessage).toEqual({
          error: "sendVibrationPattern: Missing properties",
        });
        done();
      }
    });

    // 3. Send a vibration pattern but include some bad data
    client2Connection.send(
      JSON.stringify({
        type: messageTypes.sendVibrationPattern,
        data: {
          speed: 1,
        },
      })
    );
  });

  it("errors when sending a 'receivedVibrationPattern' message and the data property is missing the prop 'speed'", async (done) => {
    const mockVibrationPatternObject = { pattern: [] };

    const testRoom = await rooms.createRoom("123");

    const client2 = new WebSocketClient();
    // 1. Connect second user
    let client2Connection = null;
    const connectToRoomAndSendMessage2 = new Promise((resolve, reject) => {
      client2.on("connect", (connection) => {
        connection.send(
          JSON.stringify({
            type: messageTypes.connectToRoom,
            data: { password: testRoom.password },
          }),
          resolve
        );
        client2Connection = connection;
      });
      client2.on("connectFailed", reject);
    });

    client2.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );
    await connectToRoomAndSendMessage2;

    client2Connection.on("message", (message) => {
      const parsedMessage = JSON.parse(message.utf8Data);

      // 2. Confirm room connection
      if (parsedMessage.type === messageTypes.confirmRoomConnection) {
        expect(parsedMessage).toEqual({
          type: messageTypes.confirmRoomConnection,
        });
      }

      // 4. Assert an error message is returned to the client
      if (parsedMessage.error) {
        expect(parsedMessage).toEqual({
          error: "sendVibrationPattern: Missing properties",
        });
        done();
      }
    });

    // 3. Send a vibration pattern but include some bad data
    client2Connection.send(
      JSON.stringify({
        type: messageTypes.sendVibrationPattern,
        data: {
          vibrationPattern: mockVibrationPatternObject,
        },
      })
    );
  });

  it("disconnects users if they send messages in a non json format", async (done) => {
    const client1 = new WebSocketClient();

    client1.on("connect", (connection) => {
      connection.send("//;;''");

      connection.on("close", () => {
        done();
      });
    });
    client1.on("connectFailed", () => {
      throw new Error("connectFailed");
    });
    client1.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );
  });

  it("disconnects users if they send an invalid message which is not an object", async (done) => {
    const client1 = new WebSocketClient();

    client1.on("connect", (connection) => {
      connection.send(JSON.stringify("123"));

      connection.on("close", () => {
        done();
      });
    });
    client1.on("connectFailed", () => {
      throw new Error("connectFailed");
    });
    client1.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );
  });

  it("disconnects users if they send invalid messages with a non string type", async (done) => {
    const client1 = new WebSocketClient();

    client1.on("connect", (connection) => {
      connection.send(JSON.stringify({ type: { a: 1 } }));

      connection.on("close", () => {
        done();
      });
    });
    client1.on("connectFailed", () => {
      throw new Error("connectFailed");
    });
    client1.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );
  });

  it("disconnects users if they send messages which have no handlers", async (done) => {
    const client1 = new WebSocketClient();

    client1.on("connect", (connection) => {
      connection.send(
        JSON.stringify({
          type: "bad message type",
        })
      );

      connection.on("close", () => {
        done();
      });
    });
    client1.on("connectFailed", () => {
      throw new Error("connectFailed");
    });
    client1.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );
  });

  it("disconnects users if they send messages which are too large", async (done) => {
    const client1 = new WebSocketClient();

    client1.on("connect", (connection) => {
      connection.send(
        JSON.stringify({
          type: messageHandlers.connectToRoom,
          bigProperty: "bad message type".repeat(30),
        })
      );

      connection.on("close", () => {
        done();
      });
    });
    client1.on("connectFailed", () => {
      throw new Error("connectFailed");
    });
    client1.connect(
      `ws://localhost:${testPort}/?authToken=${serverAuthToken}`,
      null,
      null,
      {
        authToken: serverAuthToken,
      }
    );
  });
});
