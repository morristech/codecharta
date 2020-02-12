import "./codeMap.module"
import "../../codeCharta.module"
import { CodeMapRenderService } from "./codeMap.render.service"
import { CCFile, CodeMapNode, FileMeta, MetricData } from "../../model/codeCharta.model"
import { IRootScopeService } from "angular"
import { getService, instantiateModule } from "../../../../mocks/ng.mockhelper"
import { MetricService } from "../../state/metric.service"
import { TEST_FILE_WITH_PATHS, METRIC_DATA, withMockedEventMethods, FILE_STATES, STATE } from "../../util/dataMocks"
import { CodeMapPreRenderService } from "./codeMap.preRender.service"
import { EdgeMetricDataService } from "../../state/edgeMetricData.service"
import { NodeDecorator } from "../../util/nodeDecorator"
import _ from "lodash"
import { StoreService } from "../../state/store.service"
import { ScalingService } from "../../state/store/appSettings/scaling/scaling.service"
import { setDynamicSettings } from "../../state/store/dynamicSettings/dynamicSettings.actions"
import { ScalingActions } from "../../state/store/appSettings/scaling/scaling.actions"
import { Vector3 } from "three"
import { IsLoadingMapActions } from "../../state/store/appSettings/isLoadingMap/isLoadingMap.actions"
import { addFile, resetFiles, setSingleByName } from "../../state/store/files/files.actions"

