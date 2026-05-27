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

function createInitialDebugInfo(): MeasurementDebugInfo {
  return {
    audioContextState: "not-created",
    mediaTrackState: "none",
    mediaTrackEnabled: null,
    mediaTrackMuted: null,
    sampleRate: null,
    analyserFrameCount: 0,
    rms: 0,
    peak: 0,
    signalDetectedCount: 0,
    onsetCandidateCount: 0,
    bpmCandidateCount: 0,
    resultState: "idle",
    reason: "측정 전입니다."
  };
}

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
  const lastDebugUpdateAtRef = useRef(0);

  useEffect(() => {
    statusRef.current = screen;
  }, [screen]);

  useEffect(() => {
    const debugParam = new URLSearchParams(window.location.search).get("debug");

    if (debugParam === "1") {
      setDebugVisible(true);
    }
  }, []);

  const updateDebugInfo = useCallback((nextInfo: Partial<MeasurementDebugInfo>) => {
    setDebugInfo((previousInfo) => {
      const mergedInfo = {
        ...previousInfo,
        ...nextInfo
      };

      debugInfoRef.current = mergedInfo;
      return mergedInfo;
    });
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
    const initialDebugInfo = createInitialDebugInfo();
    debugInfoRef.current = initialDebugInfo;
    setDebugInfo(initialDebugInfo);
    lastDebugUpdateAtRef.current = 0;
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
    const currentDebugInfo = debugInfoRef.current;

    updateDebugInfo({
      audioContextState: audioContextRef.current?.state ?? currentDebugInfo.audioContextState,
      ...getTrackDebugInfo(mediaStreamRef.current),
      sampleRate: audioContextRef.current?.sampleRate ?? currentDebugInfo.sampleRate,
      analyserFrameCount: diagnostics.sampleCount,
      rms: currentDebugInfo.rms,
      peak: Math.max(currentDebugInfo.peak, diagnostics.maxPeak),
      signalDetectedCount: diagnostics.signalDetectedCount,
      onsetCandidateCount: diagnostics.onsetCandidateCount,
      bpmCandidateCount: diagnostics.bpmCandidateCount,
      resultState: outcome.kind,
      reason:
        outcome.kind === "result"
          ? "BPM 후보가 계산되어 결과 화면으로 전달되었습니다."
          : outcome.reason
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
    const timestampMs = performance.now() - measurementStartedAtRef.current;

    energySamplesRef.current.push({
      timestampMs,
      energy: rms,
      peak
    });

    const previousDebugInfo = debugInfoRef.current;
    const analyserFrameCount = previousDebugInfo.analyserFrameCount + 1;
    const signalDetectedCount =
      previousDebugInfo.signalDetectedCount + (rms >= MIN_SIGNAL_THRESHOLD ? 1 : 0);
    const nextDebugInfo: MeasurementDebugInfo = {
      ...previousDebugInfo,
      audioContextState: audioContextRef.current?.state ?? "unknown",
      ...getTrackDebugInfo(mediaStreamRef.current),
      sampleRate: audioContextRef.current?.sampleRate ?? previousDebugInfo.sampleRate,
      analyserFrameCount,
      rms,
      peak,
      signalDetectedCount,
      resultState: "measuring",
      reason:
        rms >= MIN_SIGNAL_THRESHOLD
          ? "입력 신호가 감지되고 있습니다."
          : "입력 신호가 약합니다."
    };
    const now = performance.now();

    debugInfoRef.current = nextDebugInfo;

    if (now - lastDebugUpdateAtRef.current >= 250) {
      lastDebugUpdateAtRef.current = now;
      setDebugInfo(nextDebugInfo);
    }
  }, []);

  const startMeasurement = useCallback(async () => {
    cleanupMeasurement();
    resetOutput();

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
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      if (audioContext.state === "suspended") {
        await audioContext.resume().catch(() => undefined);
      }

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);

      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceNodeRef.current = source;
      analyserNodeRef.current = analyser;
      frameDataRef.current = new Uint8Array(analyser.fftSize);
      measurementStartedAtRef.current = performance.now();
      energySamplesRef.current = [];
      updateDebugInfo({
        audioContextState: audioContext.state,
        ...getTrackDebugInfo(stream),
        sampleRate: audioContext.sampleRate,
        analyserFrameCount: 0,
        rms: 0,
        peak: 0,
        signalDetectedCount: 0,
        onsetCandidateCount: 0,
        bpmCandidateCount: 0,
        resultState: "measuring",
        reason:
          audioContext.state === "running"
            ? "측정이 시작되었습니다."
            : "AudioContext가 아직 running 상태가 아닙니다."
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
        updateDebugInfo({
          resultState: "permission-denied",
          reason: "마이크 권한이 거부되었습니다."
        });
        setScreen("permission-denied");
        return;
      }

      updateDebugInfo({
        resultState: "error",
        reason:
          error instanceof Error
            ? error.message
            : "마이크 측정을 시작하는 중 오류가 발생했습니다."
      });
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "마이크 측정을 시작하는 중 오류가 발생했습니다."
      );
      setScreen("error");
    }
  }, [
    cleanupMeasurement,
    collectEnergySample,
    finishMeasurement,
    resetOutput,
    updateDebugInfo
  ]);

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
          마이크 입력을 브라우저 안에서만 분석해 약 20초 동안 BPM 후보를 추정합니다.
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
            <p className="signal-status">입력 신호: {getInputSignalLabel(debugInfo)}</p>
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

        <div className="debug-actions">
          <button
            className="secondary-button debug-toggle"
            type="button"
            onClick={() => setDebugVisible((isVisible) => !isVisible)}
          >
            {debugVisible ? "진단 정보 숨기기" : "진단 정보 보기"}
          </button>
        </div>

        {debugVisible && <DebugPanel debugInfo={debugInfo} />}
      </section>

      <section className="notice" aria-labelledby="limits-title">
        <h2 id="limits-title">V0 안내</h2>
        <p>
          이번 버전은 자동 측정 흐름 검증용입니다. BPM 결과는 단일 정답이 아니라
          참고 후보로 확인해 주세요.
        </p>
      </section>
    </main>
  );
}

