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

// Environment variable validation
const validateEnv = () => {
  const errors = [];
  const warnings = [];
  
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      errors.push('JWT_SECRET is required in production');
    } else {
      warnings.push('JWT_SECRET is not set. Using insecure fallback (not recommended for production).');
    }
  }
  
  if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
    errors.push('MONGODB_URI is required in production');
  }
  
  if (!process.env.AI_SERVICE_URL) {
    warnings.push('AI_SERVICE_URL not set. Defaulting to http://localhost:8000');
  }
  
  if (errors.length > 0) {
    console.error('[FATAL] Environment validation errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    warnings.forEach(w => console.warn(`[WARN] ${w}`));
  }
};

validateEnv();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_insecure_fallback_key_change_in_prod';

// Rate limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // limit auth attempts to 20 per 15 mins
  message: { error: 'Too many authentication attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // Allows files uploaded to backend to be retrieved if needed
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS rejected request from origin: ${origin}`);
      callback(new Error('CORS not allowed from this origin'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
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
app.get('/health', async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };

  // Check AI service connectivity
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${aiServiceUrl}/`, { 
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    healthStatus.ai_service = response.ok ? 'connected' : 'unhealthy';
  } catch (err) {
    healthStatus.ai_service = 'disconnected';
    healthStatus.warning = 'AI service is not reachable. The system will use fallback analysis.';
  }

  res.status(healthStatus.mongodb === 'disconnected' ? 503 : 200).json(healthStatus);
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
  const errorMessage = err.message || 'An unexpected server error occurred.';
  console.error(`[ERROR] ${new Date().toISOString()} - ${req.method} ${req.path} - ${errorMessage}`);
  console.error(err.stack || '');
  
  // Don't leak sensitive error details in production
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again later.'
    });
  }
  
  res.status(err.status || 500).json({
    error: errorMessage,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
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
      const debounceTimer = setTimeout(async () => {
        try {
          const activeSockets = await io.fetchSockets();
          const isStillConnected = activeSockets.some(s => s.userId === userId);
          
          if (!isStillConnected) {
            const user = await User.findById(userId);
            if (user) {
              const wasOnline = user.isOnline;
              user.isOnline = false;
              user.lastActiveAt = new Date();
              await user.save();
              
              // Only emit if status actually changed
              if (wasOnline) {
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
          }
        } catch (err) {
          console.error('WebSockets disconnect database hook error:', err.message);
        }
      }, 2500); // 2.5s delay to cover browser tab refresh
      
      // Clean up timer reference on socket
      socket.on('disconnecting', () => {
        clearTimeout(debounceTimer);
      });
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
