import SwiftUI

private enum LocalBetaScreen {
    case start
    case measuring
    case result
}

private struct LocalBetaMeasurementResult {
    let bpm: Int?
    let stability: BPMStabilityLabel
    let durationSeconds: TimeInterval
    let guidance: String
}

private struct BPMTheme {
    static let background = Color(red: 0.055, green: 0.066, blue: 0.060)
    static let panel = Color(red: 0.095, green: 0.105, blue: 0.096)
    static let panelSoft = Color(red: 0.130, green: 0.140, blue: 0.125)
    static let gold = Color(red: 0.980, green: 0.810, blue: 0.285)
    static let goldSoft = Color(red: 0.740, green: 0.620, blue: 0.220)
    static let cream = Color(red: 0.925, green: 0.900, blue: 0.800)
    static let muted = Color(red: 0.650, green: 0.640, blue: 0.585)
    static let danger = Color(red: 1.000, green: 0.620, blue: 0.600)
}

struct ContentView: View {
    @StateObject private var monitor = AudioInputMonitor()
    @Environment(\.scenePhase) private var scenePhase

    @State private var screen: LocalBetaScreen = .start
    @State private var activeDurationSeconds: TimeInterval = 35
    @State private var measurementStartedAt: Date?
    @State private var latestResult: LocalBetaMeasurementResult?
    @State private var recentMeasurement: LocalBetaMeasurementResult?
    @State private var isDebugPresented = false

    private let timer = Timer
        .publish(every: 0.25, on: .main, in: .common)
        .autoconnect()

    var body: some View {
        ZStack {
            BPMTheme.background
                .ignoresSafeArea()

            switch screen {
            case .start:
                StartScreenView(
                    recentMeasurement: recentMeasurement,
                    errorMessage: userFacingErrorMessage,
                    onStart: { startMeasurement(duration: 35) },
                    onDebug: { isDebugPresented = true }
                )
            case .measuring:
                MeasuringScreenView(
                    remainingSeconds: remainingSeconds,
                    progress: measurementProgress,
                    graphSamples: monitor.values.graphSamples,
                    inputState: monitor.values.inputLevelState,
                    onCancel: cancelMeasurement,
                    onDebug: { isDebugPresented = true }
                )
            case .result:
                ResultScreenView(
                    result: latestResult,
                    onMeasureAgain: { startMeasurement(duration: 35) },
                    onExtendedMeasure: { startMeasurement(duration: 50) },
                    onDebug: { isDebugPresented = true }
                )
            }
        }
        .preferredColorScheme(.dark)
        .sheet(isPresented: $isDebugPresented) {
            DebugSettingsView(monitor: monitor)
                .presentationDetents([.large])
        }
        .onReceive(timer) { _ in
            handleMeasurementTick()
        }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase != .active {
                cancelMeasurement()
            }
        }
    }

    private var elapsedSeconds: TimeInterval {
        guard let measurementStartedAt else {
            return 0
        }

        return Date().timeIntervalSince(measurementStartedAt)
    }

    private var remainingSeconds: TimeInterval {
        max(activeDurationSeconds - elapsedSeconds, 0)
    }

    private var measurementProgress: Double {
        guard activeDurationSeconds > 0 else {
            return 0
        }

        return min(max(elapsedSeconds / activeDurationSeconds, 0), 1)
    }

    private var userFacingErrorMessage: String? {
        if monitor.values.status == .permissionDenied {
            return "마이크 권한이 필요합니다. iPhone 설정에서 마이크 권한을 허용해 주세요."
        }

        if !monitor.values.errorMessage.isEmpty {
            return monitor.values.errorMessage
        }

        return nil
    }

    private func startMeasurement(duration: TimeInterval) {
        activeDurationSeconds = duration
        measurementStartedAt = Date()
        latestResult = nil
        screen = .measuring
        monitor.start()
    }

    private func cancelMeasurement() {
        guard screen == .measuring || monitor.values.status == .measuring else {
            return
        }

        monitor.cancel()
        measurementStartedAt = nil
        latestResult = nil
        screen = .start
    }

    private func completeMeasurement() {
        monitor.stop()
        let result = makeResult(duration: activeDurationSeconds)
        latestResult = result
        recentMeasurement = result
        measurementStartedAt = nil
        screen = .result
    }

    private func handleMeasurementTick() {
        if monitor.values.status == .permissionDenied || monitor.values.status == .error {
            measurementStartedAt = nil
            screen = .start
            return
        }

        guard screen == .measuring, monitor.values.status == .measuring else {
            return
        }

        if elapsedSeconds >= activeDurationSeconds {
            completeMeasurement()
        }
    }

    private func makeResult(duration: TimeInterval) -> LocalBetaMeasurementResult {
        let displayState = monitor.values.superpoweredCandidateDisplay
        let bpm = displayState.representativeCandidate.map { Int(round($0.bpm)) }
        let guidance: String

        if bpm == nil {
            guidance = "BPM 후보가 충분하지 않습니다. 리듬이 안정된 구간에서 다시 측정해 주세요."
        } else {
            guidance = "현재 측정 구간 기준입니다."
        }

        return LocalBetaMeasurementResult(
            bpm: bpm,
            stability: displayState.stabilityLabel,
            durationSeconds: duration,
            guidance: guidance
        )
    }
}

