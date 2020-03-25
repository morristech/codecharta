import { RenderDataAction, RenderDataActions, setRenderData } from "./renderData.actions"
const clone = require("rfdc")()

export function renderData(state: RenderData = setRenderData().payload, action: RenderDataAction): RenderData {
	switch (action.type) {
		case RenderDataActions.SET_RENDER_DATA:
			return clone(action.payload) //TODO: clone not required for primitives
		default:
			return state
	}
}
