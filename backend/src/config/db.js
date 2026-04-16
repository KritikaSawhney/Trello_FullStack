const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'trello_clone',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  multipleStatements: false,
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('aivencloud.com') ? { rejectUnauthorized: false } : undefined,
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log('✅ Connected to MySQL database');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection error:', err.message);
    process.exit(-1);
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
