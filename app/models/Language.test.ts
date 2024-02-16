import { LanguageModel } from "./Language"

test("can be created", () => {
  const instance = LanguageModel.create({})

  expect(instance).toBeTruthy()
})
