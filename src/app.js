"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const https_1 = __importDefault(require("https"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const path_1 = __importDefault(require("path"));
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const lru_cache_1 = __importDefault(require("lru-cache"));
const cheerio = __importStar(require("cheerio"));
const cron_1 = require("cron");
const app = (0, express_1.default)();
const port = 3000;
const options = { max: 500, maxSize: 500 };
const cache = new lru_cache_1.default(options);
const url = 'https://github-pinned-repo-api.onrender.com';
const cronJob = new cron_1.CronJob('*/14 * * * *', function () {
    try {
        https_1.default.get(url, (res) => {
            if (res.statusCode === 200) {
                console.log('Response Message: Server restarted');
            }
            else {
                console.error(`Response Error: failed to restart server with status code: ${res.statusCode}`);
            }
        }).on('error', (err) => {
            console.error(err.message);
        });
    }
    catch (e) {
        console.error(e);
    }
});
cronJob.start();
// Use CORS middleware for handling CORS
app.use((0, cors_1.default)({ origin: '*' }));
// Set up express middleware
app.use(express_1.default.static(path_1.default.join(__dirname, 'assets')));
app.use(body_parser_1.default.urlencoded({ extended: true }));
// Start server
app.listen(process.env.PORT || port, () => {
    console.log(`Server is listening on port: ${process.env.PORT || port}`);
});
// Define main route with cache and data fetching
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const username = req.query.username;
    if (!username) {
        res.set('Content-Type', 'text/html');
        res.sendFile(__dirname + "/view/index.html");
    }
    else {
        const strUsername = req.query.username;
        let result;
        const cachedResult = cache.get(strUsername);
        if (cachedResult) {
            result = cachedResult;
            getPinnedRepos(strUsername).then((data) => {
                cache.set(strUsername, data);
            }).catch((error) => { });
        }
        else {
            result = yield getPinnedRepos(strUsername);
            cache.set(strUsername, result);
        }
        res.set('Content-Type', 'application/json');
        res.set("Set-Cookie", 'nextPage=1; domain=localhost; maxAge=' + (1000 * 60 * 15));
        res.set("Cookie", 'nextPage=1; domain=localhost; maxAge=' + (1000 * 60 * 15));
        res.send(JSON.stringify(result, null, 4));
    }
}));
const aimer = (url) => __awaiter(void 0, void 0, void 0, function* () {
    const html = yield (0, cross_fetch_1.default)(url).then((res) => res.text());
    return cheerio.load(html);
});
function getPinnedRepos(username) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield aimer(`https://github.com/${username}`);
        const pinned = user(".pinned-item-list-item").toArray();
        if (!pinned || pinned.length === 0)
            return [];
        const result = [];
        for (const [index, item] of pinned.entries()) {
            const owner = getOwner(user, item);
            const repo = getRepo(user, item);
            const link = `https://github.com/${owner || username}/${repo}`;
            const description = getDescription(user, item);
            const image = `https://opengraph.githubassets.com/1/${owner || username}/${repo}`;
            const website = yield getWebsite(link);
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
    });
}
function getOwner(user, item) {
    try {
        return user(item).find(".owner").text();
    }
    catch (error) {
        return undefined;
    }
}
function getRepo(user, item) {
    try {
        return user(item).find(".repo").text();
    }
    catch (error) {
        return undefined;
    }
}
function getDescription(user, item) {
    try {
        return user(item).find(".pinned-item-desc").text().trim();
    }
    catch (error) {
        return undefined;
    }
}
function getHref(user, item) {
    var _a;
    try {
        return (_a = user(item).find('a[href^="https"]').attr("href")) === null || _a === void 0 ? void 0 : _a.trim();
    }
    catch (error) {
        return undefined;
    }
}
function getWebsite(repo) {
    return aimer(repo).then((target) => {
        try {
            const site = target(".BorderGrid-cell");
            if (!site || site.length === 0)
                return [];
            let href;
            site.each((index, item) => {
                if (index == 0)
                    href = getHref(target, item);
            });
            return href;
        }
        catch (error) {
            console.error(error);
            return undefined;
        }
    }).catch((error) => {
        console.error(error);
        return undefined;
    });
}
function getLanguage(user, item) {
    try {
        return user(item).find('[itemprop="programmingLanguage"]').text();
    }
    catch (error) {
        return undefined;
    }
}
function getLanguageColor(user, item) {
    try {
        return user(item).find(".repo-language-color").css("background-color");
    }
    catch (error) {
        return undefined;
    }
}
function getStars(user, item) {
    try {
        return Number(user(item).find('a[href$="/stargazers"]').text().trim());
    }
    catch (error) {
        return undefined;
    }
}
function getForks(user, item) {
    try {
        return Number(user(item).find('a[href$="/network/members"]').text().trim());
    }
    catch (error) {
        return undefined;
    }
}
