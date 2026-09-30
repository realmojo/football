import type { Metadata } from "next";
import { Prose } from "@/components/Prose";
import { LEAGUES } from "@/lib/leagues";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "사이트 소개",
  description: "토리코리는 유럽 주요 축구 리그의 순위, 일정, 경기 결과와 팀별 분석을 한국시간 기준으로 정리하는 사이트입니다.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <Prose
      title="토리코리 소개"
      lead="토리코리는 해외축구 팬을 위해 유럽 주요 리그의 순위와 일정, 경기 결과, 팀별 흐름을 한곳에 정리하는 사이트입니다."
    >
      <h2>만든 이유</h2>
      <p>
        해외축구 경기는 대부분 한국 시간으로 새벽에 열립니다. 아침에 결과를 확인하려면 리그마다 다른 사이트를 돌아다니며
        시차를 계산해야 하는 경우가 많습니다. 토리코리는 모든 경기 시간을 한국시간으로 바꿔 보여주고, 순위표만으로는
        알기 어려운 팀의 최근 흐름과 홈·원정 성적 차이를 함께 보여주기 위해 만들었습니다.
      </p>

      <h2>다루는 리그</h2>
      <ul>
        {LEAGUES.map((l) => (
          <li key={l.code}>
            <a href={`/${l.code}`}>
              {l.name} ({l.country})
            </a>
          </li>
        ))}
      </ul>

      <h2>제공하는 정보</h2>
      <ul>
        <li>
          <strong>순위표</strong>: 전체·홈·원정 순위와 최근 5경기 결과, 유럽대항전 진출권과 강등권 표시
        </li>
        <li>
          <strong>일정 · 결과</strong>: 라운드별 경기 일정과 최종 스코어, 진행 중인 경기 표시
        </li>
        <li>
          <strong>팀 분석</strong>: 경기당 득점·실점·승점, 무실점·무득점 경기 비율, 2.5골 오버와 양팀 득점 비율, 다음
          상대와의 지표 비교 및 이번 시즌 맞대결 기록
        </li>
      </ul>
      <p>
        각 지표가 무엇을 뜻하고 어떻게 계산하는지는 <a href="/guide">이용 가이드</a>에 정리해 두었습니다.
      </p>

      <h2>데이터 출처와 갱신 주기</h2>
      <p>
        경기 일정과 결과, 순위 데이터는 <a href="https://www.football-data.org">football-data.org</a> 에서 제공받습니다.
        리그마다 약 10분 간격으로 새 데이터를 받아오며, 각 리그 화면 오른쪽 위에서 마지막 업데이트 시각을 확인할 수
        있습니다. 팀 분석 지표는 받아온 경기 결과를 바탕으로 토리코리가 직접 계산합니다.
      </p>
      <p>
        데이터 제공처의 사정이나 경기 일정 변경으로 실제와 다른 정보가 잠시 표시될 수 있습니다. 공식 기록은 각 리그와
        구단의 공식 발표를 기준으로 해 주세요.
      </p>

      <h2>연락처</h2>
      <p>
        잘못된 정보나 개선 의견은 <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> 으로 보내 주세요. 자세한 내용은{" "}
        <a href="/contact">문의하기</a> 페이지를 참고해 주세요.
      </p>
    </Prose>
  );
}
