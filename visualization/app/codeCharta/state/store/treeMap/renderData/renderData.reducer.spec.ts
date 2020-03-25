import { renderData } from "./renderData.reducer"
import { RenderDataAction, setRenderData } from "./renderData.actions"

describe("renderData", () => {
	describe("Default State", () => {
		it("should initialize the default state", () => {
			const result = renderData(undefined, {} as RenderDataAction)

			expect(result).toEqual(null)
		})
	})

	describe("Action: SET_RENDER_DATA", () => {
		it("should set new renderData", () => {
			const result = renderData(null, setRenderData(new RenderData()))

			expect(result).toEqual(new RenderData())
		})

		it("should set default renderData", () => {
			const result = renderData(new RenderData(), setRenderData())

			expect(result).toEqual(null)
		})
	})
})
