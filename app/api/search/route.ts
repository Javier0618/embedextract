import { type NextRequest, NextResponse } from "next/server"

interface TMDBSearchResult {
  id: number
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  media_type: "movie" | "tv"
  overview: string
  poster_path?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")

    if (!query) {
      return NextResponse.json({ error: "Query es requerido" }, { status: 400 })
    }

    const apiKey = process.env.TMDB_API_KEY || "32e5e53999e380a0291d66fb304153fe"

    // Buscar en TMDB usando multi search
    const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&language=es-MX&query=${encodeURIComponent(query)}&page=1`

    const response = await fetch(searchUrl)

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`)
    }

    const data = await response.json()

    // Filtrar solo películas y series, excluir personas
    const filteredResults =
      data.results
        ?.filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
        ?.slice(0, 10) // Limitar a 10 resultados
        ?.map((item: any) => ({
          id: item.id,
          title: item.title,
          name: item.name,
          release_date: item.release_date,
          first_air_date: item.first_air_date,
          media_type: item.media_type,
          overview: item.overview || "Sin descripción disponible",
          poster_path: item.poster_path,
        })) || []

    return NextResponse.json({
      results: filteredResults,
      total_results: filteredResults.length,
    })
  } catch (error) {
    console.error("Search API Error:", error)
    return NextResponse.json(
      {
        error: "Error al buscar contenido",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
