const compose = require('koa-compose'); // 将多个中间件合成为一个
const CONFIG = require('./read_config')
var _ = require('lodash');

const UploadAction = require('./action_upload');
const NotSupportedHandler = require('./not_supported_handler');
const ueditor = function(options) {
    options = _.merge(CONFIG, options);
    // editor初始化的时候，会自动发送一个config请求，用于获取一些配置，否则无法使用上传的一些功能
    async function editorConfig(ctx, next) {
        if (!(ctx.method === 'GET' && ctx.path === options.path && ctx.query.action === 'config')) {
            return next();
        }
        ctx.set('Content-Type', 'json')
        ctx.body = CONFIG;
    }

    // 真正处理上传的小中间件
    async function uploader(ctx) {
        let action = ctx.query.action;
        let conf = {};
        let uploadAction = null;
        switch (action) {
            case options.imageActionName: // 图片/ 截图
                conf = {
                    AllowExtensions: options.imageAllowFiles,
                    PathFormat: options.imagePathFormat,
                    SizeLimit: options.imageMaxSize,
                    UploadFieldName: options.imageFieldName,
                    rootDir: options.rootDir
                }
                uploadAction = new UploadAction(ctx, conf); // 图片处理方法
                break;
                // case 'uploadscrawl': // 涂鸦
                //     conf = {
                //         AllowExtensions: ['.png'],
                //         PathFormat: options.scrawlPathFormat,
                //         SizeLimit: options.scrawlMaxSize,
                //         UploadFieldName: options.scrawlFieldName,
                //         Base64: true,
                //         Base64Filename: 'scrawl.png'
                //     }
                //     uploadAction = new UploadAction(ctx, conf);
                //     break;
            case 'uploadvideo': // 视频
                conf = {
                    AllowExtensions: options.videoAllowFiles,
                    PathFormat: options.videoPathFormat,
                    SizeLimit: options.videoMaxSize,
                    UploadFieldName: options.videoFieldName,
                    rootDir: options.rootDir
                }
                uploadAction = new UploadAction(ctx, conf);
                break;
            case 'uploadfile': // 文件
                conf = {
                    AllowExtensions: options.fileAllowFiles,
                    PathFormat: options.filePathFormat,
                    SizeLimit: options.fileMaxSize,
                    UploadFieldName: options.fileFieldName,
                    rootDir: options.rootDir
                }
                uploadAction = new UploadAction(ctx, conf);
                break;
                // case 'listimage': // 图片管理
                //     break;
                // case 'listfile': // 文件管理
                //     break;
                // case 'catchimage': // 抓取远程图片
                //     break;

            default:
                uploadAction = new NotSupportedHandler();
                break;
        }
        ctx.set('Content-Type', 'text/html;charset=utf-8')
        let uploadResult = await uploadAction.Process();
        ctx.body = JSON.stringify(uploadResult);
    }

    // 处理上传
    async function editorUpload(ctx, next) {
        if (!(ctx.method === 'POST' && ctx.path === options.path)) {
            return next()
        }
        return uploader(ctx);
    }

    return compose([
        editorConfig,
        editorUpload
    ])
}

module.exports = ueditor;
