const plannedFeatures = [
  "모바일 기기 마이크로 주변 음악 듣기",
  "약 10초 동안 자동으로 BPM 추정",
  "추천 BPM과 후보 BPM 표시",
  "신뢰도 낮음 / 보통 / 높음 표시",
  "결과가 불안정하면 다시 측정 또는 탭 보정 안내"
];

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Mobile Web MVP</p>
        <h1 id="page-title">BPM 자동 측정</h1>
        <p className="summary">
          음악을 틀어놓고 BPM을 자동으로 측정하는 모바일웹 MVP를 준비 중입니다.
        </p>
        <div className="status-card" aria-label="현재 구현 상태">
          <span className="status-dot" aria-hidden="true" />
          <span>BPM 자동 측정 앱 준비 중</span>
        </div>
      </section>

      <section className="checklist" aria-labelledby="readiness-title">
        <h2 id="readiness-title">V0에서 제공할 예정인 기능</h2>
        <ul>
          {plannedFeatures.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="notice" aria-labelledby="privacy-title">
        <h2 id="privacy-title">아직 구현되지 않은 기능</h2>
        <p>
          이번 단계에는 마이크 측정, 오디오 분석, BPM 계산 기능이 포함되지
          않습니다. 오디오 저장 또는 서버 전송 코드도 추가하지 않았습니다.
        </p>
      </section>
    </main>
  );
}
