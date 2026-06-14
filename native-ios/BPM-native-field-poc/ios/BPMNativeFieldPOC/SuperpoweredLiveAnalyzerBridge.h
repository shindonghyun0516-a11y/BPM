#import <Foundation/Foundation.h>

@class AVAudioPCMBuffer;

NS_ASSUME_NONNULL_BEGIN

@interface SuperpoweredBridgeSnapshot : NSObject

@property (nonatomic, readonly, copy) NSString *sdkStatus;
@property (nonatomic, readonly, nullable) NSNumber *bpm;
@property (nonatomic, readonly, nullable) NSNumber *silence;
@property (nonatomic, readonly, copy) NSString *confidenceText;
@property (nonatomic, readonly, copy) NSString *lastUpdateText;
@property (nonatomic, readonly, copy) NSString *failureReason;

- (instancetype)initWithSDKStatus:(NSString *)sdkStatus
                              bpm:(nullable NSNumber *)bpm
                          silence:(nullable NSNumber *)silence
                   confidenceText:(NSString *)confidenceText
                   lastUpdateText:(NSString *)lastUpdateText
                    failureReason:(NSString *)failureReason NS_DESIGNATED_INITIALIZER;
- (instancetype)init NS_UNAVAILABLE;

@end

@interface SuperpoweredLiveAnalyzerBridge : NSObject

@property (nonatomic, readonly) BOOL sdkHeaderAvailable;

- (void)configureWithSampleRate:(double)sampleRate;
- (void)processAudioBuffer:(AVAudioPCMBuffer *)buffer;
- (SuperpoweredBridgeSnapshot *)snapshot;
- (void)reset;

@end

NS_ASSUME_NONNULL_END
