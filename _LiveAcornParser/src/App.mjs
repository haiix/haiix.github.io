import TElement from '../../assets/ui/TElement.mjs'
import TSplitter from '../../assets/ui/TSplitter.mjs'
import style from '../../assets/style.mjs'
import * as styleDef from '../../assets/styledef.mjs'
import { alert, confirm, prompt } from '../../assets/ui/TDialog.mjs'
import LiveJsonTree from './LiveJsonTree.mjs'
import * as acornLoose from 'https://cdn.skypack.dev/acorn-loose'

const ukey = 'my-app'

style(styleDef.ui, styleDef.fullscreen, styleDef.flex)
style(`
  .${ukey} textarea {
    border: none;
    resize: none;
    box-sizing: border-box;
    width: 50%;
    white-space: pre;
    font-family: monaco, consolas, inconsolata, monospace;
    font-size: 14px;
  }
`)

export default class App extends TElement {
  template () {
    this.uses(LiveJsonTree, TSplitter)
    return `
      <div class="${ukey} fullscreen flex row">
        <textarea id="code" spellcheck="false"
           oninput="this.run()"
        >// If you write JavaScript code here,\n// you will see the result parsed by acorn\n// in the tree on the right side.\n\nconsole.log('Hello, World!');\n</textarea>
        <t-splitter />
        <live-json-tree id="tree" class="tree flex fit" />
      </div>
    `
  }

  main () {
    this.run()
  }

  run () {
    const node = acornLoose.parse(this.code.value, {ecmaVersion: 2020})
    this.tree.update(node)
  }

  onerror (error) {
    alert(error.message, error.name)
    throw error
  }
}
