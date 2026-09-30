// football-data.org 의 영문 포지션·국적을 한국어로 표시한다. 없는 값은 원문 그대로 쓴다.

export type PositionGroup = "GK" | "DF" | "MF" | "FW";

export const POSITION_GROUP_LABEL: Record<PositionGroup, string> = {
  GK: "골키퍼",
  DF: "수비수",
  MF: "미드필더",
  FW: "공격수",
};

const POSITIONS: Record<string, [string, PositionGroup]> = {
  Goalkeeper: ["골키퍼", "GK"],
  Defence: ["수비수", "DF"],
  Defender: ["수비수", "DF"],
  "Centre-Back": ["센터백", "DF"],
  "Left-Back": ["레프트백", "DF"],
  "Right-Back": ["라이트백", "DF"],
  Midfield: ["미드필더", "MF"],
  Midfielder: ["미드필더", "MF"],
  "Defensive Midfield": ["수비형 미드필더", "MF"],
  "Central Midfield": ["중앙 미드필더", "MF"],
  "Attacking Midfield": ["공격형 미드필더", "MF"],
  "Left Midfield": ["왼쪽 미드필더", "MF"],
  "Right Midfield": ["오른쪽 미드필더", "MF"],
  Offence: ["공격수", "FW"],
  Attacker: ["공격수", "FW"],
  Forward: ["공격수", "FW"],
  "Centre-Forward": ["스트라이커", "FW"],
  "Second Striker": ["세컨드 스트라이커", "FW"],
  "Left Winger": ["왼쪽 윙어", "FW"],
  "Right Winger": ["오른쪽 윙어", "FW"],
};

export function positionLabel(position: string | null) {
  if (!position) return "-";
  return POSITIONS[position]?.[0] ?? position;
}

export function positionGroup(position: string | null): PositionGroup | null {
  if (!position) return null;
  return POSITIONS[position]?.[1] ?? null;
}

const COUNTRIES: Record<string, string> = {
  England: "잉글랜드",
  Scotland: "스코틀랜드",
  Wales: "웨일스",
  "Northern Ireland": "북아일랜드",
  Ireland: "아일랜드",
  "Republic of Ireland": "아일랜드",
  Spain: "스페인",
  Germany: "독일",
  Italy: "이탈리아",
  France: "프랑스",
  Portugal: "포르투갈",
  Netherlands: "네덜란드",
  Belgium: "벨기에",
  Switzerland: "스위스",
  Austria: "오스트리아",
  Denmark: "덴마크",
  Sweden: "스웨덴",
  Norway: "노르웨이",
  Finland: "핀란드",
  Iceland: "아이슬란드",
  Poland: "폴란드",
  "Czech Republic": "체코",
  Czechia: "체코",
  Slovakia: "슬로바키아",
  Hungary: "헝가리",
  Croatia: "크로아티아",
  Serbia: "세르비아",
  Slovenia: "슬로베니아",
  "Bosnia and Herzegovina": "보스니아 헤르체고비나",
  Montenegro: "몬테네그로",
  Albania: "알바니아",
  Kosovo: "코소보",
  "North Macedonia": "북마케도니아",
  Greece: "그리스",
  Turkey: "튀르키예",
  Türkiye: "튀르키예",
  Romania: "루마니아",
  Bulgaria: "불가리아",
  Ukraine: "우크라이나",
  Russia: "러시아",
  Georgia: "조지아",
  Armenia: "아르메니아",
  Israel: "이스라엘",
  Brazil: "브라질",
  Argentina: "아르헨티나",
  Uruguay: "우루과이",
  Colombia: "콜롬비아",
  Chile: "칠레",
  Paraguay: "파라과이",
  Ecuador: "에콰도르",
  Peru: "페루",
  Venezuela: "베네수엘라",
  Mexico: "멕시코",
  "United States": "미국",
  USA: "미국",
  Canada: "캐나다",
  Jamaica: "자메이카",
  Nigeria: "나이지리아",
  Ghana: "가나",
  Senegal: "세네갈",
  "Ivory Coast": "코트디부아르",
  "Côte d'Ivoire": "코트디부아르",
  Cameroon: "카메룬",
  Mali: "말리",
  "Burkina Faso": "부르키나파소",
  Guinea: "기니",
  Morocco: "모로코",
  Algeria: "알제리",
  Tunisia: "튀니지",
  Egypt: "이집트",
  "DR Congo": "콩고민주공화국",
  "Congo DR": "콩고민주공화국",
  Gabon: "가봉",
  "South Africa": "남아프리카공화국",
  Zimbabwe: "짐바브웨",
  Japan: "일본",
  "Korea Republic": "대한민국",
  "South Korea": "대한민국",
  China: "중국",
  "China PR": "중국",
  Australia: "호주",
  "New Zealand": "뉴질랜드",
  Iran: "이란",
  "Saudi Arabia": "사우디아라비아",
  Uzbekistan: "우즈베키스탄",
  "Bosnia-Herzegovina": "보스니아 헤르체고비나",
  "Cape Verde Islands": "카보베르데",
  "Cape Verde": "카보베르데",
  Curaçao: "퀴라소",
  Haiti: "아이티",
  Iraq: "이라크",
  Jordan: "요르단",
  Panama: "파나마",
  Qatar: "카타르",
  "Costa Rica": "코스타리카",
  Honduras: "온두라스",
  Bolivia: "볼리비아",
  "United Arab Emirates": "아랍에미리트",
  Oman: "오만",
};

// 대표팀 이름(영문 국가명)이면 한글 이름을, 아니면 null 을 돌려준다.
export function nationName(name: string) {
  return COUNTRIES[name] ?? null;
}

export function countryLabel(country: string | null) {
  if (!country) return "-";
  return COUNTRIES[country] ?? country;
}

// 만 나이
export function age(dateOfBirth: string | null, today = new Date()) {
  if (!dateOfBirth) return null;
  const d = new Date(dateOfBirth);
  let a = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
  return a;
}
