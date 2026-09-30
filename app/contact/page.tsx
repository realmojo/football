import type { Metadata } from "next";
import { Prose } from "@/components/Prose";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "문의하기",
  description: "토리코리에 대한 문의, 오류 제보, 제휴 제안 연락처입니다.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <Prose title="문의하기" lead="잘못된 경기 정보, 사이트 오류, 개선 의견이나 제휴 제안은 이메일로 보내 주세요.">
      <div className="contact-box">
        <span>이메일</span>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </div>

      <h2>이런 내용을 보내 주세요</h2>
      <ul>
        <li>
          <strong>잘못된 정보 제보</strong>: 어느 리그, 어떤 경기(또는 팀)인지와 무엇이 다른지 적어 주시면 빠르게 확인할 수
          있습니다.
        </li>
        <li>
          <strong>사이트 오류</strong>: 문제가 생긴 페이지 주소와 사용한 기기, 브라우저를 함께 알려 주세요.
        </li>
        <li>
          <strong>기능 제안</strong>: 추가됐으면 하는 리그나 분석 지표가 있다면 알려 주세요.
        </li>
        <li>
          <strong>제휴 · 광고 문의</strong>
        </li>
      </ul>

      <h2>답변 안내</h2>
      <p>
        보내 주신 메일은 보통 영업일 기준 2~3일 안에 답변드립니다. 경기 데이터 자체의 오류는 데이터 제공처에서 수정된
        뒤 반영되므로 시간이 조금 걸릴 수 있습니다.
      </p>
      <p>
        보내 주신 이메일 주소와 문의 내용은 답변 목적으로만 사용하며, 자세한 내용은{" "}
        <a href="/privacy">개인정보처리방침</a>을 참고해 주세요.
      </p>
    </Prose>
  );
}
