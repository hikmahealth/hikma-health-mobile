import { ProviderModel } from "./Provider"

test("can be created", () => {
  const instance = ProviderModel.create({})

  expect(instance).toBeTruthy()
})
