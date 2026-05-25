const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connString = process.env.MONGODB_URI;
    
    if (!connString) {
      throw new Error('MONGODB_URI environment variable is not defined.');
    }

    const conn = await mongoose.connect(connString);
    console.log(`MongoDB Connected successfully: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`MongoDB Connection Warning: ${error.message}`);
    // Return false instead of crash so backend health route can accurately report connection status
    return false;
  }
};

module.exports = connectDB;
