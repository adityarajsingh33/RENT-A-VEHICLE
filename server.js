const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

// MongoDB connection string
const mongoURI = 'mongodb://localhost:27017/simple_chat_app';

// Connect to MongoDB
mongoose.connect(mongoURI);

// Create a schema for user data
const userSchema = new mongoose.Schema({
    username: String,
    password: String
});

// Create a model based on the schema
const User = mongoose.model('User', userSchema);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));
// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));

// Handle socket connections
io.on('connection', (socket) => {
    console.log('A user connected');

    // Set username on connection
    socket.on('setUsername', (username) => {
        socket.username = username;
        console.log(`User '${username}' connected`);
    });

    // Handle chat messages
    socket.on('chatMessage', async (message) => {
        // Broadcast the message to all connected users
        io.emit('message', { sender: socket.username, message });
    });

    // Handle disconnections
    socket.on('disconnect', () => {
        if (socket.username) {
            console.log(`User '${socket.username}' disconnected`);
        }
    });
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Handle user signup
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.status(400).send('Username already exists');
    }

    // Create a new user
    const newUser = new User({
        username,
        password
    });

    await newUser.save();
    res.redirect('/login');
});

// Display login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Handle user login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
        return res.status(401).send('Invalid username or password');
    }

    // Check password
    if (password !== user.password) {
        return res.status(401).send('Invalid username or password');
    }

    // Redirect to chat page with the username upon successful login
    res.redirect(`/chat?username=${username}`);
});

// Display chat page
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

const PORT = 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
