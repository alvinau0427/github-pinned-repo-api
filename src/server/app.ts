import https from 'https';
import * as dotenv from 'dotenv';
import { CronJob } from 'cron';
import { createApp } from './server';
import { verifyGitHubToken } from './services/pinnedRepos';

dotenv.config();

// Verify lazily-loaded token after dotenv has populated process.env.
void verifyGitHubToken();

// --- Cron Job: Keep Server Alive ---
const keepAliveUrl = process.env.APP_URL || 'https://github-pinned-repo-api.onrender.com';
const cronJob = new CronJob('*/14 * * * *', () => {
    https.get(keepAliveUrl, (res) => {
        if (res.statusCode === 200) console.log('Response Message: Server self-ping success');
    }).on('error', (err) => console.error('Keep-alive error:', err.message));
});
cronJob.start();

const app = createApp();
const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server listening on port: ${port}`);
});
