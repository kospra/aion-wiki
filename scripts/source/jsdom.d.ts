// jsdom ships no type declarations; this covers the one constructor the importer uses.
declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string);
    readonly window: Window & typeof globalThis;
  }
}
