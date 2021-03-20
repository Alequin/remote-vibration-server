const startServer = require("./server/start-server");

startServer({ port: 3000 }).then((server) => {
  console.log("Server running on port", server.address().port);
});