private struct StartScreenView: View {
    let recentMeasurement: LocalBetaMeasurementResult?
    let errorMessage: String?
    let onStart: () -> Void
    let onDebug: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            TopBarView(title: "BPM", showBack: false, onBack: {}, onDebug: onDebug)

            ScrollView {
                VStack(spacing: 34) {
                    VStack(spacing: 10) {
                        Text("리듬을 찾아보세요")
                            .font(.system(size: 45, weight: .black, design: .rounded))
                            .foregroundStyle(BPMTheme.gold)
                            .multilineTextAlignment(.center)
                            .lineLimit(2)
                            .minimumScaleFactor(0.78)

                        Text("음악을 듣고 BPM 후보를 확인합니다")
                            .font(.headline)
                            .foregroundStyle(BPMTheme.cream.opacity(0.78))
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 66)

                    Button(action: onStart) {
                        ZStack {
                            Circle()
                                .fill(
                                    RadialGradient(
                                        colors: [
                                            BPMTheme.panelSoft,
                                            BPMTheme.panel
                                        ],
                                        center: .center,
                                        startRadius: 20,
                                        endRadius: 170
                                    )
                                )
                                .overlay(
                                    Circle()
                                        .stroke(BPMTheme.cream.opacity(0.18), lineWidth: 2)
                                )
                                .shadow(color: BPMTheme.gold.opacity(0.18), radius: 36)

                            VStack(spacing: 18) {
                                Image(systemName: "waveform")
                                    .font(.system(size: 40, weight: .bold))
                                    .foregroundStyle(BPMTheme.cream)

                                Text("측정 시작")
                                    .font(.system(size: 16, weight: .heavy))
                                    .tracking(3)
                                    .foregroundStyle(BPMTheme.cream)
                            }
                        }
                        .frame(width: 230, height: 230)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("측정 시작")

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(BPMTheme.danger)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 28)
                    }

                    if let recentMeasurement {
                        RecentMeasurementCard(result: recentMeasurement)
                    }
                }
                .padding(.horizontal, 26)
                .padding(.bottom, 36)
            }
        }
    }
}

private struct MeasuringScreenView: View {
    let remainingSeconds: TimeInterval
    let progress: Double
    let graphSamples: [InputGraphSample]
    let inputState: InputLevelState
    let onCancel: () -> Void
    let onDebug: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            TopBarView(title: "BPM", showBack: true, onBack: onCancel, onDebug: onDebug)

            ScrollView {
                VStack(spacing: 20) {
                    Text("분석 중")
                        .font(.system(size: 15, weight: .heavy))
                        .tracking(5)
                        .foregroundStyle(BPMTheme.cream.opacity(0.78))
                        .padding(.top, 18)

                    ZStack {
                        Circle()
                            .stroke(BPMTheme.gold.opacity(0.18), lineWidth: 8)
                            .frame(width: 220, height: 220)

                        Circle()
                            .trim(from: 0, to: progress)
                            .stroke(
                                BPMTheme.gold,
                                style: StrokeStyle(lineWidth: 8, lineCap: .round)
                            )
                            .rotationEffect(.degrees(-90))
                            .frame(width: 220, height: 220)
                            .shadow(color: BPMTheme.gold.opacity(0.65), radius: 14)

                        VStack(spacing: 8) {
                            Text("\(Int(ceil(remainingSeconds)))S")
                                .font(.system(size: 52, weight: .black, design: .rounded))
                                .foregroundStyle(.white)
                                .monospacedDigit()

                            Text("남음")
                                .font(.system(size: 14, weight: .heavy))
                                .tracking(4)
                                .foregroundStyle(BPMTheme.cream)
                        }
                    }

                    Text("BPM 후보")
                        .font(.system(size: 15, weight: .heavy))
                        .tracking(4)
                        .foregroundStyle(BPMTheme.cream)

                    InputStabilityGraphView(
                        samples: graphSamples,
                        stateText: inputState.rawValue
                    )

                    Button(action: onCancel) {
                        VStack(spacing: 10) {
                            ZStack {
                                Circle()
                                    .stroke(BPMTheme.danger.opacity(0.5), lineWidth: 2)
                                    .frame(width: 64, height: 64)

                                Image(systemName: "stop.fill")
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundStyle(BPMTheme.danger)
                            }

                            Text("중지")
                                .font(.system(size: 14, weight: .heavy))
                                .tracking(4)
                                .foregroundStyle(BPMTheme.danger)
                        }
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 2)
                    .accessibilityLabel("측정 취소")
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
        }
    }
}

