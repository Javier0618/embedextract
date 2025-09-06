"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, ExternalLink, Tv, Copy, Check, Search, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"

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
  seasons?: any[]
  totalSeasons?: number
  totalEpisodes?: number
}

interface SearchResult {
  id: number
  title: string
  name?: string
  release_date?: string
  first_air_date?: string
  media_type: "movie" | "tv"
  overview: string
  poster_path?: string
}

export default function LinkExtractor() {
  const [tmdbId, setTmdbId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchMode, setSearchMode] = useState<"id" | "name">("id")

  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie")
  const [season, setSeason] = useState("")
  const [episode, setEpisode] = useState("")
  const [fullSeason, setFullSeason] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ScrapedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedServers, setSelectedServers] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set())

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalUrl, setModalUrl] = useState("")
  const [modalTitle, setModalTitle] = useState("")

  const availableServers = ["Vidhide", "Streamwish", "Filemoon", "Voe", "Doodstream", "Streamtape", "Netu"]

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setError(null)
    setSearchResults([])

    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al buscar")
      }

      setSearchResults(data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsSearching(false)
    }
  }

  const selectSearchResult = (result: SearchResult) => {
    setTmdbId(result.id.toString())
    setMediaType(result.media_type)
    setSearchResults([])
    setSearchQuery("")
    setSearchMode("id")
  }

  const copyIndividualLink = async (url: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(url)
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

  const copyAllLinks = async () => {
    if (!result) return

    let allLinks: string[] = []

    if (result.seasons) {
      result.seasons.forEach((seasonData) => {
        seasonData.episodes.forEach((episodeData: any) => {
          if (episodeData.links) {
            episodeData.links.forEach((link: ScrapedLink) => {
              allLinks.push(link.url)
            })
          }
        })
      })
    } else {
      allLinks = result.links.map((link) => link.url)
    }

    try {
      await navigator.clipboard.writeText(allLinks.join("\n"))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy links:", err)
    }
  }

  const handleServerToggle = (server: string) => {
    setSelectedServers((prev) => (prev.includes(server) ? prev.filter((s) => s !== server) : [...prev, server]))
  }

  const handleScrape = async () => {
    if (!tmdbId) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const params = new URLSearchParams({
        tmdbId,
        type: mediaType,
        ...(mediaType === "tv" && fullSeason && { fullSeason: "true" }),
        ...(mediaType === "tv" && !fullSeason && season && { season }),
        ...(mediaType === "tv" && !fullSeason && episode && { episode }),
        ...(selectedServers.length > 0 && { servers: selectedServers.join(",") }),
      })

      const response = await fetch(`/api/scrape?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al hacer scraping")
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  const getQualityColor = (quality?: string) => {
    if (!quality) return "secondary"
    if (quality.includes("4K") || quality.includes("2160p")) return "destructive"
    if (quality.includes("1080p") || quality.includes("HD")) return "default"
    if (quality.includes("720p")) return "secondary"
    return "outline"
  }

  const openLinkInModal = (url: string, serverName: string) => {
    setModalUrl(url)
    setModalTitle(serverName)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setModalUrl("")
    setModalTitle("")
  }

  return (
    <div className="space-y-6">
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full h-full max-w-7xl max-h-[90vh] m-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">Reproduciendo: {modalTitle}</h3>
              <Button variant="ghost" size="sm" onClick={closeModal} className="rounded-full hover:bg-gray-200">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="w-full h-full">
              <iframe
                src={modalUrl}
                className="w-full h-full border-0"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
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
            Buscar por ID
          </Button>
          <Button
            variant={searchMode === "name" ? "default" : "ghost"}
            onClick={() => setSearchMode("name")}
            className={`rounded-xl ${searchMode === "name" ? "bg-white text-gray-800" : "text-gray-900 hover:bg-white/20 font-medium"}`}
          >
            Buscar por Nombre
          </Button>
        </div>
      </div>

      {searchMode === "name" && (
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-3xl mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Search className="h-5 w-5" />
              Buscar por Nombre
            </CardTitle>
            <CardDescription className="text-gray-600">
              Busca películas y series por su nombre para obtener el ID automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              <Input
                placeholder="Ej: Avengers, Breaking Bad, Spider-Man..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="text-lg py-3 border-gray-300 rounded-xl flex-1"
              />
              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isSearching}
                className="custom-blue-button inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-lg font-medium transition-all disabled:pointer-events-none disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              </button>
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
                          {result.media_type === "movie" ? "Película" : "Serie"}
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
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Search className="h-5 w-5" />
              Buscar por ID
            </CardTitle>
            <CardDescription className="text-gray-600">
              Ingresa el ID de TMDB, selecciona el tipo de contenido y los proveedores para extraer enlaces específicos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Input
                placeholder="Ej: 12345"
                value={tmdbId}
                onChange={(e) => setTmdbId(e.target.value)}
                className="text-lg py-3 border-gray-300 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={mediaType} onValueChange={(value: "movie" | "tv") => setMediaType(value)}>
                <SelectTrigger className="rounded-xl border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movie">Película</SelectItem>
                  <SelectItem value="tv">Serie</SelectItem>
                </SelectContent>
              </Select>

              <button
                onClick={handleScrape}
                disabled={!tmdbId || isLoading}
                className="custom-blue-button inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-lg font-medium transition-all disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Extraer
                  </>
                ) : (
                  <>Extraer</>
                )}
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Filtrar por Proveedores:</h3>

              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => setSelectedServers([])} className="rounded-full">
                  Todos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedServers(availableServers)}
                  className="rounded-full"
                >
                  Ninguno
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {availableServers.map((server) => (
                  <div key={server} className="flex items-center space-x-2">
                    <Checkbox
                      id={server}
                      checked={selectedServers.includes(server)}
                      onCheckedChange={() => handleServerToggle(server)}
                    />
                    <Label htmlFor={server} className="text-sm font-medium text-gray-700 cursor-pointer">
                      {server}
                    </Label>
                  </div>
                ))}
              </div>

              {selectedServers.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  Sin filtros - se extraerán enlaces de todos los proveedores
                </p>
              )}
            </div>

            {mediaType === "tv" && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fullSeason"
                    checked={fullSeason}
                    onCheckedChange={(checked) => setFullSeason(checked as boolean)}
                  />
                  <Label htmlFor="fullSeason" className="text-sm font-medium text-gray-700">
                    Extraer todas las temporadas y episodios
                  </Label>
                </div>

                {!fullSeason && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="season" className="text-gray-700">
                        Temporada (opcional)
                      </Label>
                      <Input
                        id="season"
                        placeholder="ej: 1"
                        value={season}
                        onChange={(e) => setSeason(e.target.value)}
                        className="rounded-xl border-gray-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="episode" className="text-gray-700">
                        Episodio (opcional)
                      </Label>
                      <Input
                        id="episode"
                        placeholder="ej: 1"
                        value={episode}
                        onChange={(e) => setEpisode(e.target.value)}
                        className="rounded-xl border-gray-300"
                      />
                    </div>
                  </div>
                )}
              </>
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
              <span>{result.title}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAllLinks}
                  className="flex items-center gap-2 rounded-xl bg-transparent"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar todos
                    </>
                  )}
                </Button>
                <Badge variant="outline" className="rounded-full">
                  {result.seasons
                    ? `${result.totalSeasons} temporadas, ${result.totalEpisodes} episodios`
                    : `${result.totalLinks} enlaces encontrados`}
                </Badge>
              </div>
            </CardTitle>
            <CardDescription className="text-gray-600">
              {result.type === "movie" ? "Película" : "Serie"}
              {result.year && ` (${result.year})`}
              {result.season && result.episode && ` - T${result.season}E${result.episode}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {result.seasons ? (
                <div className="space-y-6">
                  {result.seasons.map((seasonData, seasonIndex) => (
                    <Card key={seasonIndex} className="border-l-4 border-l-blue-500 rounded-xl">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                          <Tv className="h-5 w-5" />
                          Temporada {seasonData.season}
                        </CardTitle>
                        <CardDescription>{seasonData.episodes.length} episodios</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {seasonData.episodes.map((episodeData: any, episodeIndex: number) => (
                            <div key={episodeIndex} className="border rounded-xl p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-gray-800">Episodio {episodeData.episode}</h4>
                                <Badge variant="secondary" className="rounded-full">
                                  {episodeData.totalLinks} enlaces
                                </Badge>
                              </div>
                              {episodeData.error ? (
                                <p className="text-sm text-red-500">{episodeData.error}</p>
                              ) : episodeData.links.length === 0 ? (
                                <p className="text-sm text-gray-500">Sin enlaces disponibles</p>
                              ) : (
                                <div className="grid gap-2">
                                  {episodeData.links.map((link: ScrapedLink, linkIndex: number) => {
                                    const linkId = `s${seasonData.season}e${episodeData.episode}l${linkIndex}`
                                    return (
                                      <div
                                        key={linkIndex}
                                        className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-white transition-colors"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-800">{link.server}</span>
                                            <Badge variant="secondary" className="text-xs rounded-full">
                                              {link.language}
                                            </Badge>
                                            {link.quality && (
                                              <Badge
                                                variant={getQualityColor(link.quality)}
                                                className="text-xs rounded-full"
                                              >
                                                {link.quality}
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => copyIndividualLink(link.url, linkId)}
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
                                              onClick={() => openLinkInModal(link.url, link.server)}
                                              className="rounded-lg"
                                            >
                                              <ExternalLink className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                        <div className="text-xs text-gray-500 font-mono bg-gray-100 p-2 rounded border break-all">
                                          {link.url}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : result.links.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No se encontraron enlaces para este contenido</p>
              ) : (
                <div className="grid gap-3">
                  {result.links.map((link, index) => {
                    const linkId = `movie-${index}`
                    return (
                      <div
                        key={index}
                        className="flex flex-col gap-2 p-4 border rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800">{link.server}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs rounded-full">
                                  {link.language}
                                </Badge>
                                {link.quality && (
                                  <Badge variant={getQualityColor(link.quality)} className="text-xs rounded-full">
                                    {link.quality}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyIndividualLink(link.url, linkId)}
                              className="rounded-lg"
                            >
                              {copiedLinks.has(linkId) ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openLinkInModal(link.url, link.server)}
                              className="rounded-lg"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 font-mono bg-gray-100 p-3 rounded-lg border break-all">
                          {link.url}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
