const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Windows + emulator often stalls at "Downloading 99.9%" because Metro's
 * multipart progress response breaks OkHttp chunked parsing (ProtocolException 0xd).
 * Force plain JS bundle responses instead of multipart/mixed progress.
 */
module.exports = mergeConfig(getDefaultConfig(__dirname), {
  server: {
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        if (req.url && req.url.includes('.bundle')) {
          req.headers.accept = 'application/javascript';
        }
        return middleware(req, res, next);
      };
    },
  },
});
