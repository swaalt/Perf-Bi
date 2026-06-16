declare module "dom-to-image-more" {
  interface Options {
    width?: number
    height?: number
    style?: Partial<CSSStyleDeclaration>
    filter?: (node: Element) => boolean
    bgcolor?: string
    quality?: number
    imagePlaceholder?: string
    cacheBust?: boolean
  }
  function toPng(node: HTMLElement, options?: Options): Promise<string>
  function toJpeg(node: HTMLElement, options?: Options): Promise<string>
  function toBlob(node: HTMLElement, options?: Options): Promise<Blob>
  function toSvg(node: HTMLElement, options?: Options): Promise<string>
  export { toPng, toJpeg, toBlob, toSvg }
  const _default: { toPng: typeof toPng; toJpeg: typeof toJpeg; toBlob: typeof toBlob; toSvg: typeof toSvg }
  export default _default
}
