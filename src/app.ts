import express from 'express';
import https from 'https';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fetch from 'cross-fetch';
import * as cheerio from 'cheerio';
import { LRUCache } from 'lru-cache';
import { CronJob } from 'cron';

const app = express();
const port = 3000;
const options = { max: 500, ttl: 1000 * 60 * 5 };
const cache = new LRUCache(options);
const updatingUsers = new Set<string>();
const url = 'https://github-pinned-repo-api.onrender.com';

const cronJob = new CronJob('*/14 * * * *', function () {
    try {
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                console.log('Response Message: Server restarted');
            } else {
                console.error(`Response Error: failed to restart server with status code: ${res.statusCode}`);
            }
        }).on('error', (err) => {
            console.error(err.message);
        });
    } catch (e) {
        console.error(e);
    }
});
cronJob.start();

// Use CORS middleware for handling CORS
app.use(cors({ origin: '*' }));

// Set up express middleware
app.use(express.static(path.join(__dirname, 'assets')));
app.use(bodyParser.urlencoded({ extended: true }));

// Start server
app.listen(process.env.PORT || port, () => {
    console.log(`Server is listening on port: ${process.env.PORT || port}`);
});

// Define main route with cache and data fetching
app.get('/', async (req, res) => {
    const username = req.query.username as string;

    if (!username) {
        res.set('Content-Type', 'text/html');
        return res.sendFile(__dirname + "/view/index.html");
    }

    const cachedResult = cache.get(username);
    res.set('Content-Type', 'application/json');
    res.set("Set-Cookie", `nextPage=1; domain=localhost; Path=/; Max-Age=${60 * 15}`);

    if (cachedResult) {
        // Send the old cached data back to the user to ensure speed
        res.send(JSON.stringify(cachedResult, null, 4));

        // Check if this user is already in Update Lock
        if (!updatingUsers.has(username)) {
            updatingUsers.add(username);
            console.log(`[Cache] Background updating for: ${username}`);

            getPinnedRepos(username).then((data) => {
                cache.set(username, data);
            }).catch((error) => {
                console.error(`[Background Update Error] ${username}:`, error.message);
            }).finally(() => {
                updatingUsers.delete(username);
            });
        } else {
            console.log(`[Cache] Update already in progress for: ${username}, skipping...`);
        }
    } else {
        try {
            console.log(`[Fresh] Fetching data for: ${username}`);
            const result = await getPinnedRepos(username);
            cache.set(username, result);

            res.send(JSON.stringify(result, null, 4));
        } catch (error: any) {
            console.error(`[API Error] ${username}:`, error.message);
            const status = error.status || 500;
            let errorMessage = "Failed to fetch GitHub data";

            if (status === 404) {
                errorMessage = `GitHub user ${username} not found.`;
            } else if (status === 429) {
                errorMessage = "GitHub API rate limit exceeded. Please try again later.";
            }

            res.status(status).send({
                error: errorMessage,
                status: status
            });
        }
    }
});

const aimer = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = new Error(`GitHub error: ${res.statusText}`);
        (error as any).status = res.status; 
        throw error;
    }
    const html = await res.text();
    return cheerio.load(html);
}

async function getPinnedRepos(username: string) {
    try {
        const user = await aimer(`https://github.com/${username}`);
        
        // Check if the title contains 'Pinned'
        const isPinnedExist = user('h2:contains("Pinned")').length > 0;
        if (!isPinnedExist) {
            console.log(`[Info] User ${username} has no pinned repos, skipping popular repos.`);
            return [];
        }

        const pinned = user(".pinned-item-list-item").toArray();
        if (!pinned || pinned.length === 0) return [];

        const result = await Promise.all(pinned.map(async (item) => {
            const owner = getOwner(user, item) || username;
            const repo = getRepo(user, item);
            const link = `https://github.com/${owner}/${repo}`;
            const description = getDescription(user, item);
            const image = `https://opengraph.githubassets.com/1/${owner}/${repo}`;
            const website = await getWebsite(link);

            return {
                owner,
                repo,
                link,
                description,
                image,
                website: website || undefined,
                language: getLanguage(user, item) || undefined,
                languageColor: getLanguageColor(user, item) || undefined,
                stars: getStars(user, item) || 0,
                forks: getForks(user, item) || 0,
            };
        }));
        return result;
    } catch (error) {
        console.error(`Failed to fetch pinned repos for ${username}:`, error);
        throw error;
    }
}

function getOwner(user: cheerio.Root, item: cheerio.Element) {
    try {
        const owner = user(item).find(".owner").text().trim();
        return owner || undefined;
    } catch (error) {
        return undefined;
    }
}

function getRepo(user: cheerio.Root, item: cheerio.Element) {
    try {
        return user(item).find(".repo").text().trim();
    } catch (error) {
        return undefined;
    }
}

function getDescription(user: cheerio.Root, item: cheerio.Element) {
    try {
        return user(item).find(".pinned-item-desc").text().trim();
    } catch (error) {
        return undefined;
    }
}

function getHref(user: cheerio.Root, item: cheerio.Element) {
    try {
        return user(item).find('a[href^="https"]').attr("href")?.trim();
    } catch (error) {
        return undefined;
    }
}

function getWebsite(repo: string) {
    return aimer(repo).then((target) => {
        try {
            const site = target(".BorderGrid-cell");
            if (!site || site.length === 0) return [];
            let href;
            site.each((index, item) => {
                if (index == 0) href = getHref(target, item);
            });
            return href;
        } catch (error) {
            console.error(error);
            return undefined;
        }
    }).catch((error) => {
        console.error(error);
        return undefined;
    });
}

function getLanguage(user: cheerio.Root, item: cheerio.Element) {
    try {
        return user(item).find('[itemprop="programmingLanguage"]').text();
    } catch (error) {
        return undefined;
    }
}

function getLanguageColor(user: cheerio.Root, item: cheerio.Element) {
    try {
        return user(item).find(".repo-language-color").css("background-color");
    } catch (error) {
        return undefined;
    }
}

function getStars(user: cheerio.Root, item: cheerio.Element) {
    try {
        return Number(user(item).find('a[href$="/stargazers"]').text().trim());
    } catch (error) {
        return undefined;
    }
}

function getForks(user: cheerio.Root, item: cheerio.Element) {
    try {
        return Number(user(item).find('a[href$="/network/members"]').text().trim());
    } catch (error) {
        return undefined;
    }
}
