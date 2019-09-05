var path = require('path');
var Koa = require('koa');
var serve = require('koa-static');
const Router = require('koa-router');
const onerror = require('koa-onerror')
const debug = require('debug')
const views = require('koa-views')
const koaBody = require('koa-body')

const fs = require('fs');
const koacors = require('koa2-cors')
const logUtil = require('./utils/log_util');
const ueditor = require('./middleware/ueditor');
// const ueditor=require('ueditor')
const uploadfile = require('./middleware/uploadfile');
const historyApiFallback = require('./middleware/historyApiFallback')
    // -----------------------------  实例化、变量  ------------------------------------------
const app = new Koa()
app.use(koacors())

var config = require('./config')
    // var proxyTable = config.proxyTable
let userResourceRootDir = config.base.rootDir // path.join(__dirname, config.base.rootDir);

onerror(app)
const error = debug('app:error')

app.use(serve(userResourceRootDir)) // 上传等资源根目录


// 外层处理 负责所有中间件的错误处理
app.use(async(ctx, next) => {
    try {
        await next()
    } catch (err) {
        ctx.response.status = err.statusCode || err.status || 500;
        ctx.body = err.data || err.message
        ctx.app.emit('error', err, ctx) // 手动释放error事件，让监听函数生效
    }
})


// ueditor中间件，包括静态资源以及上传接口
const DEFAULT_OPTION = {
    path: '/ueditor/ue',
    rootDir: userResourceRootDir,
    imageUrlPrefix: config.base.UrlPrefix,
    scrawlUrlPrefix: config.base.UrlPrefix,
    snapscreenUrlPrefix: config.base.UrlPrefix,
    catcherUrlPrefix: config.base.UrlPrefix,
    videoUrlPrefix: config.base.UrlPrefix,
    fileUrlPrefix: config.base.UrlPrefix,
    imageManagerUrlPrefix: config.base.UrlPrefix,
    fileManagerUrlPrefix: config.base.UrlPrefix
}
app.use(ueditor(DEFAULT_OPTION));

//  

// 文件上传
const UPLOADFILE_OPTION = {
    url: '/base/files',
    'provider': 'local',
    folder: userResourceRootDir
}
app.use(uploadfile(UPLOADFILE_OPTION));

// 配置ctx.body解析中间件
app.use(koaBody({ multipart: true, json: true, form: true, text: true }));

// handle fallback for HTML5 history API
// 对路由history直接走historyApiFallback,而不是用服务端渲染
app.use(historyApiFallback({
    verbose: true,
    index: '/index.html',
    rewrites: [
        { from: /^\/index$/, to: '/index.html' },
        { from: /^\/login/, to: '/login.html' }
    ],
    path: /^\/(index|login)/
}))

// ------------------------------  routes  -----------------------------------------------
const router = new Router()
    // ueditor示例页面
router.get('/ueditor', async(ctx) => {
        await ctx.render('ueditor', {})
    })
    // 文件上传示例页面
router.get('/uploadfile', async(ctx) => {
    await ctx.render('upload', {})
})

router.delete('/base/files', async(ctx) => {
    // console.log('开始删除，开始删除')
    let url = ctx.query.url;
    if (url) {
        let filePath = path.join(userResourceRootDir, url)
        let result = {
            success: false,
            msg: ''
        };
        try {
            fs.unlinkSync(filePath)
            result = {
                success: true,
                msg: '删除成功'
            }
        } catch (error) {
            result.msg = error;
        }

        ctx.set('Content-Type', 'text/html;charset=utf-8')
        ctx.body = result;
    }
})

// adminweb配置文件
router.get('/appConfig', async(ctx) => {
    let conf = {
        aspectRatio: config.base.aspectRatio,
        base_auth: config.base.baseAuth,
        resource: config.base.UrlPrefix
    };
    ctx.set('Content-Type', 'json')
    ctx.body = conf;
});

app.use(router.middleware())
app.on('error', (err) => {
    error('server error: %s', err.stack)
})

module.exports = app