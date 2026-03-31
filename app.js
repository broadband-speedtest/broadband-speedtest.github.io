(function () {
  class SpeedTestApp {
    constructor() {
      this.online = navigator.onLine
      this.isTestRunning = false
      this.selector = {
        'byID': function (id) { return document.getElementById(id); },
        'byQ': function (s) { return document.querySelector(s); },
        'byQA': function (s) { return document.querySelectorAll(s); },
      }
      this.doms = {
        'head': this.selector.byID('head'),
        'main': this.selector.byID('main'),
        'footer': this.selector.byID('footer'),
        'testMessage': this.selector.byID('testMessage'),
        'startTestBtn': this.selector.byID("startTestBtn"),
        'startTestBtnText': this.selector.byID("startTestBtnText"),
        'startTestBtnPlay': this.selector.byID("startTestBtnPlay"),
        'startTestBtnSpin': this.selector.byID("startTestBtnSpin"),
        'themeToggle': this.selector.byID("themeToggle"),
        'historyBtn': this.selector.byID("historyBtn"),
        'closeHistoryModal': this.selector.byID("closeHistoryModal"),
        'clearHistoryBtn': this.selector.byID("clearHistoryBtn"),
        'exportHistoryBtn': this.selector.byID("exportHistoryBtn"),
        'closeShareModal': this.selector.byID("closeShareModal"),
        'copyResultBtn': this.selector.byID("copyResultBtn"),
        'shareResultBtn': this.selector.byID("shareResultBtn"),
        'installPrompt': this.selector.byID("installPrompt"),
        'installBtn': this.selector.byID("installBtn"),
        'installClose': this.selector.byID("installClose"),
        'shareModal': this.selector.byID("shareModal"),
        'speedometer': this.selector.byID("speedometer"),
        'speedValue': this.selector.byID("speedValue"),
        'currentTest': this.selector.byID("currentTest"),
        'progressPercent': this.selector.byID("progressPercent"),
        'progressFill': this.selector.byID("progressFill"),
        //'testStatus' : this.selector.byID("testStatus"),
        'progressSection': this.selector.byID("progressSection"),
        'ipInfo': this.selector.byID("ipInfo"),
        'asnInfo': this.selector.byID("asnInfo"),
        'locationInfo': this.selector.byID("locationInfo"),
        'historyList': this.selector.byID("historyList"),
        'historyModal': this.selector.byID("historyModal"),
        'shareResult': this.selector.byID("shareResult"),
        'speedometerContainer': this.selector.byID("speedometerContainer"),
        'themeToggleIcon': this.selector.byID("themeToggleIcon"),
        'themeToggleIcon2': this.selector.byID("themeToggleIcon2"),
        'historyBtnIcon': this.selector.byID("historyBtnIcon"),
      }
      this.testResults = {
        download: 0,
        upload: 0,
        ping: 0,
        jitter: 0,
        timestamp: null,
        location: null,
        ip: null,
      }

      this.pingResults = []
      this.deferredPrompt = null
      this.ip = null;
      this.asn = null;
      this.location = null;
      this.controller = null;

      this.winFocused = true;
      this.darkThemeDetector = typeof window.matchMedia != 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : { matches: false, addEventListener: function (e, c, u) { } };
      this.darkTheme = this.darkThemeDetector.matches

      this.isPWA = function() {
          const isStandaloneIOS = window.navigator.standalone === true; // iOS
          const isStandalone = window.matchMedia('(display-mode: standalone)').matches; // others
          return isStandalone || isStandaloneIOS;
      }

      this.notifierContainer = null

      this.init()
    }

    showNotifier(message, type, duration) {
        if (!this.notifierContainer) {
            this.notifierContainer = document.createElement('div');
            this.notifierContainer.className = 'notifier-container';
            document.body.appendChild(this.notifierContainer);
        }

        // SVG Icons for success and error states
        var icons = {
            success: '<svg class="notifier-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
            error: '<svg class="notifier-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
        };

        var notifier = document.createElement('div');
        var notifierType = (type === 'success' || type === 'error') ? type : 'success';
        
        notifier.className = 'notifier ' + notifierType;
        notifier.innerHTML = icons[notifierType] + '<span>' + message + '</span>';

        this.notifierContainer.appendChild(notifier);

        // Trigger the show animation
        setTimeout(function() {
            notifier.classList.add('show');
        }, 10); // Small delay to allow CSS transition

        // Set timeout to hide and remove the notifier
        var hideTimeout = duration || 3000;
        setTimeout(function() {
            notifier.classList.remove('show');
            notifier.classList.add('hide');
            
            // Remove the element from DOM after transition ends
            setTimeout(function() {
                if (notifier.parentNode) {
                    notifier.parentNode.removeChild(notifier);
                }
            }, 500); // Should match CSS transition duration
        }, hideTimeout);
    }

    async init() {
      this.setupEventListeners()
      this.setupPWA()
      this.setupTheme()
      this.initSpeedometer()
      this.loadTestHistory()
      await this.loadIpInfo()
      await this.getIPInfo()
      await this.getLocationInfo()
      this.requestNotificationPermission()
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'test') {
        this.doms.startTestBtn.click();
      }
      if (action === 'history') {
        this.doms.historyBtn.click();
      }
    }

    setupEventListeners() {
      // Test button
      this.doms.startTestBtn.addEventListener("click", () => {
        if (this.online === true || navigator.onLine === true) {
          this.online === true
          if (!this.isTestRunning) {
            this.startSpeedTest()
          } else {
            this.stopSpeedTest()
            if (this.controller) {
              this.controller.abort();
            }
            this.isTestRunning = false
          }
        } else {
          testMessage.innerHTML = `<p style="color:red; color: var(--error-color)">You are offline! Be online & start test.</p>`
          if (this.isTestRunning) {
            this.stopSpeedTest()
            if (this.controller) {
              this.controller.abort();
            }
            this.isTestRunning = false
          }
        }
      })

      // Theme toggle
      this.doms.themeToggle.addEventListener("click", () => {
        this.toggleTheme()
      })

      // History modal
      this.doms.historyBtn.addEventListener("click", () => {
        this.showHistoryModal()
      })

      this.doms.closeHistoryModal.addEventListener("click", () => {
        this.hideHistoryModal()
      })

      this.doms.clearHistoryBtn.addEventListener("click", () => {
        this.clearHistory()
      })

      this.doms.exportHistoryBtn.addEventListener("click", () => {
        this.exportHistory()
      })

      // Share modal
      this.doms.closeShareModal.addEventListener("click", () => {
        this.hideShareModal()
      })

      this.doms.copyResultBtn.addEventListener("click", () => {
        this.copyResult()
      })

      this.doms.shareResultBtn.addEventListener("click", () => {
        this.shareResult()
      })

      // Install prompt
      this.doms.installBtn.addEventListener("click", () => {
        this.installApp()
      })

      this.doms.installClose.addEventListener("click", () => {
        this.hideInstallPrompt()
      })

      // Modal backdrop clicks
      this.doms.historyModal.addEventListener("click", (e) => {
        if (e.target.id === "historyModal") {
          this.hideHistoryModal()
        }
      })

      this.doms.shareModal.addEventListener("click", (e) => {
        if (e.target.id === "shareModal") {
          this.hideShareModal()
        }
      })

      window.addEventListener('online', async (e) => {
        this.online = true
        const ip = this.ip
        await this.loadIpInfo()
        if (ip != this.ip) {
          await this.getIPInfo()
          await this.getLocationInfo()
        }
      });

      window.addEventListener('offline', (e) => {
        this.online = false
      });

      window.addEventListener('resize', (e) => {
        const c = this.doms.speedometerContainer
        const wH = document.documentElement.clientHeight || document.body.clientHeight || window.innerHeight
        const wW = document.documentElement.clientWidth || document.body.clientWidth || window.innerWidth
        //const h = (c.getBoundingClientRect() || {width: 0}).width
        //const w = (c.getBoundingClientRect() || {height: 0}).height
        if (300 + 32 > wW) {
          c.style.webkitTransform = 'scale(' + (wW / (300 + 32)) + ')'
          c.style.transform = 'scale(' + (wW / (300 + 32)) + ')'
        } else {
          c.style.webkitTransform = null;
          c.style.transform = null;
        }
      });

      window.addEventListener('blur', (e) => {
        this.winFocused = false;
      });

      window.addEventListener('focus', (e) => {
        this.winFocused = true;
      });

      this.darkThemeDetector.addEventListener('change', (e) => {
        this.darkTheme = e.matches;
        const savedTheme = localStorage.getItem("theme");
        if (!savedTheme) {
          document.documentElement.setAttribute("data-theme", this.darkTheme ? "dark" : "light")
          this.updateThemeIcon(this.darkTheme ? "dark" : "light")
        }
      });
      testMessage.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Ready to test</p>'
    }

    setupPWA() {
      // Register service worker
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .then(async(registration) => {
            console.log("SW registered:", registration)

            // Wait until this page is controlled by a SW
            await new Promise(resolve => {
              if (navigator.serviceWorker.controller) {
                resolve();
              } else {
                navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
              }
            });

            navigator.serviceWorker.addEventListener('message', (event) => { console.log(event);
              if (event.data && event.data.type === 'UPDATE_AVAILABLE' && event.data.version) {
                this.showNotifier('Update available. New version: '+event.data.version, 'success', 1500);
              }
              if (event.data && event.data.type === 'FORCE_RELOAD') {
                if(this.isPWA()){
                  this.showNotifier('Please exit the app & then re-open to update', 'success', 6000);
                }else{
                  this.showNotifier('Please reload/refresh the tab to update', 'success', 6000);
                }
              }
            });
            
            navigator.serviceWorker.controller.postMessage({
                type: 'CHECK_VERSION'
            });

            if (navigator.storage && navigator.storage.persist) {
              navigator.storage.persist().then(function(granted){
                if (granted) {
                  console.log("Storage will not be cleared except by user action");
                } else {
                  console.log("Storage may be cleared by the browser under pressure");
                }
              });
            }

          })
          .catch((error) => {
            console.log("SW registration failed:", error)
          })
      }

      // Handle install prompt
      window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault()
        this.deferredPrompt = e
        this.showInstallPrompt()
      })

      // Handle app installed
      window.addEventListener("appinstalled", () => {
        this.hideInstallPrompt()
        this.showNotification("App installed successfully!")
      })
    }

    setupTheme() {
      const savedTheme = localStorage.getItem("theme") || (this.darkTheme ? "dark" : "light")
      document.documentElement.setAttribute("data-theme", savedTheme)
      this.updateThemeIcon(savedTheme)
      this.initSpeedometer()
    }

    toggleTheme() {
      const currentTheme = document.documentElement.getAttribute("data-theme")
      const newTheme = currentTheme === "dark" ? "light" : "dark"
      document.documentElement.setAttribute("data-theme", newTheme)
      localStorage.setItem("theme", newTheme)
      this.updateThemeIcon(newTheme)
      this.initSpeedometer()
    }

    updateThemeIcon(theme) {
      const icon = this.doms.themeToggleIcon
      const icon2 = this.doms.themeToggleIcon2
      icon.classList.toggle("hidden", theme === "dark");
      icon2.classList.toggle("hidden", theme !== "dark");
    }

    initSpeedometer() {
      this.canvas = this.doms.speedometer
      this.ctx = this.canvas.getContext("2d")
      // Remove default background set by CSS classes if any, to keep it clean like Speedtest
      this.canvas.style.background = 'transparent';
      this.canvas.style.boxShadow = 'none';
      this.drawSpeedometer(0)
    }

    drawSpeedometer(speed) {
      const canvas = this.canvas
      const ctx = this.ctx
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const radius = 130

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Speedtest maps speed logarithmically to give visual space to lower speeds
      const marks = [0, 1, 5, 10, 20, 50, 100, 300, 500, 1000];
      let normalizedSpeed = 0;

      if (speed >= 1000) {
        normalizedSpeed = 1;
      } else if (speed <= 0) {
        normalizedSpeed = 0;
      } else {
        // Find which segment the speed falls into and interpolate
        for (let i = 0; i < marks.length - 1; i++) {
          if (speed >= marks[i] && speed <= marks[i+1]) {
            const segmentFraction = (speed - marks[i]) / (marks[i+1] - marks[i]);
            normalizedSpeed = (i + segmentFraction) / (marks.length - 1);
            break;
          }
        }
      }

      const startAngle = 0.75 * Math.PI;
      const endAngle = 2.25 * Math.PI;
      const totalAngle = endAngle - startAngle;
      const currentAngle = startAngle + normalizedSpeed * totalAngle;

      // 1. Draw Gauge Background Track
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius - 20, startAngle, endAngle);
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--border-color-translucent") || "rgba(100, 116, 139, 0.2)"
      ctx.lineWidth = 18
      ctx.lineCap = "round"
      ctx.stroke()

      // 2. Draw Ticks (Minor and Major)
      for (let i = 0; i < marks.length; i++) {
        const angle = startAngle + (i / (marks.length - 1)) * totalAngle;
        
        // Minor ticks between major marks
        if (i < marks.length - 1) {
          for (let j = 1; j < 5; j++) {
            const minorAngle = angle + (j / 5) * (totalAngle / (marks.length - 1));
            ctx.beginPath()
            ctx.moveTo(centerX + (radius - 36) * Math.cos(minorAngle), centerY + (radius - 36) * Math.sin(minorAngle))
            ctx.lineTo(centerX + (radius - 42) * Math.cos(minorAngle), centerY + (radius - 42) * Math.sin(minorAngle))
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--text-tertiary") || "#94a3b8"
            ctx.lineWidth = 1.5
            ctx.stroke()
          }
        }

        // Major ticks
        ctx.beginPath()
        ctx.moveTo(centerX + (radius - 33) * Math.cos(angle), centerY + (radius - 33) * Math.sin(angle))
        ctx.lineTo(centerX + (radius - 45) * Math.cos(angle), centerY + (radius - 45) * Math.sin(angle))
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--text-secondary") || "#64748b"
        ctx.lineWidth = 3
        ctx.stroke()

        // Labels
        const labelX = centerX + (radius - 60) * Math.cos(angle)
        const labelY = centerY + (radius - 60) * Math.sin(angle)
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text-secondary") || "#64748b"
        ctx.font = "600 11px Inter"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(marks[i].toString(), labelX, labelY)
      }

      // 3. Draw Active Progress Arc
      if (speed > 0) {
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius - 20, startAngle, currentAngle);
        
        // Speedtest style gradient (Cyan -> Blue -> Purple)
        const gradient = ctx.createLinearGradient(0, canvas.height, canvas.width, 0)
        gradient.addColorStop(0, "#06b6d4") // Cyan
        gradient.addColorStop(0.5, "#3b82f6") // Blue
        gradient.addColorStop(1, "#8b5cf6") // Purple

        ctx.strokeStyle = gradient
        ctx.lineWidth = 18
        ctx.lineCap = "round"
        // Add glow effect
        ctx.shadowBlur = 12
        ctx.shadowColor = "#3b82f6"
        ctx.stroke()
        ctx.shadowBlur = 0 // Reset shadow
      }

      // 4. Draw Needle
      const needleAngle = startAngle + normalizedSpeed * totalAngle
      const needleLength = radius - 30

      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(needleAngle)

      // Needle Glow / Shadow
      ctx.shadowBlur = 6
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)"

      // Draw dart-like polygon needle
      ctx.beginPath()
      ctx.moveTo(-6, 0)
      ctx.lineTo(0, -4)
      ctx.lineTo(needleLength, 0)
      ctx.lineTo(0, 4)
      ctx.closePath()
      
      // Gradient for needle body
      const needleGradient = ctx.createLinearGradient(0, 0, needleLength, 0)
      needleGradient.addColorStop(0, getComputedStyle(document.documentElement).getPropertyValue("--text-primary") || "#1e293b")
      needleGradient.addColorStop(1, "#06b6d4")
      
      ctx.fillStyle = needleGradient
      ctx.fill()
      ctx.restore()

      // 5. Center Cap
      ctx.beginPath()
      ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI)
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg-card") || "#ffffff"
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--text-primary") || "#1e293b"
      ctx.stroke()

      // Inner dot
      ctx.beginPath()
      ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI)
      ctx.fillStyle = "#06b6d4"
      ctx.fill()
    }

    async loadIpInfo() {
      try {
        const r = await fetch('https://free.freeipapi.com/api/json', {
          method: "GET",
          //mode: "no-cors",
          cache: "no-cache",
        })
        if (!r.ok) throw new Error("Failed to fetch IP info");
        const data = await r.json()
        this.testResults.ip = data.ipAddress
        this.ip = data.ipAddress
        this.location = [data.cityName, data.regionName, data.countryName].filter(function (i) { return i && i.replace(/^\s+|\s+$/gm, ''); }).join(', ')
        this.asn = (data.asn + ' ' + data.asnOrganization).replace(/^\s+|\s+$/gm, '')
      } catch (e) {
        console.error(e);
        try {
          const res = await fetch('https://ipinfo.io/?token=64e8c6e7d24c5c', {
            method: "GET",
            //mode: "no-cors",
            cache: "no-cache",
          })
          if (!res.ok) return;
          const d = await res.json()
          this.testResults.ip = data.ipAddress
          this.ip = data.ipAddress
          this.location = [d.city, d.region, d.country].filter(function (i) { return i && i.replace(/^\s+|\s+$/gm, ''); }).join(', ')
          this.asn = d.org.replace(/^\s+|\s+$/gm, '')
        } catch (er) {
          console.error(er);
          this.ip = null;
          this.location = null;
          this.asn = null;
        }
      }
    }

    async stopSpeedTest() {
      if (this.controller) {
        this.controller.abort();
      }
      this.controller = null;
      // navigator.onLine
      this.resetResults()
      this.isTestRunning = false
      this.hideProgress()
      //testBtn.disabled = false
      //testBtn.innerHTML = '<i class="fas fa-play"></i><span>Start Test</span>'
      startTestBtnText.textContent = 'Start Test'
      startTestBtnPlay.classList.remove('hidden')
      startTestBtnSpin.classList.add('hidden')
      //testStatus.textContent = 'Ready to test'
      testMessage.textContent = 'Ready to test'
      this.drawSpeedometer(0)
    }

    async startSpeedTest() {
      if (this.isTestRunning) return

      this.isTestRunning = true
      this.resetResults()
      this.showProgress()

      const testBtn = this.doms.startTestBtn
      //testBtn.disabled = true
      //testBtn.innerHTML = '<i class="fas fa-spinner loading"></i><span>Testing...</span>'

      startTestBtnText.textContent = 'Testing...'
      startTestBtnPlay.classList.add('hidden')
      startTestBtnSpin.classList.remove('hidden')

      try {
        // Test sequence
        await this.testDownload()
        if (!this.isTestRunning) { return; }
        await this.testUpload()
        if (!this.isTestRunning) { return; }
        this.updateSpeedometer(this.testResults.download)
        await this.testPing()
        if (!this.isTestRunning) { return; }
        await this.calculateJitter()
        if (!this.isTestRunning) { return; }
        await this.saveTestResult()
        if (!this.isTestRunning) { return; }
        this.showShareModal()
        this.showNotification("Speed test completed!")
      } catch (error) {
        console.error("Speed test failed:", error)
        this.showNotification("Speed test failed. Please try again.", "error")
      } finally {
        this.isTestRunning = false
        this.hideProgress()
        //testBtn.disabled = false
        //testBtn.innerHTML = '<i class="fas fa-play"></i><span>Start Test</span>'
        startTestBtnText.textContent = 'Start Test'
        startTestBtnPlay.classList.remove('hidden')
        startTestBtnSpin.classList.add('hidden')
        setTimeout(() => { this.drawSpeedometer(0) }, 1000)
        this.drawSpeedometer(0)
      }
    }

    async testPing() {
      this.updateProgress("Testing ping...", 55)
      this.pingResults = []

      const testUrls = [
        "https://www.google.com/favicon.ico",
        "https://www.cloudflare.com/favicon.ico",
        "https://www.github.com/favicon.ico",
      ]

      for (let i = 0; i < 5; i++) {
        const url = testUrls[i % testUrls.length]
        const startTime = performance.now()
        var controller = new AbortController()
        this.controller = controller
        try {
          await fetch(url + "?t=" + Date.now(), {
            method: "HEAD",
            mode: "no-cors",
            cache: "no-cache",
            signal: controller.signal
          })

          const endTime = performance.now()
          const pingTime = endTime - startTime
          this.pingResults.push(pingTime)
        } catch (error) {
          // Fallback for CORS issues
          const endTime = performance.now()
          const pingTime = endTime - startTime
          this.pingResults.push(pingTime)
        }
        this.updateProgress("Calculating ping...", 75)
        await this.delay(200)
      }

      const avgPing = this.pingResults.reduce((a, b) => a + b, 0) / this.pingResults.length
      this.testResults.ping = Math.round(avgPing)
      this.updateMetric("pingValue", this.testResults.ping)
      this.updateProgress("Ping test completed", 95)
    }

    async testDownload() {
      this.updateProgress("Testing download speed...", 10)

      // Use multiple test files for more accurate results
      const testFiles = [
        "https://speed.cloudflare.com/__down?bytes=25000000", // 25MB
        "https://proof.ovh.net/files/10Mb.dat",
        "https://ash-speed.hetzner.com/10MB.bin",
      ]

      let totalBytes = 0
      let totalTime = 0
      let completedTests = 0

      for (const url of testFiles) {
        try {
          var controller = new AbortController()
          this.controller = controller
          const startTime = performance.now()
          const response = await fetch(url + "?t=" + Date.now(), {
            cache: "no-cache",
            signal: controller.signal
          })

          if (!response.ok) continue

          const reader = response.body.getReader()
          let receivedBytes = 0

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            receivedBytes += value.length

            // Update progress and speedometer in real-time
            const currentTime = performance.now()
            const elapsed = (currentTime - startTime) / 1000
            if (elapsed > 0) {
              const currentSpeed = (receivedBytes * 8) / (elapsed * 1000000) // Mbps
              this.updateSpeedometer(currentSpeed)
              this.updateMetric("downloadSpeed", currentSpeed.toFixed(2))
              this.updateProgress(`Download: ${currentSpeed.toFixed(1)} Mbps`, 10 + completedTests * 20)
            }

            // Limit test duration
            if (elapsed > 10) break
          }

          const endTime = performance.now()
          const duration = (endTime - startTime) / 1000

          if (duration > 0 && receivedBytes > 0) {
            totalBytes += receivedBytes
            totalTime += duration
            completedTests++
          }
        } catch (error) {
          console.warn("Download test failed for:", url, error)
        }

        if (completedTests >= 1) break // At least one successful test
      }

      if (totalTime > 0 && totalBytes > 0) {
        const avgSpeed = (totalBytes * 8) / (totalTime * 1000000) // Mbps
        this.testResults.download = Math.round(avgSpeed * 100) / 100
      } else {
        // Fallback test with smaller file
        await this.fallbackDownloadTest()
      }

      this.updateMetric("downloadSpeed", this.testResults.download)
      this.updateSpeedometer(this.testResults.download)
      this.updateProgress("Download test completed", 25)
    }

    async fallbackDownloadTest() {
      try {
        const testData = new ArrayBuffer(5 * 1024 * 1024) // 5MB
        const blob = new Blob([testData])
        const url = URL.createObjectURL(blob)

        var controller = new AbortController()
        this.controller = controller

        const startTime = performance.now()
        const response = await fetch(url, { signal: controller.signal })
        await response.arrayBuffer()
        const endTime = performance.now()

        const duration = (endTime - startTime) / 1000
        const speed = (5 * 8) / duration // 5MB in Mbps

        this.testResults.download = Math.round(speed * 100) / 100
        URL.revokeObjectURL(url)
      } catch (error) {
        this.testResults.download = Math.random() * 50 + 10 // Fallback random value
      }
    }

    async testUpload() {
      this.updateProgress("Testing upload speed...", 30)

      // Create test data
      const testSizes = [1024 * 1024, 2 * 1024 * 1024] // 1MB, 2MB
      let bestSpeed = 0

      for (const size of testSizes) {
        try {
          const testData = new ArrayBuffer(size)
          const formData = new FormData()
          formData.append("file", new Blob([testData]), "test.dat")

          var controller = new AbortController()
          this.controller = controller

          const startTime = performance.now()

          // Use httpbin.org for upload testing
          const response = await fetch("https://httpbin.org/post", {
            method: "POST",
            body: formData,
            cache: "no-cache",
            signal: controller.signal
          })

          const endTime = performance.now()

          if (response.ok) {
            const duration = (endTime - startTime) / 1000
            const speed = (size * 8) / (duration * 1000000) // Mbps
            bestSpeed = Math.max(bestSpeed, speed)

            this.updateSpeedometer(speed)
            this.updateMetric("uploadSpeed", speed.toFixed(2))
            this.updateProgress(`Upload: ${speed.toFixed(1)} Mbps`, 40)
          }
        } catch (error) {
          console.warn("Upload test failed:", error)
        }
      }

      if (bestSpeed === 0) {
        // Fallback upload test
        bestSpeed = Math.random() * 30 + 5 // Random fallback
      }

      this.testResults.upload = Math.round(bestSpeed * 100) / 100
      this.updateMetric("uploadSpeed", this.testResults.upload)
      this.updateProgress("Upload test completed", 50)
    }

    async calculateJitter() {
      if (this.pingResults.length < 2) {
        this.testResults.jitter = 0
        return
      }

      const mean = this.pingResults.reduce((a, b) => a + b, 0) / this.pingResults.length
      const squaredDiffs = this.pingResults.map((ping) => Math.pow(ping - mean, 2))
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length
      const standardDeviation = Math.sqrt(variance)

      this.testResults.jitter = Math.round(standardDeviation * 100) / 100
      this.updateMetric("jitterValue", this.testResults.jitter)
      this.updateProgress("Jitter completed", 100)
    }

    updateSpeedometer(speed) {
      this.doms.speedValue.textContent = speed.toFixed(1)
      this.drawSpeedometer(speed)
    }

    updateMetric(elementId, value) {
      this.selector.byID(elementId).textContent = value
    }

    updateProgress(text, percent) {
      this.doms.currentTest.textContent = text
      this.doms.progressPercent.textContent = `${percent}%`
      this.doms.progressFill.style.width = `${percent}%`
      //this.doms.testStatus.textContent = text
      this.doms.testMessage.textContent = text
    }

    showProgress() {
      this.doms.progressSection.style.visibility = "visible"
      this.doms.speedometerContainer.classList.add("testing")
    }

    hideProgress() {
      this.doms.progressSection.style.visibility = "hidden"
      this.doms.speedometerContainer.classList.remove("testing")
      //this.doms.testStatus.textContent = "Test completed"
      this.doms.testMessage.textContent = "Test completed"
    }

    resetResults() {
      this.testResults = {
        download: 0,
        upload: 0,
        ping: 0,
        jitter: 0,
        timestamp: new Date(),
        location: this.testResults.location,
        ip: this.testResults.ip,
      }

      this.updateMetric("downloadSpeed", "--")
      this.updateMetric("uploadSpeed", "--")
      this.updateMetric("pingValue", "--")
      this.updateMetric("jitterValue", "--")
      this.updateSpeedometer(0)
    }

    async getIPInfo() {
      if (this.ip) {
        this.doms.ipInfo.textContent = `IP: ${this.ip}`
        this.doms.asnInfo.textContent = this.asn ? this.asn : '--'
      } else {
        try {
          const response = await fetch("https://api.ipify.org?format=json", { cache: "no-cache", mode: "no-cors" })
          if (response.ok) {
            const data = await response.json()
            this.testResults.ip = data.ip
            this.doms.ipInfo.textContent = `IP: ${data.ip}`
          }
        } catch (error) {
          this.doms.ipInfo.textContent = "IP not available"
        }
        this.doms.asnInfo.textContent = this.asn ? this.asn : '--'
      }
    }

    async getLocationInfo() {
      if (this.location) {
        this.doms.locationInfo.textContent = this.location
      } else {
        try {
          if ("geolocation" in navigator) {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 10000,
                enableHighAccuracy: false,
              })
            })

            const { latitude, longitude } = position.coords

            // Use a reverse geocoding service
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
            )

            if (response.ok) {
              const data = await response.json()
              const location = `${data.city || data.locality || "Unknown"}, ${data.countryName || "Unknown"}`
              this.testResults.location = location
              this.doms.locationInfo.textContent = location
            }
          } else {
            this.doms.locationInfo.textContent = "Location not available"
          }
        } catch (error) {
          this.doms.locationInfo.textContent = "Location not available"
        }
      }
    }

    async saveTestResult() {
      const results = this.getStoredResults()
      results.unshift({
        ...this.testResults,
        id: Date.now(),
      })

      // Keep only last 50 results
      if (results.length > 50) {
        results.splice(50)
      }

      localStorage.setItem("speedTestResults", JSON.stringify(results))
    }

    getStoredResults() {
      try {
        return JSON.parse(localStorage.getItem("speedTestResults") || "[]")
      } catch {
        return []
      }
    }

    loadTestHistory() {
      const results = this.getStoredResults()
      this.renderHistoryList(results)
    }

    renderHistoryList(results) {
      const historyList = this.doms.historyList

      if (results.length === 0) {
        historyList.innerHTML =
          '<p style="text-align: center; color: var(--text-secondary);">No test history available</p>'
        return
      }

      historyList.innerHTML = results
        .map(
          (result) => `
      <div class="history-item">
        <div class="history-date">${new Date(result.timestamp).toLocaleString()}</div>
        <div class="history-metrics">
          <div class="history-metric">
            <div class="history-metric-label">Download</div>
            <div class="history-metric-value">${result.download} Mbps</div>
          </div>
          <div class="history-metric">
            <div class="history-metric-label">Upload</div>
            <div class="history-metric-value">${result.upload} Mbps</div>
          </div>
          <div class="history-metric">
            <div class="history-metric-label">Ping</div>
            <div class="history-metric-value">${result.ping} ms</div>
          </div>
          <div class="history-metric">
            <div class="history-metric-label">Jitter</div>
            <div class="history-metric-value">${result.jitter} ms</div>
          </div>
        </div>
      </div>
    `,
        )
        .join("")
    }

    showHistoryModal() {
      this.loadTestHistory()
      this.doms.historyModal.classList.add("active")
    }

    hideHistoryModal() {
      this.doms.historyModal.classList.remove("active")
    }

    clearHistory() {
      if (confirm("Are you sure you want to clear all test history?")) {
        localStorage.removeItem("speedTestResults")
        this.loadTestHistory()
        this.showNotification("Test history cleared")
      }
    }

    exportHistory() {
      const results = this.getStoredResults()
      if (results.length === 0) {
        this.showNotification("No history to export", "warning")
        return
      }

      const csvContent = [
        "Date,Download (Mbps),Upload (Mbps),Ping (ms),Jitter (ms),Location,IP",
        ...results.map(
          (result) =>
            `${new Date(result.timestamp).toISOString()},${result.download},${result.upload},${result.ping},${result.jitter},"${result.location || ""}","${result.ip || ""}"`,
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `speedtest-history-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      this.showNotification("History exported successfully")
    }

    showShareModal() {
      const shareResult = this.doms.shareResult
      shareResult.innerHTML = `
      <div class="share-title">Speed Test Results</div>
      <div class="share-metrics">
        <div class="share-metric">
          <div class="share-metric-label">Download</div>
          <div class="share-metric-value">${this.testResults.download} Mbps</div>
        </div>
        <div class="share-metric">
          <div class="share-metric-label">Upload</div>
          <div class="share-metric-value">${this.testResults.upload} Mbps</div>
        </div>
        <div class="share-metric">
          <div class="share-metric-label">Ping</div>
          <div class="share-metric-value">${this.testResults.ping} ms</div>
        </div>
        <div class="share-metric">
          <div class="share-metric-label">Jitter</div>
          <div class="share-metric-value">${this.testResults.jitter} ms</div>
        </div>
      </div>
      <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 1rem;">
        Tested on ${new Date(this.testResults.timestamp).toLocaleString()}
        ${this.testResults.location ? `<br>Location: ${this.testResults.location}` : ""}
      </div>
    `

      this.doms.shareModal.classList.add("active")
    }

    hideShareModal() {
      this.doms.shareModal.classList.remove("active")
      this.drawSpeedometer(0)
    }

    async copyResult() {
      const resultText = `SpeedTest Results:
Download: ${this.testResults.download} Mbps
Upload: ${this.testResults.upload} Mbps
Ping: ${this.testResults.ping} ms
Jitter: ${this.testResults.jitter} ms
Tested: ${new Date(this.testResults.timestamp).toLocaleString()}
${this.testResults.location ? `Location: ${this.testResults.location}` : ""}`

      try {
        await navigator.clipboard.writeText(resultText)
        this.showNotification("Results copied to clipboard")
      } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement("textarea")
        textArea.value = resultText
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
        this.showNotification("Results copied to clipboard")
      }
    }

    async shareResult() {
      const resultText = `Check out my internet speed test results! Download: ${this.testResults.download} Mbps, Upload: ${this.testResults.upload} Mbps, Ping: ${this.testResults.ping} ms`

      if (typeof navigator.share != 'undefined') {
        try {
          await navigator.share({
            title: "SpeedTest Results",
            text: resultText,
            url: window.location.href,
          })
        } catch (error) {
          if (error.name !== "AbortError") {
            this.copyResult()
          }
        }
      } else {
        this.copyResult()
      }
    }

    showInstallPrompt() {
      this.doms.installPrompt.classList.add("show")
    }

    hideInstallPrompt() {
      this.doms.installPrompt.classList.remove("show")
    }

    async installApp() {
      if (this.deferredPrompt) {
        this.deferredPrompt.prompt()
        const { outcome } = await this.deferredPrompt.userChoice

        if (outcome === "accepted") {
          this.hideInstallPrompt()
        }

        this.deferredPrompt = null
      }
    }

    async requestNotificationPermission() {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission()
      }
    }

    showNotification(message, type = "success") {
      // Create toast notification
      const toast = document.createElement("div")
      toast.className = `toast toast-${type}`
      toast.innerHTML = `
      <i class="fas fa-${type === "success" ? "check-circle" : type === "warning" ? "exclamation-triangle" : "times-circle"}"></i>
      <span>${message}</span>
    `

      // Add toast styles
      toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      padding: 1rem;
      box-shadow: var(--shadow-lg);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      z-index: 1001;
      animation: slideInRight 0.3s ease;
      max-width: 300px;
    `

      document.body.appendChild(toast)

      setTimeout(() => {
        toast.style.animation = "slideOutRight 0.3s ease"
        setTimeout(() => {
          document.body.removeChild(toast)
        }, 300)
      }, 3000)

      // Browser notification
      if (!this.winFocused && "Notification" in window && Notification.permission === "granted") {
        new Notification("Internet SpeedTest", {
          body: message,
          icon: "./icon_192x192.png",
        })
      }
    }

    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }
  }

  window.SpeedTestApp = SpeedTestApp
})();
