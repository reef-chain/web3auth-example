const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const InterpolateHtmlPlugin = require('interpolate-html-plugin');
const { ProvidePlugin } = require('webpack');
require('process');

module.exports = {
  mode: 'development',
  entry: path.join(__dirname, "src", "index.tsx"),

  output: {
    path:path.resolve(__dirname, "public"),
    filename: 'main.js', 
  },
  
  module: {
    rules: [
      {
        test: /\.?js$/,
        exclude: /node_modules/,
        loader: "babel-loader",
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(png|svg|jpe?g|gif)$/i,
        loader: 'file-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.m?js/,
        type: "javascript/auto",
      },
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      {
        test: /favicon\.ico$/,
        loader: 'url-loader',
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/,
        exclude: /node_modules/,
        use: ['file-loader?name=[name].[ext]']
      }
    ],
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.cjs'],
    fallback: {
      'crypto': false,
      'stream': false,
      'url': false,
      'assert': false,
      'http': false,
      'https': false,
      'os': false,
      'zlib': false,
    },
  },

  devtool: 'inline-source-map',
  
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    hot: true,
    port: 3000,
    historyApiFallback: true
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: './index.html',
      favicon: './public/favicon.ico'
    }),
    new InterpolateHtmlPlugin({
      PUBLIC_URL: 'static'
    }),
    new ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"],
    })
  ]
}