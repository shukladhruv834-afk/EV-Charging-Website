require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { DelimiterParser } = require('@serialport/parser-delimiter');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize Serial Port for Arduino communication
let port;
let parser;
try {
  const portName = process.env.ARDUINO_PORT || 'COM7';
  console.log(`Attempting to open serial port: ${portName}`);
  port = new SerialPort({
    path: portName,
    baudRate: 115200,
  });
  parser = port.pipe(new DelimiterParser({ delimiter: '\n' }));
  
  port.on('open', () => console.log('✅ Connected to Arduino'));
  port.on('error', (err) => console.error('❌ Serial port error:', err.message));
  port.on('close', () => console.log('⚠️ Serial port closed'));
} catch (err) {
  console.error('❌ Failed to initialize serial port:', err.message);
}

// Suppress Mongoose strictQuery deprecation warning
mongoose.set('strictQuery', true);

// Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// MongoDB Connection with Retry Logic
const connectWithRetry = () => {
  const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/EVCharging';
  mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => console.log('✅ MongoDB Connected to EVCharging'))
    .catch((err) => {
      console.error('❌ MongoDB Connection Error:', err.message);
      setTimeout(connectWithRetry, 5000);
    });
};
connectWithRetry();

// Schemas with Enhanced Validation
const UserSchema = new mongoose.Schema({
  username: { type: String, required: [true, 'Username is required'], trim: true },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
  },
  password: { type: String, required: [true, 'Password is required'], minlength: [6, 'Password must be at least 6 characters'] },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+91[0-9]{10}$/, 'Phone must be +91 followed by 10 digits'],
  },
  city: { type: String, required: [true, 'City is required'] },
  state: { type: String, required: [true, 'State is required'] },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  vehicleInfo: {
    model: String,
    batteryCapacity: Number,
  },
  rfidCardId: { type: String },
  walletBalance: { type: Number, default: 0, min: [0, 'Balance cannot be negative'] },
}, { timestamps: true });

const ChargerSchema = new mongoose.Schema({
  chargerType: {
    type: String,
    enum: ['Level 1', 'Level 2', 'DC Fast'],
    required: [true, 'Charger type is required'],
  },
  address: { type: String, required: [true, 'Address is required'] },
  powerRating: { type: Number, required: [true, 'Power rating is required'], min: [1, 'Power rating must be at least 1'] },
  available: { type: Boolean, default: true },
  pricePerHour: { type: Number, required: [true, 'Price per hour is required'], min: [0, 'Price cannot be negative'] },
  geoLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: [true, 'Coordinates are required'],
      validate: {
        validator: (coords) => coords.length === 2,
        message: 'Coordinates must contain exactly 2 values [longitude, latitude]',
      },
    },
  },
  operator: { type: String, default: 'ZapCharge' },
  status: { type: String, enum: ['active', 'maintenance', 'offline'], default: 'active' },
  rfidReaderId: { type: String, sparse: true },
}, { timestamps: true });

ChargerSchema.index({ geoLocation: '2dsphere' });

const BookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  station_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Charger',
    required: [true, 'Station ID is required'],
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in-progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  startTime: { type: Date, required: [true, 'Start time is required'] },
  endTime: { type: Date, required: [true, 'End time is required'] },
  totalCost: { type: Number, required: [true, 'Total cost is required'] },
  energyConsumed: Number,
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
}, { timestamps: true });

const PaymentSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking ID is required'],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  chargerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Charger',
    required: [true, 'Charger ID is required'],
  },
  rfidCardId: { type: String, required: [true, 'RFID card ID is required'] },
  amount: { type: Number, required: [true, 'Amount is required'] },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentMethod: { type: String, enum: ['rfid', 'wallet', 'card'], required: [true, 'Payment method is required'] },
  transactionId: String,
  chargerAddress: { type: String, required: [true, 'Charger address is required'] },
  chargerType: { type: String, required: [true, 'Charger type is required'] },
  userEmail: { type: String, required: [true, 'User email is required'] },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Charger = mongoose.model('Charger', ChargerSchema);
