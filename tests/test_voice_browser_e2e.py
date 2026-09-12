import re
import time

from playwright.sync_api import sync_playwright


BASE_URL = "http://localhost:3000"


def test_voice_browser_lifecycle():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            permissions=["microphone"],
            locale="en-IN",
        )
        page = context.new_page()

        page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"[BROWSER PAGE ERROR] {exc}"))
        page.on("requestfailed", lambda req: print(f"[BROWSER REQUEST FAILED] {req.url} :: {req.failure}"))
        # Browser SpeechRecognition mock + SpeechSynthesis mock.
        page.add_init_script(
            """
            (() => {
              class MockRecognition {
                constructor() {
                  this.continuous = false;
                  this.interimResults = true;
                  this.lang = 'en-IN';
                  this.started = false;
                  window.__auraRecognition = this;
                }

                start() {
                  this.started = true;
                  window.__auraRecognitionStartCount =
                    (window.__auraRecognitionStartCount || 0) + 1;
                  if (this.onstart) this.onstart();
                }

                stop() {
                  this.started = false;
                  window.__auraRecognitionStopCount =
                    (window.__auraRecognitionStopCount || 0) + 1;
                  if (this.onend) this.onend();
                }

                abort() {
                  this.started = false;
                }

                emitFinal(text) {
                  if (!this.onresult) return;
                  this.onresult({
                    resultIndex: 0,
                    results: [
                      {
                        0: { transcript: text },
                        isFinal: true,
                        length: 1
                      }
                    ]
                  });
                }
              }

              window.SpeechRecognition = MockRecognition;
              window.webkitSpeechRecognition = MockRecognition;

              const originalUtterance =
                window.SpeechSynthesisUtterance;

              window.SpeechSynthesisUtterance =
                originalUtterance ||
                class {
                  constructor(text) {
                    this.text = text;
                    this.lang = '';
                    this.rate = 1;
                    this.pitch = 1;
                    this.voice = null;
                    this.onstart = null;
                    this.onend = null;
                    this.onerror = null;
                  }
                };

              const synthesis = {
                speaking: false,
                pending: false,
                paused: false,
                _voices: [],

                getVoices() {
                  return this._voices;
                },

                addEventListener() {},

                cancel() {
                  this.speaking = false;
                  this.pending = false;
                  this.paused = false;
                  window.__auraTtsCancelCount =
                    (window.__auraTtsCancelCount || 0) + 1;
                },

                speak(utterance) {
                  this.speaking = true;
                  window.__auraLastUtterance = {
                    text: utterance.text,
                    lang: utterance.lang,
                    rate: utterance.rate,
                    pitch: utterance.pitch
                  };

                  window.__auraTtsStartCount =
                    (window.__auraTtsStartCount || 0) + 1;

                  if (utterance.onstart) utterance.onstart();

                  window.__auraCurrentUtterance = utterance;
                }
              };

              Object.defineProperty(window, 'speechSynthesis', {
                configurable: true,
                value: synthesis
              });

              window.__auraFinishTts = () => {
                const utterance = window.__auraCurrentUtterance;
                synthesis.speaking = false;
                if (utterance && utterance.onend) {
                  utterance.onend();
                }
                window.__auraCurrentUtterance = null;
              };
            })();
            """
        )

        # Mock authentication/session APIs so the test exercises the
        # authenticated AURA UI without depending on a real account.
        def handle_api(route):
            url = route.request.url

            if url.endswith("/api/auth/me"):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body='{"authenticated":true,"user":{"id":"voice_browser_e2e","name":"Voice E2E"}}',
                )
                return

            if url.endswith("/api/permissions"):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body='{"success":true,"permissions":{}}',
                )
                return

            if url.endswith("/api/brain/permissions"):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body='{"success":true,"permissions":{}}',
                )
                return

            if "/api/brain/turn" in url:
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=(
                        '{"success":true,'
                        '"intent":"QUESTION",'
                        '"language":"english",'
                        '"conversation_or_action":"conversation",'
                        '"tasks_created":0,'
                        '"execution_performed":false,'
                        '"response":"Hello from AURA voice test."}'
                    ),
                )
                return

            if url.endswith("/api/auth/logout"):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body='{"success":true}',
                )
                return

            route.continue_()

        page.route("**/api/**", handle_api)

        page.goto(BASE_URL, wait_until="networkidle")

        # Authenticated AURA UI must be visible.
        page.wait_for_timeout(1500)

        print("\n=== BROWSER DEBUG ===")
        print("URL:", page.url)
        print("TITLE:", page.title())
        print("BODY_TEXT:")
        print(page.locator("body").inner_text()[:5000])
        print("BUTTONS:")
        for i, button in enumerate(page.locator("button").all()):
            try:
                print(i, "title=", button.get_attribute("title"),
                      "text=", button.inner_text()[:100])
            except Exception:
                pass
        print("AUTH_MODAL_VISIBLE:",
              page.locator("text=Continue to AURA.").count())
        print("VOICE_TITLES:",
              page.locator("[title]").evaluate_all(
                  "(els) => els.map(e => e.getAttribute('title')).filter(Boolean)"
              ))

        # Finish automatic welcome TTS before voice input.
        page.evaluate("() => window.__auraFinishTts?.()")
        page.wait_for_timeout(100)

        voice_button = page.get_by_title("Voice access").first

        assert voice_button.is_visible(), "Voice/mic control not visible"

        # Enable persistent voice mode.
        voice_button.click()
        page.wait_for_timeout(500)

        starts_before_transcript = page.evaluate(
            "() => window.__auraRecognitionStartCount || 0"
        )
        assert starts_before_transcript >= 1, (
            "SpeechRecognition.start() was not called"
        )

        # Inject a real final recognition event.
        page.evaluate(
            """() => window.__auraRecognition.emitFinal('what is SEO')"""
        )

        page.wait_for_timeout(800)

        # Frontend must send transcript to AURA Brain.
        assert page.get_by_text("Hello from AURA voice test.").is_visible()

        # AURA reply must enter SpeechSynthesis.
        tts_start_count = page.evaluate(
            "() => window.__auraTtsStartCount || 0"
        )
        assert tts_start_count >= 1, "SpeechSynthesis.speak() was not called"

        last_utterance = page.evaluate(
            "() => window.__auraLastUtterance"
        )

        assert last_utterance["text"] == "Hello from AURA voice test."
        assert last_utterance["lang"] in ("en-US", "en-IN")

        # While TTS is active, recognition must remain stopped.
        starts_during_tts = page.evaluate(
            "() => window.__auraRecognitionStartCount || 0"
        )
        assert starts_during_tts == starts_before_transcript

        # Finish TTS. Voice session should resume listening.
        page.evaluate("() => window.__auraFinishTts()")
        page.wait_for_timeout(600)

        starts_after_tts = page.evaluate(
            "() => window.__auraRecognitionStartCount || 0"
        )
        assert starts_after_tts > starts_during_tts, (
            "Recognition did not resume after TTS ended"
        )

        # Logout must stop the persistent voice session.
        sign_out = page.get_by_title("Sign out")
        assert sign_out.is_visible(), "Sign out control not visible"

        stop_before_logout = page.evaluate(
            "() => window.__auraRecognitionStopCount || 0"
        )

        sign_out.click()
        page.wait_for_timeout(500)

        stop_after_logout = page.evaluate(
            "() => window.__auraRecognitionStopCount || 0"
        )

        assert stop_after_logout > stop_before_logout, (
            "Recognition was not stopped during logout"
        )

        assert page.evaluate(
            "() => window.speechSynthesis.speaking"
        ) is False

        print("VOICE_BROWSER_E2E: PASS")

        browser.close()
