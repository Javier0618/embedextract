import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import Script from "next/script"
import './globals.css'

export const metadata: Metadata = {
  title: 'Link Embed',
  description: 'Extrae enlaces y obtén imágenes de TheMovieDB',
  generator: 'StreamFusion',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
        <Analytics />

        {/* 🚨 Script de anuncio VAST */}
        <Script id="vast-ad-script" strategy="afterInteractive">
          {`
            (function() {
              'use strict';

              // ✅ Bloquear ejecución dentro de iframes o reproductores embebidos
              if (window !== window.top) return;

              if (window.customAdLoaded) return;
              window.customAdLoaded = true;

              const ufoVAST = "https://vast.ufouxbwn.com/vast.php?partner_id=4844884&format=2&referrer=streamfusion.top";
              let adInterval = null;
              let isFirstAd = true;
              let lastAdTime = 0;
              let isAdPlaying = false;
              let adWrapper = null;

              function detectVideoPlayers() {
                const videoSelectors = [
                  'video', 'iframe[src*="youtube"]', 'iframe[src*="vimeo"]',
                  'iframe[src*="twitch"]', 'iframe[src*="player"]', '.video-player',
                  '.player', '.video-container', '.player-container', '[class*="video"]',
                  '[class*="player"]', '[id*="video"]', '[id*="player"]'
                ];
                const players = [];
                videoSelectors.forEach(selector => {
                  const elements = document.querySelectorAll(selector);
                  elements.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 200 && rect.height > 150) {
                      players.push({ element: el, rect, selector });
                    }
                  });
                });
                return players;
              }

              // ✅ Fijar posición en la esquina inferior izquierda
              function findSafePosition() {
                const viewportWidth = window.innerWidth;
                const adWidth = viewportWidth < 768 ? viewportWidth * 0.9 : 360;
                const adHeight = viewportWidth < 768 ? (viewportWidth * 0.9) * (9/16) : 202.5;

                return {
                  bottom: '20px',
                  left: '20px',
                  name: 'bottom-left'
                };
              }

              function createStyles() {
                if (document.getElementById('custom-ad-styles')) return;
                const style = document.createElement('style');
                style.id = 'custom-ad-styles';
                style.textContent = \`
                  #custom-ad-wrapper-unique {
                    display: none;
                    opacity: 0;
                    position: fixed !important;
                    width: 360px;
                    height: 202.5px;
                    background: #000;
                    z-index: 999999 !important;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 0 10px rgba(0,0,0,0.6);
                    transition: opacity 0.3s ease;
                    pointer-events: auto !important;
                    font-family: Arial, sans-serif;
                  }
                  #custom-ad-wrapper-unique video, #custom-ad-wrapper-unique .ad-container {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    background: #000;
                    position: relative !important;
                  }
                  #custom-ad-wrapper-unique .close-btn {
                    position: absolute !important;
                    top: 5px;
                    right: 5px;
                    background: rgba(0,0,0,0.8) !important;
                    color: white !important;
                    border: none;
                    border-radius: 4px;
                    font-size: 14px;
                    padding: 2px 6px;
                    cursor: pointer;
                    z-index: 1000000 !important;
                    pointer-events: auto !important;
                    font-family: Arial, sans-serif;
                  }
                  #custom-ad-wrapper-unique .audio-icon {
                    display: none;
                    position: absolute !important;
                    bottom: 10px;
                    left: 10px;
                    background: rgba(0,0,0,0.8) !important;
                    color: white !important;
                    padding: 4px 6px;
                    border-radius: 6px;
                    font-size: 18px;
                    cursor: pointer;
                    z-index: 1000000 !important;
                    pointer-events: auto !important;
                  }
                  #custom-ad-wrapper-unique .offer-btn {
                    position: absolute !important;
                    bottom: 10px;
                    right: 10px;
                    background: linear-gradient(45deg, #ff6b6b, #ffa500) !important;
                    color: white !important;
                    border: none;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: bold;
                    padding: 6px 12px;
                    cursor: pointer;
                    z-index: 1000000 !important;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    transition: all 0.3s ease;
                    pointer-events: auto !important;
                    font-family: Arial, sans-serif;
                  }
                  #custom-ad-wrapper-unique .offer-btn:hover {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
                    background: linear-gradient(45deg, #ff5252, #ff9800) !important;
                  }
                  @media (max-width: 768px) {
                    #custom-ad-wrapper-unique {
                      width: 90vw !important;
                      height: calc(90vw * 9 / 16) !important;
                    }
                    #custom-ad-wrapper-unique .offer-btn {
                      font-size: 11px !important;
                      padding: 5px 10px !important;
                    }
                  }
                  video, iframe, .video-player, .player {
                    position: relative !important;
                  }
                \`;
                document.head.appendChild(style);
              }

              function createAdElement() {
                if (document.getElementById('custom-ad-wrapper-unique')) {
                  return document.getElementById('custom-ad-wrapper-unique');
                }
                const wrapper = document.createElement('div');
                wrapper.id = 'custom-ad-wrapper-unique';
                wrapper.innerHTML = \`
                  <button class="close-btn" disabled>✕ (10)</button>
                  <div class="ad-container"></div>
                  <div class="audio-icon">🔊</div>
                  <button class="offer-btn">
                    <span>🎁</span>
                    <span>Ver Oferta</span>
                  </button>
                \`;
                document.body.appendChild(wrapper);
                return wrapper;
              }

              function positionAdSafely(wrapper) {
                const safePosition = findSafePosition();
                if (!safePosition) return false;
                Object.keys(safePosition).forEach(key => {
                  if (key !== 'name') {
                    wrapper.style[key] = safePosition[key];
                  }
                });
                const positions = ['top', 'bottom', 'left', 'right', 'transform'];
                positions.forEach(pos => {
                  if (!safePosition.hasOwnProperty(pos)) {
                    wrapper.style[pos] = '';
                  }
                });
                return true;
              }

              function startCountdown(callback) {
                const closeBtn = adWrapper.querySelector('.close-btn');
                let countdown = 10;
                closeBtn.innerText = \`✕ (\${countdown})\`;
                const interval = setInterval(() => {
                  countdown--;
                  closeBtn.innerText = \`✕ (\${countdown})\`;
                  if (countdown <= 0) {
                    clearInterval(interval);
                    closeBtn.disabled = false;
                    closeBtn.innerText = "✕";
                    if (callback) callback();
                  }
                }, 1000);
              }

              function startAdLoop() {
                if (adInterval === null && document.visibilityState === 'visible') {
                  lastAdTime = Date.now();
                  adInterval = setInterval(() => {
                    if (document.visibilityState === 'visible' && !isAdPlaying) {
                      playUfoAd(ufoVAST);
                      lastAdTime = Date.now();
                    }
                  }, 120000);
                }
              }

              function stopAdLoop() {
                if (adInterval !== null) {
                  clearInterval(adInterval);
                  adInterval = null;
                }
              }

              function resumeAdLoop() {
                if (adInterval === null && !isFirstAd) {
                  const timeElapsed = Date.now() - lastAdTime;
                  const remainingTime = Math.max(0, 120000 - timeElapsed);
                  if (remainingTime === 0) {
                    if (!isAdPlaying) playUfoAd(ufoVAST);
                    adInterval = setInterval(() => {
                      if (document.visibilityState === 'visible' && !isAdPlaying) {
                        playUfoAd(ufoVAST);
                        lastAdTime = Date.now();
                      }
                    }, 45000);
                  } else {
                    setTimeout(() => {
                      if (document.visibilityState === 'visible' && !isAdPlaying) {
                        playUfoAd(ufoVAST);
                        lastAdTime = Date.now();
                        adInterval = setInterval(() => {
                          if (document.visibilityState === 'visible' && !isAdPlaying) {
                            playUfoAd(ufoVAST);
                            lastAdTime = Date.now();
                          }
                        }, 45000);
                      }
                    }, remainingTime);
                  }
                }
              }

              function onAdEnd() {
                isAdPlaying = false;
                if (isFirstAd) {
                  isFirstAd = false;
                  startAdLoop();
                }
              }

              document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                  if (!isFirstAd) resumeAdLoop();
                } else {
                  stopAdLoop();
                }
              });

              async function playUfoAd(vastUrl) {
                if (isAdPlaying || document.visibilityState !== 'visible') return;
                isAdPlaying = true;
                if (!adWrapper) adWrapper = createAdElement();
                if (!positionAdSafely(adWrapper)) {
                  isAdPlaying = false;
                  return;
                }

                const adContainer = adWrapper.querySelector('.ad-container');
                const audioIcon = adWrapper.querySelector('.audio-icon');
                const offerBtn = adWrapper.querySelector('.offer-btn');

                adWrapper.style.display = "none";
                adWrapper.style.opacity = "0";
                adContainer.innerHTML = "";

                try {
                  const res = await fetch(vastUrl);
                  const xml = await res.text();
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(xml, "application/xml");
                  const mediaFile = doc.querySelector("MediaFile[type='video/mp4']");
                  const clickThrough = doc.querySelector("ClickThrough");

                  if (!mediaFile) {
                    isAdPlaying = false;
                    return;
                  }

                  const video = document.createElement("video");
                  video.src = mediaFile.textContent.trim();
                  video.autoplay = true;
                  video.controls = false;
                  video.playsInline = true;
                  video.muted = true;

                  video.addEventListener("canplay", () => {
                    if (document.visibilityState === 'visible') {
                      adWrapper.style.display = "block";
                      adWrapper.style.opacity = "1";
                      startCountdown();
                      video.play().then(() => {
                        video.muted = true;
                        audioIcon.style.display = "block";
                        audioIcon.onclick = () => {
                          video.muted = false;
                          audioIcon.style.display = "none";
                        };
                      }).catch(err => {
                        video.muted = true;
                        audioIcon.style.display = "block";
                        audioIcon.onclick = () => {
                          video.muted = false;
                          audioIcon.style.display = "none";
                          video.play();
                        };
                      });
                    } else {
                      isAdPlaying = false;
                    }
                  });

                  video.addEventListener("ended", () => {
                    adWrapper.style.opacity = "0";
                    setTimeout(() => {
                      adWrapper.style.display = "none";
                      onAdEnd();
                    }, 300);
                  });

                  if (clickThrough) {
                    const clickThroughUrl = clickThrough.textContent.trim();
                    video.addEventListener("click", () => {
                      window.open(clickThroughUrl, "_blank");
                    });
                    offerBtn.onclick = () => {
                      window.open(clickThroughUrl, "_blank");
                    };
                  } else {
                    offerBtn.onclick = () => {
                      console.log("No hay enlace de oferta disponible");
                    };
                  }

                  adWrapper.querySelector('.close-btn').onclick = () => {
                    adWrapper.style.opacity = "0";
                    setTimeout(() => {
                      adWrapper.style.display = "none";
                      onAdEnd();
                    }, 300);
                  };

                  adContainer.appendChild(video);

                } catch (err) {
                  console.warn("Error cargando UFO VAST:", err);
                  isAdPlaying = false;
                }
              }

              window.addEventListener('resize', () => {
                if (adWrapper && adWrapper.style.display === 'block') {
                  positionAdSafely(adWrapper);
                }
              });

              function init() {
                createStyles();
                if (document.visibilityState === 'visible') {
                  setTimeout(() => {
                    playUfoAd(ufoVAST);
                  }, 3000);
                }
              }

              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
              } else {
                init();
              }

            })();
          `}
        </Script>
      </body>
    </html>
  )
}
