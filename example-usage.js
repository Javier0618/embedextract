import { scrapeEmbed69 } from "./scraper.js"

// Ejemplos de uso del scraper

async function examples() {
  console.log("=== EMBED69 SCRAPER EXAMPLES ===\n")

  // Ejemplo 1: Buscar una película
  console.log("1. Buscando película (The Matrix - TMDB ID: 603)")
  const movieResult = await scrapeEmbed69(603, "movie")

  if (movieResult) {
    console.log(`Título: ${movieResult.mediaInfo.title}`)
    console.log(`Enlaces encontrados: ${movieResult.totalLinks}`)

    if (movieResult.links && movieResult.links.length > 0) {
      console.log("Enlaces disponibles:")
      movieResult.links.forEach((link, index) => {
        console.log(`  ${index + 1}. ${link.server} (${link.language}) - ${link.quality}`)
        console.log(`     Link: ${link.link}`)
      })
    }
  }

  console.log("\n" + "=".repeat(50) + "\n")

  // Ejemplo 2: Buscar un episodio específico de una serie
  console.log("2. Buscando episodio de serie (Breaking Bad S1E1 - TMDB ID: 1396)")
  const episodeResult = await scrapeEmbed69(1396, "tv", 1, 1)

  if (episodeResult) {
    console.log(`Serie: ${episodeResult.mediaInfo.title}`)
    console.log(`Enlaces encontrados: ${episodeResult.totalLinks}`)

    if (episodeResult.links && episodeResult.links.length > 0) {
      console.log("Enlaces disponibles:")
      episodeResult.links.slice(0, 3).forEach((link, index) => {
        console.log(`  ${index + 1}. ${link.server} (${link.language})`)
      })
    }
  }

  console.log("\n" + "=".repeat(50) + "\n")

  // Ejemplo 3: Buscar toda una temporada (solo primeros 2 episodios para el ejemplo)
  console.log("3. Buscando temporada completa (ejemplo limitado)")
  // Nota: Este ejemplo está comentado porque puede tomar mucho tiempo
  // const seasonResult = await scrapeEmbed69(1396, 'tv', 1);
  // console.log(`Episodios con enlaces: ${seasonResult?.episodesWithLinks || 0}`);
}

// Función para uso directo desde línea de comandos
async function scrapeFromCommandLine() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log("Uso: node example-usage.js <tmdb_id> <type> [season] [episode]")
    console.log("Ejemplos:")
    console.log("  node example-usage.js 603 movie")
    console.log("  node example-usage.js 1396 tv 1 1")
    console.log("  node example-usage.js 1396 tv 1")
    return
  }

  const [id, type, season, episode] = args

  console.log(`Scraping ${type} with ID: ${id}`)
  if (season) console.log(`Season: ${season}`)
  if (episode) console.log(`Episode: ${episode}`)

  const result = await scrapeEmbed69(
    Number.parseInt(id),
    type,
    season ? Number.parseInt(season) : null,
    episode ? Number.parseInt(episode) : null,
  )

  if (result) {
    console.log("\n=== RESULTADO ===")
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log("No se encontraron resultados")
  }
}

// Ejecutar ejemplos si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--examples")) {
    examples()
  } else {
    scrapeFromCommandLine()
  }
}
