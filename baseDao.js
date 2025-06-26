var {utils} = require('./utils');
var sqlString = require('sqlstring');
function baseDao(datasource) {
    this.datasource = datasource;
}

const normalErrorStr = {
    connFailed: "SQL connection failed. query string: ",
    queryFailed: "SQL query failed: ",
}
baseDao.prototype.query = function (sql, values, callback) {
    if (!sql) { return callback(new Error("SQL query string is empty")); }
    this.datasource.getConnection(function (err, client) {
        if (err) {
            utils.error(normalErrorStr.connFailed + sqlString.format(sql, values) + " message: " + err.message);
            callback(err)
        } else {
            client.query(sql, values, function (error, results, fields) {
                client.release();
                if (error) {
                    utils.error(normalErrorStr.queryFailed + error.sql + " message: " + error.message);
                    callback(error);
                } else if (callback) {
                    callback(error, results, fields);
                }
            });
        }
    });
}
baseDao.prototype.queryAsync = function (sql, values) {
    if (sql) {
        return new Promise((resolve, reject) => {
            this.query(sql, values, (error, results, fields) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    }
}
//添加数据
baseDao.prototype.addData = function (tableName, data, callback) {
    var sql = "insert into " + tableName + "(";
    var paramSql = "(";
    var params = [];
    for (var key in data) {
        sql += key + ",";
        paramSql += "?,";
        params.push(data[key]);
    }
    if (params.length == 0) {
        callback(new Error("insert failed, params is empty"));
        return;
    }
    paramSql = paramSql.substring(0, paramSql.length - 1);//去掉最後一個逗號
    sql = sql.substring(0, sql.length - 1);//去掉最後一個逗號
    sql = sql + ")values" + paramSql + ");";
    this.query(sql, params, callback);
}
//添加数据
baseDao.prototype.replaceData = function (tableName, data, callback) {
    var sql = "replace into " + tableName + "(";
    var paramSql = "(";
    var params = [];
    for (var key in data) {
        sql += key + ",";
        paramSql += "?,";
        params.push(data[key]);
    }
    if (params.length == 0) {
        callback(new Error("插入失败,对象没有任何属性"));
        return;
    }
    paramSql = paramSql.substring(0, paramSql.length - 1);//去掉最後一個逗號
    sql = sql.substring(0, sql.length - 1);//去掉最後一個逗號
    sql = sql + ")values" + paramSql + ");";
    this.query(sql, params, callback);
}
module.exports = baseDao;