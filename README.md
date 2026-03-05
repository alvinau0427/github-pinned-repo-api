# GitHub Pinned Repo API
A lightweight API that retrieves **pinned repositories from a GitHub
profile without requiring a Personal Access Token (PAT)**.

This project provides a simple way for developers to fetch pinned
repository information for use in **portfolios, dashboards, or personal
websites** without dealing with GitHub authentication or rate‑limit
complexities.

![Banner](github/img/img_banner.png)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview
GitHub allows users to pin repositories to their profile, but accessing
this information programmatically typically requires authenticated
requests or complex scraping.

**GitHub Pinned Repo API** provides a simple endpoint that returns
pinned repository metadata in JSON format.

The API is designed to be:
-   Simple to integrate
-   Lightweight
-   Token‑free
-   Suitable for personal portfolio projects

## Features
-   Retrieve pinned repositories from any public GitHub profile
-   No GitHub Personal Access Token required
-   Simple REST API interface
-   JSON formatted response
-   Easy integration with frontend frameworks (React, Vue, etc.)
-   Lightweight backend service

## API Usage
### Endpoint
```
GET /api/:username
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

## Use Cases
This API can be used for:
-   Developer portfolio websites
-   GitHub profile dashboards
-   Personal landing pages
-   Developer widgets
-   Static site integrations

## Tech Stack
-   Node.js
-   Express.js
-   Web scraping / HTML parsing
-   Hosted on Cyclic

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
