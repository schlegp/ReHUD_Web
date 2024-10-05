const path = require('path');
const webpackNodeExternals = require('webpack-node-externals');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    plugins:[
        new CopyPlugin({

            patterns: [
                { from: path.resolve('./wwwroot/css'), to: '../css' },
            ]
        })
    ],
    entry: {
        index: './wwwroot/ts/index.ts',
        settings: './wwwroot/ts/settingsPage.ts',
    },
    output: {
        filename: '[name]-bundle.js',
        path: path.resolve('wwwroot', '../obj/Host/bin/wwwroot/dist'),
    },
    target: 'node',
    mode: 'production',
    externals: [{electron: 'commonjs electron'}, webpackNodeExternals({
        allowlist: [/^(?!(ws)$).*$/], // all modules except 'ws' should be bundled
    })],
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/i,
                loader: 'ts-loader',
                exclude: ['/node_modules/'],
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
                type: 'asset',
            },

            // Add your rules for custom modules here
            // Learn more about loaders from https://webpack.js.org/loaders/
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js', '...'],
        fullySpecified: false,
    },
};
