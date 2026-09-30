import type { Metadata } from "next";
import { Prose } from "@/components/Prose";
import { CONTACT_EMAIL, POLICY_DATE, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "토리코리의 개인정보 수집·이용, 쿠키와 Google 광고에 관한 안내입니다.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <Prose title="개인정보처리방침" lead={`시행일: ${POLICY_DATE}`}>
      <p>
        {SITE_NAME}(toricori.com, 이하 &quot;사이트&quot;)는 이용자의 개인정보를 중요하게 생각하며, 「개인정보 보호법」 등
        관련 법령을 지킵니다. 이 방침은 사이트가 어떤 정보를 어떻게 처리하는지 설명합니다.
      </p>

      <h2>1. 수집하는 개인정보</h2>
      <p>
        사이트는 회원가입 기능이 없으며, 이름·연락처 같은 개인정보를 직접 입력받지 않습니다. 다만 서비스 이용 과정에서
        다음 정보가 자동으로 생성되어 수집될 수 있습니다.
      </p>
      <ul>
        <li>접속 IP 주소, 브라우저 종류와 버전, 운영체제, 방문 일시, 방문한 페이지, 참조 주소</li>
        <li>쿠키 및 광고 식별자 (아래 4항 참고)</li>
      </ul>
      <p>이용자가 이메일로 문의하는 경우, 답변을 위해 이용자가 보낸 이메일 주소와 문의 내용을 받게 됩니다.</p>

      <h2>2. 이용 목적</h2>
      <ul>
        <li>서비스 제공과 안정적인 운영, 오류 확인과 보안</li>
        <li>방문 통계 분석을 통한 서비스 개선 (Google 애널리틱스, 네이버 애널리틱스)</li>
        <li>광고 게재 (Google AdSense)</li>
        <li>이용자 문의에 대한 답변</li>
      </ul>

      <h2>3. 보유 기간과 파기</h2>
      <p>
        자동으로 수집된 접속 기록은 서비스 운영과 보안을 위해 필요한 기간 동안 보관한 뒤 지체 없이 파기합니다. 이메일
        문의 내용은 답변을 마친 뒤 1년 안에 삭제합니다. 법령에서 따로 보관 기간을 정한 경우에는 그 기간 동안 보관합니다.
      </p>

      <h2>4. 쿠키와 Google 광고</h2>
      <p>
        쿠키는 웹사이트가 이용자의 브라우저에 저장하는 작은 텍스트 파일입니다. 사이트는 광고 게재를 위해 Google이
        제공하는 광고 서비스인 Google AdSense를 사용하며, 이 과정에서 다음과 같이 쿠키가 사용됩니다.
      </p>
      <ul>
        <li>Google을 포함한 제3자 광고 공급업체는 쿠키를 사용해 이용자가 이 사이트나 다른 웹사이트를 방문한 기록을 바탕으로 광고를 게재합니다.</li>
        <li>
          Google은 광고 쿠키를 사용해 이용자가 이 사이트와 인터넷의 다른 사이트를 방문한 기록을 바탕으로 이용자와 그
          파트너에게 적절한 광고를 게재할 수 있습니다.
        </li>
        <li>
          이용자는{" "}
          <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
            Google 광고 설정
          </a>
          에서 맞춤 광고를 해제할 수 있습니다. 또한{" "}
          <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">
            www.aboutads.info
          </a>
          에서 제3자 공급업체의 맞춤 광고 쿠키 사용을 해제할 수 있습니다.
        </li>
        <li>
          Google이 광고 서비스에서 정보를 사용하는 방식은{" "}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
            Google 파트너 사이트 정보 사용 안내
          </a>
          에서 확인할 수 있습니다.
        </li>
      </ul>
      <p>
        또한 사이트는 방문 통계를 분석하기 위해 Google 애널리틱스와 네이버 애널리틱스를 사용합니다. 두 서비스는 쿠키를 이용해 방문
        페이지, 방문 시간, 유입 경로 같은 이용 기록을 개인을 식별할 수 없는 형태로 수집합니다.
      </p>
      <p>
        이용자는 브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있습니다. 쿠키를 거부해도 사이트의 경기 정보는
        그대로 이용할 수 있으나, 맞춤 광고 대신 일반 광고가 표시될 수 있습니다.
      </p>

      <h2>5. 제3자 제공과 처리 위탁</h2>
      <p>
        사이트는 이용자의 개인정보를 제3자에게 판매하거나 제공하지 않습니다. 다만 서비스 운영을 위해 다음 업체의 서비스를
        이용하며, 각 업체는 자체 개인정보 처리방침에 따라 정보를 처리합니다.
      </p>
      <ul>
        <li>Cloudflare, Inc.: 웹사이트 호스팅과 보안</li>
        <li>Supabase, Inc.: 경기 데이터 저장</li>
        <li>Google LLC: 광고 게재 (Google AdSense), 방문 통계 분석 (Google 애널리틱스)</li>
        <li>네이버 주식회사: 방문 통계 분석 (네이버 애널리틱스)</li>
      </ul>

      <h2>6. 이용자의 권리</h2>
      <p>
        이용자는 언제든지 자신의 개인정보에 대한 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다. 아래 연락처로 요청하면
        지체 없이 조치하겠습니다.
      </p>

      <h2>7. 아동의 개인정보</h2>
      <p>사이트는 만 14세 미만 아동을 대상으로 하지 않으며, 아동의 개인정보를 알면서 수집하지 않습니다.</p>

      <h2>8. 개인정보 보호책임자</h2>
      <p>
        개인정보 관련 문의, 불만, 피해 구제 요청은 아래로 연락해 주세요.
        <br />
        이메일: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
      <p>
        기타 개인정보 침해에 대한 신고나 상담은 개인정보침해신고센터(privacy.kisa.or.kr, 국번 없이 118)나
        개인정보분쟁조정위원회(www.kopico.go.kr, 1833-6972)에 문의할 수 있습니다.
      </p>

      <h2>9. 방침의 변경</h2>
      <p>이 방침이 바뀌는 경우 시행 7일 전부터 이 페이지에 알립니다.</p>
    </Prose>
  );
}
