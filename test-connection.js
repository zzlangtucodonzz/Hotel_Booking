import pool, { testConnection } from './backend/connection.js';

console.log('Testing MySQL database connection...');

const translateMySQLError = (err) => {
  switch (err.code) {
    case 'ECONNREFUSED':
      return 'MySQL is not running. Please start the MySQL module in the XAMPP Control Panel.';
    case 'ER_ACCESS_DENIED_ERROR':
      return 'Incorrect username or password. Check DB_USER and DB_PASSWORD in your .env file.';
    case 'ER_BAD_DB_ERROR':
      return `Database does not exist. Please create the database '${process.env.DB_NAME}' via phpMyAdmin or MySQL console.`;
    case 'ENOTFOUND':
      return 'Database host not found. Check DB_HOST in your .env file.';
    default:
      return 'An unknown database error occurred.';
  }
};

const runTest = async () => {
  try {
    await testConnection();
    console.log('🎉 CONNECTION TEST PASSED!');

    // Also query a table to see if tables have been created and seeded
    const [tables] = await pool.query('SHOW TABLES');
    console.log('Found tables:', tables.map(t => Object.values(t)[0]));

    if (tables.length > 0) {
      try {
        const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
        console.log(`Users count in database: ${users[0].count}`);
      } catch (err) {
        console.log('Table "users" might not exist yet.');
      }
    }
  } catch (err) {
    console.error('\n❌ CONNECTION TEST FAILED:');
    console.error('Error Code:', err.code);
    console.error('Message:', err.message);
    console.error('\n💡 ADVICE:', translateMySQLError(err));
  } finally {
    await pool.end();
    process.exit(0);
  }
};

runTest();
