const mongoose = require('./backend/node_modules/mongoose');
const SharedVideo = require('./backend/models/SharedVideo');
const fs = require('fs');
const path = require('path');

async function fixVideoFilenames() {
    try {
        await mongoose.connect('mongodb://localhost:27017/school_performance');
        console.log('Connected to MongoDB');

        // Get the actual video file from uploads folder
        const uploadsDir = path.join(__dirname, 'backend', 'uploads');
        const files = fs.readdirSync(uploadsDir);
        const videoFiles = files.filter(file => file.endsWith('.mp4'));
        
        console.log('Found video files in uploads:', videoFiles);

        if (videoFiles.length === 0) {
            console.log('No video files found in uploads folder');
            process.exit(0);
        }

        // Update videos with dummy filenames to use the actual video file
        const videosToFix = await SharedVideo.find({
            type: 'upload',
            $or: [
                { filename: { $regex: /^sample_video_/ } },
                { filename: null },
                { filename: { $exists: false } },
                { filename: undefined }
            ]
        });

        console.log(`Found ${videosToFix.length} videos to fix`);

        for (let i = 0; i < videosToFix.length; i++) {
            const video = videosToFix[i];
            const actualVideoFile = videoFiles[0]; // Use the first (and likely only) video file
            
            video.filename = actualVideoFile;
            video.url = undefined; // Clear URL for upload type
            
            await video.save();
            console.log(`Fixed video "${video.title}" - set filename to ${actualVideoFile}`);
        }

        // List all videos after fixing
        const allVideos = await SharedVideo.find({})
            .populate('teacherId', 'subject')
            .populate({
                path: 'teacherId',
                populate: {
                    path: 'userId',
                    select: 'name'
                }
            });

        console.log(`\nAll videos after fixing (${allVideos.length} total):`);
        allVideos.forEach((video, index) => {
            console.log(`\n${index + 1}. ${video.title}`);
            console.log(`   Type: ${video.type}`);
            console.log(`   Class: ${video.class}`);
            console.log(`   Section: ${video.section}`);
            console.log(`   Teacher: ${video.teacherId?.userId?.name || 'Unknown'}`);
            console.log(`   URL: ${video.url || 'N/A'}`);
            console.log(`   Filename: ${video.filename || 'N/A'}`);
        });

        console.log('\nVideo filename fix completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing video filenames:', error);
        process.exit(1);
    }
}

fixVideoFilenames();