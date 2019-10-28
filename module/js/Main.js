import { sleep } from './Util.js';

export default class Main
{
  async main() {
    document.body.insertAdjacentHTML('beforeend', '<span>Hello, </span>');
    await sleep(1000);
    document.body.insertAdjacentHTML('beforeend', '<span>World!</span>');
  }
}