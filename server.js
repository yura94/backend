// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Client } = require("pg");
const app = express();
const port = 5000;

const { body, validationResult } = require("express-validator");

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10),
});

client
  .connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("Connection error", err.stack));

app.use(cors()); // Дозволяє запити з фронтенду
app.use(express.json()); // Для обробки JSON-тел

//  маршрут
app.get("/cocktails", (req, res) => {
  client
    .query("SELECT * FROM cocktails")
    .then((result) => res.json(result.rows))
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.post(
  "/orders",
  body("order").isString().notEmpty(),
  body("price").isInt({ min: 0 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { order, price } = req.body;
    client
      .query("INSERT INTO orders (order, price) VALUES ($1, $2) RETURNING *", [
        order,
        price,
      ])
      .then((result) => res.status(201).json(result.rows[0]))
      .catch((err) => res.status(500).json({ error: err.message }));
  }
);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
