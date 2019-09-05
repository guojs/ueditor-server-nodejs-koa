class NotSupportedHandler {
    // 处理过程
    Process() {
        return {
            State: 'action 参数为空或者 action 不被支持。'
        };
    }
}

module.exports = NotSupportedHandler;
