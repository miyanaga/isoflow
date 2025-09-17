const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const webpack = require('webpack');

// Get API_URL from environment variable
const API_URL = process.env.API_URL || 'http://localhost:3080';

module.exports = {
  mode: 'development',
  entry: './src/index.tsx',
  devtool: 'eval-cheap-source-map',
  target: 'web',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'build')
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'build')
    },
    allowedHosts: [
      '.csb.app', // So Codesandbox.io can run the dev server
      '.ngrok-free.app'
    ],
    port: 3000,
    proxy: [
      {
        context: ['/api'],
        target: API_URL,
        pathRewrite: { '^/api': '' },
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
        onProxyReq: (proxyReq, req, res) => {
          console.log(`Proxying ${req.method} ${req.url} to ${API_URL}`);
        }
      }
    ]
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
        
        {
          test: /\.svg$/i,
          type: 'asset/inline'
        }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [new TsconfigPathsPlugin()]
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: path.resolve(__dirname, '../src/index.html')
    }),
    new webpack.DefinePlugin({
      PACKAGE_VERSION: JSON.stringify(require("../package.json").version),
      REPOSITORY_URL: JSON.stringify(require("../package.json").repository.url),
      'process.env.SERVER_URL': JSON.stringify(process.env.SERVER_URL || 'http://localhost:3080/')
    })
  ]
};
