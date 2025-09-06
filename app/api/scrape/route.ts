import { type NextRequest, NextResponse } from "next/server"

interface ScrapedLink {
  url: string
  server: string
  language: string
  quality?: string
}

interface ScrapedResult {
  title: string
  year?: number
  type: string
  season?: number
  episode?: number
  links: ScrapedLink[]
  totalLinks: number
  success?: boolean
  seasons?: any[]
  totalSeasons?: number
  totalEpisodes?: number
  error?: string
}

// Función para obtener información de TMDB
async function getTMDBInfo(tmdbId: string, type: "movie" | "tv") {
  const apiKey = process.env.TMDB_API_KEY || "32e5e53999e380a0291d66fb304153fe"

  try {
    // Get basic info
    const infoUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${apiKey}&language=es-ES`
    const infoResponse = await fetch(infoUrl)
    const infoData = await infoResponse.json()

    // Get external IDs (including IMDB ID)
    const externalUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}/external_ids?api_key=${apiKey}`
    const externalResponse = await fetch(externalUrl)
    const externalData = await externalResponse.json()

    console.log("[v0] TMDB Info:", {
      title: type === "movie" ? infoData.title : infoData.name,
      imdbId: externalData.imdb_id,
    })

    return {
      title: type === "movie" ? infoData.title : infoData.name,
      year:
        type === "movie"
          ? infoData.release_date
            ? new Date(infoData.release_date).getFullYear()
            : undefined
          : infoData.first_air_date
            ? new Date(infoData.first_air_date).getFullYear()
            : undefined,
      imdbId: externalData.imdb_id,
    }
  } catch (error) {
    console.error("[v0] Error fetching TMDB info:", error)
    return null
  }
}

// Función para hacer scraping de embed69
async function scrapeEmbed69(imdbId: string, type: "movie" | "tv", season?: string, episode?: string) {
  let endpoint = `https://embed69.com/embed69.php?id=${imdbId}`

  if (type === "tv" && season && episode) {
    endpoint += `&season=${season}&episode=${episode}`
  }

  console.log("[v0] Scraping endpoint:", endpoint)

  try {
    const response = await fetch(endpoint, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const responseText = await response.text()
    console.log("[v0] Raw response length:", responseText.length)
    console.log("[v0] Raw response preview:", responseText.substring(0, 300) + "...")

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.log("[v0] Failed to parse JSON, response might be HTML or invalid")
      return []
    }

    console.log("[v0] Parsed data structure:", {
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : "N/A",
      keys: typeof data === "object" && data !== null ? Object.keys(data) : "N/A",
    })

    if (data.error) {
      console.log("[v0] Embed69 returned error:", data.error)
      return []
    }

    if (!Array.isArray(data) || data.length === 0) {
      console.log("[v0] No valid data array returned from embed69")
      return []
    }

    const links: ScrapedLink[] = []

    try {
      data.forEach((languageData: any, index: number) => {
        console.log(`[v0] Processing language data ${index}:`, {
          keys: Object.keys(languageData || {}),
          video_language: languageData?.video_language,
          hasEmbeds: !!languageData?.sortedEmbeds,
          embedsLength: Array.isArray(languageData?.sortedEmbeds) ? languageData.sortedEmbeds.length : "N/A",
        })

        if (!languageData || typeof languageData !== "object") {
          console.log(`[v0] Skipping invalid language data at index ${index}`)
          return
        }

        const language = getLanguageName(languageData.video_language || "UNK")

        let servers = []

        // Try sortedEmbeds first (standard format)
        if (languageData.sortedEmbeds && Array.isArray(languageData.sortedEmbeds)) {
          servers = languageData.sortedEmbeds
          console.log(`[v0] Using sortedEmbeds for ${language}, found ${servers.length} servers`)
        }
        // Try embeds as fallback
        else if (languageData.embeds && Array.isArray(languageData.embeds)) {
          servers = languageData.embeds
          console.log(`[v0] Using embeds for ${language}, found ${servers.length} servers`)
        }
        // Try any other array properties
        else {
          const arrayProps = Object.keys(languageData).filter(
            (key) => Array.isArray(languageData[key]) && languageData[key].length > 0,
          )

          if (arrayProps.length > 0) {
            servers = languageData[arrayProps[0]]
            console.log(`[v0] Using ${arrayProps[0]} for ${language}, found ${servers.length} servers`)
          }
        }

        if (!Array.isArray(servers) || servers.length === 0) {
          console.log(`[v0] No servers found for language ${language}`)
          return
        }

        const validServers = servers.filter((server: any) => {
          if (!server || typeof server !== "object") return false

          // Check for link property
          if (server.link && typeof server.link === "string" && server.link.trim() !== "") {
            return true
          }

          // Check for url property as alternative
          if (server.url && typeof server.url === "string" && server.url.trim() !== "") {
            return true
          }

          // Check for href property as alternative
          if (server.href && typeof server.href === "string" && server.href.trim() !== "") {
            return true
          }

          return false
        })

        console.log(`[v0] Valid servers for ${language}: ${validServers.length}/${servers.length}`)

        if (validServers.length === 0) {
          console.log(`[v0] No valid servers found for language ${language}`)
          return
        }

        validServers.forEach((server: any, serverIndex: number) => {
          const linkUrl = server.link || server.url || server.href || ""
          const serverName = server.server || server.name || extractServerName(linkUrl) || "Servidor desconocido"

          console.log(`[v0] Adding link ${serverIndex + 1}: ${serverName} - ${linkUrl.substring(0, 50)}...`)

          links.push({
            url: linkUrl,
            server: serverName,
            language: language,
            quality: extractQualityFromUrl(linkUrl),
          })
        })
      })
    } catch (processingError) {
      console.error("[v0] Error processing embed69 data:", processingError)
      return []
    }

    console.log("[v0] Total extracted links:", links.length)
    console.log(
      "[v0] Links by server:",
      links.reduce((acc: any, link) => {
        acc[link.server] = (acc[link.server] || 0) + 1
        return acc
      }, {}),
    )

    return links
  } catch (error) {
    console.error("[v0] Error scraping embed69:", error)
    return []
  }
}

