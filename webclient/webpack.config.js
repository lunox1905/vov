const path = require('path');
const webpack = require('webpack')
module.exports = {
    entry: './index.js',
    watch: true,
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'src/dist'),
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.SERVER_URL': JSON.stringify(process.env.SERVER_URL),
        }),
    ],
};