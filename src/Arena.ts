export default class Arena<T> {
  private buffer: T[];

  constructor() {
    this.buffer = [];
  }

  public get(index: number): T {
    return this.buffer[index];
  }

  public add(item: T): number {
    this.buffer.push(item);
    return this.buffer.length - 1;
  }

  public values(): T[] {
    return this.buffer;
  }
}
