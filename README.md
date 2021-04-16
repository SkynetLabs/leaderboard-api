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
- skappName
### Responses


## Usage

There's a docker compose file that describes both services. To API will be
exposed at port 4000 by default.

```bash
docker-compose up -d
```
