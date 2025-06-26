const fs = require('fs');
const path = require('path');
const { getMysqlClientByName } = require('./dbHelper');
const { Utils } = require('./utils');
const sqlExecutionStringObj = {
  SELECT_SP_LIST: `SELECT * FROM information_schema.ROUTINES WHERE ROUTINE_TYPE = 'PROCEDURE' AND ( ROUTINE_SCHEMA != 'sys' AND ROUTINE_SCHEMA != 'mysql' );`,
  // handleIvalidString: (sqlString) => {
  //   const regex = /(:|\.)/
  //   const replaceStr = `\$1`
  //   const newStr = sqlString.replace(regex, replaceStr)
  //   this.utils.log('newStr: ',newStr)
  //   return newStr
  // },
  genShowCreateProcedure: (databaseName, tableName) => {
    // const retStr = `SHOW CREATE PROCEDURE ${databaseName}.${handleIvalidString(tableName)}`
    const retStr = `SHOW CREATE PROCEDURE ${databaseName}.\`${tableName}\`;`
    return retStr
  },

  SELECT_TRIGGER_LIST: `SELECT * FROM information_schema.triggers;`,
  // SHOW_TRIGGERS: `select trigger_schema, trigger_name, action_statement from information_schema.triggers`,

  SELECT_EVENT_ONLY_ENABLED_LIST: `SELECT * FROM information_schema.EVENTS WHERE EVENT_SCHEMA <> "mysql";`,
  // SELECT_EVENT_ONLY_ENABLED_LIST: `SELECT * FROM information_schema.EVENTS WHERE status='ENABLED'`,
  genShowCreateEvent: (databaseName, tableName) => `SHOW CREATE EVENT ${databaseName}.\`${tableName}\`;`,

  // SELECT_TABLE_WITHOUT_SYSTEM_LIST: `SELECT TABLE_SCHEMA, TABLE_NAME FROM information_schema.TABLES WHERE TABLE_TYPE <> "SYSTEM VIEW";`,
  SELECT_TABLE_WITHOUT_SYSTEM_LIST: `SELECT * FROM information_schema.TABLES WHERE TABLE_TYPE <> "SYSTEM VIEW" AND TABLE_TYPE <> "VIEW";`,
  genShowCreateTable: (databaseName, tableName) => `SHOW CREATE TABLE \`${databaseName}\`.\`${tableName}\`;`,
  /**
   * TODO: VIEWS
   */
  SELECT_VIEWS: `SELECT * FROM information_schema.VIEWS WHERE TABLE_SCHEMA <> "sys" AND TABLE_SCHEMA <> "mysql" ;`,
  genShowCreateView: (databaseName, tableName) => `SHOW CREATE VIEW \`${databaseName}\`.\`${tableName}\`;`,
}

class SyncMission {
  constructor(dbConfName) {
    this.clientMysql = getMysqlClientByName(dbConfName)
    this.mysqlSvrName = dbConfName
    this.utils = new Utils(dbConfName)
    this.info = {
      timeStart: 0,
      timeEnd: 0,
      rowDataNum: 0,
      rowDataRejected: 0,
    }
  }

  startSyncMysqlToLocalFileByDbConfName = async (dbConfName) => {
    this.info.timeStart = new Date
    await this.onExecuteSyncMission()
    return { ...this.info, ...this.utils }
  }

  onExecuteSyncMission = async () => { 
    /**
     * 在這裡面準備好 promise array
     */
    return this.executeBatch()
  }

