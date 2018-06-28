module.exports = {
  webpack: config => {
    // Disable reading .babelrc.
    config.module.rules.find(
      ({ use }) => use.loader === "next-babel-loader"
    ).use.options.babelrc = false;
    return config;
  },
};
