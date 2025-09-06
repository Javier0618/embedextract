import fetch from "node-fetch"

class Embed69Scraper {
  constructor() {
    this.embed69BaseUrl = "https://embed69.com/"
    this.tmdbBaseUrl = "https://api.themoviedb.org/3"
    // Using one of your API keys from the original code
    this.tmdbApiKey =
      "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwNTkwMjg5NjA3NDY5NTcwOWQ3NzYzNTA1YmI4OGI0ZCIsInN1YiI6IjY0YWQzMGRhOGZlZTk1MDA4OGZlYmM1MyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.RCU98t08JcUd1VBVYCjjnBYpLGqHGmI4fgwtfP8QLgQ"
  }

  /**
   * Busca información de película/serie en TMDB por ID
   */
  async searchTMDB(id, type = "movie") {
    try {
      const url = `${this.tmdbBaseUrl}/${type}/${id}?language=es-ES`
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.tmdbApiKey}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`)
      }

      const data = await response.json()
      return {
        tmdbId: data.id,
        imdbId: data.imdb_id,
        title: data.title || data.name,
        overview: data.overview,
        releaseDate: data.release_date || data.first_air_date,
        type: type,
      }
    } catch (error) {
      console.error("Error searching TMDB:", error)
      return null
    }
  }

  /**
   * Extrae enlaces de embed69.com usando IMDB ID
   */
  async extractEmbed69Links(imdbId, season = null, episode = null) {
    try {
      let url = `${this.embed69BaseUrl}embed69.php?id=${imdbId}`

      // Agregar parámetros de temporada y episodio si es una serie
      if (season && episode) {
        url += `&season=${season}&episode=${episode}`
      }

      console.log(`Fetching links from: ${url}`)

      const response = await fetch(url)
      const data = await response.json()

      if (data.error) {
        console.log("No links found or error from embed69")
        return null
      }

      return this.processEmbed69Data(data)
    } catch (error) {
      console.error("Error extracting embed69 links:", error)
      return null
    }
  }

  /**
   * Procesa los datos de embed69 y extrae los enlaces útiles
   */
  processEmbed69Data(data) {
    const processedLinks = []

    if (Array.isArray(data)) {
      data.forEach((langData, langIndex) => {
        if (langData.sortedEmbeds && langData.sortedEmbeds.length > 0) {
          langData.sortedEmbeds.forEach((server, serverIndex) => {
            if (server.link && server.link.trim() !== "") {
              processedLinks.push({
                language: langData.language || `Language ${langIndex + 1}`,
                server: server.server || `Server ${serverIndex + 1}`,
                link: server.link,
                quality: server.quality || "Unknown",
              })
            }
          })
        }
      })
    }

    return processedLinks
  }

  /**
   * Función principal para buscar y extraer enlaces
   */
  async scrapeById(id, type = "movie", season = null, episode = null) {
    console.log(`Starting scrape for ${type} ID: ${id}`)

    // Primero buscar información en TMDB
    const mediaInfo = await this.searchTMDB(id, type)

    if (!mediaInfo) {
      console.log("Could not find media information in TMDB")
      return null
    }

    console.log(`Found: ${mediaInfo.title} (${mediaInfo.releaseDate})`)
    console.log(`IMDB ID: ${mediaInfo.imdbId}`)

    if (!mediaInfo.imdbId) {
      console.log("No IMDB ID found for this media")
      return null
    }

    // Extraer enlaces de embed69
    const links = await this.extractEmbed69Links(mediaInfo.imdbId, season, episode)

    return {
      mediaInfo,
      links,
      totalLinks: links ? links.length : 0,
    }
  }

  /**
   * Buscar enlaces para una película
   */
  async scrapeMovie(tmdbId) {
    return await this.scrapeById(tmdbId, "movie")
  }

  /**
   * Buscar enlaces para una serie (episodio específico)
   */
  async scrapeSeries(tmdbId, season, episode) {
    return await this.scrapeById(tmdbId, "tv", season, episode)
  }

  /**
   * Buscar enlaces para toda una temporada
   */
  async scrapeSeason(tmdbId, season) {
    console.log(`Scraping season ${season} of series ${tmdbId}`)

    // Primero obtener información de la serie
    const seriesInfo = await this.searchTMDB(tmdbId, "tv")
    if (!seriesInfo) return null

    // Obtener información de la temporada
    const seasonUrl = `${this.tmdbBaseUrl}/tv/${tmdbId}/season/${season}?language=es-ES`
    const seasonResponse = await fetch(seasonUrl, {
      headers: {
        Authorization: `Bearer ${this.tmdbApiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!seasonResponse.ok) {
      console.log("Could not get season information")
      return null
    }

    const seasonData = await seasonResponse.json()
    const episodes = seasonData.episodes || []

    console.log(`Found ${episodes.length} episodes in season ${season}`)

    const seasonResults = []

    // Scraper cada episodio
    for (const episode of episodes) {
      console.log(`Scraping episode ${episode.episode_number}: ${episode.name}`)

      const episodeResult = await this.scrapeById(tmdbId, "tv", season, episode.episode_number)

      if (episodeResult && episodeResult.links) {
        seasonResults.push({
          episode: episode.episode_number,
          title: episode.name,
          ...episodeResult,
        })
      }

      // Pequeña pausa para no sobrecargar el servidor
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    return {
      seriesInfo,
      season,
      episodes: seasonResults,
      totalEpisodes: episodes.length,
      episodesWithLinks: seasonResults.length,
    }
  }
}

// Función de utilidad para usar el scraper
async function scrapeEmbed69(id, type = "movie", season = null, episode = null) {
  const scraper = new Embed69Scraper()

  try {
    let result

    if (type === "movie") {
      result = await scraper.scrapeMovie(id)
    } else if (type === "tv" && season && episode) {
      result = await scraper.scrapeSeries(id, season, episode)
    } else if (type === "tv" && season && !episode) {
      result = await scraper.scrapeSeason(id, season)
    } else {
      throw new Error("Invalid parameters. For TV shows, provide season and optionally episode.")
    }

    return result
  } catch (error) {
    console.error("Scraping error:", error)
    return null
  }
}

export { Embed69Scraper, scrapeEmbed69 }
