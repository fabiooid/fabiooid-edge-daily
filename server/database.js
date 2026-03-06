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

// Helper function to generate random short code
function generateSlug() {
  return Math.random().toString(36).substring(2, 9);
}

// Helper function to regenerate all slugs
function regenerateSlugs(resolve, reject) {
  db.all('SELECT id, title FROM posts', (err, posts) => {
    if (err) {
      console.error('Error fetching posts:', err);
      reject(err);
      return;
    }
    
    if (posts.length === 0) {
      console.log('✓ No existing posts to migrate');
      db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug)', (err) => {
        if (err) {
          console.error('Error creating index:', err);
          reject(err);
        } else {
          console.log('✓ Migration completed successfully!');
          resolve();
        }
      });
      return;
    }
    
    // Generate and update slugs for existing posts
    let completed = 0;
    posts.forEach((post) => {
      const slug = generateSlug();
      
      db.run('UPDATE posts SET slug = ? WHERE id = ?', [slug, post.id], (err) => {
        if (err) {
          console.error(`Error updating slug for post ${post.id}:`, err);
        } else {
          console.log(`  ✓ Generated slug for: ${post.title}`);
        }
        
        completed++;
        
        // After all posts are updated, add unique index
        if (completed === posts.length) {
          db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug)', (err) => {
            if (err) {
              console.error('Error creating index:', err);
              reject(err);
            } else {
              console.log('✓ Migration completed successfully!');
              resolve();
            }
          });
        }
      });
    });
  });
}

// ONE-TIME MIGRATION: Add slug column and populate existing posts
function runSlugMigration() {
  return new Promise((resolve, reject) => {
    // Check if slug column exists
    db.all("PRAGMA table_info(posts)", (err, columns) => {
      if (err) {
        console.error('Error checking table info:', err);
        reject(err);
        return;
      }
      
      const hasSlug = columns.some(col => col.name === 'slug');
      
      if (!hasSlug) {
        console.log('Running slug migration...');
        
        // Add slug column
        db.run('ALTER TABLE posts ADD COLUMN slug TEXT', (err) => {
          if (err) {
            console.error('Error adding slug column:', err);
            reject(err);
            return;
          }
          
          console.log('✓ Slug column added');
          regenerateSlugs(resolve, reject);
        });
      } else {
        // Column exists - check if we need to regenerate slugs
        // Regenerate if any slug looks like a word-based slug (contains hyphens and is long)
        db.get('SELECT slug FROM posts WHERE length(slug) > 10 LIMIT 1', (err, row) => {
          if (err) {
            console.error('Error checking slugs:', err);
            reject(err);
            return;
          }
          
          if (row && row.slug && row.slug.includes('-')) {
            console.log('Found old word-based slugs, regenerating...');
            regenerateSlugs(resolve, reject);
          } else {
            console.log('✓ Slug column already exists with correct format');
            resolve();
          }
        });
      }
    });
  });
}

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
      // Run migration after table is ready
      runSlugMigration().catch(err => {
        console.error('Migration failed:', err);
      });
    }
  });
}

// Create a new post
function createPost(theme, title, content, links, date) {
  return new Promise((resolve, reject) => {
    const linksJSON = JSON.stringify(links);
    const slug = generateSlug();
    const sql = `INSERT INTO posts (theme, title, content, links, date, slug) VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [theme, title, content, linksJSON, date, slug], function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, slug });
    });
  });
}

// Get latest post
function getLatestPost() {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM posts ORDER BY date DESC LIMIT 1`;
    
    db.get(sql, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Get post by slug
function getPostBySlug(slug) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM posts WHERE slug = ?`;
    
    db.get(sql, [slug], (err, row) => {
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
    getPostBySlug,
    getAllPosts,
    getPostsByTheme
};