// Función para verificar la disponibilidad de embed69
async function checkEmbed69Availability(imdbId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://embed69.com/embed69.php?id=${imdbId}`)
    const responseText = await response.text()

    console.log("[v0] Availability check response length:", responseText.length)
    console.log("[v0] Availability check response preview:", responseText.substring(0, 200))

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.log("[v0] Failed to parse availability check response")
      return false
    }

    if (data.error) {
      console.log("[v0] Embed69 availability error:", data.error)
      return false
    }

    if (Array.isArray(data) && data.length > 0) {
      console.log("[v0] Found data array with length:", data.length)

      // Check if any language data has any kind of embeds/servers
      return data.some((langData: any) => {
        if (!langData || typeof langData !== "object") return false

        // Check for sortedEmbeds (standard format)
        if (langData.sortedEmbeds && Array.isArray(langData.sortedEmbeds) && langData.sortedEmbeds.length > 0) {
          return true
        }

        // Check for other possible embed formats
        if (langData.embeds && Array.isArray(langData.embeds) && langData.embeds.length > 0) {
          return true
        }

        // Check if the object has any properties that might contain links
        const keys = Object.keys(langData)
        return keys.some((key) => {
          const value = langData[key]
          return Array.isArray(value) && value.length > 0
        })
      })
    }

    return false
  } catch (error) {
    console.error("[v0] Error checking embed69 availability:", error)
    return false
  }
}

// Funciones auxiliares para extraer información
function extractServerName(url: string): string {
  try {
    const domain = new URL(url).hostname
    return domain.replace("www.", "").split(".")[0] || "Desconocido"
  } catch {
    return "Desconocido"
  }
}

function getLanguageName(code: string): string {
  const languageMap: { [key: string]: string } = {
    SPA: "Español",
    LAT: "Latino",
    ENG: "Inglés",
    SUB: "Subtitulado",
    UNK: "Desconocido",
  }
  return languageMap[code] || code
}

function extractQualityFromUrl(url: string): string | undefined {
  if (url.includes("4k") || url.includes("2160p")) return "4K"
  if (url.includes("1080p") || url.includes("fullhd")) return "1080p"
  if (url.includes("720p") || url.includes("hd")) return "720p"
  if (url.includes("480p")) return "480p"
  return undefined
}

