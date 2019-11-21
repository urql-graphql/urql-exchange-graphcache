const path = require('path');
const webpack = require('webpack');
const gzip = require('gzip-size');
const bytes = require('pretty-bytes');

const config = {
  entry: './web.js',
  target: 'web',
  mode: 'production',
  stats: {
    all: true
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: require.resolve('babel-loader'),
          options: {
            presets: ['@babel/preset-modules'],
            plugins: ['@babel/plugin-transform-react-jsx']
          }
        }
      }
    ]
  },
  resolve: {
    modules: [
      path.resolve(__dirname, 'node_modules')
    ],
    alias: {
      '@urql/exchange-graphcache': path.resolve(__dirname, '..')
    }
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        urql: {
          chunks: 'all',
          test(module) {
            const include = /(@?urql|wonka)[\\/]/;
            return include.test(module.rawRequest) || include.test(module.resource);
          }
        }
      }
    }
  },
  output: {
    path: path.resolve(__dirname, 'dist')
  }
};

webpack(config, (err, stats) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  } else if (stats.hasErrors()) {
    console.error(stats.toJson().errors);
    process.exit(1);
  }

  const size = gzip.fileSync(path.resolve(__dirname, 'dist/urql~main.js'));
  console.log('Size of (urql + wonka + @urql/*)', bytes(size));
});
