import "./metricType.component.scss"
import { MetricService, MetricServiceSubscriber } from "../../state/metric.service"
import { AttributeTypeValue } from "../../codeCharta.model"
import { IRootScopeService } from "angular"
import { BuildingHoveredSubscriber, BuildingUnhoveredSubscriber, CodeMapMouseEventService } from "../codeMap/codeMap.mouseEvent.service"
import { CodeMapBuilding } from "../codeMap/rendering/codeMapBuilding"
import { AreaMetricService, AreaMetricSubscriber } from "../../state/store/dynamicSettings/areaMetric/areaMetric.service"
import { HeightMetricService, HeightMetricSubscriber } from "../../state/store/dynamicSettings/heightMetric/heightMetric.service"
import { ColorMetricService, ColorMetricSubscriber } from "../../state/store/dynamicSettings/colorMetric/colorMetric.service"
import { EdgeMetricService, EdgeMetricSubscriber } from "../../state/store/dynamicSettings/edgeMetric/edgeMetric.service"
import { EdgeMetricDataService } from "../../state/edgeMetricData.service"
import { StoreService } from "../../state/store.service"

export enum MetricSelections {
	areaMetric = "areaMetric",
	heightMetric = "heightMetric",
	colorMetric = "colorMetric",
	edgeMetric = "edgeMetric"
}

export class MetricTypeController
	implements
		AreaMetricSubscriber,
		HeightMetricSubscriber,
		ColorMetricSubscriber,
		EdgeMetricSubscriber,
		BuildingHoveredSubscriber,
		BuildingUnhoveredSubscriber,
		MetricServiceSubscriber {
	private _viewModel: {
		metricType: AttributeTypeValue
		isFolderHovered: boolean
	} = {
		metricType: null,
		isFolderHovered: false
	}

	private metricSelection: MetricSelections

	/* @ngInject */
	constructor(
		private $rootScope: IRootScopeService,
		private metricService: MetricService,
		private edgeMetricDataService: EdgeMetricDataService,
		private storeService: StoreService
	) {
		AreaMetricService.subscribe(this.$rootScope, this)
		HeightMetricService.subscribe(this.$rootScope, this)
		ColorMetricService.subscribe(this.$rootScope, this)
		EdgeMetricService.subscribe(this.$rootScope, this)
		CodeMapMouseEventService.subscribeToBuildingHovered(this.$rootScope, this)
		CodeMapMouseEventService.subscribeToBuildingUnhovered(this.$rootScope, this)
		MetricService.subscribe(this.$rootScope, this)
	}

	public onAreaMetricChanged(areaMetric: string) {
		this.metricSelection == MetricSelections.areaMetric &&
			(this._viewModel.metricType = this.metricService.getAttributeTypeByMetric(areaMetric))
	}

	public onHeightMetricChanged(heightMetric: string) {
		this.metricSelection == MetricSelections.heightMetric &&
			(this._viewModel.metricType = this.metricService.getAttributeTypeByMetric(heightMetric))
	}

	public onColorMetricChanged(colorMetric: string) {
		this.metricSelection == MetricSelections.colorMetric &&
			(this._viewModel.metricType = this.metricService.getAttributeTypeByMetric(colorMetric))
	}

	public onEdgeMetricChanged(edgeMetric: string) {
		this.metricSelection == MetricSelections.edgeMetric &&
			(this._viewModel.metricType = this.edgeMetricDataService.getAttributeTypeByMetric(edgeMetric))
	}

	public onBuildingHovered(hoveredBuilding: CodeMapBuilding) {
		this._viewModel.isFolderHovered = hoveredBuilding.node && !hoveredBuilding.node.isLeaf
	}

	public onBuildingUnhovered() {
		this._viewModel.isFolderHovered = false
	}

	public onMetricDataAdded() {
		const state = this.storeService.getState()
		if (this.metricSelection === MetricSelections.edgeMetric) {
			this._viewModel.metricType = this.edgeMetricDataService.getAttributeTypeByMetric(state.dynamicSettings[this.metricSelection])
		} else {
			this._viewModel.metricType = this.metricService.getAttributeTypeByMetric(state.dynamicSettings[this.metricSelection])
		}
	}
}

export const metricTypeComponent = {
	selector: "metricTypeComponent",
	template: require("./metricType.component.html"),
	controller: MetricTypeController,
	bindings: { metricSelection: "@" }
}
