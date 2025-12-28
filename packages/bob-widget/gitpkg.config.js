module.exports = () => ({
  // Replace scope characters so tag names are safe and easy to reference
  getTagName: (pkg) => `${pkg.name.replace(/@|\/|\s/g, '-')}-v${pkg.version}-gitpkg`,
});
