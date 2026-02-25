// database.js
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'daily-learning.db')
  : path.join(__dirname, 'daily-learning.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the daily-learning.db database.');
    console.log('Database location:', dbPath);
  }
});

// Initialize database and create tables
function initializeDatabase() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      theme TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      links TEXT,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
    } else {
      console.log('Posts table ready');
    }
  });
}

// Create a new post
function createPost(theme, title, content, links, date) {
  return new Promise((resolve, reject) => {
    const linksJSON = JSON.stringify(links);
    const sql = `INSERT INTO posts (theme, title, content, links, date) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [theme, title, content, linksJSON, date], function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID });
    });
  });
}

// Get latest post
function getLatestPost() {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM posts ORDER BY created_at DESC LIMIT 1`;
    
    db.get(sql, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Get all posts
function getAllPosts() {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM posts ORDER BY date DESC`;
    
    db.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Get posts by theme
function getPostsByTheme(theme) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM posts WHERE theme = ? ORDER BY date DESC`;
    
    db.all(sql, [theme], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export {
    initializeDatabase,
    createPost,
    getLatestPost,
    getAllPosts,
    getPostsByTheme
  };