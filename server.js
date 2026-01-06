
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Database configuration (MySQL) - use local credentials for development
const db = mysql.createConnection({
  // host: "mainline.proxy.rlwy.net",
  // user: "root",
  // description: "QNlcwsbUaRVBpVXFRjpSbknKgqJGcqSa",
  // database: "railway",
  // port: 45490,
  host: "localhost",
  user: "root",
  password: "",
  database: "mobApp",
});

// Connect to MySQL and ensure required tables (users) exist
db.connect((err) => {
  if (err) throw err;
  console.log("MySQL Connected...");

  // Ensure 'users' table exists for authentication routes
  const usersTable = `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    password VARCHAR(255)
  )`;

  db.query(usersTable, (err) => {
    if (err) console.error('Failed to ensure users table exists:', err);
  });
});

// Start server (listens on default port 3001)
app.listen(3001, () => {
  console.log("Server running on port 3001");
});
// GET /items - return list of lost items (204 when none)
app.get("/items", (req, res) => {
  const q = "SELECT * FROM items WHERE status = 'Lost'";
  db.query(q, (err, data) => {
    if (err) return res.status(500).json({ message: "Database error", error: err });
    if (data.length === 0) return res.status(204).send("No items found");
    return res.status(200).json(data);
  });
});
// POST /addreport - validate payload and insert a new report into the items table
app.post("/addreport", (req, res) => {
  if (!req.body) return res.status(400).send("Request body is missing");

  const { title, description, location, date, contact, status = "Lost" } = req.body;
  const errors = [];

  if (!title) errors.push("title is required");
  if (!description) errors.push("description is required");
  if (!location) errors.push("location is required");
  if (!date) errors.push("date is required");
  if (!contact) errors.push("contact is required");

  if (errors.length > 0) return res.status(400).json({ message: errors });

  const q =
    "INSERT INTO items (title, description, location, date, contact, status) VALUES (?, ?, ?, ?, ?, ?)";

  db.query(q, [title, description, location, date, contact, status], (err, result) => {
    if (err) {
      if (err.errno === 1062) return res.status(400).json({ message: err.sqlMessage });
      return res.status(500).json({ message: "Database error", error: err });
    }
    return res.status(201).json({ id: result.insertId, message: "item added successfully" });
  });
});

// POST /signup - create a new user (simple, plaintext password storage)
app.post('/signup', (req, res) => {
  if (!req.body) return res.status(400).send('Request body is missing');
  const { username, password } = req.body;
  const errors = [];
  if (!username) errors.push('username is required');
  if (!password) errors.push('password is required');
  if (errors.length > 0) return res.status(400).json({ message: errors });

  // Check if username exists
  db.query('SELECT id FROM users WHERE username = ?', [username], (err, data) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (data && data.length > 0) return res.status(400).json({ message: 'username exists' });

    db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (err, result) => {
      if (err) {
        if (err.errno === 1062) return res.status(400).json({ message: err.sqlMessage });
        return res.status(500).json({ message: 'Database error', error: err });
      }
      return res.status(201).json({ id: result.insertId, message: 'user created' });
    });
  });
});

// POST /login - authenticate user with plaintext password compare (insecure)
app.post('/login', (req, res) => {
  if (!req.body) return res.status(400).send('Request body is missing');
  const { username, password } = req.body;
  const errors = [];
  if (!username) errors.push('username is required');
  if (!password) errors.push('password is required');
  if (errors.length > 0) return res.status(400).json({ message: errors });

  db.query('SELECT * FROM users WHERE username = ?', [username], (err, data) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (!data || data.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
    const user = data[0];
    if (user.password !== password) return res.status(401).json({ message: 'Invalid credentials' });
    return res.status(200).json({ id: user.id, username: user.username, message: 'Login successful' });
  });
});
// DELETE /delete/:id - remove an item by its auto-increment id
app.delete("/delete/:id", (req, res) => {
  const { id } = req.params;
  const q = "DELETE FROM items WHERE id = ?"; 
  db.query(q, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Item not found" });
    }
    return res.status(200).json({ message: "Item deleted successfully" });
  });
});

