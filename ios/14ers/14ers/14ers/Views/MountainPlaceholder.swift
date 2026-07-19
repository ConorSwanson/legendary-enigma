import SwiftUI

struct MountainPlaceholder: View {
    let mountainId: Int

    private struct Palette {
        let skyTop: Color
        let skyBottom: Color
        let farRange: Color
        let nearPeak: Color
        let snowCap: Color
    }

    private var palette: Palette {
        switch mountainId % 7 {
        case 0: // Pre-dawn blue
            return Palette(
                skyTop:    Color(red: 6/255,   green: 18/255,  blue: 52/255),
                skyBottom: Color(red: 22/255,  green: 50/255,  blue: 100/255),
                farRange:  Color(red: 28/255,  green: 55/255,  blue: 88/255),
                nearPeak:  Color(red: 12/255,  green: 22/255,  blue: 44/255),
                snowCap:   Color(white: 0.88)
            )
        case 1: // Alpenglow
            return Palette(
                skyTop:    Color(red: 80/255,  green: 20/255,  blue: 50/255),
                skyBottom: Color(red: 220/255, green: 100/255, blue: 60/255),
                farRange:  Color(red: 100/255, green: 45/255,  blue: 55/255),
                nearPeak:  Color(red: 35/255,  green: 15/255,  blue: 25/255),
                snowCap:   Color(red: 255/255, green: 220/255, blue: 200/255)
            )
        case 2: // Dusk purple
            return Palette(
                skyTop:    Color(red: 28/255,  green: 8/255,   blue: 55/255),
                skyBottom: Color(red: 90/255,  green: 40/255,  blue: 120/255),
                farRange:  Color(red: 55/255,  green: 28/255,  blue: 75/255),
                nearPeak:  Color(red: 18/255,  green: 8/255,   blue: 32/255),
                snowCap:   Color(red: 210/255, green: 185/255, blue: 240/255)
            )
        case 3: // Stormy slate
            return Palette(
                skyTop:    Color(red: 22/255,  green: 28/255,  blue: 38/255),
                skyBottom: Color(red: 50/255,  green: 62/255,  blue: 80/255),
                farRange:  Color(red: 40/255,  green: 50/255,  blue: 65/255),
                nearPeak:  Color(red: 16/255,  green: 20/255,  blue: 28/255),
                snowCap:   Color(white: 0.75)
            )
        case 4: // Golden hour
            return Palette(
                skyTop:    Color(red: 140/255, green: 60/255,  blue: 10/255),
                skyBottom: Color(red: 245/255, green: 185/255, blue: 60/255),
                farRange:  Color(red: 110/255, green: 65/255,  blue: 20/255),
                nearPeak:  Color(red: 38/255,  green: 20/255,  blue: 5/255),
                snowCap:   Color(red: 255/255, green: 240/255, blue: 190/255)
            )
        case 5: // Teal morning
            return Palette(
                skyTop:    Color(red: 5/255,   green: 35/255,  blue: 55/255),
                skyBottom: Color(red: 15/255,  green: 90/255,  blue: 110/255),
                farRange:  Color(red: 14/255,  green: 60/255,  blue: 75/255),
                nearPeak:  Color(red: 5/255,   green: 22/255,  blue: 35/255),
                snowCap:   Color(red: 185/255, green: 235/255, blue: 240/255)
            )
        default: // Midnight indigo
            return Palette(
                skyTop:    Color(red: 5/255,   green: 8/255,   blue: 30/255),
                skyBottom: Color(red: 18/255,  green: 28/255,  blue: 70/255),
                farRange:  Color(red: 20/255,  green: 30/255,  blue: 55/255),
                nearPeak:  Color(red: 8/255,   green: 12/255,  blue: 28/255),
                snowCap:   Color(white: 0.82)
            )
        }
    }

    // Peak X offset: varies the main summit position across 5 slots
    private var peakX: Double { 0.38 + Double(mountainId % 5) * 0.055 }

    var body: some View {
        GeometryReader { geo in
            let p = palette
            let w = geo.size.width
            let h = geo.size.height
            let px = w * peakX

            Canvas { ctx, size in
                // Sky
                ctx.fill(
                    Path(CGRect(origin: .zero, size: size)),
                    with: .linearGradient(
                        Gradient(stops: [
                            .init(color: p.skyBottom, location: 0),
                            .init(color: p.skyTop,    location: 1),
                        ]),
                        startPoint: .zero,
                        endPoint: CGPoint(x: 0, y: size.height)
                    )
                )

                // Far range
                var far = Path()
                far.move(to: CGPoint(x: 0, y: size.height))
                far.addLines([
                    CGPoint(x: 0,          y: h * 0.58),
                    CGPoint(x: w * 0.12,   y: h * 0.38),
                    CGPoint(x: w * 0.28,   y: h * 0.50),
                    CGPoint(x: w * 0.46,   y: h * 0.28),
                    CGPoint(x: w * 0.62,   y: h * 0.44),
                    CGPoint(x: w * 0.78,   y: h * 0.32),
                    CGPoint(x: w * 0.90,   y: h * 0.46),
                    CGPoint(x: w,          y: h * 0.38),
                    CGPoint(x: w,          y: h),
                ])
                far.closeSubpath()
                ctx.fill(far, with: .color(p.farRange))

                // Main near peak
                let peakTip = CGPoint(x: px, y: h * 0.18)
                var near = Path()
                near.move(to: CGPoint(x: 0, y: h))
                near.addLines([
                    CGPoint(x: 0,          y: h * 0.78),
                    CGPoint(x: px - w * 0.30, y: h * 0.62),
                    CGPoint(x: px - w * 0.10, y: h * 0.46),
                    peakTip,
                    CGPoint(x: px + w * 0.10, y: h * 0.44),
                    CGPoint(x: px + w * 0.28, y: h * 0.60),
                    CGPoint(x: w,          y: h * 0.72),
                    CGPoint(x: w,          y: h),
                ])
                near.closeSubpath()
                ctx.fill(near, with: .color(p.nearPeak))

                // Snow cap
                var snow = Path()
                snow.move(to: peakTip)
                snow.addLines([
                    CGPoint(x: px - w * 0.10, y: h * 0.46),
                    CGPoint(x: px - w * 0.04, y: h * 0.34),
                    peakTip,
                    CGPoint(x: px + w * 0.04, y: h * 0.33),
                    CGPoint(x: px + w * 0.10, y: h * 0.44),
                    peakTip,
                ])
                snow.closeSubpath()
                ctx.fill(snow, with: .color(p.snowCap.opacity(0.55)))
            }
        }
    }
}
