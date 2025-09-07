"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Film, ImageIcon } from "lucide-react"
import LinkExtractor from "@/components/link-extractor"
import TMDBScraper from "@/components/tmdb-scraper"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"link-extractor" | "tmdb-scraper">("link-extractor")

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Film className="h-10 w-10 text-white drop-shadow-lg" />
            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg text-shadow-lg">
              Scraper - Link Embed - TMDB
            </h1>
          </div>
          <p className="text-white text-lg font-medium drop-shadow-md text-shadow-md">
            Extrae enlaces y obtén imágenes de TheMovieDB by: <a href="https://streamfusion.top" target="_blank" rel="noopener noreferrer">StreamFusion.top</a>
          </p>
        </div>

        <div class="anuncio">
<script type="text/javascript">
	atOptions = {
		'key' : 'd3f2d0bdcbdcf6bf7699f1bdca20fed1',
		'format' : 'iframe',
		'height' : 50,
		'width' : 320,
		'params' : {}
	};
</script>
<script type="text/javascript" src="//www.highperformanceformat.com/d3f2d0bdcbdcf6bf7699f1bdca20fed1/invoke.js"></script>
</div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-1 flex border border-white/20">
            <Button
              variant={activeTab === "link-extractor" ? "default" : "ghost"}
              onClick={() => setActiveTab("link-extractor")}
              className={`rounded-xl px-6 py-3 transition-all ${
                activeTab === "link-extractor"
                  ? "bg-white text-gray-800 shadow-lg font-semibold"
                  : "text-white hover:bg-white/20 font-medium hover:text-white"
              }`}
            >
              <Film className="h-5 w-5 mr-2" />
              Link Extractor
            </Button>
            <Button
              variant={activeTab === "tmdb-scraper" ? "default" : "ghost"}
              onClick={() => setActiveTab("tmdb-scraper")}
              className={`rounded-xl px-6 py-3 transition-all ${
                activeTab === "tmdb-scraper"
                  ? "bg-white text-gray-800 shadow-lg font-semibold"
                  : "text-white hover:bg-white/20 font-medium hover:text-white"
              }`}
            >
              <ImageIcon className="h-5 w-5 mr-2" />
              TMDB Scraper
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "link-extractor" && <LinkExtractor />}
        {activeTab === "tmdb-scraper" && <TMDBScraper />}
      </div>
    </div>
  )
}
