const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const rateLimit = require('express-rate-limit');
const sanitize = require('./middleware/sanitize');
const apiRouter = require('./routes/api');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_resume_analyser';
const JWT_SECRET = process.env.JWT_SECRET || 'atsify_jwt_secret_key_2026';

// Rate limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // limit auth attempts to 20 per 15 mins
  message: { error: 'Too many authentication attempts, please try again after 15 minutes.' }
});

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows files uploaded to backend to be retrieved if needed
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// NoSQL injection sanitizer & Rate limiting
app.use('/api', sanitize);
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// Serve uploaded files statically (useful for resume downloads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Serve static assets in production (React build)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));
  
  // Hand off any non-API get requests to index.html for client-side routing
  app.get('*', (req, res, next) => {
    // Only intercept requests that aren't API calls
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected server error occurred.'
  });
});

// WebSocket Event Listeners
io.on('connection', (socket) => {
  console.log('Client connected to WebSockets:', socket.id);

  // Authenticate connection using JWT token
  socket.on('authenticate', async (data) => {
    try {
      const token = data?.token;
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (user) {
          socket.userId = user._id.toString();
          user.isOnline = true;
          user.lastActiveAt = new Date();
          await user.save();

          console.log(`WebSockets: User ${user.username} (${user.role}) authenticated.`);
          
          // Broadcast status change
          io.emit('userStatusChanged', {
            userId: user._id,
            username: user.username,
            role: user.role,
            isOnline: true,
            lastActiveAt: user.lastActiveAt
          });
        }
      }
    } catch (err) {
      console.error('WebSockets authentication error:', err.message);
    }
  });

  // Simple identification fallback (e.g. for guest / dev modes)
  socket.on('identify', async (data) => {
    try {
      const userId = data?.userId;
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          socket.userId = user._id.toString();
          user.isOnline = true;
          user.lastActiveAt = new Date();
          await user.save();

          console.log(`WebSockets: User ${user.username} identified.`);
          
          io.emit('userStatusChanged', {
            userId: user._id,
            username: user.username,
            role: user.role,
            isOnline: true,
            lastActiveAt: user.lastActiveAt
          });
        }
      }
    } catch (err) {
      console.error('WebSockets identification error:', err.message);
    }
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected from WebSockets:', socket.id);
    
    if (socket.userId) {
      const userId = socket.userId;
      
      // Debounce the offline status change to prevent flicker on page reload/refresh
      setTimeout(async () => {
        try {
          const activeSockets = await io.fetchSockets();
          const isStillConnected = activeSockets.some(s => s.userId === userId);
          
          if (!isStillConnected) {
            const user = await User.findById(userId);
            if (user) {
              user.isOnline = false;
              user.lastActiveAt = new Date();
              await user.save();
              
              console.log(`WebSockets: User ${user.username} logged off.`);
              
              io.emit('userStatusChanged', {
                userId: user._id,
                username: user.username,
                role: user.role,
                isOnline: false,
                lastActiveAt: user.lastActiveAt
              });
            }
          }
        } catch (err) {
          console.error('WebSockets disconnect database hook error:', err);
        }
      }, 2500); // 2.5s delay to cover browser tab refresh
    }
  });
});

// Database connection & Server Startup
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    server.listen(PORT, () => {
      console.log(`Express server + WebSockets running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;
