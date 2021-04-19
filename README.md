# Leaderboard API

## Introduction

This repository contains an express server that serves the leaderboard API. This
API serves content record data, scraped from the content record DAC. You will
need access to a mongo database holding these records. If you want to, you can
scrape these yourself. Check out the scraper
[here](https://github.com/SkynetLabs/content-record-scraper).

## API

### Routes
The API serves three main routes to support the leaderboard web app:

- skapp ranking
- content ranking
- user ranking

### Query String Parameters
By default all routes support pagination through the following query string
parameters: 

- skip (defaults to 0)
- limit (defaults to 20)

By default all routes support sorting through the following query string
parameters:

- sortBy (column name)
- sortDir (asc | desc)

Where it makes sense, the following filters can be applied:

- skylink
- userPK 
- skapp

### Responses

```json
// skapp ranking
[
  {
    "skapp": "snew.hns",
    "total": 2,
    "last24H": 0,
    "rank": 1
  }
]

// content ranking
[
  {
    "skylink": "AABZ0Kjn6DP08XAVunUFRbo6AQYhML9TJCKHtr35_k4HQw",
    "total": 1,
    "last24H": 0,
    "rank": 1
  },
  {
    "skylink": "AABJiWiYt823xEv5D8o0J7HyctPT1AdUS-_1hthF5GTfqg",
    "total": 1,
    "last24H": 0,
    "rank": 2
  }
]

// user ranking
[
  {
    "newContentLast24H": 0,
    "newContentTotal": 2,
    "interactionsLast24H": 0,
    "interactionsTotal": 0,
    "rank": 1
  }
]
```

## Usage

There's a docker compose file that describes both services. To API will be
exposed at port 4000 by default.

```bash
docker-compose up -d
```
