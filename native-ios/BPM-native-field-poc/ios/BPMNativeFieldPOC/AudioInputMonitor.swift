import AVFoundation
import Foundation

private struct AudioMetrics {
    let rms: Float
    let peak: Float
}

private struct TempoAnalysisResult {
    let candidate: Int?
    let candidates: [TempoCandidate]
    let confidence: TempoConfidence?
    let reason: String
    let localPeakTimestampCount: Int
    let intervalCount: Int
    let candidateCount: Int
    let topCandidateSupport: Int
    let intervalDebug: TempoIntervalDebug
}

@MainActor
final class AudioInputMonitor: ObservableObject {
    @Published private(set) var values = AudioDebugValues()

    private let engine = AVAudioEngine()
    private nonisolated let superpoweredBridge = SuperpoweredBridgeAdapter()
    private let tapBus: AVAudioNodeBus = 0
    private let requestedBufferSize: AVAudioFrameCount = 1024
    private let graphWindowSeconds: TimeInterval = 10
    private let uiUpdateInterval: TimeInterval = 0.1
    private let smoothingSampleCount = 4
    private let maxGraphSampleCount = 300
    private let localPeakThreshold: Float = 0.008
    private let minPeakSpacingSeconds: TimeInterval = 0.18
    private let minimumLocalPeakCount = 4
    private let minimumIntervalCount = 3
    private let bpmRangeMin = 40
    private let bpmRangeMax = 220
    private let candidateDisplayRangeMin = 40.0
    private let candidateDisplayRangeMax = 260.0
    private let stabilityToleranceBPM = 5.0
    private let stabilitySnapshotCount = 3
    private let recommendedAnalysisSeconds: TimeInterval = 35
    private var hasInputTap = false
    private var graphSamples: [InputGraphSample] = []
    private var superpoweredResultSnapshots: [SuperpoweredResultSnapshot] = []
    private var previousRMS: Float?
    private var lastLocalPeakTimestamp: TimeInterval?
    private var lastUIUpdateTimestamp: TimeInterval = 0
    private var currentMeasurementID: Int = 0
    private var measurementStartedAt: Date?
    private var latestMeasurementElapsedSeconds: TimeInterval = 0

    func start() {
        if engine.isRunning || hasInputTap {
            stop()
        }

        currentMeasurementID += 1
        resetAnalysisState()
        values.status = .requestingPermission
        values.measurementID = currentMeasurementID
        values.errorMessage = ""
        values.graphWindowSeconds = graphWindowSeconds
        values.uiUpdateInterval = uiUpdateInterval
        values.localPeakThreshold = localPeakThreshold
        values.bpmRangeMin = bpmRangeMin
        values.bpmRangeMax = bpmRangeMax

        Task {
            let granted = await requestMicrophonePermission()
            guard granted else {
                values.status = .permissionDenied
                values.inputLevelState = .stopped
                return
            }

            do {
                try configureSession()
                try startEngine()
            } catch {
                stop()
                values.status = .error
                values.errorMessage = error.localizedDescription
            }
        }
    }

    func stop() {
        latestMeasurementElapsedSeconds = currentMeasurementElapsedSeconds()
        let snapshot = createTempoSnapshot()
        let superpoweredSnapshot = superpoweredBridge.snapshot()
        appendSuperpoweredResultSnapshot(from: superpoweredSnapshot)

        if hasInputTap {
            engine.inputNode.removeTap(onBus: tapBus)
            hasInputTap = false
        }

        if engine.isRunning {
            engine.stop()
        }

        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)

