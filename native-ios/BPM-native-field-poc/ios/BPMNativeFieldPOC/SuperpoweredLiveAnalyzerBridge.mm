#import "SuperpoweredLiveAnalyzerBridge.h"
#import <AVFoundation/AVFoundation.h>

#include <atomic>
#include <memory>
#include <vector>

#if __has_include("BPMSuperpoweredLocalLicense.h")
#import "BPMSuperpoweredLocalLicense.h"
#endif

#if __has_include("../Vendor/Superpowered/SuperpoweredAnalyzer.h")
#import "../Vendor/Superpowered/Superpowered.h"
#import "../Vendor/Superpowered/SuperpoweredAnalyzer.h"
#define BPM_SUPERPOWERED_HEADER_AVAILABLE 1
#else
#define BPM_SUPERPOWERED_HEADER_AVAILABLE 0
#endif

#ifndef BPM_SUPERPOWERED_LICENSE_KEY
#define BPM_SUPERPOWERED_LICENSE_KEY ""
#endif

@implementation SuperpoweredBridgeSnapshot

- (instancetype)initWithSDKStatus:(NSString *)sdkStatus
                              bpm:(NSNumber *)bpm
                          silence:(NSNumber *)silence
                   confidenceText:(NSString *)confidenceText
                   lastUpdateText:(NSString *)lastUpdateText
                    failureReason:(NSString *)failureReason {
    self = [super init];
    if (self) {
        _sdkStatus = [sdkStatus copy];
        _bpm = bpm;
        _silence = silence;
        _confidenceText = [confidenceText copy];
        _lastUpdateText = [lastUpdateText copy];
        _failureReason = [failureReason copy];
    }

    return self;
}

@end

@interface SuperpoweredLiveAnalyzerBridge ()

@property (nonatomic) BOOL configured;
@property (nonatomic) double sampleRate;
@property (nonatomic, copy) NSString *lastUpdateText;
@property (nonatomic, copy) NSString *failureReason;

@end

@implementation SuperpoweredLiveAnalyzerBridge {
#if BPM_SUPERPOWERED_HEADER_AVAILABLE
    std::unique_ptr<Superpowered::LiveAnalyzer> _liveAnalyzer;
#endif
    std::vector<float> _stereoInterleavedBuffer;
    std::atomic<float> _lastBPM;
    std::atomic<bool> _lastSilence;
    std::atomic<unsigned long long> _processedFrameCount;
    std::atomic<bool> _hasProcessedAudio;
    std::atomic<bool> _failed;
    std::atomic<bool> _initialized;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _configured = NO;
        _sampleRate = 0;
        _lastUpdateText = @"-";
        _failureReason = @"Superpowered SDK not configured";
        _lastBPM.store(0);
        _lastSilence.store(false);
        _processedFrameCount.store(0);
        _hasProcessedAudio.store(false);
        _failed.store(false);
        _initialized.store(false);
    }

    return self;
}

- (void)dealloc {
    [self reset];
}

- (BOOL)sdkHeaderAvailable {
    return BPM_SUPERPOWERED_HEADER_AVAILABLE == 1;
}

- (void)configureWithSampleRate:(double)sampleRate {
    [self reset];
    self.sampleRate = sampleRate;

    if (!self.sdkHeaderAvailable) {
        self.failureReason = @"Superpowered SDK header not found";
        return;
    }

    if (sampleRate <= 0) {
        _failed.store(true);
        self.failureReason = @"Invalid input sample rate";
        return;
    }

    const char *licenseKey = BPM_SUPERPOWERED_LICENSE_KEY;
    if (licenseKey == nullptr || licenseKey[0] == '\0') {
        _failed.store(true);
        self.failureReason = @"Superpowered license key is not configured";
        return;
    }

#if BPM_SUPERPOWERED_HEADER_AVAILABLE
    static std::atomic<bool> didInitialize(false);
    bool expected = false;
    if (didInitialize.compare_exchange_strong(expected, true)) {
        Superpowered::Initialize(licenseKey);
    }

    _liveAnalyzer = std::make_unique<Superpowered::LiveAnalyzer>((unsigned int)sampleRate);
    _initialized.store(true);
    self.configured = YES;
    self.lastUpdateText = [NSString stringWithFormat:@"configured, %.0f Hz", sampleRate];
    self.failureReason = @"Audio feed is ready";
#else
    self.failureReason = @"Superpowered SDK header not found";
#endif
}

