
const { dbConf } = require('./dbConfig')
const {
  SyncStoreProcedure,
  SyncMission,
  SyncEvents,
  // SyncStatisInfo,
  SyncTablesStructure,
  SyncViewStructure,
} = require('./index')
const connName = process.argv[2]
// process.execArgv.forEach(function (val, index, array) {
//   console.log(index + ': ' + val);
// });

const MYSQL_SVR_NAME_COLLENTION = dbConf.map(({connectionName}) => connectionName)
const info = {
  timeStart: 0,
  timeEnd: 0,
}
MYSQL_SVR_NAME_COLLENTION.map( async (dbConfName,dbConfIdx) => {
  // if (/PROD/.test(dbConfName)) {
  if (dbConfName === connName) {
  // if (dbConfIdx > 0) {
    console.log('dbConfName: ',dbConfName)
    // startSyncMysqlToLocalFileByDbConfName(dbConfName)
    info.timeStart = new Date
    let missionResView,missionResEvent,missionResSp,missionResTable
    missionResView = await new SyncViewStructure(dbConfName).startSyncMysqlToLocalFileByDbConfName()
    missionResEvent = await new SyncEvents(dbConfName).startSyncMysqlToLocalFileByDbConfName()
    missionResSp = await new SyncStoreProcedure(dbConfName).startSyncMysqlToLocalFileByDbConfName()
    missionResTable = await new SyncTablesStructure(dbConfName).startSyncMysqlToLocalFileByDbConfName()
    
    info.timeEnd = new Date
    console.log(`
    ** [${dbConfName}]
    missionResView: ${JSON.stringify(missionResView)}
    missionResSp: ${JSON.stringify(missionResSp)}
    missionResEvent: ${JSON.stringify(missionResEvent)}
    missionResTable: ${JSON.stringify(missionResTable)}

    all mission completed
    timeStart: ${info.timeStart},
    timeEnd: ${info.timeEnd}
    ** [${dbConfName}]
    `)
    process.exit(1);
  }
})
