"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Copy, Check, Film, X, Download, ExternalLink } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

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

interface TMDBMediaData {
  id: number
  name?: string
  title?: string
  overview: string
  poster_path?: string
  backdrop_path?: string
  seasons?: any[]
  images?: {
    backdrops: any[]
    posters: any[]
  }
  totalEpisodes?: number
  episodesWithImages?: number
  type: "movie" | "tv"
  watchProviders?: any
}

export default function TMDBScraper() {
  const [mediaId, setMediaId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<TMDBSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchMode, setSearchMode] = useState<"id" | "name">("id")
  const [contentType, setContentType] = useState<"movie" | "tv">("tv")
  const [imageType, setImageType] = useState<"episodes" | "backdrops" | "posters">("episodes")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<TMDBMediaData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalUrl, setModalUrl] = useState("")
  const [modalTitle, setModalTitle] = useState("")

  const API_KEY = "32e5e53999e380a0291d66fb304153fe"
  const BASE_URL = "https://api.themoviedb.org/3"
  const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

  const debouncedSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const response = await fetch(
        `${BASE_URL}/search/multi?api_key=${API_KEY}&language=es-MX&query=${encodeURIComponent(query)}`,
      )

      if (!response.ok) throw new Error("Error en la búsqueda")

      const data = await response.json()
      const filteredResults = data.results
        .filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
        .slice(0, 10)
        .map((item: any) => ({
          ...item,
          media_type: item.media_type,
        }))

      setSearchResults(filteredResults)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsSearching(false)
    }
  }, [])

  const fetchMediaData = async () => {
    if (!mediaId.trim()) return
    const result = await selectSearchResultById(mediaId)
    setResult(result)
  }

  const selectSearchResultById = async (id: string) => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    setProgress({ current: 0, total: 0 })

    try {
      const mediaResponse = await fetch(`${BASE_URL}/${contentType}/${id}?api_key=${API_KEY}&language=es-MX`)

      if (!mediaResponse.ok) {
        throw new Error(`${contentType === "tv" ? "Serie" : "Película"} no encontrada. Verifica el ID.`)
      }

      const media = await mediaResponse.json()

      if (contentType === "movie") {
        const imagesResponse = await fetch(`${BASE_URL}/movie/${id}/images?api_key=${API_KEY}`)
        const images = imagesResponse.ok ? await imagesResponse.json() : { backdrops: [], posters: [] }

        const watchProvidersResponse = await fetch(`${BASE_URL}/movie/${id}/watch/providers?api_key=${API_KEY}`)
        const watchProviders = watchProvidersResponse.ok ? await watchProvidersResponse.json() : { results: {} }

        return {
          id: media.id,
          name: media.title,
          title: media.title,
          overview: media.overview,
          poster_path: media.poster_path,
          backdrop_path: media.backdrop_path,
          images,
          type: "movie",
          watchProviders: watchProviders.results?.MX || null,
        }
      } else {
        if (imageType === "episodes") {
          const seasons = []
          let totalEpisodes = 0
          let episodesWithImages = 0

          const validSeasons = media.seasons.filter((s: any) => s.season_number > 0)

          for (let i = 0; i < validSeasons.length; i++) {
            const season = validSeasons[i]
            setProgress({ current: i + 1, total: validSeasons.length })

            const seasonResponse = await fetch(
              `${BASE_URL}/tv/${id}/season/${season.season_number}?api_key=${API_KEY}&language=es-MX`,
            )

            if (seasonResponse.ok) {
              const seasonData = await seasonResponse.json()

              seasons.push({
                season_number: season.season_number,
                name: seasonData.name,
                episodes: seasonData.episodes,
              })

              totalEpisodes += seasonData.episodes.length
              episodesWithImages += seasonData.episodes.filter((ep: any) => ep.still_path).length
            }

            await new Promise((resolve) => setTimeout(resolve, 100))
          }

          const watchProvidersResponse = await fetch(`${BASE_URL}/tv/${id}/watch/providers?api_key=${API_KEY}`)
          const watchProviders = watchProvidersResponse.ok ? await watchProvidersResponse.json() : { results: {} }

          return {
            id: media.id,
            name: media.name,
            overview: media.overview,
            poster_path: media.poster_path,
            backdrop_path: media.backdrop_path,
            seasons,
            totalEpisodes,
            episodesWithImages,
            type: "tv",
            watchProviders: watchProviders.results?.MX || null,
          }
        } else {
          const imagesResponse = await fetch(`${BASE_URL}/tv/${id}/images?api_key=${API_KEY}`)
          const images = imagesResponse.ok ? await imagesResponse.json() : { backdrops: [], posters: [] }

          const watchProvidersResponse = await fetch(`${BASE_URL}/tv/${id}/watch/providers?api_key=${API_KEY}`)
          const watchProviders = watchProvidersResponse.ok ? await watchProvidersResponse.json() : { results: {} }

          return {
            id: media.id,
            name: media.name,
            overview: media.overview,
            poster_path: media.poster_path,
            backdrop_path: media.backdrop_path,
            images,
            type: "tv",
            watchProviders: watchProviders.results?.MX || null,
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al obtener los datos")
      return null
    } finally {
      setIsLoading(false)
      setProgress({ current: 0, total: 0 })
    }
  }

  useEffect(() => {
    if (searchMode === "name" && searchQuery.trim()) {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }

      const timeout = setTimeout(() => {
        debouncedSearch(searchQuery)
      }, 500) // 500ms delay

      setSearchTimeout(timeout)
    } else if (!searchQuery.trim()) {
      setSearchResults([])
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchQuery, searchMode, debouncedSearch])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    await debouncedSearch(searchQuery)
  }

  const selectSearchResult = async (result: TMDBSearchResult) => {
    setMediaId(result.id.toString())
    setContentType(result.media_type)
    setSearchResults([])
    setSearchQuery("")
    setSearchMode("id")

    const mediaData = await fetchMediaData()
    setResult(mediaData)
  }

  const copyImageUrl = async (imagePath: string, linkId: string) => {
    const fullUrl = `${IMAGE_BASE_URL}${imagePath}`
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopiedLinks((prev) => new Set(prev).add(linkId))
      setTimeout(() => {
        setCopiedLinks((prev) => {
          const newSet = new Set(prev)
          newSet.delete(linkId)
          return newSet
        })
      }, 2000)
    } catch (err) {
      console.error("Failed to copy link:", err)
    }
  }

  const copyAllImageUrls = async () => {
    if (!result) return

    const imageUrls: string[] = []

    if (imageType === "episodes" && result.seasons) {
      result.seasons.forEach((season) => {
        season.episodes.forEach((episode: any) => {
          if (episode.still_path) {
            imageUrls.push(`${IMAGE_BASE_URL}${episode.still_path}`)
          }
        })
      })
    } else if (result.images) {
      const images = imageType === "backdrops" ? result.images.backdrops : result.images.posters
      images.forEach((image: any) => {
        imageUrls.push(`${IMAGE_BASE_URL}${image.file_path}`)
      })
    }

    if (imageUrls.length === 0) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return
    }

    try {
      await navigator.clipboard.writeText(imageUrls.join("\n"))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy URLs:", err)
    }
  }

  const downloadJSON = () => {
    if (!result) return

    const jsonData = {
      media: {
        id: result.id,
        name: result.name || result.title,
        type: contentType,
        image_type: imageType,
        overview: result.overview,
      },
    }

    if (contentType === "movie" || imageType !== "episodes") {
      jsonData.images = {
        backdrops: result.images?.backdrops.map((img: any) => `${IMAGE_BASE_URL}${img.file_path}`) || [],
        posters: result.images?.posters.map((img: any) => `${IMAGE_BASE_URL}${img.file_path}`) || [],
      }
      jsonData.statistics = {
        total_backdrops: result.images?.backdrops.length || 0,
        total_posters: result.images?.posters.length || 0,
      }
    } else {
      jsonData.seasons = result.seasons?.map((season) => ({
        season_number: season.season_number,
        name: season.name,
        episodes: season.episodes.map((episode: any) => ({
          id: episode.id,
          name: episode.name,
          episode_number: episode.episode_number,
          air_date: episode.air_date,
          overview: episode.overview,
          image_url: episode.still_path ? `${IMAGE_BASE_URL}${episode.still_path}` : null,
        })),
      }))
      jsonData.statistics = {
        total_episodes: result.totalEpisodes,
        episodes_with_images: result.episodesWithImages,
        coverage_percentage: Math.round(((result.episodesWithImages || 0) / (result.totalEpisodes || 1)) * 100),
      }
    }

    if (result.watchProviders) {
      jsonData.watchProviders = result.watchProviders
    }

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${(result.name || result.title || "media").replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${imageType}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const openImagePreview = (imagePath: string, title: string) => {
    const fullUrl = `${IMAGE_BASE_URL}${imagePath}`
    setModalUrl(fullUrl)
    setModalTitle(title)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setModalUrl("")
    setModalTitle("")
  }

  const updateImageTypeOptions = (contentType: string) => {
    if (contentType === "movie" && imageType === "episodes") {
      setImageType("backdrops")
    }
  }

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  return (
    <div className="space-y-6">
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-4xl max-h-[90vh] m-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 truncate">{modalTitle}</h3>
              <Button variant="ghost" size="sm" onClick={closeModal} className="rounded-full hover:bg-gray-200">
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="p-6">
              <img
                src={modalUrl || "/placeholder.svg"}
                className="max-w-full max-h-[70vh] object-contain mx-auto rounded-lg"
                alt={modalTitle}
              />
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <code className="text-xs bg-white px-3 py-2 rounded border font-mono break-all flex-1">{modalUrl}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyImageUrl(modalUrl.replace(IMAGE_BASE_URL, ""), "modal")}
                  className="rounded-lg"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(modalUrl, "_blank")}
                  className="rounded-lg"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center mb-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-1 flex">
          <Button
            variant={searchMode === "id" ? "default" : "ghost"}
            onClick={() => setSearchMode("id")}
            className={`rounded-xl ${searchMode === "id" ? "bg-white text-gray-800" : "text-gray-900 hover:bg-white/20 font-medium"}`}
          >
            🔢 Por ID
          </Button>
          <Button
            variant={searchMode === "name" ? "default" : "ghost"}
            onClick={() => setSearchMode("name")}
            className={`rounded-xl ${searchMode === "name" ? "bg-white text-gray-800" : "text-gray-900 hover:bg-white/20 font-medium"}`}
          >
            📝 Por Nombre
          </Button>
        </div>
      </div>

      {searchMode === "name" && (
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-3xl mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-gray-800">🔍 Buscar por Nombre</CardTitle>
            <CardDescription className="text-gray-600">
              Escribe el nombre de la serie o película para buscarla y seleccionarla
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={contentType}
                onValueChange={(value: "movie" | "tv") => {
                  setContentType(value)
                  updateImageTypeOptions(value)
                }}
              >
                <SelectTrigger className="rounded-xl border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tv">📺 Serie de TV</SelectItem>
                  <SelectItem value="movie">🎬 Película</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={imageType}
                onValueChange={(value: "episodes" | "backdrops" | "posters") => setImageType(value)}
              >
                <SelectTrigger className="rounded-xl border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contentType === "tv" && <SelectItem value="episodes">📷 Imágenes de Episodios</SelectItem>}
                  <SelectItem value="backdrops">🖼️ Fondos (Backdrops)</SelectItem>
                  <SelectItem value="posters">🎭 Pósters</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Input
                placeholder={
                  contentType === "tv" ? "Ej: Game of Thrones, Breaking Bad..." : "Ej: Fight Club, The Matrix..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-lg py-3 border-gray-300 rounded-xl flex-1"
              />
              {isSearching && (
                <div className="flex items-center px-4">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                </div>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <h3 className="text-lg font-semibold text-gray-800">Resultados de búsqueda:</h3>
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => selectSearchResult(result)}
                    className="flex items-center gap-4 p-4 border rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    {result.poster_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                        alt={result.title || result.name}
                        className="w-16 h-24 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-800">{result.title || result.name}</h4>
                        <Badge variant="outline" className="rounded-full">
                          {result.media_type === "movie" ? "🎬 Película" : "📺 Serie"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {result.release_date || result.first_air_date
                          ? `(${new Date(result.release_date || result.first_air_date!).getFullYear()})`
                          : ""}
                      </p>
                      <p className="text-sm text-gray-500 line-clamp-2">{result.overview}</p>
                      <p className="text-xs text-blue-600 mt-1">ID: {result.id}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {searchMode === "id" && (
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-3xl mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-gray-800">🔍 Buscar por ID</CardTitle>
            <CardDescription className="text-gray-600">
              Ingresa el ID, selecciona el tipo de contenido y los proveedores para extraer enlaces específicos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={contentType}
                onValueChange={(value: "movie" | "tv") => {
                  setContentType(value)
                  updateImageTypeOptions(value)
                }}
              >
                <SelectTrigger className="rounded-xl border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tv">📺 Serie de TV</SelectItem>
                  <SelectItem value="movie">🎬 Película</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={imageType}
                onValueChange={(value: "episodes" | "backdrops" | "posters") => setImageType(value)}
              >
                <SelectTrigger className="rounded-xl border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contentType === "tv" && <SelectItem value="episodes">📷 Imágenes de Episodios</SelectItem>}
                  <SelectItem value="backdrops">🖼️ Fondos (Backdrops)</SelectItem>
                  <SelectItem value="posters">🎭 Pósters</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Input
                placeholder={contentType === "tv" ? "Ej: 1399 (Game of Thrones)" : "Ej: 550 (Fight Club)"}
                value={mediaId}
                onChange={(e) => setMediaId(e.target.value)}
                className="text-lg py-3 border-gray-300 rounded-xl flex-1"
              />
              <Button
                onClick={fetchMediaData}
                disabled={!mediaId || isLoading}
                className="custom-blue-button inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-lg font-medium transition-all disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />⏳ Procesando...
                  </>
                ) : (
                  <>🔍 Extraer</>
                )}
              </Button>
            </div>

            {progress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Procesando temporadas...</span>
                  <span>
                    {progress.current}/{progress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6 rounded-xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-gray-800">
              <span>{result.name || result.title}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAllImageUrls}
                  className="flex items-center gap-2 rounded-xl bg-transparent"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />📋 Copiar URLs
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadJSON}
                  className="flex items-center gap-2 rounded-xl bg-transparent"
                >
                  <Download className="h-4 w-4" />💾 Descargar JSON
                </Button>
              </div>
            </CardTitle>
            <CardDescription className="text-gray-600">
              {result.type === "movie" ? "🎬 Película" : "📺 Serie"}
              {imageType === "episodes" && result.totalEpisodes && (
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="rounded-full">
                    {result.totalEpisodes} episodios
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    {result.episodesWithImages} con imágenes
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    {Math.round(((result.episodesWithImages || 0) / result.totalEpisodes) * 100)}% cobertura
                  </Badge>
                </div>
              )}
              {imageType === "backdrops" && (
                <Badge variant="outline" className="rounded-full mt-2">
                  {result.images?.backdrops.length || 0} fondos
                </Badge>
              )}
              {imageType === "posters" && (
                <Badge variant="outline" className="rounded-full mt-2">
                  {result.images?.posters.length || 0} pósters
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result.overview && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-800 mb-2">📝 Descripción</h3>
                <p className="text-gray-700 leading-relaxed">{result.overview}</p>
              </div>
            )}

            {result.watchProviders && (
              <div className="mb-6 p-4 bg-blue-50 rounded-xl">
                <h3 className="font-semibold text-gray-800 mb-3">📺 Disponible</h3>
                {result.watchProviders.flatrate && result.watchProviders.flatrate.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">🔄 Streaming (Suscripción)</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.watchProviders.flatrate.map((provider: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
                          <img
                            src={`https://image.tmdb.org/t/p/w45${provider.logo_path}`}
                            alt={provider.provider_name}
                            className="w-6 h-6 rounded"
                          />
                          <span className="text-sm font-medium">{provider.provider_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.watchProviders.rent && result.watchProviders.rent.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">💰 Renta</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.watchProviders.rent.map((provider: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
                          <img
                            src={`https://image.tmdb.org/t/p/w45${provider.logo_path}`}
                            alt={provider.provider_name}
                            className="w-6 h-6 rounded"
                          />
                          <span className="text-sm font-medium">{provider.provider_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.watchProviders.buy && result.watchProviders.buy.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">🛒 Compra</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.watchProviders.buy.map((provider: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
                          <img
                            src={`https://image.tmdb.org/t/p/w45${provider.logo_path}`}
                            alt={provider.provider_name}
                            className="w-6 h-6 rounded"
                          />
                          <span className="text-sm font-medium">{provider.provider_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!result.watchProviders.flatrate || result.watchProviders.flatrate.length === 0) &&
                  (!result.watchProviders.rent || result.watchProviders.rent.length === 0) &&
                  (!result.watchProviders.buy || result.watchProviders.buy.length === 0) && (
                    <p className="text-gray-500 text-sm">❌ No disponible en plataformas de streaming en México</p>
                  )}
              </div>
            )}

            <div className="space-y-4">
              {imageType === "episodes" && result.seasons ? (
                <div className="space-y-6">
                  {result.seasons.map((season, seasonIndex) => (
                    <Card key={seasonIndex} className="border-l-4 border-l-purple-500 rounded-xl">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                          📺 {season.name}
                        </CardTitle>
                        <CardDescription>
                          {season.episodes.length} episodios •{" "}
                          {season.episodes.filter((ep: any) => ep.still_path).length} con imágenes
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          {season.episodes.map((episode: any, episodeIndex: number) => {
                            const hasImage = episode.still_path
                            const linkId = `s${season.season_number}e${episode.episode_number}`

                            return (
                              <div
                                key={episodeIndex}
                                className="bg-white p-4 rounded-xl border hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="flex-shrink-0">
                                    {hasImage ? (
                                      <img
                                        src={`https://image.tmdb.org/t/p/w185${episode.still_path}`}
                                        alt={episode.name}
                                        className="w-20 h-11 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() =>
                                          openImagePreview(
                                            episode.still_path,
                                            `${episode.episode_number}. ${episode.name}`,
                                          )
                                        }
                                      />
                                    ) : (
                                      <div className="w-20 h-11 bg-gray-200 rounded-lg flex items-center justify-center">
                                        <Film className="h-5 w-5 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-2">
                                    <p className="font-semibold text-gray-800">
                                      {episode.episode_number}. {episode.name}
                                    </p>
                                    <p className="text-sm text-gray-500">{episode.air_date || "Sin fecha"}</p>
                                    {hasImage ? (
                                      <div className="space-y-2">
                                        <p className="text-sm text-green-600 font-medium">✅ Imagen disponible</p>
                                        <div className="flex items-center gap-2">
                                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono break-all flex-1">
                                            {`${IMAGE_BASE_URL}${episode.still_path}`}
                                          </code>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => copyImageUrl(episode.still_path, linkId)}
                                            className="rounded-lg"
                                          >
                                            {copiedLinks.has(linkId) ? (
                                              <Check className="h-3 w-3" />
                                            ) : (
                                              <Copy className="h-3 w-3" />
                                            )}
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              window.open(`${IMAGE_BASE_URL}${episode.still_path}`, "_blank")
                                            }
                                            className="rounded-lg"
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-400">Sin imagen disponible</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {result.images && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(imageType === "backdrops" ? result.images.backdrops : result.images.posters).map(
                        (image: any, index: number) => {
                          const imageUrl = `${IMAGE_BASE_URL}${image.file_path}`
                          const aspectClass = imageType === "posters" ? "aspect-[9/16]" : "aspect-video"
                          const linkId = `${imageType}-${index}`

                          return (
                            <div
                              key={index}
                              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                            >
                              <div className={`bg-gray-100 ${aspectClass}`}>
                                <img
                                  src={`https://image.tmdb.org/t/p/w500${image.file_path}`}
                                  alt={`${imageType === "backdrops" ? "Fondo" : "Póster"} ${index + 1}`}
                                  className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() =>
                                    openImagePreview(
                                      image.file_path,
                                      `${imageType === "backdrops" ? "Fondo" : "Póster"} ${index + 1}`,
                                    )
                                  }
                                />
                              </div>
                              <div className="p-4 space-y-2">
                                <div className="flex items-center gap-2">
                                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono break-all flex-1">
                                    {imageUrl}
                                  </code>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyImageUrl(image.file_path, linkId)}
                                    className="rounded-lg"
                                  >
                                    {copiedLinks.has(linkId) ? (
                                      <Check className="h-3 w-3" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(imageUrl, "_blank")}
                                    className="rounded-lg"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        },
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