private struct ResultScreenView: View {
    let result: LocalBetaMeasurementResult?
    let onMeasureAgain: () -> Void
    let onExtendedMeasure: () -> Void
    let onDebug: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            TopBarView(title: "BPM", showBack: false, onBack: {}, onDebug: onDebug)

            ScrollView {
                VStack(spacing: 24) {
                    Text("측정 완료")
                        .font(.system(size: 15, weight: .heavy))
                        .tracking(4)
                        .foregroundStyle(BPMTheme.gold)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 10)
                        .background(Capsule().stroke(BPMTheme.gold.opacity(0.45), lineWidth: 1))
                        .padding(.top, 42)

                    ZStack {
                        Circle()
                            .fill(BPMTheme.panel)
                            .frame(width: 260, height: 260)
                            .overlay(Circle().stroke(BPMTheme.gold.opacity(0.5), lineWidth: 3))
                            .shadow(color: BPMTheme.gold.opacity(0.18), radius: 28)

                        VStack(spacing: 8) {
                            Text(resultBPMText)
                                .font(.system(size: result?.bpm == nil ? 54 : 76, weight: .black, design: .rounded))
                                .foregroundStyle(BPMTheme.gold)
                                .monospacedDigit()

                            Text("BPM 후보")
                                .font(.system(size: 14, weight: .heavy))
                                .tracking(5)
                                .foregroundStyle(BPMTheme.gold)
                        }
                    }

                    VStack(spacing: 8) {
                        Text("대표 BPM 후보")
                            .font(.system(size: 28, weight: .black, design: .rounded))
                            .foregroundStyle(.white)

                        Text(result?.guidance ?? "현재 측정 구간 기준입니다.")
                            .font(.body)
                            .foregroundStyle(BPMTheme.cream.opacity(0.78))
                            .multilineTextAlignment(.center)
                    }

                    HStack(spacing: 16) {
                        ResultMetricCard(
                            icon: "waveform.path.ecg",
                            value: userFacingStabilityText(result?.stability),
                            label: "안정성"
                        )

                        ResultMetricCard(
                            icon: "timer",
                            value: formatDuration(result?.durationSeconds),
                            label: "측정 시간"
                        )
                    }

                    VStack(spacing: 12) {
                        Button(action: onMeasureAgain) {
                            Text("다시 측정")
                                .font(.system(size: 16, weight: .heavy))
                                .tracking(2)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 18)
                        }
                        .buttonStyle(GoldProminentButtonStyle())

                        Button(action: onExtendedMeasure) {
                            HStack {
                                Text("50S")
                                    .font(.system(size: 16, weight: .heavy))
                                    .tracking(2)
                                Text("후보가 흔들리면 50초로 다시 측정")
                                    .font(.footnote)
                                    .foregroundStyle(BPMTheme.cream.opacity(0.74))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                        }
                        .buttonStyle(GoldOutlineButtonStyle())
                    }
                    .padding(.top, 8)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 36)
            }
        }
    }

    private var resultBPMText: String {
        guard let bpm = result?.bpm else {
            return "---"
        }

        return "\(bpm)"
    }

    private func userFacingStabilityText(_ stability: BPMStabilityLabel?) -> String {
        switch stability {
        case .stable:
            return "안정"
        case .variable:
            return "변동 있음"
        case .pending, nil:
            return "다시 측정 권장"
        }
    }
}

