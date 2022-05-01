const truncateDatabaseTables = require("../../script/truncate-database-tables");

const { default: waitFor } = require("wait-for-expect");
const startServer = require("./start-server");

module.exports.startServerTest = () => {
  const context = { server: null };

  beforeAll(async () => {
    jest.clearAllMocks();
    await truncateDatabaseTables();
    context.server = await startServer({ port: 0 });
  });

  afterAll(async () => {
    await context.server?.closeServers();
  });

  return context;
};
