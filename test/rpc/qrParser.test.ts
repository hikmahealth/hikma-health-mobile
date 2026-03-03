import fc from "fast-check"
import { parseQRCode, isHubQR, isCloudQR } from "../../app/rpc/qrParser"

describe("rpc/qrParser", () => {
  it("parses hub JSON QR to HubQRData", () => {
    fc.assert(
      fc.property(fc.webUrl({ withFragments: false, withQueryParameters: false }), (url) => {
        const data = JSON.stringify({ type: "sync_hub", url })
        const result = parseQRCode(data)
        expect(result).not.toBeNull()
        expect(result!.type).toBe("sync_hub")
        expect(result!.url).toBe(url)
        expect(isHubQR(result!)).toBe(true)
        expect(isCloudQR(result!)).toBe(false)
      }),
    )
  })

  it("parses plain URL to CloudQRData", () => {
    fc.assert(
      fc.property(fc.webUrl({ withFragments: false, withQueryParameters: false }), (url) => {
        const result = parseQRCode(url)
        expect(result).not.toBeNull()
        expect(result!.type).toBe("cloud")
        expect(result!.url).toBe(url)
        expect(isCloudQR(result!)).toBe(true)
        expect(isHubQR(result!)).toBe(false)
      }),
    )
  })

  it("returns null for garbage input", () => {
    expect(parseQRCode("")).toBeNull()
    expect(parseQRCode("not-a-url")).toBeNull()
    expect(parseQRCode("ftp://something")).toBeNull()
    expect(parseQRCode("{}")).toBeNull()
    expect(parseQRCode('{"type":"unknown"}')).toBeNull()
    expect(parseQRCode('{"type":"sync_hub"}')).toBeNull() // missing url
    expect(parseQRCode('{"type":"sync_hub","url":""}')).toBeNull() // empty url
  })

  it("handles http:// URLs as cloud", () => {
    const result = parseQRCode("http://192.168.1.100:8080")
    expect(result).not.toBeNull()
    expect(result!.type).toBe("cloud")
    expect(result!.url).toBe("http://192.168.1.100:8080")
  })

  it("hub JSON takes precedence over URL-like content", () => {
    const data = JSON.stringify({ type: "sync_hub", url: "http://192.168.1.100:8080" })
    const result = parseQRCode(data)
    expect(result).not.toBeNull()
    expect(result!.type).toBe("sync_hub")
  })
})