private struct DebugSettingsView: View {
    @ObservedObject var monitor: AudioInputMonitor
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    debugSection(title: "Superpowered debug") {
                        debugRow(label: "SDK 상태", value: formatSuperpoweredSDKStatus(monitor.values.superpowered.sdkStatus))
                        debugRow(label: "Superpowered Base", value: formatOptionalFloat(monitor.values.superpowered.bpm))
                        debugRow(label: "무음 감지", value: formatOptionalBool(monitor.values.superpowered.silence))
                        debugRow(label: "마지막 처리", value: formatSuperpoweredLastUpdate(monitor.values.superpowered.lastUpdateText))
                        debugRow(label: "상태 이유", value: formatSuperpoweredReason(monitor.values.superpowered.failureReason))
                        candidateDisplayRow(label: "대표 후보", candidate: monitor.values.superpoweredCandidateDisplay.representativeCandidate)
                        candidateDisplayRow(label: "Half 후보", candidate: monitor.values.superpoweredCandidateDisplay.halfCandidate)
                        candidateDisplayRow(label: "Base 후보", candidate: monitor.values.superpoweredCandidateDisplay.baseCandidate)
                        candidateDisplayRow(label: "Double 후보", candidate: monitor.values.superpoweredCandidateDisplay.doubleCandidate)
                        debugRow(label: "안정성", value: monitor.values.superpoweredCandidateDisplay.stabilityLabel.rawValue)
                        debugRow(label: "실용 분류", value: monitor.values.superpoweredCandidateDisplay.practicalClassification.rawValue)
                        Text(monitor.values.superpoweredCandidateDisplay.guidanceMessage)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(10)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }

                    debugSection(title: "기존 PoC baseline") {
                        debugRow(label: "기존 PoC 후보", value: formatOptionalInt(monitor.values.pocBPMCandidate))
                        debugRow(label: "기존 PoC 신뢰도", value: monitor.values.tempoConfidence?.rawValue ?? "-")
                        debugRow(label: "기존 PoC 이유", value: monitor.values.tempoReason)
                        debugRow(label: "피크 후보 시간 수", value: "\(monitor.values.localPeakTimestampCount)")
                        debugRow(label: "유효 간격 수", value: "\(monitor.values.intervalCount)")
                        debugRow(label: "후보 수", value: "\(monitor.values.candidateCount)")
                    }

                    debugSection(title: "Input debug") {
                        levelBar(value: min(Double(monitor.values.rms) * 12, 1.0))
                        debugRow(label: "입력 상태", value: monitor.values.inputLevelState.rawValue)
                        debugRow(label: "RMS", value: String(format: "%.6f", monitor.values.rms))
                        debugRow(label: "Peak", value: String(format: "%.6f", monitor.values.peak))
                        debugRow(label: "샘플레이트", value: formatHz(monitor.values.sampleRate))
                        debugRow(label: "요청 버퍼", value: "\(monitor.values.bufferSize) 프레임")
                        debugRow(label: "실제 프레임", value: "\(monitor.values.actualFrameLength) 프레임")
                        debugRow(label: "채널 수", value: "\(monitor.values.channelCount)")
                        debugRow(label: "엔진 실행", value: formatBool(monitor.values.engineRunning))
                    }

                    debugSection(title: "Privacy") {
                        Text("오디오 원본은 저장하지 않습니다.")
                        Text("오디오 원본은 서버로 전송하지 않습니다.")
                        Text("Debug 화면에는 숫자형 값만 표시합니다.")
                    }
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                }
                .padding(20)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("설정 / Debug")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("닫기") {
                        dismiss()
                    }
                }
            }
        }
    }
}

private struct TopBarView: View {
    let title: String
    let showBack: Bool
    let onBack: () -> Void
    let onDebug: () -> Void

    var body: some View {
        HStack {
            if showBack {
                Button(action: onBack) {
                    Image(systemName: "chevron.left")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(BPMTheme.cream)
                }
                .accessibilityLabel("뒤로")
            } else {
                Color.clear
                    .frame(width: 32, height: 32)
            }

            Spacer()

            Text(title)
                .font(.system(size: 34, weight: .black, design: .rounded))
                .foregroundStyle(.white)

            Spacer()

            Button(action: onDebug) {
                Image(systemName: "gearshape.fill")
                    .font(.title2.weight(.bold))
                    .foregroundStyle(BPMTheme.gold)
            }
            .accessibilityLabel("설정과 디버그")
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 18)
        .background(BPMTheme.background.opacity(0.96))
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(.white.opacity(0.08))
                .frame(height: 1)
        }
    }
}

private struct RecentMeasurementCard: View {
    let result: LocalBetaMeasurementResult

