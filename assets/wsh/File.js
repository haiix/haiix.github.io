// https://docs.microsoft.com/ja-jp/office/vba/language/reference/user-interface-help/file-object

import fs from './FileSystemObject.js';

export default class File {
  constructor(file) {
    if (typeof file === 'string') {
      this._file = fs.GetFile(file);
    } else {
      this._file = file;
    }
  }
  copy(destination, overwrite = true) {
    this._file.Copy(destination, overwrite === true ? 1 : 0);
  }
  delete(force = false) {
    this._file.Delete(force === true ? 1 : 0);
  }
  move(destination) {
    this._file.Move(destination);
  }
  //openAsTextStream()
  //get attributes() {
  //  return Number(this._file.Attributes);
  //}
  //set attributes(newattributes) {
  //  this._file.Attributes = newattributes;
  //}
  get dateCreated() {
    return new Date(this._file.DateCreated);
  }
  get dateLastAccessed() {
    return new Date(this._file.DateLastAccessed);
  }
  get dateLastModified() {
    return new Date(this._file.DateLastModified);
  }
  get drive() {
    return String(this._file.Drive);
  }
  get name() {
    return String(this._file.Name);
  }
  set name(newname) {
    this._file.Name = newname;
  }
  get path() {
    return String(this._file.Path);
  }
  //get shortName() {
  //  return String(this._file.ShortName);
  //}
  //get shortPath() {
  //  return String(this._file.ShortPath);
  //}
  get size() {
    return Number(this._file.Size);
  }
  get type() {
    return String(this._file.Type);
  }
}
