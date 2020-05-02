function splitArguments(next) {
  return (context) => {
    const { fullName, logger, metadata, name, settings, version } = this;
    const { broker, params, service } = context;
    const { cacher } = broker;

    const broadcast = (...argv) => context.broadcast(...argv);
    const call = (...argv) => context.call(...argv);
    const emit = (...argv) => broker.emit(...argv);

    return next(
      params,
      {
        broadcast,
        call,
        emit,
      },
      {
        cacher,
        fullName,
        logger,
        metadata,
        name,
        service,
        settings,
        version,
      },
    );
  };
}

module.exports = {
  localAction: splitArguments,
};
