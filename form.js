export const submitForms = parameters => {
  const startTime = performance.now(),
    formData = new FormData(),
    log = [],
    endpoint = parameters[0].getAttribute('action');
  for (const thisForm of parameters) {
    for (const [key, value] of new FormData(thisForm).entries()) {
      formData.append(key, value);
      log.push(`${key}=${value}`);
    }
  }
  console.log(
    'fetch(',
    endpoint,
    JSON.stringify({
      method: 'POST',
      body: log
    }),
    ')'
  );
};
