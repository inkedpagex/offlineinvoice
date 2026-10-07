exports.default = async function (configuration) {
  // No-op sign script to bypass Windows signtool when building unsigned offline desktop distributions
  return;
};