function getTrackDebugInfo(stream: MediaStream | null) {
  const [audioTrack] = stream?.getAudioTracks() ?? [];

  if (!audioTrack) {
    return {
      mediaTrackState: "none" as const,
      mediaTrackEnabled: null,
      mediaTrackMuted: null
    };
  }

  return {
    mediaTrackState: audioTrack.readyState,
    mediaTrackEnabled: audioTrack.enabled,
    mediaTrackMuted: audioTrack.muted
  };
}

function getInputSignalLabel(debugInfo: MeasurementDebugInfo): string {
  if (debugInfo.analyserFrameCount === 0) {
    return "확인 중";
  }

  if (debugInfo.rms >= MIN_SIGNAL_THRESHOLD) {
    return "감지됨";
  }

  return "약함";
}

function DebugPanel({ debugInfo }: { debugInfo: MeasurementDebugInfo }) {
  const rows = [
    ["AudioContext", debugInfo.audioContextState],
    ["Mic track", debugInfo.mediaTrackState],
    ["Track enabled", formatNullableBoolean(debugInfo.mediaTrackEnabled)],
    ["Track muted", formatNullableBoolean(debugInfo.mediaTrackMuted)],
    ["Sample rate", debugInfo.sampleRate === null ? "-" : `${debugInfo.sampleRate} Hz`],
    ["Frame count", debugInfo.analyserFrameCount.toString()],
    ["RMS", formatLevel(debugInfo.rms)],
    ["Peak", formatLevel(debugInfo.peak)],
    ["Signal threshold", formatLevel(MIN_SIGNAL_THRESHOLD)],
    ["Signal detected", debugInfo.signalDetectedCount.toString()],
    ["Onset candidates", debugInfo.onsetCandidateCount.toString()],
    ["BPM candidates", debugInfo.bpmCandidateCount.toString()],
    ["Result state", debugInfo.resultState],
    ["Reason", debugInfo.reason]
  ];

  return (
    <aside className="debug-panel" aria-label="측정 진단 정보">
      <h2>진단 정보</h2>
      <p className="debug-help">
        가능한 경우 다른 기기나 외부 스피커에서 음악을 재생해 주세요. 같은 휴대폰에서
        재생한 음악은 브라우저 마이크 입력으로 잘 들어오지 않을 수 있습니다.
      </p>
      <dl className="debug-grid">
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

function formatLevel(value: number): string {
  return value.toFixed(4);
}

function formatNullableBoolean(value: boolean | null): string {
  if (value === null) {
    return "-";
  }

  return value ? "true" : "false";
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