const Booking = mongoose.model('Booking', BookingSchema);
const Payment = mongoose.model('Payment', PaymentSchema);

// Utility Functions
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '30d' });
};

const sendSMS = (phoneNumber, message) => {
  console.log(`SMS to ${phoneNumber}: ${message}`);
};

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('[Auth] No token provided for request:', req.method, req.path);
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      console.log('[Auth] Invalid token:', err.message);
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    req.user = user;
    console.log('[Auth] Decoded token:', req.user);
    next();
  });
};

const authenticateAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    console.log('[Auth] Admin access required for user:', req.user);
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// Function to Update Charger Availability
const updateChargerAvailability = async () => {
  try {
    console.log('🔄 Checking for expired bookings...');
    const now = new Date();

    const expiredBookings = await Booking.find({
      status: { $in: ['accepted', 'in-progress'] },
      endTime: { $lt: now },
    });

    console.log(`Found ${expiredBookings.length} expired bookings`);

    for (const booking of expiredBookings) {
      await Booking.findByIdAndUpdate(booking._id, {
        status: 'completed',
        paymentStatus: booking.paymentStatus === 'pending' ? 'failed' : booking.paymentStatus,
      });

      await Charger.findByIdAndUpdate(booking.station_id, { available: true });

      console.log(`Updated charger ${booking.station_id} to available and booking ${booking._id} to completed`);
    }
  } catch (error) {
    console.error('❌ Error updating charger availability:', error.message);
  }
};

// Schedule the Availability Update (every 5 minutes)
cron.schedule('*/5 * * * *', () => {
  console.log('⏰ Running scheduled charger availability update');
  updateChargerAvailability();
});

