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