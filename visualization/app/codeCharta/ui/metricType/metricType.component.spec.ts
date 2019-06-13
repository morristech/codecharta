import "./metricType.module"
import { MetricTypeController } from "./metricType.component"
import { getService, instantiateModule } from "../../../../mocks/ng.mockhelper"
import { MetricService } from "../../state/metric.service"
import { IRootScopeService } from "angular"
import { SettingsService } from "../../state/settings.service"
import { AttributeType, Settings } from "../../codeCharta.model"
import { SETTINGS } from "../../util/dataMocks"
import { CodeMapBuilding } from "../codeMap/rendering/codeMapBuilding"
import { CodeMapMouseEventService } from "../codeMap/codeMap.mouseEvent.service"
import { FileStateService } from "../../state/fileState.service"

describe("MetricTypeController", () => {
	let metricTypeController: MetricTypeController
	let $rootScope: IRootScopeService
	let metricService: MetricService
	let settingsService: SettingsService

	let settings: Settings

	beforeEach(() => {
		restartSystem()
		rebuildController()
		withMockedSettingsService()
	})

	function restartSystem() {
		instantiateModule("app.codeCharta.ui.metricType")

		$rootScope = getService<IRootScopeService>("$rootScope")
		metricService = getService<MetricService>("metricService")

		settings = JSON.parse(JSON.stringify(SETTINGS))
	}

	function rebuildController() {
		metricTypeController = new MetricTypeController($rootScope, metricService)
	}

	function withMockedSettingsService() {
		settingsService = metricTypeController["settingsService"] = jest.fn().mockReturnValue({
			getSettings: jest.fn().mockReturnValue(settings)
		})()
	}

	describe("constructor", () => {
		beforeEach(() => {
			SettingsService.subscribe = jest.fn()
			CodeMapMouseEventService.subscribe = jest.fn()
			FileStateService.subscribe = jest.fn()
		})

		it("should subscribe to SettingsService", () => {
			rebuildController()

			expect(SettingsService.subscribe).toHaveBeenCalledWith($rootScope, metricTypeController)
		})

		it("should subscribe to CodeMapMouseEventService", () => {
			rebuildController()

			expect(CodeMapMouseEventService.subscribe).toHaveBeenCalledWith($rootScope, metricTypeController)
		})
	})

	describe("onSettingsChanged", () => {
		it("should set the areaMetricType to absolute", () => {
			metricTypeController.onSettingsChanged(settings, { dynamicSettings: { areaMetric: "rloc" } }, undefined)

			expect(metricTypeController["_viewModel"].areaMetricType).toBe(AttributeType.absolute)
		})

		it("should set the heightMetricType to absolute", () => {
			metricTypeController.onSettingsChanged(settings, { dynamicSettings: { heightMetric: "mcc" } }, undefined)

			expect(metricTypeController["_viewModel"].heightMetricType).toBe(AttributeType.absolute)
		})

		it("should set the colorMetricType to relative", () => {
			metricTypeController.onSettingsChanged(settings, { dynamicSettings: { colorMetric: "coverage" } }, undefined)

			expect(metricTypeController["_viewModel"].colorMetricType).toBe(AttributeType.relative)
		})
	})

	describe("isAreaMetricAbsolute", () => {
		it("should return true if areaMetric is absolute", () => {
			metricTypeController["_viewModel"].areaMetricType = AttributeType.absolute

			const actual = metricTypeController.isAreaMetricAbsolute()

			expect(actual).toBeTruthy()
		})

		it("should return true if areaMetric is null", () => {
			metricTypeController["_viewModel"].colorMetricType = null

			const actual = metricTypeController.isColorMetricAbsolute()

			expect(actual).toBeTruthy()
		})

		it("should return false if areaMetric is relative", () => {
			metricTypeController["_viewModel"].areaMetricType = AttributeType.relative

			const actual = metricTypeController.isAreaMetricAbsolute()

			expect(actual).toBeFalsy()
		})
	})

	describe("isHeightMetricAbsolute", () => {
		it("should return true if areaMetric is absolute", () => {
			metricTypeController["_viewModel"].heightMetricType = AttributeType.absolute

			const actual = metricTypeController.isHeightMetricAbsolute()

			expect(actual).toBeTruthy()
		})

		it("should return true if heightMetric is null", () => {
			metricTypeController["_viewModel"].colorMetricType = null

			const actual = metricTypeController.isColorMetricAbsolute()

			expect(actual).toBeTruthy()
		})

		it("should return false if heightMetric is relative", () => {
			metricTypeController["_viewModel"].heightMetricType = AttributeType.relative

			const actual = metricTypeController.isHeightMetricAbsolute()

			expect(actual).toBeFalsy()
		})
	})

	describe("isColorMetricAbsolute", () => {
		it("should return true if colorMetric is absolute", () => {
			metricTypeController["_viewModel"].colorMetricType = AttributeType.absolute

			const actual = metricTypeController.isColorMetricAbsolute()

			expect(actual).toBeTruthy()
		})

		it("should return true if colorMetric is null", () => {
			metricTypeController["_viewModel"].colorMetricType = null

			const actual = metricTypeController.isColorMetricAbsolute()

			expect(actual).toBeTruthy()
		})

		it("should return false if colorMetric is relative", () => {
			metricTypeController["_viewModel"].colorMetricType = AttributeType.relative

			const actual = metricTypeController.isColorMetricAbsolute()

			expect(actual).toBeFalsy()
		})
	})

	describe("onBuildingHovered", () => {
		it("should set isBuildingHovered to false", () => {
			metricTypeController.onBuildingHovered({ from: {} as CodeMapBuilding, to: undefined }, undefined)

			expect(metricTypeController["_viewModel"].isBuildingHovered).toBeFalsy()
		})

		it("should set isBuildingHovered to true", () => {
			metricTypeController.onBuildingHovered(
				{
					from: undefined,
					to: { node: { isLeaf: false } } as CodeMapBuilding
				},
				undefined
			)

			expect(metricTypeController["_viewModel"].isBuildingHovered).toBeTruthy()
		})

		it("should not set isBuildingHovered to true if building is a leaf", () => {
			metricTypeController.onBuildingHovered(
				{
					from: undefined,
					to: { node: { isLeaf: true } } as CodeMapBuilding
				},
				undefined
			)

			expect(metricTypeController["_viewModel"].isBuildingHovered).toBeFalsy()
		})

		it("should set isBuildingHovered to true when going from a folder to another folder", () => {
			metricTypeController.onBuildingHovered(
				{
					from: { node: { isLeaf: false } } as CodeMapBuilding,
					to: { node: { isLeaf: false } } as CodeMapBuilding
				},
				undefined
			)

			expect(metricTypeController["_viewModel"].isBuildingHovered).toBeTruthy()
		})
	})
})