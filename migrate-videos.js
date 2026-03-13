// Migration script to fix existing SharedVideo records
const mongoose = require('mongoose');
const SharedVideo = require('./backend/models/SharedVideo');

async function migrateExistingVideos() {
    try {
        // Connect to database
        await mongoose.connect('mongodb://localhost:27017/school-performance', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('Connected to database');
        
        // Find videos without class field
        const videosWithoutClass = await SharedVideo.find({
            $or: [
                { class: { $exists: false } },
                { class: null },
                { class: '' }
            ]
        });
        
        console.log(`Found ${videosWithoutClass.length} videos without class field`);
        
        if (videosWithoutClass.length === 0) {
            console.log('No videos need migration');
            return;
        }
        
        // Update each video
        for (const video of videosWithoutClass) {
            console.log(`Migrating video: ${video.title}`);
            
            // Extract class from section if possible (e.g., "10A" -> class: "10", section: "A")
            let extractedClass = '10'; // Default class
            let extractedSection = video.section;
            
            // Try to extract class from section if it contains numbers
            const match = video.section.match(/^(\d+)([A-Z])$/);
            if (match) {
                extractedClass = match[1];
                extractedSection = match[2];
                console.log(`Extracted class ${extractedClass} and section ${extractedSection} from ${video.section}`);
            } else {
                // If section is just a letter, use default class 10
                console.log(`Using default class ${extractedClass} for section ${video.section}`);
            }
            
            // Update the video
            await SharedVideo.updateOne(
                { _id: video._id },
                { 
                    class: extractedClass,
                    section: extractedSection
                }
            );
            
            console.log(`Updated video: ${video.title} -> Class: ${extractedClass}, Section: ${extractedSection}`);
        }
        
        console.log('Migration completed successfully!');
        
        // Verify the migration
        const allVideos = await SharedVideo.find({});
        console.log('\n=== All Videos After Migration ===');
        allVideos.forEach(video => {
            console.log(`${video.title} - Class: ${video.class}, Section: ${video.section}`);
        });
        
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from database');
    }
}

// Run the migration
migrateExistingVideos();