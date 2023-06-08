const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const JWT_SECRET = 'cata';
const path = require('path')
const cookieParser = require('cookie-parser')
const app = express();
const port = process.env.PORT || 8080;

const io = require('socket.io')(3000, {
  cors: {
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST'],
    credentials: true
  }
});


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
        const { userId } = jwt.verify(token, JWT_SECRET);
    
        // Attach the user object to the request
        const userQuery = `SELECT * FROM users WHERE id='${userId}'`
    
        const userRows = await new Promise((resolve, reject) => {
            db.query(userQuery,  (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });
    
    
        const user = userRows[0];
        console.log(user)
    
        if (!user) return res.redirect('/login') //res.status(401).send({error:'Unauthorized'});
    
        req.user = user;

      next();
      } catch (err) {
        console.log(err)
        //res.status(401).send({error:'Unauthorized'});
        res.redirect('/login')
      }
    }


app.get('/', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'home.html'));
})

app.get('/chat', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'chat-rooms.html'));
})

app.get('/chat/:roomId', authMiddleware, async (req, res) => {
  const roomId = req.params.roomId;
  req.roomId = roomId

  console.log('room', roomId)

  if(roomId){
    console.log(req.user.id)
    const room = await checkRoom(roomId, req.user.id);
    console.log(room)
    if (!room) return res.status(403).send({error:'Forbidden'});
  };

  res.sendFile(path.join(__dirname, 'public', 'html', 'chat.html'));
})

  
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "login.html"));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).send('Please provide username and password');
    }
    db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (error, results) => {
      if (error) {
        throw error;
      }
      if (results.length === 0) {
        return res.status(401).send({error:'Invalid username or password'});
      }
      const user = results[0];
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1y' });
      res.cookie('jwt', token, { httpOnly: false });
      res.status(200).send({msg:'Logged in successfully'});
    });
});

app.post('/signup', async (req, res) => {
    try {
      // Check if the username already exists
      const usernameExists = await new Promise((resolve, reject) => {
        const query = `SELECT id FROM users WHERE username = ?`;
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
      const id = uuidv4()
      await new Promise((resolve, reject) => {
        const query = `INSERT INTO users (id, username, password) VALUES (?, ?, ?)`;
        db.query(query, [id, req.body.username, req.body.password], (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '1y' });
      res.cookie('jwt', token, { httpOnly: false });
      //setUpNewPlayer(req.body.username);
  
      // Respond with success message
      res.status(200).send({msg:'User created'});
    } catch (error) {
      console.error('Sign up error:', error);
      res.status(500).send({error:'Server error!'});
    }
  });


  
  app.get('/get-messages/:roomId', authMiddleware, async (req, res) => {
    if(!await checkRoom(req.params.roomId, req.user.id)) return res.status(401).send({error:"Unauthorized"})
    db.query(`SELECT messages.*, users.username
    FROM messages
    JOIN users ON messages.from = users.id
    WHERE messages.room = "${req.params.roomId}" ORDER BY date ASC;
    `, (err, results) => {
      if(err){
        res.status(500).send({error:"Internal server error!"})
        throw err
      }
      res.status(200).send({messages:results})

    })
  })  


  app.get('/get-room/:roomId', authMiddleware, async (req, res) => {
    if(!await checkRoom(req.params.roomId, req.user.id)) return res.status(401).send({error:"Unauthorized"})
    db.query(`SELECT rooms.*, GROUP_CONCAT(users.username) AS members
    FROM rooms
    LEFT JOIN member ON rooms.id = member.room
    LEFT JOIN users ON member.user = users.id
    WHERE rooms.id = '${req.params.roomId}';
    `, (err, results) => {
      if(err){
        res.status(500).send({error:"Internal server error!"})
        throw err
      }
      res.status(200).send({room:results[0]})

    })
  })   

  app.get('/get-rooms', authMiddleware, async (req, res) => {
    db.query(`SELECT rooms.*
    FROM member
    JOIN rooms ON member.room = rooms.id
    WHERE member.user = '${req.user.id}' ORDER BY date desc;
    `, (err, results) => {
      if(err){
        res.status(500).send({error:"Internal server error!"})
        throw err
      }
      res.status(200).send({rooms:results})

    })
  })   

 app.post('/new-room', authMiddleware, (req, res) => {
    const { name } = req.body;
    if (!name) {
      return res.status(400).send('Please provide name!');
    }

    const id = uuidv4()
    db.query(`INSERT INTO rooms (id, name) VALUES ('${id}', '${name}')`, (error, results) => {
      if (error) {
        res.status(500).send({error:'Internal server error!'});
        throw error;
      }
      console.log('asd', id, req.user.id)
      joinRoom(id, req.user.id)
      res.status(200).send({msg:'Created Room!'});
    });
});

app.post('/add-member/:roomId', authMiddleware, async (req, res) => {
  const { member } = req.body;
  if (!member) {
    return res.status(400).send({error:'Please provide member!'});
  }

  const userRows = await new Promise((resolve, reject) => {
    db.query(`SELECT * FROM users WHERE username='${member}'`,  (err, results) => {
    if (err) reject(err);
    else resolve(results);
  });
});


const user = userRows[0];

if(!user) return res.status(404).send({error: 'User not found!'});

await joinRoom(req.params.roomId, user.id)
res.status(200).send({msg:"User added."})

});

  app.get('*', function(req, res){
    res.status(404).sendFile(path.join(__dirname, "public", "static", "404.html"));
  });

  app.listen(port, () => {
    console.log('Server started on port ' + port);
    
  });
   



// SOCKET IO SERVER  
io.on('connection', async socket =>{
    console.log('connection')

    const headers = socket.handshake.headers;
    // Extract the JWT token from the headers
    const token = headers.authorization?.split('Bearer ')[1];

  
    if (token) {
      try {
        // Verify and decode the JWT token to get the user ID
        const decoded = jwt.verify(token, JWT_SECRET); // Replace 'your_secret_key' with your JWT secret key
        const userId = decoded.userId;

        console.log(userId)
  
        // Associate the user ID with the Socket.IO connection
        socket.userId = userId;


        const userQuery = `SELECT * FROM users WHERE id='${userId}'`
    
        const userRows = await new Promise((resolve, reject) => {
            db.query(userQuery,  (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });
    
    
        const user = userRows[0];
        console.log(user)
    
        if (!user) return socket.disconnect();
    
        socket.user = user;

        const roomId = socket.handshake.query.room

        if(roomId){
          const room = await checkRoom(roomId, userId);
          console.log(room)
          if (!room) return socket.disconnect();
          socket.room = roomId
          socket.join(roomId)
        };
    
        socket.emit('your-id', userId)


      } catch (error) {
        socket.disconnect()
        console.log("dis")
      }
    } else {
      socket.disconnect()
      console.log("dis")
    }

    socket.on('message', async message => {
      const from = socket.user.username
      const room = socket.room
      
      console.log(from, room)

      socket.broadcast.to(room).emit("message", {username: from, message: message})

      db.query(`INSERT INTO messages (\`from\`, room, message) VALUES ('${socket.user.id}', '${room}', '${message}')`, (err) =>{if(err) throw err})
    });

})


async function checkRoom(roomId, userId){

    const roomRows = await new Promise((resolve, reject) => {
      db.query(`SELECT * FROM member WHERE user='${userId}' AND room='${roomId}'`,  (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });

  })

  const room = roomRows[0];
  return room
}

function joinRoom(roomId, userId){
  db.query(`INSERT IGNORE INTO member (room, user) VALUES ('${roomId}', '${userId}')`, (error, results) => {
    if (error) {
      throw error;
    }
  });
}