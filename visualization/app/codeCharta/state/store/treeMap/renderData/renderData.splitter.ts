import { RenderDataAction, setRenderData } from "./renderData.actions"

export function splitRenderDataAction(payload: RenderData): RenderDataAction {
	return setRenderData(payload)
}
