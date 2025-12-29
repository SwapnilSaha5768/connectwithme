require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');

const userRoutes = require('./routes/userRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Render/Vercel)
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      "https://connectwithme-six.vercel.app",
    ];

    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

const cookieParser = require('cookie-parser');

// Middleware
app.use(cookieParser());

app.use(express.json({ limit: '50mb' }));

connectDB();

// Routes
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);

app.get('/', (req, res) => {
  res.send('ConnecT API is running...');
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const expressServer = server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

const io = require('socket.io')(expressServer, {
  pingTimeout: 60000,
  cors: {
    origin: "*",
  },
});


let activeUsers = new Map();

io.on('connection', (socket) => {
  console.log('Connected to socket.io');

  socket.on('setup', (userData) => {
    socket.join(userData._id);
    socket.userId = userData._id;

    if (!activeUsers.has(userData._id)) {
      activeUsers.set(userData._id, new Set());
    }
    activeUsers.get(userData._id).add(socket.id);

    io.emit("connected-users", Array.from(activeUsers.keys()));
    socket.emit('connected');
  });

  socket.on('join chat', (room) => {
    socket.join(room);
  });

  socket.on('typing', (room) => socket.in(room).emit('typing'));
  socket.on('stop typing', (room) => socket.in(room).emit('stop typing'));

  socket.on('read message', ({ chatId, userId }) => {
    socket.in(chatId).emit('message read', { chatId, userId });
  });

  socket.on('new message', (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log('chat.users not defined');

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      socket.in(user._id).emit('message recieved', newMessageRecieved);
    });
  });

  socket.on('delete message', (deletedMessage) => {
    var chat = deletedMessage.chat;

    if (!chat.users) return console.log('chat.users not defined');

    chat.users.forEach((user) => {
      if (user._id == deletedMessage.sender) return;

      socket.in(user._id).emit('message deleted', deletedMessage);
    });
  });

  socket.on('chat cleared', (chatId) => {
    socket.emit('chat cleared', chatId); // Reflect back to sender
    socket.in(chatId).emit('chat cleared', chatId); // Broadcast to room
  });

  // WebRTC Signaling Events
  socket.on("callUser", (data) => {
    const room = io.sockets.adapter.rooms.get(data.userToCall);
    if (!room || room.size === 0) {
    } else {
    }

    socket.to(data.userToCall).emit("callUser", {
      signal: data.signalData,
      from: data.from,
      name: data.name,
      pic: data.pic,
      isVideo: data.isVideo
    });
  });

  socket.on("answerCall", (data) => {
    socket.to(data.to).emit("callAccepted", data.signal);
  });

  socket.on("ice-candidate", (data) => {
    socket.to(data.to).emit("ice-candidate", data.candidate);
  });

  socket.on("endCall", (data) => {
    socket.to(data.to).emit("endCall");
  });

  socket.on('disconnect', () => {
    if (socket.userId && activeUsers.has(socket.userId)) {
      const userSockets = activeUsers.get(socket.userId);
      userSockets.delete(socket.id);

      if (userSockets.size === 0) {
        activeUsers.delete(socket.userId);
      }

      io.emit("connected-users", Array.from(activeUsers.keys()));
      socket.leave(socket.userId);
    }
  });
});

