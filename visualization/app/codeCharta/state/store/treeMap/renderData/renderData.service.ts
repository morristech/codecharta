import { StoreService, StoreSubscriber } from "../../../store.service"
import { IRootScopeService } from "angular"
import { RenderDataActions } from "./renderData.actions"
import { isActionOfType } from "../../../../util/actionHelper"

export interface RenderDataSubscriber {
	onRenderDataChanged(renderData: RenderData)
}

export class RenderDataService implements StoreSubscriber {
	private static RENDER_DATA_CHANGED_EVENT = "render-data-changed"

	constructor(private $rootScope: IRootScopeService, private storeService: StoreService) {
		StoreService.subscribe(this.$rootScope, this)
	}

	public onStoreChanged(actionType: string) {
		if (isActionOfType(actionType, RenderDataActions)) {
			this.notify(this.select())
		}
	}

	private select() {
		return this.storeService.getState().treeMap.renderData
	}

	private notify(newState: RenderData) {
		this.$rootScope.$broadcast(RenderDataService.RENDER_DATA_CHANGED_EVENT, { renderData: newState })
	}

	public static subscribe($rootScope: IRootScopeService, subscriber: RenderDataSubscriber) {
		$rootScope.$on(RenderDataService.RENDER_DATA_CHANGED_EVENT, (event, data) => {
			subscriber.onRenderDataChanged(data.renderData)
		})
	}
}
