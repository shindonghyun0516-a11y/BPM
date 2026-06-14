import Foundation

enum AudioMonitorStatus: String {
    case idle = "대기"
    case requestingPermission = "마이크 권한 요청 중"
    case measuring = "측정 중"
    case stopped = "중지됨"
    case permissionDenied = "마이크 권한 거부"
    case error = "오류"
}

enum InputLevelState: String {
    case stopped = "중지됨"
    case tooQuiet = "너무 작음"
    case good = "적정"
    case tooLoud = "과입력"
}

enum TempoConfidence: String {
    case low = "낮음"
    case medium = "보통"
    case high = "높음"
}

enum SuperpoweredSDKStatus: String {
    case notConfigured = "not configured"
    case ready = "ready"
    case running = "running"
    case failed = "failed"
}

enum SuperpoweredComparisonJudgment: String {
    case improved = "개선"
    case same = "동일"
    case worse = "악화"
    case unknown = "판단 불가"
}

enum BPMStabilityLabel: String {
    case stable = "안정"
    case variable = "변동 있음"
    case pending = "판단 보류"
}

enum BPMPracticalClassification: String {
    case practicalPossible = "실용 후보 가능성"
    case repeatedStableCandidate = "반복 안정 후보"
    case halfDoubleReviewNeeded = "절반/2배 후보 확인 필요"
    case variableCandidate = "변동 있음"
    case pending = "판단 보류"
}

struct AudioDebugValues {
    var status: AudioMonitorStatus = .idle
    var inputLevelState: InputLevelState = .stopped
    var measurementID: Int = 0
    var rms: Float = 0
    var peak: Float = 0
    var energyDelta: Float = 0
    var smoothedEnvelope: Float = 0
    var sampleRate: Double = 0
    var bufferSize: UInt32 = 0
    var actualFrameLength: UInt32 = 0
    var channelCount: UInt32 = 0
    var engineRunning: Bool = false
    var errorMessage: String = ""
    var graphSamples: [InputGraphSample] = []
    var graphSampleCount: Int = 0
    var localPeakCount: Int = 0
    var lastLocalPeakAge: TimeInterval?
    var graphWindowSeconds: TimeInterval = 10
    var uiUpdateInterval: TimeInterval = 0.1
    var localPeakThreshold: Float = 0
    var pocBPMCandidate: Int?
    var bpmCandidates: [TempoCandidate] = []
    var tempoConfidence: TempoConfidence?
    var tempoReason: String = "계산 전"
    var localPeakTimestampCount: Int = 0
    var intervalCount: Int = 0
    var candidateCount: Int = 0
    var topCandidateSupport: Int = 0
    var bpmRangeMin: Int = 40
    var bpmRangeMax: Int = 220
    var intervalDebug = TempoIntervalDebug()
    var latestSnapshot: TempoSnapshot?
    var superpowered = SuperpoweredDebugValues.notConfigured()
    var superpoweredCandidateDisplay = BPMCandidateDisplayState.empty()
    var superpoweredResultSnapshots: [SuperpoweredResultSnapshot] = []
}

struct InputGraphSample: Equatable {
    let timestamp: TimeInterval
    let rms: Float
    let peak: Float
    let energyDelta: Float
    let envelope: Float
    let isLocalPeak: Bool
}

struct TempoCandidate: Equatable {
    let bpm: Int
    let support: Int
    let representativeIntervalMS: Int
    let confidence: TempoConfidence
    let reason: String
}

struct TempoIntervalDebug: Equatable {
    var recentIntervalsMS: [Int] = []
    var intervalDerivedBPMs: [Int] = []
    var tooShortIntervalCount: Int = 0
    var tooLongIntervalCount: Int = 0
    var excludedIntervalCount: Int = 0
}

struct TempoSnapshot: Equatable {
    let id: Int
    let createdAt: Date
    let topCandidate: Int?
    let candidates: [TempoCandidate]
    let confidence: TempoConfidence?
    let reason: String
    let localPeakTimestampCount: Int
    let intervalCount: Int
    let candidateCount: Int
    let topCandidateSupport: Int
    let intervalDebug: TempoIntervalDebug
}

struct SuperpoweredDebugValues: Equatable {
    var sdkStatus: SuperpoweredSDKStatus
    var bpm: Float?
    var silence: Bool?
    var confidenceText: String
    var lastUpdateText: String
    var failureReason: String
    var judgment: SuperpoweredComparisonJudgment
    var isExperimentalOnly: Bool

    static func notConfigured() -> SuperpoweredDebugValues {
        SuperpoweredDebugValues(
            sdkStatus: .notConfigured,
            bpm: nil,
            silence: nil,
            confidenceText: "제공 없음",
            lastUpdateText: "-",
            failureReason: "Superpowered SDK not configured",
            judgment: .unknown,
            isExperimentalOnly: true
        )
    }
}

struct BPMDisplayCandidate: Equatable {
    let label: String
    let bpm: Double
    let isInDisplayRange: Bool

    var displayText: String {
        let bpmText = String(format: "%.1f BPM", bpm)
        return isInDisplayRange ? bpmText : "\(bpmText) - 범위 밖"
    }
}

struct BPMCandidateDisplayState: Equatable {
    let representativeCandidate: BPMDisplayCandidate?
    let halfCandidate: BPMDisplayCandidate?
    let baseCandidate: BPMDisplayCandidate?
    let doubleCandidate: BPMDisplayCandidate?
    let stabilityLabel: BPMStabilityLabel
    let practicalClassification: BPMPracticalClassification
    let accuracyText: String
    let candidateReasonText: String
    let guidanceMessage: String
    let measurementElapsedSeconds: TimeInterval
    let meetsRecommendedMeasurementDuration: Bool
    let recommendsExtendedMeasurement: Bool
    let snapshotCount: Int

    static func empty() -> BPMCandidateDisplayState {
        BPMCandidateDisplayState(
            representativeCandidate: nil,
            halfCandidate: nil,
            baseCandidate: nil,
            doubleCandidate: nil,
            stabilityLabel: .pending,
            practicalClassification: .pending,
            accuracyText: "판단 보류",
            candidateReasonText: "BPM 후보 없음",
            guidanceMessage: "BPM 후보가 아직 충분하지 않습니다.",
            measurementElapsedSeconds: 0,
            meetsRecommendedMeasurementDuration: false,
            recommendsExtendedMeasurement: false,
            snapshotCount: 0
        )
    }
}

struct SuperpoweredResultSnapshot: Equatable {
    let id: Int
    let createdAt: Date
    let baseBPM: Double?
    let silence: Bool?
    let reason: String
}
