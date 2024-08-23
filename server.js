// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { Client } = require("pg");
const app = express();
const port = 5000;

const saltRounds = 10;

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

async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    console.error("Error hashing password:", error);
  }
}

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

app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await hashPassword(password);

    const query =
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *";

    const values = [email, hashedPassword];

    await client
      .query(query, values)
      .then((result) => res.status(201).json(result.rows[0]));
  } catch (error) {
    console.error("Error saving user:", error);
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const query = "SELECT * FROM users WHERE email = $1";
    const values = [email];

    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        res.status(200).json({ message: "Login successful", user: user });
      } else {
        res.status(401).json({ message: "Invalid email or password" });
      }
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
