const mongoose = require('./backend/node_modules/mongoose');

async function fixStudentIndex() {
    try {
        await mongoose.connect('mongodb://localhost:27017/school_performance');
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('students');

        // Drop the existing problematic index
        try {
            await collection.dropIndex('studentId_1');
            console.log('Dropped existing studentId index');
        } catch (error) {
            console.log('Index may not exist or already dropped:', error.message);
        }

        // Create a new sparse unique index
        await collection.createIndex(
            { studentId: 1 }, 
            { unique: true, sparse: true }
        );
        console.log('Created new sparse unique index for studentId');

        console.log('Index fix completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing index:', error);
        process.exit(1);
    }
}

fixStudentIndex();