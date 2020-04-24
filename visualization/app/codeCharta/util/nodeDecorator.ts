"use strict"
import { HierarchyNode, hierarchy } from "d3"
import {
	BlacklistItem,
	CCFile,
	CodeMapNode,
	MetricData,
	EdgeMetricCount,
	KeyValuePair,
	AttributeTypes,
	AttributeTypeValue,
	BlacklistType
} from "../codeCharta.model"
import { MetricService } from "../state/metric.service"
import { CodeMapHelper } from "./codeMapHelper"
import ignore from "ignore"

interface IgnoreBlacklist {
	isFlattened: any // type Ignore from ignore
	isExcluded: any // type Ignore from ignore
}

export class NodeDecorator {
	public static preDecorateFile(file: CCFile) {
		const root = hierarchy<CodeMapNode>(file.map)
		root.descendants().forEach((node: HierarchyNode<CodeMapNode>, index: number) => {
			node.data.path =
				"/" +
				root
					.path(node)
					.map(x => x.data.name)
					.join("/")
			node.data.id = index
		})
	}

	public static decorateMap(map: CodeMapNode, metricData: MetricData[], blacklist: BlacklistItem[]) {
		const ignoreBlacklist = this.getIgnoreBlacklist(blacklist)
		hierarchy<CodeMapNode>(map).each((node: HierarchyNode<CodeMapNode>) => {
			this.decorateAttributesProperties(node, metricData)
			this.decorateBlacklistProperties(node, ignoreBlacklist)
		})
		this.decorateMapWithCompactMiddlePackages(map)
	}

	private static getIgnoreBlacklist(blacklist: BlacklistItem[]): IgnoreBlacklist {
		const gitignoreFlattened = ignore()
		const gitignoreExcluded = ignore()

		for (let item of blacklist) {
			const path = CodeMapHelper.transformPath(item.path)
			if (item.type === BlacklistType.flatten) {
				gitignoreFlattened.add(path)
			} else {
				gitignoreExcluded.add(path)
			}
		}

		return {
			isFlattened: gitignoreFlattened,
			isExcluded: gitignoreExcluded
		}
	}

	private static decorateBlacklistProperties(node: HierarchyNode<CodeMapNode>, ignoreBlacklist: IgnoreBlacklist) {
		const path = CodeMapHelper.transformPath(node.data.path)
		node.data.isFlattened = ignoreBlacklist.isFlattened.ignores(path)
		node.data.isExcluded = ignoreBlacklist.isExcluded.ignores(path)
	}

	private static decorateMapWithCompactMiddlePackages(node: CodeMapNode) {
		if (this.isEmptyMiddlePackage(node)) {
			let child = node.children[0]
			node.children = child.children
			node.name += "/" + child.name
			node.path += "/" + child.name
			if (child.link) {
				node.link = child.link
			}
			node.attributes = child.attributes
			node.edgeAttributes = child.edgeAttributes
			node.deltas = child.deltas
			this.decorateMapWithCompactMiddlePackages(node)
		} else if (node && node.children && node.children.length > 1) {
			for (let i = 0; i < node.children.length; i++) {
				this.decorateMapWithCompactMiddlePackages(node.children[i])
			}
		}
	}

	private static isEmptyMiddlePackage(node: CodeMapNode) {
		return node && node.children && node.children.length === 1 && node.children[0].children && node.children[0].children.length > 0
	}

	private static decorateAttributesProperties(node: HierarchyNode<CodeMapNode>, metricData: MetricData[]) {
		node.data.attributes = !node.data.attributes ? {} : node.data.attributes
		node.data.edgeAttributes = !node.data.edgeAttributes ? {} : node.data.edgeAttributes
		node.data.attributes[MetricService.UNARY_METRIC] = 1
		if (!node.children) {
			metricData.forEach(metric => {
				if (node.data.attributes[metric.name] === undefined) {
					node.data.attributes[metric.name] = 0
				}
			})
		}
	}

