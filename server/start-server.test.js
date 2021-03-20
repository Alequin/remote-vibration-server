const fetch = require("node-fetch");
var { client: WebSocketClient } = require("websocket");
const startServer = require("./start-server");

describe("startServer", () => {
  const testPort = 3001;
  let server = null;
  beforeEach(async () => (server = await startServer({ port: testPort })));
  afterEach(() => {
    server.close();
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
  }, 20000);
});
