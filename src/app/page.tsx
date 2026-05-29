"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ENERGY_SAMPLE_INTERVAL_MS,
  MEASUREMENT_DURATION_MS,
  analyzeEnergySamples,
  calculateSignalEnergy
} from "@/lib/bpm-analysis";
import {
  analyzeWithEssentiaExperimental,
  mergePcmChunks
} from "@/lib/bpm-essentia-experimental";
import type { BpmAnalysisSuccess, EnergySample, MeasurementStatus } from "@/types/app";
import type { EssentiaExperimentalReport } from "@/lib/bpm-essentia-experimental";

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
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [essentiaReport, setEssentiaReport] = useState<EssentiaExperimentalReport | null>(
    null
  );
  const [essentiaStatus, setEssentiaStatus] = useState<
    "idle" | "collecting" | "loading" | "complete" | "failed"
  >("idle");

  const statusRef = useRef<MeasurementStatus>("idle");
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const scriptProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const silentGainNodeRef = useRef<GainNode | null>(null);
  const frameDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const energySamplesRef = useRef<EnergySample[]>([]);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const pcmSampleCountRef = useRef(0);
  const inputSampleRateRef = useRef(0);
  const measurementStartedAtRef = useRef(0);
  const sampleTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    statusRef.current = screen;
  }, [screen]);

  useEffect(() => {
    setIsDebugMode(new URLSearchParams(window.location.search).get("debug") === "1");
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

    scriptProcessorNodeRef.current?.disconnect();
    silentGainNodeRef.current?.disconnect();
    if (scriptProcessorNodeRef.current) {
      scriptProcessorNodeRef.current.onaudioprocess = null;
    }
    sourceNodeRef.current?.disconnect();
    analyserNodeRef.current?.disconnect();
    scriptProcessorNodeRef.current = null;
    silentGainNodeRef.current = null;
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
    pcmChunksRef.current = [];
    pcmSampleCountRef.current = 0;
    inputSampleRateRef.current = 0;
    measurementStartedAtRef.current = 0;
  }, []);

  const resetOutput = useCallback(() => {
    setResult(null);
    setUnstableReason("");
    setErrorMessage("");
    setEssentiaReport(null);
    setEssentiaStatus("idle");
    setRemainingSeconds(INITIAL_REMAINING_SECONDS);
  }, []);

  const runEssentiaComparison = useCallback(
    (outcome: ReturnType<typeof analyzeEnergySamples>, pcm: Float32Array, sampleRate: number) => {
      if (!isDebugMode) {
        return;
      }

      setEssentiaStatus("loading");

      void analyzeWithEssentiaExperimental({
        pcm,
        sampleRate,
        v0Outcome: outcome
      })
        .then((report) => {
          setEssentiaReport(report);
          setEssentiaStatus(report.status === "failed" ? "failed" : "complete");
        })
        .catch((error) => {
          setEssentiaReport({
            status: "failed",
            packageName: "essentia.js",
            license: "AGPL-3.0",
            wasmStatus: "failed",
            judgement: "판단 불가",
            judgementReason: "Essentia.js 실험 분석이 예외로 중단되었습니다.",
            bpm: null,
            candidates: [],
            confidence: null,
            failureReason:
              error instanceof Error
                ? error.message
                : "Essentia.js 실험 분석 중 알 수 없는 오류가 발생했습니다.",
            processingTimeMs: 0,
            wasmLoadTimeMs: 0,
            inputSampleRate: sampleRate,
            analysisSampleRate: 44_100,
            bufferDurationSeconds: sampleRate > 0 ? pcm.length / sampleRate : 0,
            rms: 0,
            peak: 0,
            beatsCount: 0,
            estimatesCount: 0,
            intervalsCount: 0,
            has132Bias: false,
            silentFalsePositive: false
          });
          setEssentiaStatus("failed");
        });
    },
    [isDebugMode]
  );

  const showPermissionGuide = useCallback(() => {
    cleanupMeasurement();
    resetOutput();
    setScreen("permission-guide");
  }, [cleanupMeasurement, resetOutput]);

  const finishMeasurement = useCallback(() => {
    const samples = [...energySamplesRef.current];
    const outcome = analyzeEnergySamples(samples);
    const sampleRate = inputSampleRateRef.current || audioContextRef.current?.sampleRate || 0;
    const pcm = isDebugMode
      ? mergePcmChunks(pcmChunksRef.current, pcmSampleCountRef.current)
      : new Float32Array();

    cleanupMeasurement();

    if (outcome.kind === "result") {
      setResult(outcome);
      setUnstableReason("");
      setScreen("result");
      runEssentiaComparison(outcome, pcm, sampleRate);
      return;
    }

    setResult(null);
    setUnstableReason(outcome.reason);
    setScreen("unstable-result");
    runEssentiaComparison(outcome, pcm, sampleRate);
  }, [cleanupMeasurement, isDebugMode, runEssentiaComparison]);

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
      inputSampleRateRef.current = audioContext.sampleRate;
      pcmChunksRef.current = [];
      pcmSampleCountRef.current = 0;

      if (isDebugMode) {
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0;
        processor.onaudioprocess = (event) => {
          const channelData = event.inputBuffer.getChannelData(0);
          const copy = new Float32Array(channelData.length);
          copy.set(channelData);
          pcmChunksRef.current.push(copy);
          pcmSampleCountRef.current += copy.length;
        };
        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(audioContext.destination);
        scriptProcessorNodeRef.current = processor;
        silentGainNodeRef.current = silentGain;
        setEssentiaStatus("collecting");
      }

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

      {isDebugMode && (
        <EssentiaExperimentalPanel
          status={essentiaStatus}
          report={essentiaReport}
          screen={screen}
          v0Result={result}
          unstableReason={unstableReason}
        />
      )}
    </main>
  );
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

