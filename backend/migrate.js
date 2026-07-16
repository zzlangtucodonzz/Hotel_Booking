import pool from './connection.js';

async function run() {
  try {
    console.log('Starting migration...');
    await pool.query('ALTER TABLE bookings MODIFY UserID INT NULL;');
    console.log('Successfully made UserID NULLable.');
    
    const alterQueries = [
      'ALTER TABLE bookings ADD COLUMN guest_name VARCHAR(255) NULL;',
      'ALTER TABLE bookings ADD COLUMN guest_email VARCHAR(255) NULL;',
      'ALTER TABLE bookings ADD COLUMN guest_phone VARCHAR(50) NULL;'
    ];
    
    for (const q of alterQueries) {
      try {
        await pool.query(q);
        console.log('Executed:', q);
      } catch (err) {
        console.log('Note on', q, ':', err.message);
      }
    }
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
  process.exit(0);
}

run();
