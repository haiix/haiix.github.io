type StreamResult<T> =
  | { value: T; done: false }
  | { value: undefined; done: true };

/**
 * 任意の型 T のイベントを非同期イテレータとして送出するストリームクラス。
 * @template T ストリームが運ぶデータの型
 *
 * @remarks
 * このストリームは内部にキューを持ちません。
 * 消費側（`for await...of`など）の処理が遅延している間に複数の `emit` が呼び出された場合、
 * 最新の値のみが待機中のPromiseを解決し、その間に発生した中間的なイベントは
 * 取りこぼされる（消費側に届かない）可能性があることに注意してください。
 */
export class EventStream<T> {
  private promise!: Promise<StreamResult<T>>;
  private resolve!: (value: StreamResult<T>) => void;
  private reject!: (reason: unknown) => void;
  private isClosed = false;

  constructor() {
    this.createNewPromise();
  }

  private createNewPromise() {
    ({
      promise: this.promise,
      resolve: this.resolve,
      reject: this.reject,
    } = Promise.withResolvers<StreamResult<T>>());
  }

  /**
   * ストリームに新しい値を発行します。
   * @param value 送信するデータ
   */
  emit(value: T): void {
    if (this.isClosed) return;
    const currentResolve = this.resolve;
    this.createNewPromise();
    currentResolve({ value, done: false });
  }

  /**
   * ストリームを正常に終了させます。
   */
  close(): void {
    if (this.isClosed) return;
    this.isClosed = true;
    this.resolve({ value: undefined, done: true });
  }

  /**
   * ストリームでエラーを発生させ、終了させます。
   * @param error 発生したエラー
   */
  error(error: unknown): void {
    if (this.isClosed) return;
    this.isClosed = true;
    this.reject(error);
  }

  /**
   * イベントを消費するための非同期イテレータ。
   * `for await...of` ループで使用可能です。
   */
  async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    try {
      while (true) {
        const result = await this.promise;
        if (result.done) return;
        yield result.value;
      }
    } finally {
      this.isClosed = true;
    }
  }

  /**
   * ストリームが終了しているかどうかを取得します。
   */
  get closed(): boolean {
    return this.isClosed;
  }
}

/**
 * マウスやタッチの移動イベント（pointermove）を非同期イテレータとしてキャプチャします。
 * `pointerup` または `pointercancel` イベントが発生するまで座標をストリームし続けます。
 * ストリームの終了時（ループの中断を含む）には、自動的にイベントリスナーが削除されます。
 *
 * @yields ポインターの現在の座標 `{ x: number, y: number }`
 *
 * @remarks
 * 描画（レンダリング）負荷が高い状況などでは、
 * すべての `pointermove` イベントが取得できず、座標が飛ぶ可能性があります。
 */
export async function* createDragStream() {
  const stream = new EventStream<{ x: number; y: number }>();
  const controller = new AbortController();

  const onMove = (event: PointerEvent) => {
    stream.emit({ x: event.pageX, y: event.pageY });
  };
  const onEnd = () => {
    stream.close();
  };

  const options = { passive: true, signal: controller.signal };
  window.addEventListener('pointermove', onMove, options);
  window.addEventListener('pointerup', onEnd, options);
  window.addEventListener('pointercancel', onEnd, options);

  try {
    yield* stream;
  } finally {
    // ストリームが終了、または消費側で break された場合にリスナーを解除
    controller.abort();
  }
}

/**
 * 画面全体を覆うオーバーレイ要素（div）を作成し、スタイルを適用します。
 * 主にドラッグ操作中のイベントキャプチャや、カーソル表示の固定に使用されます。
 * @param cursor - オーバーレイ上に表示するカーソルスタイル。デフォルトは 'grabbing'。
 * @returns スタイルが適用された HTMLDivElement。
 */
export function createOverlay(cursor = 'grabbing'): HTMLDivElement {
  const overlay = document.createElement('div');

  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '9999',
    // モバイルでのスクロールやピンチズームを防止
    touchAction: 'none',
    cursor,
  });

  return overlay;
}

/**
 * 値を gridSize の倍数に四捨五入してスナップする
 * @param value 元の値
 * @param gridSize グリッドの間隔
 * @returns 最も近いグリッド位置の値
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}
