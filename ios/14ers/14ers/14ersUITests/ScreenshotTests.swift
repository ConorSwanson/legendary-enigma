import XCTest

/// Captures one screenshot per main tab for App Store Connect.
///
/// Setup (one-time, in Xcode):
///   1. File > New > Target… > UI Testing Bundle. Name it "14ersUITests" and
///      pick the "14ers" app as the target to test. Xcode creates the
///      "14ersUITests" group/target this file expects to live in.
///   2. Drag this file into that new target if Xcode didn't already pick it
///      up (it matches the folder name, so it usually will).
///   3. If the simulator you're running on has never signed in before, edit
///      the test scheme (Product > Scheme > Edit Scheme… > Test > Arguments
///      > Environment Variables) and add SCREENSHOT_EMAIL / SCREENSHOT_PASSWORD
///      for an existing test account. If the simulator is already signed in
///      from a previous manual run, this step isn't needed — the session
///      persists in the Keychain across app launches.
///
/// Running it:
///   - Pick a simulator matching a required App Store screenshot size
///     (e.g. iPhone 16 Pro Max for the mandatory 6.9" set).
///   - Run just this test class (the diamond next to `class ScreenshotTests`
///     in the gutter), not the whole suite.
///   - Open the Test Report (Cmd+9 in the sidebar, or Cmd+9 then select the
///     run), find this test, expand it, and each screenshot is attached by
///     name — right-click > "Save Attachment" to export as a PNG.
///   - Switch simulators and re-run for each additional required size.
final class ScreenshotTests: XCTestCase {

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testCaptureAppStoreScreenshots() throws {
        let app = XCUIApplication()
        app.launchEnvironment["SCREENSHOT_MODE"] = "1"
        app.launch()

        // The splash screen holds for ~0.9s (see App14ers.swift) before
        // routing to sign-in or the main tabs — wait it out.
        sleep(2)

        signInIfNeeded(app)

        // Give the dashboard a moment to load real data before the first shot.
        sleep(2)
        attachScreenshot(named: "01-Profile", from: app)

        tapTabAndCapture(app, label: "Feed", name: "02-Feed")
        tapTabAndCapture(app, label: "Log", name: "03-Log")
        tapTabAndCapture(app, label: "Summits", name: "04-Summits")
        tapTabAndCapture(app, label: "Badges", name: "05-Badges")
    }

    // MARK: - Helpers

    private func signInIfNeeded(_ app: XCUIApplication) {
        let emailField = app.textFields["Email"]
        guard emailField.waitForExistence(timeout: 3) else {
            return // already signed in from a previous run
        }

        let email = ProcessInfo.processInfo.environment["SCREENSHOT_EMAIL"]
        let password = ProcessInfo.processInfo.environment["SCREENSHOT_PASSWORD"]
        guard let email, let password, !email.isEmpty, !password.isEmpty else {
            XCTFail("""
                Sign-in screen is showing and no SCREENSHOT_EMAIL / SCREENSHOT_PASSWORD \
                were set. Either sign in manually on this simulator once (the session \
                persists for future runs), or set those two environment variables on the \
                test scheme.
                """)
            return
        }

        emailField.tap()
        emailField.typeText(email)

        let passwordField = app.secureTextFields["Password"]
        passwordField.tap()
        passwordField.typeText(password)

        app.buttons["Sign In"].tap()

        // Wait for the tab bar to appear, confirming sign-in succeeded.
        _ = app.tabBars.firstMatch.waitForExistence(timeout: 10)
    }

    private func tapTabAndCapture(_ app: XCUIApplication, label: String, name: String) {
        let tab = app.tabBars.buttons[label]
        guard tab.waitForExistence(timeout: 5) else {
            XCTFail("Couldn't find the \"\(label)\" tab — check MainTabView.swift for the current tab labels.")
            return
        }
        tab.tap()
        sleep(1) // let the screen's content load before capturing
        attachScreenshot(named: name, from: app)
    }

    private func attachScreenshot(named name: String, from app: XCUIApplication) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
