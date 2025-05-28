// webpack.config.cjs
const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/client/index.jsx',
  output: {
    path: path.resolve(__dirname, 'public/js'),
    filename: 'client.bundle.js'
  },
  resolve: {
    // 1) Recognize .js and .jsx
    extensions: ['.js', '.jsx'],

    // 2) Alias the JSX runtimes so `react/jsx-runtime` resolves
    alias: {
      'react/jsx-runtime': require.resolve('react/jsx-runtime'),
      'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime')
    }
  },
  module: {
    rules: [
      {
        // 3) For .mjs/.js files, allow bare imports without the extension
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false
        }
      },
      {
        // 4) Transpile your JSX/ESNext
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        // 5) Handle CSS
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};
