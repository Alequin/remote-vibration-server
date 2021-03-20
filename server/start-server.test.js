const fetch = require("node-fetch");
var { client: WebSocketClient, w3cwebsocket } = require("websocket");
const { default: waitFor } = require("wait-for-expect");
const connectedUsers = require("../websocket/connected-users");
const startServer = require("./start-server");

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
    const foobar = await fetch(`http://localhost:${testPort}/health`);
    expect(await foobar.text()).toBe("OK");
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

  it("can send a message to the server via web sockets", async (done) => {
    const client1 = new WebSocketClient();
    const client2 = new WebSocketClient();

    const expectedMessage = "test message";

    client2.on("connect", (connection2) => {
      client1.on("connect", (connection1) => {
        connection1.send(expectedMessage);
      });

      connection2.on("message", (message) => {
        // Asserts client 2 gets the message from client 1
        expect(message.utf8Data).toBe(expectedMessage);
        done();
      });

      client1.connect(`ws://localhost:${testPort}`);
    });

    client2.connect(`ws://localhost:${testPort}`);
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
});