  executeBatch = (writeSqlFilePromiseList) => {
    return new Promise(async (resolve, reject) => {
      try {
        this.info.rowDataNum = writeSqlFilePromiseList.length
        await Promise.allSettled(writeSqlFilePromiseList).then((writeSqlRes) => {
          const writeSqlResItemRejected = writeSqlRes.filter(writeSqlResItem => {
            if (writeSqlResItem.status === 'fulfilled') {
              // this.utils.log('resolve value: ', writeSqlResItem.value)
              return false
            } else if (writeSqlResItem.status === 'rejected') {
              this.utils.log('rejected writeSqlResItem: ', writeSqlResItem)
              return true
            }
          })
          this.info.rowDataRejected = writeSqlResItemRejected.length
          this.utils.log('writeSqlResItemRejected.length: ', writeSqlResItemRejected.length)
          this.utils.log('writeSqlResItemRejected: ', JSON.stringify(writeSqlResItemRejected))
          resolve(writeSqlRes)
        })
      } catch (error) {
        this.utils.log(error)
        reject(error)
      } finally {
        this.info.timeEnd = new Date
        this.utils.log(`timeStart: ${this.info.timeStart}, timeEnd: ${this.info.timeEnd}`)
      }
    })
  }

  writeSqlFileBySqlInfoItem = (spItem, spContent) => {
    const {
      ROUTINE_SCHEMA, //: 'CheckUsersScore',
      ROUTINE_NAME, //: 'sp_createStartEndScoreTable',
      ROUTINE_TYPE, //: 'PROCEDURE',
      // ROUTINE_TYPE_NAME = ROUTINE_TYPE == 'PROCEDURE' ? 'StoreProcedure' : ROUTINE_TYPE, //: 'PROCEDURE',
      // EVENT_SCHEMA, //: CheckUsersScore
      // EVENT_NAME, //: event_sp_StatisActivityUsersDayData_00_30
      sqlItemType, //: 'StoreProcedure' || 'Event' 
      sqlItemName, //: 'sp_createStartEndScoreTable' ||
      databaseName, //: 'CheckUsersScore' || 
      ROUTINE_DEFINITION,
      LAST_ALTERED, //: '2021-07-22 15:57:49',
    } = spItem
    const writePathDirStr = `./dolly/${this.mysqlSvrName}_one/DB_MIRROR/${databaseName}/${sqlItemType}`
    var pathDir = path.join(__dirname, writePathDirStr);
    const writePathFileStr = `${writePathDirStr}/${sqlItemName}.sql`
    var pathFile = path.join(__dirname, writePathFileStr);
    return this.writeFileAfterCheckDir(pathDir, pathFile, spContent)
  }

  mysqlSimpleQuery = (sqlExecutionString, sqlParam) => {
    return new Promise((resolve, reject) => {
      this.clientMysql.query(sqlExecutionString, sqlParam, (error, results) => {
        if (error) {
          reject(error, sqlExecutionString, sqlParam)
        } else {
          var count = results.length;
          // this.utils.log('result total count: ',count)
          resolve(results, sqlExecutionString, sqlParam)
        }
      });
    })
  }

  editDatabaseNameToCreateSPLine = (routineDefinition, spItem) => {
    // const regex = `CREATE DEFINER=\`root\`@\`%\` PROCEDURE \`(.*)\`\.\`(.*?\`)`
    // const regex = /CREATE DEFINER=\`root\`@\`%\` PROCEDURE \`(.*?\`)/
    // const replaceStr = `
    //   -- ----------------------------
    //   -- Procedure structure for ${spItem.ROUTINE_SCHEMA}.$1
    //   -- ----------------------------
    //   DROP PROCEDURE IF EXISTS \`${spItem.ROUTINE_SCHEMA}\`.\`$1;
    //   DELIMITER ;;
    //   CREATE PROCEDURE \`${spItem.ROUTINE_SCHEMA}\`.\`$1 `
    // const newStr = routineDefinition.replace(regex, replaceStr)
    // return newStr
  }

  writeFileAfterCheckDir = (pathDir, pathFile, content) => {
    return new Promise((resolve, reject) => {
      fs.access(pathDir, fs.constants.F_OK, (accErr) => {
        if (accErr) {
          // this.utils.log('dir not exesist: ', accErr)
          fs.mkdir(pathDir, { recursive: true }, (mkdirErr) => {
            if (mkdirErr) {
              this.utils.log('mkdir err: ', mkdirErr);
              reject(mkdirErr)
            }
            resolve(this.writeFileOne(pathFile, content));
          })
        } else {
          resolve(this.writeFileOne(pathFile, content));
        }
      })
    })
  }

