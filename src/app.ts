import express from 'express';
import https from 'https';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fetch from 'cross-fetch';
import LRU from 'lru-cache';
import * as cheerio from 'cheerio';
import { CronJob } from 'cron';

const app = express();
const port = 3000;
const options = { max: 500, maxSize: 500 };
const cache = new LRU(options);
const url = 'https://github-pinned-repo-api.onrender.com';

const cronJob = new CronJob('*/14 * * * *', function() {
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

app.use(cors({ origin: '*' }));

app.listen(process.env.PORT || port, () => {
  console.log(`Server is listening on port: ${process.env.PORT || port}`);
});

app.use(express.static(path.join(__dirname, 'assets')));
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.append('Access-Control-Allow-Origin', ['*']);
  res.append('Access-Control-Request-Method', ['*']);
  res.append('Access-Control-Allow-Credentials', ['true']);
  res.append('Access-Control-Allow-Methods', 'OPTIONS, GET');
  res.append('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/', async(req, res) => {
  const username = req.query.username;
  if (!username) {
    res.set('Content-Type', 'text/html');
    res.sendFile(__dirname + "/view/index.html");
  } else {
    const strUsername = (req.query as any).username;
    let result;
    const cachedResult = cache.get(strUsername);
    if (cachedResult) {
      result = cachedResult;
      getPinnedRepos(strUsername).then((data) => {
        cache.set(strUsername, data);
      }).catch((error) => {});
    } else {
      result = await getPinnedRepos(strUsername);
      cache.set(strUsername, result);
    }
    res.set('Content-Type', 'application/json');
    res.set("Set-Cookie", 'nextPage=1; domain=localhost; maxAge=' + (1000 * 60 * 15));
    res.set("Cookie", 'nextPage=1; domain=localhost; maxAge=' + (1000 * 60 * 15));
    res.send(JSON.stringify(result, null, 4));
  }
});

const aimer = async (url: string) => {
  const html = await fetch(url).then((res) => res.text());
  return cheerio.load(html);
}

async function getPinnedRepos(username: string) {
  const user = await aimer(`https://github.com/${username}`);
  const pinned = user(".pinned-item-list-item").toArray();

  if (!pinned || pinned.length === 0) return [];
  const result: any[] = [];
  for (const [index, item] of pinned.entries()) {
    const owner = getOwner(user, item);
    const repo = getRepo(user, item);
    const link = `https://github.com/${owner || username}/${repo}`;
    const description = getDescription(user, item);
    const image = `https://opengraph.githubassets.com/1/${owner || username}/${repo}`;
    const website = await getWebsite(link);
    const language = getLanguage(user, item);
    const languageColor = getLanguageColor(user, item);
    const stars = getStars(user, item);
    const forks = getForks(user, item);

    result[index] = {
      owner: owner || username,
      repo,
      link,
      description: description || undefined,
      image: image,
      website: website || undefined,
      language: language || undefined,
      languageColor: languageColor || undefined,
      stars: stars || 0,
      forks: forks || 0,
    };
  }
  return result;
}

function getOwner(user: cheerio.Root, item: cheerio.Element) {
  try {
    return user(item).find(".owner").text();
  } catch (error) {
    return undefined;
  }
}

function getRepo(user: cheerio.Root, item: cheerio.Element) {
  try {
    return user(item).find(".repo").text();
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
