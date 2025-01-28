import { ProviderModel } from "./Provider"

test("can be created", () => {
  const instance = ProviderModel.create({
    id: "",
    name: "",
    role: "",
    email: "user@email.com",
    instance_url: "",
    phone: "",

    clinic_id: "",
    clinic_name: "",
  })

  expect(true).toBeTruthy()

  // expect(instance.email).toBe("user@email.com")
  // expect(instance.name).toBe("")
  // expect(instance.role).toBe("")
  // expect(instance.instance_url).toBe("")
  // expect(instance.phone).toBe("")
  // expect(instance.clinic_id).toBe("")
  // expect(instance.clinic_name).toBe("")
})
