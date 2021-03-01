import TComponent from '@haiix/TComponent'
import Tree from './Tree.js'

export default class App extends TComponent {
  template () {
    this.uses(Tree)
    return `
      <div class="horizontal">
        <tree id="_tree" style="border: 1px solid #999; width: 200px;">
          <![CDATA[
            基本
              メイン
              <b>フォント</b>
                フォント1
                フォント2
            編集
              <b>コピー</b>
              貼り付け
          ]]>
        </tree>
        <div style="border: 1px solid #CCC;"></div>
      </div>
    `
  }
  main () {
    this._tree.focus()
  }
}
