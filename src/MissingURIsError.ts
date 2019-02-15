export default class MissingURIsError extends Error {
  public uris: string[];

  constructor(uris: string[]) {
    super();
    this.uris = uris;
  }
}
