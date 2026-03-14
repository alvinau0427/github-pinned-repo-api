# GitHub Pinned Repo API
![Banner](github/img/img_banner.png)

[![HTML](https://img.shields.io/badge/HTML-%23E34F26.svg?logo=html5&logoColor=white)](#) &nbsp;
[![CSS](https://img.shields.io/badge/CSS-639?logo=css&logoColor=fff)](#) &nbsp;
[![JavaScript](https://img.shields.io/badge/Javacript-F9AB00?logo=javascript&logoColor=white)](#) &nbsp;
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](#) &nbsp;
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) &nbsp;

> A lightweight API that retrieves **pinned repositories from a GitHub profile without requiring a Personal Access Token (PAT)**.

## 📢 Important Notices
> [!IMPORTANT]
> The public Render instance at `https://github-pinned-repo-api.onrender.com` is best-effort. For production use, it is recommended to self-host this instance to ensure consistent availability.

## 🚀 Overview
**GitHub Pinned Repo API** provides a simple endpoint that returns pinned repository metadata in JSON format. It solves the complexity of authenticated requests and provides a "plug-and-play" solution for showcasing your best work.

The API is designed to be:
- **Zero-Config**: No GitHub tokens or OAuth required.
- **Performant**: Built-in caching and optimized request handling.
- **Reliable**: Smart filtering to ensure only manually pinned repos are returned.

## ✨ Features
### 🌟 Core Features
- **Token‑free**: Fetch data from any public profile without hitting restrictive GitHub API limits.
- **Simple REST Interface**: Clean JSON responses ready for React, Vue, or vanilla JS.
- **Accurate Data Filtering**: Strictly returns Pinned Repositories. If a user has none, it returns an empty array `[]` instead of "Popular Repositories".
- **Clean Output**: Automatically sanitizes data by stripping whitespace and newline characters from GitHub's HTML.

### ⚡ Performance & Reliability
- **Built-in Caching**: Uses `lru-cache` to store results (5-minute TTL), significantly reducing server load.
- **Request Collapsing (Locking)**: A smart mutex mechanism prevents redundant background updates when multiple requests hit the same profile simultaneously.
- **SWR Strategy**: Implements *Stale-While-Revalidate*—serves cached data instantly while refreshing the content in the background for the next visitor.
- **Robust Error Handling**: Proper JSON error responses for 404 (User Not Found) or 429 (Rate Limit) scenarios.

## 🛠️ Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js (TypeScript)
- **Scraping**: Cheerio (Optimized HTML parsing)
- **Caching**: lru-cache
- **Deployment**: Render

## 📖 API Usage
### Endpoint
```
GET /?username=:username
```

### Example Request
```
https://github-pinned-repo-api.onrender.com/?username=alvinau0427
```

### Example Response
``` json
[
    {
        "owner": "alvinau0427",
        "repo": "github-pinned-repo-api",
        "link": "https://github.com/alvinau0427/github-pinned-repo-api",
        "description": "Get GitHub pinned repository contents without using personal access token",
        "image": "https://opengraph.githubassets.com/1/alvinau0427/github-pinned-repo-api",
        "website": "https://github-pinned-repo-api.onrender.com",
        "language": "JavaScript",
        "languageColor": "#f1e05a",
        "stars": 1,
        "forks": 0
    }
]
```

## 🎯 Use Cases
This API can be used for:
- Developer portfolio websites
- GitHub profile dashboards
- Dynamic "Projects" section on personal landing pages.
- Static site generator (SSG) integrations.

## License
- github-pinned-repo-api is released under the [MIT License](https://opensource.org/licenses/MIT).
```
Copyright (c) 2026 alvinau0427

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