- (void)processAudioBuffer:(AVAudioPCMBuffer *)buffer {
    if (!self.configured || _failed.load() || !_initialized.load()) {
        return;
    }

#if BPM_SUPERPOWERED_HEADER_AVAILABLE
    if (!_liveAnalyzer) {
        return;
    }

    float * const *channelData = buffer.floatChannelData;
    const AVAudioFrameCount frameLength = buffer.frameLength;
    const AVAudioChannelCount channels = buffer.format.channelCount;

    if (channelData == nullptr || frameLength == 0 || channels == 0) {
        return;
    }

    const size_t stereoSampleCount = (size_t)frameLength * 2;
    if (_stereoInterleavedBuffer.size() < stereoSampleCount) {
        _stereoInterleavedBuffer.resize(stereoSampleCount);
    }

    float *stereo = _stereoInterleavedBuffer.data();
    if (channels == 1) {
        const float *mono = channelData[0];
        for (AVAudioFrameCount frame = 0; frame < frameLength; frame++) {
            const float sample = mono[frame];
            const size_t index = (size_t)frame * 2;
            stereo[index] = sample;
            stereo[index + 1] = sample;
        }
    } else {
        const float *left = channelData[0];
        const float *right = channelData[1];
        for (AVAudioFrameCount frame = 0; frame < frameLength; frame++) {
            const size_t index = (size_t)frame * 2;
            stereo[index] = left[frame];
            stereo[index + 1] = right[frame];
        }
    }

    _liveAnalyzer->process(stereo, frameLength);
    _lastBPM.store(_liveAnalyzer->bpm);
    _lastSilence.store(_liveAnalyzer->silence);
    _processedFrameCount.fetch_add(frameLength);
    _hasProcessedAudio.store(true);
#endif
}

- (SuperpoweredBridgeSnapshot *)snapshot {
    if (!self.sdkHeaderAvailable) {
        return [[SuperpoweredBridgeSnapshot alloc]
            initWithSDKStatus:@"not configured"
                          bpm:nil
                      silence:nil
               confidenceText:@"제공 없음"
               lastUpdateText:@"-"
                failureReason:@"Superpowered SDK header not found"];
    }

    if (_failed.load()) {
        return [[SuperpoweredBridgeSnapshot alloc]
            initWithSDKStatus:@"failed"
                          bpm:nil
                      silence:nil
               confidenceText:@"제공 없음"
               lastUpdateText:self.lastUpdateText
                failureReason:self.failureReason];
    }

    if (!self.configured || !_initialized.load()) {
        return [[SuperpoweredBridgeSnapshot alloc]
            initWithSDKStatus:@"not configured"
                          bpm:nil
                      silence:nil
               confidenceText:@"제공 없음"
               lastUpdateText:self.lastUpdateText
                failureReason:self.failureReason];
    }

    const unsigned long long processedFrames = _processedFrameCount.load();
    const double processedSeconds = self.sampleRate > 0
        ? (double)processedFrames / self.sampleRate
        : 0;
    NSString *lastUpdate = _hasProcessedAudio.load()
        ? [NSString stringWithFormat:@"processed %.1f sec", processedSeconds]
        : self.lastUpdateText;
    const float bpm = _lastBPM.load();
    NSNumber *bpmNumber = bpm > 0 ? @(bpm) : nil;
    NSNumber *silenceNumber = @(_lastSilence.load());
    NSString *reason = @"LiveAnalyzer is processing mic buffer";

    if (!_hasProcessedAudio.load()) {
        reason = @"Waiting for mic buffer";
    } else if (_lastSilence.load()) {
        reason = @"Superpowered reports silence";
    } else if (bpm <= 0) {
        reason = @"Waiting for stable BPM";
    }

    return [[SuperpoweredBridgeSnapshot alloc]
        initWithSDKStatus:_hasProcessedAudio.load() ? @"running" : @"ready"
                      bpm:bpmNumber
                  silence:silenceNumber
           confidenceText:@"제공 없음"
           lastUpdateText:lastUpdate
            failureReason:reason];
}

- (void)reset {
    self.configured = NO;
    self.sampleRate = 0;
    self.lastUpdateText = @"reset";
    self.failureReason = @"Superpowered analyzer reset";
    _lastBPM.store(0);
    _lastSilence.store(false);
    _processedFrameCount.store(0);
    _hasProcessedAudio.store(false);
    _failed.store(false);
    _initialized.store(false);
    _stereoInterleavedBuffer.clear();
#if BPM_SUPERPOWERED_HEADER_AVAILABLE
    _liveAnalyzer.reset();
#endif
}

@end