// Seed Initial Data
const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clean up Level 1 and Level 2 chargers without specific locations
    await Charger.deleteMany({
      $and: [
        { chargerType: { $in: ['Level 1', 'Level 2'] } },
        { address: { $not: /Krishna Nagar|Ram Swaroop College|Hazratganj|Transport Nagar/ } }
      ]
    });
    console.log('✅ Removed Level 1 and Level 2 chargers without specific locations');

    // Seed Chargers
    const chargerCount = await Charger.countDocuments();
    console.log(`Current charger count: ${chargerCount}`);

    // Ensure Krishna Nagar charger is correctly set
    await Charger.deleteOne({ rfidReaderId: 'READER001' });
    const krishnaCharger = await Charger.create({
      chargerType: 'Level 1',
      address: 'Krishna Nagar, Lucknow, Uttar Pradesh',
      geoLocation: { type: 'Point', coordinates: [80.9231, 26.8393] },
      powerRating: 3.3,
      pricePerHour: 100,
      available: true,
      operator: 'ZapCharge',
      rfidReaderId: 'READER001',
      status: 'active',
    });
    console.log('✅ Krishna Nagar charger seeded:', krishnaCharger._id);

    if (chargerCount === 0 || chargerCount === 1) {
      console.log('Seeding additional chargers...');
      const additionalChargers = [
        {
          _id: '6809363c5c2453fb63662c84',
          chargerType: 'DC Fast',
          address: 'Sitapur, Uttar Pradesh',
          geoLocation: { type: 'Point', coordinates: [77.2875, 28.6579] },
          powerRating: 50,
          pricePerHour: 400,
          available: true,
          operator: 'ZapCharge',
          rfidReaderId: 'READER003',
          status: 'active',
          createdAt: new Date('2025-04-23T18:49:33.008Z'),
          updatedAt: new Date('2025-05-04T08:30:24.586Z'),
        },
        {
          _id: '681725a0a25685242ac4dbce',
          chargerType: 'Level 2',
          address: 'Ram Swaroop College, Lucknow, Uttar Pradesh',
          geoLocation: { type: 'Point', coordinates: [80.9231, 26.8393] },
          powerRating: 22,
          pricePerHour: 250,
          available: true,
          operator: 'ZapCharge',
          rfidReaderId: 'READER002',
          status: 'active',
          createdAt: new Date('2025-05-04T08:30:24.623Z'),
          updatedAt: new Date('2025-05-04T14:50:56.117Z'),
        },
        {
          _id: '681725a0a25685242ac4dbcf',
          chargerType: 'Level 1',
          address: 'Hazratganj, Lucknow, Uttar Pradesh',
          geoLocation: { type: 'Point', coordinates: [80.9455, 26.8500] },
          powerRating: 3.3,
          pricePerHour: 120,
          available: true,
          operator: 'ZapCharge',
          rfidReaderId: 'READER004',
          status: 'active',
          createdAt: new Date('2025-05-04T08:30:24.624Z'),
          updatedAt: new Date('2025-05-05T08:30:24.624Z'),
        },
        {
          _id: '681725a0a25685242ac4dbd0',
          chargerType: 'Level 2',
          address: 'Transport Nagar, Lucknow, Uttar Pradesh',
          geoLocation: { type: 'Point', coordinates: [80.8739, 26.7889] },
          powerRating: 22,
          pricePerHour: 260,
          available: true,
          operator: 'ZapCharge',
          rfidReaderId: 'READER005',
          status: 'active',
          createdAt: new Date('2025-05-04T08:30:24.624Z'),
          updatedAt: new Date('2025-05-05T08:30:24.624Z'),
        },
      ];
      await Charger.insertMany(additionalChargers);
      console.log('✅ Additional chargers seeded');
    }

    // Seed Admin
    const adminCount = await User.countDocuments({ role: 'admin' });
    console.log(`Current admin count: ${adminCount}`);
    if (adminCount === 0) {
      console.log('No admin found, seeding admin...');
      const hashedPassword = await bcrypt.hash('1234', 12);
      await User.create({
        username: 'admin',
        email: 'admin@zapcharge.com',
        password: hashedPassword,
        phoneNumber: '+919999999999',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        role: 'admin',
        walletBalance: 0,
      });
      console.log('✅ Admin user seeded with username: admin, password: 1234');
    }

    // Seed Test User
    await User.deleteOne({ email: 'shukladhruv999@gmail.com' });
    console.log('Seeding test user...');
    const hashedPassword = await bcrypt.hash('dhruv7663', 12);
    const testUser = await User.create({
      username: 'Dhruv Shukla',
      email: 'shukladhruv999@gmail.com',
      password: hashedPassword,
      phoneNumber: '+919876543210',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      role: 'user',
      rfidCardId: 'CFCFB1C4',
      walletBalance: 1000,
    });
    console.log('✅ Test user seeded with email: shukladhruv999@gmail.com, password: dhruv7663, RFID: CFCFB1C4, Balance: ₹1000');

    // Seed a past booking for the test user
    const hazratganjCharger = await Charger.findById('681725a0a25685242ac4dbcf');
    if (hazratganjCharger) {
      console.log('Seeding a past booking for test user...');
      const pastStartTime = new Date('2025-05-03T10:00:00Z');
      const pastEndTime = new Date('2025-05-03T11:00:00Z');
      const bookingDurationHours = (pastEndTime - pastStartTime) / (1000 * 60 * 60);
      const totalCost = hazratganjCharger.pricePerHour * bookingDurationHours;

      const booking = await Booking.create({
        user: testUser._id,
        station_id: hazratganjCharger._id,
        status: 'completed',
        startTime: pastStartTime,
        endTime: pastEndTime,
        totalCost,
        paymentStatus: 'paid',
        createdAt: new Date('2025-05-03T11:00:00Z'),
        updatedAt: new Date('2025-05-03T11:00:00Z'),
      });

      await User.findByIdAndUpdate(testUser._id, { $push: { bookings: booking._id } });
      console.log(`✅ Seeded past booking for test user: ${booking._id}`);

      // Seed a payment for the booking
      const payment = await Payment.create({
        bookingId: booking._id,
        userId: testUser._id,
        chargerId: hazratganjCharger._id,
        rfidCardId: 'CFCFB1C4',
        amount: totalCost,
        status: 'completed',
        paymentMethod: 'rfid',
        transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
        chargerAddress: hazratganjCharger.address,
        chargerType: hazratganjCharger.chargerType,
        userEmail: testUser.email,
        createdAt: new Date('2025-05-03T11:00:00Z'),
        updatedAt: new Date('2025-05-03T11:00:00Z'),
      });
      console.log(`✅ Seeded payment for booking: ${payment._id}`);
    } else {
      console.log('⚠️ Hazratganj charger not found, skipping booking and payment seeding');
    }
  } catch (err) {
    console.error('❌ Seeding error:', err.stack);
    throw err;
  }
};

