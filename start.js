const startServer = require("./src/server/start-server");

const port = process.env.PORT || 3000;

startServer({ port }).then(({ expressServer }) => {
  console.log("Server running on port", expressServer.address().port);
});