  writeFileOne = (pathFile, content) => {
    return new Promise((resolve, reject) => {
      const retObj = { targetPath: pathFile }
      fs.writeFile(pathFile, content, (writeFileErr) => {
        if (writeFileErr) {
          this.utils.log('write file err: ', writeFileErr);
          // this.utils.log('write file err path: ',pathFile); 
          reject({ ...writeFileErr, code: 1, ...retObj })
        }
        else {
          // this.utils.log(`${pathFile} written successfully`); 
          resolve({ code: 0, ...retObj });
        }
      });
    })
  }
}

class SyncStoreProcedure extends SyncMission {
  constructor(dbConfName) {
    super(dbConfName);
    this.utils = new Utils(`${dbConfName}`, 'SYNC_SP')
  }
  onExecuteSyncMission = async () => {
    /**
     * queryList()
     * onExecuteSyncMissionQueryList()
     * 
     * mission step-1
     * sql query stage-1
     * 取得 第一階段的詢問清單
     */
    const dbSpListOne = await this.mysqlSimpleQuery(sqlExecutionStringObj.SELECT_SP_LIST)
    this.utils.log('dbSpListOne.len: ', dbSpListOne.length)
    // const dbSpList = dbSpListOne.filter(spItem => {
    //   // 0|beavertail  | 2024-09-11 15:18:54: spItem:  RowDataPacket {
    //   //   0|beavertail  | 2024-09-11 15:18:54:   SPECIFIC_NAME: 'updateAgentWallet',
    //   //   0|beavertail  | 2024-09-11 15:18:54:   ROUTINE_CATALOG: 'def',
    //   //   0|beavertail  | 2024-09-11 15:18:54:   ROUTINE_SCHEMA: 'wallet',
    //   //   0|beavertail  | 2024-09-11 15:18:54:   ROUTINE_NAME: 'updateAgentWallet',
    //   //   0|beavertail  | 2024-09-11 15:18:54:   ROUTINE_TYPE: 'PROCEDURE',
    //   //   0|beavertail  | 2024-09-11 15:18:54:   DATA_TYPE: '',
    //   //   0|beavertail  | 2024-09-11 15:18:54:   CHARACTER_MAXIMUM_LENGTH: null,
    //   //   0|beavertail  | 2024-09-11 15:18:54:   CHARACTER_OCTET_LENGTH: null,
    //   //   0|beavertail  | 2024-09-11 15:18:54:   NUMERIC_PRECISION: null,
    //   //   0|beavertail  | 2024-09-11 15:18:54:   NUMERIC_SCALE: null,
    //   //   0|beavertail  | 2024-09-11 15:18:54:   DATETIME_PRECISION: null,
    //   //   0|beavertail  | 2024-09-11 15:18:54:   CHARACTER_SET_NAME: null,
    //   //   0|beavertail  | 2024-09-11 15:18:54:   COLLATION_NAME: null,
    //   //   0|beavertail  | 2024-09-11 15:18:54:   DTD_IDENTIFIER: null,
    //   //   0|beavertail  | 2024-09-11 15:18:54:   ROUTINE_BODY: 'SQL',
    //   //   0|beavertail  | 2024-09-11 15:18:54:   ROUTINE_DEFINITION: 'BEGIN\n' +
    //   const { ROUTINE_SCHEMA } = spItem
    //   return 
    // })
    const dbSpList = dbSpListOne.filter(v => true)
    const writeSqlFilePromiseList = dbSpList.map(async (spItem, spIdx) => {
      // if (spItem.ROUTINE_NAME == 'sp_StatisUsersScoreData_1.0.0') return
    /**
      * queryEachItem()
      * onExecuteSyncMissionEachQueryItem()
      * 
      * mission step-2
      * sql query stage-2
      * 根據 詢問清單，逐項獲取詳情
      */
      const { ROUTINE_SCHEMA, ROUTINE_NAME } = spItem
      const queryStr = `${sqlExecutionStringObj.genShowCreateProcedure(ROUTINE_SCHEMA, ROUTINE_NAME)}`
      const spContent = await this.mysqlSimpleQuery(queryStr).then(resShowCrProcedure => {
        /**
        * editEachItemContent()
        * onExecuteSyncMissionEachEditItemContent()
        * 
        * mission step-3
         * 將數據庫中拿出來的內容
         * 以正則將格式調整成模板格式
         */
        return this.editDatabaseNameToCreateSPLine(resShowCrProcedure[0]['Create Procedure'], spItem)
      })
      /**
      * saveEachItem()
      * onExecuteSyncMissionEachSaveItem()
      * 
      * mission step-4
       * 將調整好的完整內容
       * 寫入指定資料夾位置
       */
      const sqlInfoItem = { databaseName: ROUTINE_SCHEMA, sqlItemName: ROUTINE_NAME, sqlItemType: 'StoreProcedure' }
      this.utils.log(`dbSpList on: ${spIdx} / ${dbSpList.length}, ${ROUTINE_SCHEMA}.${ROUTINE_NAME}`)
      return this.writeSqlFileBySqlInfoItem(sqlInfoItem, spContent)
    })
    return this.executeBatch(writeSqlFilePromiseList)
  }
  editDatabaseNameToCreateSPLine = (routineDefinition, spItem) => {
    // const regex = `CREATE DEFINER=\`root\`@\`%\` PROCEDURE \`(.*)\`\.\`(.*?\`)`
    const regex = /CREATE DEFINER=\`root\`@\`%\` PROCEDURE \`(.*?\`)/
    const replaceStr = `
  -- ----------------------------
  -- Procedure structure for ${spItem.ROUTINE_SCHEMA}.$1
  -- ----------------------------
  DROP PROCEDURE IF EXISTS \`${spItem.ROUTINE_SCHEMA}\`.\`$1;
  DELIMITER ;;
  CREATE PROCEDURE \`${spItem.ROUTINE_SCHEMA}\`.\`$1 `
    const newStr = routineDefinition.replace(regex, replaceStr)
    return newStr
  }
}