mongoose.connection.once('open', async () => {
  try {
    await Charger.createIndexes();
    await seedData();
    updateChargerAvailability();
  } catch (err) {
    console.error('❌ Initialization error:', err.stack);
    process.exit(1);
  }
});

// Socket.IO Connection with RFID Handling
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  
  if (!parser) {
    console.warn('⚠️ Serial port not initialized. RFID scanning disabled.');
    socket.emit('rfid-error', { message: 'Serial port not initialized' });
    return;
  }

  parser.on('data', async (data) => {
    const dataString = data.toString('utf8').trim();
    console.log(`[Arduino Raw Data] ${dataString}`);
    
    if (!dataString.startsWith('RFID_DETECTED:')) {
      console.log('Ignoring non-RFID message:', dataString);
      return;
    }
    
    try {
      console.log('Processing RFID data...');
      const parts = dataString.substring(14).trim().split('|');
      if (parts.length !== 2) {
        throw new Error('Invalid RFID data format');
      }
      const rfidCardId = parts[0].trim().toUpperCase();
      const readerId = parts[1].trim();
      console.log(`RFID Card ${rfidCardId} detected at reader ${readerId}`);
      
      const charger = await Charger.findOne({ rfidReaderId: readerId });
      if (!charger) {
        console.log(`No charger found for reader ${readerId}`);
        if (port) port.write(`PAYMENT_STATUS:FAILED:Invalid reader|${readerId}\n`);
        socket.emit('rfid-error', { message: `No charger found for reader ${readerId}` });
        return;
      }

      socket.emit('rfid-tap', { 
        rfidCardId, 
        stationId: charger._id,
        readerId,
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        timestamp: new Date() 
      });
    } catch (error) {
      console.error('Error processing RFID data:', error.stack);
      if (port) port.write(`PAYMENT_STATUS:FAILED:Processing error|${readerId || 'unknown'}\n`);
      socket.emit('rfid-error', { message: `Error processing RFID: ${error.message}` });
    }
  });

  socket.on('disconnect', () => {
    console.log('A client disconnected:', socket.id);
  });
});

// Recharge Endpoint with Enhanced Validation and Logging
app.post('/api/recharge', authenticateToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { amount } = req.body;
    console.log(`[Recharge] Request for user ${req.user.id}, amount: ₹${amount}`);

    // Validate amount
    if (!amount || isNaN(amount)) {
      console.log('[Recharge] Validation failed: Amount is missing or invalid');
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Amount is required and must be a number',
      });
    }
    const parsedAmount = parseFloat(amount);
    if (parsedAmount < 100) {
      console.log(`[Recharge] Validation failed: Amount ₹${parsedAmount} is less than minimum ₹100`);
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Amount must be at least ₹100',
      });
    }

    // Find user
    console.log('[Recharge] Fetching user...');
    const user = await User.findById(req.user.id).session(session);
    if (!user) {
      console.log(`[Recharge] User ${req.user.id} not found`);
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update balance
    console.log(`[Recharge] Current balance: ₹${user.walletBalance}`);
    user.walletBalance = (user.walletBalance || 0) + parsedAmount;
    console.log(`[Recharge] New balance: ₹${user.walletBalance}`);
    await user.save({ session });
    console.log('[Recharge] User balance updated successfully');

    // Commit transaction
    await session.commitTransaction();
    console.log('[Recharge] Transaction committed');

    // Send SMS notification
    sendSMS(user.phoneNumber, `Your account has been recharged with ₹${parsedAmount}. New balance: ₹${user.walletBalance}`);

    // Respond with updated balance
    console.log('[Recharge] Sending success response');
    res.status(200).json({
      success: true,
      message: 'Account recharged successfully',
      walletBalance: user.walletBalance,
    });
  } catch (error) {
    console.error('[Recharge] Error:', error.stack);
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: 'Failed to recharge account',
      error: error.message,
    });
  } finally {
    session.endSession();
  }
});