describe("codeMapPreRenderService", () => {
	let codeMapPreRenderService: CodeMapPreRenderService
	let $rootScope: IRootScopeService
	let storeService: StoreService
	let metricService: MetricService
	let codeMapRenderService: CodeMapRenderService
	let edgeMetricDataService: EdgeMetricDataService

	let file: CCFile
	let fileMeta: FileMeta
	let map: CodeMapNode
	let metricData: MetricData[]

	beforeEach(() => {
		restartSystem()
		rebuildService()
		withMockedEventMethods($rootScope)
		withMockedCodeMapRenderService()
		withMockedMetricService()
		withUnifiedMapAndFileMeta()
		storeService.dispatch(setDynamicSettings(STATE.dynamicSettings))
		initFiles()
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	function restartSystem() {
		instantiateModule("app.codeCharta.ui.codeMap")

		$rootScope = getService<IRootScopeService>("$rootScope")
		storeService = getService<StoreService>("storeService")
		metricService = getService<MetricService>("metricService")
		codeMapRenderService = getService<CodeMapRenderService>("codeMapRenderService")
		edgeMetricDataService = getService<EdgeMetricDataService>("edgeMetricDataService")

		file = _.cloneDeep(TEST_FILE_WITH_PATHS)
		fileMeta = _.cloneDeep(FILE_STATES[0].file.fileMeta)
		map = _.cloneDeep(TEST_FILE_WITH_PATHS.map)
		map.children[1].children = _.slice(map.children[1].children, 0, 2)
		metricData = _.cloneDeep(METRIC_DATA)
	}

	function rebuildService() {
		codeMapPreRenderService = new CodeMapPreRenderService(
			$rootScope,
			storeService,
			metricService,
			codeMapRenderService,
			edgeMetricDataService
		)
	}

	function withMockedCodeMapRenderService() {
		codeMapRenderService = codeMapPreRenderService["codeMapRenderService"] = jest.fn().mockReturnValue({
			render: jest.fn(),
			scaleMap: jest.fn()
		})()
	}

	function withMockedMetricService() {
		metricService = codeMapPreRenderService["metricService"] = jest.fn().mockReturnValue({
			getMetricData: jest.fn().mockReturnValue(metricData),
			isMetricAvailable: jest.fn().mockReturnValue(true)
		})()
	}

	function withUnifiedMapAndFileMeta() {
		codeMapPreRenderService["unifiedMap"] = map
		codeMapPreRenderService["unifiedFileMeta"] = fileMeta
	}

	function initFiles() {
		storeService.dispatch(resetFiles())
		storeService.dispatch(addFile(NodeDecorator.preDecorateFile(_.cloneDeep(FILE_STATES[0].file))))
		storeService.dispatch(setSingleByName(FILE_STATES[0].file.fileMeta.fileName))
	}

	describe("constructor", () => {
		beforeEach(() => {
			MetricService.subscribe = jest.fn()
			StoreService.subscribe = jest.fn()
			ScalingService.subscribe = jest.fn()
		})

		it("should call subscribe for MetricService", () => {
			rebuildService()

			expect(MetricService.subscribe).toHaveBeenCalledWith($rootScope, codeMapPreRenderService)
		})

		it("should call subscribe for StoreService", () => {
			rebuildService()

			expect(StoreService.subscribe).toHaveBeenCalledWith($rootScope, codeMapPreRenderService)
		})

		it("should call subscribe for ScalingService", () => {
			rebuildService()

			expect(ScalingService.subscribe).toHaveBeenCalledWith($rootScope, codeMapPreRenderService)
		})
	})

	describe("getRenderMap", () => {
		it("should return unifiedMap", () => {
			codeMapPreRenderService["unifiedMap"] = file.map

			const result = codeMapPreRenderService.getRenderMap()

			expect(result).toEqual(file.map)
		})
	})

	describe("onStoreChanged", () => {
		it("should call codeMapRenderService.render", done => {
			codeMapPreRenderService.onStoreChanged("SOME_ACTION")

			setTimeout(() => {
				expect(codeMapRenderService.render).toHaveBeenCalled()
				expect(storeService.getState().appSettings.isLoadingFile).toBeFalsy()
				expect(storeService.getState().appSettings.isLoadingMap).toBeFalsy()
				done()
			}, CodeMapPreRenderService["DEBOUNCE_TIME"])
		})

		it("should not call codeMapRenderService.render for scaling actions", () => {
			codeMapPreRenderService.onStoreChanged(ScalingActions.SET_SCALING)

			expect(codeMapRenderService.render).not.toHaveBeenCalled()
		})

		it("should not call codeMapRenderService.render for scaling actions", () => {
			codeMapPreRenderService.onStoreChanged(IsLoadingMapActions.SET_IS_LOADING_MAP)

			expect(codeMapRenderService.render).not.toHaveBeenCalled()
		})
	})

	describe("onScalingChanged", () => {
		it("should call codeMapRenderService.render", () => {
			codeMapPreRenderService.onScalingChanged(new Vector3(1, 2, 3))

			expect(codeMapRenderService.scaleMap).toHaveBeenCalled()
		})
		it("should stop the loading map gif", () => {
			codeMapPreRenderService.onScalingChanged(new Vector3(1, 2, 3))

			expect(storeService.getState().appSettings.isLoadingMap).toBeFalsy()
		})
	})

	describe("onMetricDataAdded", () => {
		const originalDecorateMap = NodeDecorator.decorateMap
		beforeEach(() => {
			edgeMetricDataService.getMetricValuesForNode = jest.fn((node: d3.HierarchyNode<CodeMapNode>) => {
				if (node.data.name === "big leaf") {
					return new Map().set("metric1", { incoming: 1, outgoing: 2 })
				} else {
					return new Map()
				}
			})
		})

		it("should call Node Decorator functions if all required data is available", () => {
			NodeDecorator.decorateMap = jest.fn()
			NodeDecorator.decorateParentNodesWithSumAttributes = jest.fn()

			codeMapPreRenderService.onMetricDataAdded(metricData)

			expect(NodeDecorator.decorateMap).toHaveBeenCalledWith(map, fileMeta, metricData)
			expect(NodeDecorator.decorateParentNodesWithSumAttributes).toHaveBeenCalled()
		})

		it("should retrieve correct edge metrics for leaves", () => {
			NodeDecorator.decorateMap = originalDecorateMap

			codeMapPreRenderService.onMetricDataAdded(metricData)

			const rootChildren = codeMapPreRenderService["unifiedMap"].children
			expect(rootChildren.find(x => x.name == "big leaf").edgeAttributes).toEqual({ metric1: { incoming: 1, outgoing: 2 } })
		})
	})
})