async function getTVSeasonInfo(tmdbId: string) {
  const apiKey = process.env.TMDB_API_KEY || "32e5e53999e380a0291d66fb304153fe"

  try {
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}&language=es-ES`
    const response = await fetch(url)
    const data = await response.json()

    console.log("[v0] TV Series info:", {
      name: data.name,
      seasons: data.number_of_seasons,
      episodes: data.number_of_episodes,
    })

    return {
      seasons: data.seasons?.filter((season: any) => season.season_number > 0) || [],
      totalSeasons: data.number_of_seasons || 0,
    }
  } catch (error) {
    console.error("[v0] Error fetching TV season info:", error)
    return { seasons: [], totalSeasons: 0 }
  }
}

async function scrapeAllEpisodes(imdbId: string, tmdbId: string) {
  const seasonInfo = await getTVSeasonInfo(tmdbId)
  const allResults: any[] = []

  console.log("[v0] Starting to scrape all episodes for", seasonInfo.totalSeasons, "seasons")

  for (const season of seasonInfo.seasons) {
    const seasonNumber = season.season_number
    const episodeCount = season.episode_count

    console.log(`[v0] Scraping season ${seasonNumber} with ${episodeCount} episodes`)

    const seasonResults = {
      season: seasonNumber,
      episodes: [] as any[],
    }

    // Scrape each episode in the season
    for (let episodeNumber = 1; episodeNumber <= episodeCount; episodeNumber++) {
      try {
        console.log(`[v0] Scraping S${seasonNumber}E${episodeNumber}`)
        const links = await scrapeEmbed69(imdbId, "tv", seasonNumber.toString(), episodeNumber.toString())

        seasonResults.episodes.push({
          episode: episodeNumber,
          links,
          totalLinks: links.length,
        })

        // Small delay to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`[v0] Error scraping S${seasonNumber}E${episodeNumber}:`, error)
        seasonResults.episodes.push({
          episode: episodeNumber,
          links: [],
          totalLinks: 0,
          error: error instanceof Error ? error.message : "Error desconocido",
        })
      }
    }

    allResults.push(seasonResults)
  }

  return allResults
}

async function scrapeCuevana(tmdbId: string, type: "movie" | "tv", season?: string, episode?: string) {
  let endpoint = `https://embed69.com/cuevana.php?tmdb=${tmdbId}`

  if (type === "tv" && season && episode) {
    endpoint += `&season=${season}&episode=${episode}`
  }

  console.log("[v0] Scraping Cuevana endpoint:", endpoint)

  try {
    const response = await fetch(endpoint, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const responseText = await response.text()
    console.log("[v0] Cuevana raw response length:", responseText.length)
    console.log("[v0] Cuevana raw response preview:", responseText.substring(0, 300) + "...")

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.log("[v0] Failed to parse Cuevana JSON, response might be HTML or invalid")
      return []
    }

    console.log("[v0] Cuevana parsed data structure:", {
      isArray: Array.isArray(data),
      keys: typeof data === "object" && data !== null ? Object.keys(data) : "N/A",
      success: data?.success,
      hasLanguages: !!data?.languages,
    })

    if (data.error) {
      console.log("[v0] Cuevana returned error:", data.error)
      return []
    }

    const links: ScrapedLink[] = []

    if (data.success && data.languages && typeof data.languages === "object") {
      console.log("[v0] Processing Cuevana format with languages object")

      // Process each language in the languages object
      Object.keys(data.languages).forEach((languageKey) => {
        const languageData = data.languages[languageKey]

        console.log(`[v0] Complete language data for ${languageKey}:`, JSON.stringify(languageData, null, 2))

        if (!languageData || typeof languageData !== "object") {
          return
        }

        // Map language keys to readable names
        const languageMap: { [key: string]: string } = {
          latino: "Latino",
          subtitulado: "Subtitulado",
          español: "Español",
          ingles: "Inglés",
          english: "Inglés",
        }

        const language = languageMap[languageKey.toLowerCase()] || languageKey

        Object.keys(languageData).forEach((serverKey) => {
          const serverValue = languageData[serverKey]

          // Check if this property contains a direct link (URL string)
          if (typeof serverValue === "string" && serverValue.startsWith("http")) {
            console.log(`[v0] Found direct link in ${serverKey}: ${serverValue.substring(0, 50)}...`)

            // Extract server name from the key (remove 'scr' suffix if present)
            let serverName = serverKey.replace(/scr$/, "").replace(/script$/, "")

            // Map common server key names to readable names
            const serverNameMap: { [key: string]: string } = {
              streamwish: "StreamWish",
              vidhide: "VidHide",
              doodstream: "DoodStream",
              streamtape: "StreamTape",
              netu: "Netu",
              voesx: "Voe",
              voesxscr: "Voe",
              filemoon: "FileMoon",
            }

            serverName = serverNameMap[serverName.toLowerCase()] || serverName

            links.push({
              url: serverValue,
              server: serverName,
              language: language,
              quality: extractQualityFromUrl(serverValue),
            })

            console.log(`[v0] Added Cuevana link: ${serverName} - ${serverValue.substring(0, 50)}...`)
          }
          // Also check if it's an object with link properties (fallback)
          else if (typeof serverValue === "object" && serverValue !== null) {
            const linkUrl = serverValue.link || serverValue.url || serverValue.href || ""
            if (linkUrl && typeof linkUrl === "string" && linkUrl.startsWith("http")) {
              const serverName = serverValue.server || serverValue.name || extractServerName(linkUrl) || serverKey

              links.push({
                url: linkUrl,
                server: serverName,
                language: language,
                quality: extractQualityFromUrl(linkUrl),
              })

              console.log(`[v0] Added Cuevana object link: ${serverName} - ${linkUrl.substring(0, 50)}...`)
            }
          }
        })
      })
    } else if (Array.isArray(data) && data.length > 0) {
      console.log("[v0] Processing Cuevana array format")

      data.forEach((languageData: any, index: number) => {
        if (!languageData || typeof languageData !== "object") {
          return
        }

        const language = getLanguageName(languageData.video_language || "UNK")
        const servers = languageData.sortedEmbeds || languageData.embeds || []

        if (!Array.isArray(servers) || servers.length === 0) {
          return
        }

        servers.forEach((server: any) => {
          if (!server || typeof server !== "object") return

          const linkUrl = server.link || server.url || server.href || ""
          if (!linkUrl || linkUrl.trim() === "") return

          const serverName = server.server || server.name || extractServerName(linkUrl) || "Cuevana"

          links.push({
            url: linkUrl,
            server: serverName,
            language: language,
            quality: extractQualityFromUrl(linkUrl),
          })
        })
      })
    } else {
      console.log("[v0] Cuevana data format not recognized")
    }

    console.log("[v0] Cuevana extracted links:", links.length)
    console.log(
      "[v0] Cuevana links by server:",
      links.reduce((acc: any, link) => {
        acc[link.server] = (acc[link.server] || 0) + 1
        return acc
      }, {}),
    )

    return links
  } catch (error) {
    console.error("[v0] Error scraping Cuevana:", error)
    return []
  }
}

