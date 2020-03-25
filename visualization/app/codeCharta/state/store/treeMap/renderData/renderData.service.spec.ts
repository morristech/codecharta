import "../../../state.module"
import { IRootScopeService } from "angular"
import { StoreService } from "../../../store.service"
import { getService, instantiateModule } from "../../../../../../mocks/ng.mockhelper"
import { RenderDataAction, RenderDataActions } from "./renderData.actions"
import { RenderDataService } from "./renderData.service"
import { withMockedEventMethods } from "../../../../util/dataMocks"

describe("RenderDataService", () => {
	let renderDataService: RenderDataService
	let storeService: StoreService
	let $rootScope: IRootScopeService

	beforeEach(() => {
		restartSystem()
		rebuildService()
		withMockedEventMethods($rootScope)
	})

	function restartSystem() {
		instantiateModule("app.codeCharta.state")

		$rootScope = getService<IRootScopeService>("$rootScope")
		storeService = getService<StoreService>("storeService")
	}

	function rebuildService() {
		renderDataService = new RenderDataService($rootScope, storeService)
	}

	describe("constructor", () => {
		it("should subscribe to store", () => {
			StoreService.subscribe = jest.fn()

			rebuildService()

			expect(StoreService.subscribe).toHaveBeenCalledWith($rootScope, renderDataService)
		})
	})

	describe("onStoreChanged", () => {
		it("should notify all subscribers with the new renderData value", () => {
			const action: RenderDataAction = {
				type: RenderDataActions.SET_RENDER_DATA,
				payload: new RenderData()
			}
			storeService["store"].dispatch(action)

			renderDataService.onStoreChanged(RenderDataActions.SET_RENDER_DATA)

			expect($rootScope.$broadcast).toHaveBeenCalledWith("render-data-changed", { renderData: new RenderData() })
		})

		it("should not notify anything on non-render-data-events", () => {
			renderDataService.onStoreChanged("ANOTHER_ACTION")

			expect($rootScope.$broadcast).not.toHaveBeenCalled()
		})
	})
})
