"use strict"

import { CodeMapMesh } from "./rendering/codeMapMesh"
import { RenderSettings } from "./rendering/renderSettings"
import { Node } from "./rendering/node"
import { TreeMapService, TreeMapSettings } from "../../core/treemap/treemap.service"
import { CodeMapUtilService } from "./codeMap.util.service"
import { CodeMapLabelService } from "./codeMap.label.service"
import { ThreeSceneService } from "./threeViewer/threeSceneService"
import { CodeMapArrowService } from "./codeMap.arrow.service"
import { Edge, Settings, CodeMapNode, RenderMode, CCFile } from "../../codeCharta.model"

const MAP_SIZE = 500.0

/**
 * Main service to manage the state of the rendered code map
 */

export interface RenderData {
	renderMap: CodeMapNode
	fileName: string
	importedFiles: CCFile[]
	settings: Settings
}

export class CodeMapRenderService {
	public static SELECTOR = "codeMapRenderService"

	public currentSortedNodes: Node[]

	private _mapMesh: CodeMapMesh = null
	private currentRenderSettings: RenderSettings
	private visibleEdges: Edge[]

	private lastRender: RenderData

	constructor(
		private threeSceneService: ThreeSceneService,
		private treeMapService: TreeMapService,
		private codeMapUtilService: CodeMapUtilService,
		private codeMapLabelService: CodeMapLabelService,
		private codeMapArrowService: CodeMapArrowService
	) {}

	public rerenderWithNewSettings(settings: Settings) {
		this.lastRender.settings = settings
		this.render(this.lastRender)
	}

	public render(renderData: RenderData) {
		this.lastRender = renderData
		this.updateMapGeometry(renderData.renderMap, renderData.fileName, renderData.importedFiles, renderData.settings)
		this.scaleMap(
			renderData.settings.appSettings.scaling.x,
			renderData.settings.appSettings.scaling.y,
			renderData.settings.appSettings.scaling.z
		)
	}

	private updateMapGeometry(map: CodeMapNode, fileName: string, importedFiles: CCFile[], s: Settings) {
		this.visibleEdges = this.getVisibleEdges(map, s)

		const treeMapSettings: TreeMapSettings = {
			size: MAP_SIZE,
			areaKey: s.dynamicSettings.areaMetric,
			heightKey: s.dynamicSettings.heightMetric,
			margin: s.appSettings.margin,
			invertHeight: s.appSettings.invertHeight,
			visibleEdges: this.visibleEdges,
			searchedNodePaths: s.dynamicSettings.searchedNodePaths,
			blacklist: s.dynamicSettings.blacklist,
			fileName: fileName,
			searchPattern: s.dynamicSettings.searchPattern,
			hideFlatBuildings: s.appSettings.hideFlatBuildings
		}

		this.showAllOrOnlyFocusedNode(map, s)

		let nodes: Node[] = this.collectNodesToArray(
			this.treeMapService.createTreemapNodes(map, importedFiles, treeMapSettings, s.dynamicSettings.edges)
		)

		let filtered = nodes.filter(node => node.visible && node.length > 0 && node.width > 0)
		this.currentSortedNodes = filtered.sort((a, b) => {
			return b.height - a.height
		})

		this.currentRenderSettings = {
			heightKey: s.dynamicSettings.heightMetric,
			colorKey: s.dynamicSettings.colorMetric,
			renderDeltas: s.dynamicSettings.renderMode == RenderMode.Delta,
			hideFlatBuildings: s.appSettings.hideFlatBuildings,
			colorRange: s.appSettings.neutralColorRange,
			mapSize: MAP_SIZE,
			deltaColorFlipped: s.appSettings.deltaColorFlipped,
			whiteColorBuildings: s.appSettings.whiteColorBuildings
		}

		this.setLabels(s)
		this.setArrows(s)

		this._mapMesh = new CodeMapMesh(this.currentSortedNodes, this.currentRenderSettings)
		this.threeSceneService.setMapMesh(this._mapMesh, MAP_SIZE)
	}

	private collectNodesToArray(node: Node): Node[] {
		let nodes = [node]
		for (let i = 0; i < node.children.length; i++) {
			let collected = this.collectNodesToArray(node.children[i])
			for (let j = 0; j < collected.length; j++) {
				nodes.push(collected[j])
			}
		}
		return nodes
	}

	private scaleMap(x, y, z) {
		this.threeSceneService.mapGeometry.scale.x = x
		this.threeSceneService.mapGeometry.scale.y = y
		this.threeSceneService.mapGeometry.scale.z = z

		this.threeSceneService.mapGeometry.position.x = (-MAP_SIZE / 2.0) * x
		this.threeSceneService.mapGeometry.position.y = 0.0
		this.threeSceneService.mapGeometry.position.z = (-MAP_SIZE / 2.0) * z

		if (this.threeSceneService.getMapMesh()) {
			this.threeSceneService.getMapMesh().setScale(x, y, z)
		}

		if (this.codeMapLabelService) {
			this.codeMapLabelService.scale(x, y, z)
		}

		if (this.codeMapArrowService) {
			this.codeMapArrowService.scale(x, y, z)
		}
	}

	private setLabels(s: Settings) {
		this.codeMapLabelService.clearLabels()
		for (let i = 0, numAdded = 0; i < this.currentSortedNodes.length && numAdded < s.appSettings.amountOfTopLabels; ++i) {
			if (this.currentSortedNodes[i].isLeaf) {
				this.codeMapLabelService.addLabel(this.currentSortedNodes[i], this.currentRenderSettings)
				++numAdded
			}
		}
	}

	private setArrows(s: Settings) {
		this.codeMapArrowService.clearArrows()
		if (this.visibleEdges.length > 0 && s.appSettings.enableEdgeArrows) {
			this.showCouplingArrows(this.visibleEdges)
		}
	}

	private showAllOrOnlyFocusedNode(map: CodeMapNode, s: Settings) {
		if (s.dynamicSettings.focusedNodePath) {
			const focusedNode = this.codeMapUtilService.getAnyCodeMapNodeFromPath(s.dynamicSettings.focusedNodePath, map)
			this.treeMapService.setVisibilityOfNodeAndDescendants(map, false)
			this.treeMapService.setVisibilityOfNodeAndDescendants(focusedNode, true)
		} else {
			this.treeMapService.setVisibilityOfNodeAndDescendants(map, true)
		}
	}

	private getVisibleEdges(map: CodeMapNode, s: Settings) {
		return map && s.dynamicSettings.edges ? s.dynamicSettings.edges.filter(edge => edge.visible === true) : []
	}

	private showCouplingArrows(deps: Edge[]) {
		this.codeMapArrowService.clearArrows()

		if (deps && this.currentRenderSettings) {
			this.codeMapArrowService.addEdgeArrows(this.currentSortedNodes, deps, this.currentRenderSettings)
			this.codeMapArrowService.scale(
				this.threeSceneService.mapGeometry.scale.x,
				this.threeSceneService.mapGeometry.scale.y,
				this.threeSceneService.mapGeometry.scale.z
			)
		}
	}
}