function filterLinksByServers(links: ScrapedLink[], selectedServers: string[]): ScrapedLink[] {
  if (selectedServers.length === 0) {
    return links // Return all links if no servers selected
  }

  return links.filter((link) => {
    // Normalize server names for comparison (remove case sensitivity and common suffixes)
    const normalizedLinkServer = link.server
      .toLowerCase()
      .replace(/\s*$$cuevana$$$/i, "") // Remove (Cuevana) suffix if still present
      .replace(/\s+/g, "") // Remove spaces

    return selectedServers.some((selectedServer) => {
      const normalizedSelectedServer = selectedServer.toLowerCase().replace(/\s+/g, "")
      return (
        normalizedLinkServer.includes(normalizedSelectedServer) ||
        normalizedSelectedServer.includes(normalizedLinkServer)
      )
    })
  })
}

function filterOutDownloadLinks(links: ScrapedLink[]): ScrapedLink[] {
  return links.filter((link) => {
    // Check if URL or server name contains "download" (case insensitive)
    const urlContainsDownload = link.url.toLowerCase().includes("download")
    const serverContainsDownload = link.server.toLowerCase().includes("download")

    // Return false if either URL or server contains "download" (exclude the link)
    return !urlContainsDownload && !serverContainsDownload
  })
}

const availableServers = [
  "Vidhide",
  "Streamwish",
  "Filemoon",
  "Voe",
  "Doodstream",
  "Streamtape",
  "Netu",
  "Embed69",
  "Cuevana",
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tmdbId = searchParams.get("tmdbId")
    const type = searchParams.get("type") as "movie" | "tv"
    const season = searchParams.get("season")
    const episode = searchParams.get("episode")
    const fullSeason = searchParams.get("fullSeason") === "true"
    const serversParam = searchParams.get("servers")
    const selectedServers = serversParam ? serversParam.split(",").map((s) => s.trim()) : []

    if (!tmdbId || !type) {
      return NextResponse.json({ error: "TMDB ID y tipo son requeridos" }, { status: 400 })
    }

    console.log("[v0] Starting scrape for TMDB ID:", tmdbId, "Type:", type, "Full season:", fullSeason)
    if (selectedServers.length > 0) {
      console.log("[v0] Filtering by servers:", selectedServers)
    }

    // Obtener información de TMDB incluyendo IMDB ID
    const tmdbInfo = await getTMDBInfo(tmdbId, type)

    if (!tmdbInfo) {
      return NextResponse.json({ error: "No se pudo obtener información de TMDB" }, { status: 404 })
    }

    if (!tmdbInfo.imdbId) {
      return NextResponse.json({ error: "No se encontró IMDB ID para este contenido" }, { status: 404 })
    }

    console.log("[v0] Found IMDB ID:", tmdbInfo.imdbId)

    if (type === "tv" && fullSeason) {
      try {
        const seasonInfo = await getTVSeasonInfo(tmdbId)
        const allResults: any[] = []

        for (const season of seasonInfo.seasons) {
          const seasonNumber = season.season_number
          const episodeCount = season.episode_count

          const seasonResults = {
            season: seasonNumber,
            episodes: [] as any[],
          }

          for (let episodeNumber = 1; episodeNumber <= episodeCount; episodeNumber++) {
            try {
              console.log(`[v0] Extracting from both embed69 and cuevana for S${seasonNumber}E${episodeNumber}`)

              const [embed69Links, cuevanaLinks] = await Promise.all([
                scrapeEmbed69(tmdbInfo.imdbId, "tv", seasonNumber.toString(), episodeNumber.toString()),
                scrapeCuevana(tmdbId, "tv", seasonNumber.toString(), episodeNumber.toString()),
              ])

              // Combine links from both sources
              const allLinks = [...embed69Links, ...cuevanaLinks]
              console.log(`[v0] Found ${embed69Links.length} embed69 links and ${cuevanaLinks.length} cuevana links`)

              const linksWithoutDownloads = filterOutDownloadLinks(allLinks)
              const filteredLinks = filterLinksByServers(linksWithoutDownloads, selectedServers)

              seasonResults.episodes.push({
                episode: episodeNumber,
                links: filteredLinks,
                totalLinks: filteredLinks.length,
              })

              await new Promise((resolve) => setTimeout(resolve, 500))
            } catch (error) {
              console.error(`[v0] Error scraping S${seasonNumber}E${episodeNumber}:`, error)
              seasonResults.episodes.push({
                episode: episodeNumber,
                links: [],
                totalLinks: 0,
                error: error instanceof Error ? error.message : "Error desconocido",
              })
            }
          }

          allResults.push(seasonResults)
        }

        const result = {
          title: tmdbInfo.title,
          year: tmdbInfo.year,
          type,
          seasons: allResults,
          totalSeasons: allResults.length,
          totalEpisodes: allResults.reduce((total, season) => total + season.episodes.length, 0),
          success: true,
        }

        console.log("[v0] Full season scraping completed")
        return NextResponse.json(result)
      } catch (error) {
        console.error("[v0] Full season scraping failed:", error)
        return NextResponse.json(
          {
            error: "Error al extraer temporadas completas",
            details: error instanceof Error ? error.message : "Error desconocido",
            success: false,
          },
          { status: 500 },
        )
      }
    }

    console.log("[v0] Extracting from both embed69 and cuevana")

    const [embed69Links, cuevanaLinks] = await Promise.all([
      scrapeEmbed69(tmdbInfo.imdbId, type, season, episode),
      scrapeCuevana(tmdbId, type, season, episode),
    ])

    // Combine links from both sources
    const allLinks = [...embed69Links, ...cuevanaLinks]
    console.log(`[v0] Found ${embed69Links.length} embed69 links and ${cuevanaLinks.length} cuevana links`)

    const linksWithoutDownloads = filterOutDownloadLinks(allLinks)
    const filteredLinks = filterLinksByServers(linksWithoutDownloads, selectedServers)

    if (filteredLinks.length === 0 && selectedServers.length > 0) {
      console.log("[v0] No links found after server filtering")
    } else if (filteredLinks.length === 0) {
      console.log("[v0] No links found from both embed69 and Cuevana")
    } else {
      console.log(
        "[v0] Scraping successful, found",
        filteredLinks.length,
        "filtered links out of",
        linksWithoutDownloads.length,
        "total (after removing downloads)",
      )
    }

    const result: ScrapedResult = {
      title: tmdbInfo.title,
      year: tmdbInfo.year,
      type,
      ...(season && { season: Number.parseInt(season) }),
      ...(episode && { episode: Number.parseInt(episode) }),
      links: filteredLinks,
      totalLinks: filteredLinks.length,
      success: filteredLinks.length > 0,
      ...(filteredLinks.length === 0 && {
        error:
          selectedServers.length > 0
            ? `No se encontraron enlaces para los servidores seleccionados: ${selectedServers.join(", ")}`
            : "No se encontraron enlaces en embed69 ni Cuevana para este contenido",
      }),
    }

    console.log("[v0] Final result:", result)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] API Error:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
        success: false,
      },
      { status: 500 },
    )
  }
}