class SyncEvents extends SyncMission {
  constructor(dbConfName) {
    super(dbConfName);
    this.utils = new Utils(`${dbConfName}`, 'SYNC_EVENT')
  }
  onExecuteSyncMission = async () => {
    /**
     * queryList()
     * onExecuteSyncMissionQueryList()
     * 
     * mission step-1
     * sql query stage-1
     * 取得 第一階段的詢問清單
     */
    const dbEventList = await this.mysqlSimpleQuery(sqlExecutionStringObj.SELECT_EVENT_ONLY_ENABLED_LIST)
    this.utils.log('dbEventList.len: ', dbEventList.length)
    const writeSqlFilePromiseList = dbEventList.map(async (evnetItem, evIdx) => {
      const { EVENT_SCHEMA, EVENT_NAME, INTERVAL_VALUE, INTERVAL_FIELD, STARTS, ON_COMPLETION, STATUS, EVENT_DEFINITION, } = evnetItem
      // const startStr = JSON.stringify(STARTS).replace(/T/g,' ')?.replace(/\.000Z/g,'')
      // const tempEvent = `CREATE EVENT \`${EVENT_SCHEMA}\`.\`${EVENT_NAME}\`  ON SCHEDULE EVERY ${INTERVAL_VALUE} ${INTERVAL_FIELD} STARTS ${startStr} ON COMPLETION ${ON_COMPLETION} ${STATUS} DO ${EVENT_DEFINITION}`
      // this.utils.log(`tempEvent:
      // ${tempEvent}
      // `)

      // evnetItem:  RowDataPacket {
      //   EVENT_CATALOG: 'def',
      //   EVENT_SCHEMA: 'StatisUsers',
      //   EVENT_NAME: 'event_01_20_sp_StatisUsersDayData_allusers',
      //   DEFINER: 'root@%',
      //   TIME_ZONE: 'UTC',
      //   EVENT_BODY: 'SQL',
      //   EVENT_DEFINITION: 'call StatisUsers.sp_StatisUsersDayData_allusers(null)',
      //   EVENT_TYPE: 'RECURRING',
      //   EXECUTE_AT: null,
      //   INTERVAL_VALUE: '1',
      //   INTERVAL_FIELD: 'DAY',
      //   SQL_MODE: 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION',
      //   STARTS: '2021-06-22 03:20:00',
      //   ENDS: null,
      //   STATUS: 'ENABLED',
      //   ON_COMPLETION: 'NOT PRESERVE',
      //   CREATED: '2021-07-22 16:16:31',
      //   LAST_ALTERED: '2022-08-01 23:42:28',
      //   LAST_EXECUTED: '2023-12-21 03:20:00',
      //   EVENT_COMMENT: '',
      //   ORIGINATOR: 1826322393,
      //   CHARACTER_SET_CLIENT: 'utf8mb4',
      //   COLLATION_CONNECTION: 'utf8mb4_general_ci',
      //   DATABASE_COLLATION: 'utf8mb4_bin'
      // }
    /**
      * queryEachItem()
      * onExecuteSyncMissionEachQueryItem()
      * 
      * mission step-2
      * sql query stage-2
      * 根據 詢問清單，逐項獲取詳情
      */
      // const { EVENT_SCHEMA, EVENT_NAME } = evnetItem
      const queryStr = `${sqlExecutionStringObj.genShowCreateEvent(EVENT_SCHEMA, EVENT_NAME)}`
      const eventContent = await this.mysqlSimpleQuery(queryStr).then(resShowEvent => {
        this.utils.log('create event: ',resShowEvent[0]['Create Event'])
        /**
        * editEachItemContent()
        * onExecuteSyncMissionEachEditItemContent()
        * 
        * mission step-3
         * 將數據庫中拿出來的內容
         * 以正則將格式調整成模板格式
         */
        return this.editDatabaseNameToCreateEventLine(resShowEvent[0]['Create Event'], evnetItem)
      })
      /**
      * saveEachItem()
      * onExecuteSyncMissionEachSaveItem()
      * 
      * mission step-4
       * 將調整好的完整內容
       * 寫入指定資料夾位置
       */
      const sqlInfoItem = { databaseName: EVENT_SCHEMA, sqlItemName: EVENT_NAME, sqlItemType: 'Event' }
      // this.utils.log(`dbEventList on: ${evIdx} / ${dbEventList.length}, ${EVENT_SCHEMA}.${EVENT_NAME}`)
      return this.writeSqlFileBySqlInfoItem(sqlInfoItem, eventContent)
      // return this.writeSqlFileBySqlInfoItem(sqlInfoItem, tempEvent)
    })
    return this.executeBatch(writeSqlFilePromiseList)
  }
  editDatabaseNameToCreateEventLine = (routineDefinition, evnetItem) => {
    // this.utils.log('routineDefinition: ', routineDefinition)
    const regex = /CREATE DEFINER=\`root\`@\`%\` EVENT \`(.*?\`)/
    const replaceStr = `
  -- ----------------------------
  -- Event structure for ${evnetItem.EVENT_SCHEMA}.$1
  -- ----------------------------
  DROP EVENT IF EXISTS \`${evnetItem.EVENT_SCHEMA}\`.\`$1;
  CREATE EVENT \`${evnetItem.EVENT_SCHEMA}\`.\`$1 `
    const newStr = routineDefinition.replace(regex, replaceStr)
    return `${newStr}
  DELIMITER ;;`
  }
}

