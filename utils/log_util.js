const path = require('path');
const log4js = require('koa-log4')
const fs = require('fs');
class LogUtils {
    /**
     * 格式化Request日志
     *
     * @param {any} req request请求
     * @param {any} resTime 响应时间
     * @returns 日志内容
     */
    formatReqLog(req, resTime) {
        let logText = '';
        let method = req.method;
        logText += 'request method: ' + method + '\n'; // 访问方法
        logText += 'request originalUrl:  ' + req.originalUrl + '\n'; // 请求原始地址
        logText += 'request client ip:  ' + req.ip + '\n'; // 客户端ip
        // 请求参数
        if (method === 'GET') {
            logText += 'request query:  ' + JSON.stringify(req.query) + '\n';
        } else {
            logText += 'request body: ' + '\n' + JSON.stringify(req.body) + '\n';
        }
        logText += 'response time: ' + resTime + '\n\n';
        return logText;
    }
    /**
     * 格式化Response日志
     *
     * @param {any} ctx 上下文
     * @param {any} resTime 响应时间
     * @returns
     */
    formatRes(ctx, resTime) {
        let logText = '';
        logText += '\n' + '*************** response log start ***************' + '\n';
        logText += this.formatReqLog(ctx.request, resTime); // 添加请求日志
        logText += 'response status: ' + ctx.status + '\n'; // 响应状态码
        logText += 'response body: ' + '\n' + JSON.stringify(ctx.body) + '\n'; // 响应内容
        logText += '*************** response log end ***************' + '\n';
        return logText;
    }

    /**
     * 格式化错误日志
     *
     * @param {any} ctx 上下文
     * @param {any} err 错误内容
     * @param {any} resTime 响应时间
     * @returns
     */
    formatError(ctx, err, resTime) {
        let logText = '';
        logText += '\n' + '------------------------- error log start -------------------------' + '\n';
        logText += this.formatReqLog(ctx.request, resTime); // 添加请求日志
        logText += 'err name: ' + err.name + '\n'; // 错误名称
        logText += 'err message: ' + err.message + '\n'; // 错误信息
        logText += 'err stack: ' + err.stack + '\n'; // 错误详情
        logText += '------------------------- error log end -------------------------' + '\n';
        return logText;
    }

    formatInfo(info) {
        var logText = '';
        logText += '\n' + '***************info log start ***************' + '\n';
        logText += 'info detail: ' + '\n' + JSON.stringify(info) + '\n'; // 响应内容
        logText += '*************** info log end ***************' + '\n';
        return logText;
    }
}
// ===================================== 日志处理 ====================================
let isexist = void 0;
isexist = fs.existsSync('../logs');
if (!isexist) {
    fs.mkdirSync('../logs', '0777');
}

var errorLogPath = path.resolve(__dirname, '../logs/error'); // 错误日志输出完整路径
var responseLogPath = path.resolve(__dirname, '../logs/response'); // 响应日志输出完整路径
var logConfig = {
    // 供外部调用的名称和对应设置定义
    categories: {
        'default': { 'appenders': ['ruleConsole', 'out'], 'level': 'all' },
        'resLogger': { 'appenders': ['resLogger'], 'level': 'info' },
        'errorLogger': { 'appenders': ['errorLogger'], 'level': 'error' },
        'http': { 'appenders': ['resLogger'], 'level': 'info' }
    },
    'appenders': {
        ruleConsole: { 'type': 'console' }, // 控制台输出
        // 错误日志
        errorLogger: {
            'category': 'errorLogger', // logger名称
            'type': 'dateFile', // 日志类型
            'filename': errorLogPath, // 日志输出位置
            'alwaysIncludePattern': true, // 是否总是有后缀名
            'pattern': '-yyyy-MM-dd.log', // 后缀，每天创建一个新的日志文件
            'encoding': 'utf-8',
            'maxLogSize': 1000,
            'numBackups': 3
        },
        // 响应日志
        resLogger: {
            'category': 'resLogger',
            'type': 'dateFile',
            'filename': responseLogPath,
            'alwaysIncludePattern': true,
            'pattern': '-yyyy-MM-dd.log',
            'encoding': 'utf-8',
            'maxLogSize': 1000,
            'numBackups': 3
        },
        out: {
            type: 'stdout'
        }
    }
};
let log4Util = new LogUtils();
// 调用预先定义的日志名称
let errorLogger = log4js.getLogger('errorLogger'); // 错误日志
let resLogger = log4js.getLogger('resLogger'); // 响应日志
let consoleLogger = log4js.getLogger();
log4js.configure(logConfig); // 加载配置文件

let logUtil = {};
// 封装错误日志
logUtil.logError = function(ctx, error, resTime) {
    if (ctx && error) {
        errorLogger.error(log4Util.formatError(ctx, error, resTime));
    }
};

// 封装响应日志
logUtil.logResponse = function(ctx, resTime) {
    if (ctx) {
        resLogger.info(log4Util.formatRes(ctx, resTime));
    }
};

logUtil.logInfo = function(info) {
    if (info) {
        consoleLogger.info(log4Util.formatInfo(info));
    }
};

module.exports = logUtil;
