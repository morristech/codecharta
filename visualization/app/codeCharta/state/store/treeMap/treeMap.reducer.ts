// Plop: Append reducer import here
import { renderData } from "./renderData/renderData.reducer"
import { combineReducers } from "redux"
import { mapSize } from "./mapSize/mapSize.reducer"

const treeMap = combineReducers({
	// Plop: Append sub-reducer here
	renderData,
	mapSize
})

export default treeMap
