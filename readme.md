# beavertail: MySQL Structure Backup Tool
Each dbConf runs as a separate process. This tool backs up MySQL structures using commands like `show create view`, and generates:
- Executable SQL files that can be run again
- All generated SQL includes the corresponding database, so you can execute them without specifying the database
- Outputs are organized into folders by database

Integrations with other tools:
- Version control: Use `git` to version control logic such as stored procedures and views
- Code style: Use other beautifiers to unify SQL formatting
- Automated scheduling: Use pm2's scheduling to automate execution

Applicable objects include:
- Table structure
- View
- Event
- Stored procedure

## Difference from flyway
[flyway](https://github.com/flyway/flyway) is for database version control.
This tool aims to solve more specific problems:
- Extremely fast, simple, and lightweight
- Can withstand high-frequency execution
- Only backs up structure, not data
- Version control is left to the user to handle with their preferred git workflow

## Usage
### Requirements
- Ensure [pm2](https://pm2.keymetrics.io/docs/usage/quick-start/) is installed
- Run `npm i`
- Configure dbConfig.js
- `pm2 start beaver.config.js`
### Final report
```
0|db-WC-AAA  | 2025-06-26 00:38:17: [WC-AAA][SYNC_TABLE_STRUCTURE][LOG]:  dbTableList on: 1198 / 1203, StatisUsers.statis_s_mw3202505_users
0|db-WC-AAA  | 2025-06-26 00:38:17: [WC-AAA][SYNC_TABLE_STRUCTURE][LOG]:  dbTableList on: 1197 / 1203, StatisUsers.statis_s_gof2202505_users
0|db-WC-AAA  | 2025-06-26 00:38:17: [WC-AAA][SYNC_TABLE_STRUCTURE][LOG]:  dbTableList on: 1202 / 1203, StatisUsers.statis_allgames202505_users
0|db-WC-AAA  | 2025-06-26 00:38:17: [WC-AAA][SYNC_TABLE_STRUCTURE][LOG]:  writeSqlResItemRejected.length:  0
0|db-WC-AAA  | 2025-06-26 00:38:17: [WC-AAA][SYNC_TABLE_STRUCTURE][LOG]:  writeSqlResItemRejected:  []
0|db-WC-AAA  | 2025-06-26 00:38:17: [WC-AAA][SYNC_TABLE_STRUCTURE][LOG]:  timeStart: Thu Jun 26 2025 00:37:41 GMT+0900, timeEnd: Thu Jun 26 2025 00:38:17 GMT+0900
0|db-WC-AAA  | 2025-06-26 00:38:17: 
0|db-WC-AAA  | 2025-06-26 00:38:17:     ** [WC-AAA]
0|db-WC-AAA  | 2025-06-26 00:38:17:     missionResView: {"timeStart":"2025-06-25T15:37:34.939Z","timeEnd":"2025-06-25T15:37:36.144Z","rowDataNum":40,"rowDataRejected":0,"missionName":"[WC-AAA][SYNC_VIEW_STRUCTURE]"}
0|db-WC-AAA  | 2025-06-26 00:38:17:     missionResSp: {"timeStart":"2025-06-25T15:37:36.986Z","timeEnd":"2025-06-25T15:37:41.631Z","rowDataNum":207,"rowDataRejected":0,"missionName":"[WC-AAA][SYNC_SP]"}
0|db-WC-AAA  | 2025-06-26 00:38:17:     missionResEvent: {"timeStart":"2025-06-25T15:37:36.144Z","timeEnd":"2025-06-25T15:37:36.986Z","rowDataNum":41,"rowDataRejected":0,"missionName":"[WC-AAA][SYNC_EVENT]"}
0|db-WC-AAA  | 2025-06-26 00:38:17:     missionResTable: {"timeStart":"2025-06-25T15:37:41.631Z","timeEnd":"2025-06-25T15:38:17.763Z","rowDataNum":1203,"rowDataRejected":0,"missionName":"[WC-AAA][SYNC_TABLE_STRUCTURE]"}
0|db-WC-AAA  | 2025-06-26 00:38:17: 
0|db-WC-AAA  | 2025-06-26 00:38:17:     all mission completed
0|db-WC-AAA  | 2025-06-26 00:38:17:     timeStart: Thu Jun 26 2025 00:37:34 GMT+0900,
0|db-WC-AAA  | 2025-06-26 00:38:17:     timeEnd: Thu Jun 26 2025 00:38:17 GMT+0900
0|db-WC-AAA  | 2025-06-26 00:38:17:     ** [WC-AAA]
0|db-WC-AAA  | 2025-06-26 00:38:17:
```

## CONFIGS:
### dbConfig.js
Set the target connection
#### Output location
Folders are created based on the `connectionName` in dbConfig.js, organized by database:
- `WC-AAA/$DATABASE/EVENT/$EV_NAME`
- `WC-AAA/$DATABASE/StoreProcedure/$SP_NAME`
- `WC-AAA/$DATABASE/TABLE/$TB_NAME`
- `WC-AAA/$DATABASE/VIEW/$V_NAME`
### beaver.config.js
Select the target connection: WC-AAA | prod-aaa | prod-bbb
### start.js
Select the target to fetch: event | table | sp | view

## Required permissions to fetch targets
DB admin must grant permissions for show create event, show create view, etc.
If using a non-admin account, some items cannot be backed up.
  VIEWS: 
    `SELECT * FROM information_schema.VIEWS`
      This will list all views
    `SHOW CREATE VIEW ${schemaName}.${viewName}`
      But may result in a permission error:
        ```
          1142 - SHOW VIEW command denied to user 'JJ'@'1.0.0.127' for table 'ys_Account', Time: 0.490000s
        ```

## Main Logic
### `beaver.config.js` is the pm2 service configuration file
### `start.js` determines the sync type, e.g. SyncStoreProcedure or SyncViewStructure
### `index.js` implements the backup logic
- Fetch structure
- Format content
- Write to file
### `utils.js` standardizes console output
### `dbHelper.js` handles the connection pool