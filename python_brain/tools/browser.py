"""
AURA AI — Real Browser Automation Tool with Playwright
Controls headless Chromium, captures real screenshots, inspects DOM, clicks, types, and validates web pages.
Strictly authentic execution: Never returns simulated browser actions or fake PNGs.
"""

import os
import io
import base64
import time
from typing import Dict, Any, Optional, List, Tuple
import logging

logger = logging.getLogger("AuraBrowser")

class BrowserTool:
    _cached_status: Optional[str] = None
    _cached_diagnostics: Optional[Dict[str, Any]] = None

    @classmethod
    def diagnose_runtime(cls, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Diagnoses whether Playwright and Chromium binaries are genuinely available and operational.
        """
        if not force_refresh and cls._cached_diagnostics:
            return cls._cached_diagnostics

        has_playwright = False
        playwright_version = None
        chromium_available = False
        launch_succeeded = False
        launch_error = None

        try:
            import playwright
            has_playwright = True
            playwright_version = getattr(playwright, "__version__", "installed")
        except ImportError as e:
            launch_error = f"Playwright package is not installed: {str(e)}"

        if has_playwright:
            try:
                from playwright.sync_api import sync_playwright
                with sync_playwright() as p:
                    try:
                        browser = p.chromium.launch(
                            headless=True,
                            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
                        )
                        page = browser.new_page(viewport={"width": 1280, "height": 800})
                        page.goto("data:text/html,<html><head><title>AURA Test</title></head><body><h1>AURA</h1></body></html>")
                        if page.title() == "AURA Test":
                            launch_succeeded = True
                            chromium_available = True
                        browser.close()
                    except Exception as launch_exc:
                        launch_error = f"Failed to launch Chromium: {str(launch_exc)}"
            except Exception as e:
                launch_error = f"Playwright runtime error: {str(e)}"

        if has_playwright and launch_succeeded:
            status = "WORKING"
        elif has_playwright and not chromium_available:
            status = "PARTIALLY_WORKING"
        else:
            status = "UNAVAILABLE"

        cls._cached_status = status
        cls._cached_diagnostics = {
            "status": status,
            "playwright_installed": has_playwright,
            "playwright_version": playwright_version,
            "chromium_available": chromium_available,
            "launch_succeeded": launch_succeeded,
            "launch_error": launch_error
        }
        return cls._cached_diagnostics

    @classmethod
    def get_status(cls) -> str:
        if cls._cached_status:
            return cls._cached_status
        return cls.diagnose_runtime().get("status", "UNAVAILABLE")

    @staticmethod
    def _validate_image_bytes(img_bytes: bytes) -> Tuple[bool, int, int, str]:
        """
        Validates real PNG/JPEG data using Pillow and magic bytes.
        Returns: (is_valid, width, height, format_name)
        """
        if not img_bytes or len(img_bytes) < 16:
            return False, 0, 0, "EMPTY"

        # Check PNG magic bytes
        if not img_bytes.startswith(b"\x89PNG\r\n\x1a\n") and not img_bytes.startswith(b"\xff\xd8\xff"):
            return False, 0, 0, "INVALID_MAGIC"

        try:
            from PIL import Image
            img = Image.open(io.BytesIO(img_bytes))
            width, height = img.size
            if width <= 1 or height <= 1:
                return False, width, height, "FAKE_OR_1x1"
            return True, width, height, img.format or "PNG"
        except Exception as e:
            # Fallback size parsing if PIL fails
            if img_bytes.startswith(b"\x89PNG\r\n\x1a\n") and len(img_bytes) >= 24:
                import struct
                width, height = struct.unpack(">II", img_bytes[16:24])
                if width > 1 and height > 1:
                    return True, width, height, "PNG"
            return False, 0, 0, f"CORRUPT: {str(e)}"

    @staticmethod
    def navigate_and_inspect(
        target: str,
        screenshot_path: Optional[str] = None,
        timeout_ms: int = 15000,
        viewport_width: int = 1280,
        viewport_height: int = 800
    ) -> Dict[str, Any]:
        """
        Executes a real Playwright headless navigation, DOM inspection, and verified screenshot capture.
        Strictly honest: fails if Playwright or browser binary is unavailable.
        """
        start = time.time()

        # Handle local files vs web URLs
        url = target
        abs_target = None
        if not (target.startswith("http://") or target.startswith("https://") or target.startswith("data:")):
            abs_target = os.path.abspath(target)
            if not os.path.exists(abs_target):
                return {
                    "success": False,
                    "error": f"Target local file does not exist: {target}",
                    "status": "NOT_FOUND",
                    "duration_ms": int((time.time() - start) * 1000)
                }
            url = f"file://{abs_target}"

        try:
            from playwright.sync_api import sync_playwright
        except ImportError as e:
            return {
                "success": False,
                "error": f"Playwright package is not installed: {str(e)}",
                "status": "PARTIALLY_WORKING",
                "duration_ms": int((time.time() - start) * 1000)
            }

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    headless=True,
                    args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
                )
                page = browser.new_page(viewport={"width": viewport_width, "height": viewport_height})

                console_messages: List[str] = []
                page_errors: List[str] = []
                page.on("console", lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))
                page.on("pageerror", lambda err: page_errors.append(str(err)))

                page.goto(url, timeout=timeout_ms)
                page.wait_for_load_state("domcontentloaded")

                title = page.title()
                h1_elements = page.locator("h1").all_text_contents()
                h2_elements = page.locator("h2").all_text_contents()

                # Extract interactive elements with bounding boxes
                interactive_elements: List[Dict[str, Any]] = []
                locators = page.locator("button, a[href], input, textarea, select, form").all()
                for loc in locators[:25]:
                    try:
                        tag = loc.evaluate("el => el.tagName.toLowerCase()")
                        txt = (loc.text_content() or loc.input_value() or loc.get_attribute("placeholder") or "").strip()
                        bbox = loc.bounding_box()
                        interactive_elements.append({
                            "tag": tag,
                            "text": txt[:80],
                            "visible": loc.is_visible(),
                            "bbox": [bbox["x"], bbox["y"], bbox["width"], bbox["height"]] if bbox else None
                        })
                    except Exception:
                        continue

                # Capture real verified screenshot
                screenshot_bytes = page.screenshot(type="png", full_page=False)
                is_valid, w, h, fmt = BrowserTool._validate_image_bytes(screenshot_bytes)
                if not is_valid:
                    browser.close()
                    return {
                        "success": False,
                        "error": f"Screenshot validation failed: {fmt}",
                        "status": "SCREENSHOT_INVALID",
                        "duration_ms": int((time.time() - start) * 1000)
                    }

                screenshot_b64 = base64.b64encode(screenshot_bytes).decode("utf-8")

                if screenshot_path:
                    abs_out = os.path.abspath(screenshot_path)
                    os.makedirs(os.path.dirname(abs_out), exist_ok=True)
                    with open(abs_out, "wb") as f:
                        f.write(screenshot_bytes)

                browser.close()

                duration_ms = int((time.time() - start) * 1000)
                return {
                    "success": True,
                    "url": target,
                    "title": title,
                    "h1": [h.strip() for h in h1_elements if h.strip()],
                    "h2": [h.strip() for h in h2_elements if h.strip()][:10],
                    "interactive_elements": interactive_elements,
                    "element_count": len(interactive_elements),
                    "screenshot_captured": True,
                    "screenshot_path": screenshot_path,
                    "screenshot_width": w,
                    "screenshot_height": h,
                    "screenshot_bytes_len": len(screenshot_bytes),
                    "screenshot_b64": f"data:image/png;base64,{screenshot_b64}",
                    "console_messages": console_messages,
                    "page_errors": page_errors,
                    "duration_ms": duration_ms
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"Playwright browser execution failed: {str(e)}",
                "status": "PARTIALLY_WORKING",
                "duration_ms": int((time.time() - start) * 1000)
            }

    @staticmethod
    def execute_e2e_flow(
        target_url: str,
        actions: List[Dict[str, Any]],
        verify_condition: Optional[Dict[str, Any]] = None,
        screenshot_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes a real multi-step browser interaction flow with before/after state verification.
        Each action records:
        - action
        - target
        - before_state
        - operation
        - after_state
        - verification
        - screenshot/DOM evidence
        """
        start = time.time()
        diag = BrowserTool.diagnose_runtime()
        if diag.get("status") != "WORKING":
            return {
                "success": False,
                "error": f"Browser runtime not available: {diag.get('launch_error')}",
                "status": diag.get("status", "UNAVAILABLE"),
                "duration_ms": int((time.time() - start) * 1000)
            }

        url = target_url
        if not (target_url.startswith("http://") or target_url.startswith("https://") or target_url.startswith("data:")):
            abs_target = os.path.abspath(target_url)
            if not os.path.exists(abs_target):
                return {"success": False, "error": f"Target file does not exist: {target_url}"}
            url = f"file://{abs_target}"

        from playwright.sync_api import sync_playwright

        steps_evidence: List[Dict[str, Any]] = []
        overall_success = True

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    headless=True,
                    args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
                )
                page = browser.new_page(viewport={"width": 1280, "height": 800})
                page.goto(url, timeout=15000)
                page.wait_for_load_state("domcontentloaded")

                for idx, act in enumerate(actions):
                    act_name = act.get("action", "")
                    selector = act.get("selector", "")
                    value = act.get("value", "")
                    step_start = time.time()

                    # Capture before state
                    before_title = page.title()
                    before_url = page.url
                    before_val = None
                    try:
                        if selector:
                            loc = page.locator(selector).first
                            if loc.count() > 0:
                                before_val = loc.input_value() if act_name in ("type", "fill") else loc.text_content()
                    except Exception:
                        pass

                    op_success = False
                    op_err = None

                    try:
                        if act_name in ("click", "press"):
                            page.click(selector, timeout=8000)
                            op_success = True
                        elif act_name in ("type", "fill"):
                            page.fill(selector, str(value), timeout=8000)
                            op_success = True
                        elif act_name == "press_key":
                            if selector:
                                page.press(selector, str(value), timeout=8000)
                            else:
                                page.keyboard.press(str(value))
                            op_success = True
                        elif act_name == "wait":
                            wait_ms = int(value or 1000)
                            page.wait_for_timeout(wait_ms)
                            op_success = True
                        elif act_name == "wait_for_selector":
                            page.wait_for_selector(selector, timeout=8000)
                            op_success = True
                        else:
                            op_err = f"Unsupported browser action: {act_name}"
                    except Exception as exc:
                        op_err = str(exc)

                    # Capture after state
                    after_title = page.title()
                    after_url = page.url
                    after_val = None
                    try:
                        if selector:
                            loc = page.locator(selector).first
                            if loc.count() > 0:
                                after_val = loc.input_value() if act_name in ("type", "fill") else loc.text_content()
                    except Exception:
                        pass

                    step_evidence = {
                        "step_index": idx + 1,
                        "action": act_name,
                        "target": selector or url,
                        "before_state": {
                            "title": before_title,
                            "url": before_url,
                            "element_value": before_val
                        },
                        "operation": {
                            "action": act_name,
                            "selector": selector,
                            "value": value,
                            "success": op_success,
                            "error": op_err
                        },
                        "after_state": {
                            "title": after_title,
                            "url": after_url,
                            "element_value": after_val
                        },
                        "verification": {
                            "state_changed": (before_val != after_val or before_title != after_title or before_url != after_url),
                            "action_completed": op_success
                        },
                        "duration_ms": int((time.time() - step_start) * 1000)
                    }
                    steps_evidence.append(step_evidence)

                    if not op_success:
                        overall_success = False
                        break

                # Final verification condition check
                verification_result = {"passed": overall_success}
                if verify_condition and overall_success:
                    v_selector = verify_condition.get("selector")
                    v_text = verify_condition.get("expected_text")
                    if v_selector:
                        loc = page.locator(v_selector).first
                        if loc.count() > 0:
                            actual_text = loc.text_content() or ""
                            if v_text:
                                passed = v_text.lower() in actual_text.lower()
                                verification_result = {
                                    "passed": passed,
                                    "expected": v_text,
                                    "actual": actual_text.strip()
                                }
                                if not passed:
                                    overall_success = False

                # Final screenshot
                final_screenshot_bytes = page.screenshot(type="png")
                is_valid, w, h, _ = BrowserTool._validate_image_bytes(final_screenshot_bytes)
                screenshot_b64 = base64.b64encode(final_screenshot_bytes).decode("utf-8") if is_valid else None

                if screenshot_path and is_valid:
                    abs_out = os.path.abspath(screenshot_path)
                    os.makedirs(os.path.dirname(abs_out), exist_ok=True)
                    with open(abs_out, "wb") as f:
                        f.write(final_screenshot_bytes)

                browser.close()

                return {
                    "success": overall_success,
                    "target_url": target_url,
                    "total_actions": len(actions),
                    "steps_executed": len(steps_evidence),
                    "evidence": steps_evidence,
                    "verification": verification_result,
                    "screenshot_captured": is_valid,
                    "screenshot_width": w if is_valid else 0,
                    "screenshot_height": h if is_valid else 0,
                    "screenshot_bytes_len": len(final_screenshot_bytes) if is_valid else 0,
                    "screenshot_path": screenshot_path if is_valid else None,
                    "duration_ms": int((time.time() - start) * 1000)
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"E2E browser execution failure: {str(e)}",
                "evidence": steps_evidence,
                "duration_ms": int((time.time() - start) * 1000)
            }
