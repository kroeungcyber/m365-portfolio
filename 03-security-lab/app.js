require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const logger = require('./logger');
const { authenticate, authorize } = require('./authMiddleware');

const cors = require('cors');
const app = express();

// --- Environment Validation ---
const envSchema = Joi.object({
  PORT: Joi.number().default(3000),
  CLIENT_ID: Joi.string().required(),
  TENANT_ID: Joi.string().required(),
  REDIRECT_URI: Joi.string().uri().required(),
  ADMIN_GROUP_ID: Joi.string().required(),
  MANAGER_GROUP_ID: Joi.string().required(),
  EMPLOYEE_GROUP_ID: Joi.string().required(),
  LOG_LEVEL: Joi.string().valid('info', 'error', 'warn', 'debug').default('info')
}).unknown(true);

const { error, value: envVars } = envSchema.validate(process.env);
if (error) {
  logger.error(`Config validation error: ${error.message}`);
  process.exit(1);
}

// --- Security Middleware ---
app.use(helmet()); // Sets various HTTP headers for security
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// --- Routes ---

// Public health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Protected: Requires Authentication
app.get('/api/profile', authenticate, (req, res) => {
  res.json({
    message: 'Authentication successful',
    user: req.auth.account.name,
    username: req.auth.account.username
  });
});

// Protected: Requires 'admin' permission
app.get('/api/admin/settings', authenticate, authorize(['*']), (req, res) => {
  res.json({ message: 'Welcome, Admin! You have access to system settings.' });
});

// Protected: Requires 'read' permission (Manager or Employee)
app.get('/api/documents', authenticate, authorize(['read']), (req, res) => {
  res.json({ message: 'Displaying internal documents...', count: 42 });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const PORT = envVars.PORT;
app.listen(PORT, () => {
  logger.info(`M365 Security Lab demo running on port ${PORT}`);
});