// Balance Endpoint
app.get('/api/balance', authenticateToken, async (req, res) => {
  try {
    console.log(`[Balance] Fetching balance for user ${req.user.id}`);
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log(`[Balance] User ${req.user.id} not found`);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log(`[Balance] Current balance: ₹${user.walletBalance}`);
    res.status(200).json({
      success: true,
      balance: user.walletBalance,
    });
  } catch (error) {
    console.error('[Balance] Error:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch balance',
      error: error.message,
    });
  }
});

// RFID Payment Route with Wallet Deduction
app.post('/api/rfid-payment', authenticateToken, async (req, res) => {
  const paymentTimeout = setTimeout(() => {
    if (port && req.body.stationId) {
      Charger.findById(req.body.stationId).then(charger => {
        if (charger && charger.rfidReaderId) {
          port.write(`PAYMENT_STATUS:FAILED:Payment timeout|${charger.rfidReaderId}\n`);
        }
      });
    }
    res.status(408).json({
      success: false,
      message: 'Payment request timed out',
    });
  }, 60000);

  try {
    const { rfidCardId, stationId, startTime, endTime, readerId } = req.body;

    console.log(`[RFID Payment] Received: rfidCardId=${rfidCardId}, stationId=${stationId}, readerId=${readerId}`);
    console.log(`[RFID Payment] Authenticated user: ${req.user.id}`);

    if (!rfidCardId || !stationId || !startTime || !endTime || !readerId) {
      clearTimeout(paymentTimeout);
      console.log('[RFID Payment] Error: Missing required fields:', { rfidCardId, stationId, startTime, endTime, readerId });
      if (port && readerId) port.write(`PAYMENT_STATUS:FAILED:Missing fields|${readerId}\n`);
      return res.status(400).json({
        success: false,
        message: 'RFID card ID, station ID, start time, end time, and reader ID are required',
      });
    }

    const activeBooking = await Booking.findOne({
      user: req.user.id,
      status: { $in: ['accepted', 'in-progress'] },
      endTime: { $gte: new Date() },
    });

    if (activeBooking) {
      clearTimeout(paymentTimeout);
      console.log(`[RFID Payment] Error: User ${req.user.id} already has an active booking: ${activeBooking._id}`);
      if (port && readerId) port.write(`PAYMENT_STATUS:FAILED:Active booking exists|${readerId}\n`);
      return res.status(400).json({
        success: false,
        message: 'You already have an active booking. Please complete or cancel it before booking another charger.',
      });
    }

    console.log('[RFID Payment] Looking up charger...');
    const charger = await Charger.findById(stationId);
    if (!charger || !charger.available) {
      clearTimeout(paymentTimeout);
      console.log(`[RFID Payment] Error: Charger ${stationId} not available or not found`);
      if (port && charger?.rfidReaderId) port.write(`PAYMENT_STATUS:FAILED:Charger not available|${charger.rfidReaderId}\n`);
      return res.status(400).json({
        success: false,
        message: 'Charger not available',
      });
    }

    const bookingDuration = (new Date(endTime) - new Date(startTime)) / (1000 * 60);
    if (bookingDuration < 30) {
      clearTimeout(paymentTimeout);
      console.log(`[RFID Payment] Error: Booking duration too short: ${bookingDuration} minutes`);
      if (port && charger.rfidReaderId) port.write(`PAYMENT_STATUS:FAILED:Minimum 30 minutes|${charger.rfidReaderId}\n`);
      return res.status(400).json({
        success: false,
        message: 'Minimum booking duration is 30 minutes',
      });
    }

    console.log('[RFID Payment] Looking up user...');
    const user = await User.findById(req.user.id);
    if (!user) {
      clearTimeout(paymentTimeout);
      console.log(`[RFID Payment] Error: User not found`);
      if (port && charger?.rfidReaderId) port.write(`PAYMENT_STATUS:FAILED:User not found|${charger.rfidReaderId}\n`);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.rfidCardId !== rfidCardId) {
      clearTimeout(paymentTimeout);
      console.log(`[RFID Payment] Error: RFID card ${rfidCardId} does not match user ${user.rfidCardId}`);
      if (port && charger?.rfidReaderId) port.write(`PAYMENT_STATUS:FAILED:Invalid RFID card|${charger.rfidReaderId}\n`);
      return res.status(400).json({
        success: false,
        message: 'RFID card does not match user',
      });
    }

    const hours = bookingDuration / 60;
    const totalCost = Math.round(charger.pricePerHour * hours * 100) / 100;

    console.log(`[RFID Payment] Checking wallet balance: ₹${user.walletBalance} vs ₹${totalCost}`);
    if (user.walletBalance < totalCost) {
      clearTimeout(paymentTimeout);
      console.log(`[RFID Payment] Error: Insufficient balance`);
      if (port && charger?.rfidReaderId) port.write(`PAYMENT_STATUS:FAILED:Insufficient balance|${charger.rfidReaderId}\n`);
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
      });
    }

    console.log(`[RFID Payment] Creating booking for user ${user._id} at charger ${charger._id}`);
    const booking = await Booking.create({
      user: user._id,
      station_id: charger._id,
      startTime,
      endTime,
      totalCost,
      status: 'accepted',
      paymentStatus: 'paid',
    });
    console.log(`[RFID Payment] Booking created: ${booking._id}`);

    console.log(`[RFID Payment] Creating payment record`);
    const payment = await Payment.create({
      bookingId: booking._id,
      userId: user._id,
      chargerId: charger._id,
      rfidCardId,
      amount: totalCost,
      status: 'completed',
      paymentMethod: 'rfid',
      transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
      chargerAddress: charger.address,
      chargerType: charger.chargerType,
      userEmail: user.email,
    });
    console.log(`[RFID Payment] Payment created: ${payment._id}`);

    console.log(`[RFID Payment] Deducting ₹${totalCost} from wallet`);
    user.walletBalance -= totalCost;
    await user.save();
    console.log(`[RFID Payment] User wallet updated`);

    console.log(`[RFID Payment] Adding booking ${booking._id} to user ${user._id}`);
    await User.findByIdAndUpdate(user._id, { $push: { bookings: booking._id } });
    console.log(`[RFID Payment] User bookings updated`);

    console.log(`[RFID Payment] Updating charger ${charger._id} to unavailable`);
    await Charger.findByIdAndUpdate(charger._id, { available: false });
    console.log(`[RFID Payment] Charger updated`);

    sendSMS(
      user.phoneNumber,
      `Booking confirmed! ${charger.chargerType} at ${charger.address} from ${new Date(startTime).toLocaleString()} to ${new Date(endTime).toLocaleString()}. Total: ₹${totalCost}. New balance: ₹${user.walletBalance}`,
    );

    if (port && charger.rfidReaderId) {
      console.log(`[RFID Payment] Sending PAYMENT_STATUS:SUCCESS to Arduino for reader ${charger.rfidReaderId}`);
      port.write(`PAYMENT_STATUS:SUCCESS|${charger.rfidReaderId}\n`);
    }

    clearTimeout(paymentTimeout);
    console.log(`[RFID Payment] Success: Booking ${booking._id} completed`);
    res.status(200).json({
      success: true,
      message: 'Payment and booking successful',
      booking,
      payment,
      walletBalance: user.walletBalance,
    });
  } catch (error) {
    console.error(`[RFID Payment] Detailed Error:`, error.stack);
    
    clearTimeout(paymentTimeout);
    if (port && req.body.stationId) {
      const charger = await Charger.findById(req.body.stationId);
      if (charger && charger.rfidReaderId) {
        console.log(`[RFID Payment] Sending PAYMENT_STATUS:FAILED to Arduino for reader ${charger.rfidReaderId}`);
        port.write(`PAYMENT_STATUS:FAILED:${error.message.substring(0, 30)}|${charger.rfidReaderId}\n`);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to process RFID payment',
      error: error.message,
    });
  }
});

