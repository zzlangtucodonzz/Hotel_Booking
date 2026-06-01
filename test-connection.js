import pool, { testConnection } from './backend/connection.js';

console.log('Testing connection...');
try {
  await testConnection();
  console.log('🎉 CONNECTION TEST PASSED!');

  // Also query a table to see if tables have been created and seeded
  const [tables] = await pool.query('SHOW TABLES');
  console.log('Found tables:', tables.map(t => Object.values(t)[0]));

  if (tables.length > 0) {
    const [users] = await pool.query('SELECT COUNT(*) as count FROM Users');
    console.log(`Users count in database: ${users[0].count}`);
  }
} catch (err) {
  console.error('❌ CONNECTION TEST FAILED:');
  console.error(err);
} finally {
  await pool.end();
  process.exit(0);
}
