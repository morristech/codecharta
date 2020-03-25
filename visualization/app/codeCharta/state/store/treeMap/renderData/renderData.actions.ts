import { Action } from "redux"

export enum RenderDataActions {
	SET_RENDER_DATA = "SET_RENDER_DATA"
}

export interface SetRenderDataAction extends Action {
	type: RenderDataActions.SET_RENDER_DATA
	payload: RenderData
}

export type RenderDataAction = SetRenderDataAction

export function setRenderData(renderData: RenderData = defaultRenderData): SetRenderDataAction {
	return {
		type: RenderDataActions.SET_RENDER_DATA,
		payload: renderData
	}
}

export const defaultRenderData: RenderData = null
