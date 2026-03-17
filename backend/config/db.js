const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://reddykoti424_db_user:DANIdaneils9652@kotireddy1.hli18t2.mongodb.net/school_performance?retryWrites=true&w=majority&appName=kotireddy1';
        const conn = await mongoose.connect(mongoURI);
        console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('❌ Database connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;