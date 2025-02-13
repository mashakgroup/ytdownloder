const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();

// Enable CORS
app.use(cors());

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    console.error(err);
    res.status(500).json({ 
        message: err.message || 'Internal server error' 
    });
};

// Get video information
app.get('/api/download/info/:videoId', async (req, res, next) => {
    try {
        const { videoId } = req.params;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Validate video ID
        if (!ytdl.validateID(videoId)) {
            return res.status(400).json({ message: 'Invalid video ID' });
        }

        // Get video info
        const info = await ytdl.getInfo(videoUrl);

        // Extract available formats
        const formats = [
            { label: '1080p MP4', value: '137' },
            { label: '720p MP4', value: '22' },
            { label: '480p MP4', value: '135' },
            { label: '360p MP4', value: '18' }
        ].filter(format => 
            info.formats.some(f => f.itag.toString() === format.value)
        );

        // Prepare response
        const response = {
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            formats: formats
        };

        res.json(response);
    } catch (error) {
        if (error.message.includes('No video id found')) {
            res.status(400).json({ message: 'Invalid video URL' });
        } else if (error.message.includes('Video unavailable')) {
            res.status(404).json({ message: 'Video not found or unavailable' });
        } else {
            next(error);
        }
    }
});

// Download video
app.get('/api/download/download/:videoId', async (req, res, next) => {
    try {
        const { videoId } = req.params;
        const { format } = req.query;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Validate video ID
        if (!ytdl.validateID(videoId)) {
            return res.status(400).json({ message: 'Invalid video ID' });
        }

        // Get video info
        const info = await ytdl.getInfo(videoUrl);

        // Choose format
        const videoFormat = ytdl.chooseFormat(info.formats, { quality: format });
        if (!videoFormat) {
            return res.status(400).json({ message: 'Selected format not available' });
        }

        // Set headers
        const fileName = `${info.videoDetails.title.replace(/[^\w\s]/gi, '')}.mp4`;
        res.header('Content-Disposition', `attachment; filename="${fileName}"`);
        res.header('Content-Type', 'video/mp4');

        // Create download stream
        const stream = ytdl(videoUrl, { format: videoFormat });

        // Handle stream errors
        stream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Download failed' });
            }
        });

        // Pipe the video stream to response
        stream.pipe(res);
    } catch (error) {
        if (!res.headersSent) {
            if (error.message.includes('No video id found')) {
                res.status(400).json({ message: 'Invalid video URL' });
            } else if (error.message.includes('Video unavailable')) {
                res.status(404).json({ message: 'Video not found or unavailable' });
            } else {
                next(error);
            }
        }
    }
});

// Apply error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