        values.status = .stopped
        values.inputLevelState = .stopped
        values.engineRunning = false
        values.rms = 0
        values.peak = 0
        values.energyDelta = 0
        values.smoothedEnvelope = 0
        values.pocBPMCandidate = nil
        values.bpmCandidates = []
        values.tempoConfidence = nil
        values.tempoReason = "계산 전"
        values.localPeakTimestampCount = 0
        values.intervalCount = 0
        values.candidateCount = 0
        values.topCandidateSupport = 0
        values.intervalDebug = TempoIntervalDebug()
        values.latestSnapshot = snapshot
        values.superpowered = superpoweredBridge.reset()
        values.superpoweredResultSnapshots = superpoweredResultSnapshots
        values.superpoweredCandidateDisplay = makeSuperpoweredCandidateDisplay(
            displaySnapshot: superpoweredResultSnapshots.last
        )
        measurementStartedAt = nil
    }

    func cancel() {
        if hasInputTap {
            engine.inputNode.removeTap(onBus: tapBus)
            hasInputTap = false
        }

        if engine.isRunning {
            engine.stop()
        }

        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)

        _ = superpoweredBridge.reset()
        resetAnalysisState()
        values.status = .idle
        values.inputLevelState = .stopped
        values.engineRunning = false
        values.rms = 0
        values.peak = 0
        values.actualFrameLength = 0
        values.errorMessage = ""
        measurementStartedAt = nil
    }

    func resetSuperpoweredCandidateHistory() {
        superpoweredResultSnapshots = []
        values.superpoweredResultSnapshots = []
        values.superpoweredCandidateDisplay = makeSuperpoweredCandidateDisplay(
            displaySnapshot: currentSuperpoweredDisplaySnapshot()
        )
    }

    private func requestMicrophonePermission() async -> Bool {
        return await withCheckedContinuation { continuation in
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
    }

    private func configureSession() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.record, mode: .measurement, options: [])
        try session.setPreferredSampleRate(48_000)
        try session.setPreferredIOBufferDuration(0.02)
        try session.setActive(true)
    }

    private func startEngine() throws {
        let inputNode = engine.inputNode
        let inputFormat = inputNode.inputFormat(forBus: tapBus)

        values.sampleRate = inputFormat.sampleRate
        values.channelCount = inputFormat.channelCount
        values.bufferSize = requestedBufferSize
        values.graphWindowSeconds = graphWindowSeconds
        values.uiUpdateInterval = uiUpdateInterval
        values.localPeakThreshold = localPeakThreshold
        values.bpmRangeMin = bpmRangeMin
        values.bpmRangeMax = bpmRangeMax
        values.superpowered = superpoweredBridge.configure(sampleRate: inputFormat.sampleRate)

        inputNode.installTap(
            onBus: tapBus,
            bufferSize: requestedBufferSize,
            format: inputFormat
        ) { [weak self] buffer, _ in
            self?.superpoweredBridge.process(buffer)
            let metrics = AudioInputMonitor.calculateMetrics(from: buffer)
            let frameLength = buffer.frameLength

            Task { @MainActor [weak self] in
                self?.apply(metrics: metrics, frameLength: frameLength)
            }
        }
        hasInputTap = true

        engine.prepare()
        try engine.start()
        measurementStartedAt = Date()
        latestMeasurementElapsedSeconds = 0

        values.status = .measuring
        values.engineRunning = engine.isRunning
        values.inputLevelState = .tooQuiet
    }

    private func apply(metrics: AudioMetrics, frameLength: AVAudioFrameCount) {
        let timestamp = Date().timeIntervalSinceReferenceDate
        let energyDelta = calculateEnergyDelta(currentRMS: metrics.rms)
        let envelope = calculateSmoothedEnvelope(with: energyDelta)
        let isLocalPeak = detectLocalPeak(envelope: envelope, timestamp: timestamp)
        let sample = InputGraphSample(
            timestamp: timestamp,
            rms: metrics.rms,
            peak: metrics.peak,
            energyDelta: energyDelta,
            envelope: envelope,
            isLocalPeak: isLocalPeak
        )

        append(sample: sample, timestamp: timestamp)

        guard timestamp - lastUIUpdateTimestamp >= uiUpdateInterval else {
            return
        }

        lastUIUpdateTimestamp = timestamp
        let inputLevelState = classifyInput(rms: metrics.rms, peak: metrics.peak)
        let tempoAnalysis = calculateTempoCandidate(inputState: inputLevelState)
        latestMeasurementElapsedSeconds = currentMeasurementElapsedSeconds()

        values.rms = metrics.rms
        values.peak = metrics.peak
        values.energyDelta = energyDelta
        values.smoothedEnvelope = envelope
        values.actualFrameLength = frameLength
        values.engineRunning = engine.isRunning
        values.inputLevelState = inputLevelState
        values.graphSamples = graphSamples
        values.graphSampleCount = graphSamples.count
        values.localPeakCount = graphSamples.filter { $0.isLocalPeak }.count
        values.lastLocalPeakAge = lastLocalPeakTimestamp.map { timestamp - $0 }
        values.pocBPMCandidate = tempoAnalysis.candidate
        values.bpmCandidates = tempoAnalysis.candidates
        values.tempoConfidence = tempoAnalysis.confidence
        values.tempoReason = tempoAnalysis.reason
        values.localPeakTimestampCount = tempoAnalysis.localPeakTimestampCount
        values.intervalCount = tempoAnalysis.intervalCount
        values.candidateCount = tempoAnalysis.candidateCount
        values.topCandidateSupport = tempoAnalysis.topCandidateSupport
        values.intervalDebug = tempoAnalysis.intervalDebug
        let superpoweredValues = superpoweredBridge.snapshot()
        values.superpowered = superpoweredValues
        values.superpoweredResultSnapshots = superpoweredResultSnapshots
        values.superpoweredCandidateDisplay = makeSuperpoweredCandidateDisplay(
            displaySnapshot: currentSuperpoweredDisplaySnapshot(from: superpoweredValues)
        )
    }

    private func resetAnalysisState() {
        graphSamples = []
        previousRMS = nil
        lastLocalPeakTimestamp = nil
        lastUIUpdateTimestamp = 0
        values.graphSamples = []
        values.graphSampleCount = 0
        values.localPeakCount = 0
        values.lastLocalPeakAge = nil
        values.energyDelta = 0
        values.smoothedEnvelope = 0
        values.pocBPMCandidate = nil
        values.bpmCandidates = []
        values.tempoConfidence = nil
        values.tempoReason = "계산 전"
        values.localPeakTimestampCount = 0
        values.intervalCount = 0
        values.candidateCount = 0
        values.topCandidateSupport = 0
        values.bpmRangeMin = bpmRangeMin
        values.bpmRangeMax = bpmRangeMax
        values.intervalDebug = TempoIntervalDebug()
        values.latestSnapshot = nil
        values.superpowered = superpoweredBridge.reset()
        measurementStartedAt = nil
        latestMeasurementElapsedSeconds = 0
        values.superpoweredCandidateDisplay = makeSuperpoweredCandidateDisplay(
            displaySnapshot: superpoweredResultSnapshots.last
        )
        values.superpoweredResultSnapshots = superpoweredResultSnapshots
    }

    private func appendSuperpoweredResultSnapshot(from debugValues: SuperpoweredDebugValues) {
        guard values.status == .measuring else {
            return
        }

        let snapshot = SuperpoweredResultSnapshot(
            id: currentMeasurementID,
            createdAt: Date(),
            baseBPM: debugValues.bpm.map(Double.init),
            silence: debugValues.silence,
            reason: debugValues.failureReason
        )
        superpoweredResultSnapshots.append(snapshot)

        if superpoweredResultSnapshots.count > stabilitySnapshotCount {
            superpoweredResultSnapshots.removeFirst(superpoweredResultSnapshots.count - stabilitySnapshotCount)
        }
    }

    private func currentSuperpoweredDisplaySnapshot(
        from debugValues: SuperpoweredDebugValues? = nil
    ) -> SuperpoweredResultSnapshot? {
        let currentValues = debugValues ?? values.superpowered
        let hasLiveState = currentValues.bpm != nil || currentValues.silence != nil

        guard hasLiveState else {
            return superpoweredResultSnapshots.last
        }

        return SuperpoweredResultSnapshot(
            id: currentMeasurementID,
            createdAt: Date(),
            baseBPM: currentValues.bpm.map(Double.init),
            silence: currentValues.silence,
            reason: currentValues.failureReason
        )
    }

    private func makeSuperpoweredCandidateDisplay(
        displaySnapshot: SuperpoweredResultSnapshot?
    ) -> BPMCandidateDisplayState {
        let elapsedSeconds = currentMeasurementElapsedSeconds()
        let meetsRecommendedDuration = elapsedSeconds >= recommendedAnalysisSeconds

        guard displaySnapshot?.silence != true else {
            return BPMCandidateDisplayState(
                representativeCandidate: nil,
                halfCandidate: nil,
                baseCandidate: nil,
                doubleCandidate: nil,
                stabilityLabel: .pending,
                practicalClassification: .pending,
                accuracyText: "판단 보류",
                candidateReasonText: "무음 / 입력 부족",
                guidanceMessage: "입력이 부족하거나 조용한 상태입니다. BPM 후보를 표시하지 않습니다.",
                measurementElapsedSeconds: elapsedSeconds,
                meetsRecommendedMeasurementDuration: meetsRecommendedDuration,
                recommendsExtendedMeasurement: false,
                snapshotCount: superpoweredResultSnapshots.count
            )
        }

        guard let baseBPM = displaySnapshot?.baseBPM, baseBPM > 0 else {
            return BPMCandidateDisplayState(
                representativeCandidate: nil,
                halfCandidate: nil,
                baseCandidate: nil,
                doubleCandidate: nil,
                stabilityLabel: .pending,
                practicalClassification: .pending,
                accuracyText: "판단 보류",
                candidateReasonText: "BPM 후보 없음",
                guidanceMessage: "BPM 후보가 아직 충분하지 않습니다. 최소 20초 이상, 권장 35초 기준으로 다시 확인하세요.",
                measurementElapsedSeconds: elapsedSeconds,
                meetsRecommendedMeasurementDuration: meetsRecommendedDuration,
                recommendsExtendedMeasurement: false,
                snapshotCount: superpoweredResultSnapshots.count
            )
        }

        let half = makeDisplayCandidate(label: "Half 후보", bpm: baseBPM / 2)
        let base = makeDisplayCandidate(label: "Base 후보", bpm: baseBPM)
        let double = makeDisplayCandidate(label: "Double 후보", bpm: baseBPM * 2)
        let stability = calculateSuperpoweredStabilityLabel()
        let doubleBPM = baseBPM * 2
        let hasDoubleCandidatePossibility = hasHalfTimeCandidatePossibility(
            baseBPM: baseBPM,
            doubleBPM: doubleBPM
        )
        let practicalClassification: BPMPracticalClassification

        if hasDoubleCandidatePossibility {
            practicalClassification = .halfDoubleReviewNeeded
        } else if stability == .stable {
            practicalClassification = .repeatedStableCandidate
        } else if stability == .variable {
            practicalClassification = .variableCandidate
        } else {
            practicalClassification = .pending
        }
        let recommendsExtendedMeasurement = hasDoubleCandidatePossibility || stability == .variable

        return BPMCandidateDisplayState(
            representativeCandidate: base,
            halfCandidate: half,
            baseCandidate: base,
            doubleCandidate: double,
            stabilityLabel: stability,
            practicalClassification: practicalClassification,
            accuracyText: "판단 보류",
            candidateReasonText: "BPM 후보 표시",
            guidanceMessage: makeSuperpoweredGuidanceMessage(
                stability: stability,
                hasDoubleCandidatePossibility: hasDoubleCandidatePossibility
            ),
            measurementElapsedSeconds: elapsedSeconds,
            meetsRecommendedMeasurementDuration: meetsRecommendedDuration,
            recommendsExtendedMeasurement: recommendsExtendedMeasurement,
            snapshotCount: superpoweredResultSnapshots.count
        )
    }

    private func currentMeasurementElapsedSeconds() -> TimeInterval {
        guard values.status == .measuring, let measurementStartedAt else {
            return latestMeasurementElapsedSeconds
        }

        return Date().timeIntervalSince(measurementStartedAt)
    }

    private func makeDisplayCandidate(label: String, bpm: Double) -> BPMDisplayCandidate {
        BPMDisplayCandidate(
            label: label,
            bpm: bpm,
            isInDisplayRange: bpm >= candidateDisplayRangeMin && bpm <= candidateDisplayRangeMax
        )
    }

    private func hasHalfTimeCandidatePossibility(baseBPM: Double, doubleBPM: Double) -> Bool {
        let lowTempoHalfTime = baseBPM >= 55
            && baseBPM <= 65
            && doubleBPM >= 110
            && doubleBPM <= 130
        let highTempoHalfTime = baseBPM >= 100
            && baseBPM <= 110
            && doubleBPM >= 200
            && doubleBPM <= 220

        return lowTempoHalfTime || highTempoHalfTime
    }

    private func calculateSuperpoweredStabilityLabel() -> BPMStabilityLabel {
        let bpmSnapshots = superpoweredResultSnapshots
            .compactMap { snapshot -> Double? in
                guard snapshot.silence != true else {
                    return nil
                }

                return snapshot.baseBPM
            }

        guard bpmSnapshots.count >= stabilitySnapshotCount else {
            return .pending
        }

        let recentBPMs = Array(bpmSnapshots.suffix(stabilitySnapshotCount))

        for firstIndex in recentBPMs.indices {
            for secondIndex in recentBPMs.indices where secondIndex > firstIndex {
                if abs(recentBPMs[firstIndex] - recentBPMs[secondIndex]) <= stabilityToleranceBPM {
                    return .stable
                }
            }
        }

        return .variable
    }

    private func makeSuperpoweredGuidanceMessage(
        stability: BPMStabilityLabel,
        hasDoubleCandidatePossibility: Bool
    ) -> String {
        if hasDoubleCandidatePossibility {
            return "Base 후보가 절반 BPM으로 감지되었을 수 있습니다. Double 후보가 실제 체감 BPM일 수 있습니다."
        }

        switch stability {
        case .stable:
            return "같은 조건에서 후보가 반복되어 실용 후보 가능성이 있습니다. 정확도는 알려진 BPM 기준 검증 전까지 판단 보류입니다."
        case .variable:
            return "후보가 흔들립니다. 측정 구간에 따라 후보가 달라질 수 있으므로 PM QA에서 구간 영향 가능성을 기록해 주세요. 리듬이 안정된 구간에서 35초 기준으로 다시 측정하세요."
        case .pending:
            return "곡 전체의 고정 BPM이 아니라 현재 측정 구간의 BPM 후보입니다. 정확도는 판단 보류입니다."
        }
    }

    private func calculateEnergyDelta(currentRMS: Float) -> Float {
        defer {
            previousRMS = currentRMS
        }

        guard let previousRMS else {
            return 0
        }

        return max(0, currentRMS - previousRMS)
    }

    private func calculateSmoothedEnvelope(with energyDelta: Float) -> Float {
        let previousDeltas = graphSamples
            .suffix(max(smoothingSampleCount - 1, 0))
            .map(\.energyDelta)
        let deltas = previousDeltas + [energyDelta]
        let total = deltas.reduce(Float(0), +)

        return total / Float(max(deltas.count, 1))
    }

    private func detectLocalPeak(envelope: Float, timestamp: TimeInterval) -> Bool {
        let recentEnvelopeMax = graphSamples
            .suffix(3)
            .map(\.envelope)
            .max() ?? 0
        let hasEnoughSpacing = lastLocalPeakTimestamp
            .map { timestamp - $0 >= minPeakSpacingSeconds } ?? true
        let isPeak = envelope >= localPeakThreshold
            && envelope >= recentEnvelopeMax * 1.15
            && hasEnoughSpacing

        if isPeak {
            lastLocalPeakTimestamp = timestamp
        }

        return isPeak
    }

    private func append(sample: InputGraphSample, timestamp: TimeInterval) {
        graphSamples.append(sample)

        graphSamples.removeAll { sample in
            timestamp - sample.timestamp > graphWindowSeconds
        }

        if graphSamples.count > maxGraphSampleCount {
            graphSamples.removeFirst(graphSamples.count - maxGraphSampleCount)
        }
    }

    private func classifyInput(rms: Float, peak: Float) -> InputLevelState {
        if peak >= 0.95 {
            return .tooLoud
        }

        if rms < 0.008 && peak < 0.04 {
            return .tooQuiet
        }

        return .good
    }

    private func calculateTempoCandidate(inputState: InputLevelState) -> TempoAnalysisResult {
        let localPeakTimestamps = graphSamples
            .filter(\.isLocalPeak)
            .map(\.timestamp)
        let intervalAnalysis = analyzeIntervals(from: localPeakTimestamps)

        guard inputState == .good else {
            let reason = inputState == .tooLoud ? "입력 과다" : "입력 부족"

            return TempoAnalysisResult(
                candidate: nil,
                candidates: [],
                confidence: nil,
                reason: reason,
                localPeakTimestampCount: localPeakTimestamps.count,
                intervalCount: intervalAnalysis.validIntervals.count,
                candidateCount: 0,
                topCandidateSupport: 0,
                intervalDebug: intervalAnalysis.debug
            )
        }

        guard localPeakTimestamps.count >= minimumLocalPeakCount else {
            return TempoAnalysisResult(
                candidate: nil,
                candidates: [],
                confidence: nil,
                reason: "local peak 부족",
                localPeakTimestampCount: localPeakTimestamps.count,
                intervalCount: intervalAnalysis.validIntervals.count,
                candidateCount: 0,
                topCandidateSupport: 0,
                intervalDebug: intervalAnalysis.debug
            )
        }

        let intervals = intervalAnalysis.validIntervals

        guard intervals.count >= minimumIntervalCount else {
            return TempoAnalysisResult(
                candidate: nil,
                candidates: [],
                confidence: nil,
                reason: "interval 부족",
                localPeakTimestampCount: localPeakTimestamps.count,
                intervalCount: intervals.count,
                candidateCount: 0,
                topCandidateSupport: 0,
                intervalDebug: intervalAnalysis.debug
            )
        }

        var bucketIntervals: [Int: [TimeInterval]] = [:]
        for interval in intervals {
            let bpm = 60.0 / interval
            guard bpm >= Double(bpmRangeMin), bpm <= Double(bpmRangeMax) else {
                continue
            }
            bucketIntervals[Int(round(bpm)), default: []].append(interval)
        }

        let candidateValueCount = bucketIntervals.values.reduce(0) { total, intervals in
            total + intervals.count
        }

        guard candidateValueCount > 0 else {
            return TempoAnalysisResult(
                candidate: nil,
                candidates: [],
                confidence: nil,
                reason: "BPM 후보 부족",
                localPeakTimestampCount: localPeakTimestamps.count,
                intervalCount: intervals.count,
                candidateCount: 0,
                topCandidateSupport: 0,
                intervalDebug: intervalAnalysis.debug
            )
        }

        let averageBPM = bucketIntervals.flatMap { bpm, intervals in
            intervals.map { _ in Double(bpm) }
        }.reduce(0, +) / Double(candidateValueCount)
        let rankedCandidates = bucketIntervals
            .map { bpm, intervals in
                let representativeInterval = intervals.reduce(0, +) / Double(intervals.count)
                return TempoCandidate(
                    bpm: bpm,
                    support: intervals.count,
                    representativeIntervalMS: Int(round(representativeInterval * 1_000)),
                    confidence: calculateCandidateConfidence(
                        support: intervals.count,
                        totalCandidateValues: candidateValueCount
                    ),
                    reason: "\(intervals.count)개 interval 지지"
                )
            }
            .sorted { first, second in
                if first.support != second.support {
                    return first.support > second.support
                }

                let firstDistance = abs(Double(first.bpm) - averageBPM)
                let secondDistance = abs(Double(second.bpm) - averageBPM)
                if firstDistance != secondDistance {
                    return firstDistance < secondDistance
                }

                return first.bpm < second.bpm
            }

        guard let topCandidate = rankedCandidates.first else {
            return TempoAnalysisResult(
                candidate: nil,
                candidates: [],
                confidence: nil,
                reason: "BPM 후보 부족",
                localPeakTimestampCount: localPeakTimestamps.count,
                intervalCount: intervals.count,
                candidateCount: 0,
                topCandidateSupport: 0,
                intervalDebug: intervalAnalysis.debug
            )
        }

        let supportRatio = Double(topCandidate.support) / Double(candidateValueCount)
        let confidence = calculateConfidence(
            intervalCount: intervals.count,
            topSupport: topCandidate.support,
            supportRatio: supportRatio
        )

        return TempoAnalysisResult(
            candidate: topCandidate.bpm,
            candidates: Array(rankedCandidates.prefix(5)),
            confidence: confidence,
            reason: "PoC BPM 후보가 생성되었습니다.",
            localPeakTimestampCount: localPeakTimestamps.count,
            intervalCount: intervals.count,
            candidateCount: rankedCandidates.count,
            topCandidateSupport: topCandidate.support,
            intervalDebug: intervalAnalysis.debug
        )
    }

    private func createTempoSnapshot() -> TempoSnapshot? {
        guard values.status == .measuring || !graphSamples.isEmpty else {
            return nil
        }

        let analysis = calculateTempoCandidate(inputState: values.inputLevelState)
        return TempoSnapshot(
            id: currentMeasurementID,
            createdAt: Date(),
            topCandidate: analysis.candidate,
            candidates: analysis.candidates,
            confidence: analysis.confidence,
            reason: analysis.reason,
            localPeakTimestampCount: analysis.localPeakTimestampCount,
            intervalCount: analysis.intervalCount,
            candidateCount: analysis.candidateCount,
            topCandidateSupport: analysis.topCandidateSupport,
            intervalDebug: analysis.intervalDebug
        )
    }

    private func analyzeIntervals(from localPeakTimestamps: [TimeInterval]) -> (
        validIntervals: [TimeInterval],
        debug: TempoIntervalDebug
    ) {
        let allIntervals = zip(localPeakTimestamps, localPeakTimestamps.dropFirst())
            .map { earlier, later in later - earlier }
        let minimumIntervalSeconds = 60.0 / Double(bpmRangeMax)
        let maximumIntervalSeconds = 60.0 / Double(bpmRangeMin)
        let validIntervals = allIntervals.filter { interval in
            interval >= minimumIntervalSeconds && interval <= maximumIntervalSeconds
        }
        let tooShortIntervalCount = allIntervals.filter { $0 < minimumIntervalSeconds }.count
        let tooLongIntervalCount = allIntervals.filter { $0 > maximumIntervalSeconds }.count
        let recentIntervals = allIntervals.suffix(10)
        let intervalDerivedBPMs = recentIntervals.map { interval in
            interval > 0 ? Int(round(60.0 / interval)) : 0
        }
        let debug = TempoIntervalDebug(
            recentIntervalsMS: recentIntervals.map { Int(round($0 * 1_000)) },
            intervalDerivedBPMs: intervalDerivedBPMs,
            tooShortIntervalCount: tooShortIntervalCount,
            tooLongIntervalCount: tooLongIntervalCount,
            excludedIntervalCount: tooShortIntervalCount + tooLongIntervalCount
        )

        return (validIntervals, debug)
    }

    private func calculateConfidence(
        intervalCount: Int,
        topSupport: Int,
        supportRatio: Double
    ) -> TempoConfidence {
        if intervalCount >= 5 && topSupport >= 4 && supportRatio >= 0.6 {
            return .high
        }

        if intervalCount >= 3 && topSupport >= 2 && supportRatio >= 0.4 {
            return .medium
        }

        return .low
    }

    private func calculateCandidateConfidence(
        support: Int,
        totalCandidateValues: Int
    ) -> TempoConfidence {
        let supportRatio = Double(support) / Double(max(totalCandidateValues, 1))

        if support >= 4 && supportRatio >= 0.6 {
            return .high
        }

        if support >= 2 && supportRatio >= 0.4 {
            return .medium
        }

        return .low
    }

    nonisolated private static func calculateMetrics(from buffer: AVAudioPCMBuffer) -> AudioMetrics {
        guard let channelData = buffer.floatChannelData else {
            return AudioMetrics(rms: 0, peak: 0)
        }

        let frameLength = Int(buffer.frameLength)
        let channelCount = Int(buffer.format.channelCount)

        guard frameLength > 0, channelCount > 0 else {
            return AudioMetrics(rms: 0, peak: 0)
        }

        var sumSquares: Float = 0
        var peak: Float = 0
        var sampleCount = 0

        for channel in 0..<channelCount {
            let samples = channelData[channel]

            for frame in 0..<frameLength {
                let sample = samples[frame]
                let absoluteValue = abs(sample)
                sumSquares += sample * sample
                peak = max(peak, absoluteValue)
                sampleCount += 1
            }
        }

        let meanSquare = sumSquares / Float(max(sampleCount, 1))
        return AudioMetrics(rms: sqrt(meanSquare), peak: peak)
    }
}
