"use strict"

import "./scenarioDropDown.component.scss"
import { ScenarioHelper, Scenario } from "../../util/scenarioHelper"
import { MetricService, MetricServiceSubscriber } from "../../state/metric.service"
import { ColorRange, MetricData } from "../../codeCharta.model"
import { IRootScopeService } from "angular"
import { StoreService } from "../../state/store.service"
import { setState } from "../../state/store/state.actions"
import { DialogService } from "../dialog/dialog.service"
import { setColorRange } from "../../state/store/dynamicSettings/colorRange/colorRange.actions"

export class ScenarioDropDownController implements MetricServiceSubscriber {
	private _viewModel: {
		scenarios: Scenario[]
	} = {
		scenarios: null
	}

	private availableMetrics: MetricData[]

	constructor(private $rootScope: IRootScopeService, private storeService: StoreService, private dialogService: DialogService) {
		MetricService.subscribe(this.$rootScope, this)
	}

	public loadScenarios() {
		this._viewModel.scenarios = ScenarioHelper.getScenarios()
	}

	public onMetricDataAdded(metricData: MetricData[]) {
		this._viewModel.scenarios = ScenarioHelper.getScenarios()
		this.availableMetrics = metricData
	}

	public applyScenario(scenarioName: string) {
		const scenario = ScenarioHelper.getScenarioSettingsByName(scenarioName)
		if (this.isScenarioAppliable(scenario.dynamicSettings)) {
			this.storeService.dispatch(setState(scenario))
			this.storeService.dispatch(setColorRange(scenario.dynamicSettings.colorRange as ColorRange))
		} else {
			this.dialogService.showErrorDialog("This metric is not appliable, because not all metrics are available for this map.")
		}
	}

	private isScenarioAppliable(scenario) {
		// Todo: Better solution, to find out if the dynamicValue is a slider oder a metric
		for (let attribute in scenario) {
			if (
				typeof scenario[attribute] === "string" &&
				this.isMetricNotAvailable(scenario[attribute]) === true &&
				scenario[attribute] !== "None"
			) {
				return false
			}
		}
		return true
	}

	private isMetricNotAvailable(metricName: string) {
		return !this.availableMetrics.find(x => x.name == metricName)
	}

	public getVisibility(icon: String, scenarioName: string) {
		const lightGray = "#d3d3d3"
		// TODO: Function to Check if attributes are within the Scenario

		switch (icon) {
			case "view": {
				// TODO: Still Implement if perspective is saved within the scenario
				if (!this._viewModel.scenarios.find(scenario => scenario.name === scenarioName).settings.appSettings.camera) {
					return lightGray
				}
				break
			}
			case "area": {
				if (!this._viewModel.scenarios.find(scenario => scenario.name === scenarioName).settings.dynamicSettings.areaMetric) {
					return lightGray
				}
				break
			}
			case "color": {
				if (!this._viewModel.scenarios.find(scenario => scenario.name === scenarioName).settings.dynamicSettings.colorMetric) {
					return lightGray
				}
				break
			}
			case "height": {
				if (!this._viewModel.scenarios.find(scenario => scenario.name === scenarioName).settings.dynamicSettings.heightMetric) {
					return lightGray
				}
				break
			}
			case "edges": {
				if (!this._viewModel.scenarios.find(scenario => scenario.name === scenarioName).settings.dynamicSettings.edgeMetric) {
					return lightGray
				}
				break
			}
			default:
				return ""
		}
	}

	public showAddScenarioSettings() {
		this.dialogService.showAddScenarioSettings()
	}

	public removeScenario(scenarioName) {
		//TODO: Delete Scenario
		ScenarioHelper.deleteScenario(scenarioName)
	}
}

export const scenarioDropDownComponent = {
	selector: "scenarioDropDownComponent",
	template: require("./scenarioDropDown.component.html"),
	controller: ScenarioDropDownController
}
