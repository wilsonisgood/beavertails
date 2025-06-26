var mysql = require('mysql');
const { dbConf } = require('./dbConfig');
var baseDao = require('./baseDao');

const genMysqlClientCollection = () => {
  const clientObj = {}
  dbConf.map((dbConfItem,confIdx) => {
    const { connectionName } = dbConfItem
    clientObj[`${connectionName}`] = new baseDao(mysql.createPool(dbConf[confIdx])) 
  })
  const output = {clientObj, time: new Date() }
  // console.log("{clientObj, time: new Date() }: ",output)
  return clientObj
}
const mysqlClientObj = genMysqlClientCollection()

const getMysqlClientByName = (dbConfName) => {

  return mysqlClientObj[`${dbConfName}`]
  // const defaultDbConfName = Object.keys(dbConf)[0]
  // return mysqlClientObj[`${dbConfName}`] || mysqlClientObj[defaultDbConfName]
}
module.exports = { mysqlClientObj, getMysqlClientByName }