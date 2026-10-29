const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const apiRouter = require("./routes/api");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use("/api", apiRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.use((error, req, res, next) => {
  const statusCode = Number.isInteger(error.statusCode)
    ? error.statusCode
    : 500;

  if (res.headersSent) {
    return next(error);
  }

  console.error(error);
  return res.status(statusCode).json({
    error: statusCode === 500 ? "Internal server error." : error.message,
  });
});

module.exports = app;