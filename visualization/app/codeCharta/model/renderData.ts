import { FileMeta, CodeMapNode } from "../codeCharta.model"

export class RenderData {
	constructor(public fileMeta: FileMeta, public root: CodeMapNode) {}
}
