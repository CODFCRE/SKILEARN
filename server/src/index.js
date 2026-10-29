const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");
const port = Number.parseInt(process.env.PORT || "5000", 10);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