class SyncTablesStructure extends SyncMission {
  constructor(dbConfName) {
    super(dbConfName);
    this.utils = new Utils(`${dbConfName}`, 'SYNC_TABLE_STRUCTURE')
  }
  onExecuteSyncMission = async () => {
    const dbTableListOne = await this.mysqlSimpleQuery(sqlExecutionStringObj.SELECT_TABLE_WITHOUT_SYSTEM_LIST)
    this.utils.log('dbTableListOne.len: ', dbTableListOne.length)
    const dbTableList = dbTableListOne.filter(({TABLE_SCHEMA, TABLE_NAME}) => {
      const tableFullName = `${TABLE_SCHEMA}.${TABLE_NAME}`
      const regexArray = [
        /StatisUsers_EST\.statis_.*202.*_users/,
        /StatisUsers_BST\.statis_.*202.*_users/,
        /StatisUsers\.statis_.*202.*_users/,
        /StatisUsers\.statis_.*202.*_users_room/,
        /StatisUsers\.statis_month202.*_users/,
        // /Transfer_StatisUsers\.statis_.*202.*_users/,
        // /Transfer_StatisUsers\.statis_.*202.*_users_room/,
        // timerTask.s_timeChecklist20240812
        /timerTask\..*_timeChecklist202.*/,
        /_record\..*Record202.*/,
        /_record\..*orders202.*/,
      ]
      const excludeSchemaArray = [
        'Transfer_StatisUsers_EST',
        'Transfer_StatisUsers',
        'performance_schema',
        'sys',
        'mysql',
      ]
      const excludeCondition = 
        !regexArray.some(regex => regex.test(tableFullName)) && 
        !excludeSchemaArray.some(schemaName => schemaName === TABLE_SCHEMA)
      return excludeCondition
    })
    this.utils.log('dbTableList.len: ', dbTableList.length)
    // return 
    // const writeSqlFilePromiseList = [dbTableList[0]].map(async (tableItem, tbIdx) => {
    const writeSqlFilePromiseList = dbTableList.map(async (tableItem, tbIdx) => {
      const { TABLE_SCHEMA, TABLE_NAME } = tableItem
/**
 * 0|beavertail  | 2024-09-09 16:44:57: [fusion__wc1][SYNC_TABLE_STRUCTURE][LOG]:  sqlInfoItem:  {
0|beavertail  | 2024-09-09 16:44:57:   databaseName: 'DB_NEW',
0|beavertail  | 2024-09-09 16:44:57:   sqlItemName: 'GameDispose',
0|beavertail  | 2024-09-09 16:44:57:   sqlItemType: 'Table'
0|beavertail  | 2024-09-09 16:44:57: }
0|beavertail  | 2024-09-09 16:44:57: [fusion__wc1][SYNC_TABLE_STRUCTURE][LOG]:  resDescTableArr:  [
0|beavertail  | 2024-09-09 16:44:57:   RowDataPacket {
0|beavertail  | 2024-09-09 16:44:57:     Table: 'Game_HT_UserOrderDetails',
0|beavertail  | 2024-09-09 16:44:57:     'Create Table': 'CREATE TABLE `Game_HT_UserOrderDetails` (\n' +
0|beavertail  | 2024-09-09 16:44:57:       "  `OrderID` bigint(20) NOT NULL DEFAULT '0',\n" +
0|beavertail  | 2024-09-09 16:44:57:       '  `OrderTime` datetime DEFAULT NULL,\n' +
0|beavertail  | 2024-09-09 16:44:57:       '  `ChannelID` int(10) DEFAULT NULL,\n' +
0|beavertail  | 2024-09-09 16:44:57:       '  `UserID` int(10) DEFAULT NULL,\n' +
0|beavertail  | 2024-09-09 16:44:57:       '  `Accounts` varchar(190) DEFAULT NULL,\n' +
0|beavertail  | 2024-09-09 16:44:57:       '  `OrderType` int(5) DEFAULT NULL,\n' +
0|beavertail  | 2024-09-09 16:44:57:       '  `CurScore` bigint(20) DEFAULT NULL,\n' +
0|beavertail  | 2024-09-09 16:44:57:       '  `AddScore` bigint(20) DEFAULT NULL,\n' +
0|beavertail  | 2024-09-09 16:44:57:       '  `NewScore` bigint(20) DEFAULT NULL,\n' +
0|beavertail  | 2024-09-09 16:44:57:       '  `OrderIP` varchar(50) DEFAULT NULL,\n' +
0|beavertail  | 2024-09-09 16:44:57:       '  `CreateUser` varchar(50) DEFAULT NULL,\n' +
0|beavertail  | 2024-09-09 16:44:57:       "  `currency` varchar(50) NOT NULL COMMENT '币别',\n" +
0|beavertail  | 2024-09-09 16:44:57:       '  PRIMARY KEY (`OrderID`)\n' +
0|beavertail  | 2024-09-09 16:44:57:       ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
0|beavertail  | 2024-09-09 16:44:57:   }
0|beavertail  | 2024-09-09 16:44:57: ]
 */
      const queryStr = `${sqlExecutionStringObj.genShowCreateTable(TABLE_SCHEMA, TABLE_NAME)}`
      // this.utils.log('queryStr: ', queryStr)
      const descTableArr = await this.mysqlSimpleQuery(queryStr).then(resDescTableArr => {
        // this.utils.log('resDescTableArr: ', resDescTableArr)
        return this.editDatabaseNameToCreateTableLine(resDescTableArr[0]['Create Table'], tableItem)
      })
      const sqlInfoItem = { databaseName: TABLE_SCHEMA, sqlItemName: TABLE_NAME, sqlItemType: 'Table' }
      // this.utils.log('sqlInfoItem: ', sqlInfoItem)
      this.utils.log(`dbTableList on: ${tbIdx} / ${dbTableList.length}, ${TABLE_SCHEMA}.${TABLE_NAME}`)
      return this.writeSqlFileBySqlInfoItem(sqlInfoItem, descTableArr)
    })
    return this.executeBatch(writeSqlFilePromiseList)
  }
  editDatabaseNameToCreateTableLine = (routineDefinition, tableItem) => {
    if (!routineDefinition) {
      this.utils.log('routineDefinition: ', routineDefinition)
      this.utils.log('tableItem: ', tableItem)
    }
    let newStr = ''
    newStr = routineDefinition.replace(...regexRules.tableReplaceHeader(tableItem))
    newStr = newStr.replace(...regexRules.tableDismissAutoIncre())
    newStr = newStr.replace(...regexRules.tableDismissPartition())
    // this.utils.log('newStr: ', newStr)
    return `${newStr};`
  }
}

