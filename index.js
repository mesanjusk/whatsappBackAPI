const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');  // Update this import

const app = express();

// MongoDB connection string
const mongoURL = 'your_mongo_connection_string_here'; // Replace with your MongoDB connection string

// Connect to MongoDB
mongoose.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Session setup with MongoStore
app.use(session({
  secret: 'your_secret_key',  // Replace with your secret key
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: mongoURL,   // The MongoDB connection URL
    collectionName: 'sessions',  // The name of the session collection
  }),
  cookie: { 
    secure: false,  // Set to true if you're using https
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Example route
app.get('/', (req, res) => {
  res.send('Hello, world!');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
