import { YouTubeService } from "../youtube-service"

describe("youtube-service", () => {
  test("validateVideoId accepts valid ids", () => {
    expect(YouTubeService.validateVideoId("dQw4w9WgXcQ")).toBe(true)
    expect(YouTubeService.validateVideoId("jNQXAC9IVRw")).toBe(true)
  })

  test("validateVideoId rejects invalid ids", () => {
    expect(YouTubeService.validateVideoId("")).toBe(false)
    expect(YouTubeService.validateVideoId("too-short")).toBe(false)
    expect(YouTubeService.validateVideoId("this-id-is-way-too-long")).toBe(false)
  })

  test("extractVideoId works for youtu.be and watch?v=", () => {
    expect(YouTubeService.extractVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
    expect(YouTubeService.extractVideoId("https://www.youtube.com/watch?v=jNQXAC9IVRw")).toBe("jNQXAC9IVRw")
    expect(YouTubeService.extractVideoId("jNQXAC9IVRw")).toBe("jNQXAC9IVRw")
  })
})

