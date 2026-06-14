import Foundation
import AVFoundation

struct SuperpoweredBridgeAdapter: @unchecked Sendable {
    private let bridge = SuperpoweredLiveAnalyzerBridge()

    func configure(sampleRate: Double) -> SuperpoweredDebugValues {
        bridge.configure(withSampleRate: sampleRate)
        return makeDebugValues(from: bridge.snapshot())
    }

    func snapshot() -> SuperpoweredDebugValues {
        makeDebugValues(from: bridge.snapshot())
    }

    func process(_ buffer: AVAudioPCMBuffer) {
        bridge.processAudioBuffer(buffer)
    }

    func reset() -> SuperpoweredDebugValues {
        bridge.reset()
        return makeDebugValues(from: bridge.snapshot())
    }

    private func makeDebugValues(from snapshot: SuperpoweredBridgeSnapshot) -> SuperpoweredDebugValues {
        let status = SuperpoweredSDKStatus(rawValue: snapshot.sdkStatus) ?? .failed

        return SuperpoweredDebugValues(
            sdkStatus: status,
            bpm: snapshot.bpm?.floatValue,
            silence: snapshot.silence?.boolValue,
            confidenceText: snapshot.confidenceText,
            lastUpdateText: snapshot.lastUpdateText,
            failureReason: snapshot.failureReason,
            judgment: .unknown,
            isExperimentalOnly: true
        )
    }
}
