import { StoreService, StoreSubscriber } from "../../store.service"
import { IRootScopeService } from "angular"
import { FilesSelectionActions, NewFilesImportedActions } from "./files.actions"
import { Files } from "../../../model/files"
import { isActionOfType } from "../../../util/reduxHelper"

export interface FilesSelectionSubscriber {
	onFilesSelectionChanged(files: Files)
}

export interface NewFilesImportedSubscriber {
	onNewFilesImported(files: Files)
}

export class FilesService implements StoreSubscriber {
	private static FILES_SELECTION_CHANGED_EVENT = "files-selection-changed"
	private static NEW_FILES_IMPORTED_EVENT = "new-files-imported"

	constructor(private $rootScope: IRootScopeService, private storeService: StoreService) {
		StoreService.subscribe(this.$rootScope, this)
	}

	public onStoreChanged(actionType: string) {
		if (isActionOfType(actionType, FilesSelectionActions)) {
			this.notify(this.select())
		}
		if (isActionOfType(actionType, NewFilesImportedActions)) {
			this.notifyNewFilesImported(this.select())
		}
	}

	private select() {
		return this.storeService.getState().files
	}

	private notify(newState: Files) {
		this.$rootScope.$broadcast(FilesService.FILES_SELECTION_CHANGED_EVENT, { files: newState })
	}

	private notifyNewFilesImported(newState: Files) {
		this.$rootScope.$broadcast(FilesService.NEW_FILES_IMPORTED_EVENT, { files: newState })
	}

	public static subscribe($rootScope: IRootScopeService, subscriber: FilesSelectionSubscriber) {
		$rootScope.$on(FilesService.FILES_SELECTION_CHANGED_EVENT, (event, data) => {
			subscriber.onFilesSelectionChanged(data.files)
		})
	}

	public static subscribeToNewFilesImported($rootScope: IRootScopeService, subscriber: NewFilesImportedSubscriber) {
		$rootScope.$on(FilesService.NEW_FILES_IMPORTED_EVENT, (event, data) => {
			subscriber.onNewFilesImported(data.files)
		})
	}
}
