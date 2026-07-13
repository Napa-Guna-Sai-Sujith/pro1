const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

let pool = null;
if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: connectionString.includes("neon.tech") || connectionString.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : false
  });
} else {
  console.warn("⚠️ No DATABASE_URL environment variable found. Database will fall back to in-memory mode.");
}

async function query(text, params) {
  if (!pool) {
    throw new Error("Database not connected. Please specify DATABASE_URL in .env");
  }
  return pool.query(text, params);
}

async function initDb() {
  if (!pool) return;
  
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        role VARCHAR(50) NOT NULL,
        wallet_address VARCHAR(255),
        company VARCHAR(255),
        location VARCHAR(255),
        verified BOOLEAN DEFAULT FALSE,
        meta_mask_connected BOOLEAN DEFAULT FALSE,
        last_login_at VARCHAR(255),
        created_at VARCHAR(255)
      );
    `);

    // Ensure dynamically added columns exist
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number VARCHAR(255);`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS license_document TEXT;`);


    await query(`
      CREATE TABLE IF NOT EXISTS drugs (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        generic_name VARCHAR(255) NOT NULL,
        manufacturer VARCHAR(255) NOT NULL,
        manufacturer_id VARCHAR(255) NOT NULL,
        dosage VARCHAR(255) NOT NULL,
        batch_number VARCHAR(255) NOT NULL,
        lot_number VARCHAR(255) NOT NULL,
        mfg_date VARCHAR(255) NOT NULL,
        exp_date VARCHAR(255) NOT NULL,
        serial_number VARCHAR(255) NOT NULL,
        barcode VARCHAR(255) NOT NULL,
        qr_data TEXT,
        ipfs_image_hash VARCHAR(255),
        ipfs_certificate_hash VARCHAR(255),
        salt VARCHAR(255),
        created_at VARCHAR(255) NOT NULL,
        status VARCHAR(100) NOT NULL,
        current_holder VARCHAR(255) NOT NULL,
        current_holder_role VARCHAR(100) NOT NULL,
        supply_chain JSONB DEFAULT '[]'::jsonb,
        authenticity_score INT DEFAULT 100,
        last_verified_at VARCHAR(255),
        temperature_logs JSONB DEFAULT '[]'::jsonb
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS smart_contract_calls (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        params JSONB DEFAULT '{}'::jsonb,
        result TEXT,
        gas_used VARCHAR(255),
        block_number INT NOT NULL,
        tx_hash VARCHAR(255) NOT NULL,
        drug_id VARCHAR(255),
        user_id VARCHAR(255),
        timestamp VARCHAR(255)
      );
    `);
    
    console.log("✅ Neon DB / PostgreSQL schemas successfully initialized.");
  } catch (err) {
    console.error("❌ Failed to initialize database schemas:", err.message);
    throw err;
  }
}

module.exports = {
  pool,
  query,
  initDb,
  isConnected: () => !!pool
};
