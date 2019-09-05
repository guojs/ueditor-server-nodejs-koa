let config = {
    port: 3109,
    env: 'develop',
    proxyTable: {
        '/oauth/token': {
            target: 'http://119.23.14.134:8181',
            changeOrigin: true,
            pathRewrite: {
                '^/oauth/token': '/oauth/token'
            }
        },
        '/api/v1': {
            target: 'http://119.23.14.134:8181',
            changeOrigin: true
        }
    },
    base: {
        'baseAuth': {
            'username': 'admin-client',
            'password': '123'
        },
        rootDir: '/data/filestorage', // 初始位置
        UrlPrefix: 'http://192.168.10.120:3109/' /* 访问路径前缀 */
    }
}
module.exports = config;