function EssentiaExperimentalPanel({
  status,
  report,
  screen,
  v0Result,
  unstableReason
}: {
  status: "idle" | "collecting" | "loading" | "complete" | "failed";
  report: EssentiaExperimentalReport | null;
  screen: MeasurementStatus;
  v0Result: BpmAnalysisSuccess | null;
  unstableReason: string;
}) {
  const v0Summary =
    screen === "result" && v0Result
      ? `추천 BPM ${v0Result.recommendedBpm}, 신뢰도 ${v0Result.confidence}`
      : screen === "unstable-result"
        ? `불안정: ${unstableReason || "사유 없음"}`
        : "측정 후 표시";

  return (
    <section className="debug-panel" aria-labelledby="essentia-title">
      <h2 id="essentia-title">Essentia.js 실험 비교</h2>
      <p>
        ?debug=1에서만 표시됩니다. 기존 V0 결과를 대체하지 않으며 오디오 원본은 저장하거나
        서버로 전송하지 않습니다.
      </p>

      <div className="debug-grid">
        <DebugRow label="실험 상태" value={status} />
        <DebugRow label="기존 V0 결과" value={v0Summary} />
        <DebugRow label="패키지" value={report?.packageName ?? "essentia.js"} />
        <DebugRow
          label="라이선스"
          value={`${report?.license ?? "AGPL-3.0"} - 정식 제품 도입 전 법적 검토 필요`}
        />
        <DebugRow label="WASM 로딩 상태" value={report?.wasmStatus ?? "not-loaded"} />
        <DebugRow
          label="Essentia.js 실험 결과"
          value={
            report?.bpm
              ? `${report.bpm} BPM`
              : report?.failureReason || "측정 완료 후 분석 결과 표시"
          }
        />
        <DebugRow
          label="가장 강한 후보"
          value={report?.candidates[0]?.bpm ? `${report.candidates[0].bpm} BPM` : "-"}
        />
        <DebugRow
          label="다른 후보"
          value={
            report && report.candidates.length > 1
              ? report.candidates
                  .slice(1)
                  .map((candidate) => `${candidate.bpm} (${candidate.label})`)
                  .join(", ")
              : "-"
          }
        />
        <DebugRow
          label="confidence"
          value={report?.confidence === null || !report ? "제공 없음" : String(report.confidence)}
        />
        <DebugRow
          label="processing time"
          value={report ? `${report.processingTimeMs} ms` : "-"}
        />
        <DebugRow label="WASM load time" value={report ? `${report.wasmLoadTimeMs} ms` : "-"} />
        <DebugRow label="input sample rate" value={report ? `${report.inputSampleRate} Hz` : "-"} />
        <DebugRow
          label="analysis sample rate"
          value={report ? `${report.analysisSampleRate} Hz` : "-"}
        />
        <DebugRow
          label="buffer length"
          value={report ? `${report.bufferDurationSeconds.toFixed(1)} sec` : "-"}
        />
        <DebugRow label="RMS" value={report ? report.rms.toFixed(4) : "-"} />
        <DebugRow label="Peak" value={report ? report.peak.toFixed(4) : "-"} />
        <DebugRow label="beat count" value={report ? String(report.beatsCount) : "-"} />
        <DebugRow label="BPM estimate count" value={report ? String(report.estimatesCount) : "-"} />
        <DebugRow label="BPM interval count" value={report ? String(report.intervalsCount) : "-"} />
        <DebugRow label="132 쏠림 여부" value={report?.has132Bias ? "있음" : "없음"} />
        <DebugRow
          label="무음에서 후보 표시 여부"
          value={report?.silentFalsePositive ? "표시됨" : "표시 안 됨"}
        />
        <DebugRow label="실패 reason" value={report?.failureReason || "-"} />
        <DebugRow label="판단" value={report?.judgement ?? "판단 불가"} />
        <DebugRow label="판단 이유" value={report?.judgementReason ?? "측정 후 표시"} />
      </div>

      <div className="debug-note">
        <h3>PM 기록 그룹</h3>
        <p>
          Metronome 90/120/128, 스윙 재즈, R&B/뉴올리언스, 빅밴드, 무음 테스트를
          분리해서 기록하세요. Go 기준은 metronome ±5 BPM 통과와 타깃 장르 10곡 중 5곡
          이상 개선입니다.
        </p>
      </div>
    </section>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="debug-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
