// Remotion ayarları: video varlıkları sitenin public klasöründen ayrı tutulur
import { Config } from '@remotion/cli/config'

Config.setPublicDir('remotion/public')
Config.setVideoImageFormat('jpeg')
Config.setJpegQuality(92)
Config.setCodec('h264')
Config.setCrf(18)

// Proje "type": "module" olduğu için webpack importlarda uzantı ister;
// sitenin kodu (Vite) uzantısız import kullandığından bu kural gevşetilir.
Config.overrideWebpackConfig((config) => ({
  ...config,
  module: {
    ...config.module,
    rules: [...(config.module?.rules || []), { test: /\.m?jsx?$/, resolve: { fullySpecified: false } }],
  },
}))