    var body: some View {
        HStack(spacing: 18) {
            ZStack {
                Circle()
                    .fill(BPMTheme.panelSoft)
                    .frame(width: 58, height: 58)
                    .overlay(Circle().stroke(.white.opacity(0.10), lineWidth: 1))

                Image(systemName: "clock.arrow.circlepath")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(BPMTheme.cream)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("최근 측정")
                    .font(.system(size: 12, weight: .heavy))
                    .tracking(3)
                    .foregroundStyle(BPMTheme.cream.opacity(0.78))

                Text(recentText)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(.white)
            }

            Spacer()
        }
        .padding(22)
        .background(BPMTheme.panel.opacity(0.86))
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(.white.opacity(0.14), lineWidth: 1)
        )
    }

    private var recentText: String {
        guard let bpm = result.bpm else {
            return "BPM 후보 없음"
        }

        return "최근 측정 \(bpm) BPM"
    }
}

private struct InputStabilityGraphView: View {
    let samples: [InputGraphSample]
    let stateText: String

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("입력 안정성")
                    .font(.headline)
                    .foregroundStyle(BPMTheme.cream)

                Spacer()

                Text(stateText)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(BPMTheme.gold)
            }

            Canvas { context, size in
                drawGraph(context: context, size: size)
            }
            .frame(height: 88)
        }
        .padding(16)
        .background(BPMTheme.panel.opacity(0.90))
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(.white.opacity(0.10), lineWidth: 1)
        )
    }

    private func drawGraph(context: GraphicsContext, size: CGSize) {
        var baseline = Path()
        baseline.move(to: CGPoint(x: 0, y: size.height * 0.74))
        baseline.addLine(to: CGPoint(x: size.width, y: size.height * 0.74))
        context.stroke(
            baseline,
            with: .color(.white.opacity(0.10)),
            style: StrokeStyle(lineWidth: 2, dash: [7, 12])
        )

        guard samples.count > 1 else {
            var placeholder = Path()
            placeholder.move(to: CGPoint(x: 0, y: size.height * 0.58))
            placeholder.addCurve(
                to: CGPoint(x: size.width, y: size.height * 0.58),
                control1: CGPoint(x: size.width * 0.32, y: size.height * 0.72),
                control2: CGPoint(x: size.width * 0.68, y: size.height * 0.42)
            )
            context.stroke(placeholder, with: .color(BPMTheme.gold.opacity(0.80)), lineWidth: 4)
            return
        }

        let maxValue = max(samples.map { max($0.envelope, $0.rms) }.max() ?? 0.01, 0.01)
        let firstTimestamp = samples.first?.timestamp ?? 0
        let lastTimestamp = samples.last?.timestamp ?? firstTimestamp
        let timeRange = max(lastTimestamp - firstTimestamp, 0.1)
        var path = Path()

        for (index, sample) in samples.enumerated() {
            let x = CGFloat((sample.timestamp - firstTimestamp) / timeRange) * size.width
            let normalized = CGFloat(max(sample.envelope, sample.rms) / maxValue)
            let y = size.height - min(max(normalized, 0), 1) * (size.height * 0.82) - 8
            let point = CGPoint(x: x, y: y)

            if index == 0 {
                path.move(to: point)
            } else {
                path.addLine(to: point)
            }
        }

        context.stroke(path, with: .color(BPMTheme.gold), lineWidth: 4)
    }
}

private struct ResultMetricCard: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title2.weight(.bold))
                .foregroundStyle(BPMTheme.gold)

            Text(value)
                .font(.title3.weight(.heavy))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.75)

            Text(label)
                .font(.system(size: 12, weight: .heavy))
                .tracking(3)
                .foregroundStyle(BPMTheme.goldSoft)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .background(BPMTheme.panel.opacity(0.90))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(BPMTheme.gold.opacity(0.35), lineWidth: 1)
        )
    }
}

