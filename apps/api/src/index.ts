import { createApiApp } from "./server.js";

const app = createApiApp();
const port = Number(process.env.PORT || 4000);

app.listen(port, () => {
  app.locals.logger.info({ port }, "API listening");
});