const regexRules = {
  tableReplaceHeader: (tableItem) => [
    /CREATE TABLE \`(.*?\`)/,
    `
  -- ----------------------------
  -- TABLE structure for ${tableItem.TABLE_SCHEMA}.$1
  -- ----------------------------
  CREATE TABLE \`${tableItem.TABLE_SCHEMA}\`.\`$1 `
  //   `
  // -- ----------------------------
  // -- TABLE structure for ${tableItem.TABLE_SCHEMA}.$1
  // -- ----------------------------
  // DROP TABLE IF EXISTS \`${tableItem.TABLE_SCHEMA}\`.\`$1;
  // CREATE TABLE \`${tableItem.TABLE_SCHEMA}\`.\`$1 `
  ],
  //   /**
  //    * CREATE TABLE `ActivityAlarm` (
  //    * 將這個換成帶有 database 的
  //    * CREATE TABLE `DB_NEW`.`ActivityAlarm`  (
  //    */
  //   const regex = /CREATE TABLE \`(.*?\`)/
  //   //   const replaceStr = `
  //   // -- ----------------------------
  //   // -- TABLE structure for ${tableItem.TABLE_SCHEMA}.$1
  //   // -- ----------------------------
  //   // DROP TABLE IF EXISTS \`${tableItem.TABLE_SCHEMA}\`.\`$1; -- 請確定知道你在幹嘛
  //   // CREATE TABLE \`${tableItem.TABLE_SCHEMA}\`.\`$1 `
  //   const replaceStr = `
  // -- ----------------------------
  // -- TABLE structure for ${tableItem.TABLE_SCHEMA}.$1
  // -- ----------------------------
  // CREATE TABLE \`${tableItem.TABLE_SCHEMA}\`.\`$1 `

  tableDismissAutoIncre: () => [/ENGINE=InnoDB (AUTO_INCREMENT=\d*?) DEFAULT/,'ENGINE=InnoDB DEFAULT'],
//   // ) ENGINE=InnoDB AUTO_INCREMENT=11910693 DEFAULT CHARSET=utf8mb4
// const regex = /ENGINE=InnoDB (AUTO_INCREMENT=\d*?) DEFAULT/
// const replaceStr = 'ENGINE=InnoDB DEFAULT'
// // ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
//     const newStr = tableContent.replace(regex, replaceStr)

// // ) ENGINE=InnoDB AUTO_INCREMENT=11910693 DEFAULT CHARSET=utf8mb4
//     const regex = /AUTO_INCREMENT=(\d*?) DEFAULT/
//     const replaceStr = 'AUTO_INCREMENT=$1 DEFAULT'
//     const newStr = tableContent.replace(regex, replaceStr)
  tableDismissPartition: () => [/\(PARTITION(.|\n)+/,''],
// //  (PARTITION p_202410 VALUES LESS THAN (1727712000) ENGINE = InnoDB,
// //  PARTITION p_202411 VALUES LESS THAN (1730390400) ENGINE = InnoDB,
// //  PARTITION p_202502 VALUES LESS THAN (1738339200) ENGINE = InnoDB) */;
//     const regex = /\(PARTITION(.|\n)+/
//     const replaceStr = ''
//     const newStr = tableContent.replace(regex, replaceStr)
}

// class RegexRule extends String {
//   constructor(dbConfName) {
//     super(dbConfName);
//     this.utils = new Utils(`${dbConfName}`, 'SYNC_VIEW_STRUCTURE')
//   }
// }

class SyncViewStructure extends SyncMission {
  constructor(dbConfName) {
    super(dbConfName);
    this.utils = new Utils(`${dbConfName}`, 'SYNC_VIEW_STRUCTURE')
  }
  onExecuteSyncMission = async () => {
    this.utils.log('onExecuteSyncMission')
    const dbViewListOne = await this.mysqlSimpleQuery(sqlExecutionStringObj.SELECT_VIEWS)
    this.utils.log('dbViewListOne.len: ', dbViewListOne.length)
    const dbViewList = dbViewListOne
    // const dbViewList = dbViewListOne.filter(({TABLE_SCHEMA, TABLE_NAME},idx) => {
    //   return idx < 3 ? true : false;
    // })
    this.utils.log('dbViewList.len: ', dbViewList.length)
    const writeSqlFilePromiseList = dbViewList.map(async (tableItem, tbIdx) => {
      const { TABLE_SCHEMA, TABLE_NAME } = tableItem
      const queryStr = `${sqlExecutionStringObj.genShowCreateView(TABLE_SCHEMA, TABLE_NAME)}`
      // this.utils.log('queryStr: ', queryStr)
      const descTableArr = await this.mysqlSimpleQuery(queryStr).then(resDescTableArr => {
        // this.utils.log('resDescTableArr: ', resDescTableArr)
        return this.editDatabaseNameToCreateViewLine(resDescTableArr[0]['Create View'], tableItem)
      })
      const sqlInfoItem = { databaseName: TABLE_SCHEMA, sqlItemName: TABLE_NAME, sqlItemType: 'View' }
      // this.utils.log('sqlInfoItem: ', sqlInfoItem)
      this.utils.log(`dbViewList on: ${tbIdx} / ${dbViewList.length}, ${TABLE_SCHEMA}.${TABLE_NAME}`)
      return this.writeSqlFileBySqlInfoItem(sqlInfoItem, descTableArr)
    })
    return this.executeBatch(writeSqlFilePromiseList)
  }


  editDatabaseNameToCreateViewLine = (routineDefinition, tableItem) => {
    if (!routineDefinition) {
      this.utils.log('routineDefinition: ', routineDefinition)
      this.utils.log('tableItem: ', tableItem)
    }
    const regex = /.*^.*?VIEW/
    const replaceStr = `
  -- ----------------------------
  -- VIEW structure for ${tableItem.TABLE_SCHEMA}.${tableItem.TABLE_NAME}
  -- ----------------------------
  CREATE OR REPLACE VIEW `
    const newStr = routineDefinition.replace(regex, replaceStr)
    return `${newStr};`
  }
}

module.exports = {
  SyncMission,
  SyncStoreProcedure,
  SyncEvents,
  SyncTablesStructure,
  SyncViewStructure,
}