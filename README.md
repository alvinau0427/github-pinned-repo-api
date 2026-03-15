# GitHub Pinned Repo API
![Banner](github/img/img_banner.png)

[![HTML](https://img.shields.io/badge/HTML-%23E34F26.svg?logo=html5&logoColor=white)](#) &nbsp;
[![CSS](https://img.shields.io/badge/CSS-639?logo=css&logoColor=fff)](#) &nbsp;
[![JavaScript](https://img.shields.io/badge/Javacript-F9AB00?logo=javascript&logoColor=white)](#) &nbsp;
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](#) &nbsp;
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) &nbsp;

> A high-performance API that retrieves **pinned repositories from a GitHub profile** using a dual-mode approach: **GitHub GraphQL API** (Primary) with **Cheerio Scraping** (Fallback).

## 📢 Important Notices
> [!IMPORTANT]
> The public Render instance at `https://github-pinned-repo-api.onrender.com` is best-effort. For production use, it is recommended to self-host this instance to ensure consistent availability.

## 🚀 Overview
**GitHub Pinned Repo API** provides a simple endpoint that returns pinned repository metadata in JSON format. It eliminates the complexity of authenticated requests and provides a "plug-and-play" solution for showcasing your best work.

The API is now upgraded with a **Hybrid Fetching Engine**, making it faster and more reliable than ever.

## ✨ Features
### 🌟 Core Features
- **Dual-Mode Fetching**: Automatically uses the **GitHub GraphQL API** for lightning-fast results. If no token is provided or the API is unavailable, it seamlessly falls back to **Optimized Web Scraping**.
- **Token-Flexibility**: Works out-of-the-box without a token (Scraper mode), but supports a Personal Access Token (PAT) for 10x faster performance.
- **Accurate Data Filtering**: Strictly returns Pinned Repositories. If a user has none, it returns an empty array `[]` instead of "Popular Repositories".
- **Clean & Standardized Output**: Returns consistent JSON structure regardless of the fetching method.

### ⚡ Performance & Reliability
- **Built-in Caching**: Uses `lru-cache` to store results (5-minute TTL), significantly reducing server load.
- **Request Collapsing (Locking)**: A smart mutex mechanism prevents redundant background updates when multiple requests hit the same profile simultaneously.
- **SWR Strategy**: Implements *Stale-While-Revalidate*—serves cached data instantly while refreshing the content in the background for the next visitor.
- **Robust Error Handling**: Handles 404 (User Not Found), 429 (Rate Limit), and API outages gracefully.

## 🛠️ Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js (TypeScript)
- **Data Fetching**: GitHub GraphQL API & Cheerio (Scraping Fallback)
- **Caching**: lru-cache
- **Environment**: Dotenv for secure token management

## 📖 API Usage
### Endpoint
```
GET /?username=:username
```

### Self-Hosting (Optional)
To enable the high-speed GraphQL mode, add your GitHub token to your environment variables:
1. Create a `.env` file in the root directory.
2. Add `GITHUB_TOKEN=your_personal_access_token`.

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
- Developer portfolio website
- GitHub profile dashboard
- Dynamic "Projects" section on personal landing pages
- Static site generator (SSG) integrations (Next.js, Hugo, Jekyll)

## License
- github-pinned-repo-api is released under the [MIT License](https://opensource.org/licenses/MIT).
```
Copyright (c) 2026 Alvin Au

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
