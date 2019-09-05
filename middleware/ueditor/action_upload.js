var _ = require('lodash');
const uploadFile = require('./upload')
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

class UploadHandler {
    constructor(ctx, opts) {
        this.ctx = ctx;
        this.UploadConfig = opts;
        this.Result = {
            State: 1,
            Url: '',
            OriginFileName: '',
            Message: ''
        };
    }

    // 处理过程
    async Process() {
        try {
            // 上传文件请求处理
            let upResult = { success: false };
            upResult = await uploadFile(this.ctx, {
                rootDir: this.UploadConfig.rootDir,
                checkOptions: {
                    AllowExtensions: this.UploadConfig.AllowExtensions,
                    SizeLimit: this.UploadConfig.SizeLimit
                }
            })
            this.Result = _.merge(this.Result, upResult);
        } catch (error) {
            this.Result.state = UPLOAD_STATE.FileAccessError;
            this.Result.message = error.Message;
        }
        return this.WriteResult();
    }

    // 结果
    WriteResult() {
        return {
            state: GetStateMessage(this.Result.State),
            url: this.Result.Url,
            title: this.Result.Title,
            original: this.Result.OriginFileName,
            error: this.Result.Message
        }
    }
}

module.exports = UploadHandler;
