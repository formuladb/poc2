import * as http from "http";
import config from "./config/config";

//FIXME: use this only for dev/test environment
import { loadData } from "../../src/app/test/mocks/loadTestData";

loadData().then(() => {
  // Init the express application
  const app = require("./config/express").default();

  const server: http.Server = http.createServer(app);

  server.listen(config.port);

  server.on("error", (e: Error) => {
    console.log("Error starting server" + e);
  });

  server.on("listening", () => {
    console.log("Server started on port " + config.port);
  });

})

// import { FrmdbEngine } from "./frmdb_engine";

// new FrmdbEngine().init();
