import { CodeMapNode, Settings, RecursivePartial } from "../codeCharta.model";
import { IAngularEvent, IRootScopeService } from "angular";
import * as d3 from "d3"
import { CodeMapHelper } from "../util/codeMapHelper";
import { CodeMapPreRenderService } from "../ui/codeMap/codeMap.preRender.service";
import { SettingsService, SettingsServiceSubscriber } from "./settings.service";

export interface NodeSearchSubscriber {
	onNodeSearchComplete(searchedNodes: CodeMapNode[], event: IAngularEvent)
}

export class NodeSearchService implements SettingsServiceSubscriber {

    private searchedNodes: CodeMapNode[] = []

    private static NODE_SEARCH_COMPLETE_EVENT = "node-search-complete"

    /* @ngInject */
    constructor(private $rootScope: IRootScopeService, private codeMapPreRenderService: CodeMapPreRenderService) {
        SettingsService.subscribe($rootScope, this)
    }

    public onSettingsChanged(settings: Settings, update: RecursivePartial<Settings>, event: IAngularEvent) {
        if(this.isSearchPatternUpdated(update)){
            this.searchedNodes = this.findSearchedNodes(update.dynamicSettings.searchPattern)
            this.notifyNodeSearchComplete()
		}
    }

    private isSearchPatternUpdated(update: RecursivePartial<Settings>) {
		return update.dynamicSettings && update.dynamicSettings.searchPattern !== undefined
	}

    public getSearchedNodes(): CodeMapNode[] {
        return this.searchedNodes
    }

    private findSearchedNodes(searchPattern: string): CodeMapNode[] {
		if (searchPattern.length == 0) {
			return []
		} else {
			const nodes = d3
				.hierarchy(this.codeMapPreRenderService.getRenderMap())
				.descendants()
				.map(d => d.data)
			return CodeMapHelper.getNodesByGitignorePath(nodes, searchPattern)
		}
    }

    private notifyNodeSearchComplete() {
		this.$rootScope.$broadcast(NodeSearchService.NODE_SEARCH_COMPLETE_EVENT, this.searchedNodes)
    }
    
    public static subscribe($rootScope: IRootScopeService, subscriber: NodeSearchSubscriber) {
		$rootScope.$on(NodeSearchService.NODE_SEARCH_COMPLETE_EVENT, (event, data) => {
			subscriber.onNodeSearchComplete(data, event)
		})
	}

}