private struct GoldProminentButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(.black)
            .background(
                Capsule()
                    .fill(BPMTheme.gold)
                    .shadow(color: BPMTheme.gold.opacity(configuration.isPressed ? 0.12 : 0.30), radius: 16)
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

private struct GoldOutlineButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(BPMTheme.gold)
            .background(Capsule().fill(BPMTheme.background))
            .overlay(Capsule().stroke(BPMTheme.gold.opacity(0.38), lineWidth: 1))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

@ViewBuilder
private func debugSection<Content: View>(
    title: String,
    @ViewBuilder content: () -> Content
) -> some View {
    VStack(alignment: .leading, spacing: 12) {
        Text(title)
            .font(.headline)

        content()
    }
    .padding()
    .background(Color(.systemBackground))
    .clipShape(RoundedRectangle(cornerRadius: 14))
}

private func levelBar(value: Double) -> some View {
    GeometryReader { geometry in
        ZStack(alignment: .leading) {
            RoundedRectangle(cornerRadius: 8)
                .fill(Color(.systemGray5))

            RoundedRectangle(cornerRadius: 8)
                .fill(BPMTheme.gold)
                .frame(width: geometry.size.width * value)
        }
    }
    .frame(height: 16)
}

private func debugRow(label: String, value: String) -> some View {
    HStack(alignment: .firstTextBaseline) {
        Text(label)
            .foregroundStyle(.secondary)

        Spacer(minLength: 18)

        Text(value)
            .font(.body.monospacedDigit())
            .multilineTextAlignment(.trailing)
    }
    .font(.body)
}

private func candidateDisplayRow(label: String, candidate: BPMDisplayCandidate?) -> some View {
    HStack(alignment: .firstTextBaseline) {
        Text(label)
            .foregroundStyle(.secondary)

        Spacer(minLength: 18)

        if let candidate {
            Text(candidate.displayText)
                .font(.body.monospacedDigit())
                .fontWeight(label.hasPrefix("Base") || label.hasPrefix("대표") ? .semibold : .regular)
                .foregroundStyle(candidate.isInDisplayRange ? .primary : .secondary)
                .multilineTextAlignment(.trailing)
        } else {
            Text("-")
                .font(.body.monospacedDigit())
                .foregroundStyle(.secondary)
        }
    }
    .font(.body)
    .opacity(candidate?.isInDisplayRange == false ? 0.65 : 1)
}

private func formatDuration(_ seconds: TimeInterval?) -> String {
    guard let seconds else {
        return "-"
    }

    return "\(Int(round(seconds)))S"
}

private func formatHz(_ value: Double) -> String {
    guard value > 0 else {
        return "-"
    }

    return "\(Int(value)) Hz"
}

private func formatOptionalInt(_ value: Int?) -> String {
    guard let value else {
        return "-"
    }

    return "\(value)"
}

private func formatOptionalFloat(_ value: Float?) -> String {
    guard let value else {
        return "-"
    }

    return String(format: "%.1f", value)
}

private func formatOptionalBool(_ value: Bool?) -> String {
    guard let value else {
        return "-"
    }

    return formatBool(value)
}

private func formatBool(_ value: Bool) -> String {
    value ? "예" : "아니오"
}

private func formatSuperpoweredSDKStatus(_ status: SuperpoweredSDKStatus) -> String {
    switch status {
    case .notConfigured:
        return "설정 안 됨"
    case .ready:
        return "준비됨"
    case .running:
        return "실행 중"
    case .failed:
        return "실패"
    }
}

private func formatSuperpoweredLastUpdate(_ value: String) -> String {
    if value == "-" {
        return "-"
    }

    if value == "reset" {
        return "초기화됨"
    }

    if value.hasPrefix("configured") {
        return value.replacingOccurrences(of: "configured", with: "설정됨")
    }

    if value.hasPrefix("processed ") {
        return value
            .replacingOccurrences(of: "processed ", with: "처리 ")
            .replacingOccurrences(of: " sec", with: "초")
    }

    return value
}

private func formatSuperpoweredReason(_ reason: String) -> String {
    switch reason {
    case "Superpowered SDK not configured":
        return "Superpowered SDK 설정 안 됨"
    case "Superpowered SDK header not found":
        return "Superpowered SDK 헤더 없음"
    case "Invalid input sample rate":
        return "입력 샘플레이트 오류"
    case "Superpowered license key is not configured":
        return "Superpowered 로컬 키 설정 안 됨"
    case "Audio feed is ready":
        return "마이크 입력 전달 준비됨"
    case "LiveAnalyzer is processing mic buffer":
        return "마이크 입력 처리 중"
    case "Waiting for mic buffer":
        return "마이크 입력 대기 중"
    case "Superpowered reports silence":
        return "무음으로 감지됨"
    case "Waiting for stable BPM":
        return "안정적인 BPM 후보 대기 중"
    case "Superpowered analyzer reset":
        return "Superpowered 분석기 초기화됨"
    default:
        return reason
    }
}

#Preview {
    ContentView()
}
