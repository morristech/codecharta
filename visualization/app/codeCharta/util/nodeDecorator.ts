"use strict"
import * as d3 from "d3"
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

export class NodeDecorator {
	public static decorateMap(map: CodeMapNode, metricData: MetricData[], blacklist: BlacklistItem[]) {
		this.decorateMapWithMissingObjects(map)
		this.decorateMapWithCompactMiddlePackages(map)
		this.decorateLeavesWithMissingMetrics(map, metricData)
		this.decorateMapWithBlacklist(map, blacklist)
	}

	public static preDecorateFile(file: CCFile) {
		this.decorateMapWithPathAttribute(file)
		this.decorateNodesWithIds(file.map)
	}

	private static decorateMapWithBlacklist(map: CodeMapNode, blacklist: BlacklistItem[]) {
		const flattened = ignore()
		const excluded = ignore()

		for (const item of blacklist) {
			const path = CodeMapHelper.transformPath(item.path)
			item.type === BlacklistType.flatten ? flattened.add(path) : excluded.add(path)
		}

		hierarchy(map)
			.descendants()
			.map(node => {
				const path = CodeMapHelper.transformPath(node.data.path)
				node.data.isFlattened = flattened.ignores(path)
				node.data.isExcluded = excluded.ignores(path)
			})
	}

	private static decorateNodesWithIds(map: CodeMapNode) {
		let id = 0
		hierarchy(map)
			.descendants()
			.map(node => {
				node.data.id = id
				id++
			})
	}

	private static decorateMapWithCompactMiddlePackages(map: CodeMapNode) {
		const isEmptyMiddlePackage = current => {
			return (
				current &&
				current.children &&
				current.children.length === 1 &&
				current.children[0].children &&
				current.children[0].children.length > 0
			)
		}

		const rec = current => {
			if (isEmptyMiddlePackage(current)) {
				const child = current.children[0]
				current.children = child.children
				current.name += "/" + child.name
				current.path += "/" + child.name
				if (child.link) {
					current.link = child.link
				}
				current.attributes = child.attributes
				current.edgeAttributes = child.edgeAttributes
				current.deltas = child.deltas
				rec(current)
			} else if (current && current.children && current.children.length > 1) {
				for (let i = 0; i < current.children.length; i++) {
					rec(current.children[i])
				}
			}
		}

		if (map) {
			rec(map)
		}
	}

	private static decorateMapWithPathAttribute(file: CCFile) {
		if (file && file.map) {
			const root = d3.hierarchy<CodeMapNode>(file.map)
			root.each(node => {
				node.data.path =
					"/" +
					root
						.path(node)
						.map(x => x.data.name)
						.join("/")
			})
		}
		return file
	}

	private static decorateMapWithMissingObjects(map: CodeMapNode) {
		if (map) {
			const root = d3.hierarchy<CodeMapNode>(map)
			root.each(node => {
				node.data.attributes = !node.data.attributes ? {} : node.data.attributes
				node.data.edgeAttributes = !node.data.edgeAttributes ? {} : node.data.edgeAttributes
				Object.assign(node.data.attributes, { [MetricService.UNARY_METRIC]: 1 })
			})
		}
	}

	private static decorateLeavesWithMissingMetrics(map: CodeMapNode, metricData: MetricData[]) {
		if (map && metricData) {
			const root = d3.hierarchy<CodeMapNode>(map)
			root.leaves().forEach(node => {
				metricData.forEach(metric => {
					if (node.data.attributes[metric.name] === undefined) {
						node.data.attributes[metric.name] = 0
					}
				})
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
			const root = d3.hierarchy<CodeMapNode>(map)
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