	public static decorateParentNodesWithAggregatedAttributes(
		map: CodeMapNode,
		blacklist: BlacklistItem[],
		metricData: MetricData[],
		edgeMetricData: MetricData[],
		isDeltaState: boolean,
		attributeTypes: AttributeTypes
	) {
		if (map) {
			let root = hierarchy<CodeMapNode>(map)
			root.each((node: HierarchyNode<CodeMapNode>) => {
				const leaves: HierarchyNode<CodeMapNode>[] = node.leaves().filter(x => !x.data.isExcluded)
				this.decorateNodeWithAggregatedChildrenMetrics(leaves, node, metricData, isDeltaState, attributeTypes)
				this.decorateNodeWithChildrenSumEdgeMetrics(leaves, node, edgeMetricData, attributeTypes)
			})
		}
		return map
	}

	private static decorateNodeWithAggregatedChildrenMetrics(
		leaves: HierarchyNode<CodeMapNode>[],
		node: HierarchyNode<CodeMapNode>,
		metricData: MetricData[],
		isDeltaState: boolean,
		attributeTypes: AttributeTypes
	) {
		metricData.forEach(metric => {
			if (node.data.children && node.data.children.length > 0) {
				node.data.attributes[metric.name] = this.aggregateLeafMetric(
					leaves.map(x => x.data.attributes),
					metric.name,
					attributeTypes
				)
				if (isDeltaState) {
					node.data.deltas[metric.name] = this.aggregateLeafMetric(leaves.map(x => x.data.deltas), metric.name, attributeTypes)
				}
			}
		})
	}

	private static decorateNodeWithChildrenSumEdgeMetrics(
		leaves: HierarchyNode<CodeMapNode>[],
		node: HierarchyNode<CodeMapNode>,
		edgeMetricData: MetricData[],
		attributeTypes: AttributeTypes
	) {
		edgeMetricData.forEach(edgeMetric => {
			if (node.data.children && node.data.children.length > 0) {
				node.data.edgeAttributes[edgeMetric.name] = this.aggregateLeafEdgeMetric(leaves, edgeMetric.name, attributeTypes)
			}
		})
	}

	private static aggregateLeafMetric(metrics: KeyValuePair[], metricName: string, attributeTypes: AttributeTypes): number {
		const metricValues: number[] = metrics.map(x => x[metricName]).filter(x => !!x)
		const attributeType = attributeTypes.nodes[metricName]

		if (metricValues.length == 0) {
			return 0
		}

		switch (attributeType) {
			case AttributeTypeValue.relative:
				return this.median(metricValues)
			case AttributeTypeValue.absolute:
			default:
				return metricValues.reduce((partialSum, a) => partialSum + a)
		}
	}

	private static aggregateLeafEdgeMetric(
		leaves: HierarchyNode<CodeMapNode>[],
		metricName: string,
		attributeTypes: AttributeTypes
	): EdgeMetricCount {
		const metricValues: EdgeMetricCount[] = leaves.map(x => x.data.edgeAttributes[metricName]).filter(x => !!x)
		const attributeType = attributeTypes.edges[metricName]

		const concentrated = { incoming: [], outgoing: [] }
		metricValues.forEach(element => {
			concentrated.incoming.push(element.incoming)
			concentrated.outgoing.push(element.outgoing)
		})

		if (metricValues.length == 0) {
			return { incoming: 0, outgoing: 0 }
		}

		switch (attributeType) {
			case AttributeTypeValue.relative:
				return { incoming: this.median(concentrated.incoming), outgoing: this.median(concentrated.outgoing) }
			case AttributeTypeValue.absolute:
			default:
				return {
					incoming: concentrated.incoming.reduce((pS, a) => pS + a),
					outgoing: concentrated.outgoing.reduce((pS, a) => pS + a)
				}
		}
	}

	private static median(numbers: number[]): number {
		const middle = (numbers.length - 1) / 2
		numbers.sort((a, b) => a - b)
		return (numbers[Math.floor(middle)] + numbers[Math.ceil(middle)]) / 2
	}
}
