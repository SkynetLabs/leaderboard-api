# Leaderboard API

## Introduction

This repository contains an express server that serves the leaderboard API. This
API serves content record data, scraped from the content record DAC. You will
need access to a mongo database holding these records. If you want to, you can
scrape these yourself. Check out the scraper
[here](https://github.com/SkynetLabs/content-record-scraper).

## API

### Routes
The API serves four main routes to support the leaderboard web app:

- skapp ranking
- content ranking
- user ranking
- user content

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

- identifier
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
    "identifier": "AABZ0Kjn6DP08XAVunUFRbo6AQYhML9TJCKHtr35_k4HQw",
    "link": null,
    "total": 1,
    "last24H": 0,
    "rank": 1
  },
  {
    "identifier" : "sky://ed25519-b676e6191c8d8a164fe6097a0067b3a1abc92b25359e3493d4169089bd9edbe4/skyfeed-dev.hns/skytter.hns/posts/page_0.json#0",
    "link" : "sia://skychess.hns/#/watch/838bd76bde8ddfa24f2683fe0241b3c613b0818eeb87e2f74095d383433632e6",
    "total": 1,
    "last24H": 0,
    "rank": 2
  }
]

// user ranking
[
  {
    "userPK" : "89e5147864297b80f5ddf29711ba8c093e724213b0dcbefbc3860cc6d598cc35",
    "newContentLast24H" : 270,
    "newContentTotal" : 270,
    "interactionsLast24H" : 306,
    "interactionsTotal" : 306,
    "rank" : 1,
    "userMetadata" : {
        "mySkyProfile" : {
            "version" : 1,
            "profile" : {
                "username" : "dghelm",
                "emailID" : "",
                "firstName" : "Daniel",
                "lastName" : "Helm",
                "contact" : "",
                "aboutMe" : "",
                "location" : "Oklahoma City, OK",
                "topicsHidden" : [],
                "topicsDiscoverable" : [],
                "avatar" : {},
                "facebook" : "",
                "twitter" : "",
                "github" : "",
                "reddit" : "",
                "telegram" : ""
            },
            "lastUpdatedBy" : "awesomeskynet.hns",
            "historyLog" : [ 
                {
                    "updatedBy" : "awesomeskynet.hns",
                    "timestamp" : "2021-04-28T14:02:47.978Z"
                }
            ]
        }
    }
  }
]

// user content
[
    {
    "entryType": "NEWCONTENT",
    "userPK": "fbc7ab46a9c7f203dbf52e85a3ac124d4c89a09931269244941eeb96a35831f0",
    "skapp": "webgames-ide.hns",
    "identifier": "EACJ_bkB9JOeSSvECdnlQLvMEmZ0VNQWqe0G9POg_JicEA",
    "metadata": {
      "type": "SavedGame",
      "uri": "webgames-ide.hns/games/SpaceShooter.json",
      "prev": "CAC5ppiLl77n6f7Wy8naRvkjbN4L6mVVUhjlBgd1Zb1ecg",
      "skylinkMetadata": {
        "contentType": "application/json",
        "metadata": {
          "filename": "dk:efd521383526a8e7f7736b43c039caee62a54bba47b84f21c50cdde0ff088bb8",
          "length": 7947
        },
        "portalUrl": "https://siasky.net",
        "skylink": "sia:EACJ_bkB9JOeSSvECdnlQLvMEmZ0VNQWqe0G9POg_JicEA"
      }
    },
    "createdAt": "2021-04-28T11:52:41.000Z"
  }
]
```


## Usage

There's a docker compose file that describes both services. To API will be
exposed at port 4000 by default.

```bash
docker-compose up -d
```

## Deploying on Akash

[See the example deploy.yml](./deploy.yml) which can be deployed as-is on 
Akash, or customised to set your own domain or open access to the included 
MongoDB container.

Refer to the [Akash Docs](https://docs.akash.network/guides/deployment) for 
more information on deploying on Akash.
