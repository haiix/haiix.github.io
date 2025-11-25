/**
 * ファイル選択ダイアログを表示し、ユーザーが選択したファイルを非同期で返します。
 * キャンセルされた場合は null を返します。
 *
 * @param accept 受け入れるファイルタイプ (例: "image/*", ".csv, .txt")
 * @returns 選択されたFileオブジェクト、またはキャンセルの場合null
 */
export function selectFile(accept = ''): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;

    input.onchange = () => {
      resolve(input.files?.[0] ?? null);
    };

    input.oncancel = () => {
      resolve(null);
    };

    input.click();
  });
}

/**
 * FileまたはBlobオブジェクトをブラウザでダウンロードさせます。
 *
 * @param blob ダウンロードさせるデータ
 * @param filename ファイル名 (Fileオブジェクトの場合は省略可)
 */
export function downloadFile(blob: Blob | File, filename?: string) {
  const name =
    filename || (blob instanceof File ? blob.name : 'downloaded_file');

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
