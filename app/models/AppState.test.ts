import { AppStateModel } from "./AppState"

test("can be created", () => {
  const instance = AppStateModel.create({})

  expect(instance).toBeTruthy()
})
