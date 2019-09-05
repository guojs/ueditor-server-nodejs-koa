const uuid = require('uuid')
const path = require('path')
const mount = require('koa-mount')
const asyncBusboy = require('async-busboy')

const uploadfile = (opts) => {
    let store
    try {
        store = require(`./${opts.provider}`)(opts)
    } catch (err) {
        throw new Error(`Error: ${err}`)
    }
    let { mimetypes, exts, filename } = opts
    if (mimetypes) mimetypes = mimetypes.map(m => m.toLocaleLowerCase())
    if (exts) exts = exts.map(e => e.toLocaleLowerCase())
    return async (ctx, next) => {
        let isUploadRouter = ctx.method === 'POST' && ctx.request.is('multipart/*') && ctx.originalUrl === opts.url;
        // console.log('是否可以上传：' + isUploadRouter);
        if (!isUploadRouter) {
            return next();
        }
        // 解析multpart Parse request for multipart
        const { files, fields } = await asyncBusboy(ctx.req)
        // 检查文件类型是否为可用类型 Check if any file is not valid mimetype
        if (mimetypes) {
            const invalidFiles = files.filter(file => {
                return !mimetypes.includes(file.mimeType.toLocaleLowerCase())
            })

            // Return err if any not valid
            if (invalidFiles.length !== 0) {
                ctx.status = 400
                ctx.body = `Error: Invalid type of files ${invalidFiles.map(file => `${file.filename}[${file.mimeType}]`)}`
                return
            }
        }

        // 检查扩展名 Check if any file is not valid ext
        if (exts) {
            const invalidFiles = files.filter(file => {
                return !exts.includes(file.filename.substring(file.filename.lastIndexOf('.') + 1).toLocaleLowerCase())
            })

            // Return err if any not valid
            if (invalidFiles.length !== 0) {
                ctx.status = 400
                ctx.body = `Error: Invalid type of files ${invalidFiles.map(file => file.filename)}`
                return
            }
        }

        // Generate oss path
        let result = {}
        const storeDir = opts.storeDir ? `${opts.storeDir}/` : ''
        files.forEach(file => {
            let ext = path.extname(file.filename);
            if (ext === '') {
                ext = path.extname(fields.filename);
            }
            const ID = uuid.v4();
            let relativeDir = ID.substr(0, 1) + '/' + ID.substr(1, 1) + '/' + ID.substr(2, 1) + '/' + ID.substr(3, 1);
            const fname = typeof filename === 'function' ? filename(file) : `${ID}${ext}`
            result[file.filename] = {
                path: `${storeDir}${relativeDir}`,
                filename: fname
            }
        })

        // Upload to OSS or folders
        try {
            await Promise.all(files.map(file => {
                const { path, filename } = result[file.filename]
                return store.put(`${path}/${filename}`, file)
            }))
        } catch (err) {
            ctx.status = 500
            ctx.body = `Error: ${err}`
            return
        }

        // Return result
        ctx.status = 200
        // Support < IE 10 browser
        ctx.res.setHeader('Content-Type', 'text/html;charset=UTF-8')
        let fileResult = [];
        Object.keys(result).forEach(k => {
            const { path, filename } = result[k]
            // result[k] = `${path}/${encodeURI(filename)}`
            fileResult.push(`${path}/${encodeURI(filename)}`)
        })
        if (fileResult.length === 1) {
            ctx.body = { url: fileResult[0] }
        } else {
            ctx.body = { urls: fileResult }
        }
        // ctx.body = JSON.stringify(store.get(result))
    }
}

module.exports = (options) => {
    if (!options.url) {
        throw new Error('Can not find option url')
    }
    return mount(options.url, uploadfile(options))
}
