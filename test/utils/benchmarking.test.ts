import { generateDummyPatients } from "../../app/utils/benchmarking"

describe("generateDummyPatients", () => {
  it("should generate the specified number of patients, visits, and events", () => {
    const patientsCount = 5
    const visitsCount = 3
    const eventsCount = 2
    const result = generateDummyPatients(patientsCount, visitsCount, eventsCount)

    expect(result.length).toBe(patientsCount)
    expect(result[0].visits.length).toBe(visitsCount)
    expect(result[0].events.length).toBe(eventsCount)
  })
})
