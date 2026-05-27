"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ENERGY_SAMPLE_INTERVAL_MS,
  MEASUREMENT_DURATION_MS,
  MIN_SIGNAL_THRESHOLD,
  analyzeEnergySamples,
  calculateSignalEnergy,
  calculateSignalPeak
} from "@/lib/bpm-analysis";
import type {
  BpmAnalysisSuccess,
  EnergySample,
  MeasurementDebugInfo,
  MeasurementStatus
} from "@/types/app";

type AudioContextWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const INITIAL_REMAINING_SECONDS = Math.ceil(MEASUREMENT_DURATION_MS / 1000);
const deniedMessage =
  "마이크 권한이 꺼져 있어 자동 BPM 측정을 진행할 수 없습니다. 탭 보정 기능은 다음 버전에서 제공 예정입니다. 지금은 마이크 권한을 허용한 뒤 다시 측정해 주세요.";

export default function Home() {
  const [screen, setScreen] = useState<MeasurementStatus>("idle");
  const [remainingSeconds, setRemainingSeconds] = useState(INITIAL_REMAINING_SECONDS);
  const [result, setResult] = useState<BpmAnalysisSuccess | null>(null);
  const [unstableReason, setUnstableReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [debugVisible, setDebugVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<MeasurementDebugInfo>(createInitialDebugInfo);

  const statusRef = useRef<MeasurementStatus>("idle");
  const debugInfoRef = useRef<MeasurementDebugInfo>(createInitialDebugInfo());
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const frameDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const energySamplesRef = useRef<EnergySample[]>([]);
  const measurementStartedAtRef = useRef(0);
  const sampleTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    statusRef.current = screen;
  }, [screen]);

  useEffect(() => {
    setDebugVisible(new URLSearchParams(window.location.search).get("debug") === "1");
  }, []);

  const updateDebugInfo = useCallback((nextInfo: Partial<MeasurementDebugInfo>) => {
    const mergedInfo = {
      ...debugInfoRef.current,
      ...nextInfo
    };

    debugInfoRef.current = mergedInfo;
    setDebugInfo(mergedInfo);
  }, []);

  const cleanupMeasurement = useCallback(() => {
    if (sampleTimerRef.current !== null) {
      window.clearInterval(sampleTimerRef.current);
      sampleTimerRef.current = null;
    }

    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    if (finishTimerRef.current !== null) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    sourceNodeRef.current?.disconnect();
    analyserNodeRef.current?.disconnect();
    sourceNodeRef.current = null;
    analyserNodeRef.current = null;
    frameDataRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    mediaStreamRef.current = null;

    const currentContext = audioContextRef.current;
    audioContextRef.current = null;

    if (currentContext && currentContext.state !== "closed") {
      void currentContext.close().catch(() => undefined);
    }

    energySamplesRef.current = [];
    measurementStartedAtRef.current = 0;
  }, []);

  const resetOutput = useCallback(() => {
    setResult(null);
    setUnstableReason("");
    setErrorMessage("");
    setRemainingSeconds(INITIAL_REMAINING_SECONDS);
  }, []);

  const showPermissionGuide = useCallback(() => {
    cleanupMeasurement();
    resetOutput();
    setScreen("permission-guide");
  }, [cleanupMeasurement, resetOutput]);

  const finishMeasurement = useCallback(() => {
    const samples = [...energySamplesRef.current];
    const outcome = analyzeEnergySamples(samples);
    const diagnostics = outcome.diagnostics;

    updateDebugInfo({
      analyserFrameCount: Math.max(debugInfoRef.current.analyserFrameCount, diagnostics.sampleCount),
      signalDetectedCount: diagnostics.signalDetectedCount,
      onsetCandidateCount: diagnostics.onsetCandidateCount,
      onsetIntervalsMs: diagnostics.onsetIntervalsMs,
      bpmCandidateCount: diagnostics.bpmCandidateCount,
      bpmCandidateValues: diagnostics.bpmCandidateValues,
      intervalStability: diagnostics.intervalStability,
      stabilityThreshold: diagnostics.stabilityThreshold,
      resultType: diagnostics.resultType,
      reason: diagnostics.reason
    });

    cleanupMeasurement();

    if (outcome.kind === "result") {
      setResult(outcome);
      setUnstableReason("");
      setScreen("result");
      return;
    }

    setResult(null);
    setUnstableReason(outcome.reason);
    setScreen("unstable-result");
  }, [cleanupMeasurement, updateDebugInfo]);

  const collectEnergySample = useCallback(() => {
    const analyser = analyserNodeRef.current;
    const frameData = frameDataRef.current;

    if (!analyser || !frameData || measurementStartedAtRef.current === 0) {
      return;
    }

    analyser.getByteTimeDomainData(frameData);
    const rms = calculateSignalEnergy(frameData);
    const peak = calculateSignalPeak(frameData);
    const previousDebugInfo = debugInfoRef.current;

    energySamplesRef.current.push({
      timestampMs: performance.now() - measurementStartedAtRef.current,
      energy: rms
    });
    updateDebugInfo({
      ...getCurrentTrackDebugInfo(mediaStreamRef.current),
      audioContextState: audioContextRef.current?.state ?? "unknown",
      analyserFrameCount: previousDebugInfo.analyserFrameCount + 1,
      rms,
      peak: Math.max(previousDebugInfo.peak, peak),
      signalDetectedCount:
        previousDebugInfo.signalDetectedCount + (rms >= MIN_SIGNAL_THRESHOLD ? 1 : 0)
    });
  }, [updateDebugInfo]);

  const startMeasurement = useCallback(async () => {
    cleanupMeasurement();
    resetOutput();
    const initialDebugInfo = createInitialDebugInfo();

    debugInfoRef.current = initialDebugInfo;
    setDebugInfo(initialDebugInfo);

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("이 브라우저에서는 마이크 측정을 사용할 수 없습니다.");
      setScreen("error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      const AudioContextConstructor =
        window.AudioContext ?? (window as AudioContextWindow).webkitAudioContext;

      if (!AudioContextConstructor) {
        mediaStreamRef.current = stream;
        throw new Error("이 브라우저에서는 오디오 분석을 사용할 수 없습니다.");
      }

      const audioContext = new AudioContextConstructor();
      let audioContextResumeAttempted = false;
      let audioContextResumeSucceeded = audioContext.state === "running";

      if (audioContext.state === "suspended") {
        audioContextResumeAttempted = true;
        await audioContext.resume();
        audioContextResumeSucceeded = getAudioContextState(audioContext) === "running";
      }

      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 1024;
      source.connect(analyser);

      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceNodeRef.current = source;
      analyserNodeRef.current = analyser;
      frameDataRef.current = new Uint8Array(analyser.fftSize);
      measurementStartedAtRef.current = performance.now();
      energySamplesRef.current = [];
      updateDebugInfo({
        ...getCurrentTrackDebugInfo(stream),
        audioContextState: audioContext.state,
        audioContextResumeAttempted,
        audioContextResumeSucceeded,
        sampleRate: audioContext.sampleRate
      });

      setRemainingSeconds(INITIAL_REMAINING_SECONDS);
      setScreen("measuring");

      collectEnergySample();

      sampleTimerRef.current = window.setInterval(
        collectEnergySample,
        ENERGY_SAMPLE_INTERVAL_MS
      );
      countdownTimerRef.current = window.setInterval(() => {
        const elapsedMs = performance.now() - measurementStartedAtRef.current;
        const nextRemainingSeconds = Math.max(
          0,
          Math.ceil((MEASUREMENT_DURATION_MS - elapsedMs) / 1000)
        );

        setRemainingSeconds(nextRemainingSeconds);
      }, 250);
      finishTimerRef.current = window.setTimeout(finishMeasurement, MEASUREMENT_DURATION_MS);
    } catch (error) {
      cleanupMeasurement();

      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setScreen("permission-denied");
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "마이크 측정을 시작하는 중 오류가 발생했습니다."
      );
      setScreen("error");
    }
  }, [cleanupMeasurement, collectEnergySample, finishMeasurement, resetOutput, updateDebugInfo]);

  const cancelMeasurement = useCallback(() => {
    cleanupMeasurement();
    resetOutput();
    setScreen("idle");
  }, [cleanupMeasurement, resetOutput]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && statusRef.current === "measuring") {
        cleanupMeasurement();
        setErrorMessage("화면이 바뀌어 측정이 중단되었습니다. 다시 측정해 주세요.");
        setScreen("error");
      }
    };
    const handlePageHide = () => {
      cleanupMeasurement();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      cleanupMeasurement();
    };
  }, [cleanupMeasurement]);

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Mobile Web V0</p>
        <h1 id="page-title">BPM 자동 측정</h1>
        <p className="summary">
          마이크 입력을 브라우저 안에서만 분석해 약 10초 동안 BPM 후보를 추정합니다.
          오디오는 저장하거나 서버로 전송하지 않습니다.
        </p>
      </section>

      <section className="measurement-panel" aria-live="polite">
        <StatusBadge screen={screen} />

        {screen === "idle" && (
          <div className="state-block">
            <h2>측정 시작 전</h2>
            <p>
              음악을 재생한 뒤 측정을 시작하세요. 마이크는 주변 소리의 박자 변화를
              읽는 데만 사용됩니다.
            </p>
            <button className="primary-button" type="button" onClick={showPermissionGuide}>
              측정 시작
            </button>
          </div>
        )}

        {screen === "permission-guide" && (
          <div className="state-block">
            <h2>마이크 권한 안내</h2>
            <p>
              BPM을 자동으로 추정하려면 마이크 권한이 필요합니다. 입력 소리는 숫자형
              분석 데이터로만 사용하며 저장하거나 서버로 전송하지 않습니다.
            </p>
            <div className="button-row">
              <button className="primary-button" type="button" onClick={startMeasurement}>
                마이크 권한 허용 후 측정
              </button>
              <button className="secondary-button" type="button" onClick={cancelMeasurement}>
                취소
              </button>
            </div>
          </div>
        )}

        {screen === "measuring" && (
          <div className="state-block">
            <h2>측정 중</h2>
            <p>음악이 잘 들리도록 기기를 소리 가까이에 두세요.</p>
            <div className="timer" aria-label={`남은 시간 ${remainingSeconds}초`}>
              <strong>{remainingSeconds}</strong>
              <span>초 남음</span>
            </div>
            <div className="progress-track" aria-hidden="true">
              <span
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      ((INITIAL_REMAINING_SECONDS - remainingSeconds) /
                        INITIAL_REMAINING_SECONDS) *
                        100
                    )
                  )}%`
                }}
              />
            </div>
            <button className="secondary-button" type="button" onClick={cancelMeasurement}>
              측정 취소
            </button>
          </div>
        )}

        {screen === "result" && result && (
          <div className="state-block" data-testid="bpm-result-section">
            <h2>측정 결과</h2>
            <p className="result-note" data-testid="bpm-result-disclaimer">
              V0 임시 추정값입니다. 단일 정답이 아니라 후보 BPM과 신뢰도를 함께 확인해
              주세요.
            </p>
            <div
              className="bpm-result"
              data-testid="recommended-bpm"
              aria-label={`추천 BPM ${result.recommendedBpm}`}
            >
              <span>추천 BPM</span>
              <strong>{result.recommendedBpm}</strong>
            </div>
            <div className="result-grid">
              <div>
                <h3>후보 BPM</h3>
                <ul className="candidate-list" data-testid="bpm-candidates">
                  {result.candidates.map((candidate) => (
                    <li key={`${candidate.label}-${candidate.bpm}`}>
                      <strong>{candidate.bpm}</strong>
                      <span>{candidate.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>신뢰도</h3>
                <p className="confidence" data-testid="bpm-confidence">
                  {result.confidence}
                </p>
                {result.confidence === "낮음" && (
                  <p className="subtle">신호가 흔들렸습니다. 다시 측정해 보세요.</p>
                )}
              </div>
            </div>
            <button
              className="primary-button"
              data-testid="remeasure-button"
              type="button"
              onClick={showPermissionGuide}
            >
              다시 측정
            </button>
          </div>
        )}

        {screen === "unstable-result" && (
          <div className="state-block">
            <h2>측정이 불안정합니다</h2>
            <p data-testid="unstable-result-message">
              측정이 불안정합니다. 다시 측정해 주세요.
            </p>
            {unstableReason && <p className="subtle">원인: {unstableReason}</p>}
            <p className="subtle" data-testid="tap-calibration-coming-soon">
              탭 보정 기능은 다음 버전에서 제공 예정입니다.
            </p>
            <button
              className="primary-button"
              data-testid="remeasure-button"
              type="button"
              onClick={showPermissionGuide}
            >
              다시 측정
            </button>
          </div>
        )}

        {screen === "permission-denied" && (
          <div className="state-block">
            <h2>마이크 권한이 꺼져 있습니다</h2>
            <p data-testid="permission-denied-message">{deniedMessage}</p>
            <p className="subtle">
              브라우저 설정에서 마이크 권한을 다시 허용하면 자동 측정을 사용할 수
              있습니다.
            </p>
            <button className="primary-button" type="button" onClick={showPermissionGuide}>
              다시 시도
            </button>
          </div>
        )}

        {screen === "error" && (
          <div className="state-block">
            <h2>측정을 진행할 수 없습니다</h2>
            <p>{errorMessage || "알 수 없는 오류가 발생했습니다. 다시 측정해 주세요."}</p>
            <button className="primary-button" type="button" onClick={showPermissionGuide}>
              다시 측정
            </button>
          </div>
        )}
      </section>

      <section className="notice" aria-labelledby="limits-title">
        <h2 id="limits-title">V0 안내</h2>
        <p>
          이번 버전은 자동 측정 흐름 검증용입니다. BPM 결과는 단일 정답이 아니라
          참고 후보로 확인해 주세요.
        </p>
      </section>

      {debugVisible && <DebugPanel debugInfo={debugInfo} />}
    </main>
  );
}

function createInitialDebugInfo(): MeasurementDebugInfo {
  return {
    audioContextState: "not-created",
    audioContextResumeAttempted: false,
    audioContextResumeSucceeded: false,
    mediaTrackState: "none",
    mediaTrackEnabled: null,
    mediaTrackMuted: null,
    sampleRate: null,
    analyserFrameCount: 0,
    rms: 0,
    peak: 0,
    signalThreshold: MIN_SIGNAL_THRESHOLD,
    signalDetectedCount: 0,
    onsetCandidateCount: 0,
    onsetIntervalsMs: [],
    bpmCandidateCount: 0,
    bpmCandidateValues: [],
    intervalStability: null,
    stabilityThreshold: 0,
    resultType: "none",
    reason: "측정 전입니다."
  };
}

function getAudioContextState(audioContext: AudioContext): AudioContextState {
  return audioContext.state;
}

function getCurrentTrackDebugInfo(stream: MediaStream | null): Pick<
  MeasurementDebugInfo,
  "mediaTrackState" | "mediaTrackEnabled" | "mediaTrackMuted"
> {
  const track = stream?.getAudioTracks()[0];

  if (!track) {
    return {
      mediaTrackState: "none",
      mediaTrackEnabled: null,
      mediaTrackMuted: null
    };
  }

  return {
    mediaTrackState: track.readyState,
    mediaTrackEnabled: track.enabled,
    mediaTrackMuted: track.muted
  };
}

function DebugPanel({ debugInfo }: { debugInfo: MeasurementDebugInfo }) {
  const rows = [
    ["AudioContext state", debugInfo.audioContextState],
    ["AudioContext resume attempted", formatBoolean(debugInfo.audioContextResumeAttempted)],
    ["AudioContext resume succeeded", formatBoolean(debugInfo.audioContextResumeSucceeded)],
    ["Mic track", debugInfo.mediaTrackState],
    ["Track enabled", formatNullableBoolean(debugInfo.mediaTrackEnabled)],
    ["Track muted", formatNullableBoolean(debugInfo.mediaTrackMuted)],
    ["Sample rate", debugInfo.sampleRate === null ? "-" : `${debugInfo.sampleRate} Hz`],
    ["Analyser frame count", debugInfo.analyserFrameCount.toString()],
    ["RMS", formatLevel(debugInfo.rms)],
    ["Peak", formatLevel(debugInfo.peak)],
    ["Signal threshold", formatLevel(debugInfo.signalThreshold)],
    ["Signal detected count", debugInfo.signalDetectedCount.toString()],
    ["Onset candidates", debugInfo.onsetCandidateCount.toString()],
    ["Onset intervals", formatNumberList(debugInfo.onsetIntervalsMs)],
    ["BPM candidates", formatNumberList(debugInfo.bpmCandidateValues)],
    [
      "Stability score",
      debugInfo.intervalStability === null ? "-" : debugInfo.intervalStability.toFixed(3)
    ],
    ["Stability threshold", debugInfo.stabilityThreshold.toFixed(3)],
    ["Result type", debugInfo.resultType],
    ["Reason", debugInfo.reason]
  ];

  return (
    <aside className="debug-panel" aria-label="측정 진단 정보">
      <h2>진단 정보</h2>
      <p>?debug=1에서만 표시됩니다. 오디오 원본은 저장하지 않고 숫자형 진단값만 보여줍니다.</p>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

function formatBoolean(value: boolean): string {
  return value ? "yes" : "no";
}

function formatNullableBoolean(value: boolean | null): string {
  if (value === null) {
    return "-";
  }

  return formatBoolean(value);
}

function formatLevel(value: number): string {
  return value.toFixed(4);
}

function formatNumberList(values: number[]): string {
  if (values.length === 0) {
    return "-";
  }

  return values.slice(0, 8).join(", ");
}

function StatusBadge({ screen }: { screen: MeasurementStatus }) {
  const labels: Record<MeasurementStatus, string> = {
    idle: "대기",
    "permission-guide": "권한 안내",
    measuring: "측정 중",
    result: "결과",
    "unstable-result": "불안정",
    "permission-denied": "권한 거부",
    error: "오류"
  };

  return (
    <div className="status-card" aria-label={`현재 상태 ${labels[screen]}`}>
      <span className="status-dot" aria-hidden="true" />
      <span>{labels[screen]}</span>
    </div>
  );
}