// User Authentication Routes
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = generateToken(user._id, user.role);
    res.status(200).json({
      success: true,
      message: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} login successful`,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        vehicleInfo: user.vehicleInfo,
        rfidCardId: user.rfidCardId,
        walletBalance: user.walletBalance,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
});

app.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, password, phoneNumber, city, state, vehicleInfo } = req.body;

    if (!username || !email || !password || !phoneNumber || !city || !state) {
      return res.status(400).json({
        success: false,
        message: 'All required fields (username, email, password, phoneNumber, city, state) must be provided',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered. Please log in instead.',
        redirectTo: '/login',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      phoneNumber,
      city,
      state,
      role: 'user',
      vehicleInfo,
      walletBalance: 0,
    });

    const token = generateToken(user._id, user.role);
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        city: user.city,
        state: user.state,
        role: user.role,
        vehicleInfo: user.vehicleInfo,
        walletBalance: user.walletBalance,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
});

// Admin Routes
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    if (username === 'admin' && password === '1234') {
      const user = await User.findOne({ username: 'admin', role: 'admin' });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Admin account not found',
        });
      }

      const token = generateToken(user._id, user.role);
      res.status(200).json({
        success: true,
        message: 'Admin login successful',
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        token,
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid admin credentials',
      });
    }
  } catch (error) {
    console.error('Admin login error:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Admin login failed',
      error: error.message,
    });
  }
});

app.get('/api/admin/chargers', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const chargers = await Charger.find();
    res.status(200).json({ success: true, chargers });
  } catch (error) {
    console.error('Admin charger fetch error:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chargers',
      error: error.message,
    });
  }
});

app.post('/api/admin/chargers', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { chargerType, address, powerRating, pricePerHour, geoLocation, rfidReaderId } = req.body;

    if (!chargerType || !address || !powerRating || !pricePerHour || !geoLocation?.coordinates) {
      return res.status(400).json({
        success: false,
        message: 'All charger details are required',
      });
    }

    const charger = await Charger.create({
      chargerType,
      address,
      powerRating,
      pricePerHour,
      geoLocation: {
        type: 'Point',
        coordinates: geoLocation.coordinates,
      },
      rfidReaderId,
    });

    res.status(201).json({ success: true, charger });
  } catch (error) {
    console.error('Admin charger creation error:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create charger',
      error: error.message,
    });
  }
});

app.put('/api/admin/chargers/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const charger = await Charger.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    );

    if (!charger) {
      return res.status(404).json({
        success: false,
        message: 'Charger not found',
      });
    }

    res.status(200).json({ success: true, charger });
  } catch (error) {
    console.error('Admin charger update error:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update charger',
      error: error.message,
    });
  }
});

app.delete('/api/admin/chargers/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const charger = await Charger.findByIdAndDelete(req.params.id);
    if (!charger) {
      return res.status(404).json({
        success: false,
        message: 'Charger not found',
      });
    }
    res.status(200).json({ success: true, message: 'Charger deleted successfully' });
  } catch (error) {
    console.error('Admin charger deletion error:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to delete charger',
      error: error.message,
    });
  }
});

app.get('/api/admin/bookings', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find().populate('user station_id');
    res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.error('Admin booking fetch error:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message,
    });
  }
});

app.get('/api/admin/payments', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('userId', 'username email')
      .populate('chargerId', 'address chargerType')
      .populate('bookingId', 'startTime endTime totalCost');
    res.status(200).json({ success: true, payments });
  } catch (error) {
    console.error('Admin payment fetch error:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message,
    });
  }
});

// Charger Routes with Location Filtering and Availability Check
app.get('/api/chargers', authenticateToken, async (req, res) => {
  try {
    await updateChargerAvailability();

    const chargers = await Charger.find({ status: 'active' });

    for (let charger of chargers) {
      const activeBooking = await Booking.findOne({
        station_id: charger._id,
        status: { $in: ['accepted', 'in-progress'] },
        endTime: { $gte: new Date() },
      });

      if (!activeBooking && !charger.available) {
        await Charger.findByIdAndUpdate(charger._id, { available: true });
        charger.available = true;
      } else if (activeBooking && charger.available) {
        await Charger.findByIdAndUpdate(charger._id, { available: false });
        charger.available = false;
      }
    }

    res.status(200).json({ success: true, chargers });
  } catch (error) {
    console.error('Charger fetch error:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chargers',
      error: error.message,
    });
  }
});

// Directions Route
app.get('/api/directions', authenticateToken, async (req, res) => {
  try {
    const { originLat, originLng, destinationLat, destinationLng } = req.query;

    if (!originLat || !originLng || !destinationLat || !destinationLng) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination coordinates are required',
      });
    }

    const parseCoord = (value, name) => {
      const num = parseFloat(value);
      if (isNaN(num)) throw new Error(`${name} is not a valid number`);
      if (name.includes('Lat') && (num < -90 || num > 90)) throw new Error(`${name} must be between -90 and 90`);
      if (name.includes('Lng') && (num < -180 || num > 180)) throw new Error(`${name} must be between -180 and 180`);
      return num;
    };

    const originLatNum = parseCoord(originLat, 'originLat');
    const originLngNum = parseCoord(originLng, 'originLng');
    const destinationLatNum = parseCoord(destinationLat, 'destinationLat');
    const destinationLngNum = parseCoord(destinationLng, 'destinationLng');

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key is not set');
    }

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${originLatNum},${originLngNum}&` +
      `destination=${destinationLatNum},${destinationLngNum}&` +
      `key=${apiKey}`,
    );

    if (response.data.status !== 'OK') {
      return res.status(400).json({
        success: false,
        message: 'Could not calculate directions',
        details: response.data,
      });
    }

    res.status(200).json({
      success: true,
      directions: response.data,
    });
  } catch (error) {
    console.error('Directions Error:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to get directions',
      error: error.message,
      details: error.response?.data || {},
    });
  }
});

