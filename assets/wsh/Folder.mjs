// https://docs.microsoft.com/ja-jp/office/vba/language/reference/user-interface-help/folder-object

import fs from './FileSystemObject.mjs';
import File from './File.mjs';

export default class Folder extends File {
  constructor(file) {
    if (typeof file === 'string') {
      file = fs.GetFolder(file);
    }
    super(file);
  }
  //addFolders()
  //createTextFile()
  openAsTextStream() {
    throw new Error();
  }
  get files() {
    return function* () {
      const e = new Enumerator(this._file.Files);
      for (e.moveFirst(); !e.atEnd(); e.moveNext()) {
        yield new File(e.item());
      }
    }.call(this);
  }
  get isRootFolder() {
    return Boolean(this._file.IsRootFolder);
  }
  get parentFolder() {
    return new Folder(this._file.ParentFolder);
  }
  get subFolders() {
    return function* () {
      const e = new Enumerator(this._file.SubFolders);
      for (e.moveFirst(); !e.atEnd(); e.moveNext()) {
        yield new Folder(e.item());
      }
    }.call(this);
  }
}
