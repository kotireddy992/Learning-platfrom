const mongoose = require('./backend/node_modules/mongoose');
const SharedVideo = require('./backend/models/SharedVideo');

async function fixExistingVideos() {
    try {
        await mongoose.connect('mongodb://localhost:27017/school_performance');
        console.log('Connected to MongoDB');

        // Find videos with missing class field
        const videosWithoutClass = await SharedVideo.find({
            $or: [
                { class: null },
                { class: { $exists: false } },
                { class: undefined }
            ]
        });

        console.log(`Found ${videosWithoutClass.length} videos without class field`);

        // Fix videos without class
        for (const video of videosWithoutClass) {
            video.class = '10'; // Set default class
            await video.save();
            console.log(`Fixed video "${video.title}" - set class to 10`);
        }

        // Find videos without url or filename
        const videosWithoutContent = await SharedVideo.find({
            $and: [
                { $or: [{ url: null }, { url: { $exists: false } }, { url: '' }] },
                { $or: [{ filename: null }, { filename: { $exists: false } }, { filename: '' }] }
            ]
        });

        console.log(`Found ${videosWithoutContent.length} videos without content`);

        // Fix videos without content by adding sample YouTube URLs
        for (let i = 0; i < videosWithoutContent.length; i++) {
            const video = videosWithoutContent[i];
            
            if (video.type === 'youtube' || !video.type) {
                video.type = 'youtube';
                video.url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Sample video
                video.filename = undefined;
            } else if (video.type === 'upload') {
                // For upload type, we'll create a dummy filename
                video.filename = `sample_video_${i + 1}.mp4`;
                video.url = undefined;
            }
            
            await video.save();
            console.log(`Fixed video "${video.title}" - added ${video.type === 'youtube' ? 'URL' : 'filename'}`);
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

        console.log('\nVideo fix completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing videos:', error);
        process.exit(1);
    }
}

fixExistingVideos();