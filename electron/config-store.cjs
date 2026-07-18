function createConfigStore({
  fs,
  filePath,
  normalize,
  onError = (operation, error) => console.error(operation, error),
}) {
  return {
    load() {
      try {
        if (!fs.existsSync(filePath)) {
          return normalize();
        }

        const data = fs.readFileSync(filePath, 'utf8');
        return normalize(JSON.parse(data));
      } catch (error) {
        onError('load', error);
        return normalize();
      }
    },

    save(config) {
      try {
        fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
      } catch (error) {
        onError('save', error);
      }
    },
  };
}

module.exports = { createConfigStore };
