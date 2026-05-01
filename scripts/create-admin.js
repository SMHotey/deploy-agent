const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

async function createAdmin() {
  try {
    const email = 'admin@deploy-agent.local';
    const password = 'admin123';
    const name = 'Admin User'; 
    
    // Generate hash
    const hash = await bcrypt.hash(password, 10);
    console.log('Generated hash:', hash);
    
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('Error: users table does not exist. Run npm run db:push first.');
      await pool.end();
      return;
    }
    
    // Insert or update admin user
    const result = await pool.query(`
      INSERT INTO users (email, password_hash, name, is_admin, created_at, updated_at)
      VALUES ($1, $2, $3, true, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET is_admin = true, password_hash = $2, updated_at = NOW()
      RETURNING id, email, is_admin;
    `, [email, hash, name]);
    
    console.log('✓ Admin user created/updated:');
    console.log('  ID:', result.rows[0].id);
    console.log('  Email:', result.rows[0].email);
    console.log('  isAdmin:', result.rows[0].is_admin);
    console.log('');
    console.log('Login credentials:');
    console.log('  Email: admin@deploy-agent.local');
    console.log('  Password: admin123');
    
  } catch (error) {
    console.error('Error creating admin:', error.message);
    console.error('Make sure PostgreSQL is running and DATABASE_URL is correct.');
  } finally {
    await pool.end();
  }
}

createAdmin();
