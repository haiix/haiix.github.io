export function noop() {
}
export function sleep(ms) {
  return new Promise(function (resolve, reject) {
    return setTimeout(resolve, ms)
  });
}