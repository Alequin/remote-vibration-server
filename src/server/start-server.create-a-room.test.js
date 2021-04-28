jest.mock(
  "../websocket/check-if-clients-are-alive/check-alive-clients-interval",
  () => ({ checkAliveClientsInterval: () => 2000 })
);

jest.mock(
  "../websocket/check-if-rooms-are-abandoned/check-rooms-interval",
  () => ({ checkRoomsInterval: () => 2000 })
);

const fetch = require("node-fetch");
const { default: waitFor } = require("wait-for-expect");
const startServer = require("./start-server");
const rooms = require("../persistance/rooms");
const dropDatabase = require("../../script/drop-database");
const createDatabase = require("../../script/create-database");
const truncateDatabaseTables = require("../../script/truncate-database-tables");

waitFor.defaults.timeout = 15000;
waitFor.defaults.interval = 1000;

describe("startServer", () => {
  const testPort = 3003;
  let server = null;
  const mockDeviceId = "012345678998765--123";

  beforeAll(async () => {
    await dropDatabase();
    await createDatabase();
  });

  beforeEach(async () => {
    await truncateDatabaseTables();

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
        deviceId: mockDeviceId,
      },
    });

    const responseJson = await response.json();

    // Assert response contains the room key
    expect(responseJson.password).toMatch(/\w*/);

    // Assert a room has been created
    const createdRoom = await rooms.findRoomByKey(responseJson.password);

    expect(createdRoom.id).toBeDefined();
    expect(createdRoom.password).toBe(responseJson.password);
    expect(createdRoom.users_in_room).toEqual([]);
    expect(createdRoom.creator_id).toEqual(mockDeviceId);
  });

  it("does not create a new room if the user has a room associated with their device id", async () => {
    const testRoom = await rooms.createRoom(mockDeviceId);

    const response = await fetch(`http://localhost:${testPort}/room`, {
      method: "POST",
      headers: {
        deviceId: mockDeviceId,
      },
    });

    const responseJson = await response.json();

    // Returned room key should match the test rooms key
    expect(responseJson.password).toBe(testRoom.password);
  });
});
