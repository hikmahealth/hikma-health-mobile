import { SyncModel } from "./Sync"

test("can be created", () => {
  const instance = SyncModel.create({})

  expect(instance).toBeDefined()
})