// Booking Routes
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { station_id, startTime, endTime } = req.body;
    const user = req.user.id;

    const activeBooking = await Booking.findOne({
      user,
      status: { $in: ['accepted', 'in-progress'] },
      endTime: { $gte: new Date() },
    });

    if (activeBooking) {
      console.log(`[Booking] Error: User ${user} already has an active booking: ${activeBooking._id}`);
      return res.status(400).json({
        success: false,
        message: 'You already have an active booking. Please complete or cancel it before booking another charger.',
      });
    }

    const bookingDuration = (new Date(endTime) - new Date(startTime)) / (1000 * 60);
    if (bookingDuration < 30) {
      return res.status(400).json({
        success: false,
        message: 'Minimum booking duration is 30 minutes',
      });
    }

    const charger = await Charger.findById(station_id);
    if (!charger || !charger.available) {
      return res.status(400).json({
        success: false,
        message: 'Charger not available',
      });
    }

    const overlappingBooking = await Booking.findOne({
      station_id,
      status: { $in: ['accepted', 'in-progress'] },
      $or: [
        { startTime: { $lte: endTime, $gte: startTime } },
        { endTime: { $gte: startTime, $lte: endTime } },
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
      ],
    });

    if (overlappingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Charger is booked for the selected time slot',
      });
    }

    const hours = bookingDuration / 60;
    const totalCost = Math.round(charger.pricePerHour * hours * 100) / 100;

    const booking = await Booking.create({
      user,
      station_id,
      startTime,
      endTime,
      totalCost,
      status: 'accepted',
    });

    await Charger.findByIdAndUpdate(station_id, { available: false });
    await User.findByIdAndUpdate(user, { $push: { bookings: booking._id } });

    sendSMS(
      (await User.findById(user)).phoneNumber,
      `Booking confirmed! ${charger.chargerType} at ${charger.address} from ${new Date(startTime).toLocaleString()} to ${new Date(endTime).toLocaleString()}. Total: ₹${totalCost}`,
    );

    res.status(201).json({ success: true, booking });
  } catch (error) {
    console.error('Booking error:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message,
    });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;