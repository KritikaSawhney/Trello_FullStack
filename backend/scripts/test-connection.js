require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const dns = require('dns').promises;

async function testConnection() {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || 3306;
  const user = process.env.DB_USER;
  const name = process.env.DB_NAME;

  console.log('🔍 Starting Database Diagnostics...\n');

  // Step 1: DNS Check
  console.log(`[1/3] Checking DNS for ${host}...`);
  try {
    const addresses = await dns.lookup(host);
    console.log(`✅ Host resolved to ${addresses.address}`);
  } catch (err) {
    console.error(`❌ DNS FAILURE: "${host}" could not be found.`);
    console.error('👉 Tip: Check if your Aiven service is "Powered On" or if the hostname has changed.');
    process.exit(1);
  }

  // Step 2: Port/Connectivity Check
  console.log(`[2/3] Testing connectivity to port ${port}...`);
  try {
    const pool = mysql.createPool({
      host,
      port,
      user,
      password: process.env.DB_PASSWORD,
      database: name,
      connectTimeout: 5000,
      ssl: host.includes('aivencloud.com') ? { rejectUnauthorized: false } : undefined
    });
    
    const conn = await pool.getConnection();
    console.log('✅ Network connectivity established.');
    
    // Step 3: Auth/Database Check
    console.log(`[3/3] Checking credentials and database "${name}"...`);
    await conn.query('SELECT 1');
    console.log('✅ Authentication successful! Database is ready.');
    
    conn.release();
    await pool.end();
    
    console.log('\n🎉 ALL CHECKS PASSED: Your database is fully operational.');
  } catch (err) {
    console.error(`❌ CONNECTION FAILED: ${err.message}`);
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
      console.error('👉 Tip: Likely an IP whitelist issue or the service is not listening on this port.');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('👉 Tip: Check your DB_USER and DB_PASSWORD environment variables.');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error(`👉 Tip: The database "${name}" does not exist. Run "npm run seed" to create it.`);
    }
    process.exit(1);
  }
}

testConnection();
