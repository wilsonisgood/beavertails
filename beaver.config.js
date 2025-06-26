const { dbConf } = require('./dbConfig')
// console.log('connectionName ** ',)
// dbConf.map(nn => {console.log(nn.connectionName)})
// console.log('connectionName *** ',)
// const dbConnList = dbConf.filter((conn,idx) => idx < 3 ? 1 : 0)

const dbConnList = dbConf.filter((conn,idx) => {
  return true
//   return [
// 'WC_AAA',
// 'WC_BBB',
//   ].includes(conn.connectionName)
})

const appList = dbConnList.map((dbConnItem, connIdx) => {
  return {
    "name": `db-${dbConnItem.connectionName}`,
    "script": "./start.js",
    "log_date_format": "YYYY-MM-DD HH:mm:ss",
    "node_args": "--max-old-space-size=4096",
    "args": dbConnItem.connectionName,

    "error_file": `./pm2/beavertail-${dbConnItem.connectionName}-err.log`,
    "out_file": `./pm2/beavertail-${dbConnItem.connectionName}-out.log`,
    "pid_file": `./pm2/pid/beavertail-${dbConnItem.connectionName}.pid`,

    // "cron_restart": "00 03 * * *",
    "autorestart" : false,
    "stop_exit_codes": [1]
  }
})
module.exports = {
  apps: appList
}

// module.exports = {
//   apps : [
//     {
//       "name": "beaver-sync",
//       "script": "./start.js",
//       "log_date_format": "YYYY-MM-DD HH:mm:ss",
//       "node_args": "--max-old-space-size=4096",
//       "args": "WC_AAA",
  
//       "error_file": "./pm2/beavertail-err.log",
//       "out_file": "./pm2/beavertail-out.log",
//       "pid_file": "./pm2/pid/beavertail.pid",
  
//       "autorestart" : false,
//       "stop_exit_codes": [1]
//     }
//   ]
// }