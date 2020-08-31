const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;

// Define paths for Express config
const publicDirectoryPath = path.join(__dirname, '../public');
// const viewsPath = path.join(__dirname, '../templates/views');
// const partialsPath = path.join(__dirname, '../templates/partials');

// Setup static directory to serve
app.use(express.static(publicDirectoryPath));

// let count = 0;



io.on('connection', (socket) => {
    console.log('New WebSocket connection.');

    // socket.emit('message', generateMessage('Welcome!'));
    // socket.emit('message', {
    //     text: 'Welcome!',
    //     createdAt: new Date().getTime()
    // });
    // socket.emit('message', 'Welcome to the Chat App!');
    // socket.emit('countUpdated', count);

    // socket.broadcast.emit('message', generateMessage('A new uer has joined!'));
    // socket.broadcast.emit('message', 'A new uer has joined!');

    socket.on('join', ({ username, room }, callback) => {
        const {error, user} = addUser({ id: socket.id, username, room});

        if (error) {
            return callback(error);
        }

        socket.join(user.room);

        socket.emit('message', generateMessage('Admin', 'Welcome!'));

        socket.broadcast.to(user.room).emit('message', generateMessage('Admin',`${user.username} has joined!`));

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback();

        // socket.emit, io.emit, socket.broadcast.emit
        // io.to.emit, socket.broadcast.to.emit
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);
        // console.log(user);

        const filter = new Filter();

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!');
            // return callback('Profanity is not allowed!');
        }

        // socket.emit('countUpdated', count);
        io.to(user.room).emit('message', generateMessage(user.username, message));
        callback();
        // callback('Delivered!');
    })

    // socket.on('increment', () => {
    //     count++;
    //     // socket.emit('countUpdated', count);
    //     io.emit('countUpdated', count);
    // })

    socket.on('sendLocation', (data, callback) => {
        const user = getUser(socket.id);
        // io.emit('message', `https://google.com/maps?q=${data.lat},${data.long}`);
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${data.lat},${data.long}`));
        callback();
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left`));
            // io.emit('message', 'A user has left!');
    
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

// app.listen(port, () => {
server.listen(port, () => {
    console.log('Server is up on port ' + port);
})

