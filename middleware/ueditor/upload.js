const inspect = require('util').inspect
const path = require('path')
const fs = require('fs')
const Busboy = require('busboy') // 是用来解析出请求中文件流
const UUID = require('uuid');

// 上传状态
const UPLOAD_STATE = {
    Success: 0,
    FileAccessError: -1,
    SizeLimitExceed: -2,
    TypeNotAllow: -3,
    NetworkError: -4,
    Unknown: 1
}

function GetStateMessage(state) {
    switch (state) {
        case UPLOAD_STATE.Success:
            return 'SUCCESS';
        case UPLOAD_STATE.FileAccessError:
            return '文件访问出错，请检查写入权限';
        case UPLOAD_STATE.SizeLimitExceed:
            return '文件大小超出服务器限制';
        case UPLOAD_STATE.TypeNotAllow:
            return '不允许的文件格式';
        case UPLOAD_STATE.NetworkError:
            return '网络错误';
    }
    return '未知错误';
}

// 检查
function beforeCheck(file, checkOptions) {
    if (checkOptions.AllowExtensions) {
        let allowFiles = checkOptions.AllowExtensions;
        var isMatch = false;
        allowFiles.forEach(function(element) {
            if (path.extname(file.name).toLowerCase() === element.toLowerCase()) {
                isMatch = true
            }
        })

        if (!isMatch) {
            return {
                checked: false,
                state: UPLOAD_STATE.TypeNotAllow
            };
        }
    }
    if (file.size > checkOptions.SizeLimit) {
        return {
            checked: false,
            state: UPLOAD_STATE.SizeLimitExceed
        };
    }
    return {
        checked: true,
        state: null
    };
}

/**
 * 同步创建文件目录
 * @param  {string} dirname 目录绝对地址
 * @return {boolean}        创建目录结果
 */
function mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
        return true
    } else {
        if (mkdirsSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname)
            return true
        }
    }
}

/**
 * 创建UUID路径
 * @returns {relativeDir,filename}
 */
function UUIDPaths() {
    let ID = UUID.v4();
    let relativeDir = ID.substr(0, 1) + '/' + ID.substr(1, 1) + '/' + ID.substr(2, 1) + '/' + ID.substr(3, 1);
    return {
        relativeDir: relativeDir,
        uuid: ID
    }
}

/**
 * 上传文件
 * @param  {object} ctx     koa上下文
 * @param  {object} options 文件上传参数 fileType文件类型， path文件存放路径
 * @return {promise}
 */
function uploadFile(ctx, options) {
    let req = ctx.req
    let res = ctx.res
        // , limits: { fileSize: 2048 }
    let busboy = new Busboy({ headers: req.headers })

    // 获取类型
    let paths = UUIDPaths();
    let filePath = path.join(options.rootDir, paths.relativeDir);
    let mkdirResult = mkdirsSync(filePath)

    return new Promise((resolve, reject) => {
        console.log('文件上传中...')
        let result = {
            Success: false,
            FormData: {}
        }

        // 解析请求文件事件
        busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
            // let checkRsult = beforeCheck(file, options.checkOptions);
            // if (checkRsult.checked) {
            //     console.log(filename);
            let extension = path.extname(filename).toLowerCase();
            let fName = paths.uuid + extension;
            let _uploadFilePath = path.join(filePath, fName)
            console.log(_uploadFilePath)
            let saveTo = path.join(_uploadFilePath)
                // 文件保存到制定路径
            file.pipe(fs.createWriteStream(saveTo))
                // 文件写入事件结束
            file.on('end', function() {
                    result.Success = true;
                    result.Message = GetStateMessage(UPLOAD_STATE.Success);
                    result.Url = path.join(paths.relativeDir, fName);
                    result.State = UPLOAD_STATE.Success;
                    result.Title = fName;
                    result.OriginFileName = filename;
                    console.log('文件上传成功！')
                })
                // } else {
                //     result.Success = false;
                //     result.Message = GetStateMessage(checkRsult.state);
                //     result.State = checkRsult.state;
                //     result.OriginFileName = filename;
                // }
        })

        // 解析表单中其他字段信息
        busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
            console.log('表单字段数据 [' + fieldname + ']: value: ' + inspect(val));
            result.FormData[fieldname] = inspect(val);
        });

        // 解析结束事件
        busboy.on('finish', function() {
            console.log('文件上结束')
            resolve(result)
        })

        // 解析错误事件
        busboy.on('error', function(err) {
            console.log('文件上出错')
            console.log(err)
            reject(result)
        })

        req.pipe(busboy)
    })
}

module.exports = uploadFile