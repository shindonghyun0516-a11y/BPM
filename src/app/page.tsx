"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ENERGY_SAMPLE_INTERVAL_MS,
  MEASUREMENT_DURATION_MS,
  analyzeEnergySamples,
  calculateSignalEnergy
} from "@/lib/bpm-analysis";
import type { BpmAnalysisSuccess, EnergySample, MeasurementStatus } from "@/types/app";

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

  const statusRef = useRef<MeasurementStatus>("idle");
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
  }, [cleanupMeasurement]);

  const collectEnergySample = useCallback(() => {
    const analyser = analyserNodeRef.current;
    const frameData = frameDataRef.current;

    if (!analyser || !frameData || measurementStartedAtRef.current === 0) {
      return;
    }

    analyser.getByteTimeDomainData(frameData);
    energySamplesRef.current.push({
      timestampMs: performance.now() - measurementStartedAtRef.current,
      energy: calculateSignalEnergy(frameData)
    });
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

      analyser.fftSize = 1024;
      source.connect(analyser);

      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceNodeRef.current = source;
      analyserNodeRef.current = analyser;
      frameDataRef.current = new Uint8Array(analyser.fftSize);
      measurementStartedAtRef.current = performance.now();
      energySamplesRef.current = [];

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
  }, [cleanupMeasurement, collectEnergySample, finishMeasurement, resetOutput]);

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
            {result.resultKind === "reference" ? (
              <p className="result-note" data-testid="bpm-result-disclaimer">
                박자 강세나 연주 스타일 때문에 결과가 불안정할 수 있습니다. 정확한
                BPM으로 확정하지 말고 참고 후보로만 확인해 주세요.
              </p>
            ) : (
              <p className="result-note" data-testid="bpm-result-disclaimer">
                V0 임시 추정값입니다. 단일 정답이 아니라 후보 BPM과 신뢰도를 함께
                확인해 주세요.
              </p>
            )}
            <div
              className="bpm-result"
              data-testid="recommended-bpm"
              aria-label={`${getBpmResultLabel(result.resultKind)} ${result.recommendedBpm}`}
            >
              <span>{getBpmResultLabel(result.resultKind)}</span>
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
                {result.resultKind === "reference" ? (
                  <p className="subtle">
                    불안정하지만 참고 후보입니다. 정답처럼 확정하지 마세요.
                  </p>
                ) : (
                  result.confidence === "낮음" && (
                    <p className="subtle">신호가 흔들렸습니다. 다시 측정해 보세요.</p>
                  )
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
    </main>
  );
}

function getBpmResultLabel(resultKind: BpmAnalysisSuccess["resultKind"]): string {
  return resultKind === "reference" ? "참고 BPM 후보" : "추천 BPM";
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
