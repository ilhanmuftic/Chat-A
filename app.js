const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const JWT_SECRET = 'your_secret_key_here';
const path = require('path')
const cookieParser = require('cookie-parser')
const app = express();
const port = process.env.PORT || 80;
const io = require('socket.io')(3000)

app.use(express.static(path.join("public", "static")))
app.set('trust proxy', 1)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser())

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'chata',
    multipleStatements: true
  });

  db.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL: ' + err.stack);
      return;
    }
    console.log('Connected to MySQL.');
  });  

  const authMiddleware = async (req, res, next) => {
    try {
        // Verify the JWT and extract the user ID
        const token = req.cookies.jwt;
        const { playerId } = jwt.verify(token, JWT_SECRET);
    
        // Attach the user object to the request
        const playerQuery = `SELECT p.*, j.title AS job_title, e.name AS education_name, pt.time as experience
        FROM players p
        LEFT JOIN jobs j ON p.job_id = j.id
        LEFT JOIN education e ON p.education_id = e.id
        LEFT JOIN player_time pt ON pt.player_id = p.id
        WHERE p.id = '${playerId}'
        `;
    
        const playerRows = await new Promise((resolve, reject) => {
          db.query(playerQuery,  (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });
    
    
        const player = playerRows[0];
        console.log(player)
    
      if (!player) return res.status(401).send({error:'Unauthorized'});
    
      req.player = player;
    
      next();
      } catch (err) {
        console.log(err)
        res.status(401).send({error:'Unauthorized'});
        res.redirect('/login')
      }
    }


app.get('/', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'home.html'));
})
  
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "login.html"));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).send('Please provide username and password');
    }
    db.query('SELECT * FROM players WHERE username = ? AND password = ?', [username, password], (error, results) => {
      if (error) {
        throw error;
      }
      if (results.length === 0) {
        return res.status(401).send({error:'Invalid username or password'});
      }
      const player = results[0];
      const token = jwt.sign({ playerId: player.id }, JWT_SECRET, { expiresIn: '1y' });
      res.cookie('jwt', token, { httpOnly: true });
      res.status(200).send({msg:'Logged in successfully'});
    });
});

app.post('/signup', async (req, res) => {
    try {
      // Check if the username already exists
      const usernameExists = await new Promise((resolve, reject) => {
        const query = `SELECT id FROM players WHERE username = ?`;
        db.query(query, [req.body.username], (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results.length > 0);
          }
        });
      });
      if (usernameExists) {
        return res.status(400).send({error:'Username already exists'});
      }
  
      // Insert the user to the database
      await new Promise((resolve, reject) => {
        const query = `INSERT INTO players (id, username, password) VALUES (uuid(), ?, ?)`;
        db.query(query, [req.body.username, req.body.password], (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      setUpNewPlayer(req.body.username);
  
      // Respond with success message
      res.status(200).send({msg:'User created'});
    } catch (error) {
      console.error('Sign up error:', error);
      res.status(500).send({error:'Server error!'});
    }
  });

  function setUpNewPlayer(username){
    return;
    const query = `SELECT id FROM players WHERE username = ?`;
    db.query(query, [username], (error, results) => {
      if (error) throw error;
      else {
        const playerId = results[0].id;
        const cashflows = [
          [generateId(), playerId, "expense", "Mortgage Payment", 350], 
          [generateId(), playerId, "expense", "Card Credit Payment", 40],
          [generateId(), playerId, "expense", "Car Payment", 35],
          [generateId(), playerId, "expense", "Retail Payment", 35],
          [generateId(), playerId, "expense", "Other Expenses", 200],
          [generateId(), playerId, "income", "Job Salary", 0]
        ]

        const liabilities = [
          [generateId(), playerId, "Mortgage", 75000, cashflows[0][0]], 
          [generateId(), playerId, "Card Credit Debt", 10000, cashflows[1][0]],
          [generateId(), playerId, "Car Loan", 35000, cashflows[2][0]],
          [generateId(), playerId, "Retail Debt", 2000, cashflows[3][0]]
        ]

        db.query(`INSERT INTO player_cashflow (id, player_id, type, name, value) VALUES ?; INSERT INTO player_liabilities (id, player_id, name, value, cashflow_id) VALUES ?;INSERT INTO player_time (player_id, time) VALUES ('${playerId}', 0)`, [cashflows, liabilities], (error, results) => {
          if (error) throw error;
        });


      }
    });
  }


  app.get('*', function(req, res){
    res.status(404).sendFile(path.join(__dirname, "public", "static", "404.html"));
  });

  app.listen(port, () => {
    console.log('Server started on port ' + port);
    
  });
   

// SOCKET IO SERVER  
io.on('connection', socket =>{
    console.log('connection')

})